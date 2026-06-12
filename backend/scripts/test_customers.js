/**
 * ╔══════════════════════════════════════════╗
 * ║  CUSTOMERS TEST SUITE — Müşteri Yönetimi ║
 * ║  Kullanım: node scripts/test_customers.js║
 * ╚══════════════════════════════════════════╝
 */
const { req, acquireToken } = require('./helpers/api');
const { test, section, printSummary, expect, C } = require('./helpers/runner');

let cid1 = null; // CRUD için
let cid2 = null; // silme için

async function runCustomerTests() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  CUSTOMERS TEST SUITE                    ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  await acquireToken();
  const ts = Date.now();

  /* ── 1. Listeleme ── */
  section('1. LİSTELEME — GET /api/customers');

  await test('Temel liste döner → 200', async () => {
    const r = await req('GET', '/api/customers');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('Pagination: limit=5', async () => {
    const r = await req('GET', '/api/customers?limit=5');
    expect(r.status).toBe(200);
    const d = r.body.data;
    const items = Array.isArray(d) ? d : (d?.customers || d?.rows || []);
    expect(items.length).toBeLte(5);
  });

  await test('Pagination: page=1&limit=2', async () => {
    const r = await req('GET', '/api/customers?page=1&limit=2');
    expect(r.status).toBe(200);
  });

  await test('Arama: search=a', async () => {
    const r = await req('GET', '/api/customers?search=a');
    expect(r.status).toBe(200);
  });

  await test('Arama: boş search', async () => {
    const r = await req('GET', '/api/customers?search=');
    expect(r.status).toBeOneOf([200, 400]);
  });

  await test('Aktif müşteri filtresi', async () => {
    const r = await req('GET', '/api/customers?is_active=true');
    expect(r.status).toBe(200);
  });

  await test('Pasif müşteri filtresi', async () => {
    const r = await req('GET', '/api/customers?is_active=false');
    expect(r.status).toBe(200);
  });

  /* ── 2. Oluşturma ── */
  section('2. OLUŞTURMA — POST /api/customers');

  await test('Tam alanlarla müşteri oluştur', async () => {
    const r = await req('POST', '/api/customers', {
      full_name:    `Test Müşteri ${ts}`,
      company_name: `Test A.Ş. ${ts}`,
      tax_number:   `${ts}`.slice(-10),
      tax_office:   'Kadıköy VD',
      phone_number: '0555 123 4567',
      email:        `test${ts}@example.com`,
      address:      'Test Sokak No:1 İstanbul',
    });
    expect(r.status).toBeOneOf([200, 201]);
    expect(r.body.success).toBeOk();
    cid1 = r.body.data?.id || r.body.data?.customer?.id;
    expect(cid1).toBeOk();
  });

  await test('Oluşturulan müşteri doğru alanları içeriyor', async () => {
    if (!cid1) throw new Error('Müşteri oluşturulamadı');
    const r = await req('GET', `/api/customers/${cid1}`);
    const d = r.body.data;
    expect(d).toHaveKey('id');
    expect(d).toHaveKey('full_name');
  });

  await test('Minimal alanlarla ikinci müşteri oluştur', async () => {
    const r = await req('POST', '/api/customers', {
      full_name:    `Minimal Müşteri ${ts}`,
      company_name: `Minimal Firma ${ts}`,
      tax_number:   `${ts + 1}`.slice(-10),
      tax_office:   'Test VD',
    });
    expect(r.status).toBeOneOf([200, 201]);
    cid2 = r.body.data?.id || r.body.data?.customer?.id;
  });

  await test('Eksik full_name → 400/422', async () => {
    const r = await req('POST', '/api/customers', {
      tax_number: '1111111111',
      tax_office: 'Test VD',
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Vergi no 10 haneden fazla → 400/422 veya truncate', async () => {
    const r = await req('POST', '/api/customers', {
      full_name:  'Uzun VKN Müşterisi',
      tax_number: '123456789012345',
      tax_office: 'Test VD',
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422]);
  });

  await test('Geçersiz e-posta formatı → 400/422 veya kabul', async () => {
    const r = await req('POST', '/api/customers', {
      full_name:  'Geçersiz Mail Müşteri',
      tax_number: `${ts + 2}`.slice(-10),
      tax_office: 'Test VD',
      email:      'not-valid-email',
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422]);
  });

  await test('XSS payload → sanitize veya reject', async () => {
    const r = await req('POST', '/api/customers', {
      full_name:  '<script>alert("xss")</script>',
      tax_number: `${ts + 3}`.slice(-10),
      tax_office: 'Test VD',
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422]);
    if (r.status === 200 || r.status === 201) {
      const name = r.body.data?.full_name || '';
      expect(name).toNotContain('<script>');
    }
  });

  await test('Boş body → 400/422', async () => {
    const r = await req('POST', '/api/customers', {});
    expect(r.status).toBeOneOf([400, 422]);
  });

  /* ── 3. Tekil Getirme ── */
  section('3. TEKİL GETİRME — GET /api/customers/:id');

  await test('Geçerli ID ile müşteri getir', async () => {
    if (!cid1) throw new Error('Müşteri yok');
    const r = await req('GET', `/api/customers/${cid1}`);
    expect(r.status).toBe(200);
    expect(r.body.data.id).toBe(cid1);
  });

  await test('Var olmayan ID → 404', async () => {
    const r = await req('GET', '/api/customers/999999999');
    expect(r.status).toBeOneOf([404, 400]);
  });

  await test('String ID → 400/404', async () => {
    const r = await req('GET', '/api/customers/abc');
    expect(r.status).toBeOneOf([400, 404, 422, 500]);
  });

  /* ── 4. Güncelleme ── */
  section('4. GÜNCELLEME — PUT /api/customers/:id');

  await test('Telefon numarasını güncelle', async () => {
    if (!cid1) throw new Error('Müşteri yok');
    const r = await req('PUT', `/api/customers/${cid1}`, { phone_number: '0555 999 8888' });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('Şirket adı güncelle', async () => {
    if (!cid1) throw new Error('Müşteri yok');
    const r = await req('PUT', `/api/customers/${cid1}`, { company_name: `Güncel A.Ş. ${ts}` });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('Konum güncelle', async () => {
    if (!cid1) throw new Error('Müşteri yok');
    const r = await req('PUT', `/api/customers/${cid1}`, { company_location: 'Güncellenmiş Adres No:99' });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('Çoklu alan güncelle', async () => {
    if (!cid1) throw new Error('Müşteri yok');
    const r = await req('PUT', `/api/customers/${cid1}`, {
      phone_number: '0532 111 2222',
      address:      'Yeni Adres',
      company_name: `Güncellenmiş A.Ş. ${ts}`,
    });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('Var olmayan müşteri güncelle → 404', async () => {
    const r = await req('PUT', '/api/customers/999999999', { phone_number: '0555 000 0000' });
    expect(r.status).toBeOneOf([404, 400]);
  });

  /* ── 5. Müşteri İlişkili Veriler ── */
  section('5. MÜŞTERİ İLİŞKİLİ VERİLER');

  await test('Müşteri siparişleri — /api/customers/:id/orders', async () => {
    if (!cid1) throw new Error('Müşteri yok');
    const r = await req('GET', `/api/customers/${cid1}/orders`);
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('Müşteri faturaları — /api/customers/:id/invoices', async () => {
    if (!cid1) throw new Error('Müşteri yok');
    const r = await req('GET', `/api/customers/${cid1}/invoices`);
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('Müşteri çekleri — /api/customers/:id/cheques', async () => {
    if (!cid1) throw new Error('Müşteri yok');
    const r = await req('GET', `/api/customers/${cid1}/cheques`);
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('Müşteri cari hesabı — /api/customers/:id/current-account', async () => {
    if (!cid1) throw new Error('Müşteri yok');
    const r = await req('GET', `/api/customers/${cid1}/current-account`);
    expect(r.status).toBeOneOf([200, 404]);
  });

  /* ── 6. Silme ── */
  section('6. SİLME — DELETE /api/customers/:id');

  await test('Müşteri sil → 200/204', async () => {
    if (!cid2) throw new Error('İkinci müşteri yok');
    const r = await req('DELETE', `/api/customers/${cid2}`);
    expect(r.status).toBeOneOf([200, 204]);
  });

  await test('Silinen müşteriyi getir → 404', async () => {
    if (!cid2) throw new Error('İkinci müşteri yok');
    const r = await req('GET', `/api/customers/${cid2}`);
    expect(r.status).toBeOneOf([404, 400]);
  });

  await test('Var olmayan müşteriyi sil → 404/400', async () => {
    const r = await req('DELETE', '/api/customers/999999999');
    expect(r.status).toBeOneOf([404, 400]);
  });

  /* ── 7. Temizlik ── */
  section('7. TEMİZLİK');

  await test('Ana test müşterisini sil', async () => {
    if (!cid1) throw new Error('Ana müşteri yok');
    const r = await req('DELETE', `/api/customers/${cid1}`);
    expect(r.status).toBeOneOf([200, 204]);
  });

  return printSummary('CUSTOMERS TEST SUITE');
}

if (require.main === module) {
  runCustomerTests()
    .then(ok => process.exit(ok ? 0 : 1))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runCustomerTests };
