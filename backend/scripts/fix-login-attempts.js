const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:secure_password@localhost:5432/erp_db'
});

async function fixLoginAttemptsTable() {
  try {
    console.log('🔧 login_attempts tablosunu düzeltiliyor...\n');

    // user_id kolonunu ekle
    await pool.query(`
      ALTER TABLE login_attempts 
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);
    console.log('✅ user_id kolonu eklendi');

    // Index ekle
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_id)
    `);
    console.log('✅ user_id index\'i oluşturuldu');

    console.log('\n🎉 Tablo başarıyla güncellendi!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

fixLoginAttemptsTable();
