import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { customerService } from '../../services/customerService';
import { productService } from '../../services/productService';

const TAX_RATES = [0, 1, 8, 10, 18, 20];
const PAYMENT_DAYS = [7, 15, 30, 45, 60, 90];

const emptyItem = () => ({ description: '', product_id: '', quantity: 1, unit_price: 0, total_price: 0 });

export default function InvoiceForm({ onSubmit, onClose, isLoading }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const today = new Date().toISOString().split('T')[0];
  const defaultDue = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const [form, setForm] = useState({
    customer_id: '',
    issue_date: today,
    due_date: defaultDue,
    tax_rate: 18,
    discount_amount: 0,
    notes: '',
    status: 'draft',
    items: [emptyItem()]
  });

  useEffect(() => {
    customerService.getAll({ limit: 200 }).then(r => setCustomers(r.data || [])).catch(() => {});
    productService.getAll({ limit: 200 }).then(r => setProducts(r.data || [])).catch(() => {});
  }, []);

  /* ─── item helpers ─── */
  const updateItem = (index, field, value) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };

    if (field === 'product_id' && value) {
      const prod = products.find(p => String(p.id) === String(value));
      if (prod) {
        items[index].description = prod.name;
        items[index].unit_price = parseFloat(prod.price) || 0;
        items[index].total_price = items[index].quantity * items[index].unit_price;
      }
    }
    if (field === 'quantity' || field === 'unit_price') {
      const qty = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(items[index].quantity) || 0;
      const price = field === 'unit_price' ? parseFloat(value) || 0 : parseFloat(items[index].unit_price) || 0;
      items[index].total_price = qty * price;
    }
    setForm(f => ({ ...f, items }));
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  /* ─── calculations ─── */
  const subtotal = form.items.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0);
  const discount = parseFloat(form.discount_amount) || 0;
  const taxable = subtotal - discount;
  const taxAmount = taxable * (parseFloat(form.tax_rate) / 100);
  const total = taxable + taxAmount;

  /* ─── submit ─── */
  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      customer_id: form.customer_id ? parseInt(form.customer_id) : null,
      subtotal,
      tax_rate: parseFloat(form.tax_rate),
      tax_amount: taxAmount,
      discount_amount: discount,
      total_amount: total,
      items: form.items.map(i => ({
        product_id: i.product_id ? parseInt(i.product_id) : null,
        description: i.description,
        quantity: parseInt(i.quantity) || 1,
        unit_price: parseFloat(i.unit_price) || 0,
        total_price: parseFloat(i.total_price) || 0
      }))
    };
    onSubmit(payload);
  };

  const setDueDays = (days) => {
    const d = new Date(form.issue_date);
    d.setDate(d.getDate() + days);
    setForm(f => ({ ...f, due_date: d.toISOString().split('T')[0] }));
  };

  const fmt = (n) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">Yeni Fatura Oluştur</h2>
            <p className="text-blue-100 text-sm">Fatura bilgilerini doldurun</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Row 1: Customer + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Müşteri</label>
              <select
                value={form.customer_id}
                onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Müşteri seçin (opsiyonel)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}{c.company_name ? ` — ${c.company_name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Fatura Durumu</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="draft">Taslak</option>
                <option value="sent">Gönderildi</option>
                <option value="paid">Ödendi</option>
              </select>
            </div>
          </div>

          {/* Row 2: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Düzenleme Tarihi</label>
              <input
                type="date"
                value={form.issue_date}
                onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Vade Tarihi</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex gap-1 mt-1">
                {PAYMENT_DAYS.map(d => (
                  <button type="button" key={d} onClick={() => setDueDays(d)}
                    className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 hover:bg-blue-100 text-gray-600 dark:text-gray-300 hover:text-blue-700 rounded transition">
                    {d}g
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Kalemler</h3>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
                <Plus size={16} /> Kalem Ekle
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left w-1/3">Açıklama</th>
                    <th className="px-3 py-2 text-left w-1/4">Ürün (Opsiyonel)</th>
                    <th className="px-3 py-2 text-right w-16">Adet</th>
                    <th className="px-3 py-2 text-right w-28">Birim Fiyat (₺)</th>
                    <th className="px-3 py-2 text-right w-28">Toplam (₺)</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => updateItem(i, 'description', e.target.value)}
                          placeholder="Ürün/Hizmet açıklaması"
                          required
                          className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.product_id}
                          onChange={e => updateItem(i, 'product_id', e.target.value)}
                          className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-1 focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="">Seçin</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min="1" value={item.quantity}
                          onChange={e => updateItem(i, 'quantity', e.target.value)}
                          className="w-full text-right border border-gray-200 dark:border-gray-700 rounded px-1 py-1 focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min="0" step="0.01" value={item.unit_price}
                          onChange={e => updateItem(i, 'unit_price', e.target.value)}
                          className="w-full text-right border border-gray-200 dark:border-gray-700 rounded px-1 py-1 focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-200">
                        {fmt(item.total_price)}
                      </td>
                      <td className="px-2 py-2">
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)}
                            className="text-red-400 hover:text-red-600 transition">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals + Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Notlar</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={4}
                placeholder="Fatura notu, ödeme talimatları..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Ara Toplam</span>
                <span className="font-medium">₺{fmt(subtotal)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400 w-28">İndirim (₺)</span>
                <input
                  type="number" min="0" step="0.01" value={form.discount_amount}
                  onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))}
                  className="w-24 text-right border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm ml-auto"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400 w-28">KDV (%)</span>
                <select
                  value={form.tax_rate}
                  onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
                  className="w-24 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm ml-auto"
                >
                  {TAX_RATES.map(r => <option key={r} value={r}>%{r}</option>)}
                </select>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">KDV Tutarı</span>
                <span className="font-medium">₺{fmt(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2 text-gray-900 dark:text-gray-100">
                <span>Genel Toplam</span>
                <span className="text-blue-700 text-lg">₺{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose}
              className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-800/50 transition text-sm font-medium">
              İptal
            </button>
            <button type="submit" disabled={isLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2">
              {isLoading ? (
                <><span className="animate-spin">⏳</span> Kaydediliyor...</>
              ) : (
                <>💾 Fatura Oluştur</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
