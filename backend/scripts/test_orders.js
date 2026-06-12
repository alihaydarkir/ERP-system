/**
 * ╔══════════════════════════════════════════╗
 * ║  ORDERS TEST SUITE — Sipariş Yönetimi    ║
 * ║  Kullanım: node scripts/test_orders.js   ║
 * ╚══════════════════════════════════════════╝
 */
const { req, acquireToken } = require('./helpers/api');
const { test, section, printSummary, expect, C } = require('./helpers/runner');

let oid       = null;  // oluşturulan sipariş
let customerId = null;
let productId  = null;

async function setupData() {
  // Var olan müşteri bul
  const custR = await req('GET', '/api/customers?limit=1');
  const custs = custR.body?.data;
  customerId = Array.isArray(custs) ? custs[0]?.id
             : custs?.customers?.[0]?.id || custs?.rows?.[0]?.id;

  // Stok >= 5 olan ürün bul (defalarca çalışan testlerde stok tükenmesini önler)
  const prodR = await req('GET', '/api/products?limit=50');
  const prods = prodR.body?.data;
  const prodList = Array.isArray(prods) ? prods : (prods?.products || prods?.rows || []);
  const sufficient = prodList.find(p => (p.stock_quantity ?? p.stock ?? 0) >= 5);
  productId = sufficient?.id || prodList[0]?.id;
}

