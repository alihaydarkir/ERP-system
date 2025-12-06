import { useState, useEffect } from 'react';
import { productService } from '../../services/productService';

export default function CategoryFilter({ selectedCategory, onCategoryChange }) {
  const [categories, setCategories] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await productService.getAll({ limit: 100 });
      const products = response.data || [];

      // Extract unique categories and count products
      const categoryMap = {};
      products.forEach(product => {
        if (product.category) {
          categoryMap[product.category] = (categoryMap[product.category] || 0) + 1;
        }
      });

      const uniqueCategories = Object.keys(categoryMap).sort();
      setCategories(uniqueCategories);
      setCategoryCounts(categoryMap);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const getTotalCount = () => {
    return Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Kategoriler</h3>

      <div className="space-y-2">
        {/* Tümü Option */}
        <button
          onClick={() => onCategoryChange(null)}
          className={`w-full text-left px-4 py-2 rounded-lg transition ${
            selectedCategory === null
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <span className="flex justify-between items-center">
            <span>Tümü</span>
            <span className={`text-sm ${selectedCategory === null ? 'text-blue-600' : 'text-gray-500'}`}>
              {getTotalCount()}
            </span>
          </span>
        </button>

        {/* Category Options */}
        {categories.map(category => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`w-full text-left px-4 py-2 rounded-lg transition ${
              selectedCategory === category
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="flex justify-between items-center">
              <span>{category}</span>
              <span className={`text-sm ${selectedCategory === category ? 'text-blue-600' : 'text-gray-500'}`}>
                {categoryCounts[category] || 0}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
