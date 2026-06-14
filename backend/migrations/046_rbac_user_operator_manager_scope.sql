-- RBAC matrisini netleştir (şirket içi kargaşayı önle):
--   user    = operatör — kendi sipariş/çeklerini oluşturur, müşteri ekler, ürün yönetir; finansalı görmez
--   manager = operasyon lideri — tam operasyon; AMA kullanıcı yönetimi + ayarlar admin-only
--   admin   = sistem sahibi (değişmez)
-- Not: çek görünürlüğü user_id ile izole (chequeController) → user sadece kendi çekini görür.

-- user'a operatör izinleri ekle (045 sonrası: products.view, orders.view/create, cheques.view, reports.view zaten var)
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', id FROM permissions WHERE name IN (
  'products.create', 'products.edit',   -- ürün/stok ekle, düzenle (silme YOK)
  'customers.view', 'customers.create', -- müşteri gör + oluştur (sipariş/çek için; düzenle/sil YOK)
  'cheques.create'                       -- çek yaz (kendi çekleri izole)
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- manager'dan kullanıcı yönetimi + ayar görünürlüğünü kaldır (matris: manager ❌)
DELETE FROM role_permissions
WHERE role = 'manager'
  AND permission_id IN (
    SELECT id FROM permissions
    WHERE name IN ('users.view', 'users.create', 'users.edit', 'settings.view')
  );
