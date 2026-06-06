import { useCallback, useEffect, useRef, useState } from 'react';
import { aiService } from '../services/aiService';

const TIMEOUT_SECONDS = 45;
import ChatInput from '../components/Chat/ChatInput';
import ChatHeaderStatus from '../components/Chat/ChatHeaderStatus';
import ChatQuickQuestions from '../components/Chat/ChatQuickQuestions';
import ChatErrorBanner from '../components/Chat/ChatErrorBanner';
import ChatMessagesPanel from '../components/Chat/ChatMessagesPanel';
import useChatSocket from '../hooks/useChatSocket';

const CHAT_STORAGE_KEY = 'erp_chat_history';
const INITIAL_MESSAGE = {
  id: 1,
  type: 'ai',
  text: 'Merhaba! Ben ERP sisteminizin AI asistanıyım. 🤖\n\nÇeklerinizi, siparişlerinizi, müşterilerinizi ve finansal verilerinizi analiz edebilirim. Ne öğrenmek istersiniz?',
  timestamp: new Date(),
  steps: []
};

function loadMessages() {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [INITIAL_MESSAGE];
    const parsed = JSON.parse(raw);
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [INITIAL_MESSAGE];
  }
}

const QUICK_QUESTIONS = [
  { icon: '⚠️', label: 'Vadesi geçmiş çekler', text: 'Vadesi geçmiş çeklerimi göster ve toplam tutarını söyle' },
  { icon: '📊', label: 'Genel özet', text: 'Sistemin genel durumunu özetle: siparişler, müşteriler, stok uyarıları' },
  { icon: '💰', label: 'Finansal durum', text: 'Bu ay finansal durumumu analiz et' },
  { icon: '📦', label: 'Düşük stok', text: 'Hangi ürünlerin stoğu azaldı?' },
  { icon: '🛒', label: 'Bu ay siparişler', text: 'Bu ay sipariş durumumu özetle' },
  { icon: '📋', label: 'Bekleyen çekler', text: 'Bekleyen çeklerimi listele' }
];

export default function ChatPage() {
  const [messages, setMessages] = useState(loadMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [lastMessage, setLastMessage] = useState('');
  const [aiStatus, setAiStatus] = useState({ available: null, model: '' });
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [approvalState, setApprovalState] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const timeoutTimerRef = useRef(null);
  const elapsedTimerRef = useRef(null);

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

  useEffect(() => {
    try {
      // Keep last 30 messages to avoid storage bloat
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // storage full — ignore
    }
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

  const clearTimers = () => {
    clearTimeout(timeoutTimerRef.current);
    clearInterval(elapsedTimerRef.current);
    setElapsed(0);
  };

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

    // Abort controller for cancel-on-timeout
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Elapsed counter shown in thinking bubble
    let secs = 0;
    elapsedTimerRef.current = setInterval(() => {
      secs += 1;
      setElapsed(secs);
    }, 1000);

    // Hard timeout — abort request and show error
    timeoutTimerRef.current = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_SECONDS * 1000);

    try {
      const data = await aiService.agentChat(messageText, { signal: controller.signal });
      const agentMeta = data?.meta?.agent || {};
      const aiMsg = {
        id: thinkingId,
        type: 'ai',
        text: data?.answer || 'Bir hata oluştu.',
        timestamp: new Date(),
        steps: data?.steps || [],
        model: data?.model
      };

      if (agentMeta.requires_approval || agentMeta.requires_human_approval) {
        setApprovalState({
          approvalId: agentMeta.approval_id || null,
          status: 'pending',
          tool: agentMeta.mutation_tool || null,
          requiresApproval: true
        });
      }

      if (agentMeta.mutation_executed || agentMeta.cancelled_pending_mutation) {
        setPendingConfirmation(null);
        setApprovalState(null);
      }

      setMessages(prev => prev.map(m => m.id === thinkingId ? aiMsg : m));
    } catch (error) {
      const isAborted = error.name === 'AbortError' || error.code === 'ERR_CANCELED';
      const isTimeout = isAborted || error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const is503 = error.status === 503;

      const errText = isTimeout
        ? `⏳ AI ${TIMEOUT_SECONDS} saniyede yanıt veremedi. "Tekrar Dene" butonuna basın.`
        : is503
        ? '⚠️ AI servisi şu an çevrimdışı.'
        : `❌ Hata: ${error.responseData?.message || error.message || 'Bilinmeyen hata'}`;

      setChatError(isTimeout ? 'timeout' : error.responseData?.message || error.message || 'AI yanıt üretilemedi.');
      setMessages(prev => prev.map(m => m.id === thinkingId ? { ...m, type: 'ai', text: errText, steps: [] } : m));
    } finally {
      clearTimers();
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleConfirmMutation = async () => {
    if (!approvalState?.approvalId) return;
    try {
      await aiService.approveAction(approvalState.approvalId);
      setApprovalState(null);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        text: '✅ İşlem onaylandı.',
        timestamp: new Date(),
        steps: []
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        text: '❌ Onaylama sırasında hata oluştu.',
        timestamp: new Date(),
        steps: []
      }]);
    }
  };

  const handleCancelMutation = async () => {
    if (approvalState?.approvalId) {
      try { await aiService.rejectAction(approvalState.approvalId); } catch { /* ignore */ }
    }
    setApprovalState(null);
    setPendingConfirmation(null);
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'ai',
      text: '❌ İşlem iptal edildi.',
      timestamp: new Date(),
      steps: []
    }]);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 gap-4">
      <ChatHeaderStatus aiStatus={aiStatus} approvalState={approvalState} />

      <ChatErrorBanner
        chatError={chatError === 'timeout' ? `AI ${TIMEOUT_SECONDS} saniyede yanıt veremedi.` : chatError}
        onRetry={() => { setChatError(''); lastMessage && sendMessage(lastMessage); }}
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
        elapsed={elapsed}
        timeoutSeconds={TIMEOUT_SECONDS}
        approvalState={approvalState}
        messagesEndRef={messagesEndRef}
        onApprove={handleConfirmMutation}
        onReject={handleCancelMutation}
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

