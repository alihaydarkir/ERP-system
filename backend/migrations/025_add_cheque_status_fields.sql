-- Add bank_name and given_to_customer_id columns to cheques table
-- Migration: 025_add_cheque_status_fields.sql

-- Teminat durumu için banka adı
ALTER TABLE cheques 
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS given_to_customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;

-- Status alanı için check constraint güncelle (varsa kaldır önce)
ALTER TABLE cheques DROP CONSTRAINT IF EXISTS cheques_status_check;

-- Yeni durum değerleri ile constraint ekle (hem eski hem yeni değerleri destekle)
ALTER TABLE cheques 
ADD CONSTRAINT cheques_status_check 
CHECK (status IN ('pending', 'paid', 'cancelled', 'beklemede', 'odendi', 'iptal', 'teminat', 'musteriye_verildi'));

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_cheques_given_to_customer_id ON cheques(given_to_customer_id);
CREATE INDEX IF NOT EXISTS idx_cheques_status ON cheques(status);

COMMENT ON COLUMN cheques.bank_name IS 'Teminat çekinin verildiği banka adı';
COMMENT ON COLUMN cheques.given_to_customer_id IS 'Çekin verildiği müşteri ID';
