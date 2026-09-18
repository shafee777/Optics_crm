import { query } from '../../config/database.js';

export const messageRepository = {
  async logMessage(storeId, customerId, messageType, channel = 'WHATSAPP') {
    const sql = `
      INSERT INTO customer_messages_log (store_id, customer_id, message_type, channel, sent_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, store_id, customer_id, message_type, channel, sent_at;
    `;
    const res = await query(sql, [storeId, customerId, messageType, channel]);
    return res.rows[0];
  },

  async findByCustomerId(storeId, customerId) {
    const sql = `
      SELECT id, store_id, customer_id, message_type, channel, sent_at
      FROM customer_messages_log
      WHERE store_id = $1 AND customer_id = $2
      ORDER BY sent_at DESC;
    `;
    const res = await query(sql, [storeId, customerId]);
    return res.rows;
  },

  async getRecentLogs(storeId, limit = 50) {
    const sql = `
      SELECT 
        m.id,
        m.message_type,
        m.channel,
        m.sent_at,
        c.id AS customer_id,
        c.full_name AS customer_name,
        c.phone AS customer_phone
      FROM customer_messages_log m
      JOIN customers c ON m.customer_id = c.id
      WHERE m.store_id = $1
      ORDER BY m.sent_at DESC
      LIMIT $2;
    `;
    const res = await query(sql, [storeId, limit]);
    return res.rows.map((r) => ({
      id: r.id,
      messageType: r.message_type,
      channel: r.channel,
      sentAt: r.sent_at,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
    }));
  },
};
