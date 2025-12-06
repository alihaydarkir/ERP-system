-- Fix audit_logs table column names for existing databases
-- This migration updates column names to match the codebase

-- Check if old columns exist and rename them
DO $$
BEGIN
    -- Rename resource to entity_type if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'resource'
    ) THEN
        ALTER TABLE audit_logs RENAME COLUMN resource TO entity_type;
    END IF;

    -- Rename resource_id to entity_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'resource_id'
    ) THEN
        ALTER TABLE audit_logs RENAME COLUMN resource_id TO entity_id;
    END IF;

    -- Rename details to changes if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'details'
    ) THEN
        ALTER TABLE audit_logs RENAME COLUMN details TO changes;
    END IF;
END $$;

-- Drop old index if exists and create new one
DROP INDEX IF EXISTS idx_audit_logs_resource;
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
