-- İş anahtarları şirket bazlı benzersiz: önceden SKU, tedarikçi vergi no, depo kodu ve çek seri+banka
-- GLOBAL benzersizdi; başka bir şirketin değeri çakışma hatası/varlık sinyali veriyordu ve
-- bir şirket diğerinin tanımlayıcısını "kapabiliyordu" (güvenlik denetimi 2026-10).

ALTER TABLE products   DROP CONSTRAINT IF EXISTS products_sku_key;
ALTER TABLE suppliers  DROP CONSTRAINT IF EXISTS unique_tax_number;
ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS warehouses_warehouse_code_key;
ALTER TABLE cheques    DROP CONSTRAINT IF EXISTS unique_check_serial_bank;

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_sku
  ON products(company_id, sku);
CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_company_tax_number
  ON suppliers(company_id, tax_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouses_company_code
  ON warehouses(company_id, warehouse_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cheques_company_serial_bank
  ON cheques(company_id, check_serial_no, bank_name);
