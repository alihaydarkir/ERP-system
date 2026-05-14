import { useCallback, useEffect, useRef, useState } from 'react';
import { aiService } from '../services/aiService';
import ChatInput from '../components/Chat/ChatInput';
import ChatApprovalBanner from '../components/Chat/ChatApprovalBanner';
import ChatHeaderStatus from '../components/Chat/ChatHeaderStatus';
import ChatQuickQuestions from '../components/Chat/ChatQuickQuestions';
import ChatErrorBanner from '../components/Chat/ChatErrorBanner';
import ChatMessagesPanel from '../components/Chat/ChatMessagesPanel';
import useChatSocket from '../hooks/useChatSocket';

const QUICK_QUESTIONS = [
  { icon: '⚠️', label: 'Vadesi geçmiş çekler', text: 'Vadesi geçmiş çeklerimi göster ve toplam tutarını söyle' },
  { icon: '📊', label: 'Genel özet', text: 'Sistemin genel durumunu özetle: siparişler, müşteriler, stok uyarıları' },
  { icon: '💰', label: 'Finansal durum', text: 'Bu ay finansal durumumu analiz et' },
  { icon: '📦', label: 'Düşük stok', text: 'Hangi ürünlerin stoğu azaldı?' },
  { icon: '🛒', label: 'Bu ay siparişler', text: 'Bu ay sipariş durumumu özetle' },
  { icon: '📋', label: 'Bekleyen çekler', text: 'Bekleyen çeklerimi listele' }
];

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
  const [chatError, setChatError] = useState('');
  const [lastMessage, setLastMessage] = useState('');
  const [aiStatus, setAiStatus] = useState({ available: null, model: '' });
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [approvalState, setApprovalState] = useState(null);
  const messagesEndRef = useRef(null);

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

  const handleApprovalUpdate = useCallback((payload) => {
      setApprovalState((prev) => {
        if (prev && prev.approvalId && Number(prev.approvalId) !== Number(payload.approval_id)) {
          return prev;
        }

        return {
          approvalId: payload.approval_id,
          status: payload.status,
          tool: payload.agent_tool,
          requiresApproval: payload.status === 'pending'
        };
      });

      if (payload.status === 'approved' || payload.status === 'rejected') {
        const text = payload.status === 'approved'
          ? `✅ Onaylandı: ${payload.agent_tool || 'işlem'} işlemi onaylandı.`
          : `❌ Reddedildi: ${payload.agent_tool || 'işlem'} işlemi reddedildi.`;

        setMessages((prev) => ([
          ...prev,
          {
            id: Date.now() + Math.random(),
            type: 'ai',
            text,
            timestamp: new Date(),
            steps: []
          }
        ]));
      }
  }, []);

  useChatSocket({ onApprovalUpdate: handleApprovalUpdate });

  const sendMessage = async (text) => {
    const messageText = text || inputMessage.trim();
    if (!messageText || loading) return;
    setInputMessage('');
    setChatError('');
    setLastMessage(messageText);

    const userMsg = { id: Date.now(), type: 'user', text: messageText, timestamp: new Date() };
    const thinkingId = Date.now() + 1;
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

      if (agentMeta.requires_approval || agentMeta.requires_human_approval) {
        setApprovalState({
          approvalId: agentMeta.approval_id || null,
          status: 'pending',
          tool: agentMeta.mutation_tool || null,
          requiresApproval: true
        });
      }

      if (agentMeta.mutation_executed || agentMeta.cancelled_pending_mutation || agentMeta.confirmation_expired) {
        setPendingConfirmation(null);
        setApprovalState(null);
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
      setChatError(error.responseData?.message || error.message || 'AI yanıt üretilemedi.');
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

  const handleConfirmMutation = () => {
    if (!loading) sendMessage('onaylıyorum');
  };

  const handleCancelMutation = () => {
    if (!loading) sendMessage('vazgeç');
    setPendingConfirmation(null);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 gap-4">
      <ChatApprovalBanner
        pendingConfirmation={pendingConfirmation}
        loading={loading}
        onApprove={handleConfirmMutation}
        onReject={handleCancelMutation}
      />

      <ChatHeaderStatus aiStatus={aiStatus} approvalState={approvalState} />

      <ChatErrorBanner
        chatError={chatError}
        onRetry={() => lastMessage && sendMessage(lastMessage)}
        canRetry={Boolean(lastMessage)}
        loading={loading}
      />

      <ChatQuickQuestions
        questions={QUICK_QUESTIONS}
        onSelect={sendMessage}
        disabled={loading || !aiStatus.available}
      />

      <ChatMessagesPanel
        messages={messages}
        loading={loading}
        approvalState={approvalState}
        messagesEndRef={messagesEndRef}
      />

      <ChatInput
        value={inputMessage}
        onChange={setInputMessage}
        onSend={() => sendMessage()}
        disabled={loading || !aiStatus.available}
        loading={loading}
        placeholder={aiStatus.available === false ? 'Ollama çevrimdışı — "ollama serve" çalıştırın' : 'Sorunuzu yazın... (Ör: Vadesi geçmiş çeklerimi göster)'}
      />
    </div>
  );
}

