import { useState, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import api from '../../services/api';

// Fetches list options once (cached per session by endpoint key)
const remoteCache = {};
async function fetchRemoteOptions(endpoint) {
  if (remoteCache[endpoint]) return remoteCache[endpoint];
  try {
    const res = await api.get(`/api${endpoint}`);
    const data = res.data?.data || res.data || [];
    const list = Array.isArray(data) ? data : (data.customers || data.products || data.items || []);
    remoteCache[endpoint] = list;
    return list;
  } catch {
    return [];
  }
}

// Field definitions — type: 'remote_select' fetches options from endpoint
const FORM_CONFIGS = {
  create_cheque: {
    title: 'Çek Ekle',
    icon: '🧾',
    fields: [
      { key: 'check_serial_no',    label: 'Seri No',               type: 'text',          required: true,  placeholder: 'örn. CHK-2026-001' },
      { key: 'check_issuer',       label: 'Keşideci (Düzenleyen)', type: 'text',          required: true,  placeholder: 'Ad Soyad veya Şirket' },
      { key: 'customer_identifier',label: 'Müşteri',               type: 'remote_select', required: true,  endpoint: '/customers?limit=100', labelKey: 'full_name', valueKey: 'full_name', subLabel: 'company_name' },
      { key: 'bank_name',          label: 'Banka',                 type: 'select',        required: true,  options: ['Ziraat Bankası','İş Bankası','Garanti BBVA','Yapı Kredi','Akbank','Halkbank','Vakıfbank','Denizbank','QNB Finansbank','TEB'] },
      { key: 'due_date',           label: 'Vade Tarihi',           type: 'date',          required: true },
      { key: 'amount',             label: 'Tutar (TL)',            type: 'number',        required: true,  placeholder: '0.00', min: 0.01 },
      { key: 'currency',           label: 'Para Birimi',           type: 'select',        required: false, options: ['TRY', 'USD', 'EUR'], default: 'TRY' },
    ],
  },

  create_order: {
    title: 'Sipariş Oluştur',
    icon: '🛒',
    fields: [
      { key: 'customer_identifier', label: 'Müşteri',      type: 'remote_select', required: true,  endpoint: '/customers?limit=100', labelKey: 'full_name', valueKey: 'full_name', subLabel: 'company_name' },
      { key: 'product_identifier',  label: 'Ürün',         type: 'remote_select', required: false, endpoint: '/products?limit=100&is_active=true', labelKey: 'name', valueKey: 'name', subLabel: 'sku', priceKey: 'price' },
      { key: 'quantity',            label: 'Miktar',        type: 'number',        required: false, placeholder: '1', min: 1, default: '1' },
      { key: 'unit_price',          label: 'Birim Fiyat (TL)', type: 'number',    required: false, placeholder: 'Ürün seçince otomatik dolar', min: 0 },
    ],
  },

  create_product: {
    title: 'Ürün Ekle',
    icon: '📦',
    fields: [
      { key: 'name',           label: 'Ürün Adı',       type: 'text',   required: true,  placeholder: 'Ürün adı' },
      { key: 'sku',            label: 'SKU / Kod',      type: 'text',   required: true,  placeholder: 'örn. URN-001' },
      { key: 'category',       label: 'Kategori',       type: 'select', required: false, options: ['Elektronik','Tekstil','İnşaat','Gıda','Makine','Diğer'], default: 'Diğer' },
      { key: 'price',          label: 'Fiyat (TL)',     type: 'number', required: true,  placeholder: '0.00', min: 0.01 },
      { key: 'stock_quantity', label: 'Stok Miktarı',  type: 'number', required: false, placeholder: '0', min: 0, default: '0' },
      { key: 'low_stock_threshold', label: 'Stok Uyarı Eşiği', type: 'number', required: false, placeholder: '10', min: 0, default: '10' },
    ],
  },

  create_customer: {
    title: 'Müşteri Ekle',
    icon: '👤',
    fields: [
      { key: 'full_name',         label: 'Ad Soyad',         type: 'text', required: true,  placeholder: 'Ad Soyad' },
      { key: 'company_name',      label: 'Şirket Adı',       type: 'text', required: true,  placeholder: 'Şirket adı' },
      { key: 'tax_office',        label: 'Vergi Dairesi',    type: 'text', required: true,  placeholder: 'örn. Kadıköy VD' },
      { key: 'tax_number',        label: 'Vergi No',         type: 'text', required: true,  placeholder: '10 haneli vergi no' },
      { key: 'phone_number',      label: 'Telefon',          type: 'text', required: false, placeholder: '0555 000 00 00' },
      { key: 'company_location',  label: 'Şehir / Adres',   type: 'text', required: false, placeholder: 'İstanbul' },
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
  // remote_select options: { [fieldKey]: [{label, value, sub?, price?}] }
  const [remoteOptions, setRemoteOptions] = useState({});

  // Fetch remote options on mount
  useEffect(() => {
    config.fields.filter((f) => f.type === 'remote_select').forEach(async (f) => {
      const raw = await fetchRemoteOptions(f.endpoint);
      const opts = raw.map((item) => ({
        label: item[f.labelKey] || '',
        value: item[f.valueKey] || '',
        sub: f.subLabel ? item[f.subLabel] : null,
        price: f.priceKey ? item[f.priceKey] : null,
      })).filter((o) => o.value);
      setRemoteOptions((prev) => ({ ...prev, [f.key]: opts }));
    });
  }, [toolName]);

  const set = (key, val, extraUpdates = {}) => {
    setValues((prev) => ({ ...prev, [key]: val, ...extraUpdates }));
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

    const args = { ...values };
    config.fields.forEach((f) => {
      if (f.type === 'number' && args[f.key] !== '') {
        args[f.key] = Number(args[f.key]);
      }
    });
    // Remove empty optional fields
    Object.keys(args).forEach((k) => {
      if (args[k] === '' || args[k] === null) delete args[k];
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
        <button type="button" onClick={onCancel} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300">
          <X size={15} />
        </button>
      </div>

      {/* Fields */}
      <div className="p-4 bg-white dark:bg-gray-800 grid grid-cols-2 gap-3">
        {config.fields.map((field) => {
          const isWide = field.type === 'textarea' || field.key === 'customer_identifier' || field.key === 'product_identifier';
          return (
            <div key={field.key} className={isWide ? 'col-span-2' : ''}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>

              {field.type === 'remote_select' ? (
                <select
                  value={values[field.key]}
                  onChange={(e) => {
                    const selectedOpt = (remoteOptions[field.key] || []).find((o) => o.value === e.target.value);
                    const extraUpdates = {};
                    // Auto-fill unit_price from selected product
                    if (field.priceKey && selectedOpt?.price != null) {
                      extraUpdates['unit_price'] = String(selectedOpt.price);
                    }
                    set(field.key, e.target.value, extraUpdates);
                  }}
                  className={`w-full text-sm rounded-lg border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors[field.key] ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="">{remoteOptions[field.key]?.length ? `— ${field.label} Seçin —` : 'Yükleniyor...'}</option>
                  {(remoteOptions[field.key] || []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}{o.sub ? ` (${o.sub})` : ''}{o.price ? ` — ${Number(o.price).toLocaleString('tr-TR')} TL` : ''}
                    </option>
                  ))}
                </select>
              ) : field.type === 'select' ? (
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
                  className={`w-full text-sm rounded-lg border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors[field.key] ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
              )}

              {errors[field.key] && (
                <p className="text-[10px] text-red-500 mt-0.5">{errors[field.key]}</p>
              )}
            </div>
          );
        })}
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
