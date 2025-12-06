-- Create user 2FA table
CREATE TABLE IF NOT EXISTS user_2fa (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    secret VARCHAR(32) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    backup_codes_generated_at TIMESTAMP,
    last_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create backup codes table
CREATE TABLE IF NOT EXISTS user_2fa_backup_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    code VARCHAR(8) NOT NULL UNIQUE,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_user_2fa_user_id ON user_2fa(user_id);
CREATE INDEX idx_user_2fa_backup_codes_user_id ON user_2fa_backup_codes(user_id);
CREATE INDEX idx_user_2fa_backup_codes_code ON user_2fa_backup_codes(code);