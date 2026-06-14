-- Tedarikçi formundaki ek alanlar için kolonlar (website, lokasyon, tedarik süresi,
-- min sipariş miktarı, risk seviyesi). Frontend bunları gönderiyordu ama tabloda
-- karşılıkları olmadığından stripUnknown ile sessizce düşüyorlardı.

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20);
