-- Add collateral_bank column to cheques table
-- Migration: 027_add_collateral_bank_column.sql

-- Teminat durumu için ayrı collateral_bank kolonu ekle
ALTER TABLE cheques 
ADD COLUMN IF NOT EXISTS collateral_bank VARCHAR(255);

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_cheques_collateral_bank ON cheques(collateral_bank);

COMMENT ON COLUMN cheques.bank_name IS 'Çekin üzerindeki banka adı (asıl banka)';
COMMENT ON COLUMN cheques.collateral_bank IS 'Çekin teminat olarak verildiği banka adı';
