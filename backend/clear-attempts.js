const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function clearAttempts() {
  try {
    const result = await pool.query(`
      DELETE FROM login_attempts 
      WHERE success = false 
      AND created_at > NOW() - INTERVAL '15 minutes'
    `);
    
    console.log('✅ Temizlendi:', result.rowCount, 'kayıt');
    
    const remaining = await pool.query(`
      SELECT COUNT(*) as count FROM login_attempts 
      WHERE success = false
    `);
    
    console.log('📊 Kalan başarısız deneme:', remaining.rows[0].count);
  } catch (err) {
    console.error('❌ Hata:', err.message);
  } finally {
    await pool.end();
  }
}

clearAttempts();
