const speakeasy = require('speakeasy');
const { Pool } = require('pg');
const { req, PW, registerCompany, cookieVal } = require('./lib');
const tag = Math.random().toString(36).slice(2, 7);
const db = new Pool({ connectionString: 'postgresql://postgres:auditpw@pg:5432/erp_audit' });
let pass = 0, fail = 0;
const check = (n, ok, e = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${e}`); };
const login = (email, password = PW) => req('POST', '/api/auth/login', { body: { email, password } });
let UID; const reset = () => db.query('update user_2fa set last_used_step = null, failed_attempts = 0, locked_until = null where user_id=$1', [UID]);
const code = (secret, offsetSteps = 0) => speakeasy.totp({ secret, encoding: 'base32', time: Date.now() / 1000 + offsetSteps * 30 });
(async () => {
  const A = await registerCompany('a' + tag);
  const email = A.email;
  const uid = (await db.query('select id from users where email=$1', [email])).rows[0].id; UID = uid;

  // --- eski/sahte uçlar ---
  const legacy = await req('POST', '/api/users/profile/2fa/enable', { token: A.token });
  check('legacy fake 2FA toggle is gone (410)', legacy.status === 410, String(legacy.status));

  // --- kurulum ---
  const st0 = await req('GET', '/api/2fa/status', { token: A.token });
  check('status before setup: not enabled', st0.status === 200 && !st0.json.data.is_enabled);
  const setup = await req('POST', '/api/2fa/setup', { token: A.token });
  check('setup returns secret + QR', setup.status === 200 && !!setup.json.secret && /^data:image/.test(setup.json.qrCode), String(setup.status));
  const secret = setup.json.secret;
  const row = (await db.query('select secret, is_enabled from user_2fa where user_id=$1', [uid])).rows[0];
  check('TOTP secret stored encrypted at rest', /^enc:v1:/.test(row.secret) && !row.secret.includes(secret));
  const badVerify = await req('POST', '/api/2fa/setup/verify', { token: A.token, body: { token: '000000' } });
  check('setup/verify with wrong code rejected', badVerify.status === 400, String(badVerify.status));
  const goodVerify = await req('POST', '/api/2fa/setup/verify', { token: A.token, body: { token: code(secret) } });
  check('setup/verify with right code enables 2FA + returns 10 backup codes', goodVerify.status === 200 && goodVerify.json.backupCodes?.length === 10, `${goodVerify.status}`);
  const backup = goodVerify.json.backupCodes || [];
  const bc = await db.query('select code, code_hash from user_2fa_backup_codes where user_id=$1', [uid]);
  check('backup codes stored as keyed hashes, not plaintext', bc.rows.length === 10 && bc.rows.every((r) => r.code === null && /^[0-9a-f]{64}$/.test(r.code_hash) && !backup.some((b) => r.code_hash.includes(b.replace('-', '').toLowerCase()))));
  const again = await req('POST', '/api/2fa/setup', { token: A.token });
  check('FIX: setup while already enabled -> 409 (secret NOT reset)', again.status === 409, String(again.status));
  const still = (await db.query('select secret, is_enabled from user_2fa where user_id=$1', [uid])).rows[0];
  check('FIX: stolen-session cannot reset secret/disable via setup', still.is_enabled === true && still.secret === row.secret);

  // --- giriş: ikinci adım ---
  const l1 = await login(email);
  const temp = l1.json?.data?.tempToken;
  check('login now requires 2FA (no cookies issued)', l1.status === 200 && l1.json.data.requiresTwoFa === true && !!temp && !cookieVal(l1, 'access_token'));
  const asBearer = await req('GET', '/api/auth/profile', { token: temp });
  check('FIX: tempToken is NOT usable as an access token', asBearer.status === 401, String(asBearer.status));
  const asBearer2 = await req('GET', '/api/2fa/status', { token: temp });
  check('FIX: tempToken cannot reach /api/2fa/* management', asBearer2.status === 401, String(asBearer2.status));
  const wrong = await req('POST', '/api/auth/2fa/verify', { body: { tempToken: temp, code: '000000' } });
  check('2fa/verify with wrong code -> 401', wrong.status === 401, String(wrong.status));
  const ok = await req('POST', '/api/auth/2fa/verify', { body: { tempToken: temp, code: code(secret, 1) } });
  const acc = cookieVal(ok, 'access_token'), ref = cookieVal(ok, 'refresh_token');
  check('2fa/verify with right TOTP completes login (cookies set)', ok.status === 200 && !!acc && !!ref, String(ok.status));
  const prof = await req('GET', '/api/auth/profile', { token: acc });
  check('issued access token works', prof.status === 200, String(prof.status));
  const refAsAccess = await req('GET', '/api/auth/profile', { token: ref });
  check('FIX: refresh token is NOT usable as an access token', refAsAccess.status === 401, String(refAsAccess.status));
  const accAsRefresh = await req('POST', '/api/auth/refresh', { headers: { Cookie: `refresh_token=${acc}` }, body: {} });
  check('FIX: access token is NOT usable as a refresh token', accAsRefresh.status === 401, String(accAsRefresh.status));

  // --- tekrar saldırısı ---
  const l2 = await login(email);
  const replay = await req('POST', '/api/auth/2fa/verify', { body: { tempToken: l2.json.data.tempToken, code: code(secret, 1) } });
  check('FIX: same TOTP step cannot be reused (replay) -> 401', replay.status === 401, String(replay.status));
  await reset(); // gerçek hayatta 30 sn sonra
  const next = await req('POST', '/api/auth/2fa/verify', { body: { tempToken: l2.json.data.tempToken, code: code(secret, 0) } });
  check('next time-step code accepted', next.status === 200, String(next.status));

  // --- yedek kod ---
  await reset();
  const l3 = await login(email);
  const bOk = await req('POST', '/api/auth/2fa/verify', { body: { tempToken: l3.json.data.tempToken, code: backup[0].toLowerCase() } });
  check('backup code logs in (case/dash tolerant)', bOk.status === 200, String(bOk.status));
  const l4 = await login(email);
  const bReuse = await req('POST', '/api/auth/2fa/verify', { body: { tempToken: l4.json.data.tempToken, code: backup[0] } });
  check('FIX: backup code is single-use', bReuse.status === 401, String(bReuse.status));
  const st1 = await req('GET', '/api/2fa/status', { token: acc });
  check('status shows 9 unused backup codes (codes never returned)', st1.json.data.unused_backup_codes == 9 && !JSON.stringify(st1.json).includes(backup[1]), JSON.stringify(st1.json.data).slice(0, 120));

  // --- deneme kilidi ---
  await reset();
  const l5 = await login(email);
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await req('POST', '/api/auth/2fa/verify', { body: { tempToken: l5.json.data.tempToken, code: '1234' + (50 + i) } })).status);
  check('FIX: 5 wrong codes -> account 2FA locked (429)', statuses.slice(0, 5).every((s) => s === 401) && statuses[5] === 429, statuses.join(','));
  const lockedGood = await req('POST', '/api/auth/2fa/verify', { body: { tempToken: l5.json.data.tempToken, code: code(secret, 1) } });
  check('FIX: while locked even a correct code is refused', lockedGood.status === 429, String(lockedGood.status));

  // --- kapatma ---
  await db.query('update user_2fa set locked_until = null, failed_attempts = 0 where user_id=$1', [uid]);
  const dis0 = await req('POST', '/api/2fa/disable', { token: acc, body: { password: PW, code: '000000' } });
  check('disable with wrong code rejected', dis0.status === 400, String(dis0.status));
  const dis1 = await req('POST', '/api/2fa/disable', { token: acc, body: { password: 'Wrong-pass-1!', code: code(secret, 0) } });
  check('disable with wrong password rejected', dis1.status === 401, String(dis1.status));
  const dis2 = await req('POST', '/api/2fa/disable', { token: acc, body: { password: PW, code: code(secret, 0) } });
  check('disable with password + valid code works', dis2.status === 200, String(dis2.status));
  const gone = await db.query('select 1 from user_2fa where user_id=$1', [uid]);
  check('disable deletes secret and backup codes', gone.rows.length === 0 && (await db.query('select 1 from user_2fa_backup_codes where user_id=$1', [uid])).rows.length === 0);
  const l6 = await login(email);
  check('login without 2FA works again', l6.status === 200 && !!cookieVal(l6, 'access_token'), String(l6.status));

  // --- yönetici sıfırlama kapsamı ---
  const B = await registerCompany('b' + tag);
  const bUid = (await db.query('select id from users where email=$1', [B.email])).rows[0].id;
  const xt = await req('DELETE', '/api/2fa/' + bUid, { token: acc });
  check('FIX: admin of another company cannot reset a user\'s 2FA', xt.status === 404, String(xt.status));

  await db.end();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERR', e.stack); process.exit(2); });
