/**
 * Kapsamlı Backend API Test Suite
 * Kullanım: node scripts/test_api.js
 * Seçenekler:
 *   --only=auth|products|orders|customers|invoices|cheques|reports|ai|suppliers|warehouses|settings|security|perf
 *   --verbose  (hata detayları)
 *   --bail     (ilk hatada dur)
 */
require('dotenv').config();
const http = require('http');
const https = require('https');
const url = require('url');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const ARGS     = process.argv.slice(2);
const ONLY     = (ARGS.find(a => a.startsWith('--only=')) || '').replace('--only=', '') || '';
const VERBOSE  = ARGS.includes('--verbose');
const BAIL     = ARGS.includes('--bail');

const C = {
  green:  '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan:   '\x1b[36m', bold: '\x1b[1m', reset: '\x1b[0m', gray: '\x1b[90m',
};

/* ── HTTP helper ─────────────────────────────────────────────────── */
let _token  = null;
let _cookie = null;

function req(method, path, body = null, authRequired = true) {
  return new Promise((resolve) => {
    const parsed   = url.parse(BASE_URL + path);
    const isHttps  = parsed.protocol === 'https:';
    const lib      = isHttps ? https : http;
    const payload  = body ? JSON.stringify(body) : null;
    const headers  = {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Origin':        'http://localhost:5173',
      'Referer':       'http://localhost:5173/',
    };
    if (authRequired && _token)  headers['Authorization'] = `Bearer ${_token}`;
    if (authRequired && _cookie) headers['Cookie']        = _cookie;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     parsed.path,
      method,
      headers,
      timeout:  15000,
    };

    const request = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const setCookies = res.headers['set-cookie'];
        if (setCookies) {
          const cookiePairs = setCookies.map(c => c.split(';')[0]).join('; ');
          _cookie = cookiePairs;
          const tokenMatch = cookiePairs.match(/access_token=([^;]+)/);
          if (tokenMatch) _token = tokenMatch[1];
        }
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    request.on('timeout', () => { request.destroy(); resolve({ status: 0, body: { message: 'TIMEOUT' } }); });
    request.on('error',   (e) => resolve({ status: 0, body: { message: e.message } }));
    if (payload) request.write(payload);
    request.end();
  });
}

/* ── Test runner ─────────────────────────────────────────────────── */
const results = { pass: 0, fail: 0, errors: [] };

async function test(name, fn) {
  try {
    await fn();
    results.pass++;
    process.stdout.write(`  ${C.green}✓${C.reset} ${name}\n`);
  } catch (err) {
    results.fail++;
    results.errors.push({ name, err: err.message });
    process.stdout.write(`  ${C.red}✗${C.reset} ${name} ${C.gray}→ ${err.message}${C.reset}\n`);
    if (VERBOSE) console.error(err);
    if (BAIL) throw new Error('bail');
  }
}

function expect(val) {
  return {
    toBe:      (exp) => { if (val !== exp) throw new Error(`Expected ${JSON.stringify(exp)}, got ${JSON.stringify(val)}`); },
    toBeOneOf: (...opts) => { if (!opts.flat().includes(val)) throw new Error(`Expected one of [${opts.flat().join(',')}], got ${val}`); },
    toBeOk:    ()    => { if (!val) throw new Error(`Expected truthy, got ${JSON.stringify(val)}`); },
    toContain: (k)   => { if (!val?.includes?.(k)) throw new Error(`Expected to contain "${k}", got ${JSON.stringify(val)}`); },
    toHaveKey: (k)   => { if (!(k in (val || {}))) throw new Error(`Expected key "${k}" in ${JSON.stringify(val)}`); },
    toBeArray: ()    => { if (!Array.isArray(val)) throw new Error(`Expected array, got ${typeof val}`); },
    toBeLte:   (n)   => { if (val > n) throw new Error(`Expected ≤ ${n}, got ${val}`); },
    toBeGte:   (n)   => { if (val < n) throw new Error(`Expected ≥ ${n}, got ${val}`); },
  };
}

function section(name) {
  console.log(`\n${C.bold}${C.cyan}── ${name} ──${C.reset}`);
}

/* ── Silent login (called once before all tests) ─────────────────── */
async function acquireToken() {
  const r = await req('POST', '/api/auth/login', {
    email:    process.env.TEST_EMAIL    || 'admin@erp.local',
    password: process.env.TEST_PASSWORD || 'admin123',
  }, false);
  if (r.status === 0) throw new Error(`Sunucu bağlantısı kurulamadı: ${BASE_URL}`);
  if (r.status === 429) throw new Error('Rate limit aşıldı — lütfen 15 dakika bekleyin veya sunucuyu yeniden başlatın');
  if (!_token && !_cookie) throw new Error(`Login başarısız (${r.status}): ${JSON.stringify(r.body)}`);
}

/* ══════════════════════════════════════════════════════════════════
   TEST GRUPLAR
   ══════════════════════════════════════════════════════════════════ */

/* ── Auth ── */
async function testAuth() {
  section('AUTH');

  await test('Token mevcut — login başarılı', async () => {
    expect(_token || _cookie).toBeOk();
  });

  await test('POST /api/auth/login — yanlış şifre → 401', async () => {
    const r = await req('POST', '/api/auth/login', { email: 'admin@erp.local', password: 'WrongPass999!' }, false);
    expect(r.status).toBeOneOf([400, 401, 422, 429]);
  });

  await test('GET /api/auth/profile — authenticated', async () => {
    const r = await req('GET', '/api/auth/profile');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
    expect(r.body.data).toHaveKey('email');
  });

  await test('GET /api/auth/profile — no token → 401', async () => {
    const savedT = _token; const savedC = _cookie;
    _token = null; _cookie = null;
    const r = await req('GET', '/api/auth/profile');
    _token = savedT; _cookie = savedC;
    expect(r.status).toBe(401);
  });
}

/* ── Products ── */
async function testProducts() {
  section('PRODUCTS');
  let createdId;

  await test('GET /api/products — liste döner', async () => {
    const r = await req('GET', '/api/products');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
    const data = r.body.data;
    expect(Array.isArray(data) || Array.isArray(data?.products) || Array.isArray(data?.rows) || typeof data === 'object').toBeOk();
  });

  await test('POST /api/products — ürün oluştur', async () => {
    const r = await req('POST', '/api/products', {
      name: `Test Ürünü ${Date.now()}`,
      sku: `SKU-TEST-${Date.now()}`,
      price: 99.99,
      stock: 50,
      category: 'Test',
    });
    expect(r.status).toBeOneOf([200, 201]);
    expect(r.body.success).toBeOk();
    createdId = r.body.data?.id;
    expect(createdId).toBeOk();
  });

  await test('GET /api/products/:id — tekil ürün', async () => {
    if (!createdId) throw new Error('önceki test başarısız');
    const r = await req('GET', `/api/products/${createdId}`);
    expect(r.status).toBe(200);
    expect(r.body.data?.id).toBe(createdId);
  });

  await test('PUT /api/products/:id — ürün güncelle', async () => {
    if (!createdId) throw new Error('önceki test başarısız');
    const r = await req('PUT', `/api/products/${createdId}`, { price: 149.99, stock_quantity: 100 });
    expect(r.status).toBeOneOf([200, 201]);
    expect(r.body.success).toBeOk();
  });

  await test('GET /api/products?search=Test — arama', async () => {
    const r = await req('GET', '/api/products?search=Test');
    expect(r.status).toBe(200);
  });

  await test('DELETE /api/products/:id — ürün sil', async () => {
    if (!createdId) throw new Error('önceki test başarısız');
    const r = await req('DELETE', `/api/products/${createdId}`);
    expect(r.status).toBeOneOf([200, 204]);
  });

  await test('POST /api/products — eksik alan → hata', async () => {
    const r = await req('POST', '/api/products', { name: '' });
    expect(r.status).toBeOneOf([400, 422, 500]);
  });
}

/* ── Customers ── */
async function testCustomers() {
  section('CUSTOMERS');
  let cid;

  await test('GET /api/customers — liste döner', async () => {
    const r = await req('GET', '/api/customers');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('POST /api/customers — müşteri oluştur', async () => {
    const r = await req('POST', '/api/customers', {
      full_name:    `Test Müşterisi ${Date.now()}`,
      company_name: 'Test A.Ş.',
      tax_number:   `${Date.now()}`.slice(-10),
      tax_office:   'Test VD',
      phone_number: '0555 000 0000',
    });
    expect(r.status).toBeOneOf([200, 201]);
    cid = r.body.data?.id || r.body.data?.customer?.id;
    expect(cid).toBeOk();
  });

  await test('GET /api/customers/:id — tekil müşteri', async () => {
    if (!cid) throw new Error('önceki test başarısız');
    const r = await req('GET', `/api/customers/${cid}`);
    expect(r.status).toBe(200);
  });

  await test('PUT /api/customers/:id — müşteri güncelle', async () => {
    if (!cid) throw new Error('önceki test başarısız');
    const r = await req('PUT', `/api/customers/${cid}`, { phone_number: '0555 111 2222' });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('GET /api/customers?search=Test — arama', async () => {
    const r = await req('GET', '/api/customers?search=Test');
    expect(r.status).toBe(200);
  });
}

/* ── Orders ── */
async function testOrders() {
  section('ORDERS');

  await test('GET /api/orders — liste döner', async () => {
    const r = await req('GET', '/api/orders');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('GET /api/orders?status=pending — filtreli liste', async () => {
    const r = await req('GET', '/api/orders?status=pending');
    expect(r.status).toBe(200);
  });

  await test('GET /api/orders?status=completed — tamamlanan', async () => {
    const r = await req('GET', '/api/orders?status=completed');
    expect(r.status).toBe(200);
  });

  await test('GET /api/orders — pagination', async () => {
    const r = await req('GET', '/api/orders?page=1&limit=5');
    expect(r.status).toBe(200);
  });

  await test('GET /api/orders/9999999 — bulunamadı → 404', async () => {
    const r = await req('GET', '/api/orders/9999999');
    expect(r.status).toBeOneOf([404, 400]);
  });
}

/* ── Invoices ── */
async function testInvoices() {
  section('INVOICES');

  await test('GET /api/invoices — liste döner', async () => {
    const r = await req('GET', '/api/invoices');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('GET /api/invoices/stats — istatistikler', async () => {
    const r = await req('GET', '/api/invoices/stats');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('GET /api/invoices?status=paid — filtreli', async () => {
    const r = await req('GET', '/api/invoices?status=paid');
    expect(r.status).toBe(200);
  });

  await test('GET /api/invoices?status=overdue — vadesi geçmiş', async () => {
    const r = await req('GET', '/api/invoices?status=overdue');
    expect(r.status).toBe(200);
  });
}

/* ── Cheques ── */
async function testCheques() {
  section('CHEQUES');
  let chid;

  await test('GET /api/cheques — liste döner', async () => {
    const r = await req('GET', '/api/cheques');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('POST /api/cheques — çek oluştur', async () => {
    const custRes = await req('GET', '/api/customers?limit=1');
    const customers = custRes.body?.data;
    const custId = Array.isArray(customers) ? customers[0]?.id
                 : customers?.customers?.[0]?.id
                 || customers?.rows?.[0]?.id;
    if (!custId) throw new Error('Test için müşteri bulunamadı');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const r = await req('POST', '/api/cheques', {
      customer_id:     custId,
      check_serial_no: `TEST-CHK-${Date.now()}`,
      check_issuer:    'Test Kesideci',
      bank_name:       'Test Bank',
      received_date:   new Date().toISOString().split('T')[0],
      due_date:        dueDate.toISOString().split('T')[0],
      amount:          5000,
      currency:        'TRY',
    });
    expect(r.status).toBeOneOf([200, 201]);
    chid = r.body.data?.id || r.body.data?.cheque?.id;
    expect(chid).toBeOk();
  });

  await test('GET /api/cheques?status=pending — bekleyenler', async () => {
    const r = await req('GET', '/api/cheques?status=pending');
    expect(r.status).toBe(200);
  });

  await test('GET /api/cheques/due-soon — yaklaşan vadeler', async () => {
    const r = await req('GET', '/api/cheques/due-soon');
    expect(r.status).toBe(200);
    if (r.status === 200) {
      expect(r.body.success).toBeOk();
      expect(r.body.data).toHaveKey('dueSoon');
    }
  });

  await test('PATCH /api/cheques/:id/status — durum güncelle', async () => {
    if (!chid) throw new Error('Çek oluşturulamadı');
    const r = await req('PATCH', `/api/cheques/${chid}/status`, { status: 'cleared' });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('DELETE /api/cheques/:id — çek sil', async () => {
    if (!chid) throw new Error('Çek oluşturulamadı');
    const r = await req('DELETE', `/api/cheques/${chid}`);
    expect(r.status).toBeOneOf([200, 204]);
  });
}

/* ── Reports ── */
async function testReports() {
  section('REPORTS');

  await test('GET /api/reports/summary — dashboard özeti döner', async () => {
    const r = await req('GET', '/api/reports/summary');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('GET /api/reports/summary — kpi alanı var', async () => {
    const r = await req('GET', '/api/reports/summary');
    expect(r.body.data).toHaveKey('kpi');
  });

  await test('GET /api/reports/summary — weeklyChart alanı var', async () => {
    const r = await req('GET', '/api/reports/summary');
    expect(r.body.data).toHaveKey('weeklyChart');
  });

  await test('GET /api/reports/summary — monthlyTrend ≥ 1 kayıt', async () => {
    const r = await req('GET', '/api/reports/summary');
    const trend = r.body.data?.monthlyTrend || [];
    expect(Array.isArray(trend)).toBeOk();
    expect(trend.length).toBeGte(1);
  });

  await test('GET /api/reports/summary — KPI alanları doğru', async () => {
    const r = await req('GET', '/api/reports/summary');
    const kpi = r.body.data?.kpi;
    expect(kpi).toHaveKey('totalProducts');
    expect(kpi).toHaveKey('totalCustomers');
    expect(kpi).toHaveKey('totalOrders');
    expect(kpi).toHaveKey('totalRevenue');
  });

  await test('GET /api/reports/top-products — en çok satanlar', async () => {
    const r = await req('GET', '/api/reports/top-products');
    expect(r.status).toBe(200);
  });

  await test('GET /api/reports/daily — günlük rapor', async () => {
    const r = await req('GET', '/api/reports/daily');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('GET /api/reports/monthly — aylık rapor', async () => {
    const r = await req('GET', '/api/reports/monthly');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('GET /api/reports/inventory — envanter', async () => {
    const r = await req('GET', '/api/reports/inventory');
    expect(r.status).toBeOneOf([200, 404]);
  });
}

/* ── AI Endpoints ── */
async function testAI() {
  section('AI / CHAT');

  await test('GET /api/ai/health — sağlık endpoint erişilebilir', async () => {
    const r = await req('GET', '/api/ai/health');
    // 200 (Ollama çalışıyor) veya 500 (bağlanamıyor) her ikisi de kabul
    expect(r.status).toBeOneOf([200, 500, 503]);
    // response body success alanına sahip olmalı
    expect(typeof r.body).toBe('object');
  });

  await test('POST /api/ai/chat — boş mesaj → 400', async () => {
    const r = await req('POST', '/api/ai/chat', { message: '' });
    // 400 veya 503 (Ollama kapalıysa validation öncesi)
    expect(r.status).toBeOneOf([400, 422, 503]);
  });

  await test('POST /api/ai/chat — uzun mesaj → 400 (>1000 karakter)', async () => {
    const r = await req('POST', '/api/ai/chat', { message: 'a'.repeat(1001) });
    expect(r.status).toBeOneOf([400, 422, 503]);
  });

  await test('POST /api/ai/chat — geçerli soru (AI mevcut/değil)', async () => {
    const r = await req('POST', '/api/ai/chat', { message: 'Merhaba, nasılsın?' });
    // 200 (AI yanıtladı) veya 503 (Ollama kapalı) — ikisi de kabul
    expect(r.status).toBeOneOf([200, 503]);
    if (r.status === 200) {
      expect(r.body.success).toBeOk();
      expect(r.body.data).toHaveKey('answer');
    }
  });

  await test('POST /api/ai/chat — sipariş sorusu (AI mevcut/değil)', async () => {
    const r = await req('POST', '/api/ai/chat', { message: 'Bu ayki sipariş durumumu özetle' });
    expect(r.status).toBeOneOf([200, 503]);
  });

  await test('GET /api/ai/approvals/my — onay listesi', async () => {
    const r = await req('GET', '/api/ai/approvals/my');
    expect(r.status).toBeOneOf([200, 404]);
    if (r.status === 200) {
      expect(r.body.success).toBeOk();
    }
  });
}

/* ── Suppliers ── */
async function testSuppliers() {
  section('SUPPLIERS');

  await test('GET /api/suppliers — liste döner', async () => {
    const r = await req('GET', '/api/suppliers');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('GET /api/suppliers?is_active=true — aktif tedarikçiler', async () => {
    const r = await req('GET', '/api/suppliers?is_active=true');
    expect(r.status).toBe(200);
  });
}

/* ── Warehouses ── */
async function testWarehouses() {
  section('WAREHOUSES');

  await test('GET /api/warehouses — liste döner', async () => {
    const r = await req('GET', '/api/warehouses');
    expect(r.status).toBeOneOf([200, 404]);
  });
}

/* ── Settings ── */
async function testSettings() {
  section('SETTINGS');

  await test('GET /api/settings/categories — kategorili ayarlar', async () => {
    const r = await req('GET', '/api/settings/categories');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('GET /api/settings — tüm ayarlar', async () => {
    const r = await req('GET', '/api/settings');
    expect(r.status).toBe(200);
  });
}

/* ── Security Edge Cases ── */
async function testSecurity() {
  section('SECURITY');

  await test('SQL injection — products search', async () => {
    const r = await req('GET', `/api/products?search=${encodeURIComponent("' OR '1'='1")}`);
    expect(r.status).toBeOneOf([200, 400]);
    // Sunucu çökmemeli
  });

  await test('XSS payload — customer name (sanitize veya reject)', async () => {
    const r = await req('POST', '/api/customers', {
      full_name:    '<script>alert(1)</script>',
      company_name: 'XSS Test',
      tax_number:   '9999999998',
      tax_office:   'Test VD',
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422]);
    if (r.status === 200 || r.status === 201) {
      const name = r.body.data?.full_name || '';
      if (name.includes('<script>')) throw new Error('XSS payload sanitize edilmedi!');
    }
  });

  await test('Unauthenticated access to protected route → 401', async () => {
    const savedT = _token; const savedC = _cookie;
    _token = null; _cookie = null;
    const r = await req('GET', '/api/products');
    _token = savedT; _cookie = savedC;
    expect(r.status).toBe(401);
  });

  await test('Invalid JWT token → 401', async () => {
    const savedT = _token; const savedC = _cookie;
    _token = 'invalid.jwt.token'; _cookie = 'access_token=invalid.jwt.token';
    const r = await req('GET', '/api/products');
    _token = savedT; _cookie = savedC;
    expect(r.status).toBe(401);
  });

  await test('Concurrent requests — sunucu kararlı', async () => {
    const promises = Array.from({ length: 8 }, () =>
      req('GET', '/api/reports/summary')
    );
    const responses = await Promise.all(promises);
    responses.forEach(r => expect(r.status).toBeOneOf([200, 429, 401]));
  });
}

/* ── Performance ── */
async function testPerformance() {
  section('PERFORMANCE');

  await test('GET /api/reports/summary — < 3s yanıt süresi', async () => {
    const start = Date.now();
    const r = await req('GET', '/api/reports/summary');
    const elapsed = Date.now() - start;
    expect(r.status).toBe(200);
    expect(elapsed).toBeLte(3000);
    if (VERBOSE) console.log(`    ${C.gray}Süre: ${elapsed}ms${C.reset}`);
  });

  await test('GET /api/products — < 2s yanıt süresi', async () => {
    const start = Date.now();
    await req('GET', '/api/products');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLte(2000);
  });

  await test('GET /api/orders — < 2s yanıt süresi', async () => {
    const start = Date.now();
    await req('GET', '/api/orders');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLte(2000);
  });

  await test('GET /api/customers — < 2s yanıt süresi', async () => {
    const start = Date.now();
    await req('GET', '/api/customers');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLte(2000);
  });
}

/* ══════════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════════ */
async function run() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║     ERP Backend API Test Suite v2.1          ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════╝${C.reset}`);
  console.log(`${C.gray}  Hedef: ${BASE_URL}${C.reset}`);
  if (ONLY) console.log(`${C.yellow}  Filtre: ${ONLY}${C.reset}`);

  /* Token edinimi — sadece BİR kez login yapılır */
  process.stdout.write(`\n${C.gray}  Oturum açılıyor...${C.reset}`);
  try {
    await acquireToken();
    process.stdout.write(` ${C.green}✓${C.reset}\n`);
  } catch (err) {
    process.stdout.write(` ${C.red}✗${C.reset}\n`);
    console.error(`${C.red}${C.bold}FATAL: ${err.message}${C.reset}`);
    process.exit(1);
  }

  const groups = {
    auth:       testAuth,
    products:   testProducts,
    customers:  testCustomers,
    orders:     testOrders,
    invoices:   testInvoices,
    cheques:    testCheques,
    reports:    testReports,
    ai:         testAI,
    suppliers:  testSuppliers,
    warehouses: testWarehouses,
    settings:   testSettings,
    security:   testSecurity,
    perf:       testPerformance,
  };

  const toRun = ONLY ? { [ONLY]: groups[ONLY] } : groups;

  if (ONLY && !groups[ONLY]) {
    console.error(`${C.red}Bilinmeyen grup: ${ONLY}${C.reset}`);
    console.error(`Seçenekler: ${Object.keys(groups).join(', ')}`);
    process.exit(1);
  }

  for (const [, fn] of Object.entries(toRun)) {
    try {
      await fn();
    } catch (e) {
      if (e.message === 'bail') break;
    }
  }

  /* ── Özet ── */
  const total = results.pass + results.fail;
  const color = results.fail === 0 ? C.green : C.red;

  console.log(`\n${C.bold}${color}══════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}  Sonuç: ${results.pass}/${total} başarılı`
    + (results.fail ? `  ${C.red}${results.fail} BAŞARISIZ${C.reset}` : `  ${C.green}TAMAM ✓${C.reset}`));
  console.log(`${C.bold}${color}══════════════════════════════════════════════${C.reset}\n`);

  if (results.fail > 0) {
    console.log(`${C.red}${C.bold}Başarısız testler:${C.reset}`);
    results.errors.forEach(({ name, err }) => {
      console.log(`  ${C.red}✗${C.reset} ${name}`);
      console.log(`    ${C.gray}${err}${C.reset}`);
    });
    console.log();
    process.exit(1);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(`${C.red}Test runner çöktü:${C.reset}`, err.message);
  process.exit(1);
});
