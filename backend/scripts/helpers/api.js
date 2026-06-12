/**
 * Paylaşılan HTTP istek yardımcısı
 * Tüm test dosyaları bu modülü kullanır
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const http  = require('http');
const https = require('https');
const url   = require('url');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

let _token  = null;
let _cookie = null;

function setAuth(token, cookie) { _token = token; _cookie = cookie; }
function clearAuth() { _token = null; _cookie = null; }
function getToken()  { return _token; }
function getCookie() { return _cookie; }

/**
 * HTTP isteği gönder
 * @param {string} method  GET | POST | PUT | PATCH | DELETE
 * @param {string} path    /api/...
 * @param {object} body    JSON body (optional)
 * @param {boolean} auth   Authorization header eklensin mi
 * @param {object} extra   Ekstra header'lar
 */
function req(method, path, body = null, auth = true, extra = {}) {
  return new Promise((resolve) => {
    const parsed  = url.parse(BASE_URL + path);
    const isHttps = parsed.protocol === 'https:';
    const lib     = isHttps ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const headers = {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      'Origin':       'http://localhost:5173',
      'Referer':      'http://localhost:5173/',
      ...extra,
    };

    // undefined header değerlerini temizle (Node.js http modülü bunları reddeder)
    for (const k of Object.keys(headers)) {
      if (headers[k] === undefined) delete headers[k];
    }

    if (auth && _token)  headers['Authorization'] = `Bearer ${_token}`;
    if (auth && _cookie) headers['Cookie']        = _cookie;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     parsed.path,
      method,
      headers,
      timeout: 20000,
    };

    const request = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        // Cookie yönetimi
        const setCookies = res.headers['set-cookie'];
        if (setCookies) {
          const pairs = setCookies.map(c => c.split(';')[0]).join('; ');
          _cookie = pairs;
          const m = pairs.match(/access_token=([^;]+)/);
          if (m) _token = m[1];
        }
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({ status: 0, body: { message: 'TIMEOUT' }, headers: {} });
    });
    request.on('error', (e) => {
      resolve({ status: 0, body: { message: e.message }, headers: {} });
    });

    if (payload) request.write(payload);
    request.end();
  });
}

/**
 * Login yaparak token al.
 * Token zaten mevcutsa yeniden login yapmaz (rate limit koruması).
 * force=true ile her zaman yeni login yapar.
 */
async function acquireToken(email, password, force = false) {
  // Zaten token varsa yeniden login yapma
  if (!force && (_token || _cookie)) {
    return { token: _token, cookie: _cookie };
  }

  const e = email    || process.env.TEST_EMAIL    || 'admin@erp.local';
  const p = password || process.env.TEST_PASSWORD || 'admin123';

  // 429 durumunda 3 kez dene (2s, 4s, 8s bekleme)
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await req('POST', '/api/auth/login', { email: e, password: p }, false);
    if (r.status === 0) throw new Error(`Sunucuya bağlanılamadı: ${BASE_URL}`);
    if (r.status === 429) {
      if (attempt === 3) throw new Error('Rate limit — lütfen 15 dakika bekleyin veya sunucuyu yeniden başlatın');
      const delay = attempt * 2000;
      process.stdout.write(`\n  Rate limit (429) — ${delay / 1000}s bekleniyor...`);
      await new Promise(res => setTimeout(res, delay));
      continue;
    }
    if (_token || _cookie) return { token: _token, cookie: _cookie };
    throw new Error(`Login başarısız (HTTP ${r.status}): ${JSON.stringify(r.body)}`);
  }
}

module.exports = { req, acquireToken, setAuth, clearAuth, getToken, getCookie, BASE_URL };
