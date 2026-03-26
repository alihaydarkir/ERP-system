import { useMemo, useState } from 'react';

export default function CategoryFilter({ selectedCategory, onCategoryChange, products = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const categoryCounts = useMemo(() => {
    const map = {};
    products.forEach((product) => {
      if (!product?.category) return;
      const key = String(product.category).trim();
      if (!key) return;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [products]);

  const categories = useMemo(() => {
    const base = Object.keys(categoryCounts).sort((a, b) => {
      const diff = (categoryCounts[b] || 0) - (categoryCounts[a] || 0);
      return diff !== 0 ? diff : a.localeCompare(b, 'tr');
    });

    if (!searchTerm.trim()) return base;
    const needle = searchTerm.toLowerCase('tr-TR');
    return base.filter((category) => category.toLowerCase('tr-TR').includes(needle));
  }, [categoryCounts, searchTerm]);

  const getTotalCount = () => {
    return Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Kategoriler</h3>

      <div className="mb-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Kategori ara..."
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        {/* Tümü Option */}
        <button
          onClick={() => onCategoryChange(null)}
          className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-200 ${
            selectedCategory === null
              ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
              : 'hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
          }`}
        >
          <span className="flex justify-between items-center">
            <span>Tümü</span>
            <span className={`text-sm ${selectedCategory === null ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {getTotalCount()}
            </span>
          </span>
        </button>

        {/* Category Options */}
        {categories.map(category => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-200 ${
              selectedCategory === category
                ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                : 'hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
            }`}
          >
            <span className="flex justify-between items-center">
              <span>{category}</span>
              <span className={`text-sm ${selectedCategory === category ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {categoryCounts[category] || 0}
              </span>
            </span>
          </button>
        ))}

        {categories.length === 0 && (
          <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            Eşleşen kategori bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}
