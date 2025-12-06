export default function OrderCart({ items, onRemoveItem, onUpdateQuantity }) {
  const getTotalPrice = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-500">Sepet boş. Ürün ekleyin.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-800">Sipariş Ürünleri (Sepet)</h3>
      </div>

      <div className="divide-y">
        {items.map((item, index) => (
          <div key={index} className="p-4 hover:bg-gray-50 transition">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-800">{item.name}</p>
                <p className="text-sm text-gray-500">SKU: {item.sku}</p>
              </div>

              <div className="flex items-center space-x-4">
                {/* Quantity Controls */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onUpdateQuantity(index, Math.max(1, item.quantity - 1))}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-semibold"
                    disabled={item.quantity <= 1}
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(index, Math.min(item.stock_quantity, item.quantity + 1))}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-semibold"
                    disabled={item.quantity >= item.stock_quantity}
                  >
                    +
                  </button>
                </div>

                {/* Price */}
                <div className="w-24 text-right">
                  <p className="text-sm text-gray-500">₺{item.price.toFixed(2)}</p>
                  <p className="font-semibold text-gray-800">
                    ₺{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => onRemoveItem(index)}
                  className="text-red-600 hover:text-red-800 p-2"
                  title="Sepetten çıkar"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Stock Warning */}
            {item.quantity >= item.stock_quantity && (
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ Maksimum stok miktarına ulaşıldı
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-800">TOPLAM</span>
          <span className="text-2xl font-bold text-blue-600">
            ₺{getTotalPrice().toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
