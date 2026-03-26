export function validateProductForm(formData) {
  const errors = {
    name: '',
    sku: '',
    price: '',
    stock: '',
    low_stock_threshold: ''
  };

  if (!formData?.name?.trim()) {
    errors.name = 'Ürün adı zorunludur.';
  } else if (formData.name.trim().length < 2) {
    errors.name = 'Ürün adı en az 2 karakter olmalıdır.';
  }

  if (!formData?.sku?.trim()) {
    errors.sku = 'SKU zorunludur.';
  } else if (formData.sku.trim().length < 2) {
    errors.sku = 'SKU en az 2 karakter olmalıdır.';
  }

  const price = Number(formData?.price);
  if (Number.isNaN(price) || price <= 0) {
    errors.price = 'Fiyat 0’dan büyük olmalıdır.';
  }

  const stockRaw = formData?.stock;
  const stock = Number(stockRaw);
  if (stockRaw === '' || stockRaw === null || stockRaw === undefined || !Number.isInteger(stock) || stock < 0) {
    errors.stock = 'Stok 0 veya daha büyük tam sayı olmalıdır.';
  }

  const lowStockRaw = formData?.low_stock_threshold;
  const lowStockThreshold = Number(lowStockRaw);
  if (
    lowStockRaw === ''
    || lowStockRaw === null
    || lowStockRaw === undefined
    || !Number.isInteger(lowStockThreshold)
    || lowStockThreshold < 0
  ) {
    errors.low_stock_threshold = 'Düşük stok limiti 0 veya daha büyük tam sayı olmalıdır.';
  }

  return errors;
}

export function validateOrderDraft({ selectedCustomer, orderDate, cartItems }) {
  const errors = {
    customer: '',
    orderDate: '',
    cart: ''
  };

  if (!selectedCustomer) {
    errors.customer = 'Lütfen müşteri seçin.';
  }

  if (!orderDate) {
    errors.orderDate = 'Tarih zorunludur.';
  }

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    errors.cart = 'Sepete en az bir ürün ekleyin.';
  } else {
    const hasInvalidItem = cartItems.some((item) => {
      const quantity = Number(item?.quantity);
      const price = Number(item?.price);
      return !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0;
    });

    if (hasInvalidItem) {
      errors.cart = 'Sepetteki ürün miktarı ve fiyat değerlerini kontrol edin.';
    }
  }

  return errors;
}

export function hasEntityValidationErrors(errors) {
  return Object.values(errors).some(Boolean);
}
