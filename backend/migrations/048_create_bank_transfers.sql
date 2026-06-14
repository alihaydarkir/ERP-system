-- Banka havalesi ödemeleri (Ödemeler modülü — çek + banka havale).
-- "Girince direkt onaylı" → her havale geçerli ödemedir; cari hesapta total_paid'e eklenir.
CREATE TABLE IF NOT EXISTS bank_transfers (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER NOT NULL,
  user_id       INTEGER NOT NULL,
  customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bank_name     VARCHAR(100) NOT NULL,
  receipt_no    VARCHAR(100),                 -- dekont no
  transfer_date DATE NOT NULL,
  amount        NUMERIC(14,2) NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_transfers_customer ON bank_transfers(customer_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_company  ON bank_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_user     ON bank_transfers(user_id);
