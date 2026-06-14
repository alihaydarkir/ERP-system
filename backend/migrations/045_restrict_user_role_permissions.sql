-- user rolünü "temel operatör" seviyesine indir.
-- Menü izinlere göre filtrelendiği için (Layout.jsx) bu, user menüsünü de daraltır:
--   user görür : Dashboard, Ürünler, Siparişler, Çekler, Raporlar, AI Asistan
--   user görmez: Depolar, Müşteriler, Tedarikçiler, Faturalar, Cari Hesaplar (manager+)
-- Backend zaten create/edit/delete'i kısıtlıyordu; bu sadece view (sayfa erişimi) kapsamını daraltır.
-- manager ve admin etkilenmez.

DELETE FROM role_permissions
WHERE role = 'user'
  AND permission_id IN (
    SELECT id FROM permissions
    WHERE name IN ('customers.view', 'suppliers.view', 'warehouses.view', 'invoices.view')
  );
