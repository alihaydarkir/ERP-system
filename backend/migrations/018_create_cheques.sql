-- Migration: Create cheques table
-- Description: Table for managing received cheques from customers

CREATE TABLE IF NOT EXISTS cheques (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  check_serial_no VARCHAR(50) NOT NULL,
  check_issuer VARCHAR(255) NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  bank_name VARCHAR(255) NOT NULL,
  received_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'TRY' CHECK (currency IN ('TRY', 'USD', 'EUR', 'GBP')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'bounced', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_check_serial_bank UNIQUE (check_serial_no, bank_name),
  CONSTRAINT check_dates CHECK (due_date > received_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cheques_due_date ON cheques(due_date);
CREATE INDEX IF NOT EXISTS idx_cheques_status ON cheques(status);
CREATE INDEX IF NOT EXISTS idx_cheques_user_id ON cheques(user_id);
CREATE INDEX IF NOT EXISTS idx_cheques_customer_id ON cheques(customer_id);
CREATE INDEX IF NOT EXISTS idx_cheques_received_date ON cheques(received_date);

-- Add comment to table
COMMENT ON TABLE cheques IS 'Stores information about received cheques from customers';
COMMENT ON COLUMN cheques.check_serial_no IS 'Unique serial number printed on the cheque';
COMMENT ON COLUMN cheques.check_issuer IS 'Person or company who issued the cheque';
COMMENT ON COLUMN cheques.customer_id IS 'Reference to the customer who gave the cheque';
COMMENT ON COLUMN cheques.bank_name IS 'Bank name where the cheque is drawn';
COMMENT ON COLUMN cheques.received_date IS 'Date when the cheque was received';
COMMENT ON COLUMN cheques.due_date IS 'Maturity date of the cheque';
COMMENT ON COLUMN cheques.status IS 'Current status: pending, cleared, bounced, cancelled';
