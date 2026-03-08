-- Add company_id to all main tables for multi-tenancy isolation

-- Products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Order Items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Suppliers
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Warehouses
ALTER TABLE warehouses 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Cheques
ALTER TABLE cheques 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Cheque Transactions
ALTER TABLE cheque_transactions 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Audit Logs
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Activity Logs (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        EXECUTE 'ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE';
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_order_items_company_id ON order_items(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_company_id ON warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_cheques_company_id ON cheques(company_id);
CREATE INDEX IF NOT EXISTS idx_cheque_transactions_company_id ON cheque_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);

-- Update existing records to belong to default company (id=1)
-- WARNING: This assumes company id=1 exists (default 'Company')
UPDATE products SET company_id = 1 WHERE company_id IS NULL;
UPDATE orders SET company_id = 1 WHERE company_id IS NULL;
UPDATE order_items SET company_id = 1 WHERE company_id IS NULL;
UPDATE customers SET company_id = 1 WHERE company_id IS NULL;
UPDATE suppliers SET company_id = 1 WHERE company_id IS NULL;
UPDATE warehouses SET company_id = 1 WHERE company_id IS NULL;
UPDATE cheques SET company_id = 1 WHERE company_id IS NULL;
UPDATE cheque_transactions SET company_id = 1 WHERE company_id IS NULL;
UPDATE audit_logs SET company_id = 1 WHERE company_id IS NULL;

-- Make company_id NOT NULL after setting default values
ALTER TABLE products ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE warehouses ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE cheques ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE cheque_transactions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN company_id SET NOT NULL;
