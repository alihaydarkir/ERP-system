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

      expect(result).toMatchObject(dbRow);
      expect(result.summary_text).toContain('Toplam gelir');
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

describe('queryTools: kodda hesaplanan toplamlar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculate_quote adet × fiyatı kodda toplar (model 80.700 diyordu, doğrusu 75.700)', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Laptop Pro 15', price: '25000.00', stock_quantity: 3 }] })
      .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Kablosuz Mouse', price: '350.00', stock_quantity: 45 }] });

    const out = await queryTools.calculate_quote({
      items: [{ product: 'Laptop Pro 15', quantity: 3 }, { product: 'Mouse', quantity: 2 }],
      company_id: 1
    });

    expect(out.total_amount).toBe(75700);
    expect(out.lines.map((l) => l.line_total)).toEqual([75000, 700]);
    expect(out.summary_text).toContain('Genel toplam: 75.700 TL');
    expect(mockPool.query.mock.calls[0][1][0]).toBe(1); // şirket kapsamı
  });

  it('calculate_quote bulunamayan ürünü ve yetersiz stoğu bildirir, uydurmaz', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 4, name: '27" Monitör', price: '8500.00', stock_quantity: 0 }] });

    const out = await queryTools.calculate_quote({
      items: [{ product: 'Uçan Halı', quantity: 1 }, { product: 'Monitör', quantity: 2 }],
      company_id: 1
    });

    expect(out.not_found).toEqual(['Uçan Halı']);
    expect(out.total_amount).toBe(17000);
    expect(out.summary_text).toContain('Bulunamayan ürün: Uçan Halı');
    expect(out.summary_text).toContain('stok yetersiz');
  });

  it('search_cheques toplamı limitten bağımsız, kodda hesaplar', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, amount: '75000.00' }] })
      .mockResolvedValueOnce({ rows: [{ status: 'pending', count: 6, total: '215000' }, { status: 'paid', count: 2, total: '72000' }] });

    const out = await queryTools.search_cheques({ company_id: 1, limit: 1 });

    expect(out.total_amount).toBe(287000);
    expect(out.summary_text).toContain('8 çek');
    expect(out.summary_text).toContain('215.000 TL');
    expect(out.summary_text).toContain('72.000 TL');
  });

  it('search_cheques banka ve müşteri filtrelerini parametreyle SQL\'e geçirir', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    await queryTools.search_cheques({ company_id: 3, bank: 'Halkbank', customer: "Anadolu'nun" });
    const [sql, values] = mockPool.query.mock.calls[0];
    expect(sql).toContain('bank_name');
    expect(values).toEqual([3, '%Halkbank%', '%Anadolu%', 10]);
  });

  it('get_orders_summary "bu ay"ı takvim ayı olarak hesaplar ve dönemi adlandırır', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ total_orders: '0', total_amount: '0', pending_orders: '0', completed_orders: '0', cancelled_orders: '0' }] });
    const out = await queryTools.get_orders_summary({ period: 'month', company_id: 1 });
    expect(mockPool.query.mock.calls[0][0]).toContain("date_trunc('month'");
    expect(out.period_label).toBe('bu ay (takvim ayı)');
    expect(out.summary_text).toContain('0 sipariş');
  });
});

describe('toolSchemas: geçersiz limit hata değil, varsayılan olur', () => {
  const { sanitizeToolArgs } = require('./toolSchemas');

  it('limit 0, negatif, metin ya da çok büyük gelirse sanitize düzeltir', () => {
    expect(sanitizeToolArgs('search_customers', { limit: 0 }).limit).toBe(10);
    expect(sanitizeToolArgs('search_customers', { limit: -3 }).limit).toBe(10);
    expect(sanitizeToolArgs('search_customers', { limit: 'çok' }).limit).toBe(10);
    expect(sanitizeToolArgs('search_customers', { limit: 999 }).limit).toBe(50);
    expect(sanitizeToolArgs('search_customers', { limit: 7 }).limit).toBe(7);
    expect(sanitizeToolArgs('search_products', {}).limit).toBe(20);
  });
});
