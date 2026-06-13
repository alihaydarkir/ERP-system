-- Migration: Create Suppliers Table
-- Description: Tedarikçi bilgilerini saklayan tablo

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  supplier_name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  tax_office VARCHAR(255),
  tax_number VARCHAR(50),
  iban VARCHAR(50),
  payment_terms VARCHAR(50) DEFAULT 'Net 30', -- Ödeme vadesi (Net 30, Net 60, vb.)
  currency VARCHAR(3) DEFAULT 'TRY', -- Para birimi
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 arası değerlendirme
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  CONSTRAINT unique_tax_number UNIQUE(tax_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(supplier_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_tax_number ON suppliers(tax_number);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_suppliers_updated_at ON suppliers;
CREATE TRIGGER trigger_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_suppliers_updated_at();

-- NOT: Örnek/demo veri burada DEĞİL, seed scriptlerinde (npm run seed) tutulur.
-- Eski sürümde buradaki INSERT, company_id + companies tablosuna (028'de oluşan)
-- ve users.id=1'e atıf yaptığı için SIFIR bir veritabanında migration zincirini
-- kırıyordu. Migration'lar yalnızca şema tanımlar.
