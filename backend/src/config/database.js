const { Pool } = require('pg');
const { config } = require('./env');

// PostgreSQL pool ayarları: eşzamanlı bağlantı limiti ve timeout değerleri
const poolConfig = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

const pool = new Pool(
  config.db.connectionString
    ? { connectionString: config.db.connectionString, ...poolConfig }
    : {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.name,
        ...poolConfig,
      }
);

// Test connection
pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err);
});

module.exports = pool;
