import { query } from '../../config/database.js';

export const userRepository = {
  async findByStoreId(storeId) {
    const sql = `
      SELECT 
        id, 
        store_id, 
        email, 
        full_name, 
        role, 
        active, 
        created_at, 
        updated_at
      FROM users
      WHERE store_id = $1
      ORDER BY role ASC, created_at ASC;
    `;
    const res = await query(sql, [storeId]);
    return res.rows;
  },

  async findById(storeId, userId) {
    const sql = `
      SELECT 
        id, 
        store_id, 
        email, 
        full_name, 
        role, 
        active, 
        created_at, 
        updated_at
      FROM users
      WHERE store_id = $1 AND id = $2;
    `;
    const res = await query(sql, [storeId, userId]);
    return res.rows[0] || null;
  },

  async findByEmail(email) {
    const sql = `
      SELECT id, store_id, email, full_name, role, active 
      FROM users 
      WHERE email = $1;
    `;
    const res = await query(sql, [email.toLowerCase().trim()]);
    return res.rows[0] || null;
  },

  async create(storeId, { email, passwordHash, fullName, role = 'STAFF' }) {
    const sql = `
      INSERT INTO users (store_id, email, password_hash, full_name, role, active)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      RETURNING id, store_id, email, full_name, role, active, created_at, updated_at;
    `;
    const res = await query(sql, [
      storeId,
      email.toLowerCase().trim(),
      passwordHash,
      fullName.trim(),
      role,
    ]);
    return res.rows[0];
  },

  async updateStatus(storeId, userId, active) {
    const sql = `
      UPDATE users
      SET active = $3, updated_at = NOW()
      WHERE store_id = $1 AND id = $2
      RETURNING id, store_id, email, full_name, role, active, created_at, updated_at;
    `;
    const res = await query(sql, [storeId, userId, active]);
    return res.rows[0] || null;
  },

  async updatePassword(storeId, userId, passwordHash) {
    const sql = `
      UPDATE users
      SET password_hash = $3, updated_at = NOW()
      WHERE store_id = $1 AND id = $2
      RETURNING id, store_id, email, full_name, role, active, created_at, updated_at;
    `;
    const res = await query(sql, [storeId, userId, passwordHash]);
    return res.rows[0] || null;
  },

  async countActiveOwners(storeId) {
    const sql = `
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE store_id = $1 AND role = 'OWNER' AND active = TRUE;
    `;
    const res = await query(sql, [storeId]);
    return res.rows[0]?.count || 0;
  }
};
