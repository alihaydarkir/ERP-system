/**
 * Güvenlik denetimi (2026-10) regresyon testleri: kiracı sızıntısı / destek yasak listesi düzeltmeleri.
 * Uçtan uca (iki kiracılı) kanıtlar için: scripts/sandbox-regression/README.md
 */
jest.mock('./config/database', () => ({ query: jest.fn() }));
const pool = require('./config/database');
const ActivityLogService = require('./services/activityLogService');
const { getSupportDenial } = require('./services/supportAccessService');

describe('ActivityLogService.cleanup — kiracı kapsamı', () => {
  beforeEach(() => pool.query.mockReset());

  it('companyId olmadan çalışmaz (tüm kiracıları silme yolu kapalı)', async () => {
    await expect(ActivityLogService.cleanup(undefined, 30)).rejects.toThrow('companyId required');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('yalnızca çağıran şirketin kullanıcılarını siler ve parametre bağlar', async () => {
    pool.query.mockResolvedValue({ rowCount: 3 });
    const n = await ActivityLogService.cleanup(7, 90);
    expect(n).toBe(3);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/USING users/);
    expect(sql).toMatch(/u\.company_id = \$1/);
    expect(sql).not.toMatch(/\$\{/);
    expect(params).toEqual([7, 90]);
  });

  it.each([[0], [-5], ['abc'], [1]])('days=%p en az 30 gün saklama uygular', async (d) => {
    pool.query.mockResolvedValue({ rowCount: 0 });
    await ActivityLogService.cleanup(7, d);
    const days = pool.query.mock.calls[0][1][1];
    expect(days).toBeGreaterThanOrEqual(30);
  });
});

describe('Destek oturumu yasak listesi — büyük/küçük harf ve yeni yollar', () => {
  const deny = (method, path, accessLevel = 'edit') => getSupportDenial({ method, path, accessLevel });

  it.each([
    '/api/user-management', '/API/USER-MANAGEMENT', '/Api/User-Management/5/change-password',
    '/API/PERMISSIONS/role/user', '/Api/Admin/Users/3', '/API/SECURITY/blacklist',
  ])('yazma %s reddedilir (edit seviyesinde bile)', (path) => {
    expect(deny('POST', path)).toMatchObject({ status: 403 });
  });

  it('denetim kayıtları okuma dahil kapalı (parola/PII içerebilir)', () => {
    expect(deny('GET', '/api/admin/audit-logs')).toMatchObject({ status: 403 });
    expect(deny('GET', '/API/ADMIN/AUDIT-LOGS')).toMatchObject({ status: 403 });
  });

  it('aktivite günlüğü temizliği ve kendi veri silme yazma olarak kapalı', () => {
    expect(deny('DELETE', '/api/activity-logs/cleanup')).toMatchObject({ status: 403 });
    expect(deny('DELETE', '/api/users/me/data')).toMatchObject({ status: 403 });
  });

  it('normal işlemler etkilenmez', () => {
    expect(deny('POST', '/api/customers')).toBeNull();
    expect(deny('GET', '/api/orders', 'read')).toBeNull();
  });
});
