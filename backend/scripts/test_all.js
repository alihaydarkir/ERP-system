/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  ERP MASTER TEST RUNNER — Tüm Süitler                   ║
 * ║  Kullanım: node scripts/test_all.js [--only=suite] ...  ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Seçenekler:
 *   --only=auth|products|customers|orders|invoices|cheques|
 *           reports|ai|suppliers|settings|security|perf
 *   --skip=suite1,suite2        (virgülle ayrılmış atla)
 *   --verbose | -v              (hata detayları)
 *   --bail    | -b              (ilk hatada dur)
 *   --no-cleanup                (test verilerini silme)
 *
 * Örnek:
 *   node scripts/test_all.js
 *   node scripts/test_all.js --only=products
 *   node scripts/test_all.js --skip=security,perf
 *   node scripts/test_all.js --verbose --bail
 */

const { acquireToken, req, BASE_URL } = require('./helpers/api');
const { C, resetResults, getResults } = require('./helpers/runner');

/* ── Test başlangıcında temiz slate: Redis + DB engel kayıtları ── */
async function flushTestState() {
  // Redis rate-limit anahtarlarını temizle
  try {
    const { createClient } = require('redis');
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = createClient({ url });
    await client.connect();
    const keys = await client.keys('rl:*');
    if (keys.length > 0) {
      await client.del(keys);
      process.stdout.write(`${C.gray}  Redis: ${keys.length} rate-limit anahtarı temizlendi.${C.reset}\n`);
    }
    await client.quit();
  } catch (_) { /* sessizce geç */ }

  // DB: localhost engel kayıtlarını + test admin revoked tokenlarını + eski sessionları temizle
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const LOCAL_IPS = `('::1','127.0.0.1','::ffff:127.0.0.1')`;
    await pool.query(`DELETE FROM ip_blacklist WHERE ip_address IN ${LOCAL_IPS}`);
    await pool.query(`DELETE FROM login_attempts WHERE ip_address IN ${LOCAL_IPS} AND created_at > NOW() - INTERVAL '1 hour'`);
    await pool.query(`DELETE FROM activity_logs WHERE ip_address IN ${LOCAL_IPS} AND created_at > NOW() - INTERVAL '1 hour'`);
    // Test admin kullanıcısının revoked tokenlarını temizle (aynı saniye duplicate JWT sorununu önler)
    await pool.query(`DELETE FROM revoked_access_tokens WHERE user_id IN (SELECT id FROM users WHERE email = 'admin@erp.local')`).catch(() => {});
    // Test admin kullanıcısının eski (inactive) sessionlarını temizle
    await pool.query(`DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email = 'admin@erp.local') AND is_active = false`).catch(() => {});
    await pool.end();
    process.stdout.write(`${C.gray}  DB: localhost engel kayıtları temizlendi.${C.reset}\n`);
  } catch (_) { /* DB erişimi yoksa sessizce geç */ }
}

const ARGS = process.argv.slice(2);
const ONLY = (ARGS.find(a => a.startsWith('--only=')) || '').replace('--only=', '');
const SKIP = ((ARGS.find(a => a.startsWith('--skip=')) || '').replace('--skip=', '') || '').split(',').filter(Boolean);

/* Süit tanımları */
const SUITES = [
  { name: 'auth',      label: 'Kimlik Doğrulama',  fn: () => require('./test_auth').runAuthTests() },
  { name: 'products',  label: 'Ürün Yönetimi',      fn: () => require('./test_products').runProductTests() },
  { name: 'customers', label: 'Müşteri Yönetimi',   fn: () => require('./test_customers').runCustomerTests() },
  { name: 'orders',    label: 'Sipariş Yönetimi',   fn: () => require('./test_orders').runOrderTests() },
  { name: 'invoices',  label: 'Fatura Yönetimi',    fn: () => require('./test_invoices').runInvoiceTests() },
  { name: 'cheques',   label: 'Çek Yönetimi',       fn: () => require('./test_cheques').runChequeTests() },
  { name: 'reports',   label: 'Raporlama',           fn: () => require('./test_reports').runReportTests() },
  { name: 'ai',        label: 'AI / Chatbot',        fn: () => require('./test_ai').runAITests() },
  { name: 'suppliers', label: 'Tedarikçi',           fn: () => require('./test_suppliers').runSupplierTests() },
  { name: 'settings',  label: 'Ayarlar',             fn: () => require('./test_settings').runSettingsTests() },
  { name: 'security',  label: 'Güvenlik',            fn: () => require('./test_security').runSecurityTests() },
  { name: 'perf',      label: 'Performans',          fn: () => require('./test_performance').runPerformanceTests() },
];

