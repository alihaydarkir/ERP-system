import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ProductList from './ProductList';

vi.mock('../PermissionButton', () => ({
  default: ({ children, permission, permissions, requireAll, deniedText, ...props }) => (
    <button type="button" {...props}>{children}</button>
  )
}));

const baseProps = {
  loading: false,
  products: [
    {
      id: 1,
      name: 'Laptop',
      sku: 'LP-001',
      category: 'Elektronik',
      description: 'Güçlü laptop',
      supplier_id: 10,
      warehouse_id: 20,
      price: 25000,
      stock: 15,
      low_stock_threshold: 5
    }
  ],
  suppliers: [{ id: 10, supplier_name: 'ABC Tedarik' }],
  warehouses: [{ id: 20, warehouse_code: 'WH-01' }],
  searchTerm: '',
  selectedCategory: '',
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onVisibleProductsChange: vi.fn()
};

describe('ProductList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Ürün listesi render ediliyor', () => {
    render(<ProductList {...baseProps} />);

    expect(screen.getByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText('LP-001')).toBeInTheDocument();
    expect(screen.getByText('ABC Tedarik')).toBeInTheDocument();
  });

  it('Boş liste durumunda Ürün bulunamadı mesajı gösteriyor', () => {
    render(<ProductList {...baseProps} products={[]} />);

    expect(screen.getByText(/ürün bulunamadı/i)).toBeInTheDocument();
  });

  it('Tıklamada doğru callback çağrılıyor', () => {
    const onEdit = vi.fn();
    render(<ProductList {...baseProps} onEdit={onEdit} />);

    fireEvent.click(screen.getByTitle('Düzenle'));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'Laptop' }));
  });
});
