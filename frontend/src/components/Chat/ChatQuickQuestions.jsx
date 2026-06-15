import { useState } from 'react';
import useAuthStore from '../../store/authStore';

const ALL_CATEGORIES = [
  {
    key: 'analiz',
    label: '🧠 Analiz',
    roles: ['admin', 'super_admin', 'manager'],
    questions: [
      { icon: '📈', label: 'Bu ay vs geçen ay', text: 'Bu ayı geçen ayla karşılaştır: sipariş sayısı ve gelir' },
      { icon: '⚠️', label: 'Ödeme riski', text: 'Ödeme riski yüksek müşterilerimi analiz et' },
      { icon: '📋', label: 'Borç yaşlandırma', text: 'Vadesi geçmiş çeklerimi yaş gruplarına göre raporla: 0-30, 31-60, 61-90, 90+ gün' },
      { icon: '🔄', label: 'Tedarik önerisi', text: 'Hangi ürünler için tedarik yapmalıyım? Stok ve satış hızına göre değerlendir' },
      { icon: '📊', label: 'Genel özet', text: 'Sistemin genel durumunu özetle: siparişler, stok uyarıları ve vadesi geçmiş çekler' },
      { icon: '📅', label: 'Haftalık özet', text: 'Bu haftaki sipariş, gelir ve çek durumunu özetle' },
    ],
  },
  {
    key: 'finans',
    label: '💰 Finans',
    roles: ['admin', 'super_admin', 'manager', 'user'],
    questions: [
      { icon: '💰', label: 'Finansal durum', text: 'Bu ayın finansal durumunu özetle', roles: ['admin', 'super_admin', 'manager'] },
      { icon: '🔴', label: 'Vadesi geçmiş çekler', text: 'Vadesi geçmiş çeklerimi göster ve toplam tutarını söyle' },
      { icon: '⏳', label: 'Bekleyen çekler', text: 'Bekleyen çeklerimi listele ve yaklaşan vadeleri söyle' },
      { icon: '📅', label: 'Bu hafta vadesi dolanlar', text: 'Önümüzdeki 7 gün içinde vadesi dolacak çekler hangileri?' },
      { icon: '💱', label: 'Döviz kurları', text: 'Güncel dolar, euro ve sterlin kurlarını söyle' },
      { icon: '🧾', label: 'Fatura özeti', text: 'Bekleyen ve vadesi geçmiş faturaları göster' },
    ],
  },
  {
    key: 'siparisler',
    label: '🛒 Siparişler',
    roles: ['admin', 'super_admin', 'manager', 'user'],
    questions: [
      { icon: '📋', label: 'Tüm siparişler', text: 'Siparişlerimi listele' },
      { icon: '⏳', label: 'Bekleyen siparişler', text: 'Bekleyen siparişlerim var mı? Listele' },
      { icon: '✅', label: 'Tamamlananlar', text: 'Tamamlanan siparişleri göster' },
      { icon: '❌', label: 'İptal edilenler', text: 'İptal edilen siparişleri listele' },
      { icon: '📅', label: 'Bu ay', text: 'Bu ay kaç sipariş verildi ve toplam tutarı nedir?' },
      { icon: '📦', label: 'Sipariş oluştur', text: 'Yeni sipariş oluştur' },
    ],
  },
  {
    key: 'stok',
    label: '📦 Stok',
    roles: ['admin', 'super_admin', 'manager', 'user'],
    questions: [
      { icon: '🚨', label: 'Kritik stok', text: 'Stok seviyesi kritik olan ürünleri listele' },
      { icon: '🔝', label: 'En çok satan', text: 'En çok satan ürünler hangileri?' },
      { icon: '🏭', label: 'Depo durumu', text: 'Depodaki stok miktarlarını göster' },
      { icon: '💎', label: 'Envanter değeri', text: 'Toplam envanter değerimi hesapla ve kategorilere göre dağılımı söyle' },
      { icon: '📉', label: 'Negatif stok', text: 'Stoku negatife düşmüş ürünler var mı?' },
    ],
  },
  {
    key: 'musteriler',
    label: '👥 Müşteriler',
    roles: ['admin', 'super_admin', 'manager', 'user'],
    questions: [
      { icon: '⭐', label: 'En iyi müşteriler', text: 'En iyi müşterilerim kimler? Gelire göre sırala', roles: ['admin', 'super_admin', 'manager'] },
      { icon: '📋', label: 'Müşteri listesi', text: 'Müşterilerimi listele' },
      { icon: '🔍', label: 'Müşteri ara', text: 'Müşteri listemi göster' },
      { icon: '➕', label: 'Müşteri ekle', text: 'Yeni müşteri ekle' },
    ],
  },
];

// Müşteri portalı için özel kategoriler
const CUSTOMER_CATEGORIES = [
  {
    key: 'siparislerim',
    label: '🛒 Siparişlerim',
    questions: [
      { icon: '📋', label: 'Tüm siparişlerim', text: 'Siparişlerimi listele' },
      { icon: '⏳', label: 'Bekleyen', text: 'Bekleyen siparişlerim var mı?' },
      { icon: '✅', label: 'Tamamlanan', text: 'Tamamlanan siparişlerimi göster' },
      { icon: '📊', label: 'Sipariş özeti', text: 'Sipariş geçmişimi özetle' },
    ],
  },
  {
    key: 'ceklerim',
    label: '💳 Çeklerim',
    questions: [
      { icon: '📋', label: 'Tüm çeklerim', text: 'Çeklerimi listele' },
      { icon: '⏳', label: 'Bekleyen çekler', text: 'Bekleyen çeklerim hangileri?' },
      { icon: '✅', label: 'Ödenen çekler', text: 'Ödenmiş çeklerimi göster' },
      { icon: '📅', label: 'Vadesi yaklaşan', text: 'Bu hafta vadesi dolacak çeklerim var mı?' },
    ],
  },
  {
    key: 'urunler',
    label: '📦 Ürünler',
    questions: [
      { icon: '🔍', label: 'Ürün kataloğu', text: 'Ürün kataloğunu göster' },
      { icon: '🔝', label: 'Popüler ürünler', text: 'En popüler ürünler hangileri?' },
    ],
  },
];

export default function ChatQuickQuestions({ onSelect, disabled }) {
  const { user } = useAuthStore();
  const role = user?.role || 'user';

  const isCustomer = role === 'customer';
  const categories = isCustomer
    ? CUSTOMER_CATEGORIES
    : ALL_CATEGORIES.filter(cat => !cat.roles || cat.roles.includes(role));

  const [activeTab, setActiveTab] = useState(categories[0]?.key || '');
  const active = categories.find(c => c.key === activeTab) || categories[0];

  if (!active) return null;

  const visibleQuestions = isCustomer
    ? active.questions
    : active.questions.filter(q => !q.roles || q.roles.includes(role));

  return (
    <div className="space-y-2">
      {/* Tab başlıkları */}
      <div className="flex gap-1 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === cat.key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Soru butonları */}
      <div className="grid grid-cols-2 gap-2">
        {visibleQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q.text)}
            disabled={disabled}
            className="flex items-center gap-2 px-3 py-2 text-left text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 dark:hover:border-violet-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-base flex-shrink-0">{q.icon}</span>
            <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{q.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
