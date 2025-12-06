-- Add permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_id)
);

-- Add activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- Insert default permissions
INSERT INTO permissions (name, description, module, action) VALUES
    -- Users module
    ('users.view', 'Kullanıcıları görüntüleme', 'users', 'view'),
    ('users.create', 'Yeni kullanıcı oluşturma', 'users', 'create'),
    ('users.edit', 'Kullanıcı düzenleme', 'users', 'edit'),
    ('users.delete', 'Kullanıcı silme', 'users', 'delete'),
    ('users.manage_roles', 'Kullanıcı rollerini yönetme', 'users', 'manage_roles'),
    
    -- Products module
    ('products.view', 'Ürünleri görüntüleme', 'products', 'view'),
    ('products.create', 'Yeni ürün oluşturma', 'products', 'create'),
    ('products.edit', 'Ürün düzenleme', 'products', 'edit'),
    ('products.delete', 'Ürün silme', 'products', 'delete'),
    ('products.import', 'Toplu ürün içe aktarma', 'products', 'import'),
    
    -- Orders module
    ('orders.view', 'Siparişleri görüntüleme', 'orders', 'view'),
    ('orders.create', 'Yeni sipariş oluşturma', 'orders', 'create'),
    ('orders.edit', 'Sipariş düzenleme', 'orders', 'edit'),
    ('orders.delete', 'Sipariş silme', 'orders', 'delete'),
    ('orders.complete', 'Sipariş tamamlama', 'orders', 'complete'),
    ('orders.cancel', 'Sipariş iptal etme', 'orders', 'cancel'),
    
    -- Customers module
    ('customers.view', 'Müşterileri görüntüleme', 'customers', 'view'),
    ('customers.create', 'Yeni müşteri oluşturma', 'customers', 'create'),
    ('customers.edit', 'Müşteri düzenleme', 'customers', 'edit'),
    ('customers.delete', 'Müşteri silme', 'customers', 'delete'),
    ('customers.import', 'Toplu müşteri içe aktarma', 'customers', 'import'),
    
    -- Cheques module
    ('cheques.view', 'Çekleri görüntüleme', 'cheques', 'view'),
    ('cheques.create', 'Yeni çek oluşturma', 'cheques', 'create'),
    ('cheques.edit', 'Çek düzenleme', 'cheques', 'edit'),
    ('cheques.delete', 'Çek silme', 'cheques', 'delete'),
    ('cheques.change_status', 'Çek durumu değiştirme', 'cheques', 'change_status'),
    
    -- Reports module
    ('reports.view', 'Raporları görüntüleme', 'reports', 'view'),
    ('reports.export', 'Rapor dışa aktarma', 'reports', 'export'),
    
    -- Settings module
    ('settings.view', 'Ayarları görüntüleme', 'settings', 'view'),
    ('settings.edit', 'Ayarları düzenleme', 'settings', 'edit'),
    
    -- Activity logs
    ('logs.view', 'Aktivite loglarını görüntüleme', 'logs', 'view')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to admin role
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign basic permissions to user role
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', id FROM permissions 
WHERE name IN (
    'products.view',
    'orders.view', 'orders.create',
    'customers.view',
    'cheques.view',
    'reports.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign manager permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions 
WHERE name NOT IN (
    'users.delete', 
    'users.manage_roles',
    'settings.edit',
    'logs.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;
