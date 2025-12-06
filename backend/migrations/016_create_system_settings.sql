-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(50) DEFAULT 'string', -- "string", "number", "boolean", "json"
    category VARCHAR(50), -- "general", "email", "stock", "tax", "ai", "storage"
    description TEXT,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Insert default settings
INSERT INTO system_settings (key, value, type, category, description) VALUES
-- General Settings
('companyName', 'My Company', 'string', 'general', 'Company name displayed in the system'),
('companyLogo', '', 'string', 'general', 'URL to company logo'),
('currency', 'TRY', 'string', 'general', 'Default currency (TRY, USD, EUR)'),
('language', 'TR', 'string', 'general', 'System language (TR, EN)'),
('timezone', 'Europe/Istanbul', 'string', 'general', 'System timezone'),
('fiscalYearStart', '01-01', 'string', 'general', 'Fiscal year start date (MM-DD)'),

-- Email Settings
('emailSmtpHost', '', 'string', 'email', 'SMTP server host'),
('emailSmtpPort', '587', 'number', 'email', 'SMTP server port'),
('emailSmtpUsername', '', 'string', 'email', 'SMTP username'),
('emailSmtpPassword', '', 'string', 'email', 'SMTP password (encrypted)'),
('emailFromAddress', '', 'string', 'email', 'From email address'),
('emailFromName', 'ERP System', 'string', 'email', 'From name'),

-- Stock Settings
('stockGlobalThreshold', '10', 'number', 'stock', 'Global low stock threshold'),
('stockMinLevel', '5', 'number', 'stock', 'Minimum stock level'),
('stockMaxLevel', '1000', 'number', 'stock', 'Maximum stock level'),
('stockAlertEmail', 'true', 'boolean', 'stock', 'Send email alerts for low stock'),

-- Tax Settings
('taxNumber', '', 'string', 'tax', 'Company tax number'),
('taxOffice', '', 'string', 'tax', 'Tax office name'),
('taxRates', '[{"rate": 18, "category": "standard"}, {"rate": 8, "category": "reduced"}, {"rate": 1, "category": "super-reduced"}]', 'json', 'tax', 'VAT/Tax rates'),

-- AI/Chatbot Settings
('aiOllamaUrl', 'http://localhost:11434', 'string', 'ai', 'Ollama server URL'),
('aiModel', 'llama2', 'string', 'ai', 'AI model to use'),
('aiRagTopK', '5', 'number', 'ai', 'Number of RAG results to return'),
('aiTemperature', '0.7', 'number', 'ai', 'AI temperature (0-1)'),

-- Storage Settings
('storageLocations', '["Main Warehouse", "Secondary Storage", "Retail Store"]', 'json', 'storage', 'List of storage locations')

ON CONFLICT (key) DO NOTHING;

-- Add comment
COMMENT ON TABLE system_settings IS 'Stores system-wide configuration settings';