async function run() {
  const startedAt = Date.now();

  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║       ERP MASTER TEST RUNNER v1.0                        ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`${C.gray}  Hedef   : ${BASE_URL}${C.reset}`);
  if (ONLY) console.log(`${C.yellow}  Filtre  : --only=${ONLY}${C.reset}`);
  if (SKIP.length) console.log(`${C.yellow}  Atlanan : ${SKIP.join(', ')}${C.reset}`);

  /* Çalıştırılacak süitler */
  let toRun = SUITES;
  if (ONLY) {
    toRun = SUITES.filter(s => s.name === ONLY);
    if (toRun.length === 0) {
      console.error(`${C.red}Bilinmeyen süit: ${ONLY}${C.reset}`);
      console.error(`Geçerli süitler: ${SUITES.map(s => s.name).join(', ')}`);
      process.exit(1);
    }
  } else if (SKIP.length) {
    toRun = SUITES.filter(s => !SKIP.includes(s.name));
  }

  /* Rate limit + DB engel kayıtları temizle — her test çalıştırmasında temiz başla */
  await flushTestState();

  /* Token — sadece BİR kez */
  process.stdout.write(`\n${C.gray}  Sunucuya bağlanılıyor ve oturum açılıyor...${C.reset}`);
  try {
    await acquireToken();
    process.stdout.write(` ${C.green}✓${C.reset}\n`);
  } catch (err) {
    process.stdout.write(` ${C.red}✗${C.reset}\n`);
    console.error(`${C.red}${C.bold}FATAL: ${err.message}${C.reset}`);
    process.exit(1);
  }

  /* Süit sonuçlarını topla */
  const suiteResults = [];

  for (const suite of toRun) {
    resetResults();
    try {
      await suite.fn();
    } catch (err) {
      if (err.message !== '__bail__') {
        console.error(`${C.red}Süit çöktü [${suite.name}]:${C.reset}`, err.message);
      }
    }
    // Auth süiti token'ı revoke eder — sonrasında her zaman taze login
    // Diğer süitlerde token geçerliliğini kontrol et
    try {
      const { getToken, getCookie, clearAuth } = require('./helpers/api');
      const preT = getToken(); const preC = getCookie();
      process.stdout.write(`${C.gray}  [${suite.name}→] token:${preT ? preT.slice(0,12)+'...' : 'null'} cookie:${preC ? preC.slice(0,20)+'...' : 'null'}${C.reset}\n`);
      if (suite.name === 'auth' || !preT) {
        clearAuth();
        await acquireToken(null, null, true);
      } else {
        const check = await req('GET', '/api/auth/profile');
        if (check.status === 401) {
          clearAuth();
          await acquireToken(null, null, true);
        }
      }
      const postT = getToken();
      process.stdout.write(`${C.gray}  [→${suite.name}] token after refresh:${postT ? postT.slice(0,12)+'...' : 'null'}${C.reset}\n`);
      // Quick sanity check: verify the token actually works
      const sanity = await req('GET', '/api/auth/profile');
      if (sanity.status !== 200) {
        process.stdout.write(`${C.red}  UYARI: Profil sağlaması başarısız — HTTP ${sanity.status} (${JSON.stringify(sanity.body).slice(0,80)})${C.reset}\n`);
      }
    } catch (err) {
      console.error(`${C.yellow}  Uyarı: Suite arası token yenileme başarısız — ${err.message}${C.reset}`);
    }
    const r = getResults();
    suiteResults.push({
      name:  suite.name,
      label: suite.label,
      pass:  r.pass,
      fail:  r.fail,
    });
  }

  /* ── Genel Özet ── */
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  const totalPass = suiteResults.reduce((a, s) => a + s.pass, 0);
  const totalFail = suiteResults.reduce((a, s) => a + s.fail, 0);
  const totalAll  = totalPass + totalFail;

  console.log(`\n\n${C.bold}${'═'.repeat(62)}${C.reset}`);
  console.log(`${C.bold}  GENEL ÖZET — ${elapsed}s içinde tamamlandı${C.reset}`);
  console.log(`${'─'.repeat(62)}`);
  console.log(`  ${'Süit'.padEnd(15)} ${'Başarılı'.padStart(10)} ${'Başarısız'.padStart(12)} ${'Toplam'.padStart(8)}`);
  console.log(`${'─'.repeat(62)}`);

  for (const s of suiteResults) {
    const total = s.pass + s.fail;
    const statusIcon = s.fail === 0 ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
    const failStr = s.fail > 0 ? `${C.red}${String(s.fail).padStart(12)}${C.reset}` : '           0';
    console.log(`  ${statusIcon} ${s.label.padEnd(14)} ${String(s.pass).padStart(10)} ${failStr} ${String(total).padStart(8)}`);
  }

  console.log(`${'─'.repeat(62)}`);
  const overallColor = totalFail === 0 ? C.green : C.red;
  console.log(`${C.bold}  ${'TOPLAM'.padEnd(15)} ${String(totalPass).padStart(10)} ${String(totalFail).padStart(12)} ${String(totalAll).padStart(8)}${C.reset}`);
  console.log(`${'═'.repeat(62)}`);

  if (totalFail === 0) {
    console.log(`\n${C.bold}${C.green}  ✓ TÜM ${totalAll} TEST BAŞARILI!${C.reset}\n`);
  } else {
    console.log(`\n${C.bold}${C.red}  ✗ ${totalFail}/${totalAll} TEST BAŞARISIZ!${C.reset}\n`);
  }

  process.exit(totalFail === 0 ? 0 : 1);
}

run().catch(err => {
  console.error(`${C.red}Master runner çöktü:${C.reset}`, err.message);
  process.exit(1);
});
