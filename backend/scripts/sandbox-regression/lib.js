const http = require('http');
const HOST = process.env.TARGET_HOST || 'audit-be';
const PORT = Number(process.env.TARGET_PORT || 5000);
function req(method, path, { token, body, headers = {}, rawBody, contentType } = {}) {
  return new Promise((resolve, reject) => {
    const data = rawBody !== undefined ? rawBody : (body !== undefined ? JSON.stringify(body) : undefined);
    const h = { Host: HOST, Origin: `http://${HOST}:${PORT}`, ...headers };
    if (token) h.Authorization = `Bearer ${token}`;
    if (data !== undefined) { h['Content-Type'] = contentType || 'application/json'; h['Content-Length'] = Buffer.byteLength(data); }
    const r = http.request({ host: HOST, port: PORT, method, path, headers: h }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null; try { json = JSON.parse(text); } catch (e) { /* JSON olmayan yanıt */ }
        resolve({ status: res.statusCode, json, text, headers: res.headers });
      });
    });
    r.on('error', reject);
    r.setTimeout(20000, () => r.destroy(new Error('timeout')));
    if (data !== undefined) r.write(data);
    r.end();
  });
}
const short = (r) => `${r.status} ${JSON.stringify(r.json || r.text).slice(0, 300)}`;
const PW = 'Aud1t-Dummy!Pass-2026';
function cookieVal(r, name){ const sc=r.headers["set-cookie"]||[]; for(const c of sc){ const m=c.match(new RegExp("^"+name+"=([^;]*)")); if(m) return decodeURIComponent(m[1]); } return null; }
async function registerCompany(tag) {
  const email = `admin.${tag}@audit.test`;
  const reg = await req('POST', '/api/auth/register', { body: { username: `admin_${tag}`, email, password: PW, companyAction: 'create', companyName: `Audit Co ${tag}`, companyCode: `AUD${tag.toUpperCase()}` } });
  const login = await req('POST', '/api/auth/login', { body: { email, password: PW } });
  const token = cookieVal(login, 'access_token');
  return { reg, login, token, email };
}
module.exports = { cookieVal, req, short, PW, registerCompany, HOST, PORT };
