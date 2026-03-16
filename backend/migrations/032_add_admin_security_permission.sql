-- Add admin.security permission (idempotent)
INSERT INTO permissions (name, description, module, action)
VALUES ('admin.security', 'Güvenlik yönetimi ve izleme', 'admin', 'security')
ON CONFLICT (name) DO NOTHING;

-- Ensure admin role has admin.security permission
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', p.id
FROM permissions p
WHERE p.name = 'admin.security'
ON CONFLICT (role, permission_id) DO NOTHING;
