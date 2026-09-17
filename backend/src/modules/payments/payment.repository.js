import { query } from '../../config/database.js';

export const paymentRepository = {
  async create(storeId, orderId, userId, data) {
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
    const res = await query(sql, values);
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
};
