import { pool } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';

export const purchaseRepository = {
  async createTransactional(storeId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Serialize store purchase numbering and verify tenant ownership inside the transaction.
      await client.query('SELECT id FROM stores WHERE id = $1 FOR UPDATE', [storeId]);
      const supplier = await client.query('SELECT id FROM suppliers WHERE store_id = $1 AND id = $2 AND archived_at IS NULL FOR SHARE', [storeId, data.supplierId]);
      if (!supplier.rowCount) throw new AppError('Supplier not found in this store', 404, 'SUPPLIER_NOT_FOUND');
      // 1. Generate PO Number
      const countRes = await client.query(
        `SELECT COUNT(*) FROM purchase_orders WHERE store_id = $1;`,
        [storeId]
      );
      const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
      const poNumber = `PO-${String(nextSeq).padStart(4, '0')}`;

      // 2. Compute total amount across all items
      let totalAmount = 0;
      const processedItems = data.items.map((item) => {
        const lineTax = (item.unitCost * item.quantity * (item.gstRate || 0)) / 100;
        const totalLineCost = parseFloat(((item.unitCost * item.quantity) + lineTax).toFixed(2));
        totalAmount += totalLineCost;
        return {
          ...item,
          totalCost: totalLineCost,
        };
      });

      totalAmount = Math.round(totalAmount * 100) / 100;
      const initialPaid = data.initialPayment?.amount || 0;
      if (initialPaid > totalAmount) throw new AppError('Initial payment exceeds purchase total', 400, 'OVERPAYMENT_NOT_ALLOWED');

      // 3. Insert Purchase Order
      const insertPoQuery = `
        INSERT INTO purchase_orders (
          store_id, supplier_id, po_number, invoice_number, order_date, status, total_amount, paid_amount, notes
        ) VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), 'RECEIVED', $6, $7, $8)
        RETURNING *;
      `;
      const poValues = [
        storeId,
        data.supplierId,
        poNumber,
        data.invoiceNumber || null,
        data.orderDate || null,
        totalAmount,
        initialPaid,
        data.notes || null,
      ];
      const { rows: poRows } = await client.query(insertPoQuery, poValues);
      const purchaseOrder = poRows[0];

      await client.query("SELECT set_config('app.stock_reason', $1, true)", ['PURCHASE ' + purchaseOrder.id]);
      // 4. Process Items & Update Inventory Stock
      for (const item of [...processedItems].sort((a,b) => String(a.productId).localeCompare(String(b.productId)))) {
        let targetProductId = item.productId || null;

        if (targetProductId) {
          // Increment stock on existing product & update cost price
          const updatedProduct = await client.query(
            `UPDATE products 
             SET stock_quantity = stock_quantity + $1,
                 cost_price = $2,
                 updated_at = NOW()
             WHERE store_id = $3 AND id = $4 AND archived_at IS NULL RETURNING id;`,
            [item.quantity, item.unitCost, storeId, targetProductId]
          );
          if (!updatedProduct.rowCount) throw new AppError('Product not found in this store', 404, 'PRODUCT_NOT_FOUND');
          if (!updatedProduct.rowCount) throw new AppError('Product not found in this store', 404, 'PRODUCT_NOT_FOUND');
        } else {
          // Auto-create product in inventory so it is tracked
          const insertProductQuery = `
            INSERT INTO products (
              store_id, item_type, brand, model_code, name, cost_price, selling_price, stock_quantity, min_stock_alert, gst_rate
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 3, $9)
            RETURNING id;
          `;
          const estSellingPrice = parseFloat((item.unitCost * 1.5).toFixed(2)); // default markup
          const prodRes = await client.query(insertProductQuery, [
            storeId,
            item.itemType || 'FRAME',
            item.brand || null,
            item.modelCode || null,
            item.itemName,
            item.unitCost,
            estSellingPrice,
            item.quantity,
            item.gstRate || 0,
          ]);
          targetProductId = prodRes.rows[0].id;
        }

        // Insert purchase order item
        await client.query(
          `INSERT INTO purchase_order_items (
            purchase_order_id, product_id, item_name, item_type, quantity, unit_cost, gst_rate, total_cost
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
          [
            purchaseOrder.id,
            targetProductId,
            item.itemName,
            item.itemType || 'FRAME',
            item.quantity,
            item.unitCost,
            item.gstRate || 0,
            item.totalCost,
          ]
        );
      }

      // 5. Record initial payment if provided
      if (initialPaid > 0 && data.initialPayment) {
        await client.query(
          `INSERT INTO supplier_payments (
            store_id, purchase_order_id, amount, payment_method, reference_note
          ) VALUES ($1, $2, $3, $4, $5);`,
          [
            storeId,
            purchaseOrder.id,
            initialPaid,
            data.initialPayment.paymentMethod || 'CASH',
            data.initialPayment.referenceNote || 'Initial down-payment on inward stock',
          ]
        );
      }

      await client.query('COMMIT');
      return await this.findById(storeId, purchaseOrder.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async findAll(storeId, { supplierId, status, from, to, limit = 50, offset = 0 } = {}) {
    let whereClause = 'po.store_id = $1';
    const values = [storeId];
    let counter = 2;

    if (supplierId) {
      whereClause += ` AND po.supplier_id = $${counter}`;
      values.push(supplierId);
      counter++;
    }

    if (status) {
      whereClause += ` AND po.status = $${counter}`;
      values.push(status);
      counter++;
    }

    if (from) {
      whereClause += ` AND po.order_date >= $${counter}::date`;
      values.push(from);
      counter++;
    }

    if (to) {
      whereClause += ` AND po.order_date <= $${counter}::date`;
      values.push(to);
      counter++;
    }

    const query = `
      SELECT 
        po.*,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        s.category AS supplier_category,
        (po.total_amount - po.paid_amount)::numeric(10,2) AS balance_due,
        COUNT(poi.id)::int AS items_count
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE ${whereClause}
      GROUP BY po.id, s.name, s.phone, s.category
      ORDER BY po.order_date DESC, po.created_at DESC
      LIMIT $${counter} OFFSET $${counter + 1};
    `;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  async findById(storeId, id) {
    const poQuery = `
      SELECT 
        po.*,
        s.name AS supplier_name,
        s.contact_person AS supplier_contact,
        s.phone AS supplier_phone,
        s.email AS supplier_email,
        s.gstin AS supplier_gstin,
        s.category AS supplier_category,
        (po.total_amount - po.paid_amount)::numeric(10,2) AS balance_due
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.store_id = $1 AND po.id = $2;
    `;
    const { rows: poRows } = await pool.query(poQuery, [storeId, id]);
    if (poRows.length === 0) return null;

    const po = poRows[0];

    // Fetch items
    const itemsQuery = `
      SELECT poi.*, p.brand, p.model_code
      FROM purchase_order_items poi
      LEFT JOIN products p ON p.id = poi.product_id
      WHERE poi.purchase_order_id = $1;
    `;
    const { rows: items } = await pool.query(itemsQuery, [id]);

    // Fetch payments
    const paymentsQuery = `
      SELECT * FROM supplier_payments
      WHERE store_id = $1 AND purchase_order_id = $2
      ORDER BY paid_at DESC;
    `;
    const { rows: payments } = await pool.query(paymentsQuery, [storeId, id]);

    return {
      ...po,
      items,
      payments,
    };
  },

  async recordPayment(storeId, poId, paymentData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: poRows } = await client.query(
        `SELECT id, status, total_amount, paid_amount FROM purchase_orders WHERE store_id = $1 AND id = $2 FOR UPDATE;`,
        [storeId, poId]
      );
      if (poRows.length === 0) {
        throw new AppError('Purchase order not found', 404);
      }

      const po = poRows[0];
      const newPaid = parseFloat(po.paid_amount) + parseFloat(paymentData.amount);

      if (po.status === 'CANCELLED') throw new AppError('Cannot pay a cancelled purchase', 400, 'PURCHASE_CANCELLED');
      if (Math.round(newPaid * 100) > Math.round(Number(po.total_amount) * 100)) {
        throw new AppError('Payment exceeds remaining purchase balance', 400, 'OVERPAYMENT_NOT_ALLOWED');
      }
      // Insert payment
      const paymentQuery = `
        INSERT INTO supplier_payments (
          store_id, purchase_order_id, amount, payment_method, reference_note
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const { rows: payRows } = await client.query(paymentQuery, [
        storeId,
        poId,
        paymentData.amount,
        paymentData.paymentMethod || 'CASH',
        paymentData.referenceNote || null,
      ]);

      // Update PO
      await client.query(
        `UPDATE purchase_orders SET paid_amount = $1, updated_at = NOW() WHERE id = $2;`,
        [newPaid, poId]
      );

      await client.query('COMMIT');
      return payRows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};