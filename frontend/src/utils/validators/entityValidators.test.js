import { describe, expect, it } from 'vitest';
import {
  hasEntityValidationErrors,
  validateOrderDraft,
  validateProductForm
} from './entityValidators';

describe('entity validators', () => {
  it('validateProductForm returns required field errors', () => {
    const errors = validateProductForm({
      name: '',
      sku: '',
      price: '',
      stock: '',
      low_stock_threshold: ''
    });

    expect(errors.name).toBe('Ürün adı zorunludur.');
    expect(errors.sku).toBe('SKU zorunludur.');
    expect(errors.price).toBe('Fiyat 0’dan büyük olmalıdır.');
    expect(errors.stock).toBe('Stok 0 veya daha büyük tam sayı olmalıdır.');
    expect(errors.low_stock_threshold).toBe('Düşük stok limiti 0 veya daha büyük tam sayı olmalıdır.');
    expect(hasEntityValidationErrors(errors)).toBe(true);
  });

  it('validateProductForm accepts valid values', () => {
    const errors = validateProductForm({
      name: 'Laptop',
      sku: 'LP-001',
      price: '15000',
      stock: '10',
      low_stock_threshold: '2'
    });

    expect(hasEntityValidationErrors(errors)).toBe(false);
  });

  it('validateOrderDraft enforces customer and cart rules', () => {
    const errors = validateOrderDraft({
      selectedCustomer: null,
      orderDate: '',
      cartItems: []
    });

    expect(errors.customer).toBe('Lütfen müşteri seçin.');
    expect(errors.orderDate).toBe('Tarih zorunludur.');
    expect(errors.cart).toBe('Sepete en az bir ürün ekleyin.');
  });

  it('validateOrderDraft accepts valid payload', () => {
    const errors = validateOrderDraft({
      selectedCustomer: { id: 1 },
      orderDate: '2026-03-26',
      cartItems: [{ id: 1, quantity: 2, price: 100 }]
    });

    expect(hasEntityValidationErrors(errors)).toBe(false);
  });
});
