-- Add email verification status to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Password reset tokens (store only hash)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
    ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
    ON password_reset_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
    ON password_reset_tokens(expires_at);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
    ON email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash
    ON email_verification_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at
    ON email_verification_tokens(expires_at);
