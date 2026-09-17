CREATE TABLE IF NOT EXISTS auth_refresh_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_jti UUID NOT NULL UNIQUE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_sessions_user
    ON auth_refresh_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_sessions_active
    ON auth_refresh_sessions(token_jti, revoked_at, expires_at);