-- Add completed_at column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Create index for completed_at for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at);
