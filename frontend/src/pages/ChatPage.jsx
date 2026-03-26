import { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/aiService';

// ── Araç ikonu ─────────────────────────────────────────────────────────────
const TOOL_ICONS = {
  get_dashboard_summary: '📊',
  search_cheques: '📋',
  get_overdue_cheques: '⚠️',
  get_financial_summary: '💰',
  get_low_stock_products: '📦',
  search_products: '🔍',
  search_customers: '👥',
  get_orders_summary: '🛒',
  set_product_stock: '📦',
  deactivate_product: '🛑',
  cancel_order: '🚫',
  set_cheque_status: '💳',
  create_customer: '👤',
  update_customer: '📝',
  create_product: '🆕',
  update_product: '✏️',
  create_supplier: '🏭',
  update_supplier: '🧾',
  create_warehouse: '🏬',
  update_warehouse: '📍',
  create_cheque: '🧷',
  set_order_status: '📌',
  set_invoice_status: '🧾',
  default: '🔧'
};

const TOOL_LABELS = {
  get_dashboard_summary: 'Dashboard özeti getiriliyor',
  search_cheques: 'Çekler aranıyor',
  get_overdue_cheques: 'Vadesi geçmiş çekler getiriliyor',
  get_financial_summary: 'Finansal özet hesaplanıyor',
  get_low_stock_products: 'Düşük stok kontrol ediliyor',
  search_products: 'Ürünler aranıyor',
  search_customers: 'Müşteriler aranıyor',
  get_orders_summary: 'Sipariş özeti getiriliyor',
  set_product_stock: 'Ürün stoğu güncelleniyor',
  deactivate_product: 'Ürün pasif duruma alınıyor',
  cancel_order: 'Sipariş iptal ediliyor',
  set_cheque_status: 'Çek durumu güncelleniyor',
  create_customer: 'Müşteri oluşturuluyor',
  update_customer: 'Müşteri güncelleniyor',
  create_product: 'Ürün oluşturuluyor',
  update_product: 'Ürün güncelleniyor',
  create_supplier: 'Tedarikçi oluşturuluyor',
  update_supplier: 'Tedarikçi güncelleniyor',
  create_warehouse: 'Depo oluşturuluyor',
  update_warehouse: 'Depo güncelleniyor',
  create_cheque: 'Çek oluşturuluyor',
  set_order_status: 'Sipariş durumu güncelleniyor',
  set_invoice_status: 'Fatura durumu güncelleniyor',
  default: 'Veri getiriliyor'
};

const QUICK_QUESTIONS = [
  { icon: '⚠️', label: 'Vadesi geçmiş çekler', text: 'Vadesi geçmiş çeklerimi göster ve toplam tutarını söyle' },
  { icon: '📊', label: 'Genel özet', text: 'Sistemin genel durumunu özetle: siparişler, müşteriler, stok uyarıları' },
  { icon: '💰', label: 'Finansal durum', text: 'Bu ay finansal durumumu analiz et' },
  { icon: '📦', label: 'Düşük stok', text: 'Hangi ürünlerin stoğu azaldı?' },
  { icon: '🛒', label: 'Bu ay siparişler', text: 'Bu ay sipariş durumumu özetle' },
  { icon: '📋', label: 'Bekleyen çekler', text: 'Bekleyen çeklerimi listele' },
];

function ToolStep({ step }) {
  const icon = TOOL_ICONS[step.tool] || TOOL_ICONS.default;
  const label = TOOL_LABELS[step.tool] || TOOL_LABELS.default;
  if (step.type === 'tool_call') {
    return (
      <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5 w-fit">
        <span>{icon}</span>
        <span className="font-medium">{label}...</span>
        <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (step.type === 'tool_result') {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-1.5 w-fit">
        <span>{icon}</span>
        <span className="font-medium">{label.replace('...', '')} ✓</span>
      </div>
    );
  }
  if (step.type === 'tool_error') {
    return (
      <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-1.5 w-fit">
        <span>❌</span>
        <span className="font-medium">Hata: {step.error}</span>
      </div>
    );
  }
  return null;
}

function ChatMessage({ message }) {
  const isUser = message.type === 'user';
  const isThinking = message.type === 'thinking';

  if (isThinking) {
    return (
      <div className="flex justify-start">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm max-w-[85%]">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-base">🤖</span>
            <span className="font-medium">AI Düşünüyor</span>
          </div>
          {message.steps && message.steps.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {message.steps.map((step, i) => <ToolStep key={i} step={step} />)}
            </div>
          )}
          {message.loading && (
            <div className="flex space-x-1 mt-1">
              {[0, 0.2, 0.4].map((delay, i) => (
                <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${isUser ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100'}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🤖</span>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">ERP Asistanı</span>
            {message.model && <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-500 px-1.5 py-0.5 rounded-full">{message.model}</span>}
          </div>
        )}
        {message.steps && message.steps.filter(s => s.type === 'tool_result' || s.type === 'tool_error').length > 0 && (
          <div className="space-y-1 mb-2">
            {message.steps.filter(s => s.type === 'tool_result' || s.type === 'tool_error').map((step, i) => <ToolStep key={i} step={step} />)}
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
        <p className={`text-xs mt-1.5 ${isUser ? 'text-blue-100' : 'text-gray-400 dark:text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: 'Merhaba! Ben ERP sisteminizin AI asistanıyım. 🤖\n\nÇeklerinizi, siparişlerinizi, müşterilerinizi ve finansal verilerinizi analiz edebilirim. Ne öğrenmek istersiniz?',
      timestamp: new Date(),
      steps: []
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState({ available: null, model: '' });
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const messagesEndRef = useRef(null);
  const thinkingIdRef = useRef(null);

  useEffect(() => {
    const checkAI = async () => {
      try {
        const res = await aiService.getHealth();
        setAiStatus({ available: res.data?.available ?? false, model: res.data?.currentModel || 'llama2' });
      } catch {
        setAiStatus({ available: false, model: '' });
      }
    };
    checkAI();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const messageText = text || inputMessage.trim();
    if (!messageText || loading) return;
    setInputMessage('');

    const userMsg = { id: Date.now(), type: 'user', text: messageText, timestamp: new Date() };
    const thinkingId = Date.now() + 1;
    thinkingIdRef.current = thinkingId;
    const thinkingMsg = { id: thinkingId, type: 'thinking', text: '', timestamp: new Date(), steps: [], loading: true };

    setMessages(prev => [...prev, userMsg, thinkingMsg]);
    setLoading(true);

    try {
      const data = await aiService.agentChat(messageText);
      const agentMeta = data?.meta?.agent || {};
      const aiMsg = {
        id: thinkingId,
        type: 'ai',
        text: data?.answer || 'Bir hata oluştu.',
        timestamp: new Date(),
        steps: data?.steps || [],
        model: data?.model
      };

      if (agentMeta.requires_confirmation) {
        setPendingConfirmation({
          preview: agentMeta.confirmation_preview || data?.answer || 'Onay gerekiyor',
          tool: agentMeta.mutation_tool || null
        });
      }

      if (agentMeta.mutation_executed || agentMeta.cancelled_pending_mutation || agentMeta.confirmation_expired) {
        setPendingConfirmation(null);
      }

      setMessages(prev => prev.map(m => m.id === thinkingId ? aiMsg : m));
    } catch (error) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const is503 = error.status === 503;
      const errText = isTimeout
        ? '⏳ AI yanıt verme süresi doldu. Model meşgul olabilir, lütfen tekrar deneyin.'
        : is503
        ? '⚠️ AI servisi şu an çevrimdışı.\n\nOllama\'yı başlatmak için: `ollama serve`'
        : `❌ Hata: ${error.responseData?.message || error.message || 'Bilinmeyen hata'}`;
      const errMsg = {
        id: thinkingId,
        type: 'ai',
        text: errText,
        timestamp: new Date(),
        steps: []
      };
      setMessages(prev => prev.map(m => m.id === thinkingId ? errMsg : m));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleConfirmMutation = () => {
    if (!loading) sendMessage('onaylıyorum');
  };

  const handleCancelMutation = () => {
    if (!loading) sendMessage('vazgeç');
    setPendingConfirmation(null);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 gap-4">
      {pendingConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⚠️</span>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">İşlem Onayı</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{pendingConfirmation.preview}</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelMutation}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-800/50 disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmMutation}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🤖 ERP AI Asistanı</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">ERP verilerinizi anlayıp analiz eden akıllı asistan</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          aiStatus.available === null ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400'
          : aiStatus.available ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            aiStatus.available === null ? 'bg-gray-400 animate-pulse'
            : aiStatus.available ? 'bg-green-50 dark:bg-green-900/200'
            : 'bg-red-50 dark:bg-red-900/200'
          }`} />
          {aiStatus.available === null ? 'Kontrol ediliyor...'
            : aiStatus.available ? `Çevrimiçi · ${aiStatus.model}`
            : 'Ollama Çevrimdışı'}
        </div>
      </div>

      {/* Hızlı Sorular */}
      <div className="grid grid-cols-3 gap-2">
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q.text)} disabled={loading || !aiStatus.available}
            className="flex items-center gap-2 px-3 py-2 text-left text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:bg-blue-900/20 transition disabled:opacity-40 disabled:cursor-not-allowed">
            <span>{q.icon}</span>
            <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{q.label}</span>
          </button>
        ))}
      </div>

      {/* Mesajlar */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-2xl overflow-y-auto p-4 space-y-4" style={{ maxHeight: '50vh' }}>
        {messages.map(message => <ChatMessage key={message.id} message={message} />)}
        <div ref={messagesEndRef} />
      </div>

      {/* Giriş */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-3">
        <div className="flex gap-3 items-end">
          <textarea
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={aiStatus.available === false ? 'Ollama çevrimdışı — "ollama serve" çalıştırın' : 'Sorunuzu yazın... (Ör: Vadesi geçmiş çeklerimi göster)'}
            rows={2}
            disabled={loading || !aiStatus.available}
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !inputMessage.trim() || !aiStatus.available}
            className="px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed h-[52px] flex items-center gap-2"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <span>Gönder</span>}
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-400 mt-1.5 text-center">Enter ile gönder · Shift+Enter ile yeni satır</p>
      </div>
    </div>
  );
}

