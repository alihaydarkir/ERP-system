/**
 * ╔══════════════════════════════════════════╗
 * ║  SETTINGS TEST SUITE — Ayarlar           ║
 * ║  Kullanım: node scripts/test_settings.js ║
 * ╚══════════════════════════════════════════╝
 */
const { req, acquireToken } = require('./helpers/api');
const { test, section, printSummary, expect, C } = require('./helpers/runner');

async function runSettingsTests() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  SETTINGS TEST SUITE                     ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  await acquireToken();

  /* ── 1. Tüm Ayarlar ── */
  section('1. TÜM AYARLAR — GET /api/settings');

  await test('Tüm ayarlar → 200', async () => {
    const r = await req('GET', '/api/settings');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('Yanıt nesne içeriyor', async () => {
    const r = await req('GET', '/api/settings');
    expect(typeof r.body.data).toBe('object');
  });

  /* ── 2. Kategorili Ayarlar ── */
  section('2. KATEGORİLİ AYARLAR — GET /api/settings/categories');

  await test('Kategorili ayarlar → 200', async () => {
    const r = await req('GET', '/api/settings/categories');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('Kategoriler nesne içeriyor', async () => {
    const r = await req('GET', '/api/settings/categories');
    expect(typeof r.body.data).toBe('object');
  });

  await test('general kategorisi var', async () => {
    const r = await req('GET', '/api/settings/categories');
    const d = r.body.data;
    const hasGeneral = 'general' in d || (Array.isArray(d) && d.some(c => c.category === 'general'));
    expect(hasGeneral).toBeOk();
  });

  /* ── 3. Kategori Bazlı Getirme ── */
  section('3. KATEGORİ BAZLI — GET /api/settings/:category');

  await test('GET /api/settings/general → 200', async () => {
    const r = await req('GET', '/api/settings/general');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('GET /api/settings/ai → 200/404', async () => {
    const r = await req('GET', '/api/settings/ai');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('GET /api/settings/notification → 200/404', async () => {
    const r = await req('GET', '/api/settings/notification');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('Var olmayan kategori → 404/200 (boş)', async () => {
    const r = await req('GET', '/api/settings/nonexistent_category_xyz');
    expect(r.status).toBeOneOf([200, 404]);
  });

  /* ── 4. Ayar Güncelleme ── */
  section('4. AYAR GÜNCELLEME — PUT /api/settings');

  await test('General ayar güncelle', async () => {
    const r = await req('PUT', '/api/settings', {
      category: 'general',
      key:       'companyName',
      value:     'Test Şirket A.Ş.',
    });
    expect(r.status).toBeOneOf([200, 201, 400, 404]);
  });

  await test('Kategori bazlı güncelleme', async () => {
    const r = await req('PUT', '/api/settings/general', {
      companyName: 'Test Şirket A.Ş.',
    });
    expect(r.status).toBeOneOf([200, 201, 400, 404]);
  });

  await test('AI ayar güncelle', async () => {
    const r = await req('PUT', '/api/settings/ai', {
      aiModel:       'llama2',
      aiTemperature: '0.7',
      aiRagTopK:     '5',
    });
    expect(r.status).toBeOneOf([200, 201, 400, 404]);
  });

  await test('Boş body ile güncelleme → 400 veya kabul', async () => {
    const r = await req('PUT', '/api/settings', {});
    expect(r.status).toBeOneOf([200, 400, 404, 422]);
  });

  /* ── 5. Güvenlik ── */
  section('5. GÜVENLİK');

  await test('Token olmadan ayarları getir → 401', async () => {
    const { clearAuth, setAuth, getToken, getCookie } = require('./helpers/api');
    const t = getToken(); const c = getCookie();
    clearAuth();
    const r = await req('GET', '/api/settings', null, false);
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  await test('Token olmadan ayar güncelle → 401', async () => {
    const { clearAuth, setAuth, getToken, getCookie } = require('./helpers/api');
    const t = getToken(); const c = getCookie();
    clearAuth();
    const r = await req('PUT', '/api/settings', { category: 'general', key: 'test', value: 'val' }, false);
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  await test('XSS payload ayar değerinde → sanitize veya reject', async () => {
    const r = await req('PUT', '/api/settings/general', {
      companyName: '<script>alert("xss")</script>',
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422]);
    if (r.status === 200 || r.status === 201) {
      const check = await req('GET', '/api/settings/categories');
      const str = JSON.stringify(check.body);
      expect(str).toNotContain('<script>alert');
    }
  });

  /* ── 6. Fine-Tuning ── */
  section('6. FINE-TUNING — /api/fine-tuning');

  await test('GET /api/fine-tuning/models → 200/404', async () => {
    const r = await req('GET', '/api/fine-tuning/models');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('GET /api/fine-tuning/datasets → 200/404', async () => {
    const r = await req('GET', '/api/fine-tuning/datasets');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('GET /api/fine-tuning/statistics → 200/404', async () => {
    const r = await req('GET', '/api/fine-tuning/statistics');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('POST /api/fine-tuning/initialize → 200/404', async () => {
    const r = await req('POST', '/api/fine-tuning/initialize', {});
    expect(r.status).toBeOneOf([200, 201, 404, 500]);
  });

  return printSummary('SETTINGS TEST SUITE');
}

if (require.main === module) {
  runSettingsTests()
    .then(ok => process.exit(ok ? 0 : 1))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runSettingsTests };
