import { useState, useEffect } from 'react';

export default function CustomerForm({ customer, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    tax_office: '',
    tax_number: '',
    phone_number: '',
    company_location: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        full_name: customer.full_name || '',
        company_name: customer.company_name || '',
        tax_office: customer.tax_office || '',
        tax_number: customer.tax_number || '',
        phone_number: customer.phone_number || '',
        company_location: customer.company_location || ''
      });
    }
  }, [customer]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name || formData.full_name.length < 3) {
      newErrors.full_name = 'Ad Soyad en az 3 karakter olmalıdır';
    }

    if (!formData.company_name || formData.company_name.length < 3) {
      newErrors.company_name = 'Şirket İsmi en az 3 karakter olmalıdır';
    }

    if (!formData.tax_office || formData.tax_office.length < 3) {
      newErrors.tax_office = 'Vergi Dairesi en az 3 karakter olmalıdır';
    }

    if (!formData.tax_number || formData.tax_number.length < 10) {
      newErrors.tax_number = 'Vergi Numarası en az 10 karakter olmalıdır';
    }

    if (formData.phone_number && !/^[0-9+\-() ]+$/.test(formData.phone_number)) {
      newErrors.phone_number = 'Geçerli bir telefon numarası giriniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Form submit error:', error);
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Full Name */}
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
          Ad Soyad <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="full_name"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
            errors.full_name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Ahmet Yılmaz"
        />
        {errors.full_name && (
          <p className="mt-1 text-sm text-red-500">{errors.full_name}</p>
        )}
      </div>

      {/* Company Name */}
      <div>
        <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
          Şirket İsmi <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="company_name"
          name="company_name"
          value={formData.company_name}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
            errors.company_name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="ABC Ltd. Şti."
        />
        {errors.company_name && (
          <p className="mt-1 text-sm text-red-500">{errors.company_name}</p>
        )}
      </div>

      {/* Tax Office */}
      <div>
        <label htmlFor="tax_office" className="block text-sm font-medium text-gray-700 mb-1">
          Vergi Dairesi <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="tax_office"
          name="tax_office"
          value={formData.tax_office}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
            errors.tax_office ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Beyoğlu Vergi Dairesi"
        />
        {errors.tax_office && (
          <p className="mt-1 text-sm text-red-500">{errors.tax_office}</p>
        )}
      </div>

      {/* Tax Number */}
      <div>
        <label htmlFor="tax_number" className="block text-sm font-medium text-gray-700 mb-1">
          Vergi Numarası <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="tax_number"
          name="tax_number"
          value={formData.tax_number}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
            errors.tax_number ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="1234567890"
        />
        {errors.tax_number && (
          <p className="mt-1 text-sm text-red-500">{errors.tax_number}</p>
        )}
      </div>

      {/* Phone Number */}
      <div>
        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
          Telefon Numarası
        </label>
        <input
          type="tel"
          id="phone_number"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
            errors.phone_number ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="0532 123 45 67"
        />
        {errors.phone_number && (
          <p className="mt-1 text-sm text-red-500">{errors.phone_number}</p>
        )}
      </div>

      {/* Company Location */}
      <div>
        <label htmlFor="company_location" className="block text-sm font-medium text-gray-700 mb-1">
          Şirket Konumu
        </label>
        <input
          type="text"
          id="company_location"
          name="company_location"
          value={formData.company_location}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="İstanbul/Beyoğlu"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={isSubmitting}
        >
          İptal
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Kaydediliyor...' : customer ? 'Güncelle' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
