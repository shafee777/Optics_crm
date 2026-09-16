import { query } from '../../config/database.js';

export const authRepository = {
  async findByEmailWithStore(email) {
    const sql = `
      SELECT 
        u.id, u.store_id, u.email, u.password_hash, u.full_name, u.role, u.active,
        s.name AS store_name, s.currency, s.timezone
      FROM users u
      JOIN stores s ON u.store_id = s.id
      WHERE u.email = $1;
    `;
    const result = await query(sql, [email.toLowerCase().trim()]);
    return result.rows[0] || null;
  },

  async findByIdWithStore(userId) {
    const sql = `
      SELECT 
        u.id, u.store_id, u.email, u.full_name, u.role, u.active,
        s.name AS store_name, s.currency, s.timezone
      FROM users u
      JOIN stores s ON u.store_id = s.id
      WHERE u.id = $1;
    `;
    const result = await query(sql, [userId]);
    return result.rows[0] || null;
  },
};