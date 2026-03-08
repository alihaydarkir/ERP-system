-- Migration: Add Supplier to Products
-- Description: Ürünlere tedarikçi ilişkisi ekleme

-- Add supplier_id column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- Update payment terms terminology in suppliers table
UPDATE suppliers 
SET payment_terms = CASE 
  WHEN payment_terms = 'Net 15' THEN '15 Gün Vade'
  WHEN payment_terms = 'Net 30' THEN '30 Gün Vade'
  WHEN payment_terms = 'Net 45' THEN '45 Gün Vade'
  WHEN payment_terms = 'Net 60' THEN '60 Gün Vade'
  WHEN payment_terms = 'Net 90' THEN '90 Gün Vade'
  WHEN payment_terms = 'Peşin' THEN 'Peşin'
  ELSE payment_terms
END;

COMMENT ON COLUMN products.supplier_id IS 'Ürünün tedarikçisi';
COMMENT ON COLUMN suppliers.payment_terms IS 'Ödeme vadesi (Peşin, 15/30/45/60/90 Gün Vade)';
