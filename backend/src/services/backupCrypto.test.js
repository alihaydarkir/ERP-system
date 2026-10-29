// age-encryption bir ES modülü: Jest yükleyemez, Node 24 require() ile yükler. Gerçek
// şifreleme bu yüzden ayrı bir Node sürecinde denenir (sahte değil, gerçek scrypt + X25519).
const { execFileSync } = require('child_process');
const path = require('path');

const runInNode = (body) => {
  const script = `
    const c = require(${JSON.stringify(path.join(__dirname, 'backupCrypto.js'))});
    const age = require('age-encryption');
    (async () => { ${body} })().then(
      (r) => process.stdout.write(JSON.stringify(r)),
      (e) => { process.stderr.write(String(e && e.stack || e)); process.exit(1); }
    );
  `;
  return JSON.parse(execFileSync(process.execPath, ['-e', script], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' }));
};

describe('backupCrypto (gerçek age şifrelemesi)', () => {
  it('kurtarma kodu: 6×4 karakter, karıştırılabilen harf yok, normalize edilir', () => {
    const r = runInNode(`
      const codes = Array.from({ length: 50 }, () => c.generateRecoveryCode());
      return { codes, norm: c.normalizeRecoveryCode(' abcd-efgh jkmn ') };
    `);
    for (const code of r.codes) expect(code).toMatch(/^([A-HJKMNP-Z2-9]{4}-){5}[A-HJKMNP-Z2-9]{4}$/);
    expect(new Set(r.codes).size).toBe(50);
    expect(r.norm).toBe('ABCDEFGHJKMN');
  });

  it('parola ve kurtarma koduyla aynı anahtar açılır; parola değişince eski yedek açılır', async () => {
    const r = runInNode(`
      const keys = await c.createKeys('ilk-parola-123');
      // Yedek container'ının yaptığı gibi yalnız açık anahtarla şifrele
      const enc = new age.Encrypter(); enc.addRecipient(keys.recipient);
      const backup = await enc.encrypt('PGDMP-eski-yedek');

      const byPw = await c.openIdentity(keys, 'ilk-parola-123');
      const byCode = await c.openIdentity(keys, keys.recoveryCode.toLowerCase().replace(/-/g, ' '));
      const wrong = await c.openIdentity(keys, 'yanlis-parola-1');

      // Parola değişimi: yalnız parola zarfı yenilenir
      const changed = { ...keys, passwordEnvelope: await c.wrap(byPw.identity, 'yeni-parola-456') };
      const oldPwNow = await c.openIdentity(changed, 'ilk-parola-123');
      const newPw = await c.openIdentity(changed, 'yeni-parola-456');
      const dec = new age.Decrypter(); dec.addIdentity(newPw.identity);
      const plain = await dec.decrypt(backup, 'text');

      return {
        recipient: keys.recipient, viaPw: byPw.via, viaCode: byCode.via, wrong,
        oldPwNow, plain, envelopeHasIdentity: keys.passwordEnvelope.includes('AGE-SECRET-KEY'),
      };
    `);
    expect(r.recipient).toMatch(/^age1/);
    expect(r.viaPw).toBe('password');
    expect(r.viaCode).toBe('recovery');
    expect(r.wrong).toBeNull();
    expect(r.oldPwNow).toBeNull();
    expect(r.plain).toBe('PGDMP-eski-yedek');
    expect(r.envelopeHasIdentity).toBe(false);
  }, 60000);

  it('kısa parola reddedilir', () => {
    expect(() => require('./backupCrypto').validatePassword('kisa')).toThrow(/en az 12/);
  });
});
