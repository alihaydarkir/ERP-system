import { useState, useEffect, useRef } from 'react';

export default function CustomerSearch({ selectedCustomer, onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/customers?limit=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data = await response.json();
      setCustomers(data.data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      showError('Müşteri listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase();
    const name = (customer.full_name || '').toLowerCase();
    const company = (customer.company_name || '').toLowerCase();
    const taxNumber = (customer.tax_number || '').toLowerCase();

    return name.includes(search) || company.includes(search) || taxNumber.includes(search);
  });

  const handleSelect = (customer) => {
    setSearchTerm(`${customer.full_name} - ${customer.company_name}`);
    setShowDropdown(false);
    onSelectCustomer(customer);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    if (!e.target.value) {
      onSelectCustomer(null);
    }
  };

  const getDisplayName = (customer) => {
    return customer.full_name || 'İsimsiz Müşteri';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Müşteri *
      </label>

      <input
        type="text"
        placeholder="Müşteri adı veya email yazın..."
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={loading}
      />

      {loading && (
        <div className="absolute right-3 top-11 text-gray-400">
          Yükleniyor...
        </div>
      )}

      {showDropdown && !loading && filteredCustomers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredCustomers.map(customer => (
            <button
              key={customer.id}
              type="button"
              onClick={() => handleSelect(customer)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition"
            >
              <div className="font-medium text-gray-800">
                {getDisplayName(customer)}
              </div>
              <div className="text-sm text-gray-600">{customer.company_name}</div>
              <div className="text-xs text-gray-500 mt-1">
                Vergi No: {customer.tax_number}
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && !loading && searchTerm && filteredCustomers.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-gray-500">
          Müşteri bulunamadı
        </div>
      )}

      {selectedCustomer && (
        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-blue-900">
                {getDisplayName(selectedCustomer)}
              </p>
              <p className="text-sm text-blue-700">{selectedCustomer.company_name}</p>
              <p className="text-xs text-blue-600 mt-1">
                Vergi No: {selectedCustomer.tax_number}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                onSelectCustomer(null);
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
