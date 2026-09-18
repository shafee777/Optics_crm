import { query } from '../../config/database.js';

export const storeRepository = {
  async findById(storeId) {
    const sql = `
      SELECT 
        id, 
        name, 
        phone, 
        address, 
        google_review_link, 
        currency, 
        timezone, 
        created_at, 
        updated_at
      FROM stores
      WHERE id = $1;
    `;
    const res = await query(sql, [storeId]);
    return res.rows[0] || null;
  },

  async update(storeId, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(data.phone);
    }
    if (data.address !== undefined) {
      fields.push(`address = $${idx++}`);
      values.push(data.address);
    }
    if (data.googleReviewLink !== undefined) {
      fields.push(`google_review_link = $${idx++}`);
      values.push(data.googleReviewLink);
    }
    if (data.currency !== undefined) {
      fields.push(`currency = $${idx++}`);
      values.push(data.currency);
    }
    if (data.timezone !== undefined) {
      fields.push(`timezone = $${idx++}`);
      values.push(data.timezone);
    }

    if (fields.length === 0) {
      return this.findById(storeId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(storeId);

    const sql = `
      UPDATE stores
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, name, phone, address, google_review_link, currency, timezone, created_at, updated_at;
    `;

    const res = await query(sql, values);
    return res.rows[0] || null;
  }
};
