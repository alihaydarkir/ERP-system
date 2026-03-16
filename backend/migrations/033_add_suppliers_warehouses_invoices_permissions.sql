-- Add missing module permissions used by AI and API routes (idempotent)
INSERT INTO permissions (name, description, module, action) VALUES
  ('suppliers.view', 'Tedarikçileri görüntüleme', 'suppliers', 'view'),
  ('suppliers.create', 'Yeni tedarikçi oluşturma', 'suppliers', 'create'),
  ('suppliers.edit', 'Tedarikçi düzenleme', 'suppliers', 'edit'),
  ('suppliers.delete', 'Tedarikçi silme', 'suppliers', 'delete'),

  ('warehouses.view', 'Depoları görüntüleme', 'warehouses', 'view'),
  ('warehouses.create', 'Yeni depo oluşturma', 'warehouses', 'create'),
  ('warehouses.edit', 'Depo düzenleme', 'warehouses', 'edit'),
  ('warehouses.delete', 'Depo silme', 'warehouses', 'delete'),

  ('invoices.view', 'Faturaları görüntüleme', 'invoices', 'view'),
  ('invoices.create', 'Yeni fatura oluşturma', 'invoices', 'create'),
  ('invoices.edit', 'Fatura düzenleme', 'invoices', 'edit'),
  ('invoices.delete', 'Fatura silme', 'invoices', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Ensure admin has all newly added permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', p.id
FROM permissions p
WHERE p.name IN (
  'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
  'warehouses.view', 'warehouses.create', 'warehouses.edit', 'warehouses.delete',
  'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Manager: operational create/edit/view access
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', p.id
FROM permissions p
WHERE p.name IN (
  'suppliers.view', 'suppliers.create', 'suppliers.edit',
  'warehouses.view', 'warehouses.create', 'warehouses.edit',
  'invoices.view', 'invoices.create', 'invoices.edit'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- User: read-only access
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', p.id
FROM permissions p
WHERE p.name IN ('suppliers.view', 'warehouses.view', 'invoices.view')
ON CONFLICT (role, permission_id) DO NOTHING;
