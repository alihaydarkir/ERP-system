// Tanı paketi: müşteri yöneticisinin indirip desteğe gönderdiği, müşteri kaydı içermeyen
// sistem özeti. Uygulama hataları çoğunlukla console.error ile yazıldığından son hatalar
// bellekte bir halkada tutulur ve YAZILDIĞI ANDA maskelenir (ham hali hiç saklanmaz).
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');
const { getDeploymentMode, isOnPrem, isPrivateHost, isSentryEnabled, superAdminAllowed, externalRatesAllowed } =
  require('../config/deployment');

const MAX_ENTRIES = 300;
const MAX_ENTRY_LENGTH = 2000;
const LOG_TAIL_LINES = 200;
const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');
const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');

// Sıra önemli: önce yapısal sırlar (token, e-posta, IBAN), sonra genel sayı/IP maskeleri.
const MASKS = [
  [/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jwt]'],
  [/\b(bearer|token|password|passwd|secret|authorization|cookie)(["']?\s*[:=]\s*["']?)[^\s"',;}]+/gi, '$1$2[gizli]'],
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[e-posta]'],
  [/\bTR\d{2}[\d ]{10,30}\b/gi, '[iban]'],
  [/\?[^\s"')]*/g, '?[parametre]'],
  [/=\(([^)]*)\)/g, '=([değer])'],
  // Tırnak içi: kod tanımlayıcıları ('id', "company_id", 'toFixed') kalır; ad, sayı, boşluklu
  // metin gibi değer olabilecek her şey maskelenir.
  [/(["'])([^"'\n]{1,200})\1/g, (m, q, inner) => (/^[a-z_][a-zA-Z0-9_.]*$/.test(inner) ? m : `${q}[değer]${q}`)],
  [/\b\d{1,3}(\.\d{1,3}){3}\b/g, '[ip]'],
  [/\+?\d[\d\s-]{8,}\d/g, '[numara]'],
];

const sanitize = (text) => {
  let out = String(text);
  for (const [pattern, replacement] of MASKS) {
    out = out.replace(pattern, replacement);
  }
  return out.length > MAX_ENTRY_LENGTH ? `${out.slice(0, MAX_ENTRY_LENGTH)}…` : out;
};

const entries = [];

const record = (level, args) => {
  try {
    const message = util.format(...args);
    entries.push({ time: new Date().toISOString(), level, message: sanitize(message) });
    if (entries.length > MAX_ENTRIES) entries.shift();
  } catch {
    // Kayıt hiçbir zaman asıl loglamayı bozmamalı
  }
};

let installed = false;

// console.error / console.warn çıktısını (asıl çıktıyı değiştirmeden) halkaya da yazar.
const install = () => {
  if (installed) return;
  installed = true;
  for (const level of ['error', 'warn']) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      record(level, args);
      original(...args);
    };
  }
};

const recentEntries = () => entries.slice();

const clearEntries = () => {
  entries.length = 0;
};

const tailFile = (file, lines) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    return content.split('\n').filter(Boolean).slice(-lines).map(sanitize);
  } catch {
    return [];
  }
};

const safeHost = (url) => {
  try {
    const { hostname } = new URL(url);
    return isPrivateHost(hostname) ? 'yerel' : 'dış adres';
  } catch {
    return 'geçersiz';
  }
};

const configSummary = (env = process.env) => ({
  deployment_mode: getDeploymentMode(env),
  node_env: env.NODE_ENV || 'development',
  ai_provider: String(env.AI_PROVIDER || env.OLLAMA_PROVIDER || 'ollama').toLowerCase(),
  ai_model: env.OLLAMA_MODEL || null,
  ollama_host: safeHost(env.OLLAMA_BASE_URL || 'http://localhost:11434'),
  ollama_num_ctx: env.OLLAMA_NUM_CTX || null,
  sentry_enabled: isSentryEnabled(env),
  super_admin_allowed: superAdminAllowed(env),
  external_rates_allowed: externalRatesAllowed(env),
  redis_configured: Boolean(env.REDIS_URL || env.REDIS_HOST),
  smtp_configured: Boolean(env.SMTP_HOST),
});

const migrationStatus = async (pool) => {
  let files = [];
  try {
    files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  } catch {
    // migrations klasörü imajda yoksa yalnız DB tarafı raporlanır
  }
  try {
    const result = await pool.query('SELECT migration_name FROM schema_migrations ORDER BY migration_name');
    const applied = result.rows.map((r) => r.migration_name);
    const appliedSet = new Set(applied);
    return {
      applied_count: applied.length,
      last_applied: applied.slice(-3),
      pending: files.filter((f) => !appliedSet.has(f)),
    };
  } catch (error) {
    return { error: sanitize(error.message) };
  }
};

const databaseInfo = async (pool) => {
  try {
    const result = await pool.query(
      'SELECT version() AS version, pg_size_pretty(pg_database_size(current_database())) AS size'
    );
    return { status: 'ok', version: result.rows[0].version.split(',')[0], size: result.rows[0].size };
  } catch (error) {
    return { status: 'error', error: sanitize(error.message) };
  }
};

// Paket içeriği: sürüm/ortam, yapılandırma özeti (sır yok), sağlık, migration durumu,
// maskelenmiş son hatalar. Müşteri, ürün, sipariş vb. hiçbir kayıt eklenmez.
const buildBundle = async ({ pool, checkAi, getRedisStatus, company }) => {
  let ai = { available: false };
  try {
    const health = await checkAi();
    ai = {
      available: Boolean(health.available),
      model: health.currentModel || null,
      model_available: health.modelAvailable,
      installed_models: health.models || [],
      error: health.error ? sanitize(health.error) : undefined,
    };
  } catch (error) {
    ai = { available: false, error: sanitize(error.message) };
  }

  let redis = 'unknown';
  try {
    redis = await getRedisStatus();
  } catch (error) {
    redis = `error: ${sanitize(error.message)}`;
  }

  const pkg = require('../../package.json');

  return {
    generated_at: new Date().toISOString(),
    notice: 'Bu dosya müşteri kaydı içermez; hata mesajlarındaki e-posta, numara, IP ve değerler maskelenmiştir.',
    app: { name: pkg.name, version: pkg.version },
    company_id: company.id,
    runtime: {
      node: process.version,
      platform: `${os.platform()} ${os.release()} ${os.arch()}`,
      cpus: os.cpus().length,
      total_memory_mb: Math.round(os.totalmem() / 1048576),
      free_memory_mb: Math.round(os.freemem() / 1048576),
      process_memory_mb: Math.round(process.memoryUsage().rss / 1048576),
      uptime_minutes: Math.round(process.uptime() / 60),
      on_prem: isOnPrem(),
    },
    config: configSummary(),
    health: { database: await databaseInfo(pool), redis, ai },
    migrations: await migrationStatus(pool),
    recent_errors: recentEntries(),
    log_files: {
      error_log: tailFile(path.join(LOGS_DIR, 'error.log'), LOG_TAIL_LINES),
    },
  };
};

module.exports = {
  MAX_ENTRIES,
  sanitize,
  install,
  record,
  recentEntries,
  clearEntries,
  configSummary,
  buildBundle,
};
