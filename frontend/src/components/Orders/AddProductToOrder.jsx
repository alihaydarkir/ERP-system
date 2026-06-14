import { useState, useEffect } from 'react';
import { productService } from '../../services/productService';
import useUIStore from '../../store/uiStore';

export default function AddProductToOrder({ onAddToCart }) {
  const { showSuccess, showWarning } = useUIStore();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [disc1, setDisc1] = useState('');
  const [disc2, setDisc2] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Brüt fiyat (ürün fiyatı) → 2 parçalı zincirleme iskonto → net birim fiyat
  const grossPrice = Number(selectedProduct?.price || 0);
  const d1 = Math.min(Math.max(Number(disc1) || 0, 0), 100);
  const d2 = Math.min(Math.max(Number(disc2) || 0, 0), 100);
  const netPrice = grossPrice * (1 - d1 / 100) * (1 - d2 / 100);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productService.getAll({ limit: 100 });
      setProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    (product?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product?.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setShowDropdown(false);
    setQuantity(1);
    setDisc1('');
    setDisc2('');
  };

  const handleAddToCart = () => {
    if (!selectedProduct) {
      showWarning('Lütfen bir ürün seçin');
      return;
    }

    if (quantity <= 0) {
      showWarning('Miktar 0\'dan büyük olmalıdır');
      return;
    }

    const maxStock = Number(selectedProduct.stock_quantity ?? selectedProduct.stock ?? 0);
    if (maxStock > 0 && quantity > maxStock) {
      showWarning(`Maksimum ${maxStock} adet ekleyebilirsiniz`);
      return;
    }

    onAddToCart({
      id: selectedProduct.id,
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      gross_price: grossPrice,
      disc1: d1,
      disc2: d2,
      price: Number(netPrice.toFixed(2)), // iskontolu net birim fiyat (sipariş kalemine yazılır)
      quantity: quantity,
      stock_quantity: Number(selectedProduct.stock_quantity ?? selectedProduct.stock ?? 0),
    });

    // Reset form
    setSelectedProduct(null);
    setSearchTerm('');
    setQuantity(1);
    setDisc1('');
    setDisc2('');
    showSuccess('Ürün sepete eklendi!');
  };

  const incrementQuantity = () => {
    const maxStock = Number(selectedProduct?.stock_quantity ?? selectedProduct?.stock ?? 0);
    if (selectedProduct && (maxStock === 0 || quantity < maxStock)) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Ürün Ekle</h3>

      {/* Search Input */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Ürün ara (isim veya SKU)..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
            setSelectedProduct(null);
          }}
          onFocus={() => setShowDropdown(true)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {/* Dropdown */}
        {showDropdown && searchTerm && filteredProducts.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredProducts.slice(0, 10).map(product => (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <div className="font-medium text-gray-800 dark:text-gray-100">{product.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  SKU: {product.sku} | Stok: {Number(product.stock_quantity ?? product.stock ?? 0)} | ₺{Number(product.price || 0).toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Product Details */}
      {selectedProduct && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100">{selectedProduct.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">SKU: {selectedProduct.sku}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Brüt Fiyat</p>
              <span className="text-lg font-bold text-blue-600">₺{grossPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* 2 Parçalı İskonto (zincirleme): brüt × (1-i1) × (1-i2) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3 border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">İskonto (2 parçalı, %)</p>
            <div className="flex items-center gap-2">
              <input
                type="number" min="0" max="100" value={disc1}
                onChange={(e) => setDisc1(e.target.value)}
                placeholder="İsk 1"
                className="h-9 w-20 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/80 text-gray-900 dark:text-gray-100"
              />
              <span className="text-gray-400">+</span>
              <input
                type="number" min="0" max="100" value={disc2}
                onChange={(e) => setDisc2(e.target.value)}
                placeholder="İsk 2"
                className="h-9 w-20 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/80 text-gray-900 dark:text-gray-100"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                {(d1 > 0 || d2 > 0) ? `= ×${((1 - d1 / 100) * (1 - d2 / 100)).toFixed(4)}` : 'iskontosuz'}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-100 dark:border-blue-900/40">
              <span className="text-sm text-gray-600 dark:text-gray-300">Net Birim Fiyat</span>
              <span className="text-base font-bold text-green-600">₺{netPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Mevcut Stok: <span className="font-semibold">{Number(selectedProduct.stock_quantity ?? selectedProduct.stock ?? 0)}</span>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Miktar:</span>
              <button
                onClick={decrementQuantity}
                className="h-9 w-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={quantity <= 1}
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  const maxStock = Number(selectedProduct.stock_quantity ?? selectedProduct.stock ?? 0);
                  setQuantity(maxStock > 0 ? Math.min(Math.max(1, val), maxStock) : Math.max(1, val));
                }}
                className="h-9 w-14 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 [appearance:textfield]"
                min="1"
                max={Number(selectedProduct.stock_quantity ?? selectedProduct.stock ?? 0) || undefined}
              />
              <button
                onClick={incrementQuantity}
                className="h-9 w-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={Number(selectedProduct.stock_quantity ?? selectedProduct.stock ?? 0) > 0 && quantity >= Number(selectedProduct.stock_quantity ?? selectedProduct.stock ?? 0)}
              >
                +
              </button>
            </div>
          </div>

          {/* Total Price (net birim × miktar) */}
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Toplam:</span>
              <span className="text-xl font-bold text-blue-600">
                ₺{(netPrice * quantity).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        disabled={!selectedProduct}
        className={`w-full py-3 rounded-lg font-semibold transition ${
          selectedProduct
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-200 dark:bg-gray-700/60 text-gray-400 dark:text-gray-400 cursor-not-allowed'
        }`}
      >
        🛒 SEPETE EKLE
      </button>
    </div>
  );
}
