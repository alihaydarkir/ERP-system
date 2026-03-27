const mockPool = {
  query: jest.fn()
};

jest.mock('../../config/database', () => mockPool);

const mutationTools = require('./mutationTools');
const tools = require('./index');

describe('mutationTools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('set_product_stock', () => {
    it('stok güncelleniyor', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 10, name: 'Laptop', sku: 'LP-1', stock_quantity: 25, low_stock_threshold: 5, is_active: true }]
      });

      const result = await mutationTools.set_product_stock({
        product_identifier: 'LP-1',
        stock_quantity: 25,
        company_id: 2
      });

      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [25, 2, 'LP-1', '%LP-1%']);
      expect(result).toEqual(expect.objectContaining({ updated: true, count: 1 }));
    });
  });

  describe('create_customer', () => {
    it('kayıt oluşturuluyor', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 9, full_name: 'Ali Veli', company_name: 'AV Ltd', tax_number: '1234567890' }]
      });

      const result = await mutationTools.create_customer({
        full_name: 'Ali Veli',
        company_name: 'AV Ltd',
        tax_office: 'Kadıköy',
        tax_number: '1234567890',
        phone_number: '05550000000',
        company_location: 'İstanbul',
        company_id: 3,
        user_id: 44
      });

      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [44, 'Ali Veli', 'AV Ltd', 'Kadıköy', '1234567890', '05550000000', 'İstanbul', 3]);
      expect(result).toEqual(expect.objectContaining({ created: true }));
      expect(result.customer.id).toBe(9);
    });
  });

  describe('cancel_order', () => {
    it('sadece yetkili kullanıcı iptal edebiliyor', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 77, order_number: 'ORD-77', status: 'cancelled', total_amount: '500' }]
      });

      const result = await tools.execute(
        'cancel_order',
        { order_identifier: 'ORD-77' },
        {
          company_id: 1,
          user_id: 99,
          role: 'manager',
          hasMutationPermission: async () => ({ allowed: true, requiredPermission: 'orders.cancel' })
        }
      );

      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [1, 'ORD-77']);
      expect(result).toEqual(expect.objectContaining({ updated: true }));
      expect(result.order.status).toBe('cancelled');
    });
  });
});
