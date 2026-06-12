/**
 * ╔══════════════════════════════════════════╗
 * ║  SUPPLIERS TEST SUITE — Tedarikçi        ║
 * ║  Kullanım: node scripts/test_suppliers.js║
 * ╚══════════════════════════════════════════╝
 */
const { req, acquireToken } = require('./helpers/api');
const { test, section, printSummary, expect, C } = require('./helpers/runner');

let sid1 = null;
let sid2 = null;

async function runSupplierTests() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  SUPPLIERS TEST SUITE                    ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  await acquireToken();
  const ts = Date.now();

  /* ── 1. Listeleme ── */
  section('1. LİSTELEME — GET /api/suppliers');

  await test('Temel liste → 200', async () => {
    const r = await req('GET', '/api/suppliers');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('Aktif tedarikçi filtresi', async () => {
    const r = await req('GET', '/api/suppliers?is_active=true');
    expect(r.status).toBe(200);
  });

  await test('Pasif tedarikçi filtresi', async () => {
    const r = await req('GET', '/api/suppliers?is_active=false');
    expect(r.status).toBe(200);
  });

  await test('Arama: search=a', async () => {
    const r = await req('GET', '/api/suppliers?search=a');
    expect(r.status).toBe(200);
  });

  await test('Pagination: limit=3', async () => {
    const r = await req('GET', '/api/suppliers?limit=3');
    expect(r.status).toBe(200);
    const d = r.body.data;
    const items = Array.isArray(d) ? d : (d?.suppliers || d?.rows || []);
    expect(items.length).toBeLte(3);
  });

  /* ── 2. Oluşturma ── */
  section('2. OLUŞTURMA — POST /api/suppliers');

  await test('Tam alanlarla tedarikçi oluştur', async () => {
    const r = await req('POST', '/api/suppliers', {
      supplier_name:  `Test Tedarikçi ${ts}`,
      contact_person: 'Ahmet Yılmaz',
      email:          `supplier${ts}@test.com`,
      phone:          '0555 111 0000',
      address:        'Tedarikçi Sokak No:5 Ankara',
      tax_number:     `${ts}`.slice(-10),
      tax_office:     'Ankara VD',
    });
    expect(r.status).toBeOneOf([200, 201]);
    expect(r.body.success).toBeOk();
    sid1 = r.body.data?.id || r.body.data?.supplier?.id;
    expect(sid1).toBeOk();
  });

  await test('Minimal alanlarla ikinci tedarikçi', async () => {
    const r = await req('POST', '/api/suppliers', {
      supplier_name: `Minimal Tedarikçi ${ts}`,
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422]);
    if (r.status === 200 || r.status === 201) {
      sid2 = r.body.data?.id || r.body.data?.supplier?.id;
    }
  });

  await test('Eksik name → 400/422', async () => {
    const r = await req('POST', '/api/suppliers', {
      email: 'noemail@test.com',
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Geçersiz e-posta → 400/422 veya kabul', async () => {
    const r = await req('POST', '/api/suppliers', {
      name:  `Invalid Mail Supplier ${ts}`,
      email: 'not-valid',
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422]);
    if (r.status === 200 || r.status === 201) {
      const id = r.body.data?.id;
      if (id) await req('DELETE', `/api/suppliers/${id}`);
    }
  });

  await test('XSS payload name → sanitize', async () => {
    const r = await req('POST', '/api/suppliers', {
      name: '<script>alert(1)</script>',
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422]);
    if (r.status === 200 || r.status === 201) {
      const name = r.body.data?.name || '';
      expect(name).toNotContain('<script>');
      const id = r.body.data?.id;
      if (id) await req('DELETE', `/api/suppliers/${id}`);
    }
  });

  /* ── 3. Tekil Getirme ── */
  section('3. TEKİL GETİRME — GET /api/suppliers/:id');

  await test('Geçerli ID ile tedarikçi getir', async () => {
    if (!sid1) throw new Error('Tedarikçi yok');
    const r = await req('GET', `/api/suppliers/${sid1}`);
    expect(r.status).toBe(200);
    expect(r.body.data?.id).toBe(sid1);
  });

  await test('Tedarikçi alanları doğru', async () => {
    if (!sid1) throw new Error('Tedarikçi yok');
    const r = await req('GET', `/api/suppliers/${sid1}`);
    if (r.status === 200) {
      expect(r.body.data).toHaveKey('name');
      expect(r.body.data).toHaveKey('id');
    }
  });

  await test('Var olmayan ID → 404', async () => {
    const r = await req('GET', '/api/suppliers/999999999');
    expect(r.status).toBeOneOf([404, 400]);
  });

  await test('String ID → 400/404', async () => {
    const r = await req('GET', '/api/suppliers/notanumber');
    expect(r.status).toBeOneOf([400, 404, 500]);
  });

  /* ── 4. Güncelleme ── */
  section('4. GÜNCELLEME — PUT /api/suppliers/:id');

  await test('İletişim bilgilerini güncelle', async () => {
    if (!sid1) throw new Error('Tedarikçi yok');
    const r = await req('PUT', `/api/suppliers/${sid1}`, {
      contact_name: 'Mehmet Kaya',
      phone:        '0555 222 3333',
    });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('Pasif yap', async () => {
    if (!sid1) throw new Error('Tedarikçi yok');
    const r = await req('PUT', `/api/suppliers/${sid1}`, { is_active: false });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('Tekrar aktif yap', async () => {
    if (!sid1) throw new Error('Tedarikçi yok');
    const r = await req('PUT', `/api/suppliers/${sid1}`, { is_active: true });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('Var olmayan tedarikçi güncelle → 404', async () => {
    const r = await req('PUT', '/api/suppliers/999999999', { name: 'Yok' });
    expect(r.status).toBeOneOf([404, 400]);
  });

  /* ── 5. Silme ── */
  section('5. SİLME — DELETE /api/suppliers/:id');

  await test('Tedarikçi sil → 200/204', async () => {
    if (!sid2) throw new Error('İkinci tedarikçi yok');
    const r = await req('DELETE', `/api/suppliers/${sid2}`);
    expect(r.status).toBeOneOf([200, 204]);
  });

  await test('Silinen tedarikçiyi getir → 404', async () => {
    if (!sid2) throw new Error('İkinci tedarikçi yok');
    const r = await req('GET', `/api/suppliers/${sid2}`);
    expect(r.status).toBeOneOf([404, 400]);
  });

  await test('Var olmayan tedarikçiyi sil → 404/400', async () => {
    const r = await req('DELETE', '/api/suppliers/999999999');
    expect(r.status).toBeOneOf([404, 400]);
  });

  /* ── 6. Güvenlik ── */
  section('6. GÜVENLİK');

  await test('Token olmadan liste → 401', async () => {
    const { clearAuth, setAuth, getToken, getCookie } = require('./helpers/api');
    const t = getToken(); const c = getCookie();
    clearAuth();
    const r = await req('GET', '/api/suppliers', null, false);
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  /* ── 7. Temizlik ── */
  section('7. TEMİZLİK');

  await test('Ana test tedarikçisini sil', async () => {
    if (!sid1) throw new Error('Tedarikçi yok');
    const r = await req('DELETE', `/api/suppliers/${sid1}`);
    expect(r.status).toBeOneOf([200, 204]);
  });

  return printSummary('SUPPLIERS TEST SUITE');
}

if (require.main === module) {
  runSupplierTests()
    .then(ok => process.exit(ok ? 0 : 1))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runSupplierTests };
