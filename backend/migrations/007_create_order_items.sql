-- Create order_items table for order line items

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Add comments
COMMENT ON TABLE order_items IS 'Stores individual line items for each order';
COMMENT ON COLUMN order_items.order_id IS 'Reference to the parent order';
COMMENT ON COLUMN order_items.product_id IS 'Reference to the ordered product';
COMMENT ON COLUMN order_items.quantity IS 'Quantity of the product ordered';
COMMENT ON COLUMN order_items.price IS 'Price per unit at the time of order';
