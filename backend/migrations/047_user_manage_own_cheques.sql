-- user kendi çekini tam yönetebilsin (oluştur + düzenle + durum değiştir), AMA silemesin.
-- Sahiplik chequeController.canAccessCheque ile zorlanır → user yalnızca KENDİ çekine dokunur.
-- (Tahsilat-operatörü modeli: kendi çekini "Ödendi/Teminat" vb. işaretleyebilmeli.)
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', id FROM permissions WHERE name IN (
  'cheques.edit',
  'cheques.change_status'
)
ON CONFLICT (role, permission_id) DO NOTHING;
