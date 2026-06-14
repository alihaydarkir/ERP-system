import React, { useState, useEffect } from 'react';
import customerService from '../../services/customerService';

const TURKISH_BANKS = [
  'Akbank', 'Albaraka Türk', 'Anadolubank', 'Denizbank', 'Fibabanka',
  'Garanti BBVA', 'Halkbank', 'HSBC', 'ING', 'İş Bankası', 'Kuveyt Türk',
  'Odeabank', 'QNB Finansbank', 'Şekerbank', 'TEB', 'Türkiye Finans',
  'Vakıfbank', 'Yapı Kredi', 'Ziraat Bankası', 'Ziraat Katılım',
].sort();

export default function BankTransferForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    customer_id: '',
    bank_name: '',
    receipt_no: '',
    transfer_date: new Date().toISOString().split('T')[0],
    amount: '',
    notes: '',
  });
  const [customers, setCustomers] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    customerService.getAll({ limit: 1000 })
      .then((r) => setCustomers(r.data || []))
      .catch(() => {});
  }, []);

  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.customer_id) e.customer_id = 'Müşteri seçin';
    if (!form.bank_name) e.bank_name = 'Banka seçin';
    if (!form.transfer_date) e.transfer_date = 'Tarih gerekli';
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Geçerli tutar girin';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        customer_id: Number(form.customer_id),
        bank_name: form.bank_name,
        receipt_no: form.receipt_no || null,
        transfer_date: form.transfer_date,
        amount: Number(form.amount),
        notes: form.notes || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (err) =>
    `w-full px-3 py-2 border ${err ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🏦 Yeni Banka Havalesi</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Müşteri */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Havaleyi Yapan Müşteri <span className="text-red-500">*</span>
            </label>
            <select value={form.customer_id} onChange={(e) => set('customer_id', e.target.value)} className={inputCls(errors.customer_id)}>
              <option value="">Müşteri Seçin</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || c.full_name}{c.tax_number ? ` (${c.tax_number})` : ''}
                </option>
              ))}
            </select>
            {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>}
          </div>

          {/* Banka */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Banka <span className="text-red-500">*</span>
            </label>
            <select value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} className={inputCls(errors.bank_name)}>
              <option value="">Banka Seçin</option>
              {TURKISH_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            {errors.bank_name && <p className="text-red-500 text-xs mt-1">{errors.bank_name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Dekont No */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Dekont No</label>
              <input type="text" value={form.receipt_no} onChange={(e) => set('receipt_no', e.target.value)} placeholder="DEK-12345" className={inputCls()} />
            </div>
            {/* Tarih */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Tarih <span className="text-red-500">*</span>
              </label>
              <input type="date" value={form.transfer_date} onChange={(e) => set('transfer_date', e.target.value)} className={inputCls(errors.transfer_date)} />
            </div>
          </div>

          {/* Tutar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Tutar (₺) <span className="text-red-500">*</span>
            </label>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="5000.00" className={inputCls(errors.amount)} />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>

          {/* Notlar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Notlar</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows="2" className={inputCls()} placeholder="Açıklama..." />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            ℹ️ Havale kaydedilince tutar müşterinin cari hesabından düşülür.
          </p>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              İptal
            </button>
            <button type="submit" disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
