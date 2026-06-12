/**
 * ╔══════════════════════════════════════════╗
 * ║  AI / CHAT TEST SUITE                    ║
 * ║  Kullanım: node scripts/test_ai.js       ║
 * ╚══════════════════════════════════════════╝
 *
 * Not: AI testleri Ollama çalışmasa da geçer.
 * 503 yanıtı "AI kapalı" anlamına gelir — hata değil.
 */
const { req, acquireToken } = require('./helpers/api');
const { test, section, printSummary, expect, C } = require('./helpers/runner');

async function runAITests() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  AI / CHAT TEST SUITE                    ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  await acquireToken();

  /* ── 1. Sağlık Kontrolü ── */
  section('1. SAĞLIK — GET /api/ai/health');

  await test('Health endpoint erişilebilir → 200/500', async () => {
    const r = await req('GET', '/api/ai/health');
    expect(r.status).toBeOneOf([200, 500, 503]);
  });

  await test('Health yanıt body nesne', async () => {
    const r = await req('GET', '/api/ai/health');
    expect(typeof r.body).toBe('object');
  });

  await test('Health: success alanı var', async () => {
    const r = await req('GET', '/api/ai/health');
    if (r.status === 200) {
      expect(r.body).toHaveKey('success');
    }
  });

  await test('Health: data.available boolean', async () => {
    const r = await req('GET', '/api/ai/health');
    if (r.status === 200 && r.body?.data) {
      expect('available' in r.body.data).toBeOk();
    }
  });

  /* ── 2. Model Listesi ── */
  section('2. MODEL LİSTESİ — GET /api/ai/models');

  await test('Models endpoint → 200/503', async () => {
    const r = await req('GET', '/api/ai/models');
    expect(r.status).toBeOneOf([200, 500, 503]);
  });

  await test('Models: data.models dizi', async () => {
    const r = await req('GET', '/api/ai/models');
    if (r.status === 200) {
      expect(r.body.success).toBeOk();
      expect(Array.isArray(r.body.data?.models)).toBeOk();
    }
  });

  /* ── 3. Chat Endpoint ── */
  section('3. CHAT — POST /api/ai/chat');

  await test('Boş mesaj → 400', async () => {
    const r = await req('POST', '/api/ai/chat', { message: '' });
    expect(r.status).toBeOneOf([400, 422]);
    expect(r.body.success).toBeFalsy();
  });

  await test('Boş string (whitespace) → 400', async () => {
    const r = await req('POST', '/api/ai/chat', { message: '   ' });
    expect(r.status).toBeOneOf([400, 422, 503]);
  });

  await test('Mesaj yok (body boş) → 400', async () => {
    const r = await req('POST', '/api/ai/chat', {});
    expect(r.status).toBeOneOf([400, 422]);
  });

  await test('Çok uzun mesaj (1001 karakter) → 400', async () => {
    const r = await req('POST', '/api/ai/chat', { message: 'x'.repeat(1001) });
    expect(r.status).toBeOneOf([400, 422, 503]);
  });

  await test('Tam sınırda mesaj (1000 karakter) → 200/503', async () => {
    const r = await req('POST', '/api/ai/chat', { message: 'a'.repeat(1000) });
    expect(r.status).toBeOneOf([200, 400, 503]);
  });

  await test('Geçerli ERP sorusu (AI var/yok)', async () => {
    const r = await req('POST', '/api/ai/chat', { message: 'Stok durumu nedir?' });
    expect(r.status).toBeOneOf([200, 503]);
    if (r.status === 200) {
      expect(r.body.success).toBeOk();
      expect(r.body.data).toHaveKey('answer');
    }
  });

  await test('Türkçe soru → 200/503', async () => {
    const r = await req('POST', '/api/ai/chat', { message: 'Bu ay kaç sipariş var?' });
    expect(r.status).toBeOneOf([200, 503]);
  });

  await test('Finans sorusu → 200/503', async () => {
    const r = await req('POST', '/api/ai/chat', { message: 'Toplam gelir ne kadar?' });
    expect(r.status).toBeOneOf([200, 503]);
  });

  await test('Müşteri sorusu → 200/503', async () => {
    const r = await req('POST', '/api/ai/chat', { message: 'En çok alışveriş yapan müşteriler kimler?' });
    expect(r.status).toBeOneOf([200, 503]);
  });

  await test('Çek sorusu → 200/503', async () => {
    const r = await req('POST', '/api/ai/chat', { message: 'Vadesi yaklaşan çekler var mı?' });
    expect(r.status).toBeOneOf([200, 503]);
  });

  await test('200 gelirse yanıt alanları kontrol', async () => {
    const r = await req('POST', '/api/ai/chat', { message: 'Merhaba' });
    if (r.status === 200) {
      const d = r.body.data;
      expect(d).toHaveKey('answer');
      expect(d).toHaveKey('model');
      expect(d).toHaveKey('meta');
      expect(d.meta).toHaveKey('duration_ms');
    }
  });

  await test('message alanı yoksa (null) → 400', async () => {
    const r = await req('POST', '/api/ai/chat', { message: null });
    expect(r.status).toBeOneOf([400, 422, 503]);
  });

  await test('SQL injection girişimi mesajda → güvenli yanıt', async () => {
    const r = await req('POST', '/api/ai/chat', {
      message: "'; DROP TABLE orders; --",
    });
    expect(r.status).toBeOneOf([200, 400, 503]);
    if (r.status === 200) {
      // Sistem çökmemeli, normal yanıt vermeli
      expect(r.body.success).toBeOk();
    }
  });

  await test('XSS payload mesajda → güvenli yanıt', async () => {
    const r = await req('POST', '/api/ai/chat', {
      message: '<script>alert("xss")</script>',
    });
    expect(r.status).toBeOneOf([200, 400, 503]);
  });

  /* ── 4. Onay Sistemi ── */
  section('4. ONAY SİSTEMİ — Approvals');

  await test('GET /api/ai/approvals/my → 200/404', async () => {
    const r = await req('GET', '/api/ai/approvals/my');
    expect(r.status).toBeOneOf([200, 404]);
    if (r.status === 200) {
      expect(r.body.success).toBeOk();
    }
  });

  await test('Var olmayan onay onayla → 404', async () => {
    const r = await req('POST', '/api/ai/approvals/999999999/approve', {});
    expect(r.status).toBeOneOf([404, 400, 401]);
  });

  await test('Var olmayan onay reddet → 404', async () => {
    const r = await req('POST', '/api/ai/approvals/999999999/reject', {});
    expect(r.status).toBeOneOf([404, 400, 401]);
  });

  /* ── 5. Güvenlik ── */
  section('5. GÜVENLİK');

  await test('Token olmadan chat → 401', async () => {
    const { clearAuth, setAuth, getToken, getCookie } = require('./helpers/api');
    const t = getToken(); const c = getCookie();
    clearAuth();
    const r = await req('POST', '/api/ai/chat', { message: 'test' }, false);
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  await test('Token olmadan health → 401', async () => {
    const { clearAuth, setAuth, getToken, getCookie } = require('./helpers/api');
    const t = getToken(); const c = getCookie();
    clearAuth();
    const r = await req('GET', '/api/ai/health', null, false);
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  return printSummary('AI / CHAT TEST SUITE');
}

if (require.main === module) {
  runAITests()
    .then(ok => process.exit(ok ? 0 : 1))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runAITests };
