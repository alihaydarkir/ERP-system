import { useState, useEffect } from 'react';

export default function SupplierForm({ supplier, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    tax_number: '',
    phone_number: '',
    location: '',
    payment_terms: 'Net 30',
    lead_time_days: 7,
    min_order_quantity: 1,
    risk_level: 'Medium',
    website: '',
    notes: '',
    is_active: true,
    rating: 5.0
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        company_name: supplier.company_name || '',
        contact_name: supplier.contact_name || '',
        email: supplier.email || '',
        tax_number: supplier.tax_number || '',
        phone_number: supplier.phone_number || '',
        location: supplier.location || '',
        payment_terms: supplier.payment_terms || 'Net 30',
        lead_time_days: supplier.lead_time_days || 7,
        min_order_quantity: supplier.min_order_quantity || 1,
        risk_level: supplier.risk_level || 'Medium',
        website: supplier.website || '',
        notes: supplier.notes || '',
        is_active: supplier.is_active !== undefined ? supplier.is_active : true,
        rating: supplier.rating || 5.0
      });
    }
  }, [supplier]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.company_name || formData.company_name.length < 3) {
      newErrors.company_name = 'Şirket İsmi en az 3 karakter olmalıdır';
    }

    if (!formData.tax_number || formData.tax_number.length < 10) {
      newErrors.tax_number = 'Vergi Numarası en az 10 karakter olmalıdır';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    if (formData.phone_number && !/^[0-9+\-() ]+$/.test(formData.phone_number)) {
      newErrors.phone_number = 'Geçerli bir telefon numarası giriniz';
    }

    if (formData.lead_time_days < 0) {
      newErrors.lead_time_days = 'Lead time negatif olamaz';
    }

    if (formData.min_order_quantity < 1) {
      newErrors.min_order_quantity = 'Minimum sipariş miktarı en az 1 olmalıdır';
    }

    if (formData.rating < 0 || formData.rating > 5) {
      newErrors.rating = 'Rating 0-5 arasında olmalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Temel Bilgiler</h3>

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
            placeholder="XYZ Gıda Ltd."
          />
          {errors.company_name && (
            <p className="mt-1 text-sm text-red-500">{errors.company_name}</p>
          )}
        </div>

        {/* Contact Name */}
        <div>
          <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">
            İletişim Kişisi
          </label>
          <input
            type="text"
            id="contact_name"
            name="contact_name"
            value={formData.contact_name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Mehmet Kaya"
          />
        </div>

        {/* Email and Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="info@xyz.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="text"
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

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Lokasyon
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Ankara/Çankaya"
          />
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="https://www.example.com"
          />
        </div>
      </div>

      {/* Business Terms */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">İş Koşulları</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Payment Terms */}
          <div>
            <label htmlFor="payment_terms" className="block text-sm font-medium text-gray-700 mb-1">
              Ödeme Koşulları
            </label>
            <select
              id="payment_terms"
              name="payment_terms"
              value={formData.payment_terms}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Peşin">Peşin</option>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 60">Net 60</option>
              <option value="Net 90">Net 90</option>
            </select>
          </div>

          {/* Lead Time Days */}
          <div>
            <label htmlFor="lead_time_days" className="block text-sm font-medium text-gray-700 mb-1">
              Tedarik Süresi (Gün)
            </label>
            <input
              type="number"
              id="lead_time_days"
              name="lead_time_days"
              value={formData.lead_time_days}
              onChange={handleChange}
              min="0"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                errors.lead_time_days ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.lead_time_days && (
              <p className="mt-1 text-sm text-red-500">{errors.lead_time_days}</p>
            )}
          </div>

          {/* Min Order Quantity */}
          <div>
            <label htmlFor="min_order_quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Sipariş Miktarı
            </label>
            <input
              type="number"
              id="min_order_quantity"
              name="min_order_quantity"
              value={formData.min_order_quantity}
              onChange={handleChange}
              min="1"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                errors.min_order_quantity ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.min_order_quantity && (
              <p className="mt-1 text-sm text-red-500">{errors.min_order_quantity}</p>
            )}
          </div>

          {/* Risk Level */}
          <div>
            <label htmlFor="risk_level" className="block text-sm font-medium text-gray-700 mb-1">
              Risk Seviyesi
            </label>
            <select
              id="risk_level"
              name="risk_level"
              value={formData.risk_level}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Low">Düşük</option>
              <option value="Medium">Orta</option>
              <option value="High">Yüksek</option>
            </select>
          </div>

          {/* Rating */}
          <div>
            <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1">
              Değerlendirme (0-5)
            </label>
            <input
              type="number"
              id="rating"
              name="rating"
              value={formData.rating}
              onChange={handleChange}
              min="0"
              max="5"
              step="0.1"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                errors.rating ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.rating && (
              <p className="mt-1 text-sm text-red-500">{errors.rating}</p>
            )}
          </div>

          {/* Is Active */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
              Aktif
            </label>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notlar
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Tedarikçi hakkında notlar..."
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
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
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Kaydediliyor...' : supplier ? 'Güncelle' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
