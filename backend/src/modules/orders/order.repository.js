import { query, withTransaction } from '../../config/database.js';
import { ORDER_STATUS } from './order.constants.js';

export const orderRepository = {
  // Generate next sequential order number for the store (e.g. ORD-1001)
  async getNextOrderNumber(client, storeId) {
    const sql = `
      SELECT order_number 
      FROM orders 
      WHERE store_id = $1 AND order_number LIKE 'ORD-%'
      ORDER BY created_at DESC, order_number DESC 
      LIMIT 1;
    `;
    const res = await client.query(sql, [storeId]);
    if (res.rows.length === 0 || !res.rows[0].order_number) {
      return 'ORD-1001';
    }
    const lastNum = parseInt(res.rows[0].order_number.replace('ORD-', ''), 10);
    const nextNum = isNaN(lastNum) ? 1001 : lastNum + 1;
    return `ORD-${nextNum}`;
  },

  // Atomic order creation: Order Header + Order Items + Optional Advance Payment
  async createTransactional(storeId, userId, data) {
    return await withTransaction(async (client) => {
      const orderNumber = await this.getNextOrderNumber(client, storeId);

      // 1. Calculate financial totals
      let subtotal = 0;
      const computedItems = data.items.map((item) => {
        const itemTotal = item.quantity * item.unitPrice - (item.discount || 0);
        subtotal += itemTotal;
        return { ...item, totalPrice: Math.max(0, itemTotal) };
      });

      const orderDiscount = data.discount || 0;
      const orderTax = data.tax || 0;
      const finalTotal = Math.max(0, subtotal - orderDiscount + orderTax);

      // 2. Insert Order Header
      const orderSql = `
        INSERT INTO orders (
          store_id, customer_id, prescription_id, order_number,
          order_date, due_date, status,
          subtotal, discount, tax, total_amount,
          notes, created_by
        )
        VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `;
      const orderRes = await client.query(orderSql, [
        storeId,
        data.customerId,
        data.prescriptionId || null,
        orderNumber,
        data.dueDate,
        ORDER_STATUS.PENDING,
        subtotal,
        orderDiscount,
        orderTax,
        finalTotal,
        data.notes || null,
        userId,
      ]);
      const createdOrder = orderRes.rows[0];

      // 3. Insert Order Items
      for (const item of computedItems) {
        const itemSql = `
          INSERT INTO order_items (
            order_id, item_type, description, quantity, unit_price, discount, total_price
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `;
        await client.query(itemSql, [
          createdOrder.id,
          item.itemType,
          item.description,
          item.quantity,
          item.unitPrice,
          item.discount || 0,
          item.totalPrice,
        ]);
      }

      // 4. Insert Advance Payment if provided
      if (data.advancePayment && data.advancePayment.amount > 0) {
        const paymentSql = `
          INSERT INTO payments (
            store_id, order_id, amount, payment_method, reference, created_by, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `;
        await client.query(paymentSql, [
          storeId,
          createdOrder.id,
          data.advancePayment.amount,
          data.advancePayment.paymentMethod,
          data.advancePayment.reference || null,
          userId,
          'Initial Advance Payment',
        ]);
      }

      return createdOrder;
    });
  },

  async findByIdWithDetails(storeId, orderId) {
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
    const orderRes = await query(orderSql, [storeId, orderId]);
    if (orderRes.rows.length === 0) return null;

    const order = orderRes.rows[0];

    // Fetch line items
    const itemsSql = `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC;`;
    const itemsRes = await query(itemsSql, [orderId]);
    order.items = itemsRes.rows;

    // Fetch payments history
    const paymentsSql = `
      SELECT p.*, u.full_name AS recorded_by_name 
      FROM payments p 
      LEFT JOIN users u ON p.created_by = u.id 
      WHERE p.order_id = $1 
      ORDER BY p.paid_at DESC;
    `;
    const paymentsRes = await query(paymentsSql, [orderId]);
    order.payments = paymentsRes.rows;

    // Compute outstanding balance
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
    const res = await query(sql, [storeId, orderId, nextStatus]);
    return res.rows[0] || null;
  },
};
