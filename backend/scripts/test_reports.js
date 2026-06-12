/**
 * ╔══════════════════════════════════════════╗
 * ║  REPORTS TEST SUITE — Raporlama          ║
 * ║  Kullanım: node scripts/test_reports.js  ║
 * ╚══════════════════════════════════════════╝
 */
const { req, acquireToken } = require('./helpers/api');
const { test, section, printSummary, expect, C } = require('./helpers/runner');

async function runReportTests() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  REPORTS TEST SUITE                      ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  await acquireToken();

  /* ── 1. Dashboard Özeti ── */
  section('1. DASHBOARD ÖZETİ — GET /api/reports/summary');

  await test('Endpoint erişilebilir → 200', async () => {
    const r = await req('GET', '/api/reports/summary');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('Üst seviye alanlar: kpi, weeklyChart, monthlyTrend', async () => {
    const r = await req('GET', '/api/reports/summary');
    const d = r.body.data;
    expect(d).toHaveKey('kpi');
    expect(d).toHaveKey('weeklyChart');
    expect(d).toHaveKey('monthlyTrend');
  });

  await test('KPI: totalProducts sayısal', async () => {
    const r = await req('GET', '/api/reports/summary');
    const kpi = r.body.data?.kpi;
    expect(kpi).toHaveKey('totalProducts');
    expect(typeof kpi.totalProducts === 'number' || typeof kpi.totalProducts === 'string').toBeOk();
  });

  await test('KPI: totalCustomers ≥ 0', async () => {
    const r = await req('GET', '/api/reports/summary');
    const v = parseInt(r.body.data?.kpi?.totalCustomers);
    expect(v).toBeGte(0);
  });

  await test('KPI: totalOrders ≥ 0', async () => {
    const r = await req('GET', '/api/reports/summary');
    const v = parseInt(r.body.data?.kpi?.totalOrders);
    expect(v).toBeGte(0);
  });

  await test('KPI: totalRevenue sayısal', async () => {
    const r = await req('GET', '/api/reports/summary');
    const v = parseFloat(r.body.data?.kpi?.totalRevenue);
    expect(v).toBeGte(0);
  });

  await test('KPI: pendingOrders alanı mevcut', async () => {
    const r = await req('GET', '/api/reports/summary');
    expect(r.body.data?.kpi).toHaveKey('pendingOrders');
  });

  await test('weeklyChart dizi ve 7 günlük', async () => {
    const r = await req('GET', '/api/reports/summary');
    const chart = r.body.data?.weeklyChart;
    expect(Array.isArray(chart)).toBeOk();
    expect(chart.length).toBeLte(7);
  });

  await test('weeklyChart her eleman: date/label alanı', async () => {
    const r = await req('GET', '/api/reports/summary');
    const chart = r.body.data?.weeklyChart || [];
    if (chart.length > 0) {
      const item = chart[0];
      const hasDateOrLabel = 'date' in item || 'label' in item;
      expect(hasDateOrLabel).toBeOk();
    }
  });

  await test('monthlyTrend dizi ≥ 1 kayıt', async () => {
    const r = await req('GET', '/api/reports/summary');
    const trend = r.body.data?.monthlyTrend || [];
    expect(Array.isArray(trend)).toBeOk();
    expect(trend.length).toBeGte(1);
  });

  await test('monthlyTrend her eleman: label alanı var', async () => {
    const r = await req('GET', '/api/reports/summary');
    const trend = r.body.data?.monthlyTrend || [];
    if (trend.length > 0) {
      expect(trend[0]).toHaveKey('label');
    }
  });

  await test('topCustomers dizi', async () => {
    const r = await req('GET', '/api/reports/summary');
    const top = r.body.data?.topCustomers;
    expect(Array.isArray(top)).toBeOk();
  });

  await test('topProducts dizi', async () => {
    const r = await req('GET', '/api/reports/summary');
    const top = r.body.data?.topProducts;
    expect(Array.isArray(top)).toBeOk();
  });

  await test('recentOrders dizi', async () => {
    const r = await req('GET', '/api/reports/summary');
    const ro = r.body.data?.recentOrders;
    expect(Array.isArray(ro)).toBeOk();
  });

  await test('generatedAt timestamp var', async () => {
    const r = await req('GET', '/api/reports/summary');
    const d = r.body.data;
    expect(d).toHaveKey('generatedAt');
  });

  /* ── 2. En Çok Satan Ürünler ── */
  section('2. EN ÇOK SATANLAR — GET /api/reports/top-products');

  await test('Endpoint → 200', async () => {
    const r = await req('GET', '/api/reports/top-products');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('Yanıt dizi içeriyor', async () => {
    const r = await req('GET', '/api/reports/top-products');
    const d = r.body.data;
    const isArr = Array.isArray(d) || Array.isArray(d?.products);
    expect(isArr).toBeOk();
  });

  await test('limit=5 parametresi → en fazla 5 ürün', async () => {
    const r = await req('GET', '/api/reports/top-products?limit=5');
    expect(r.status).toBe(200);
    const d = r.body.data;
    const items = Array.isArray(d) ? d : (d?.products || []);
    expect(items.length).toBeLte(5);
  });

  await test('limit=1 parametresi', async () => {
    const r = await req('GET', '/api/reports/top-products?limit=1');
    expect(r.status).toBe(200);
  });

  await test('Tarih aralığı filtresi', async () => {
    const r = await req('GET', '/api/reports/top-products?start_date=2024-01-01&end_date=2024-12-31');
    expect(r.status).toBeOneOf([200, 400]);
  });

  /* ── 3. Periyodik Raporlar ── */
  section('3. PERİYODİK RAPORLAR');

  await test('GET /api/reports/daily → 200/404', async () => {
    const r = await req('GET', '/api/reports/daily');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('GET /api/reports/weekly → 200/404', async () => {
    const r = await req('GET', '/api/reports/weekly');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('GET /api/reports/monthly → 200/404', async () => {
    const r = await req('GET', '/api/reports/monthly');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('GET /api/reports/monthly?year=2024 → 200/404', async () => {
    const r = await req('GET', '/api/reports/monthly?year=2024');
    expect(r.status).toBeOneOf([200, 400, 404]);
  });

  /* ── 4. Envanter Raporu ── */
  section('4. ENVANTER RAPORU — GET /api/reports/inventory');

  await test('Envanter raporu → 200', async () => {
    const r = await req('GET', '/api/reports/inventory');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('Envanter: byCategory dizi', async () => {
    const r = await req('GET', '/api/reports/inventory');
    if (r.status === 200) {
      const d = r.body.data;
      expect(d).toHaveKey('byCategory');
      expect(Array.isArray(d.byCategory)).toBeOk();
    }
  });

  await test('Envanter: summary alanı var', async () => {
    const r = await req('GET', '/api/reports/inventory');
    if (r.status === 200) {
      expect(r.body.data).toHaveKey('summary');
    }
  });

  /* ── 5. Dashboard Stats ── */
  section('5. DASHBOARD STATS — GET /api/reports/dashboard');

  await test('Dashboard stats → 200/404', async () => {
    const r = await req('GET', '/api/reports/dashboard');
    expect(r.status).toBeOneOf([200, 404]);
  });

  /* ── 6. Export ── */
  section('6. EXPORT');

  await test('Export endpoint varlığı kontrol', async () => {
    const r = await req('GET', '/api/reports/export?type=sales');
    expect(r.status).toBeOneOf([200, 400, 404]);
  });

  await test('Export: geçersiz type → 400', async () => {
    const r = await req('GET', '/api/reports/export?type=invalid');
    expect(r.status).toBeOneOf([400, 404]);
  });

  /* ── 7. Güvenlik ── */
  section('7. GÜVENLİK');

  await test('Token olmadan summary → 401', async () => {
    const { clearAuth, setAuth, getToken, getCookie } = require('./helpers/api');
    const t = getToken(); const c = getCookie();
    clearAuth();
    const r = await req('GET', '/api/reports/summary', null, false);
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  await test('Yanıt süresi < 3 saniye', async () => {
    const start = Date.now();
    await req('GET', '/api/reports/summary');
    expect(Date.now() - start).toBeLte(3000);
  });

  return printSummary('REPORTS TEST SUITE');
}

if (require.main === module) {
  runReportTests()
    .then(ok => process.exit(ok ? 0 : 1))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runReportTests };