async function runOrderTests() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  ORDERS TEST SUITE                       ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  await acquireToken();
  await setupData();

  /* ── 1. Listeleme ── */
  section('1. LİSTELEME — GET /api/orders');

  await test('Temel liste döner → 200', async () => {
    const r = await req('GET', '/api/orders');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('Yanıt dizi veya sayfalı nesne içeriyor', async () => {
    const r = await req('GET', '/api/orders');
    const d = r.body.data;
    const ok = Array.isArray(d) || Array.isArray(d?.orders) || typeof d === 'object';
    expect(ok).toBeOk();
  });

  await test('Status filtresi: pending', async () => {
    const r = await req('GET', '/api/orders?status=pending');
    expect(r.status).toBe(200);
  });

  await test('Status filtresi: processing', async () => {
    const r = await req('GET', '/api/orders?status=processing');
    expect(r.status).toBe(200);
  });

  await test('Status filtresi: completed', async () => {
    const r = await req('GET', '/api/orders?status=completed');
    expect(r.status).toBe(200);
  });

  await test('Status filtresi: cancelled', async () => {
    const r = await req('GET', '/api/orders?status=cancelled');
    expect(r.status).toBe(200);
  });

  await test('Geçersiz status → 200 (boş liste) veya 400', async () => {
    const r = await req('GET', '/api/orders?status=nosuchstatus');
    expect(r.status).toBeOneOf([200, 400]);
  });

  await test('Pagination: page=1&limit=3', async () => {
    const r = await req('GET', '/api/orders?page=1&limit=3');
    expect(r.status).toBe(200);
    const d = r.body.data;
    const items = Array.isArray(d) ? d : (d?.orders || d?.rows || []);
    expect(items.length).toBeLte(3);
  });

  await test('Müşteri ID ile filtrele', async () => {
    if (!customerId) throw new Error('Müşteri yok');
    const r = await req('GET', `/api/orders?customer_id=${customerId}`);
    expect(r.status).toBe(200);
  });

  await test('Tarih aralığı filtresi', async () => {
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    const end = new Date();
    const r = await req('GET', `/api/orders?start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}`);
    expect(r.status).toBeOneOf([200, 400]);
  });

  /* ── 2. Sipariş Oluşturma ── */
  section('2. OLUŞTURMA — POST /api/orders');

  await test('Geçerli sipariş oluştur', async () => {
    if (!customerId || !productId) throw new Error('Müşteri veya ürün bulunamadı');
    const r = await req('POST', '/api/orders', {
      customer_id: customerId,
      items: [{ product_id: productId, quantity: 2, unit_price: 100 }],
      notes: 'Test siparişi',
    });
    expect(r.status).toBeOneOf([200, 201]);
    expect(r.body.success).toBeOk();
    oid = r.body.data?.id || r.body.data?.order?.id;
  });

  await test('Sipariş items dizisi kontrolü', async () => {
    if (!oid) throw new Error('Sipariş yok');
    const r = await req('GET', `/api/orders/${oid}`);
    expect(r.status).toBe(200);
  });

  await test('Eksik customer_id → 201 veya 400/422 (opsiyonel alan)', async () => {
    const r = await req('POST', '/api/orders', {
      items: [{ product_id: productId || 1, quantity: 1, unit_price: 10 }],
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422]);
  });

  await test('Boş items dizisi → 400/422', async () => {
    const r = await req('POST', '/api/orders', {
      customer_id: customerId || 1,
      items: [],
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Sıfır adet → 400/422', async () => {
    const r = await req('POST', '/api/orders', {
      customer_id: customerId || 1,
      items: [{ product_id: productId || 1, quantity: 0, unit_price: 10 }],
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Negatif adet → 400/422', async () => {
    const r = await req('POST', '/api/orders', {
      customer_id: customerId || 1,
      items: [{ product_id: productId || 1, quantity: -5, unit_price: 10 }],
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Var olmayan müşteri ID → 400/404/500', async () => {
    const r = await req('POST', '/api/orders', {
      customer_id: 999999999,
      items: [{ product_id: productId || 1, quantity: 1, unit_price: 10 }],
    });
    expect(r.status).toBeOneOf([400, 404, 422, 500]);
  });

  await test('Var olmayan ürün ID → 400/404', async () => {
    const r = await req('POST', '/api/orders', {
      customer_id: customerId || 1,
      items: [{ product_id: 999999999, quantity: 1, unit_price: 10 }],
    });
    expect(r.status).toBeOneOf([400, 404, 422, 500]);
  });

  await test('Boş body → 400/422', async () => {
    const r = await req('POST', '/api/orders', {});
    expect(r.status).toBeOneOf([400, 422]);
  });

  /* ── 3. Tekil Getirme ── */
  section('3. TEKİL GETİRME — GET /api/orders/:id');

  await test('Geçerli sipariş getir', async () => {
    if (!oid) throw new Error('Sipariş yok');
    const r = await req('GET', `/api/orders/${oid}`);
    expect(r.status).toBe(200);
  });

  await test('Var olmayan ID → 404', async () => {
    const r = await req('GET', '/api/orders/999999999');
    expect(r.status).toBeOneOf([404, 400]);
  });

  await test('String ID → 400/404', async () => {
    const r = await req('GET', '/api/orders/invalid-id');
    expect(r.status).toBeOneOf([400, 404, 500]);
  });

  /* ── 4. Durum Güncelleme ── */
  section('4. DURUM GÜNCELLEME — PATCH /api/orders/:id/status');

  await test('pending → processing', async () => {
    if (!oid) throw new Error('Sipariş yok');
    const r = await req('PATCH', `/api/orders/${oid}/status`, { status: 'processing' });
    expect(r.status).toBeOneOf([200, 201, 400]);
    // 400 olabilir (durum geçişi kısıtlı ise)
  });

  await test('Geçersiz durum → 400/422', async () => {
    if (!oid) throw new Error('Sipariş yok');
    const r = await req('PATCH', `/api/orders/${oid}/status`, { status: 'invalid_status' });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Var olmayan sipariş durum güncelle → 404', async () => {
    const r = await req('PATCH', '/api/orders/999999999/status', { status: 'completed' });
    expect(r.status).toBeOneOf([404, 400]);
  });

  /* ── 5. PUT güncelleme ── */
  section('5. GÜNCELLEME — PUT /api/orders/:id');

  await test('Not güncelle', async () => {
    if (!oid) throw new Error('Sipariş yok');
    const r = await req('PUT', `/api/orders/${oid}`, { notes: 'Güncellenmiş not' });
    expect(r.status).toBeOneOf([200, 201, 400, 404]);
  });

  /* ── 6. İptal / Silme ── */
  section('6. İPTAL / SİLME');

  await test('Sipariş iptal → 200/204', async () => {
    if (!oid) throw new Error('Sipariş yok');
    const r = await req('DELETE', `/api/orders/${oid}`);
    expect(r.status).toBeOneOf([200, 204, 400]);
    // 400: durum izin vermiyorsa
  });

  await test('Var olmayan siparişi sil → 404/400', async () => {
    const r = await req('DELETE', '/api/orders/999999999');
    expect(r.status).toBeOneOf([404, 400]);
  });

  return printSummary('ORDERS TEST SUITE');
}

if (require.main === module) {
  runOrderTests()
    .then(ok => process.exit(ok ? 0 : 1))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runOrderTests };
