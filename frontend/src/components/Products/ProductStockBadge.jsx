const getStockBadgeClass = (stock, lowStockThreshold = 10) => {
  if (stock <= 0) {
    return 'text-red-700 bg-red-100 border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800';
  }

  if (stock <= lowStockThreshold) {
    return 'text-yellow-700 bg-yellow-100 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-800';
  }

  return 'text-green-700 bg-green-100 border-green-200 dark:text-green-300 dark:bg-green-900/30 dark:border-green-800';
};

const getStockLabel = (stock, lowStockThreshold = 10) => {
  if (stock <= 0) return 'Tükendi';
  if (stock <= lowStockThreshold) return 'Düşük Stok';
  return 'Stokta';
};

export default function ProductStockBadge({ stock = 0, lowStockThreshold = 10 }) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${getStockBadgeClass(stock, lowStockThreshold)}`}
      title={`Stok: ${stock} | Limit: ${lowStockThreshold}`}
    >
      <span>{stock} adet</span>
      <span className="opacity-80">•</span>
      <span>{getStockLabel(stock, lowStockThreshold)}</span>
    </span>
  );
}
