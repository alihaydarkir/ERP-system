-- Create companies (tenants) table for multi-tenancy
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  company_code VARCHAR(50) UNIQUE NOT NULL,
  tax_number VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Türkiye',
  phone VARCHAR(20),
  email VARCHAR(100),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  subscription_plan VARCHAR(50) DEFAULT 'basic',
  subscription_expires_at TIMESTAMP,
  max_users INTEGER DEFAULT 10,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on company_code
CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(company_code);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);

-- Add company_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);

-- Update role enum to include super_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'manager', 'user'));

-- Add company_id to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);

-- Add company_id to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);

-- Add company_id to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_orders_company ON orders(company_id);

-- Add company_id to cheques table
ALTER TABLE cheques ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cheques_company ON cheques(company_id);

-- Add company_id to suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);

-- Add company_id to warehouses table
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_warehouses_company ON warehouses(company_id);

-- Insert default company for existing data
INSERT INTO companies (company_name, company_code, is_active)
VALUES ('Varsayılan Şirket', 'DEFAULT_COMPANY', true)
ON CONFLICT (company_code) DO NOTHING;

-- Update existing records with default company_id
DO $$
DECLARE
  default_company_id INTEGER;
BEGIN
  SELECT id INTO default_company_id FROM companies WHERE company_code = 'DEFAULT_COMPANY';
  
  UPDATE users SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE products SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE customers SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE orders SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE cheques SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE suppliers SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE warehouses SET company_id = default_company_id WHERE company_id IS NULL;
END $$;

-- Make company_id NOT NULL after populating
ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE cheques ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE warehouses ALTER COLUMN company_id SET NOT NULL;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_companies_updated_at ON companies;
CREATE TRIGGER trigger_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();
