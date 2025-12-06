import { useState, useEffect } from 'react';
import { productService } from '../../services/productService';
import useUIStore from '../../store/uiStore';

export default function AddProductToOrder({ onAddToCart }) {
  const { showSuccess, showWarning } = useUIStore();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);

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
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setShowDropdown(false);
    setQuantity(1);
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

    if (quantity > selectedProduct.stock_quantity) {
      showWarning(`Maksimum ${selectedProduct.stock_quantity} adet ekleyebilirsiniz`);
      return;
    }

    onAddToCart({
      id: selectedProduct.id,
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      price: selectedProduct.price,
      quantity: quantity,
      stock_quantity: selectedProduct.stock_quantity,
    });

    // Reset form
    setSelectedProduct(null);
    setSearchTerm('');
    setQuantity(1);
    showSuccess('Ürün sepete eklendi!');
  };

  const incrementQuantity = () => {
    if (selectedProduct && quantity < selectedProduct.stock_quantity) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold text-gray-800 mb-4">Ürün Ekle</h3>

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
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {/* Dropdown */}
        {showDropdown && searchTerm && filteredProducts.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredProducts.slice(0, 10).map(product => (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
              >
                <div className="font-medium text-gray-800">{product.name}</div>
                <div className="text-sm text-gray-500">
                  SKU: {product.sku} | Stok: {product.stock_quantity} | ₺{product.price.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Product Details */}
      {selectedProduct && (
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-semibold text-gray-800">{selectedProduct.name}</p>
              <p className="text-sm text-gray-600">SKU: {selectedProduct.sku}</p>
            </div>
            <span className="text-lg font-bold text-blue-600">
              ₺{selectedProduct.price.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mevcut Stok: <span className="font-semibold">{selectedProduct.stock_quantity}</span>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Miktar:</span>
              <button
                onClick={decrementQuantity}
                className="w-8 h-8 rounded-lg bg-white hover:bg-gray-100 flex items-center justify-center text-gray-700 font-semibold border"
                disabled={quantity <= 1}
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.min(Math.max(1, val), selectedProduct.stock_quantity));
                }}
                className="w-16 text-center border rounded-lg py-1"
                min="1"
                max={selectedProduct.stock_quantity}
              />
              <button
                onClick={incrementQuantity}
                className="w-8 h-8 rounded-lg bg-white hover:bg-gray-100 flex items-center justify-center text-gray-700 font-semibold border"
                disabled={quantity >= selectedProduct.stock_quantity}
              >
                +
              </button>
            </div>
          </div>

          {/* Total Price */}
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Toplam:</span>
              <span className="text-xl font-bold text-blue-600">
                ₺{(selectedProduct.price * quantity).toFixed(2)}
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
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        🛒 SEPETE EKLE
      </button>
    </div>
  );
}
