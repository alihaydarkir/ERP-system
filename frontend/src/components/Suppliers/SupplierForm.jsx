import { useState, useEffect } from 'react';

export default function SupplierForm({ supplier, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    supplier_name: '',
    contact_person: '',
    email: '',
    tax_number: '',
    phone: '',
    address: '',
    tax_office: '',
    iban: '',
    payment_terms: '30 Gün Vade',
    currency: 'TRY',
    notes: '',
    is_active: true,
    rating: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        supplier_name: supplier.supplier_name || supplier.company_name || '',
        contact_person: supplier.contact_person || supplier.contact_name || '',
        email: supplier.email || '',
        tax_number: supplier.tax_number || '',
        phone: supplier.phone || supplier.phone_number || '',
        address: supplier.address || supplier.location || '',
        tax_office: supplier.tax_office || '',
        iban: supplier.iban || '',
        payment_terms: supplier.payment_terms || '30 Gün Vade',
        currency: supplier.currency || 'TRY',
        notes: supplier.notes || '',
        is_active: supplier.is_active !== undefined ? supplier.is_active : true,
        rating: supplier.rating || ''
      });
    }
  }, [supplier]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.supplier_name || formData.supplier_name.length < 3) {
      newErrors.supplier_name = 'Tedarikçi adı en az 3 karakter olmalıdır';
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

    console.log('Submitting supplier data:', formData);

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
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Temel Bilgiler</h3>

        {/* Supplier Name */}
        <div>
          <label htmlFor="supplier_name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Tedarikçi Adı <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="supplier_name"
            name="supplier_name"
            value={formData.supplier_name}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
              errors.supplier_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
            placeholder="XYZ Gıda Ltd."
          />
          {errors.supplier_name && (
            <p className="mt-1 text-sm text-red-500">{errors.supplier_name}</p>
          )}
        </div>

        {/* Contact Person */}
        <div>
          <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            İletişim Kişisi
          </label>
          <input
            type="text"
            id="contact_person"
            name="contact_person"
            value={formData.contact_person}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Mehmet Kaya"
          />
        </div>

        {/* Email and Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              E-posta
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
              placeholder="info@xyz.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Telefon
            </label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
              placeholder="0532 123 45 67"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Tax Number */}
        <div>
          <label htmlFor="tax_number" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Vergi Numarası <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="tax_number"
            name="tax_number"
            value={formData.tax_number}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
              errors.tax_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
            placeholder="1234567890"
          />
          {errors.tax_number && (
            <p className="mt-1 text-sm text-red-500">{errors.tax_number}</p>
          )}
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Lokasyon
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Ankara/Çankaya"
          />
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Website
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="https://www.example.com"
          />
        </div>
      </div>

      {/* Business Terms */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">İş Koşulları</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Payment Terms */}
          <div>
            <label htmlFor="payment_terms" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Ödeme Vadesi
            </label>
            <select
              id="payment_terms"
              name="payment_terms"
              value={formData.payment_terms}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="Peşin">Peşin</option>
              <option value="15 Gün Vade">15 Gün Vade</option>
              <option value="30 Gün Vade">30 Gün Vade</option>
              <option value="45 Gün Vade">45 Gün Vade</option>
              <option value="60 Gün Vade">60 Gün Vade</option>
              <option value="90 Gün Vade">90 Gün Vade</option>
            </select>
          </div>

          {/* Lead Time Days */}
          <div>
            <label htmlFor="lead_time_days" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
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
                errors.lead_time_days ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
            />
            {errors.lead_time_days && (
              <p className="mt-1 text-sm text-red-500">{errors.lead_time_days}</p>
            )}
          </div>

          {/* Min Order Quantity */}
          <div>
            <label htmlFor="min_order_quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
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
                errors.min_order_quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
            />
            {errors.min_order_quantity && (
              <p className="mt-1 text-sm text-red-500">{errors.min_order_quantity}</p>
            )}
          </div>

          {/* Risk Level */}
          <div>
            <label htmlFor="risk_level" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Risk Seviyesi
            </label>
            <select
              id="risk_level"
              name="risk_level"
              value={formData.risk_level}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="Low">Düşük</option>
              <option value="Medium">Orta</option>
              <option value="High">Yüksek</option>
            </select>
          </div>

          {/* Rating */}
          <div>
            <label htmlFor="rating" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
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
                errors.rating ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
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
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-200">
              Aktif
            </label>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Notlar
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Tedarikçi hakkında notlar..."
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-800/50 transition-colors"
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
