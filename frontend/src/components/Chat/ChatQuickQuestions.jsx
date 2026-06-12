import { useState } from 'react';

const CATEGORIES = [
  {
    key: 'analiz',
    label: '🧠 Analiz',
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
    questions: [
      { icon: '💰', label: 'Finansal özet', text: 'Bu ay finansal durumumu analiz et' },
      { icon: '⚠️', label: 'Vadesi geçmiş çekler', text: 'Vadesi geçmiş çeklerimi göster ve toplam tutarını söyle' },
      { icon: '📋', label: 'Bekleyen çekler', text: 'Bekleyen çeklerimi listele' },
      { icon: '🧾', label: 'Fatura özeti', text: 'Fatura durumumu ve bekleyen faturaları göster' },
    ],
  },
  {
    key: 'stok',
    label: '📦 Stok',
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
    questions: [
      { icon: '⭐', label: 'En iyi müşteri', text: 'En iyi müşterilerim kimler? Gelire göre sırala' },
      { icon: '📊', label: 'Genel özet', text: 'Sistemin genel durumunu özetle: siparişler, müşteriler, stok uyarıları, vadesi geçmiş çekler' },
      { icon: '🛒', label: 'Bu ay siparişler', text: 'Bu ay sipariş durumumu özetle' },
      { icon: '✅', label: 'Tamamlanan', text: 'Tamamlanan siparişler neler?' },
    ],
  },
];

export default function ChatQuickQuestions({ onSelect, disabled }) {
  const [activeTab, setActiveTab] = useState('analiz');
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
        {active.questions.map((q, i) => (
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
