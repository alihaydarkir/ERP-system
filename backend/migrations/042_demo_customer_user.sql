-- Demo müşteri kullanıcısı: Ahmet Yılmaz (customer_id=8) için giriş yapılabilir hesap
-- Şifre: Customer123!  (bcrypt hash)
-- Giriş: username=ahmet.yilmaz  email=ahmet@yilmazinsaat.com

INSERT INTO users (username, email, password_hash, role, company_id, approval_status, created_at, updated_at)
SELECT
  'ahmet.yilmaz',
  'ahmet@yilmazinsaat.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhN3uXWndqLsGp0v1bmxAe', -- Customer123!
  'customer',
  1,
  'approved',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'ahmet@yilmazinsaat.com'
);

-- Mevcut customer kaydını bu kullanıcıya bağla
UPDATE customers
SET user_id = (SELECT id FROM users WHERE email = 'ahmet@yilmazinsaat.com' LIMIT 1)
WHERE id = 8
  AND company_id = 1
  AND (SELECT id FROM users WHERE email = 'ahmet@yilmazinsaat.com' LIMIT 1) IS NOT NULL;

-- İkinci demo müşteri: Fatma Kaya
INSERT INTO users (username, email, password_hash, role, company_id, approval_status, created_at, updated_at)
SELECT
  'fatma.kaya',
  'fatma@kayatekstil.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhN3uXWndqLsGp0v1bmxAe', -- Customer123!
  'customer',
  1,
  'approved',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'fatma@kayatekstil.com'
);

UPDATE customers
SET user_id = (SELECT id FROM users WHERE email = 'fatma@kayatekstil.com' LIMIT 1)
WHERE id = 9
  AND company_id = 1
  AND (SELECT id FROM users WHERE email = 'fatma@kayatekstil.com' LIMIT 1) IS NOT NULL;
