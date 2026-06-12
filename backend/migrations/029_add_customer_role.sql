-- Migration 029: Add 'customer' role to users table
-- Allows customer portal users to log in with restricted chatbot access

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'admin', 'manager', 'user', 'customer'));
