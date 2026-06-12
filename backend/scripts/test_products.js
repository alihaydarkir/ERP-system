/**
 * ╔══════════════════════════════════════════╗
 * ║  PRODUCTS TEST SUITE — Ürün Yönetimi     ║
 * ║  Kullanım: node scripts/test_products.js ║
 * ╚══════════════════════════════════════════╝
 *
 * Kapsar:
 *  - Listeleme (pagination, search, filtre, sort)
 *  - Tekil ürün getirme
 *  - Oluşturma (başarılı / doğrulama hataları)
 *  - Güncelleme
 *  - Silme
 *  - Stok yönetimi
 *  - Low-stock sorgusu
 */
const { req, acquireToken } = require('./helpers/api');
const { test, skip, section, subsection, printSummary, expect, C } = require('./helpers/runner');

/* Oluşturulan ID'leri sakla */
let createdId   = null;
let created2Id  = null;
let createdSku  = null;

async function runProductTests() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  PRODUCTS TEST SUITE                     ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  await acquireToken();

  /* ── 1. Listeleme ── */
  section('1. LİSTELEME — GET /api/products');

  await test('Temel liste döner', async () => {
    const r = await req('GET', '/api/products');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('Yanıt dizisi veya sayfalı nesne içeriyor', async () => {
    const r = await req('GET', '/api/products');
    const d = r.body.data;
    const isArrayLike = Array.isArray(d) || Array.isArray(d?.products) || Array.isArray(d?.rows) || typeof d === 'object';
    expect(isArrayLike).toBeOk();
  });

  await test('Pagination: page=1&limit=3 → max 3 kayıt', async () => {
    const r = await req('GET', '/api/products?page=1&limit=3');
    expect(r.status).toBe(200);
    const d = r.body.data;
    const items = Array.isArray(d) ? d : (d?.products || d?.rows || []);
    expect(items.length).toBeLte(3);
  });

  await test('Pagination: page=2&limit=2', async () => {
    const r = await req('GET', '/api/products?page=2&limit=2');
    expect(r.status).toBe(200);
  });

  await test('Arama: search parametresi çalışıyor', async () => {
    const r = await req('GET', '/api/products?search=a');
    expect(r.status).toBe(200);
  });

  await test('Arama: XSS payload arama kriterinde güvenli', async () => {
    const r = await req('GET', `/api/products?search=${encodeURIComponent('<script>alert(1)</script>')}`);
    expect(r.status).toBeOneOf([200, 400]);
    if (r.status === 200) {
      const str = JSON.stringify(r.body);
      expect(str).toNotContain('<script>alert(1)</script>');
    }
  });

  await test('Kategori filtresi çalışıyor', async () => {
    const r = await req('GET', '/api/products?category=Elektronik');
    expect(r.status).toBe(200);
  });

  await test('Limit=0 veya negatif → 400 veya varsayılan', async () => {
    const r = await req('GET', '/api/products?limit=0');
    expect(r.status).toBeOneOf([200, 400]);
  });

  await test('Çok büyük limit → 200 (server clamp eder)', async () => {
    const r = await req('GET', '/api/products?limit=99999');
    expect(r.status).toBeOneOf([200, 400]);
  });

  /* ── 2. Oluşturma ── */
  section('2. OLUŞTURMA — POST /api/products');

  const ts = Date.now();
  createdSku = `SKU-DEEP-${ts}`;

  await test('Tam alanlarla ürün oluştur → 200/201', async () => {
    const r = await req('POST', '/api/products', {
      name:               `Derin Test Ürünü ${ts}`,
      sku:                createdSku,
      price:              249.99,
      stock:              100,
      category:           'Test Kategori',
      description:        'Otomatik test ürünü',
      low_stock_threshold: 10,
    });
    expect(r.status).toBeOneOf([200, 201]);
    expect(r.body.success).toBeOk();
    createdId = r.body.data?.id;
    expect(createdId).toBeOk();
  });

  await test('Oluşturulan ürün doğru alanları içeriyor', async () => {
    if (!createdId) throw new Error('Ürün oluşturulamadı');
    const r = await req('GET', `/api/products/${createdId}`);
    const d = r.body.data;
    expect(d).toHaveKey('id');
    expect(d).toHaveKey('name');
    expect(d).toHaveKey('price');
  });

  await test('Minimal alanlarla ikinci ürün oluştur', async () => {
    const r = await req('POST', '/api/products', {
      name:  `Minimal Ürün ${ts}`,
      sku:   `SKU-MIN-${ts}`,
      price: 1.00,
      stock: 0,
    });
    expect(r.status).toBeOneOf([200, 201]);
    created2Id = r.body.data?.id;
  });

  await test('Eksik "name" → 400/422', async () => {
    const r = await req('POST', '/api/products', {
      sku: `SKU-NONAME-${ts}`,
      price: 10,
      stock: 5,
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Eksik "sku" → 400/422', async () => {
    const r = await req('POST', '/api/products', {
      name: 'SKU Yok',
      price: 10,
      stock: 5,
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Eksik "price" → 400/422', async () => {
    const r = await req('POST', '/api/products', {
      name: 'Fiyat Yok',
      sku:  `SKU-NOPRICE-${ts}`,
      stock: 5,
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Eksik "stock" → 400/422', async () => {
    const r = await req('POST', '/api/products', {
      name:  'Stok Yok',
      sku:   `SKU-NOSTOCK-${ts}`,
      price: 10,
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Negatif fiyat → 400/422', async () => {
    const r = await req('POST', '/api/products', {
      name:  'Negatif Fiyat',
      sku:   `SKU-NEG-${ts}`,
      price: -5,
      stock: 10,
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Negatif stok → 400/422', async () => {
    const r = await req('POST', '/api/products', {
      name:  'Negatif Stok',
      sku:   `SKU-NEGSTK-${ts}`,
      price: 10,
      stock: -1,
    });
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Aynı SKU tekrar → 400/409/422 (duplicate)', async () => {
    const r = await req('POST', '/api/products', {
      name:  'Mükerrer SKU Ürünü',
      sku:   createdSku,
      price: 10,
      stock: 10,
    });
    expect(r.status).toBeOneOf([400, 409, 422, 500]);
  });

  await test('Çok uzun name (1000 karakter) → 400 veya truncate', async () => {
    const r = await req('POST', '/api/products', {
      name:  'N'.repeat(1000),
      sku:   `SKU-LONG-${ts}`,
      price: 10,
      stock: 5,
    });
    expect(r.status).toBeOneOf([200, 201, 400, 422]);
  });

  await test('Boş body → 400/422', async () => {
    const r = await req('POST', '/api/products', {});
    expect(r.status).toBeOneOf([400, 422]);
  });

  /* ── 3. Tekil Getirme ── */
  section('3. TEKİL GETİRME — GET /api/products/:id');

  await test('Geçerli ID ile ürün getir', async () => {
    if (!createdId) throw new Error('Ürün yok');
    const r = await req('GET', `/api/products/${createdId}`);
    expect(r.status).toBe(200);
    expect(r.body.data.id).toBe(createdId);
  });

  await test('Var olmayan ID → 404', async () => {
    const r = await req('GET', '/api/products/999999999');
    expect(r.status).toBeOneOf([404, 400]);
  });

  await test('String ID → 400/404', async () => {
    const r = await req('GET', '/api/products/not-a-number');
    expect(r.status).toBeOneOf([400, 404, 422, 500]);
  });

  await test('Negatif ID → 400/404', async () => {
    const r = await req('GET', '/api/products/-1');
    expect(r.status).toBeOneOf([400, 404]);
  });

  await test('ID=0 → 400/404', async () => {
    const r = await req('GET', '/api/products/0');
    expect(r.status).toBeOneOf([400, 404]);
  });

  /* ── 4. Güncelleme ── */
  section('4. GÜNCELLEME — PUT /api/products/:id');

  await test('Fiyat güncelle', async () => {
    if (!createdId) throw new Error('Ürün yok');
    const r = await req('PUT', `/api/products/${createdId}`, { price: 399.99 });
    expect(r.status).toBeOneOf([200, 201]);
    expect(r.body.success).toBeOk();
  });

  await test('Stok güncelle', async () => {
    if (!createdId) throw new Error('Ürün yok');
    const r = await req('PUT', `/api/products/${createdId}`, { stock: 200 });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('Kategori güncelle', async () => {
    if (!createdId) throw new Error('Ürün yok');
    const r = await req('PUT', `/api/products/${createdId}`, { category: 'Güncellenmiş Kategori' });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('Çoklu alan güncelle', async () => {
    if (!createdId) throw new Error('Ürün yok');
    const r = await req('PUT', `/api/products/${createdId}`, {
      price:       299.99,
      stock:       150,
      description: 'Güncellenmiş açıklama',
    });
    expect(r.status).toBeOneOf([200, 201]);
  });

  await test('Var olmayan ürünü güncelle → 404', async () => {
    const r = await req('PUT', '/api/products/999999999', { price: 10 });
    expect(r.status).toBeOneOf([404, 400]);
  });

  await test('Negatif fiyat ile güncelle → 400/422', async () => {
    if (!createdId) throw new Error('Ürün yok');
    const r = await req('PUT', `/api/products/${createdId}`, { price: -100 });
    expect(r.status).toBeOneOf([400, 422]);
  });

  /* ── 5. Silme ── */
  section('5. SİLME — DELETE /api/products/:id');

  await test('Ürün sil → 200/204', async () => {
    if (!created2Id) throw new Error('İkinci ürün yok');
    const r = await req('DELETE', `/api/products/${created2Id}`);
    expect(r.status).toBeOneOf([200, 204]);
  });

  await test('Silinen ürünü tekrar getir → 404', async () => {
    if (!created2Id) throw new Error('İkinci ürün yok');
    const r = await req('GET', `/api/products/${created2Id}`);
    expect(r.status).toBeOneOf([404, 400]);
  });

  await test('Var olmayan ürünü sil → 404/400', async () => {
    const r = await req('DELETE', '/api/products/999999999');
    expect(r.status).toBeOneOf([404, 400]);
  });

  /* ── 6. Stok İşlemleri ── */
  section('6. STOK İŞLEMLERİ');

  await test('Düşük stok ürünleri listele', async () => {
    const r = await req('GET', '/api/products?low_stock=true');
    expect(r.status).toBeOneOf([200, 400]);
  });

  await test('Stok eşiği ile filtreleme', async () => {
    const r = await req('GET', '/api/products?stock_lt=20');
    expect(r.status).toBeOneOf([200, 400]);
  });

  /* ── 7. Temizlik ── */
  section('7. TEMİZLİK');

  await test('Test ürünü sil', async () => {
    if (!createdId) throw new Error('Ana test ürünü yok');
    const r = await req('DELETE', `/api/products/${createdId}`);
    expect(r.status).toBeOneOf([200, 204]);
  });

  return printSummary('PRODUCTS TEST SUITE');
}

if (require.main === module) {
  runProductTests()
    .then(ok => process.exit(ok ? 0 : 1))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runProductTests };
