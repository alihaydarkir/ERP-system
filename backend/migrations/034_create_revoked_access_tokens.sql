-- Revoked access tokens table (for immediate logout invalidation)
CREATE TABLE IF NOT EXISTS revoked_access_tokens (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revoked_access_tokens_user_id ON revoked_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_revoked_access_tokens_expires_at ON revoked_access_tokens(expires_at);
