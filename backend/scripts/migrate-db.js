const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:secure_password@localhost:5432/erp_db'
});

async function runMigrations() {
  try {
    console.log('🚀 Running database migrations...\n');

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`✅ Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        try {
          await pool.query(sql);
        } catch (error) {
          // Skip pgvector extension error if not installed
          if (file === '006_pgvector_extension.sql' && error.code === '0A000') {
            console.log(`⚠️  Skipping ${file}: pgvector extension not installed (optional)`);
            continue;
          }
          throw error;
        }
      }
    }

    console.log('\n🎉 All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runMigrations();