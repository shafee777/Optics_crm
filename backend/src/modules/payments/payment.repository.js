import { query, withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';

export const paymentRepository = {
  async create(storeId, orderId, userId, data) {
    return await this.createTx(query, storeId, orderId, userId, data);
  },

  async createTx(db, storeId, orderId, userId, data) {
    const sql = `
      INSERT INTO payments (
        store_id, order_id, amount, payment_method, reference, created_by, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      storeId,
      orderId,
      data.amount,
      data.paymentMethod,
      data.reference || null,
      userId,
      data.notes || null,
    ];
    const res = await db.query(sql, values);
    return res.rows[0];
  },

  async findByOrderId(storeId, orderId) {
    const sql = `
      SELECT p.*, u.full_name AS recorded_by_name
      FROM payments p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.store_id = $1 AND p.order_id = $2
      ORDER BY p.paid_at DESC;
    `;
    const res = await query(sql, [storeId, orderId]);
    return res.rows;
  },

  async getTotalPaidForOrder(storeId, orderId) {
    const sql = `
      SELECT COALESCE(SUM(amount), 0.00) AS total_paid
      FROM payments
      WHERE store_id = $1 AND order_id = $2;
    `;
    const res = await query(sql, [storeId, orderId]);
    return parseFloat(res.rows[0].total_paid);
  },

  async createWithTransaction(storeId, orderId, paymentData, userId) {
    return withTransaction(async (client) => {
      // 1. Lock the order row to prevent concurrent race condition payments
      const { rows: orderRows } = await client.query(
        `SELECT id, total_amount, status 
         FROM orders 
         WHERE id = $1 AND store_id = $2 
         FOR UPDATE;`,
        [orderId, storeId]
      );

      if (orderRows.length === 0) {
        throw new AppError('Order not found', 404);
      }

      const order = orderRows[0];

      // 2. Compute total already paid inside the locked transaction
      const { rows: paymentSumRows } = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_paid 
         FROM payments 
         WHERE order_id = $1 AND store_id = $2;`,
        [orderId, storeId]
      );

      const totalPaid = parseFloat(paymentSumRows[0].total_paid);
      const totalAmount = parseFloat(order.total_amount);
      const remainingBalance = totalAmount - totalPaid;

      if (paymentData.amount > remainingBalance + 0.001) {
        throw new AppError(
          `Payment amount (₹${paymentData.amount}) exceeds remaining balance (₹${remainingBalance.toFixed(2)})`,
          400
        );
      }

      // 3. Insert payment
      const { rows: newPaymentRows } = await client.query(
        `INSERT INTO payments (
          store_id, order_id, amount, payment_method, reference, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;`,
        [
          storeId,
          orderId,
          paymentData.amount,
          paymentData.paymentMethod,
          paymentData.reference || null,
          paymentData.notes || null,
          userId,
        ]
      );

      // 4. If balance is now settled and requested, update order status
      const newTotalPaid = totalPaid + paymentData.amount;
      if (paymentData.markDelivered && newTotalPaid >= totalAmount - 0.001) {
        await client.query(
          `UPDATE orders 
           SET status = 'DELIVERED', delivered_at = NOW(), updated_at = NOW() 
           WHERE id = $1 AND store_id = $2;`,
          [orderId, storeId]
        );
      }

      return newPaymentRows[0];
    });
  },
};