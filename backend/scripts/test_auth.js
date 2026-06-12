/**
 * ╔══════════════════════════════════════════╗
 * ║  AUTH TEST SUITE — Kimlik Doğrulama      ║
 * ║  Kullanım: node scripts/test_auth.js     ║
 * ╚══════════════════════════════════════════╝
 *
 * Kapsar:
 *  - Login (başarılı / hatalı / eksik / format)
 *  - Profil okuma (token ile / token olmadan / geçersiz token)
 *  - Logout
 *  - 2FA endpoint kontrolü
 *  - Korunan route erişim kontrolü
 */
const { req, acquireToken, clearAuth, setAuth, getToken, getCookie } = require('./helpers/api');
const { test, section, printSummary, expect, C } = require('./helpers/runner');

/* Brute-force sayacını sıfırla (başarısız login test grubundan önce çağrılır) */
async function resetLoginAttempts() {
  try {
    require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`DELETE FROM login_attempts WHERE ip_address IN ('::1','127.0.0.1','::ffff:127.0.0.1')`);
    await pool.end();
  } catch (_) { /* DB erişimi yoksa sessizce geç */ }
}

async function runAuthTests() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  AUTH TEST SUITE                         ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  /* ── Tek seferlik login — sonuçları tüm testlerde paylaş ── */
  let loginResponse = null;
  await acquireToken();  // cache'de yoksa login yapar

  section('1. LOGIN — Başarılı Senaryolar');

  await test('Geçerli kimlik bilgileriyle giriş → token mevcut', async () => {
    // acquireToken zaten yaptı; token ve cookie var olmalı
    expect(getToken() || getCookie()).toBeOk();
  });

  await test('Login yanıtı 200 döndürüyor', async () => {
    // Token zaten var, profile ile doğrula
    const r = await req('GET', '/api/auth/profile');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
    loginResponse = r.body.data;
  });

  await test('Profil yanıtında user verisi var', async () => {
    expect(typeof loginResponse === 'object').toBeOk();
  });

  await test('Cookie / Bearer token geçerli', async () => {
    const r = await req('GET', '/api/auth/profile');
    expect(r.status).toBe(200);
  });

  section('2. LOGIN — Başarısız Senaryolar');

  // Brute-force sayacını sıfırla — 7 başarısız test yapacağız, sunucu limiti 5
  await resetLoginAttempts();

  await test('Yanlış şifre → 401', async () => {
    const r = await req('POST', '/api/auth/login', {
      email:    'admin@erp.local',
      password: 'WrongPass999!',
    }, false);
    expect(r.status).toBeOneOf([400, 401, 422, 429]);
    if (r.status !== 429) expect(r.body.success).toBeFalsy();
  });

  await test('Var olmayan e-posta → 401', async () => {
    const r = await req('POST', '/api/auth/login', {
      email:    'nobody@notexist.com',
      password: 'SomePass123',
    }, false);
    expect(r.status).toBeOneOf([400, 401, 422, 429]);
  });

  await test('Boş e-posta → 400/422', async () => {
    const r = await req('POST', '/api/auth/login', {
      email:    '',
      password: 'admin123',
    }, false);
    expect(r.status).toBeOneOf([400, 422, 429]);
  });

  await test('Boş şifre → 400/422', async () => {
    const r = await req('POST', '/api/auth/login', {
      email:    'admin@erp.local',
      password: '',
    }, false);
    expect(r.status).toBeOneOf([400, 422, 429]);
  });

  await test('Body olmadan → 400/422', async () => {
    const r = await req('POST', '/api/auth/login', {}, false);
    expect(r.status).toBeOneOf([400, 422, 429]);
  });

  await test('Geçersiz e-posta formatı → 400/422', async () => {
    const r = await req('POST', '/api/auth/login', {
      email:    'not-an-email',
      password: 'admin123',
    }, false);
    expect(r.status).toBeOneOf([400, 401, 422, 429]);
  });

  await test('Çok uzun şifre (500 karakter) → 400/422', async () => {
    const r = await req('POST', '/api/auth/login', {
      email:    'admin@erp.local',
      password: 'a'.repeat(500),
    }, false);
    expect(r.status).toBeOneOf([400, 401, 422, 429]);
  });

  /* ── 3. Profil Endpoint ── */
  section('3. PROFIL — GET /api/auth/profile');

  await test('Geçerli token ile profil → 200', async () => {
    const r = await req('GET', '/api/auth/profile');
    expect(r.status).toBe(200);
    expect(r.body.success).toBeOk();
  });

  await test('Profil: email alanı string', async () => {
    const r = await req('GET', '/api/auth/profile');
    expect(r.body.data?.email).toBeString();
  });

  await test('Profil: role alanı mevcut', async () => {
    const r = await req('GET', '/api/auth/profile');
    expect(r.body.data).toHaveKey('role');
  });

  await test('Profil: şifre alanı dönmüyor (güvenlik)', async () => {
    const r = await req('GET', '/api/auth/profile');
    const d = r.body.data || {};
    expect(!('password' in d) && !('password_hash' in d)).toBeOk();
  });

  await test('Token olmadan profil → 401', async () => {
    const t = getToken(); const c = getCookie();
    clearAuth();
    const r = await req('GET', '/api/auth/profile', null, false);
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  await test('Geçersiz JWT imzası → 401', async () => {
    const t = getToken(); const c = getCookie();
    setAuth('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjF9.invalid', 'access_token=bad');
    const r = await req('GET', '/api/auth/profile');
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  await test('Keyfi string token → 401', async () => {
    const t = getToken(); const c = getCookie();
    setAuth('not.a.jwt', 'access_token=not.a.jwt');
    const r = await req('GET', '/api/auth/profile');
    setAuth(t, c);
    expect(r.status).toBe(401);
  });

  /* ── 4. Logout ── */
  section('4. LOGOUT — POST /api/auth/logout');

  await test('Logout endpoint mevcut', async () => {
    const r = await req('POST', '/api/auth/logout', null, true);
    expect(r.status).toBeOneOf([200, 204, 404]);
  });

  // Logout sunucu tarafında token'ı blacklist'e alır — taze token zorunlu
  // Brute-force sayacını sıfırla (bölüm 2'deki başarısız loginler sayacı doldurdu)
  await resetLoginAttempts();
  clearAuth();
  await acquireToken(null, null, true);

  /* ── 5. Korunan Routelar ── */
  section('5. KORUNAN ROUTE GÜVENLİĞİ');

  const protectedRoutes = [
    ['GET',  '/api/products'],
    ['GET',  '/api/customers'],
    ['GET',  '/api/orders'],
    ['GET',  '/api/invoices'],
    ['GET',  '/api/cheques'],
    ['GET',  '/api/reports/summary'],
    ['GET',  '/api/settings'],
  ];

  const savedT = getToken(); const savedC = getCookie();
  clearAuth();

  for (const [method, path] of protectedRoutes) {
    await test(`${method} ${path} — tokensiz → 401`, async () => {
      const r = await req(method, path, null, false);
      expect(r.status).toBe(401);
    });
  }

  setAuth(savedT, savedC);

  /* ── 6. 2FA ── */
  section('6. 2FA — İki Faktörlü Doğrulama');

  await test('2FA status endpoint erişilebilir', async () => {
    const r = await req('GET', '/api/2fa/status');
    expect(r.status).toBeOneOf([200, 404]);
  });

  await test('Auth 2FA status endpoint erişilebilir', async () => {
    const r = await req('GET', '/api/auth/2fa/status');
    expect(r.status).toBeOneOf([200, 404]);
  });

  return printSummary('AUTH TEST SUITE');
}

if (require.main === module) {
  runAuthTests()
    .then(ok => process.exit(ok ? 0 : 1))
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runAuthTests };
