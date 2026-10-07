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
        s.name AS store_name, s.phone AS store_phone, s.email AS store_email,
        s.address AS store_address, s.gstin AS store_gstin, s.logo_url AS store_logo_url,
        s.currency, s.timezone
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
        s.name AS store_name, s.phone AS store_phone, s.email AS store_email,
        s.address AS store_address, s.gstin AS store_gstin, s.logo_url AS store_logo_url,
        s.currency, s.timezone
      FROM users u
      JOIN stores s ON u.store_id = s.id
      WHERE u.id = $1;
    `;
    const result = await query(sql, [userId]);
    return result.rows[0] || null;
  },

  /** Revoke all active refresh sessions for a given user.
   *  Call this inside a transaction (pass `db = client`) after a password
   *  reset or account deactivation so existing tokens stop working immediately.
   */
  async revokeAllUserSessions(userId, db = { query }) {
    await this.ensureRefreshSessionsTable(db);
    await db.query(
      `UPDATE auth_refresh_sessions
          SET revoked_at = NOW()
        WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  },

  async findByEmailForRecovery(email) {
    const sql = `
      SELECT 
        id, store_id, email, password_hash, role, active,
        recovery_key_hash, recovery_failed_attempts, recovery_locked_until
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `;
    const result = await query(sql, [email.trim()]);
    return result.rows[0] || null;
  },

  async getRecoveryKeyStatus(userId) {
    const sql = `
      SELECT (recovery_key_hash IS NOT NULL) AS has_recovery_key
      FROM users
      WHERE id = $1;
    `;
    const result = await query(sql, [userId]);
    return Boolean(result.rows[0]?.has_recovery_key);
  },

  async getUserPasswordHash(userId) {
    const sql = `
      SELECT password_hash
      FROM users
      WHERE id = $1;
    `;
    const result = await query(sql, [userId]);
    return result.rows[0]?.password_hash || null;
  },

  async updateRecoveryKeyHash(userId, hash) {
    const sql = `
      UPDATE users
      SET recovery_key_hash = $2,
          recovery_failed_attempts = 0,
          recovery_locked_until = NULL,
          updated_at = NOW()
      WHERE id = $1;
    `;
    await query(sql, [userId, hash]);
  },

  async recordFailedRecoveryAttempt(userId, failedAttempts, lockUntil) {
    const sql = `
      UPDATE users
      SET recovery_failed_attempts = $2,
          recovery_locked_until = $3,
          updated_at = NOW()
      WHERE id = $1;
    `;
    await query(sql, [userId, failedAttempts, lockUntil]);
  },

  async resetPasswordFromRecovery(userId, passwordHash, db = { query }) {
    const sql = `
      UPDATE users
      SET password_hash = $2,
          recovery_failed_attempts = 0,
          recovery_locked_until = NULL,
          updated_at = NOW()
      WHERE id = $1;
    `;
    await db.query(sql, [userId, passwordHash]);
  },
};
