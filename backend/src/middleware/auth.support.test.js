process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_support_access_tests_123';

jest.mock('../config/database', () => ({ query: jest.fn() }));
jest.mock('../services/supportAccessService', () => ({
  ...jest.requireActual('../services/supportAccessService'),
  getActiveGrantForRequest: jest.fn(),
  logSupportRequest: jest.fn().mockResolvedValue(),
}));

const jwt = require('jsonwebtoken');
const { EventEmitter } = require('events');
const pool = require('../config/database');
const supportAccess = require('../services/supportAccessService');
const { config } = require('../config/env');
const authMiddleware = require('./auth');

const tokenFor = (payload) => jwt.sign({ jti: 'x', ...payload }, config.jwt.secret, { expiresIn: '5m' });

const makeReq = (method, url, token) => ({
  method,
  originalUrl: url,
  headers: { authorization: `Bearer ${token}` },
  ip: '10.0.0.9',
});

const makeRes = () => {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.status = jest.fn((code) => { res.statusCode = code; return res; });
  res.json = jest.fn((body) => { res.body = body; res.emit('finish'); return res; });
  return res;
};

describe('auth middleware — destek oturumu', () => {
  const supportToken = tokenFor({ userId: 99, username: 'helixware_destek_1', role: 'support', company_id: 1, support_grant_id: 7 });

  beforeEach(() => {
    jest.clearAllMocks();
    // revoked_access_tokens: yok · user_sessions: aktif oturum var · last_activity güncelle
    pool.query.mockImplementation(async (sql) => {
      if (/revoked_access_tokens/.test(sql)) return { rows: [] };
      if (/FROM user_sessions/.test(sql)) return { rows: [{ id: 1 }] };
      return { rows: [] };
    });
  });

  it('izin yoksa / süresi dolduysa 401', async () => {
    supportAccess.getActiveGrantForRequest.mockResolvedValue(null);
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(makeReq('GET', '/api/customers', supportToken), res, next);

    expect(supportAccess.getActiveGrantForRequest).toHaveBeenCalledWith(7, 99, 1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body.code).toBe('SUPPORT_ACCESS_ENDED');
    expect(next).not.toHaveBeenCalled();
  });

  it('geçerli izinle okuma: yönetici gibi görür, istek audit\'e yazılır', async () => {
    supportAccess.getActiveGrantForRequest.mockResolvedValue({ id: 7, access_level: 'read', expires_at: new Date() });
    const req = makeReq('GET', '/api/customers?page=2', supportToken);
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);
    res.emit('finish');

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ role: 'admin', actual_role: 'support', is_support: true, support_grant_id: 7, company_id: 1 });
    expect(supportAccess.logSupportRequest).toHaveBeenCalledWith(
      expect.objectContaining({ grantId: 7, method: 'GET', path: '/api/customers', status: 200 })
    );
  });

  it('salt okunur izinde yazma 403 ve reddedilen istek de audit\'e yazılır', async () => {
    supportAccess.getActiveGrantForRequest.mockResolvedValue({ id: 7, access_level: 'read', expires_at: new Date() });
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(makeReq('POST', '/api/customers', supportToken), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    expect(supportAccess.logSupportRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', path: '/api/customers', status: 403 })
    );
  });

  it('normal kullanıcı destek kontrolünden geçmez', async () => {
    const req = makeReq('POST', '/api/customers', tokenFor({ userId: 5, username: 'admin', role: 'admin', company_id: 1 }));
    const next = jest.fn();

    await authMiddleware(req, makeRes(), next);

    expect(next).toHaveBeenCalled();
    expect(supportAccess.getActiveGrantForRequest).not.toHaveBeenCalled();
    expect(req.user.is_support).toBeUndefined();
  });
});
