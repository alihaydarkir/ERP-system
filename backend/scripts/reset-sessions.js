/**
 * reset-sessions.js
 * Tüm aktif oturumları, login bloklarını ve revoked token'ları temizler.
 * Admin kullanıcısının var ve aktif olduğunu doğrular.
 * Kullanım: node scripts/reset-sessions.js
 */

require('dotenv').config();
const { pool } = require('../src/config/database');
const bcrypt = require('bcrypt');

const ADMIN = {
  username: 'admin',
  email: 'admin@erp.local',
  password: 'admin123',
  role: 'admin',
  full_name: 'Admin User',
};

async function run() {
  console.log('\n🔄 Oturum sıfırlama başlıyor...\n');

  try {
    // 1. Tüm user_sessions kapat
    const sessions = await pool.query(
      `UPDATE user_sessions SET is_active = false, last_activity = NOW() WHERE is_active = true`
    );
    console.log(`✅ Aktif oturumlar kapatıldı (${sessions.rowCount} adet)`);

    // 2. Login denemelerini temizle (IP bloklarını kaldır)
    const attempts = await pool.query(`DELETE FROM login_attempts`);
    console.log(`✅ Login denemeleri temizlendi (${attempts.rowCount} kayıt silindi)`);

    // 3. Revoked token'ları temizle
    try {
      const revoked = await pool.query(`DELETE FROM revoked_access_tokens`);
      console.log(`✅ Revoked token'lar temizlendi (${revoked.rowCount} adet)`);
    } catch (e) {
      if (e.code === '42P01') {
        console.log('ℹ️  revoked_access_tokens tablosu yok, atlandı');
      } else throw e;
    }

    // 4. Admin kullanıcısını kontrol et / oluştur / aktif et
    const existing = await pool.query(
      `SELECT id, username, email, approval_status, is_active, deleted_at FROM users WHERE email = $1`,
      [ADMIN.email]
    );

    if (existing.rows.length === 0) {
      // Admin yok — oluştur
      const hashedPassword = await bcrypt.hash(ADMIN.password, 10);

      // Default company bul veya geç
      const company = await pool.query(
        `SELECT id FROM companies WHERE company_code = 'DEFAULT_COMPANY' LIMIT 1`
      );
      const companyId = company.rows[0]?.id || null;

      await pool.query(
        `INSERT INTO users (username, email, password_hash, role, full_name, company_id, approval_status, approved_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, 'approved', NOW(), true)`,
        [ADMIN.username, ADMIN.email, hashedPassword, ADMIN.role, ADMIN.full_name, companyId]
      );
      console.log(`✅ Admin kullanıcısı oluşturuldu: ${ADMIN.email}`);
    } else {
      // Admin var — aktif ve onaylı yap, deleted_at sıfırla
      const row = existing.rows[0];
      const hashedPassword = await bcrypt.hash(ADMIN.password, 10);

      await pool.query(
        `UPDATE users
         SET approval_status = 'approved',
             is_active = true,
             deleted_at = NULL,
             password_hash = $1,
             approved_at = COALESCE(approved_at, NOW()),
             updated_at = NOW()
         WHERE id = $2`,
        [hashedPassword, row.id]
      );
      console.log(`✅ Admin hesabı sıfırlandı (id: ${row.id})`);
    }

    console.log('\n🎉 Sıfırlama tamamlandı!\n');
    console.log('─────────────────────────────────');
    console.log('  Giriş bilgileri:');
    console.log(`  Email    : ${ADMIN.email}`);
    console.log(`  Şifre    : ${ADMIN.password}`);
    console.log('─────────────────────────────────\n');

  } catch (error) {
    console.error('\n❌ Hata:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
