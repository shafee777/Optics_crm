-- Migration 014: Owner Account Recovery Key
-- Stores bcrypt hash of the owner recovery key, failed attempt counter, and lockout timestamp.

ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_key_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_failed_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_locked_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_recovery_email ON users(lower(email)) WHERE role = 'OWNER';
