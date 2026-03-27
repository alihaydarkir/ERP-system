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

    expect(result).toEqual({ total_orders: '1' });
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });

  it('Bilinmeyen tool -> Bilinmeyen araç hatası', async () => {
    await expect(
      tools.execute('olmayan_tool', {}, { company_id: 1 })
    ).rejects.toThrow('Bilinmeyen araç');
  });
});
