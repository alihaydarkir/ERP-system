jest.mock('../config/database', () => ({ query: jest.fn(), connect: jest.fn() }));
process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret-unit-test-secret';
const speakeasy = require('speakeasy');
const pool = require('../config/database');
const { encryptSecret, decryptSecret, isEncrypted, keyedHash } = require('../utils/secretBox');
const User2FA = require('./User2FA');

describe('secretBox', () => {
  it('şifreler/çözer, düz metin değil', () => {
    const enc = encryptSecret('JBSWY3DPEHPK3PXP');
    expect(isEncrypted(enc)).toBe(true);
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptSecret(enc)).toBe('JBSWY3DPEHPK3PXP');
  });
  it('eski düz metni olduğu gibi döndürür, bozuk kaydı boş', () => {
    expect(decryptSecret('plain')).toBe('plain');
    expect(decryptSecret('enc:v1:AAAA:BBBB:CCCC')).toBe('');
  });
  it('keyedHash deterministik ve düz metin içermez', () => {
    expect(keyedHash('ABCDE12345')).toBe(keyedHash('ABCDE12345'));
    expect(keyedHash('ABCDE12345')).not.toContain('ABCDE12345');
  });
});

describe('User2FA', () => {
  const secret = speakeasy.generateSecret({ length: 20 }).base32;
  const row = (extra = {}) => ({ id: 1, user_id: 7, secret: encryptSecret(secret), is_enabled: true, ...extra });

  beforeEach(() => pool.query.mockReset());

  it('create(): 2FA etkinken sırrı sıfırlamaz (409 benzeri hata)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [row()] });
    await expect(User2FA.create(7)).rejects.toMatchObject({ code: 'TWO_FA_ALREADY_ENABLED' });
    expect(pool.query).toHaveBeenCalledTimes(1); // yalnızca findByUserId; INSERT/UPDATE yok
  });

  it('verifyToken(): doğru kod kabul edilir, aynı adım ikinci kez reddedilir (tekrar koruması)', async () => {
    const token = speakeasy.totp({ secret, encoding: 'base32' });
    // findByUserId, isLocked, claim(UPDATE...RETURNING), recordSuccess
    pool.query
      .mockResolvedValueOnce({ rows: [row()] })
      .mockResolvedValueOnce({ rows: [{ locked_until: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    expect(await User2FA.verifyToken(7, token)).toEqual({ valid: true });

    pool.query.mockReset();
    pool.query
      .mockResolvedValueOnce({ rows: [row()] })
      .mockResolvedValueOnce({ rows: [{ locked_until: null }] })
      .mockResolvedValueOnce({ rows: [] }) // claim başarısız: adım zaten kullanılmış
      .mockResolvedValueOnce({ rows: [] }); // recordFailure
    expect(await User2FA.verifyToken(7, token)).toMatchObject({ valid: false, replay: true });
  });

  it('verifyToken(): yanlış kod hata sayacını artırır', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [row()] })
      .mockResolvedValueOnce({ rows: [{ locked_until: null }] })
      .mockResolvedValueOnce({ rows: [] });
    expect((await User2FA.verifyToken(7, '000000')).valid).toBe(false);
    const failureSql = pool.query.mock.calls[2][0];
    expect(failureSql).toMatch(/failed_attempts/);
    expect(failureSql).toMatch(/locked_until/);
  });

  it('kilitliyken kod doğru olsa bile reddedilir', async () => {
    const token = speakeasy.totp({ secret, encoding: 'base32' });
    pool.query
      .mockResolvedValueOnce({ rows: [row()] })
      .mockResolvedValueOnce({ rows: [{ locked_until: new Date(Date.now() + 60000).toISOString() }] });
    expect(await User2FA.verifyToken(7, token)).toMatchObject({ valid: false, locked: true });
    expect(pool.query).toHaveBeenCalledTimes(2); // hiçbir UPDATE yok
  });

  it('yedek kod: yanlış uzunluk reddedilir; geçerli kod anahtarlı özetle aranır, tek kullanımlıktır', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ locked_until: null }] }).mockResolvedValueOnce({ rows: [] });
    expect((await User2FA.verifyBackupCode(7, 'kısa')).valid).toBe(false);

    pool.query.mockReset();
    pool.query
      .mockResolvedValueOnce({ rows: [{ locked_until: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 3 }] })
      .mockResolvedValueOnce({ rows: [] });
    expect((await User2FA.verifyBackupCode(7, 'abcde-23456')).valid).toBe(true);
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toMatch(/used_at IS NULL/);
    expect(params[1]).toBe(keyedHash('ABCDE23456')); // normalize: büyük harf, tire yok
    expect(JSON.stringify(params)).not.toContain('ABCDE23456');
  });

  it('verifyLoginCode(): 6 haneli → TOTP yolu, aksi halde yedek kod yolu', async () => {
    const spyT = jest.spyOn(User2FA, 'verifyToken').mockResolvedValue({ valid: true });
    const spyB = jest.spyOn(User2FA, 'verifyBackupCode').mockResolvedValue({ valid: true });
    await User2FA.verifyLoginCode(7, '123456');
    await User2FA.verifyLoginCode(7, 'ABCDE-23456');
    expect(spyT).toHaveBeenCalledTimes(1);
    expect(spyB).toHaveBeenCalledTimes(1);
    spyT.mockRestore(); spyB.mockRestore();
  });
});
