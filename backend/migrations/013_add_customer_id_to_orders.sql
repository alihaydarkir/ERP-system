-- Add customer_id column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER;

-- Add foreign key constraint
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- Add comment
COMMENT ON COLUMN orders.customer_id IS 'Reference to customer who placed the order';
