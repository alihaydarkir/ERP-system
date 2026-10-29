const net = require('net'), os = require('os');
const { Pool } = require('pg');
const ExcelJS = require('exceljs');
const { req, PW, registerCompany, cookieVal } = require('./lib');
const tag = Math.random().toString(36).slice(2, 7);
const rnd = () => String(Math.floor(1e9 + Math.random() * 9e9));
const db = new Pool({ connectionString: 'postgresql://postgres:auditpw@pg:5432/erp_audit' });
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`); };
const login = async (email, password = PW) => { const r = await req('POST', '/api/auth/login', { body: { email, password } }); return { r, token: cookieVal(r, 'access_token') }; };
(async () => {
  const A = await registerCompany('a' + tag), B = await registerCompany('b' + tag);
  const mkUser = async (X, name, role) => { await req('POST', '/api/user-management', { token: X.token, body: { username: `${name}_${tag}`, email: `${name}.${tag}@audit.test`, password: PW, role } }); return (await login(`${name}.${tag}@audit.test`)).token; };

  // ---- B resources (own tenant) ----
  const bCust = await req('POST', '/api/customers', { token: B.token, body: { company_name: 'B-SECRET ' + tag, full_name: 'B Contact', phone_number: '05551112233', email: `bc.${tag}@x.test`, tax_number: rnd(), tax_office: 'BVD', address: 'b', city: 'b', customer_type: 'corporate' } });
  const bProd = await req('POST', '/api/products', { token: B.token, body: { name: 'B-Gizli-' + tag, sku: 'BSKU-' + tag, price: 10, stock: 5, category: 'BKat' + tag } });
  const bTax = rnd();
  const bSup = await req('POST', '/api/suppliers', { token: B.token, body: { supplier_name: 'B-Sup-' + tag, contact_person: 'x', phone: '05559998877', email: `bs.${tag}@x.test`, tax_number: bTax, address: 'x' } });
  const bCid = bCust.json?.data?.id, bPid = bProd.json?.data?.id, bSid = bSup.json?.data?.id;
  check('setup: B customer/product/supplier created', !!(bCid && bPid && bSid), `${bCid}/${bPid}/${bSid}`);
  const bWh = await req('POST', '/api/warehouses', { token: B.token, body: { warehouse_code: 'WH-' + tag, warehouse_name: 'B W', location: 'x', city: 'x', is_active: true } });

  // ---- own-tenant happy paths still work ----
  const aCust = await req('POST', '/api/customers', { token: A.token, body: { company_name: 'A-Mus ' + tag, full_name: 'A Cont', phone_number: '05550001122', email: `ac.${tag}@x.test`, tax_number: rnd(), tax_office: 'AVD', address: 'a', city: 'a', customer_type: 'corporate' } });
  const aProd = await req('POST', '/api/products', { token: A.token, body: { name: 'A-Urun-' + tag, sku: 'ASKU-' + tag, price: 10, stock: 1, category: 'AKat' } });
  const aCid = aCust.json?.data?.id, aPid = aProd.json?.data?.id;
  const ownInv = await req('POST', '/api/invoices', { token: A.token, body: { customer_id: aCid, due_date: '2026-12-31', items: [{ product_id: aPid, description: 'x', quantity: 1, unit_price: 1, total_price: 1 }] } });
  check('regression: own-tenant invoice still created (201)', ownInv.status === 201, String(ownInv.status));
  const ownChq = await req('POST', '/api/cheques', { token: A.token, body: { customer_id: aCid, check_serial_no: 'OWN' + tag, check_issuer: 'x', bank_name: 'Test Bank', received_date: '2026-10-01', amount: 100, due_date: '2026-12-31', status: 'pending' } });
  check('regression: own-tenant cheque still created (201)', ownChq.status === 201, `${ownChq.status} ${JSON.stringify(ownChq.json).slice(0, 80)}`);

  // 1 invoice cross-tenant
  const inv = await req('POST', '/api/invoices', { token: A.token, body: { customer_id: bCid, due_date: '2026-12-31', items: [{ product_id: bPid, description: 'x', quantity: 1, unit_price: 1, total_price: 1 }] } });
  check('FIX invoice: foreign customer_id rejected', inv.status === 404, String(inv.status));
  const inv2 = await req('POST', '/api/invoices', { token: A.token, body: { customer_id: aCid, due_date: '2026-12-31', items: [{ product_id: bPid, description: 'x', quantity: 1, unit_price: 1, total_price: 1 }] } });
  check('FIX invoice: foreign product_id rejected', inv2.status === 404, String(inv2.status));

  // 2 cheque cross-tenant (admin)
  const chq = await req('POST', '/api/cheques', { token: A.token, body: { customer_id: bCid, check_serial_no: 'CHK' + tag, check_issuer: 'x', bank_name: 'Test Bank', received_date: '2026-10-01', amount: 100, due_date: '2026-12-31', status: 'pending' } });
  check('FIX cheque: admin cannot attach foreign customer', chq.status === 404, `${chq.status}`);
  const ownId = ownChq.json?.data?.id || ownChq.json?.data?.cheque?.id;
  const upd = ownId ? await req('PUT', '/api/cheques/' + ownId, { token: A.token, body: { customer_id: bCid } }) : { status: 0 };
  check('FIX cheque: update to foreign customer rejected', upd.status === 404, `${upd.status}`);

  // 3 supplier join
  const sp = await req('POST', '/api/products', { token: A.token, body: { name: 'A-sup-' + tag, sku: 'ASUP-' + tag, price: 1, stock: 1, category: 'AKat', supplier_id: bSid } });
  check('FIX product: foreign supplier_id rejected', sp.status === 404, `${sp.status}`);

  // 4 reports gate
  await db.query(`insert into users (username,email,password_hash,role,company_id,approval_status,is_active) select $1,$2,password_hash,'customer',company_id,'approved',true from users where email=$3`, ['cust_' + tag, `cust.${tag}@audit.test`, A.email]);
  const ct = (await login(`cust.${tag}@audit.test`)).token;
  const rep = [];
  for (const p of ['/api/reports/summary', '/api/reports/dashboard', '/api/reports/inventory', '/api/reports/daily']) rep.push((await req('GET', p, { token: ct })).status);
  check('FIX reports: customer role denied on all report endpoints', rep.every((s) => s === 403), rep.join(','));
  const userTok = await mkUser(A, 'usr', 'user');
  const urep = (await req('GET', '/api/reports/summary', { token: userTok })).status;
  check('regression: role user still can read reports', urep === 200, String(urep));
  check('regression: admin still can read reports', (await req('GET', '/api/reports/dashboard', { token: A.token })).status === 200);

  // 5 import oracle + own import works
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('P');
  ws.addRow(['Ürün Adı', 'Kategori', 'Fiyat', 'Stok Miktarı', 'Açıklama', 'Düşük Stok Limiti']);
  ws.addRow(['B-Gizli-' + tag, 'BKat' + tag, 5, 1, 'x', 1]);
  const mp = (buf) => { const bd = '----r' + tag; return { rawBody: Buffer.concat([Buffer.from(`--${bd}\r\nContent-Disposition: form-data; name="file"; filename="p.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`), buf, Buffer.from(`\r\n--${bd}--\r\n`)]), contentType: `multipart/form-data; boundary=${bd}` }; };
  const iv = await req('POST', '/api/import/validate', { token: A.token, ...mp(Buffer.from(await wb.xlsx.writeBuffer())) });
  check('FIX import: no cross-tenant name existence signal', iv.status === 200 && !/zaten mevcut/.test(JSON.stringify(iv.json)), `${iv.status}`);
  const proc = await req('POST', '/api/import/process', { token: A.token, body: { validData: [{ rowIndex: 2, name: 'A-imp-' + tag, category: 'AKat', price: 3, stock: 2, description: 'x', low_stock_threshold: 1 }] } });
  const cid = (await db.query('select company_id from users where email=$1', [A.email])).rows[0].company_id;
  const imp = await db.query('select company_id from products where name=$1', ['A-imp-' + tag]);
  check('regression: own import inserts with caller company_id', imp.rows.length === 1 && imp.rows[0].company_id === cid, `${proc.status} rows=${imp.rows.length}`);
  const bad = await req('POST', '/api/import/process', { token: A.token, body: { validData: [{ rowIndex: 2, name: 'X', category: 'K', price: -5, stock: 1 }] } });
  check('FIX import: invalid client rows rejected per row', /Geçersiz satır|"success":false/.test(JSON.stringify(bad.json)) || bad.status >= 400, `${bad.status}`);

  // 6 unique keys per tenant
  const w2 = await req('POST', '/api/warehouses', { token: A.token, body: { warehouse_code: 'WH-' + tag, warehouse_name: 'A W', location: 'x', city: 'x', is_active: true } });
  check('FIX unique: same warehouse code allowed in another tenant', w2.status === 201 && bWh.status === 201, `${w2.status}`);
  const s2 = await req('POST', '/api/products', { token: A.token, body: { name: 'A-dupsku-' + tag, sku: 'BSKU-' + tag, price: 1, stock: 1, category: 'AKat' } });
  check('FIX unique: same SKU allowed in another tenant', s2.status === 201, `${s2.status}`);
  const t2 = await req('POST', '/api/suppliers', { token: A.token, body: { supplier_name: 'A-dupsup-' + tag, contact_person: 'x', phone: '05550000000', email: `at.${tag}@x.test`, tax_number: bTax, address: 'x' } });
  check('FIX unique: same supplier tax number allowed in another tenant', t2.status === 201, `${t2.status}`);
  const s3 = await req('POST', '/api/products', { token: A.token, body: { name: 'A-dupsku2-' + tag, sku: 'BSKU-' + tag, price: 1, stock: 1, category: 'AKat' } });
  check('regression: duplicate SKU inside the SAME tenant still rejected', s3.status >= 400, `${s3.status}`);

  // 7 profile password
  const uemail = `usr.${tag}@audit.test`; const NEWPW = 'Zz9!NewSecret-' + tag + '-Q';
  const p1 = await req('PUT', '/api/auth/profile', { token: userTok, body: { password: NEWPW } });
  check('FIX profile: password change without current password rejected', p1.status === 400, `${p1.status}`);
  const p2 = await req('PUT', '/api/auth/profile', { token: userTok, body: { password: NEWPW, currentPassword: PW } });
  check('regression: password change with correct current password works', p2.status === 200, `${p2.status}`);
  const logs = await req('GET', '/api/admin/audit-logs?limit=200', { token: A.token });
  check('FIX profile: plaintext password not in audit logs', !(logs.text || '').includes(NEWPW), '');
  check('regression: login with new password works', (await login(uemail, NEWPW)).r.status === 200);

  // 8 activity-log cleanup scoping
  const cnt = async (X) => (await req('GET', '/api/activity-logs?limit=500', { token: X.token })).json?.data?.length ?? -1;
  const bBefore = await cnt(B);
  const del = await req('DELETE', '/api/activity-logs/cleanup?days=0', { token: A.token });
  const bAfter = await cnt(B);
  check('FIX activity log: B rows survive A-admin cleanup(days=0)', bBefore > 0 && bAfter === bBefore, `before=${bBefore} after=${bAfter} status=${del.status}`);

  // 9 SMTP destination re-auth + TLS
  const adm2 = await mkUser(A, 'adm2', 'admin');
  const secret = 'Smtp-Dummy-Secret-' + tag;
  await req('PUT', '/api/settings/bulk', { token: A.token, body: { emailSmtpHost: 'smtp.invalid.test', emailSmtpPort: '2525', emailSmtpUsername: 'mailer@audit.test', emailSmtpPassword: secret, emailFromAddress: 'noreply@audit.test' } });
  const myip = Object.values(os.networkInterfaces()).flat().find((i) => i.family === 'IPv4' && !i.internal).address;
  const seen = [];
  const srv = net.createServer((s) => { s.write('220 fake\r\n'); s.on('data', (d) => { const t = d.toString(); seen.push(t.trim()); if (/^EHLO/i.test(t)) s.write('250-fake\r\n250 AUTH PLAIN LOGIN\r\n'); else if (/^AUTH PLAIN/i.test(t)) s.write('235 ok\r\n'); else s.write('250 ok\r\n'); }); s.on('error', () => {}); });
  await new Promise((r) => srv.listen(2525, '0.0.0.0', r));
  const mask = '••••••••';
  const h1 = await req('PUT', '/api/settings/emailSmtpHost', { token: adm2, body: { value: myip } });
  check('FIX smtp: host change via single-key PUT without password rejected', h1.status === 400, `${h1.status}`);
  const h2 = await req('PUT', '/api/settings/bulk', { token: adm2, body: { emailSmtpHost: myip, emailSmtpPassword: mask } });
  check('FIX smtp: host change with masked password rejected', h2.status === 400, `${h2.status}`);
  await req('POST', '/api/settings/test-email', { token: adm2, body: { to: 'x@audit.test' } });
  await new Promise((r) => setTimeout(r, 800));
  check('FIX smtp: attacker listener never saw AUTH', !seen.some((s) => /AUTH/i.test(s)), JSON.stringify(seen).slice(0, 80));
  // legit admin who knows the password can still move the host, but credentials are not sent in clear
  const h3 = await req('PUT', '/api/settings/bulk', { token: A.token, body: { emailSmtpHost: myip, emailSmtpPassword: secret } });
  check('regression: admin re-entering the password can change host', h3.status === 200, `${h3.status}`);
  const te = await req('POST', '/api/settings/test-email', { token: A.token, body: { to: 'x@audit.test' } });
  await new Promise((r) => setTimeout(r, 800));
  const leaked = seen.some((s) => /AUTH PLAIN/i.test(s));
  check('FIX smtp: credentials not sent over a plaintext (no STARTTLS) connection', !leaked && te.status >= 400, `status=${te.status} ${JSON.stringify(te.json).slice(0, 90)}`);
  srv.close();

  // 10 migration 053 deactivated demo customers
  const dm = await db.query(`select email,is_active from users where email in ('ahmet@yilmazinsaat.com','fatma@kayatekstil.com')`);
  check('FIX 042 demo accounts deactivated by migration 053', dm.rows.length > 0 && dm.rows.every((r) => r.is_active === false), JSON.stringify(dm.rows));

  // 11 trust proxy (run last: it intentionally exhausts a limiter bucket)
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await req('POST', '/api/auth/login', { headers: { 'X-Forwarded-For': '198.51.100.10' }, body: { email: `nobody${i}@audit.test`, password: 'Wrong-pass-1!' } })).status);
  const other = await req('POST', '/api/auth/login', { headers: { 'X-Forwarded-For': '203.0.113.77' }, body: { email: B.email, password: PW } });
  check('FIX trust proxy: attacker lockout does not block a different client IP', other.status === 200, `attacker=${statuses.join(',')} other=${other.status}`);
  await db.end();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERR', e.stack); process.exit(2); });
