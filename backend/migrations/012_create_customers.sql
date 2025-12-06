-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    tax_office VARCHAR(255) NOT NULL,
    tax_number VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20),
    company_location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_tax_number UNIQUE(user_id, tax_number)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_tax_number ON customers(tax_number);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Add comment
COMMENT ON TABLE customers IS 'Stores customer/vendor information for orders';
