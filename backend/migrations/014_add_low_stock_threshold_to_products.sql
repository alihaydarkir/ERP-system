-- Add low_stock_threshold column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;

-- Add comment
COMMENT ON COLUMN products.low_stock_threshold IS 'Minimum stock level before considered low stock';

-- Create index for low stock queries
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(low_stock_threshold) WHERE stock_quantity <= low_stock_threshold;
