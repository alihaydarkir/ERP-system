-- Gelen stok (teslim alınan ama henüz açığa/siparişe uygulanmamış stok).
-- Mevcut ürüne stok girişi buraya eklenir; stock_quantity (açık/-1100) sabit kalır.
-- Sipariş sevk edilince (complete-partial) incoming_stock, sevk adetince stock_quantity'ye aktarılır.
ALTER TABLE products ADD COLUMN IF NOT EXISTS incoming_stock INTEGER NOT NULL DEFAULT 0;
