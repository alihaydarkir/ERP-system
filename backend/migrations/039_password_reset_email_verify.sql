-- Password reset + email verification compatibility migration

-- users columns for inline email verification flow
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verify_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMPTZ;

-- keep existing users valid
UPDATE users
SET email_verified = false
WHERE email_verified IS NULL;

-- password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- normalize old installations where column type/constraints differ
ALTER TABLE password_reset_tokens
  ALTER COLUMN token_hash TYPE VARCHAR(64),
  ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at::timestamptz,
  ALTER COLUMN used_at TYPE TIMESTAMPTZ USING used_at::timestamptz,
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uq_password_reset_tokens_token_hash
  ON password_reset_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_users_email_verify_token
  ON users(email_verify_token);
