-- Migration: Create cheque_transactions table
-- Description: Audit trail for cheque status changes

CREATE TABLE IF NOT EXISTS cheque_transactions (
  id SERIAL PRIMARY KEY,
  cheque_id INTEGER NOT NULL REFERENCES cheques(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL CHECK (new_status IN ('pending', 'cleared', 'bounced', 'cancelled')),
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  ip_address VARCHAR(45)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cheque_transactions_cheque_id ON cheque_transactions(cheque_id);
CREATE INDEX IF NOT EXISTS idx_cheque_transactions_changed_at ON cheque_transactions(changed_at);
CREATE INDEX IF NOT EXISTS idx_cheque_transactions_changed_by ON cheque_transactions(changed_by);

-- Add comment to table
COMMENT ON TABLE cheque_transactions IS 'Audit trail for tracking all status changes of cheques';
COMMENT ON COLUMN cheque_transactions.old_status IS 'Previous status before the change';
COMMENT ON COLUMN cheque_transactions.new_status IS 'New status after the change';
COMMENT ON COLUMN cheque_transactions.changed_by IS 'User who made the status change';
COMMENT ON COLUMN cheque_transactions.notes IS 'Additional notes about the status change';
