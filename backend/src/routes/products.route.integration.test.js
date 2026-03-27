const express = require('express');
const request = require('supertest');

const mockPool = {
  query: jest.fn()
};

const mockJwtVerify = jest.fn();

const mockPermissionService = {
  hasPermission: jest.fn(),
  hasAnyPermission: jest.fn()
};

const mockActivityLogService = {
  log: jest.fn()
};

const mockProductController = {
  getAllProducts: jest.fn((_req, res) => {
    res.status(200).json({
      success: true,
      data: [{ id: 1, name: 'Laptop' }],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1, hasMore: false }
    });
  }),
  getProductById: jest.fn((_req, res) => res.status(200).json({ success: true, data: { id: 1 } })),
  createProduct: jest.fn((_req, res) => res.status(201).json({ success: true })),
  updateProduct: jest.fn((_req, res) => res.status(200).json({ success: true })),
  deleteProduct: jest.fn((_req, res) => res.status(200).json({ success: true }))
};

jest.mock('../config/database', () => mockPool);
jest.mock('jsonwebtoken', () => ({
  verify: (...args) => mockJwtVerify(...args)
}));
jest.mock('../services/permissionService', () => mockPermissionService);
jest.mock('../services/activityLogService', () => mockActivityLogService);
jest.mock('../controllers/productController', () => mockProductController);

const productsRouter = require('./products');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);
  return app;
};

const setupAuthDb = () => {
  mockPool.query.mockImplementation(async (sql) => {
    const query = String(sql);

    if (query.includes('FROM revoked_access_tokens')) {
      return { rows: [] };
    }

    if (query.includes('FROM user_sessions')) {
      return { rows: [{ id: 500 }] };
    }

    if (query.includes('UPDATE user_sessions')) {
      return { rows: [] };
    }

    return { rows: [] };
  });
};

describe('products routes integration (supertest)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuthDb();

    mockJwtVerify.mockImplementation((token) => {
      if (token === 'valid-user-token') {
        return { userId: 11, id: 11, username: 'user', role: 'user', company_id: 10 };
      }

      throw new Error('invalid token');
    });

    mockPermissionService.hasPermission.mockResolvedValue(true);
    mockPermissionService.hasAnyPermission.mockResolvedValue(true);
    mockActivityLogService.log.mockResolvedValue(true);
  });

  afterEach(() => {
    mockPool.query.mockReset();
  });

  it('Auth olmadan erişim -> 401', async () => {
    const app = createApp();

    const response = await request(app).get('/api/products');

    expect(response.status).toBe(401);
    expect(response.body).toEqual(expect.objectContaining({
      error: 'No token provided'
    }));
  });

  it('Yetersiz permission -> 403', async () => {
    const app = createApp();
    mockPermissionService.hasPermission.mockResolvedValue(false);

    const response = await request(app)
      .get('/api/products')
      .set('Authorization', 'Bearer valid-user-token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      message: 'Bu işlem için yetkiniz yok'
    }));
  });

  it('Geçerli istek -> 200', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/products')
      .set('Authorization', 'Bearer valid-user-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockProductController.getAllProducts).toHaveBeenCalled();
  });

  it('Validation hatası -> 400 + hata detayı', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', 'Bearer valid-user-token')
      .send({
        name: 'Eksik Alanlı Ürün'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      message: 'Validation error',
      errors: expect.any(Array)
    }));
    expect(response.body.errors.length).toBeGreaterThan(0);
    expect(mockProductController.createProduct).not.toHaveBeenCalled();
  });
});
