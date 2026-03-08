-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  warehouse_name VARCHAR(100) NOT NULL,
  warehouse_code VARCHAR(50) UNIQUE NOT NULL,
  location VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Türkiye',
  manager_name VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  capacity INTEGER,
  current_stock_level INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create warehouse_stock table (products in warehouses)
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id SERIAL PRIMARY KEY,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 10,
  max_stock_level INTEGER,
  last_stock_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(warehouse_id, product_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(warehouse_code);
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_product ON warehouse_stock(product_id);

-- Add warehouse_id to products table (default warehouse)
ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL;

-- Insert default warehouse
INSERT INTO warehouses (warehouse_name, warehouse_code, location, city, country, is_active, company_id)
SELECT 'Ana Depo', 'WH-001', 'Merkez', 'Istanbul', 'Türkiye', true,
       (SELECT id FROM companies WHERE company_code = 'DEFAULT_COMPANY' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM companies WHERE company_code = 'DEFAULT_COMPANY')
ON CONFLICT (warehouse_code) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_warehouses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_warehouses_updated_at ON warehouses;
CREATE TRIGGER trigger_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouses_updated_at();

DROP TRIGGER IF EXISTS trigger_warehouse_stock_updated_at ON warehouse_stock;
CREATE TRIGGER trigger_warehouse_stock_updated_at
  BEFORE UPDATE ON warehouse_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouses_updated_at();
