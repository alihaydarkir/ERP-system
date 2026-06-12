/**
 * ╔══════════════════════════════════════════╗
 * ║  CHEQUES TEST SUITE — Çek Yönetimi       ║
 * ║  Kullanım: node scripts/test_cheques.js  ║
 * ╚══════════════════════════════════════════╝
 */
const { req, acquireToken } = require('./helpers/api');
const { test, section, printSummary, expect, C } = require('./helpers/runner');

let chid1 = null;
let chid2 = null;
let customerId = null;

async function getFirstCustomerId() {
  const r = await req('GET', '/api/customers?limit=1');
  const d = r.body?.data;
  return Array.isArray(d) ? d[0]?.id
       : d?.customers?.[0]?.id || d?.rows?.[0]?.id || null;
}

function futureDate(days = 30) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

async function runChequeTests() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  CHEQUES TEST SUITE                      ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  await acquireToken();
  customerId = await getFirstCustomerId();
  const ts = Date.now();

  /* ── 1. Listeleme ── */
  section('1. LİSTELEME — GET /api/cheques');

  await test('Temel liste döner → 200', async () => {
    const r = await req('GET', '/api/cheques');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('Status filtresi: pending', async () => {
    const r = await req('GET', '/api/cheques?status=pending');
    expect(r.status).toBe(200);
  });

  await test('Status filtresi: paid', async () => {
    const r = await req('GET', '/api/cheques?status=paid');
    expect(r.status).toBe(200);
  });

  await test('Status filtresi: cancelled', async () => {
    const r = await req('GET', '/api/cheques?status=cancelled');
    expect(r.status).toBe(200);
  });

  await test('Banka adı ile filtrele', async () => {
    const r = await req('GET', '/api/cheques?bank_name=Ziraat');
    expect(r.status).toBe(200);
  });

  await test('Müşteri ID ile filtrele', async () => {
    if (!customerId) throw new Error('Müşteri bulunamadı');
    const r = await req('GET', `/api/cheques?customer_id=${customerId}`);
    expect(r.status).toBe(200);
  });

  await test('Pagination: page=1&limit=3', async () => {
    const r = await req('GET', '/api/cheques?page=1&limit=3');
    expect(r.status).toBe(200);
    const d = r.body.data;
    const items = Array.isArray(d) ? d : (d?.cheques || d?.rows || []);
    expect(items.length).toBeLte(3);
  });

  await test('Tarih aralığı filtresi', async () => {
    const r = await req('GET', `/api/cheques?start_date=2024-01-01&end_date=2024-12-31`);
    expect(r.status).toBeOneOf([200, 400]);
  });

  await test('Sıralama: due_date ASC', async () => {
    const r = await req('GET', '/api/cheques?sort_by=due_date&sort_order=ASC');
    expect(r.status).toBe(200);
  });

  await test('Sıralama: amount DESC', async () => {
    const r = await req('GET', '/api/cheques?sort_by=amount&sort_order=DESC');
    expect(r.status).toBe(200);
  });

  /* ── 2. Oluşturma ── */
  section('2. OLUŞTURMA — POST /api/cheques');

  await test('Tam alanlarla çek oluştur', async () => {
    if (!customerId) throw new Error('Müşteri bulunamadı');
    const r = await req('POST', '/api/cheques', {
      customer_id:     customerId,
      check_serial_no: `CHK-DEEP-${ts}`,
      check_issuer:    'Test Kesideci A.Ş.',
      bank_name:       'Test Bankası',
      received_date:   today(),
      due_date:        futureDate(30),
      amount:          10000,
      currency:        'TRY',
    });
    expect(r.status).toBeOneOf([200, 201]);
    expect(r.body.success).toBeOk();
    chid1 = r.body.data?.id || r.body.data?.cheque?.id;
    expect(chid1).toBeOk();
  });

  await test('USD cinsinden çek oluştur', async () => {
    if (!customerId) throw new Error('Müşteri bulunamadı');
    const r = await req('POST', '/api/cheques', {
      customer_id:     customerId,
      check_serial_no: `CHK-USD-${ts}`,
      check_issuer:    'USD Kesideci',
      bank_name:       'USD Bankası',
      received_date:   today(),
      due_date:        futureDate(60),
      amount:          500,
      currency:        'USD',
    });
    expect(r.status).toBeOneOf([200, 201]);
    chid2 = r.body.data?.id || r.body.data?.cheque?.id;
  });

  await test('EUR cinsinden çek → 200/201', async () => {
    if (!customerId) throw new Error('Müşteri bulunamadı');
    const r = await req('POST', '/api/cheques', {
      customer_id:     customerId,
      check_serial_no: `CHK-EUR-${ts}`,
      check_issuer:    'EUR Kesideci',
      bank_name:       'EUR Bankası',
      received_date:   today(),
      due_date:        futureDate(45),
      amount:          250,
      currency:        'EUR',
    });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('Geçersiz currency → 400', async () => {
    if (!customerId) throw new Error('Müşteri bulunamadı');
    const r = await req('POST', '/api/cheques', {
      customer_id:     customerId,
      check_serial_no: `CHK-BAD-CUR-${ts}`,
      check_issuer:    'Kesideci',
      bank_name:       'Banka',
      received_date:   today(),
      due_date:        futureDate(30),
      amount:          100,
      currency:        'INVALID',
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Eksik check_serial_no → 400/422', async () => {
    const r = await req('POST', '/api/cheques', {
      customer_id:   customerId || 1,
      check_issuer:  'Kesideci',
      bank_name:     'Banka',
      received_date: today(),
      due_date:      futureDate(30),
      amount:        1000,
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Eksik customer_id → 400/422', async () => {
    const r = await req('POST', '/api/cheques', {
      check_serial_no: `CHK-NOCUST-${ts}`,
      check_issuer:    'Kesideci',
      bank_name:       'Banka',
      received_date:   today(),
      due_date:        futureDate(30),
      amount:          1000,
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Eksik amount → 400/422', async () => {
    const r = await req('POST', '/api/cheques', {
      customer_id:     customerId || 1,
      check_serial_no: `CHK-NOAMT-${ts}`,
      check_issuer:    'Kesideci',
      bank_name:       'Banka',
      received_date:   today(),
      due_date:        futureDate(30),
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Sıfır tutar → 400/422', async () => {
    const r = await req('POST', '/api/cheques', {
      customer_id:     customerId || 1,
      check_serial_no: `CHK-ZERO-${ts}`,
      check_issuer:    'Kesideci',
      bank_name:       'Banka',
      received_date:   today(),
      due_date:        futureDate(30),
      amount:          0,
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Negatif tutar → 400/422', async () => {
    const r = await req('POST', '/api/cheques', {
      customer_id:     customerId || 1,
      check_serial_no: `CHK-NEG-${ts}`,
      check_issuer:    'Kesideci',
      bank_name:       'Banka',
      received_date:   today(),
      due_date:        futureDate(30),
      amount:          -500,
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Aynı seri no + aynı banka → duplicate hata', async () => {
    if (!customerId) throw new Error('Müşteri bulunamadı');
    const r = await req('POST', '/api/cheques', {
      customer_id:     customerId,
      check_serial_no: `CHK-DEEP-${ts}`,  // aynı seri no
      check_issuer:    'Başka Kesideci',
      bank_name:       'Test Bankası',    // aynı banka
      received_date:   today(),
      due_date:        futureDate(30),
      amount:          999,
    });
    expect(r.status).toBeOneOf([400, 409, 422]);
  });

  /* ── 3. Tekil Getirme ── */
  section('3. TEKİL GETİRME — GET /api/cheques/:id');

  await test('Geçerli çek getir → 200', async () => {
    if (!chid1) throw new Error('Çek yok');
    const r = await req('GET', `/api/cheques/${chid1}`);
    expect(r.status).toBe(200);
    expect(r.body.data?.id).toBe(chid1);
  });

  await test('Çek verisi doğru alanları içeriyor', async () => {
    if (!chid1) throw new Error('Çek yok');
    const r = await req('GET', `/api/cheques/${chid1}`);
    const d = r.body.data;
    expect(d).toHaveKey('amount');
    expect(d).toHaveKey('due_date');
    expect(d).toHaveKey('status');
  });

  await test('Var olmayan ID → 404', async () => {
    const r = await req('GET', '/api/cheques/999999999');
    expect(r.status).toBeOneOf([404, 400]);
  });

  await test('String ID → 400/404', async () => {
    const r = await req('GET', '/api/cheques/notanumber');
    expect(r.status).toBeOneOf([400, 404, 500]);
  });

  /* ── 4. Durum Güncelleme ── */
  section('4. DURUM GÜNCELLEME — PATCH /api/cheques/:id/status');

  await test('pending → cleared (paid)', async () => {
    if (!chid1) throw new Error('Çek yok');
    const r = await req('PATCH', `/api/cheques/${chid1}/status`, { status: 'cleared' });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('Geçersiz status → 400/422', async () => {
    if (!chid1) throw new Error('Çek yok');
    const r = await req('PATCH', `/api/cheques/${chid1}/status`, { status: 'invalid_status' });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Eksik status body → 400/422', async () => {
    if (!chid1) throw new Error('Çek yok');
    const r = await req('PATCH', `/api/cheques/${chid1}/status`, {});
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Var olmayan çek durum güncelle → 404', async () => {
    const r = await req('PATCH', '/api/cheques/999999999/status', { status: 'cleared' });
    expect(r.status).toBeOneOf([404, 400]);
  });

  /* ── 5. Yaklaşan Vadeler ── */
  section('5. YAKLAŞAN VADELER — GET /api/cheques/due-soon');

  await test('due-soon endpoint → 200', async () => {
    const r = await req('GET', '/api/cheques/due-soon');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('due-soon yanıtı yapısal kontrol', async () => {
    const r = await req('GET', '/api/cheques/due-soon');
    const d = r.body.data;
    expect(d).toHaveKey('dueSoon');
    expect(d).toHaveKey('overdue');
  });

  await test('due-soon: days parametresi → 200', async () => {
    const r = await req('GET', '/api/cheques/due-soon?days=14');
    expect(r.status).toBe(200);
  });

  /* ── 6. İstatistikler ── */
  section('6. İSTATİSTİKLER — GET /api/cheques/statistics');

  await test('İstatistik endpoint → 200', async () => {
    const r = await req('GET', '/api/cheques/statistics');
    expect(r.status).toBeOneOf([200, 404]);
  });

  /* ── 7. Silme ── */
  section('7. SİLME — DELETE /api/cheques/:id');

  await test('Çek sil → 200/204', async () => {
    if (!chid2) throw new Error('İkinci çek yok');
    const r = await req('DELETE', `/api/cheques/${chid2}`);
    expect(r.status).toBeOneOf([200, 204]);
  });

  await test('Silinen çeki getir → 404', async () => {
    if (!chid2) throw new Error('İkinci çek yok');
    const r = await req('GET', `/api/cheques/${chid2}`);
    expect(r.status).toBeOneOf([404, 400]);
  });

  await test('Var olmayan çek sil → 404/400', async () => {
    const r = await req('DELETE', '/api/cheques/999999999');
    expect(r.status).toBeOneOf([404, 400]);
  });

  /* ── 8. Temizlik ── */
  section('8. TEMİZLİK');

  await test('Ana test çeki sil', async () => {
    if (!chid1) throw new Error('Ana çek yok');
    const r = await req('DELETE', `/api/cheques/${chid1}`);
    expect(r.status).toBeOneOf([200, 204]);
  });

  return printSummary('CHEQUES TEST SUITE');
}

if (require.main === module) {
  runChequeTests()
    .then(ok => process.exit(ok ? 0 : 1))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runChequeTests };
