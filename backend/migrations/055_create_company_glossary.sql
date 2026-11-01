-- Şirkete özel terim sözlüğü: "mavi200" gibi kısaltma ve takma adları gerçek ürün/müşteri/tedarikçiye bağlar.
-- AI asistanı bu terimleri anlar; tanımadığı terimi sorup (yönetici onayıyla) buraya kaydeder.
CREATE TABLE IF NOT EXISTS company_glossary (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  term VARCHAR(80) NOT NULL,
  term_key VARCHAR(80) NOT NULL,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('product', 'customer', 'supplier')),
  entity_id INTEGER NOT NULL,
  canonical_text VARCHAR(255) NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT company_glossary_company_term_key UNIQUE (company_id, term_key)
);

CREATE INDEX IF NOT EXISTS idx_company_glossary_company ON company_glossary(company_id);
