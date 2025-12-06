const pool = require('../backend/src/config/database');
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../backend/migrations');

const runMigrations = async () => {
  try {
    console.log('🔄 Migrations başlatılıyor...');

    // Migration dosyalarını oku ve çalıştır
    const migrationFiles = fs.readdirSync(migrationsDir).sort();

    for (const file of migrationFiles) {
      if (file.endsWith('.sql')) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await pool.query(sql);
        console.log(`✅ Migration tamamlandı: ${file}`);
      }
    }

    console.log('✅ Tüm migrations tamamlandı!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration hatası:', error);
    process.exit(1);
  }
};

runMigrations();

