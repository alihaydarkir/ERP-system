import { useState } from 'react';

const CATEGORIES = [
  {
    key: 'finans',
    label: '💰 Finans',
    questions: [
      { icon: '💰', label: 'Finansal durum', text: 'Bu ay finansal durumumu analiz et' },
      { icon: '⚠️', label: 'Vadesi geçmiş çekler', text: 'Vadesi geçmiş çeklerimi göster ve toplam tutarını söyle' },
      { icon: '📋', label: 'Bekleyen çekler', text: 'Bekleyen çeklerimi listele' },
      { icon: '🧾', label: 'Fatura özeti', text: 'Fatura durumumu ve bekleyen faturaları göster' },
    ],
  },
  {
    key: 'stok',
    label: '📦 Stok',
    questions: [
      { icon: '📦', label: 'Düşük stok', text: 'Hangi ürünlerin stoğu kritik seviyeye düştü?' },
      { icon: '🔝', label: 'En çok satan', text: 'En çok satan ürünler hangileri?' },
      { icon: '📋', label: 'Ürün listesi', text: 'Tüm ürün listesini göster' },
      { icon: '🏭', label: 'Depo durumu', text: 'Depo stoklarını göster' },
    ],
  },
  {
    key: 'siparisler',
    label: '🛒 Siparişler',
    questions: [
      { icon: '📊', label: 'Genel özet', text: 'Sistemin genel durumunu özetle: siparişler, müşteriler, stok uyarıları' },
      { icon: '🛒', label: 'Bu ay siparişler', text: 'Bu ay sipariş durumumu özetle' },
      { icon: '⏳', label: 'Bekleyen', text: 'Bekleyen siparişleri listele' },
      { icon: '✅', label: 'Tamamlanan', text: 'Tamamlanan siparişler neler?' },
    ],
  },
  {
    key: 'musteriler',
    label: '👥 Müşteriler',
    questions: [
      { icon: '👥', label: 'Müşteri listesi', text: 'Müşteri listesini göster' },
      { icon: '⭐', label: 'En iyi müşteri', text: 'En iyi müşterilerim kimler?' },
      { icon: '📈', label: 'Müşteri sayısı', text: 'Kaç müşterimiz var?' },
      { icon: '🔍', label: 'Müşteri ara', text: 'Yılmaz müşterisini bul' },
    ],
  },
];

export default function ChatQuickQuestions({ onSelect, disabled }) {
  const [activeTab, setActiveTab] = useState('finans');
  const active = CATEGORIES.find(c => c.key === activeTab) || CATEGORIES[0];

  return (
    <div className="space-y-2">
      {/* Tab başlıkları */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === cat.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Soru butonları */}
      <div className="grid grid-cols-2 gap-2">
        {active.questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q.text)}
            disabled={disabled}
            className="flex items-center gap-2 px-3 py-2 text-left text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-base flex-shrink-0">{q.icon}</span>
            <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{q.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
