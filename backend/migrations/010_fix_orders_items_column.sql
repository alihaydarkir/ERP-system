-- Fix orders table: Make items column nullable since we use order_items table instead
-- The items JSONB column was not being populated by Order.create()
-- We use a separate order_items table for better normalization

ALTER TABLE orders
ALTER COLUMN items DROP NOT NULL;

-- Set default empty array for existing rows
UPDATE orders SET items = '[]'::jsonb WHERE items IS NULL;

-- Set default for future inserts
ALTER TABLE orders
ALTER COLUMN items SET DEFAULT '[]'::jsonb;

COMMENT ON COLUMN orders.items IS 'Deprecated: Use order_items table instead. Kept for backwards compatibility.';
