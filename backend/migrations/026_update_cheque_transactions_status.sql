-- Update cheque_transactions table status constraint
-- Migration: 026_update_cheque_transactions_status.sql

-- Önce mevcut constraint'i kaldır
ALTER TABLE cheque_transactions DROP CONSTRAINT IF EXISTS cheque_transactions_new_status_check;
ALTER TABLE cheque_transactions DROP CONSTRAINT IF EXISTS cheque_transactions_old_status_check;

-- Yeni constraint'leri ekle (yeni durum değerleriyle)
ALTER TABLE cheque_transactions 
ADD CONSTRAINT cheque_transactions_new_status_check 
CHECK (new_status IN ('pending', 'paid', 'cancelled', 'beklemede', 'odendi', 'iptal', 'teminat', 'musteriye_verildi'));

ALTER TABLE cheque_transactions 
ADD CONSTRAINT cheque_transactions_old_status_check 
CHECK (old_status IS NULL OR old_status IN ('pending', 'paid', 'cancelled', 'beklemede', 'odendi', 'iptal', 'teminat', 'musteriye_verildi'));
