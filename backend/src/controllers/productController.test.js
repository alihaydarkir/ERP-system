const mockPool = {
  query: jest.fn()
};

const mockProduct = {
  findAll: jest.fn(),
  count: jest.fn(),
  findById: jest.fn(),
  findBySku: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  archive: jest.fn()
};

const mockAuditLog = {
  create: jest.fn()
};

const mockActivityLogService = {
  log: jest.fn()
};

const mockCacheService = {
  getCachedProduct: jest.fn(),
  cacheProduct: jest.fn(),
  invalidateProductCache: jest.fn()
};

jest.mock('../config/database', () => mockPool);
jest.mock('../models/Product', () => mockProduct);
jest.mock('../models/AuditLog', () => mockAuditLog);
jest.mock('../services/activityLogService', () => mockActivityLogService);
jest.mock('../services/cacheService', () => mockCacheService);

const {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct
} = require('./productController');

const createMockReq = (overrides = {}) => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  user: { userId: 1, company_id: 10, role: 'admin' },
  get: jest.fn(() => 'Jest-Agent'),
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' },
  ...overrides
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('productController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheService.invalidateProductCache.mockResolvedValue(true);
    mockActivityLogService.log.mockResolvedValue(true);
    mockAuditLog.create.mockResolvedValue(true);
  });

  describe('GET /products', () => {
    it('ürün listesini getirir', async () => {
      const req = createMockReq({
        query: { page: '1', limit: '20' }
      });
      const res = createMockRes();

      mockProduct.findAll.mockResolvedValue([
        { id: 1, name: 'Laptop', price: '1500', stock_quantity: 12, company_id: 10 }
      ]);
      mockProduct.count.mockResolvedValue(1);

      await getAllProducts(req, res);

      expect(mockProduct.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.any(Array),
        pagination: expect.objectContaining({ total: 1 })
      }));
    });

    it('company_id filtresini uygular', async () => {
      const req = createMockReq({
        user: { userId: 2, company_id: 42 },
        query: {}
      });
      const res = createMockRes();

      mockProduct.findAll.mockResolvedValue([]);
      mockProduct.count.mockResolvedValue(0);

      await getAllProducts(req, res);

      expect(mockProduct.findAll).toHaveBeenCalledWith(expect.objectContaining({
        company_id: 42
      }));
      expect(mockProduct.count).toHaveBeenCalledWith(expect.objectContaining({
        company_id: 42
      }));
    });
  });

  describe('POST /products', () => {
    it('geçerli ürün oluşturur', async () => {
      const req = createMockReq({
        body: {
          name: 'Mouse',
          description: 'Wireless',
          price: 99.9,
          stock: 20,
          category: 'aksesuar',
          sku: 'MOU-001'
        }
      });
      const res = createMockRes();

      mockProduct.findBySku.mockResolvedValue(null);
      mockProduct.create.mockResolvedValue({
        id: 5,
        name: 'Mouse',
        description: 'Wireless',
        price: 99.9,
        stock_quantity: 20,
        category: 'aksesuar',
        sku: 'MOU-001',
        company_id: 10
      });

      await createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Product created'
      }));
    });

    it('eksik zorunlu alan durumunda hata döner', async () => {
      const req = createMockReq({
        body: {
          name: 'Broken Product'
        }
      });
      const res = createMockRes();

      mockProduct.findBySku.mockResolvedValue(null);
      mockProduct.create.mockRejectedValue(new Error('Validation failed'));

      await createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to create product'
      }));
    });

    it('duplicate SKU için 400 döner', async () => {
      const req = createMockReq({
        body: {
          name: 'Keyboard',
          price: 250,
          stock: 5,
          category: 'aksesuar',
          sku: 'KEY-001'
        }
      });
      const res = createMockRes();

      mockProduct.findBySku.mockResolvedValue({ id: 22, sku: 'KEY-001' });

      await createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'SKU already exists'
      }));
    });
  });

  describe('PUT /products/:id', () => {
    it('ürünü günceller', async () => {
      const req = createMockReq({
        params: { id: '10' },
        body: { name: 'Updated Name', stock: 14 }
      });
      const res = createMockRes();

      mockProduct.findById.mockResolvedValueOnce({ id: 10, company_id: 10, name: 'Old Name' });
      mockProduct.update.mockResolvedValue({ id: 10, company_id: 10, name: 'Updated Name', stock_quantity: 14, price: '10.0' });

      await updateProduct(req, res);

      expect(mockProduct.update).toHaveBeenCalledWith('10', expect.objectContaining({
        stock_quantity: 14
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Product updated'
      }));
    });

    it('olmayan ürün için 404 döner', async () => {
      const req = createMockReq({
        params: { id: '999' },
        body: { name: 'X' }
      });
      const res = createMockRes();

      mockProduct.findById.mockResolvedValue(null);

      await updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Product not found'
      }));
    });

    it('yetki yok (farklı company) durumunda güncellemez', async () => {
      const req = createMockReq({
        user: { userId: 1, company_id: 77, role: 'manager' },
        params: { id: '10' },
        body: { name: 'Should Not Update' }
      });
      const res = createMockRes();

      // company scope nedeniyle görünmüyor -> yetki yok davranışı
      mockProduct.findById.mockResolvedValue(null);

      await updateProduct(req, res);

      expect(mockProduct.update).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Product not found'
      }));
    });
  });

  describe('DELETE /products/:id', () => {
    it('ürünü siler', async () => {
      const req = createMockReq({
        params: { id: '11' }
      });
      const res = createMockRes();

      mockProduct.findById.mockResolvedValue({ id: 11, name: 'Delete Me', company_id: 10 });
      mockProduct.delete.mockResolvedValue(true);

      await deleteProduct(req, res);

      expect(mockProduct.delete).toHaveBeenCalledWith('11');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Product deleted'
      }));
    });

    it('olmayan ürün için 404 döner', async () => {
      const req = createMockReq({
        params: { id: '404' }
      });
      const res = createMockRes();

      mockProduct.findById.mockResolvedValue(null);

      await deleteProduct(req, res);

      expect(mockProduct.delete).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Product not found'
      }));
    });
  });
});
