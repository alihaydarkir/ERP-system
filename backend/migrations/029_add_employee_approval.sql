-- Add employee approval system
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for approval queries
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);
CREATE INDEX IF NOT EXISTS idx_users_company_approval ON users(company_id, approval_status);

-- Set existing users as approved
UPDATE users SET approval_status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE approval_status = 'pending';

-- Create employee_invitations table (for inviting employees)
CREATE TABLE IF NOT EXISTS employee_invitations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by INTEGER NOT NULL REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON employee_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_company ON employee_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON employee_invitations(email);
