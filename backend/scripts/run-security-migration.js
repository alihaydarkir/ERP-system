const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:secure_password@localhost:5432/erp_db'
});

async function runSecurityMigration() {
  try {
    console.log('🔒 Running security tables migration...\n');

    const migrationFile = path.join(__dirname, '..', 'migrations', '021_create_security_tables.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    await pool.query(sql);

    console.log('✅ Security tables created successfully!');
    console.log('   - ip_blacklist');
    console.log('   - login_attempts');
    console.log('   - user_sessions\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

runSecurityMigration();
