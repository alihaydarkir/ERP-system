const express = require('express');
const request = require('supertest');
const rateLimit = require('express-rate-limit');

const mockPool = {
  query: jest.fn()
};

const mockJwtVerify = jest.fn();

const mockAuthController = {
  register: jest.fn((_req, res) => res.status(201).json({ success: true, message: 'registered' })),
  login: jest.fn((_req, res) => {
    res.cookie('access_token', 'valid-token', { httpOnly: true });
    return res.status(200).json({
      success: true,
      data: { token: 'valid-token' },
      message: 'Login successful'
    });
  }),
  refreshToken: jest.fn((_req, res) => res.status(200).json({ success: true, message: 'Token refreshed' })),
  logout: jest.fn((_req, res) => res.status(200).json({ success: true, message: 'Logout successful' })),
  getProfile: jest.fn((req, res) => res.status(200).json({ success: true, data: { userId: req.user?.id } })),
  updateProfile: jest.fn((_req, res) => res.status(200).json({ success: true, message: 'Profile updated' })),
  requestPasswordReset: jest.fn((_req, res) => res.status(200).json({ success: true })),
  resetPassword: jest.fn((_req, res) => res.status(200).json({ success: true }))
};

jest.mock('../config/database', () => mockPool);
jest.mock('jsonwebtoken', () => ({
  verify: (...args) => mockJwtVerify(...args)
}));
jest.mock('../controllers/authController', () => mockAuthController);

const authRouter = require('./auth');

const createApp = ({ withLoginRateLimit = false } = {}) => {
  const app = express();
  app.use(express.json());

  if (withLoginRateLimit) {
    app.use('/api/auth/login', rateLimit({
      windowMs: 60 * 1000,
      max: 1,
      standardHeaders: true,
      legacyHeaders: true,
      message: { success: false, message: 'Too many requests' }
    }));
  }

  app.use('/api/auth', authRouter);
  return app;
};

const setupValidAuthMiddlewareDb = () => {
  mockPool.query.mockImplementation(async (sql) => {
    const query = String(sql);

    if (query.includes('FROM revoked_access_tokens')) {
      return { rows: [] };
    }

    if (query.includes('FROM user_sessions')) {
      return { rows: [{ id: 100 }] };
    }

    if (query.includes('UPDATE user_sessions')) {
      return { rows: [] };
    }

    return { rows: [] };
  });
};

describe('auth routes integration (supertest)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtVerify.mockImplementation((token) => {
      if (token === 'valid-token') {
        return { userId: 1, id: 1, username: 'ali', role: 'user', company_id: 10 };
      }

      throw new Error('invalid token');
    });
    setupValidAuthMiddlewareDb();
  });

  afterEach(() => {
    mockPool.query.mockReset();
  });

  it('Login flow: başarılı login ve token dönüyor', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ali@test.com', password: 'Pass123!' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBe('valid-token');
    expect(response.headers['set-cookie']).toEqual(expect.arrayContaining([
      expect.stringContaining('access_token=valid-token')
    ]));
  });

  it('Token ile korunan endpoint erişimi başarılı', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.userId).toBe(1);
  });

  it('Geçersiz token ile 401 döner', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual(expect.objectContaining({
      error: 'Invalid token'
    }));
  });

  it('Rate limit aşımında 429 döner', async () => {
    const app = createApp({ withLoginRateLimit: true });

    const first = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ali@test.com', password: 'Pass123!' });

    const second = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ali@test.com', password: 'Pass123!' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });
});
