import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ProductForm from './ProductForm';

const defaultFormData = {
  name: '',
  description: '',
  sku: '',
  category: '',
  supplier_id: '',
  warehouse_id: '',
  price: '',
  stock: '',
  low_stock_threshold: '10'
};

const baseProps = {
  formData: defaultFormData,
  formErrors: {},
  suppliers: [{ id: 1, supplier_name: 'ABC' }],
  warehouses: [{ id: 1, warehouse_name: 'Merkez', warehouse_code: 'WH-01' }],
  onChange: vi.fn(),
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  submitLabel: 'Kaydet'
};

describe('ProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Form alanları render ediliyor', () => {
    render(<ProductForm {...baseProps} />);

    expect(screen.getByPlaceholderText('Ürün Adı')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('SKU')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Fiyat')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Stok')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeInTheDocument();
  });

  it('Zorunlu alan boş bırakılınca hata gösteriyor', () => {
    render(
      <ProductForm
        {...baseProps}
        formErrors={{
          name: 'Ürün adı zorunludur',
          sku: 'SKU zorunludur'
        }}
      />
    );

    expect(screen.getByText('Ürün adı zorunludur')).toBeInTheDocument();
    expect(screen.getByText('SKU zorunludur')).toBeInTheDocument();
  });

  it('Submitte doğru veri iletiliyor', () => {
    const submitSpy = vi.fn();

    function Wrapper() {
      const [formData, setFormData] = useState(defaultFormData);

      const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
      };

      const handleSubmit = (e) => {
        e.preventDefault();
        submitSpy(formData);
      };

      return (
        <ProductForm
          formData={formData}
          formErrors={{}}
          suppliers={baseProps.suppliers}
          warehouses={baseProps.warehouses}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={vi.fn()}
          submitLabel="Kaydet"
        />
      );
    }

    render(<Wrapper />);

    fireEvent.change(screen.getByPlaceholderText('Ürün Adı'), { target: { value: 'Klavye' } });
    fireEvent.change(screen.getByPlaceholderText('SKU'), { target: { value: 'KLV-01' } });
    fireEvent.change(screen.getByPlaceholderText('Fiyat'), { target: { value: '450' } });
    fireEvent.change(screen.getByPlaceholderText('Stok'), { target: { value: '12' } });

    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Klavye',
      sku: 'KLV-01',
      price: '450',
      stock: '12'
    }));
  });
});
