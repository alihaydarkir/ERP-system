export default function OrderCart({ items, onRemoveItem, onUpdateQuantity }) {
  const getTotalPrice = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Sepet boş. Ürün ekleyin.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border">
      <div className="p-4 border-b bg-gray-50 dark:bg-gray-800/50">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Sipariş Ürünleri (Sepet)</h3>
      </div>

      <div className="divide-y">
        {items.map((item, index) => (
          <div key={index} className="p-4 hover:bg-gray-50 dark:bg-gray-800/50 transition">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-800 dark:text-gray-100">{item.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
              </div>

              <div className="flex items-center space-x-4">
                {/* Quantity Controls */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onUpdateQuantity(index, Math.max(1, item.quantity - 1))}
                    className="h-9 w-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={item.quantity <= 1}
                  >
                    −
                  </button>
                  <span className="h-9 w-14 inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/80 text-center font-semibold text-gray-800 dark:text-gray-100">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => {
                      const maxStock = Number(item.stock_quantity ?? item.stock ?? 0);
                      onUpdateQuantity(index, maxStock > 0 ? Math.min(maxStock, item.quantity + 1) : item.quantity + 1);
                    }}
                    className="h-9 w-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={Number(item.stock_quantity ?? item.stock ?? 0) > 0 && item.quantity >= Number(item.stock_quantity ?? item.stock ?? 0)}
                  >
                    +
                  </button>
                </div>

                {/* Price */}
                <div className="w-24 text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">₺{item.price.toFixed(2)}</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
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
            {Number(item.stock_quantity ?? item.stock ?? 0) > 0 && item.quantity >= Number(item.stock_quantity ?? item.stock ?? 0) && (
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ Maksimum stok miktarına ulaşıldı
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-800 dark:text-gray-100">TOPLAM</span>
          <span className="text-2xl font-bold text-blue-600">
            ₺{getTotalPrice().toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
