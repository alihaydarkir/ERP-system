import React, { useState, useEffect } from 'react';
import customerService from '../../services/customerService';

const ChequeForm = ({ cheque, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    check_serial_no: '',
    check_issuer: '',
    customer_id: '',
    bank_name: '',
    received_date: '',
    due_date: '',
    amount: '',
    currency: 'TRY',
    notes: ''
  });

  const [customers, setCustomers] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load customers
    const loadCustomers = async () => {
      try {
        const response = await customerService.getAll({ limit: 1000 });
        setCustomers(response.data || []);
      } catch (error) {
        console.error('Failed to load customers:', error);
      }
    };
    loadCustomers();

    // If editing, populate form
    if (cheque) {
      setFormData({
        check_serial_no: cheque.check_serial_no || '',
        check_issuer: cheque.check_issuer || '',
        customer_id: cheque.customer_id || '',
        bank_name: cheque.bank_name || '',
        received_date: cheque.received_date ? cheque.received_date.split('T')[0] : '',
        due_date: cheque.due_date ? cheque.due_date.split('T')[0] : '',
        amount: cheque.amount || '',
        currency: cheque.currency || 'TRY',
        notes: cheque.notes || ''
      });
    }
  }, [cheque]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.check_serial_no.trim()) {
      newErrors.check_serial_no = 'Çek seri numarası gerekli';
    }

    if (!formData.check_issuer.trim()) {
      newErrors.check_issuer = 'Keşideci gerekli';
    }

    if (!formData.customer_id) {
      newErrors.customer_id = 'Müşteri seçimi gerekli';
    }

    if (!formData.bank_name.trim()) {
      newErrors.bank_name = 'Banka adı gerekli';
    }

    if (!formData.received_date) {
      newErrors.received_date = 'Alınma tarihi gerekli';
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Vade tarihi gerekli';
    }

    if (formData.received_date && formData.due_date) {
      if (new Date(formData.due_date) <= new Date(formData.received_date)) {
        newErrors.due_date = 'Vade tarihi alınma tarihinden sonra olmalı';
      }
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Geçerli bir tutar girin';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {cheque ? 'Çek Düzenle' : 'Yeni Çek Ekle'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Çek Bilgileri */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Çek Bilgileri</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Çek Seri Numarası <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="check_serial_no"
                  value={formData.check_serial_no}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.check_serial_no ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="1234567"
                />
                {errors.check_serial_no && (
                  <p className="text-red-500 text-xs mt-1">{errors.check_serial_no}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keşideci <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="check_issuer"
                  value={formData.check_issuer}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.check_issuer ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="ABC Ltd. Şti."
                />
                {errors.check_issuer && (
                  <p className="text-red-500 text-xs mt-1">{errors.check_issuer}</p>
                )}
              </div>
            </div>
          </div>

          {/* Müşteri Seçimi */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Müşteri Bilgileri</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Müşteri <span className="text-red-500">*</span>
              </label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.customer_id ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              >
                <option value="">Müşteri Seçin</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company_name || customer.full_name}
                    {customer.tax_number && ` (${customer.tax_number})`}
                  </option>
                ))}
              </select>
              {errors.customer_id && (
                <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>
              )}
            </div>
          </div>

          {/* Finansal Bilgiler */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Finansal Bilgiler</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banka Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.bank_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="Garanti Bankası"
              />
              {errors.bank_name && (
                <p className="text-red-500 text-xs mt-1">{errors.bank_name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alınma Tarihi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="received_date"
                  value={formData.received_date}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.received_date ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.received_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.received_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vade Tarihi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.due_date ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.due_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.due_date}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tutar <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.amount ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="50000.00"
                />
                {errors.amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Para Birimi
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="TRY">TRY (₺)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notlar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notlar
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ek açıklamalar..."
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              disabled={isSubmitting}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Kaydediliyor...' : (cheque ? 'Güncelle' : 'Kaydet')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChequeForm;
