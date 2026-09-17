import { query, withTransaction } from '../../config/database.js';
import { ORDER_STATUS } from './order.constants.js';
import { AppError } from '../../shared/errors/AppError.js';

export const orderRepository = {
  async ensureStoreCountersTable(db = query) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS store_counters (
        store_id UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
        customer_code_seq INT NOT NULL DEFAULT 1000,
        order_number_seq INT NOT NULL DEFAULT 1000,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_store_counters_updated_at
      ON store_counters(updated_at);
    `);
  },

  // Concurrency-safe, store-scoped order number generation.
  async getNextOrderNumber(client, storeId) {
    await this.ensureStoreCountersTable(client);

    await client.query(
      `
        INSERT INTO store_counters (store_id, customer_code_seq, order_number_seq)
        VALUES ($1, 1000, 1000)
        ON CONFLICT (store_id) DO NOTHING;
      `,
      [storeId]
    );

    const res = await client.query(
      `
        UPDATE store_counters
        SET order_number_seq = GREATEST(
              order_number_seq,
              COALESCE((SELECT MAX(CAST(regexp_replace(order_number, '^ORD-','') AS integer))
                        FROM orders WHERE store_id = $1), 1000)
            ) + 1,
            updated_at = NOW()
        WHERE store_id = $1
        RETURNING order_number_seq;
      `,
      [storeId]
    );

    const nextSeq = Number(res.rows[0]?.order_number_seq ?? 1001);
    return `ORD-${nextSeq}`;
  },

  async createTransactional(storeId, userId, data) {
    return await withTransaction(async (client) => {
      const orderNumber = await this.getNextOrderNumber(client, storeId);

      let subtotal = 0;
      const computedItems = data.items.map((item) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemTotal = Math.max(0, itemSubtotal - (item.discount || 0));
        subtotal += itemTotal;
        return { ...item, totalPrice: itemTotal };
      });

      const discount = data.discount || 0;
      const tax = data.tax || 0;
      const totalAmount = Math.max(0, subtotal - discount + tax);

      if (data.advancePayment && data.advancePayment.amount > totalAmount) {
        throw new AppError(
          `Advance payment (₹${data.advancePayment.amount}) cannot exceed order total (₹${totalAmount})`,
          400,
          'ADVANCE_PAYMENT_EXCEEDS_TOTAL'
        );
      }

      const orderQuery = `
        INSERT INTO orders (
          store_id, customer_id, prescription_id, order_number,
          order_date, due_date, status,
          subtotal, discount, tax, total_amount,
          notes, created_by
        )
        VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `;
      const { rows: orderRows } = await client.query(orderQuery, [
        storeId,
        data.customerId,
        data.prescriptionId || null,
        orderNumber,
        data.dueDate,
        ORDER_STATUS.PENDING,
        subtotal,
        discount,
        tax,
        totalAmount,
        data.notes || null,
        userId,
      ]);
      const createdOrder = orderRows[0];

      for (const item of computedItems) {
        let resolvedProductId = item.productId || null;

        if (resolvedProductId) {
          // If explicitly chosen from stock, deduct quantity
          await client.query(
            `UPDATE products
             SET stock_quantity = stock_quantity - $1,
                 updated_at = NOW()
             WHERE id = $2 AND store_id = $3;`,
            [item.quantity, resolvedProductId, storeId]
          );
        } else if (item.itemType !== 'SERVICE') {
          // Check if a product with same name and item_type exists
          const { rows: existingProd } = await client.query(
            `SELECT id FROM products 
             WHERE store_id = $1 AND lower(name) = lower($2) AND item_type = $3 AND archived_at IS NULL 
             LIMIT 1;`,
            [storeId, item.description.trim(), item.itemType]
          );

          if (existingProd.length > 0) {
            resolvedProductId = existingProd[0].id;
            await client.query(
              `UPDATE products
               SET stock_quantity = stock_quantity - $1,
                   updated_at = NOW()
               WHERE id = $2 AND store_id = $3;`,
              [item.quantity, resolvedProductId, storeId]
            );
          } else {
            // Automatically register new product into store inventory catalog
            const { rows: newProd } = await client.query(
              `INSERT INTO products (
                store_id, item_type, name, selling_price, stock_quantity, min_stock_alert
              ) VALUES ($1, $2, $3, $4, $5, 3)
              RETURNING id;`,
              [storeId, item.itemType, item.description.trim(), item.unitPrice, -item.quantity]
            );
            resolvedProductId = newProd[0].id;
          }
        }

        // Insert Order Item
        await client.query(
          `
            INSERT INTO order_items (
              order_id, product_id, item_type, description, quantity,
              unit_price, discount, total_price
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
          `,
          [
            createdOrder.id,
            resolvedProductId,
            item.itemType,
            item.description,
            item.quantity,
            item.unitPrice,
            item.discount || 0,
            item.totalPrice,
          ]
        );
      }

      if (data.advancePayment && data.advancePayment.amount > 0) {
        await client.query(
          `
            INSERT INTO payments (
              store_id, order_id, amount, payment_method, reference, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6);
          `,
          [
            storeId,
            createdOrder.id,
            data.advancePayment.amount,
            data.advancePayment.paymentMethod,
            data.advancePayment.reference || null,
            userId,
          ]
        );
      }

      return createdOrder;
    });
  },

  async findByIdWithDetails(storeId, orderId) {
    return await this.findByIdWithDetailsTx({ query }, storeId, orderId);
  },

  async findByIdWithDetailsTx(db, storeId, orderId) {
    const orderSql = `
      SELECT 
        o.*,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.customer_code,
        u.full_name AS created_by_name,
        COALESCE((SELECT SUM(amount) FROM payments p WHERE p.order_id = o.id), 0.00) AS total_paid
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.store_id = $1 AND o.id = $2;
    `;
    const orderRes = await db.query(orderSql, [storeId, orderId]);
    if (orderRes.rows.length === 0) return null;

    const order = orderRes.rows[0];

    const itemsSql = `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC;`;
    const itemsRes = await db.query(itemsSql, [orderId]);
    order.items = itemsRes.rows;

    const paymentsSql = `
      SELECT p.*, u.full_name AS recorded_by_name 
      FROM payments p 
      LEFT JOIN users u ON p.created_by = u.id 
      WHERE p.order_id = $1 
      ORDER BY p.paid_at DESC;
    `;
    const paymentsRes = await db.query(paymentsSql, [orderId]);
    order.payments = paymentsRes.rows;

    order.total_amount = parseFloat(order.total_amount);
    order.total_paid = parseFloat(order.total_paid);
    order.balance_due = Math.max(0, order.total_amount - order.total_paid);

    return order;
  },

  async list(storeId, { status, customerId, overdue, search, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE o.store_id = $1';
    const params = [storeId];

    if (status && status !== 'ALL') {
      params.push(status);
      whereClause += ` AND o.status = $${params.length}`;
    }

    if (customerId) {
      params.push(customerId);
      whereClause += ` AND o.customer_id = $${params.length}`;
    }

    if (overdue === 'true') {
      whereClause += ` AND o.due_date < CURRENT_DATE AND o.status NOT IN ('DELIVERED', 'CANCELLED')`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClause += ` AND (
        LOWER(o.order_number) LIKE $${params.length} OR 
        LOWER(c.full_name) LIKE $${params.length} OR 
        c.phone ILIKE $${params.length}
      )`;
    }

    const countSql = `
      SELECT COUNT(*) 
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ${whereClause};
    `;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT 
        o.*,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.customer_code,
        COALESCE((SELECT SUM(amount) FROM payments p WHERE p.order_id = o.id), 0.00) AS total_paid,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN o.status = 'READY_FOR_PICKUP' THEN 1 
          WHEN o.status = 'PROCESSING' THEN 2 
          WHEN o.status = 'PENDING' THEN 3 
          ELSE 4 
        END,
        o.due_date ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;
    const dataParams = [...params, limit, offset];
    const dataRes = await query(dataSql, dataParams);

    const formattedOrders = dataRes.rows.map((row) => {
      const totalAmount = parseFloat(row.total_amount);
      const totalPaid = parseFloat(row.total_paid);
      return {
        ...row,
        total_amount: totalAmount,
        total_paid: totalPaid,
        balance_due: Math.max(0, totalAmount - totalPaid),
        is_overdue:
          new Date(row.due_date) < new Date(new Date().setHours(0, 0, 0, 0)) &&
          row.status !== 'DELIVERED' &&
          row.status !== 'CANCELLED',
      };
    });

    return {
      orders: formattedOrders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async updateStatus(storeId, orderId, nextStatus) {
    return await this.updateStatusTx({ query }, storeId, orderId, nextStatus);
  },

  async updateStatusTx(db, storeId, orderId, nextStatus) {
    let extraFields = '';
    if (nextStatus === ORDER_STATUS.READY_FOR_PICKUP) {
      extraFields = ', ready_at = NOW()';
    } else if (nextStatus === ORDER_STATUS.DELIVERED) {
      extraFields = ', delivered_at = NOW()';
    }

    const sql = `
      UPDATE orders
      SET status = $3, updated_at = NOW() ${extraFields}
      WHERE store_id = $1 AND id = $2
      RETURNING *;
    `;
    const res = await db.query(sql, [storeId, orderId, nextStatus]);
    return res.rows[0] || null;
  },
};