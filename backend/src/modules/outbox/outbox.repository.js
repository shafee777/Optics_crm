import { query } from '../../config/database.js';
import { messageRepository } from '../messages/message.repository.js';

export const outboxRepository = {
  async enqueueMessage(storeId, data, client = null) {
    if (!data.phone || !data.messageBody) return null;

    const cleanPhone = String(data.phone).replace(/\D/g, '');
    if (cleanPhone.length < 10) return null;

    const sql = `
      INSERT INTO outbox_messages (
        store_id, customer_id, order_id,
        phone_number, customer_name, event_type,
        message_body, status, channel
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', 'WHATSAPP')
      RETURNING *;
    `;
    const params = [
      storeId,
      data.customerId || null,
      data.orderId || null,
      cleanPhone,
      data.customerName || null,
      data.eventType || 'CUSTOM',
      data.messageBody,
    ];

    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows[0];
  },

  async getPendingCount(storeId) {
    const sql = `SELECT COUNT(*) AS count FROM outbox_messages WHERE store_id = $1 AND status = 'PENDING';`;
    const res = await query(sql, [storeId]);
    return parseInt(res.rows[0]?.count || 0, 10);
  },

  async listMessages(storeId, { status = 'PENDING', limit = 50, offset = 0 } = {}) {
    let whereClause = 'WHERE store_id = $1';
    const params = [storeId];

    if (status && status !== 'ALL') {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    params.push(Math.min(100, Math.max(1, parseInt(limit, 10) || 50)));
    const limitParam = `$${params.length}`;

    params.push(Math.max(0, parseInt(offset, 10) || 0));
    const offsetParam = `$${params.length}`;

    const sql = `
      SELECT 
        id, customer_id, order_id, phone_number,
        customer_name, event_type, message_body,
        status, channel, dispatch_method, sent_at,
        error_detail, created_at
      FROM outbox_messages
      ${whereClause}
      ORDER BY 
        CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam};
    `;

    const res = await query(sql, params);
    return res.rows.map(r => ({
      id: r.id,
      customerId: r.customer_id,
      orderId: r.order_id,
      phone: r.phone_number,
      customerName: r.customer_name,
      eventType: r.event_type,
      messageBody: r.message_body,
      status: r.status,
      channel: r.channel,
      dispatchMethod: r.dispatch_method,
      sentAt: r.sent_at,
      errorDetail: r.error_detail,
      createdAt: r.created_at,
    }));
  },

  async getById(storeId, messageId) {
    const sql = `SELECT * FROM outbox_messages WHERE store_id = $1 AND id = $2;`;
    const res = await query(sql, [storeId, messageId]);
    return res.rows[0] || null;
  },

  async markSent(storeId, messageId, userId, dispatchMethod = 'MANUAL_WA_ME') {
    const sql = `
      UPDATE outbox_messages 
      SET status = 'SENT', sent_at = NOW(), sent_by = $3, dispatch_method = $4, error_detail = NULL, updated_at = NOW()
      WHERE store_id = $1 AND id = $2
      RETURNING *;
    `;
    const res = await query(sql, [storeId, messageId, userId || null, dispatchMethod]);
    const updated = res.rows[0];

    // Log to historical customer messages table
    if (updated && updated.customer_id) {
      try {
        await messageRepository.logMessage(storeId, updated.customer_id, updated.event_type, 'WHATSAPP');
      } catch (err) {
        // non-blocking
      }
    }

    return updated;
  },

  async dismiss(storeId, messageId, userId) {
    const sql = `
      UPDATE outbox_messages 
      SET status = 'DISMISSED', updated_at = NOW()
      WHERE store_id = $1 AND id = $2
      RETURNING *;
    `;
    const res = await query(sql, [storeId, messageId]);
    return res.rows[0];
  },

  async markFailed(storeId, messageId, errorDetail) {
    const sql = `
      UPDATE outbox_messages 
      SET status = 'FAILED', error_detail = $3, updated_at = NOW()
      WHERE store_id = $1 AND id = $2
      RETURNING *;
    `;
    const res = await query(sql, [storeId, messageId, String(errorDetail || 'Dispatch failed')]);
    return res.rows[0];
  }
};
