const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:secure_password@localhost:5432/erp_db'
});

const migrationsDir = path.join(__dirname, '..', 'migrations');

// Uygulanmış migration'lar `schema_migrations` tablosunda (000_create_migrations_table.sql
// ile tanımlı: migration_name UNIQUE) izlenir. Bu olmadan runner her çağrıda TÜM .sql
// dosyalarını baştan çalıştırır; idempotent olmayan tek bir migration tüm zinciri kırar.
async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      checksum VARCHAR(64),
      execution_time_ms INTEGER
    )
  `);
}

async function getAppliedMigrations() {
  const res = await pool.query('SELECT migration_name FROM schema_migrations');
  return new Set(res.rows.map((r) => r.migration_name));
}

async function recordMigration(client, name, checksum, ms) {
  await client.query(
    `INSERT INTO schema_migrations (migration_name, checksum, execution_time_ms)
     VALUES ($1, $2, $3) ON CONFLICT (migration_name) DO NOTHING`,
    [name, checksum, ms]
  );
}

async function runMigrations() {
  try {
    console.log('🚀 Running database migrations...\n');

    await ensureMigrationsTable();
    const applied = await getAppliedMigrations();

    const files = fs.readdirSync(migrationsDir).sort().filter((f) => f.endsWith('.sql'));

    let ran = 0;
    let skipped = 0;

    for (const file of files) {
      if (applied.has(file)) {
        skipped++;
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const checksum = crypto.createHash('md5').update(sql).digest('hex');
      const client = await pool.connect();
      const t0 = Date.now();
      try {
        // Her migration kendi transaction'ında: hata olursa kısmi uygulama kalmaz.
        await client.query('BEGIN');
        await client.query(sql);
        await recordMigration(client, file, checksum, Date.now() - t0);
        await client.query('COMMIT');
        console.log(`✅ Applied: ${file}`);
        ran++;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});

        // pgvector kurulu değilse (opsiyonel): atla ama "uygulandı" işaretle ki
        // sonraki çalıştırmalarda tekrar denenip aynı hatayı vermesin.
        if (file === '006_pgvector_extension.sql' && error.code === '0A000') {
          console.log(`⚠️  Skipping ${file}: pgvector extension not installed (optional)`);
          await pool.query(
            `INSERT INTO schema_migrations (migration_name, checksum, execution_time_ms)
             VALUES ($1, $2, 0) ON CONFLICT (migration_name) DO NOTHING`,
            [file, checksum]
          );
          client.release();
          continue;
        }

        console.error(`❌ Migration failed: ${file}\n   ${error.message}`);
        client.release();
        process.exit(1);
      }
      client.release();
    }

    console.log(`\n🎉 Migrations complete — ${ran} applied, ${skipped} already up-to-date.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runMigrations();
