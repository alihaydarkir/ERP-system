jest.mock('../config/database', () => ({ query: jest.fn() }));
const pool = require('../config/database');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret-unit-test-secret';
const Settings = require('./Settings');

describe('Settings — SMTP parolası veritabanında şifreli', () => {
  beforeEach(() => pool.query.mockReset());

  it('update(): depolanan değer düz metin değil, enc:v1: biçiminde', async () => {
    pool.query.mockResolvedValue({ rows: [{ key: 'emailSmtpPassword', value: 'x' }] });
    await Settings.update('emailSmtpPassword', 'Gizli-Parola-123', 1, 2);
    const stored = pool.query.mock.calls[0][1][1];
    expect(stored).toMatch(/^enc:v1:/);
    expect(stored).not.toContain('Gizli-Parola-123');
  });

  it('reveal ile okuma şifreyi çözer, maskeli okuma sırrı göstermez', async () => {
    let stored;
    pool.query.mockImplementationOnce(async (_q, p) => { stored = p[1]; return { rows: [{ key: 'emailSmtpPassword', value: stored }] }; });
    await Settings.update('emailSmtpPassword', 'Gizli-Parola-123', 1, 2);
    pool.query.mockResolvedValue({ rows: [{ id: 5, key: 'emailSmtpPassword', value: stored, type: 'string' }] });
    expect((await Settings.findByKey('emailSmtpPassword', 2, { reveal: true })).value).toBe('Gizli-Parola-123');
    expect((await Settings.findByKey('emailSmtpPassword', 2)).value).toBe('••••••••');
  });

  it('eski düz metin kayıt okunur ve şifreli biçime yükseltilir', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 9, key: 'emailSmtpPassword', value: 'eski-duz-parola', type: 'string' }] });
    pool.query.mockResolvedValueOnce({ rows: [] });
    const s = await Settings.findByKey('emailSmtpPassword', 2, { reveal: true });
    expect(s.value).toBe('eski-duz-parola');
    const upgrade = pool.query.mock.calls[1];
    expect(upgrade[0]).toMatch(/UPDATE system_settings/);
    expect(upgrade[1][0]).toMatch(/^enc:v1:/);
  });

  it('gizli olmayan ayarlar şifrelenmez', async () => {
    pool.query.mockResolvedValue({ rows: [{ key: 'emailSmtpHost', value: 'smtp.example.com' }] });
    await Settings.update('emailSmtpHost', 'smtp.example.com', 1, 2);
    expect(pool.query.mock.calls[0][1][1]).toBe('smtp.example.com');
  });
});
