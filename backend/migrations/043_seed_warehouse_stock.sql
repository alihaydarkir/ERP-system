-- Demo: ürünleri kategorilerine göre depolara dağıt.
-- warehouse_stock tablosu boştu; depo stok sorguları (get_warehouse_stock,
-- Warehouse.findAll product_count/total_items) bu yüzden hep 0 dönüyordu.

INSERT INTO warehouse_stock (warehouse_id, product_id, quantity, last_stock_update)
SELECT
  w.id,
  p.id,
  p.stock_quantity,
  NOW()
FROM products p
JOIN warehouses w
  ON w.company_id = p.company_id
 AND w.warehouse_name = CASE p.category
      WHEN 'Elektronik' THEN 'Ana Depo Istanbul'
      WHEN 'Tekstil'    THEN 'Bursa Tekstil Depo'
      WHEN 'İnşaat'     THEN 'Ankara Merkez Depo'
      WHEN 'Makine'     THEN 'Ankara Merkez Depo'
      WHEN 'Gıda'       THEN 'Izmir Liman Deposu'
      ELSE 'Ana Depo Istanbul'
    END
WHERE p.company_id = 1
ON CONFLICT (warehouse_id, product_id) DO NOTHING;
