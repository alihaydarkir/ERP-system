jest.mock('../config/database', () => ({ query: jest.fn(), connect: jest.fn() }));

const pool = require('../config/database');
const Settings = require('./Settings');

const row = (key, value, extra = {}) => ({ key, value, type: 'string', category: 'email', company_id: null, ...extra });

describe('Settings (şirket bazlı)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('okuma şirket kimliğiyle yapılır, şirket satırı varsayılanın önüne geçer', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await Settings.findAll(7);

    const [sql, params] = pool.query.mock.calls[0];
    expect(params).toEqual([7]);
    expect(sql).toMatch(/company_id = \$1 OR company_id IS NULL/);
    expect(sql).toMatch(/ORDER BY key, company_id NULLS LAST/);
  });

  it('SMTP şifresi okumada maskelenir, boşsa boş kalır', async () => {
    pool.query.mockResolvedValue({ rows: [row('emailSmtpPassword', 'gizli'), row('emailSmtpHost', 'smtp.x.com')] });
    const all = await Settings.findAll(1);
    expect(all.find((s) => s.key === 'emailSmtpPassword').value).toBe(Settings.SECRET_MASK);
    expect(all.find((s) => s.key === 'emailSmtpHost').value).toBe('smtp.x.com');

    pool.query.mockResolvedValue({ rows: [row('emailSmtpPassword', '')] });
    const grouped = await Settings.findAllGrouped(1);
    expect(grouped.email.emailSmtpPassword).toBe('');
  });

  it('şifre yalnız reveal ile açık döner (test e-postası için)', async () => {
    pool.query.mockResolvedValue({ rows: [row('emailSmtpPassword', 'gizli')] });
    expect((await Settings.findByKey('emailSmtpPassword', 1)).value).toBe(Settings.SECRET_MASK);
    expect((await Settings.findByKey('emailSmtpPassword', 1, { reveal: true })).value).toBe('gizli');
  });

  it('güncelleme şirketin satırına upsert eder, şablona dokunmaz', async () => {
    pool.query.mockResolvedValue({ rows: [row('companyName', 'Acme', { company_id: 3 })] });
    await Settings.update('companyName', 'Acme', 9, 3);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO system_settings/);
    expect(sql).toMatch(/ON CONFLICT \(company_id, key\) WHERE company_id IS NOT NULL/);
    expect(sql).not.toMatch(/^\s*UPDATE system_settings/m);
    expect(params).toEqual([3, 'Acme', 9, 'companyName']);
  });

  it('maskeli şifre geri gelirse yazılmaz', async () => {
    pool.query.mockResolvedValue({ rows: [row('emailSmtpPassword', 'gizli', { company_id: 3 })] });
    await Settings.update('emailSmtpPassword', Settings.SECRET_MASK, 9, 3);
    expect(pool.query.mock.calls.every(([sql]) => !/INSERT/.test(sql))).toBe(true);
  });

  it('toplu güncellemede maskeli şifre atlanır, diğerleri şirkete yazılır', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [row('emailSmtpHost', 'h')] }), release: jest.fn() };
    pool.connect.mockResolvedValue(client);

    await Settings.bulkUpdate({ emailSmtpHost: 'h', emailSmtpPassword: Settings.SECRET_MASK }, 9, 3);

    const inserts = client.query.mock.calls.filter(([sql]) => /INSERT/.test(sql));
    expect(inserts).toHaveLength(1);
    expect(inserts[0][1]).toEqual([3, 'h', 9, 'emailSmtpHost']);
    expect(client.release).toHaveBeenCalled();
  });

  it('silme yalnız şirketin kendi satırını siler', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await Settings.delete('companyName', 3);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/WHERE key = \$1 AND company_id = \$2/);
    expect(params).toEqual(['companyName', 3]);
  });

  it('var olan anahtarla yeni ayar oluşturulamaz', async () => {
    pool.query.mockResolvedValue({ rows: [row('companyName', 'My Company')] });
    await expect(Settings.create({ key: 'companyName', value: 'x' }, 9, 3)).rejects.toMatchObject({ code: '23505' });
  });
});
