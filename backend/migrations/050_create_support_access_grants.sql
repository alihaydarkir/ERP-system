-- Süreli destek erişimi: müşteri yöneticisi Helix-Ware desteğine süreli (1/4/24 saat) erişim izni verir.
-- Erişim kodu yalnızca hash olarak saklanır; destek oturumunun her isteği audit_logs'a is_support=true yazılır.
-- Destek kullanıcısı (role='support') şirket başına bir tanedir; şifresi rastgeledir, normal girişle kullanılamaz.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'admin', 'manager', 'user', 'customer', 'support'));

CREATE TABLE IF NOT EXISTS support_access_grants (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  support_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  access_level VARCHAR(10) NOT NULL DEFAULT 'read' CHECK (access_level IN ('read', 'edit')),
  code_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  revoked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  first_used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_grants_company ON support_access_grants(company_id, created_at DESC);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS is_support BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS support_grant_id INTEGER REFERENCES support_access_grants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_support_grant ON audit_logs(support_grant_id) WHERE support_grant_id IS NOT NULL;
