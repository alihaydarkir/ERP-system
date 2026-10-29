const { productSchemas } = require('./validators');

describe('productSchemas — boş seçimler', () => {
  const base = { name: 'Ürün', sku: 'SKU-1', price: 5, stock: 3 };

  it('formdan gelen boş supplier_id ("") hata vermez', () => {
    const { error, value } = productSchemas.create.validate({ ...base, supplier_id: '' });
    expect(error).toBeUndefined();
    expect(value.supplier_id).toBeUndefined();
  });

  it('geçerli supplier_id kabul edilir, metin reddedilir', () => {
    expect(productSchemas.create.validate({ ...base, supplier_id: 3 }).error).toBeUndefined();
    expect(productSchemas.create.validate({ ...base, supplier_id: 'abc' }).error).toBeDefined();
  });

  it('güncellemede de boş supplier_id kabul edilir', () => {
    expect(productSchemas.update.validate({ name: 'Yeni', supplier_id: '' }).error).toBeUndefined();
  });
});
