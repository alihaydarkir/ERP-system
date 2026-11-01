const mockPool = {
  query: jest.fn()
};

jest.mock('../../config/database', () => mockPool);

const tools = require('./index');

describe('tools permission checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Mutation tool permission denied -> hata fırlatıyor', async () => {
    await expect(
      tools.execute(
        'set_product_stock',
        { product_identifier: 'SKU-1', stock_quantity: 10 },
        {
          company_id: 1,
          user_id: 5,
          role: 'user',
          hasMutationPermission: async () => ({ allowed: false, requiredPermission: 'products.edit' })
        }
      )
    ).rejects.toThrow('Permission denied');

    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('Query tool permission kontrolü yok -> direkt çalışıyor', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ total_orders: '1' }]
    });

    const result = await tools.execute(
      'get_dashboard_summary',
      {},
      {
        company_id: 1,
        user_id: 7,
        role: 'user'
      }
    );

    expect(result).toMatchObject({ total_orders: '1' });
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });

  it('Bilinmeyen tool -> Bilinmeyen araç hatası', async () => {
    await expect(
      tools.execute('olmayan_tool', {}, { company_id: 1 })
    ).rejects.toThrow('Bilinmeyen araç');
  });
});

describe('sorgu araçları veritabanı izinlerine bağlı', () => {
  const { QUERY_TOOL_PERMISSIONS, getQueryPermission } = require('./toolPermissionMatrix');
  const { definitions, isMutationTool } = require('./toolSchemas');

  it('her sorgu aracının bir izni var (yeni araç eklenip unutulursa bu test kırılır)', () => {
    const OPEN = new Set(['get_currency_rates']); // veri içermez
    const missing = definitions
      .map((d) => d.name)
      .filter((n) => !isMutationTool(n) && !OPEN.has(n) && !QUERY_TOOL_PERMISSIONS[n]);
    expect(missing).toEqual([]);
  });

  it('tedarikçi, depo ve fatura araçları kendi izinlerini ister', () => {
    expect(getQueryPermission('get_suppliers_list')).toBe('suppliers.view');
    expect(getQueryPermission('get_warehouse_stock')).toBe('warehouses.view');
    expect(getQueryPermission('get_invoices_summary')).toBe('invoices.view');
    expect(getQueryPermission('get_currency_rates')).toBeNull();
  });

  it('hasQueryPermission: yönetici ve müşteri rolü muaf, izinsiz kullanıcı reddedilir', async () => {
    jest.resetModules();
    jest.doMock('./../permissionService', () => ({ hasPermission: jest.fn(async (uid, perm) => uid === 1 && perm === 'products.view') }));
    jest.doMock('../../config/database', () => ({ query: jest.fn() }));
    const aiService = require('../aiService');
    expect((await aiService.hasQueryPermission({ user_id: 9, role: 'admin', toolName: 'get_suppliers_list' })).allowed).toBe(true);
    expect((await aiService.hasQueryPermission({ user_id: 9, role: 'customer', toolName: 'search_orders' })).allowed).toBe(true);
    expect((await aiService.hasQueryPermission({ user_id: 1, role: 'user', toolName: 'search_products' })).allowed).toBe(true);
    const denied = await aiService.hasQueryPermission({ user_id: 1, role: 'user', toolName: 'get_suppliers_list' });
    expect(denied).toEqual({ allowed: false, requiredPermission: 'suppliers.view' });
    expect((await aiService.hasQueryPermission({ user_id: 1, role: 'user', toolName: 'get_currency_rates' })).allowed).toBe(true);
  });
});
