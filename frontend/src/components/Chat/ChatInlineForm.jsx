import { useState } from 'react';
import { Send, X } from 'lucide-react';

const FORM_CONFIGS = {
  create_cheque: {
    title: 'Çek Ekle',
    icon: '🧾',
    fields: [
      { key: 'check_serial_no', label: 'Seri No', type: 'text', required: true, placeholder: 'örn. SN-2024-001' },
      { key: 'check_issuer', label: 'Keşideci (Düzenleyen)', type: 'text', required: true, placeholder: 'Ad Soyad veya Şirket' },
      { key: 'customer_identifier', label: 'Müşteri', type: 'text', required: true, placeholder: 'Müşteri adı veya şirketi' },
      { key: 'bank_name', label: 'Banka', type: 'text', required: true, placeholder: 'örn. Garanti Bankası' },
      { key: 'due_date', label: 'Vade Tarihi', type: 'date', required: true },
      { key: 'amount', label: 'Tutar', type: 'number', required: true, placeholder: '0.00', min: 0 },
      { key: 'currency', label: 'Para Birimi', type: 'select', required: false, options: ['TRY', 'USD', 'EUR'], default: 'TRY' },
    ],
  },
  create_order: {
    title: 'Sipariş Oluştur',
    icon: '🛒',
    fields: [
      { key: 'customer_identifier', label: 'Müşteri', type: 'text', required: true, placeholder: 'Müşteri adı veya şirketi' },
      { key: 'notes', label: 'Notlar', type: 'textarea', required: false, placeholder: 'İsteğe bağlı sipariş notu' },
    ],
  },
  create_product: {
    title: 'Ürün Ekle',
    icon: '📦',
    fields: [
      { key: 'name', label: 'Ürün Adı', type: 'text', required: true, placeholder: 'Ürün adı' },
      { key: 'sku', label: 'SKU / Kod', type: 'text', required: true, placeholder: 'örn. URN-001' },
      { key: 'price', label: 'Fiyat (TRY)', type: 'number', required: true, placeholder: '0.00', min: 0 },
      { key: 'stock_quantity', label: 'Stok Miktarı', type: 'number', required: false, placeholder: '0', min: 0, default: 0 },
      { key: 'category', label: 'Kategori', type: 'text', required: false, placeholder: 'örn. Elektronik' },
    ],
  },
  create_customer: {
    title: 'Müşteri Ekle',
    icon: '👤',
    fields: [
      { key: 'full_name', label: 'Ad Soyad', type: 'text', required: true, placeholder: 'Ad Soyad' },
      { key: 'company_name', label: 'Şirket Adı', type: 'text', required: false, placeholder: 'Şirket adı' },
      { key: 'phone_number', label: 'Telefon', type: 'text', required: false, placeholder: '0555 000 00 00' },
      { key: 'email', label: 'E-posta', type: 'text', required: false, placeholder: 'ornek@mail.com' },
      { key: 'company_location', label: 'Adres / Şehir', type: 'text', required: false, placeholder: 'İstanbul' },
    ],
  },
};

function buildInitialValues(fields) {
  return Object.fromEntries(fields.map((f) => [f.key, f.default ?? '']));
}

export default function ChatInlineForm({ toolName, onSubmit, onCancel, loading }) {
  const config = FORM_CONFIGS[toolName];
  if (!config) return null;

  const [values, setValues] = useState(() => buildInitialValues(config.fields));
  const [errors, setErrors] = useState({});

  const set = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const errs = {};
    config.fields.forEach((f) => {
      if (f.required && !String(values[f.key] ?? '').trim()) {
        errs[f.key] = `${f.label} zorunlu`;
      }
    });
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Convert numeric fields
    const args = { ...values };
    config.fields.forEach((f) => {
      if (f.type === 'number' && args[f.key] !== '') {
        args[f.key] = Number(args[f.key]);
      }
    });
    onSubmit(args);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 border border-blue-200 dark:border-blue-800 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
        <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
          {config.icon} {config.title}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
        >
          <X size={15} />
        </button>
      </div>

      {/* Fields */}
      <div className="p-4 bg-white dark:bg-gray-800 grid grid-cols-2 gap-3">
        {config.fields.map((field) => (
          <div
            key={field.key}
            className={field.type === 'textarea' ? 'col-span-2' : ''}
          >
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {field.type === 'select' ? (
              <select
                value={values[field.key]}
                onChange={(e) => set(field.key, e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                value={values[field.key]}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={2}
                className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
            ) : (
              <input
                type={field.type}
                value={values[field.key]}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                min={field.min}
                step={field.type === 'number' ? 'any' : undefined}
                className={`w-full text-sm rounded-lg border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors[field.key]
                    ? 'border-red-400 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            )}

            {errors[field.key] && (
              <p className="text-[10px] text-red-500 mt-0.5">{errors[field.key]}</p>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={12} />
          {loading ? 'Gönderiliyor...' : 'Gönder'}
        </button>
      </div>
    </form>
  );
}
