jest.mock('../config/database', () => ({ query: jest.fn(), connect: jest.fn() }));

const pool = require('../config/database');
const supportAccess = require('./supportAccessService');

describe('supportAccessService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('erişim kodu', () => {
    it('12 karakter, 4lü gruplar, karıştırılabilen karakter yok', () => {
      for (let i = 0; i < 50; i += 1) {
        const code = supportAccess.generateCode();
        expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
      }
    });

    it('her seferinde farklı', () => {
      const codes = new Set(Array.from({ length: 200 }, () => supportAccess.generateCode()));
      expect(codes.size).toBe(200);
    });

    it('hash büyük/küçük harf, boşluk ve tireden bağımsız', () => {
      const base = supportAccess.hashCode('ABCD-EFGH-JKMN');
      expect(supportAccess.hashCode('abcd efgh jkmn')).toBe(base);
      expect(supportAccess.hashCode('ABCDEFGHJKMN')).toBe(base);
      expect(supportAccess.hashCode('ABCD-EFGH-JKMP')).not.toBe(base);
      expect(base).toHaveLength(64);
    });
  });

  describe('getSupportDenial', () => {
    const deny = (method, path, accessLevel = 'read') => supportAccess.getSupportDenial({ method, path, accessLevel });

    it('salt okunur: okuma serbest, yazma reddedilir', () => {
      expect(deny('GET', '/api/customers')).toBeNull();
      expect(deny('POST', '/api/customers')).toMatchObject({ status: 403 });
      expect(deny('PUT', '/api/products/3')).toMatchObject({ status: 403 });
      expect(deny('DELETE', '/api/orders/1')).toMatchObject({ status: 403 });
    });

    it('salt okunur: oturum çıkışı ve yenileme serbest', () => {
      expect(deny('POST', '/api/auth/logout')).toBeNull();
      expect(deny('POST', '/api/auth/refresh')).toBeNull();
    });

    it('düzeltme izni: yazma serbest', () => {
      expect(deny('POST', '/api/customers', 'edit')).toBeNull();
      expect(deny('PUT', '/api/settings/bulk', 'edit')).toBeNull();
    });

    it.each(['read', 'edit'])('dışa aktarma her seviyede reddedilir (%s)', (level) => {
      expect(deny('POST', '/api/export/pdf', level)).toMatchObject({ status: 403 });
      expect(deny('POST', '/api/export/excel', level)).toMatchObject({ status: 403 });
      expect(deny('GET', '/api/reports/sales/export', level)).toMatchObject({ status: 403 });
      expect(deny('GET', '/api/customers/export/excel', level)).toMatchObject({ status: 403 });
    });

    it.each(['read', 'edit'])('kendi iznini göremez ve yönetemez (%s)', (level) => {
      expect(deny('GET', '/api/support/grants', level)).toMatchObject({ status: 403 });
      expect(deny('POST', '/api/support/grants', level)).toMatchObject({ status: 403 });
      expect(deny('POST', '/api/support/grants/4/revoke', level)).toMatchObject({ status: 403 });
    });

    it('düzeltme izninde bile kullanıcı/rol/şifre/güvenlik işlemleri reddedilir', () => {
      for (const path of [
        '/api/user-management/5', '/api/permissions/role/user', '/api/admin/users/5/role',
        '/api/employee-approval/5/approve', '/api/security/blacklist', '/api/users/password',
        '/api/users/profile/2fa/enable', '/api/auth/register',
      ]) {
        expect(deny('PUT', path, 'edit')).toMatchObject({ status: 403 });
      }
    });

    it('bu alanlarda okuma serbest (sorunu görebilsin)', () => {
      expect(deny('GET', '/api/user-management')).toBeNull();
      expect(deny('GET', '/api/permissions/my-permissions')).toBeNull();
    });
  });

  describe('createGrant doğrulama', () => {
    it.each([
      [{ durationHours: 2, reason: 'geçerli neden' }, /Süre/],
      [{ durationHours: 4, reason: 'x' }, /Neden/],
      [{ durationHours: 4, reason: 'geçerli neden', accessLevel: 'root' }, /Yetki/],
    ])('geçersiz girdi reddedilir: %o', async (input, message) => {
      await expect(supportAccess.createGrant({ companyId: 1, grantedBy: 1, ...input }))
        .rejects.toMatchObject({ status: 400, message: expect.stringMatching(message) });
      expect(pool.connect).not.toHaveBeenCalled();
    });

    it('kodun yalnızca hash\'i yazılır, eski aktif izin iptal edilir', async () => {
      const client = { query: jest.fn(), release: jest.fn() };
      pool.connect.mockResolvedValue(client);
      client.query.mockImplementation(async (sql) => {
        if (/SELECT id FROM users/.test(sql)) return { rows: [{ id: 99 }] };
        if (/INSERT INTO support_access_grants/.test(sql)) return { rows: [{ id: 7 }] };
        return { rows: [] };
      });
      pool.query.mockResolvedValue({ rows: [{ id: 7, access_level: 'read' }] });

      const { code, grant } = await supportAccess.createGrant({ companyId: 1, grantedBy: 2, durationHours: 4, reason: 'fatura hatası' });

      const sqls = client.query.mock.calls.map(([sql]) => sql);
      expect(sqls.some((s) => /UPDATE support_access_grants SET revoked_at/.test(s))).toBe(true);
      expect(sqls.some((s) => /UPDATE user_sessions SET is_active = false/.test(s))).toBe(true);

      const insert = client.query.mock.calls.find(([sql]) => /INSERT INTO support_access_grants/.test(sql))[1];
      expect(insert).toContain(supportAccess.hashCode(code));
      expect(insert).not.toContain(code);
      expect(grant).not.toHaveProperty('code_hash');
      expect(client.release).toHaveBeenCalled();
    });
  });
});
