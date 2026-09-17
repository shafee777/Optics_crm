import { query } from '../../config/database.js';

export const authRepository = {
  async ensureRefreshSessionsTable(db = { query }) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS auth_refresh_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_jti UUID NOT NULL UNIQUE,
        token_hash CHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  },

  async createRefreshSession(userId, tokenJti, tokenHash, expiresAt, db = { query }) {
    await this.ensureRefreshSessionsTable(db);
    await db.query(
      `
        INSERT INTO auth_refresh_sessions (user_id, token_jti, token_hash, expires_at)
        VALUES ($1, $2, $3, $4);
      `,
      [userId, tokenJti, tokenHash, expiresAt]
    );
  },

  async findActiveRefreshSession(tokenJti, tokenHash, db = { query }) {
    await this.ensureRefreshSessionsTable(db);
    const result = await db.query(
      `
        SELECT *
        FROM auth_refresh_sessions
        WHERE token_jti = $1
          AND token_hash = $2
          AND revoked_at IS NULL
          AND expires_at > NOW();
      `,
      [tokenJti, tokenHash]
    );
    return result.rows[0] || null;
  },

  async revokeRefreshSession(tokenJti, db = { query }) {
    await this.ensureRefreshSessionsTable(db);
    await db.query(
      `
        UPDATE auth_refresh_sessions
        SET revoked_at = NOW()
        WHERE token_jti = $1 AND revoked_at IS NULL;
      `,
      [tokenJti]
    );
  },

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