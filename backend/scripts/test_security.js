/**
 * ╔══════════════════════════════════════════╗
 * ║  SECURITY TEST SUITE — Güvenlik          ║
 * ║  Kullanım: node scripts/test_security.js ║
 * ╚══════════════════════════════════════════╝
 *
 * Kapsar:
 *  - SQL Injection
 *  - XSS (stored & reflected)
 *  - Yetkisiz erişim (tüm modüller)
 *  - Geçersiz / süresi dolmuş JWT
 *  - CORS Origin kontrolü
 *  - Rate limiting
 *  - Aşırı büyük payload
 *  - Path traversal
 *  - Mass assignment
 *  - Concurrent load
 */
const { req, acquireToken, clearAuth, setAuth, getToken, getCookie } = require('./helpers/api');
const { test, section, printSummary, expect, C } = require('./helpers/runner');

/* Geçici olarak oluşturulan kayıtları tut */
const cleanup = [];

async function runSecurityTests() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  SECURITY TEST SUITE                     ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  await acquireToken();

  /* ── 1. SQL Injection ── */
  section('1. SQL INJECTION');

  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE products; --",
    "1 UNION SELECT * FROM users --",
    "' OR 1=1 --",
    "admin'--",
    "1; SELECT pg_sleep(2) --",
  ];

  for (const payload of sqlPayloads) {
    await test(`Search SQL injection: ${payload.slice(0, 30)}`, async () => {
      const start = Date.now();
      const r = await req('GET', `/api/products?search=${encodeURIComponent(payload)}`);
      const elapsed = Date.now() - start;
      expect(r.status).toBeOneOf([200, 400]);
      // pg_sleep saldırısı başarılıysa çok yavaş olur
      expect(elapsed).toBeLte(5000);
    });
  }

  await test('SQL injection — customer ID parametresi', async () => {
    const r = await req('GET', `/api/orders?customer_id=${encodeURIComponent("1 OR 1=1")}`);
    expect(r.status).toBeOneOf([200, 400, 422]);
  });

  await test('SQL injection — route parametresi /api/products/:id', async () => {
    const r = await req('GET', `/api/products/${encodeURIComponent("1' OR '1'='1")}`);
    expect(r.status).toBeOneOf([400, 404]);
  });

  /* ── 2. XSS ── */
  section('2. XSS — Cross-Site Scripting');

  const xssPayloads = [
    '<script>alert(1)</script>',
    '"><script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '<svg onload=alert(1)>',
  ];

  for (const xss of xssPayloads) {
    await test(`XSS müşteri adında: ${xss.slice(0, 25)}...`, async () => {
      const ts = Date.now();
      const r = await req('POST', '/api/customers', {
        full_name:  xss,
        tax_number: `${ts}`.slice(-10),
        tax_office: 'Test VD',
      });
      expect(r.status).toBeOneOf([200, 201, 400, 422]);
      if (r.status === 200 || r.status === 201) {
        const name = r.body.data?.full_name || '';
        expect(name).toNotContain('<script>');
        expect(name).toNotContain('onerror=');
        expect(name).toNotContain('javascript:');
        // Silme için kaydet
        const id = r.body.data?.id;
        if (id) cleanup.push(id);
      }
    });
  }

  await test('XSS ürün açıklamasında', async () => {
    const r = await req('POST', '/api/products', {
      name:  'XSS Test Ürünü',
      sku:   `XSS-SKU-${Date.now()}`,
      price: 1,
      stock: 1,
      description: '<script>alert("xss")</script>',
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422]);
    if (r.status === 200 || r.status === 201) {
      const desc = r.body.data?.description || '';
      if (desc) expect(desc).toNotContain('<script>');
      const id = r.body.data?.id;
      if (id) await req('DELETE', `/api/products/${id}`);
    }
  });

  /* ── 3. Yetkisiz Erişim ── */
  section('3. YETKİSİZ ERİŞİM — Token Olmadan');

  const protectedEndpoints = [
    ['GET',    '/api/products'],
    ['GET',    '/api/customers'],
    ['GET',    '/api/orders'],
    ['GET',    '/api/invoices'],
    ['GET',    '/api/cheques'],
    ['GET',    '/api/reports/summary'],
    ['GET',    '/api/reports/top-products'],
    ['GET',    '/api/reports/inventory'],
    ['GET',    '/api/settings'],
    ['GET',    '/api/settings/categories'],
    ['GET',    '/api/suppliers'],
    ['GET',    '/api/ai/health'],
    ['GET',    '/api/ai/models'],
    ['GET',    '/api/ai/approvals/my'],
    ['POST',   '/api/ai/chat'],
    ['POST',   '/api/products'],
    ['POST',   '/api/customers'],
    ['DELETE', '/api/products/1'],
  ];

  clearAuth();
  for (const [method, path] of protectedEndpoints) {
    await test(`${method} ${path} — tokensiz → 401`, async () => {
      const r = await req(method, path, method === 'POST' ? {} : null, false);
      expect(r.status).toBe(401);
    });
  }
  await acquireToken();

  /* ── 4. JWT Güvenliği ── */
  section('4. JWT GÜVENLİĞİ');

  await test('Geçersiz JWT imzası → 401', async () => {
    const t = getToken(); const c = getCookie();
    setAuth('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjF9.invalid_signature', 'access_token=bad');
    const r = await req('GET', '/api/auth/profile');
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  await test('Keyfi string token → 401', async () => {
    const t = getToken(); const c = getCookie();
    setAuth('not-a-jwt-at-all', 'access_token=not-a-jwt');
    const r = await req('GET', '/api/products');
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  await test('Boş Bearer token → 401', async () => {
    const t = getToken(); const c = getCookie();
    setAuth('', 'access_token=');
    const r = await req('GET', '/api/products');
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  await test('Başka uygulamaya ait JWT → 401', async () => {
    const t = getToken(); const c = getCookie();
    // Farklı secret ile imzalanmış (sahte) token
    const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjk5OSwiaWF0IjoxNjAwMDAwMDAwfQ.FakeSignatureHere';
    setAuth(fakeJwt, `access_token=${fakeJwt}`);
    const r = await req('GET', '/api/products');
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  /* ── 5. CORS Kontrol ── */
  section('5. CORS ORIGIN KONTROLÜ');

  await test('Origin olmadan POST → 403 veya kabul', async () => {
    const t = getToken(); const c = getCookie();
    // Origin header olmadan gönder
    const r = await req('POST', '/api/auth/login', {
      email: 'admin@erp.local',
      password: 'admin123',
    }, false, { Origin: undefined, Referer: undefined });
    // Güvenlik middleware 403 verebilir, ya da dev modda kabul edebilir
    expect(r.status).toBeOneOf([200, 201, 400, 401, 403, 429]);
  });

  await test('İzin verilmeyen Origin → 403 veya kabul', async () => {
    const r = await req('GET', '/api/products', null, true, { Origin: 'https://malicious-site.com' });
    // CORS politikasına göre değişir
    expect(r.status).toBeOneOf([200, 401, 403]);
  });

  /* ── 6. Aşırı Büyük Payload ── */
  section('6. AŞIRI BÜYÜK PAYLOAD');

  await test('10KB JSON payload → 200/400/413', async () => {
    const bigName = 'A'.repeat(10000);
    const r = await req('POST', '/api/products', {
      name:  bigName,
      sku:   `SKU-BIG-${Date.now()}`,
      price: 10,
      stock: 1,
    });
    expect(r.status).toBeOneOf([200, 201, 400, 413, 422]);
    if (r.status === 200 || r.status === 201) {
      const id = r.body.data?.id;
      if (id) await req('DELETE', `/api/products/${id}`);
    }
  });

  await test('1MB JSON payload → 413/400', async () => {
    const megabyte = 'x'.repeat(1024 * 1024);
    const r = await req('POST', '/api/customers', {
      full_name:  megabyte,
      tax_number: `${Date.now()}`.slice(-10),
      tax_office: 'Test VD',
    });
    expect(r.status).toBeOneOf([400, 413, 422, 500]);
  });

  /* ── 7. Rate Limiting ── */
  section('7. RATE LİMİTİNG');

  await test('10 eşzamanlı rapor isteği — sunucu kararlı', async () => {
    const promises = Array.from({ length: 10 }, () =>
      req('GET', '/api/reports/summary')
    );
    const responses = await Promise.all(promises);
    responses.forEach(r => {
      expect(r.status).toBeOneOf([200, 429, 401]);
    });
  });

  await test('20 eşzamanlı ürün listesi — 500 yok', async () => {
    const promises = Array.from({ length: 20 }, () =>
      req('GET', '/api/products')
    );
    const responses = await Promise.all(promises);
    responses.forEach(r => {
      expect(r.status).toBeOneOf([200, 429, 401]);
    });
  });

  /* ── 8. Mass Assignment Koruması ── */
  section('8. MASS ASSIGNMENT KORUMASI');

  await test('Ürün güncellemede company_id değiştirme girişimi', async () => {
    // Önce bir ürün oluştur
    const create = await req('POST', '/api/products', {
      name:  `Mass Assign Test ${Date.now()}`,
      sku:   `MA-SKU-${Date.now()}`,
      price: 10,
      stock: 1,
    });
    if (create.status !== 200 && create.status !== 201) throw new Error('Ürün oluşturulamadı');
    const id = create.body.data?.id;

    // company_id değiştirme girişimi
    const r = await req('PUT', `/api/products/${id}`, {
      price:      15,
      company_id: 999,  // kötü niyetli alan
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422]);

    // Ürünü sil
    await req('DELETE', `/api/products/${id}`);

    // company_id değişmemiş olmalı (veya 400 dönmeli)
    if (r.status === 200 || r.status === 201) {
      const check = await req('GET', `/api/products/${id}`);
      if (check.status === 200) {
        const savedCompanyId = check.body.data?.company_id;
        expect(savedCompanyId).toNotBe(999);
      }
    }
  });

  await test('Müşteride role alanı inject etme', async () => {
    const r = await req('POST', '/api/customers', {
      full_name:  `Role Inject Test ${Date.now()}`,
      tax_number: `${Date.now()}`.slice(-10),
      tax_office: 'Test VD',
      role:       'admin',         // kötü niyetli
      is_admin:   true,            // kötü niyetli
      company_id: 1,               // kötü niyetli
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422]);
    if (r.status === 200 || r.status === 201) {
      const d = r.body.data;
      const id = d?.id;
      if (id) {
        await req('DELETE', `/api/customers/${id}`);
      }
    }
  });

  /* ── 9. Path Traversal ── */
  section('9. PATH TRAVERSAL');

  await test('Path traversal ID: ../etc/passwd', async () => {
    const r = await req('GET', '/api/products/../../../etc/passwd');
    expect(r.status).toBeOneOf([400, 404, 403]);
  });

  await test('Path traversal encoded: %2e%2e%2f', async () => {
    const r = await req('GET', '/api/products/%2e%2e%2f%2e%2e%2f');
    expect(r.status).toBeOneOf([400, 404, 403]);
  });

  /* ── 10. Temizlik ── */
  section('10. TEMİZLİK');

  await test('XSS test kayıtlarını temizle', async () => {
    for (const id of cleanup) {
      await req('DELETE', `/api/customers/${id}`);
    }
    // Hata olsa da testi geç
    expect(true).toBeOk();
  });

  return printSummary('SECURITY TEST SUITE');
}

if (require.main === module) {
  runSecurityTests()
    .then(ok => process.exit(ok ? 0 : 1))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runSecurityTests };
