-- 2FA sertleştirme (güvenlik denetimi 2026-10):
--  * TOTP sırrı artık şifreli saklanır (enc:v1:... uzunluğu 32'yi aşar)
--  * TOTP tekrar kullanım koruması (last_used_step) ve deneme kilidi (failed_attempts / locked_until)
--  * Yedek kodlar düz metin değil anahtarlı özet olarak saklanır (code_hash)

ALTER TABLE user_2fa ALTER COLUMN secret TYPE TEXT;
ALTER TABLE user_2fa ADD COLUMN IF NOT EXISTS last_used_step BIGINT;
ALTER TABLE user_2fa ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_2fa ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Eski düz metin yedek kodlar silinir: 2FA ucu önceden sunucuya bağlı değildi (kimse etkinleştirememişti);
-- varsa kullanıcı yeni kod üretir.
DELETE FROM user_2fa_backup_codes;
ALTER TABLE user_2fa_backup_codes ALTER COLUMN code DROP NOT NULL;
ALTER TABLE user_2fa_backup_codes ADD COLUMN IF NOT EXISTS code_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_2fa_backup_codes_hash ON user_2fa_backup_codes(user_id, code_hash);
