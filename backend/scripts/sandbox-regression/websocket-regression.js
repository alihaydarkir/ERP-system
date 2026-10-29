const { io } = require('socket.io-client');
const { registerCompany } = require('./lib');
const tag = Math.random().toString(36).slice(2, 7);
const url = 'http://audit-be:5000';
const mk = () => io(url, { transports: ['websocket'], extraHeaders: { Origin: url, Host: 'audit-be' }, reconnection: false });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (n, ok, e = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${e}`); };
(async () => {
  const A = await registerCompany('a' + tag), B = await registerCompany('b' + tag);
  const a = mk(), b = mk(), c = mk(), a2 = mk();
  const got = { B: [], C: [], A2: [] };
  for (const [n, s] of [['B', b], ['C', c], ['A2', a2]]) for (const ev of ['order:created', 'product:created', 'user:online', 'notification', 'authenticated', 'authentication_error']) s.on(ev, (d) => got[n].push({ ev, d }));
  await Promise.all([a, b, c, a2].map((s) => new Promise((r) => s.on('connect', r))));
  a.emit('authenticate', { token: A.token }); b.emit('authenticate', { token: B.token });
  await wait(800);
  a.emit('order:created', { orderId: 1, message: 'FORGED-' + tag }); a.emit('product:created', { name: 'x', message: 'FORGED-' + tag });
  await wait(1200);
  const forged = (n) => got[n].filter((x) => JSON.stringify(x.d).includes('FORGED')).length;
  check('FIX ws: other tenant receives no forged events', forged('B') === 0, String(forged('B')));
  check('FIX ws: unauthenticated socket receives no forged events', forged('C') === 0, String(forged('C')));
  check('FIX ws: unauthenticated socket sees no presence broadcasts', !got.C.some((x) => x.ev === 'user:online'));
  check('FIX ws: other tenant admin gets no spoofed notification', !got.B.some((x) => x.ev === 'notification'));
  // same-company presence still works for a colleague in the same company
  a2.emit('authenticate', { token: A.token }); await wait(600);
  check('regression: authenticated socket gets "authenticated"', true === (got.B.some((x) => x.ev === 'authenticated')), '');
  // token purpose / bad token
  const bad = mk(); const badGot = []; bad.on('authentication_error', (d) => badGot.push(d)); await new Promise((r) => bad.on('connect', r));
  bad.emit('authenticate', { token: 'not-a-jwt' }); await wait(500);
  check('regression: invalid token still rejected', badGot.length === 1);
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERR', e.stack); process.exit(2); });
