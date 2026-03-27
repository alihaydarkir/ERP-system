import { Search, X } from 'lucide-react';
import { useMemo } from 'react';

export default function ProductFilters({
  products = [],
  searchTerm,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
}) {
  const categoryCounts = useMemo(() => {
    const counts = {};
    products.forEach((product) => {
      const key = String(product?.category || '').trim();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [products]);

  const categories = useMemo(
    () => Object.keys(categoryCounts).sort((a, b) => a.localeCompare(b, 'tr')),
    [categoryCounts]
  );

  const clearAll = () => {
    onSearchChange('');
    onCategoryChange(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ürün Ara</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Ad, SKU veya açıklama ile ara..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kategori</label>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-3 h-3" />
              Temizle
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCategoryChange(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === null
                  ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
              }`}
            >
              Tümü ({products.length})
            </button>

            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryChange(category)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                }`}
              >
                {category} ({categoryCounts[category]})
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
