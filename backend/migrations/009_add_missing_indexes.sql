-- Add missing indexes for performance optimization

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_stock_low ON products(stock_quantity) WHERE stock_quantity < 100;
CREATE INDEX IF NOT EXISTS idx_products_category_stock ON products(category, stock_quantity);

-- Orders table composite indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);

-- Audit logs composite indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);

-- RAG Knowledge indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rag_knowledge') THEN
        CREATE INDEX IF NOT EXISTS idx_rag_knowledge_category ON rag_knowledge(category);
        CREATE INDEX IF NOT EXISTS idx_rag_knowledge_created ON rag_knowledge(created_at DESC);
    END IF;
END $$;
