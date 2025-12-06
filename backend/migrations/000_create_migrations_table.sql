-- Migration tracking table
-- This table keeps track of which migrations have been run
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    execution_time_ms INTEGER
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_migrations_name ON schema_migrations(migration_name);
CREATE INDEX IF NOT EXISTS idx_migrations_executed ON schema_migrations(executed_at);

-- Insert this migration itself
INSERT INTO schema_migrations (migration_name, checksum, execution_time_ms)
VALUES ('000_create_migrations_table.sql', 'initial', 0)
ON CONFLICT (migration_name) DO NOTHING;
