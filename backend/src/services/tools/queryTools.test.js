const mockPool = {
  query: jest.fn()
};

jest.mock('../../config/database', () => mockPool);

const queryTools = require('./queryTools');

describe('queryTools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get_dashboard_summary', () => {
    it('DB sonucu doğru map ediliyor', async () => {
      const dbRow = {
        total_orders: '10',
        total_customers: '4',
        total_products: '15',
        total_revenue: '12500.50',
        low_stock_count: '2',
        overdue_cheques_count: '1',
        overdue_cheques_amount: '3500',
        pending_orders: '3'
      };
      mockPool.query.mockResolvedValueOnce({ rows: [dbRow] });

      const result = await queryTools.get_dashboard_summary({ company_id: 7 });

      expect(result).toEqual(dbRow);
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [7]);
    });
  });

  describe('search_products', () => {
    it('query parametreleri SQLe doğru geçiyor', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Laptop' }]
      });

      const result = await queryTools.search_products({
        search: 'lap',
        limit: 15,
        company_id: 9
      });

      const [sql, values] = mockPool.query.mock.calls[0];
      expect(sql).toContain('FROM products p');
      // Türkçe-duyarlı arama: ILIKE yerine LOWER(TRANSLATE(...)) LIKE kullanılıyor
      expect(sql).toContain('TRANSLATE');
      expect(sql).toContain('LIKE');
      expect(values).toEqual([9, '%lap%', 15]);
      expect(result).toEqual({
        products: [{ id: 1, name: 'Laptop' }],
        count: 1
      });
    });
  });

  describe('get_low_stock_products', () => {
    it('threshold filtresi çalışıyor', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 3, name: 'Mouse', stock_quantity: 2, low_stock_threshold: 5 }]
      });

      const result = await queryTools.get_low_stock_products({ company_id: 11 });

      const [sql, values] = mockPool.query.mock.calls[0];
      expect(sql).toContain('stock_quantity <= low_stock_threshold');
      expect(values).toEqual([11]);
      expect(result.count).toBe(1);
    });
  });

  describe('get_inventory_value', () => {
    it('parasal envanter değerini kategori kırılımıyla hesaplıyor', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { category: 'Elektronik', product_count: '3', total_units: '10', category_value: '900000' },
          { category: 'Tekstil', product_count: '2', total_units: '5', category_value: '117160' }
        ]
      });

      const result = await queryTools.get_inventory_value({ company_id: 1 });

      const [sql, values] = mockPool.query.mock.calls[0];
      expect(sql).toContain('SUM(price * stock_quantity)');
      expect(values).toEqual([1]);
      expect(result.total_value).toBe(1017160);
      expect(result.total_units).toBe(15);
      expect(result.categories).toHaveLength(2);
      expect(result.summary_text).toContain('1.017.160');
    });

    it('aktif stok yoksa anlamlı summary_text döner', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const result = await queryTools.get_inventory_value({ company_id: 1 });
      expect(result.total_value).toBe(0);
      expect(result.summary_text).toContain('hesaplanamadı');
    });
  });

  describe('get_overdue_cheques', () => {
    it('tarih filtresi doğru (CURRENT_DATE ve overdue) uygulanıyor', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, amount: '100.5', due_date: '2026-03-01' },
          { id: 2, amount: '200', due_date: '2026-03-10' }
        ]
      });

      const result = await queryTools.get_overdue_cheques({ company_id: 5 });

      const [sql, values] = mockPool.query.mock.calls[0];
      expect(sql).toContain("ch.status = 'pending'");
      expect(sql).toContain('CURRENT_DATE - ch.due_date');
      expect(values).toEqual([5]);
      expect(result.count).toBe(2);
      expect(result.total_overdue_amount).toBe(300.5);
    });
  });
});
