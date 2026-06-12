/**
 * ╔══════════════════════════════════════════╗
 * ║  PERFORMANCE TEST SUITE — Performans     ║
 * ║  Kullanım: node scripts/test_perf.js     ║
 * ╚══════════════════════════════════════════╝
 */
const { req, acquireToken } = require('./helpers/api');
const { test, section, printSummary, expect, C } = require('./helpers/runner');

async function measureMs(fn) {
  const start = Date.now();
  const result = await fn();
  return { elapsed: Date.now() - start, result };
}

async function runPerformanceTests() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  PERFORMANCE TEST SUITE                  ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  await acquireToken();

  /* ── 1. Yanıt Süreleri ── */
  section('1. YANIT SÜRELERİ (Tekil İstek)');

  await test('GET /api/reports/summary < 3000ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/reports/summary'));
    expect(result.status).toBe(200);
    expect(elapsed).toBeLte(3000);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  await test('GET /api/products < 2000ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/products'));
    expect(result.status).toBe(200);
    expect(elapsed).toBeLte(2000);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  await test('GET /api/customers < 2000ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/customers'));
    expect(result.status).toBe(200);
    expect(elapsed).toBeLte(2000);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  await test('GET /api/orders < 2000ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/orders'));
    expect(result.status).toBe(200);
    expect(elapsed).toBeLte(2000);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  await test('GET /api/invoices < 2000ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/invoices'));
    expect(result.status).toBe(200);
    expect(elapsed).toBeLte(2000);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  await test('GET /api/cheques < 2000ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/cheques'));
    expect(result.status).toBe(200);
    expect(elapsed).toBeLte(2000);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  await test('GET /api/suppliers < 2000ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/suppliers'));
    expect(result.status).toBe(200);
    expect(elapsed).toBeLte(2000);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  await test('GET /api/reports/top-products < 2000ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/reports/top-products'));
    expect(result.status).toBe(200);
    expect(elapsed).toBeLte(2000);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  await test('GET /api/reports/inventory < 3000ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/reports/inventory'));
    expect(result.status).toBe(200);
    expect(elapsed).toBeLte(3000);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  await test('GET /api/auth/profile < 500ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/auth/profile'));
    expect(result.status).toBe(200);
    expect(elapsed).toBeLte(500);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  /* ── 2. Eşzamanlı İstekler ── */
  section('2. EŞZAMANLI İSTEKLER (Concurrency)');

  await test('5 paralel /api/products → tümü 200', async () => {
    const promises = Array.from({ length: 5 }, () => req('GET', '/api/products'));
    const results = await Promise.all(promises);
    results.forEach(r => expect(r.status).toBeOneOf([200, 429]));
  });

  await test('10 paralel /api/orders → tümü 200/429', async () => {
    const promises = Array.from({ length: 10 }, () => req('GET', '/api/orders'));
    const results = await Promise.all(promises);
    results.forEach(r => expect(r.status).toBeOneOf([200, 429]));
  });

  await test('15 paralel /api/customers → hepsi yanıt veriyor', async () => {
    const promises = Array.from({ length: 15 }, () => req('GET', '/api/customers'));
    const results = await Promise.all(promises);
    results.forEach(r => expect(r.status).toBeOneOf([200, 429, 401]));
  });

  await test('20 paralel /api/reports/summary → sunucu kararlı', async () => {
    const promises = Array.from({ length: 20 }, () => req('GET', '/api/reports/summary'));
    const results = await Promise.all(promises);
    const statuses = results.map(r => r.status);
    // Hiçbiri 500 dönmemeli
    statuses.forEach(s => expect(s).toBeOneOf([200, 429, 401]));
  });

  await test('30 paralel hafif istek → sunucu çökmüyor', async () => {
    const promises = Array.from({ length: 30 }, () => req('GET', '/api/auth/profile'));
    const results = await Promise.all(promises);
    results.forEach(r => expect(r.status).toBeOneOf([200, 401, 429]));
  });

  /* ── 3. Ardışık İstekler ── */
  section('3. ARDIŞIK İSTEKLER (Sequential Throughput)');

  await test('10 ardışık /api/products ortalama < 1000ms', async () => {
    const times = [];
    for (let i = 0; i < 10; i++) {
      const { elapsed } = await measureMs(() => req('GET', '/api/products'));
      times.push(elapsed);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    process.stdout.write(`    ${C.gray}Ortalama: ${Math.round(avg)}ms${C.reset}\n`);
    expect(avg).toBeLte(1000);
  });

  await test('5 ardışık rapor özeti < 15s toplam', async () => {
    const start = Date.now();
    for (let i = 0; i < 5; i++) {
      await req('GET', '/api/reports/summary');
    }
    const total = Date.now() - start;
    process.stdout.write(`    ${C.gray}Toplam: ${total}ms${C.reset}\n`);
    expect(total).toBeLte(15000);
  });

  /* ── 4. Sayfalama Performansı ── */
  section('4. SAYFALAMA PERFORMANSI');

  await test('limit=100 ürün listesi < 2000ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/products?limit=100'));
    expect(result.status).toBeOneOf([200, 400]);
    if (result.status === 200) expect(elapsed).toBeLte(2000);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  await test('limit=50 sipariş listesi < 2000ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/orders?limit=50'));
    expect(result.status).toBeOneOf([200, 400]);
    if (result.status === 200) expect(elapsed).toBeLte(2000);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  /* ── 5. Arama Performansı ── */
  section('5. ARAMA PERFORMANSI');

  await test('Ürün arama < 1000ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/products?search=a'));
    expect(result.status).toBe(200);
    expect(elapsed).toBeLte(1000);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  await test('Müşteri arama < 1000ms', async () => {
    const { elapsed, result } = await measureMs(() => req('GET', '/api/customers?search=test'));
    expect(result.status).toBe(200);
    expect(elapsed).toBeLte(1000);
    process.stdout.write(`    ${C.gray}[${elapsed}ms]${C.reset}\n`);
  });

  /* ── 6. Bellek / Yük ── */
  section('6. YÜKSEK YÜK SENARYOSU');

  await test('50 karışık paralel istek → tüm yanıtlar geçerli', async () => {
    const endpoints = [
      '/api/products', '/api/customers', '/api/orders',
      '/api/invoices', '/api/cheques', '/api/suppliers',
      '/api/reports/summary', '/api/auth/profile',
    ];
    const promises = Array.from({ length: 50 }, (_, i) =>
      req('GET', endpoints[i % endpoints.length])
    );
    const results = await Promise.all(promises);
    const invalid = results.filter(r => r.status >= 500);
    expect(invalid.length).toBe(0);
  });

  return printSummary('PERFORMANCE TEST SUITE');
}

if (require.main === module) {
  runPerformanceTests()
    .then(ok => process.exit(ok ? 0 : 1))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runPerformanceTests };
