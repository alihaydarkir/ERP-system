const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const mockPool = {
  query: jest.fn()
};

const mockUser = {
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  verifyPassword: jest.fn(),
  update: jest.fn()
};

const mockUser2FA = {
  getStatus: jest.fn()
};

const mockAuditLog = {
  create: jest.fn(),
  logLogin: jest.fn(),
  logLogout: jest.fn()
};

const mockActivityLogService = {
  log: jest.fn()
};

const mockEmailService = {
  sendWelcomeEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn()
};

const mockCacheService = {
  cacheSession: jest.fn(),
  deleteSession: jest.fn()
};

jest.mock('../config/database', () => mockPool);
jest.mock('../models/User', () => mockUser);
jest.mock('../models/User2FA', () => mockUser2FA);
jest.mock('../models/AuditLog', () => mockAuditLog);
jest.mock('../services/activityLogService', () => mockActivityLogService);
jest.mock('../services/emailService', () => mockEmailService);
jest.mock('../services/cacheService', () => mockCacheService);

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn()
}));

const {
  login,
  register,
  logout,
  getProfile,
  refreshToken
} = require('./authController');

const createMockReq = (overrides = {}) => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  user: undefined,
  get: jest.fn((header) => {
    if (header.toLowerCase() === 'user-agent') return 'Jest-Agent';
    return undefined;
  }),
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' },
  ...overrides
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    crypto.randomUUID.mockReturnValue('session-uuid');
    jest.spyOn(jwt, 'sign').mockImplementation((payload) => {
      if (payload.sid) return `refresh-${payload.sid}`;
      return 'access-token';
    });
    jest.spyOn(jwt, 'verify').mockImplementation(() => ({ userId: 1 }));
    jest.spyOn(jwt, 'decode').mockImplementation(() => ({ exp: Math.floor(Date.now() / 1000) + 900 }));

    mockUser2FA.getStatus.mockResolvedValue({ is_enabled: false });
    mockCacheService.cacheSession.mockResolvedValue(true);
    mockCacheService.deleteSession.mockResolvedValue(true);
    mockAuditLog.create.mockResolvedValue(true);
    mockAuditLog.logLogin.mockResolvedValue(true);
    mockAuditLog.logLogout.mockResolvedValue(true);
    mockActivityLogService.log.mockResolvedValue(true);
    mockEmailService.sendWelcomeEmail.mockResolvedValue(true);

    mockPool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /login', () => {
    it('geçerli credentials ile başarılı giriş yapar', async () => {
      const req = createMockReq({
        body: { email: 'ali@test.com', password: 'Pass123!' }
      });
      const res = createMockRes();

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 10, company_name: 'ACME', company_code: 'ACM' }] });

      mockUser.findByEmail.mockResolvedValue({
        id: 1,
        username: 'ali',
        email: 'ali@test.com',
        password_hash: 'hashed',
        role: 'admin',
        company_id: 10,
        approval_status: 'approved'
      });
      mockUser.verifyPassword.mockResolvedValue(true);

      await login(req, res);

      expect(res.status).not.toHaveBeenCalledWith(401);
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Login successful'
      }));
    });

    it('yanlış şifrede 401 döner', async () => {
      const req = createMockReq({
        body: { email: 'ali@test.com', password: 'Wrong123!' }
      });
      const res = createMockRes();

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      mockUser.findByEmail.mockResolvedValue({
        id: 1,
        username: 'ali',
        email: 'ali@test.com',
        password_hash: 'hashed',
        role: 'admin',
        company_id: 10,
        approval_status: 'approved'
      });
      mockUser.verifyPassword.mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Invalid credentials'
      }));
    });

    it('olmayan kullanıcıda 401 döner', async () => {
      const req = createMockReq({
        body: { email: 'none@test.com', password: 'Pass123!' }
      });
      const res = createMockRes();

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });
      mockUser.findByEmail.mockResolvedValue(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Invalid credentials'
      }));
    });
  });

  describe('POST /register', () => {
    it('geçerli kayıt ile kullanıcı oluşturur', async () => {
      const req = createMockReq({
        body: {
          username: 'newuser',
          email: 'new@test.com',
          password: 'Pass123!',
          companyAction: 'join_default'
        }
      });
      const res = createMockRes();

      mockUser.findByEmail.mockResolvedValue(null);
      mockUser.findByUsername.mockResolvedValue(null);
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 10 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 10, company_name: 'ACME', company_code: 'ACM' }] });

      mockUser.create.mockResolvedValue({
        id: 2,
        username: 'newuser',
        email: 'new@test.com',
        role: 'user',
        company_id: 10
      });

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Registration successful'
      }));
    });

    it('duplicate email için 400 döner', async () => {
      const req = createMockReq({
        body: {
          username: 'newuser',
          email: 'new@test.com',
          password: 'Pass123!'
        }
      });
      const res = createMockRes();

      mockUser.findByEmail.mockResolvedValue({ id: 99, email: 'new@test.com' });

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Email already registered'
      }));
    });

    it('eksik alan ile 400 döner (create company path)', async () => {
      const req = createMockReq({
        body: {
          username: 'newuser',
          email: 'new@test.com',
          password: 'Pass123!',
          companyAction: 'create'
        }
      });
      const res = createMockRes();

      mockUser.findByEmail.mockResolvedValue(null);
      mockUser.findByUsername.mockResolvedValue(null);

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Şirket adı ve kodu gereklidir'
      }));
    });
  });

  describe('POST /logout', () => {
    it('geçerli token ile logout yapar', async () => {
      const req = createMockReq({
        user: { userId: 1, company_id: 10, username: 'ali' },
        headers: { authorization: 'Bearer access-token' }
      });
      const res = createMockRes();

      await logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Logout successful'
      }));
      expect(mockCacheService.deleteSession).toHaveBeenCalledWith(1);
    });

    it('geçersiz token ile de cookie temizleyip başarılı döner', async () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer invalid-token' }
      });
      const res = createMockRes();

      jwt.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.status).not.toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Logout successful'
      }));
    });
  });

  describe('GET /me', () => {
    it('auth kullanıcı için profile döner', async () => {
      const req = createMockReq({
        user: { userId: 1 }
      });
      const res = createMockRes();

      mockUser.findById.mockResolvedValue({ id: 1, username: 'ali', email: 'ali@test.com' });

      await getProfile(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ id: 1, username: 'ali' })
      }));
    });

    it('auth olmayan kullanıcı için hata döner', async () => {
      const req = createMockReq({ user: undefined });
      const res = createMockRes();

      await getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to get profile'
      }));
    });
  });

  describe('POST /refresh', () => {
    it('geçerli refresh token ile yeni token üretir', async () => {
      const req = createMockReq({
        headers: {
          cookie: 'refresh_token=refresh-session-token'
        }
      });
      const res = createMockRes();

      jwt.verify.mockReturnValue({ userId: 1 });
      mockUser.findById.mockResolvedValue({ id: 1, username: 'ali', role: 'admin', company_id: 10 });
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 77 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await refreshToken(req, res);

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Token refreshed'
      }));
    });

    it('süresi dolmuş refresh token için 401 döner', async () => {
      const req = createMockReq({
        headers: {
          cookie: 'refresh_token=expired-token'
        }
      });
      const res = createMockRes();

      jwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      await refreshToken(req, res);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Invalid refresh token'
      }));
    });
  });
});
