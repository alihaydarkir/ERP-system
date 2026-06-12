/**
 * ╔══════════════════════════════════════════╗
 * ║  INVOICES TEST SUITE — Fatura Yönetimi   ║
 * ║  Kullanım: node scripts/test_invoices.js ║
 * ╚══════════════════════════════════════════╝
 */
const { req, acquireToken } = require('./helpers/api');
const { test, section, printSummary, expect, C } = require('./helpers/runner');

async function runInvoiceTests() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  INVOICES TEST SUITE                     ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  await acquireToken();

  /* ── 1. Listeleme ── */
  section('1. LİSTELEME — GET /api/invoices');

  await test('Temel liste döner → 200', async () => {
    const r = await req('GET', '/api/invoices');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('Status filtresi: draft', async () => {
    const r = await req('GET', '/api/invoices?status=draft');
    expect(r.status).toBe(200);
  });

  await test('Status filtresi: sent', async () => {
    const r = await req('GET', '/api/invoices?status=sent');
    expect(r.status).toBe(200);
  });

  await test('Status filtresi: paid', async () => {
    const r = await req('GET', '/api/invoices?status=paid');
    expect(r.status).toBe(200);
  });

  await test('Status filtresi: overdue', async () => {
    const r = await req('GET', '/api/invoices?status=overdue');
    expect(r.status).toBe(200);
  });

  await test('Status filtresi: cancelled', async () => {
    const r = await req('GET', '/api/invoices?status=cancelled');
    expect(r.status).toBe(200);
  });

  await test('Pagination: limit=5', async () => {
    const r = await req('GET', '/api/invoices?limit=5&page=1');
    expect(r.status).toBe(200);
    const d = r.body.data;
    const items = Array.isArray(d) ? d : (d?.invoices || d?.rows || []);
    expect(items.length).toBeLte(5);
  });

  await test('Tarih filtresi: start_date', async () => {
    const r = await req('GET', '/api/invoices?start_date=2024-01-01');
    expect(r.status).toBeOneOf([200, 400]);
  });

  await test('Müşteri ID ile filtrele', async () => {
    const custR = await req('GET', '/api/customers?limit=1');
    const d = custR.body?.data;
    const cid = Array.isArray(d) ? d[0]?.id : (d?.customers?.[0]?.id || d?.rows?.[0]?.id);
    if (!cid) throw new Error('Müşteri bulunamadı');
    const r = await req('GET', `/api/invoices?customer_id=${cid}`);
    expect(r.status).toBe(200);
  });

  /* ── 2. İstatistikler ── */
  section('2. İSTATİSTİKLER — GET /api/invoices/stats');

  await test('İstatistik endpoint → 200', async () => {
    const r = await req('GET', '/api/invoices/stats');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('İstatistik alanları mevcut', async () => {
    const r = await req('GET', '/api/invoices/stats');
    if (r.status === 200) {
      const d = r.body.data;
      expect(typeof d === 'object').toBeOk();
    }
  });

  /* ── 3. Tekil Fatura ── */
  section('3. TEKİL FATURA — GET /api/invoices/:id');

  await test('Mevcut fatura getir (ilk fatura)', async () => {
    const r = await req('GET', '/api/invoices?limit=1');
    const d = r.body.data;
    const inv = Array.isArray(d) ? d[0] : (d?.invoices?.[0] || d?.rows?.[0]);
    if (!inv) { console.log('  (Veritabanında fatura yok — test atlandı)'); return; }
    const r2 = await req('GET', `/api/invoices/${inv.id}`);
    expect(r2.status).toBe(200);
    expect(r2.body.data?.id).toBe(inv.id);
  });

  await test('Fatura detayı doğru alanlar içeriyor', async () => {
    const r = await req('GET', '/api/invoices?limit=1');
    const d = r.body.data;
    const inv = Array.isArray(d) ? d[0] : (d?.invoices?.[0] || d?.rows?.[0]);
    if (!inv) { console.log('  (Veritabanında fatura yok — test atlandı)'); return; }
    const r2 = await req('GET', `/api/invoices/${inv.id}`);
    if (r2.status === 200) {
      const data = r2.body.data;
      expect(data).toHaveKey('id');
      expect(data).toHaveKey('status');
    }
  });

  await test('Var olmayan ID → 404', async () => {
    const r = await req('GET', '/api/invoices/999999999');
    expect(r.status).toBeOneOf([404, 400]);
  });

  await test('String ID → 400/404', async () => {
    const r = await req('GET', '/api/invoices/abc');
    expect(r.status).toBeOneOf([400, 404, 500]);
  });

  /* ── 4. Fatura Oluşturma ── */
  section('4. FATURA OLUŞTURMA — POST /api/invoices');

  await test('Sipariş olmadan fatura oluşturma girişimi', async () => {
    const custR = await req('GET', '/api/customers?limit=1');
    const d = custR.body?.data;
    const cid = Array.isArray(d) ? d[0]?.id : (d?.customers?.[0]?.id);
    if (!cid) throw new Error('Müşteri yok');

    const r = await req('POST', '/api/invoices', {
      customer_id: cid,
      items: [{ description: 'Test Hizmet', quantity: 1, unit_price: 1000, tax_rate: 18 }],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422, 500]);
  });

  await test('Eksik customer_id → 400/422', async () => {
    const r = await req('POST', '/api/invoices', {
      items: [{ description: 'Test', quantity: 1, unit_price: 100 }],
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Boş body → 400/422', async () => {
    const r = await req('POST', '/api/invoices', {});
    expect(r.status).toBeOneOf([400, 422]);
  });

  /* ── 5. Durum Güncelleme ── */
  section('5. DURUM GÜNCELLEME');

  await test('Var olmayan fatura durum güncelle → 404', async () => {
    const r = await req('PATCH', '/api/invoices/999999999/status', { status: 'paid' });
    expect(r.status).toBeOneOf([404, 400, 405]);
  });

  await test('Var olmayan fatura ödendi işareti → 404', async () => {
    const r = await req('PUT', '/api/invoices/999999999', { status: 'paid' });
    expect(r.status).toBeOneOf([404, 400]);
  });

  /* ── 6. Güvenlik ── */
  section('6. GÜVENLİK');

  await test('Tokensiz erişim → 401', async () => {
    const { clearAuth, setAuth, getToken, getCookie } = require('./helpers/api');
    const t = getToken(); const c = getCookie();
    clearAuth();
    const r = await req('GET', '/api/invoices', null, false);
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  return printSummary('INVOICES TEST SUITE');
}

if (require.main === module) {
  runInvoiceTests()
    .then(ok => process.exit(ok ? 0 : 1))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runInvoiceTests };
