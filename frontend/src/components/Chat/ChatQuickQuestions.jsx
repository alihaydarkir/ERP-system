import { useState } from 'react';
import useAuthStore from '../../store/authStore';

const ALL_CATEGORIES = [
  {
    key: 'analiz',
    label: '🧠 Analiz',
    roles: ['admin', 'super_admin', 'manager'],
    questions: [
      { icon: '📈', label: 'Bu ay vs geçen ay', text: 'Bu ayı geçen ayla karşılaştır: sipariş sayısı, gelir ve yeni müşteriler' },
      { icon: '⚠️', label: 'Risk analizi', text: 'Ödeme riski yüksek müşterilerimi analiz et' },
      { icon: '📋', label: 'Borç yaşlandırma', text: 'Vadesi geçmiş çeklerimi yaş gruplarına göre raporla: 0-30, 31-60, 61-90, 90+ gün' },
      { icon: '🔄', label: 'Reorder önerisi', text: 'Hangi ürünler için sipariş vermeliyim? Stok ve satış hızına göre analiz yap' },
    ],
  },
  {
    key: 'finans',
    label: '💰 Finans',
    roles: ['admin', 'super_admin', 'manager', 'user'],
    questions: [
      { icon: '💰', label: 'Finansal özet', text: 'Bu ay finansal durumumu analiz et', roles: ['admin', 'super_admin', 'manager'] },
      { icon: '⚠️', label: 'Vadesi geçmiş çekler', text: 'Vadesi geçmiş çeklerimi göster ve toplam tutarını söyle' },
      { icon: '📋', label: 'Bekleyen çekler', text: 'Bekleyen çeklerimi listele' },
      { icon: '🧾', label: 'Fatura özeti', text: 'Fatura durumumu ve bekleyen faturaları göster' },
    ],
  },
  {
    key: 'stok',
    label: '📦 Stok',
    roles: ['admin', 'super_admin', 'manager', 'user'],
    questions: [
      { icon: '🚨', label: 'Kritik stok + öneri', text: 'Kritik stoktaki ürünleri göster ve hangileri için sipariş önerirsin?' },
      { icon: '🔝', label: 'En çok satan', text: 'En çok satan ürünler hangileri?' },
      { icon: '🏭', label: 'Depo durumu', text: 'Depo stoklarını göster' },
      { icon: '💎', label: 'Envanter değeri', text: 'Toplam envanter değerimi hesapla ve en değerli ürünleri sırala' },
    ],
  },
  {
    key: 'musteriler',
    label: '👥 Müşteriler',
    roles: ['admin', 'super_admin', 'manager', 'user'],
    questions: [
      { icon: '⭐', label: 'En iyi müşteri', text: 'En iyi müşterilerim kimler? Gelire göre sırala' },
      { icon: '📊', label: 'Genel özet', text: 'Sistemin genel durumunu özetle: siparişler, müşteriler, stok uyarıları, vadesi geçmiş çekler' },
      { icon: '🛒', label: 'Bu ay siparişler', text: 'Bu ay sipariş durumumu özetle' },
      { icon: '✅', label: 'Tamamlanan', text: 'Tamamlanan siparişler neler?' },
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
    ],
  },
  {
    key: 'urunler',
    label: '📦 Ürünler',
    questions: [
      { icon: '🔍', label: 'Ürün ara', text: 'Ürün kataloğunu göster' },
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
