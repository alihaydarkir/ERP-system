-- Ayarlar şirket bazlı: company_id NULL satırları değişmeyen varsayılan şablon, şirketin değeri kendi satırında.
-- Önceden tablo ortaktı: bir şirketin admin'i diğerlerinin SMTP şifresini görüp ayarlarını değiştirebiliyordu.

ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE system_settings DROP CONSTRAINT IF EXISTS system_settings_key_key;
DROP INDEX IF EXISTS idx_system_settings_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_system_settings_default_key
  ON system_settings(key) WHERE company_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_system_settings_company_key
  ON system_settings(company_id, key) WHERE company_id IS NOT NULL;

-- Ortak tabloda bugüne kadar değiştirilmiş değerler (updated_by dolu) o kullanıcının
-- şirketine taşınır; şablon satırı 016'daki varsayılana döner. Böylece mevcut kurulumda
-- (tek şirket) hiçbir ayar kaybolmaz, diğer şirketler ise başkasının değerini görmez.
INSERT INTO system_settings (company_id, key, value, type, category, description, updated_by, updated_at)
SELECT u.company_id, s.key, s.value, s.type, s.category, s.description, s.updated_by, s.updated_at
FROM system_settings s
JOIN users u ON u.id = s.updated_by
WHERE s.company_id IS NULL
ON CONFLICT DO NOTHING;

UPDATE system_settings s
SET value = d.value, updated_by = NULL, updated_at = NOW()
FROM (VALUES
  ('companyName', 'My Company'), ('companyLogo', ''), ('currency', 'TRY'), ('language', 'TR'),
  ('timezone', 'Europe/Istanbul'), ('fiscalYearStart', '01-01'),
  ('emailSmtpHost', ''), ('emailSmtpPort', '587'), ('emailSmtpUsername', ''),
  ('emailSmtpPassword', ''), ('emailFromAddress', ''), ('emailFromName', 'Helix-Ware ERP Pro'),
  ('stockGlobalThreshold', '10'), ('stockMinLevel', '5'), ('stockMaxLevel', '1000'),
  ('stockAlertEmail', 'true'), ('taxNumber', ''), ('taxOffice', ''),
  ('taxRates', '[{"rate": 18, "category": "standard"}, {"rate": 8, "category": "reduced"}, {"rate": 1, "category": "super-reduced"}]'),
  ('aiOllamaUrl', 'http://localhost:11434'), ('aiModel', 'llama2'), ('aiRagTopK', '5'),
  ('aiTemperature', '0.7'),
  ('storageLocations', '["Main Warehouse", "Secondary Storage", "Retail Store"]')
) AS d(key, value)
WHERE s.key = d.key AND s.company_id IS NULL AND s.updated_by IS NOT NULL;

-- Şablonda karşılığı olmayan, uygulamadan eklenmiş ortak ayarlar: ekleyenin şirketine
-- kopyalandıktan sonra ortak tablodan kaldırılır.
DELETE FROM system_settings s
WHERE s.company_id IS NULL
  AND s.updated_by IS NOT NULL
  AND s.key NOT IN (
    'companyName', 'companyLogo', 'currency', 'language', 'timezone', 'fiscalYearStart',
    'emailSmtpHost', 'emailSmtpPort', 'emailSmtpUsername', 'emailSmtpPassword',
    'emailFromAddress', 'emailFromName', 'stockGlobalThreshold', 'stockMinLevel',
    'stockMaxLevel', 'stockAlertEmail', 'taxNumber', 'taxOffice', 'taxRates',
    'aiOllamaUrl', 'aiModel', 'aiRagTopK', 'aiTemperature', 'storageLocations'
  );

CREATE INDEX IF NOT EXISTS idx_system_settings_company ON system_settings(company_id);

COMMENT ON TABLE system_settings IS 'Ayarlar: company_id NULL = varsayılan şablon, dolu = o şirketin değeri';
