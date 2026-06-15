import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { aiService } from '../../services/aiService';
import useAuthStore from '../../store/authStore';
import useChatSocket from '../../hooks/useChatSocket';
import ChatInlineForm from './ChatInlineForm';
import ChatSelectionList from './ChatSelectionList';
import { CheckCircle, XCircle } from 'lucide-react';

const BOT_AVATAR = '🤖';

// ── Inline message bubble ──────────────────────────────────────
function WidgetMessage({ msg, isLastAi, approvalState, onApprove, onReject, loading, onFormSubmit, onFormCancel, onSelectionPick }) {
  const isUser = msg.role === 'user';

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: '#6366f1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, marginRight: 6, flexShrink: 0, alignSelf: 'flex-end',
        }}>{BOT_AVATAR}</div>
      )}
      <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Text bubble */}
        <div style={{
          padding: '8px 12px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser ? '#6366f1' : 'var(--bg-secondary, #f1f5f9)',
          color: isUser ? '#fff' : 'var(--text-primary, #1e293b)',
          fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
        }}>
          {msg.text}
        </div>

        {/* Inline form */}
        {msg.formTool && !isUser && (
          <ChatInlineForm
            toolName={msg.formTool}
            onSubmit={onFormSubmit}
            onCancel={onFormCancel}
            loading={loading}
          />
        )}

        {/* Selection list */}
        {msg.selectionRequired && !isUser && onSelectionPick && (
          <ChatSelectionList
            selection={msg.selectionRequired}
            onSelect={onSelectionPick}
            loading={loading}
          />
        )}

        {/* Approval buttons on last AI message */}
        {isLastAi && approvalState?.requiresApproval && !isUser && (
          <div style={{
            background: 'var(--bg-secondary, #fef3c7)',
            border: '1px solid #fcd34d',
            borderRadius: 10,
            padding: '8px 12px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <span style={{ fontSize: 11, color: '#92400e' }}>
              ⏳ Bu işlem onayınızı bekliyor
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={onReject}
                disabled={loading}
                style={{
                  flex: 1, padding: '5px 0', fontSize: 12, borderRadius: 8,
                  border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <XCircle size={12} /> Reddet
              </button>
              <button
                onClick={onApprove}
                disabled={loading}
                style={{
                  flex: 1, padding: '5px 0', fontSize: 12, borderRadius: 8,
                  border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <CheckCircle size={12} /> Onayla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────
export default function FloatingChatWidget() {
  const location = useLocation();
  const { user } = useAuthStore();
  const welcomeText = user?.role === 'customer'
    ? 'Merhaba! Siparişleriniz, çekleriniz ve ürün kataloğu hakkında yardımcı olabilirim. Ne öğrenmek istersiniz?'
    : 'Merhaba! Ben Helix-Ware ERP Pro\'nun AI asistanıyım. 🤖\n\nÇeklerinizi, siparişlerinizi, müşterilerinizi ve finansal verilerinizi analiz edebilirim. Ne öğrenmek istersiniz?';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', text: welcomeText }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [approvalState, setApprovalState] = useState(null);
  const pendingMsgIdRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // ── WebSocket approval updates ─────────────────────────────
  const handleApprovalUpdate = useCallback((payload) => {
    setApprovalState((prev) => {
      if (prev && prev.approvalId && Number(prev.approvalId) !== Number(payload.approval_id)) return prev;
      return {
        approvalId: payload.approval_id,
        status: payload.status,
        tool: payload.agent_tool,
        requiresApproval: payload.status === 'pending'
      };
    });

    if (['approved', 'executed', 'rejected', 'failed'].includes(payload.status)) {
      const tool = payload.agent_tool || 'İşlem';
      const text =
        payload.status === 'approved' || payload.status === 'executed'
          ? `✅ ${tool} başarıyla tamamlandı.`
          : payload.status === 'failed'
          ? `❌ ${tool} yürütülemedi: ${payload.execution_error || payload.error || 'Bilinmeyen hata'}`
          : `❌ ${tool} reddedildi.`;

      setApprovalState(null);
      const savedId = pendingMsgIdRef.current;
      pendingMsgIdRef.current = null;
      if (savedId) {
        setMessages((msgs) => msgs.map((m) => m.id === savedId ? { ...m, text } : m));
      } else {
        setMessages((msgs) => [...msgs, { id: Date.now(), role: 'ai', text }]);
      }
      if (!open) setUnread((n) => n + 1);

      if (['approved', 'executed'].includes(payload.status)) {
        window.dispatchEvent(new CustomEvent('erp:data_changed', { detail: { tool } }));
      }
    }
  }, [open]);

  useChatSocket({ onApprovalUpdate: handleApprovalUpdate });

  // ── Send message ───────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;

    setInput('');
    const userMsg = { id: Date.now(), role: 'user', text: msgText };
    const thinkingId = Date.now() + 1;
    setMessages((prev) => [...prev, userMsg, { id: thinkingId, role: 'thinking', text: '' }]);
    setLoading(true);

    try {
      const data = await aiService.agentChat(msgText);
      const agentMeta = data?.meta?.agent || {};
      const answer = data?.answer || 'Yanıt alınamadı.';

      if (agentMeta.form_tool) {
        setMessages((prev) => prev.map((m) =>
          m.id === thinkingId ? { id: thinkingId, role: 'ai', text: answer, formTool: agentMeta.form_tool } : m
        ));
        if (!open) setUnread((n) => n + 1);
        return;
      }

      if (agentMeta.selection_required) {
        setMessages((prev) => prev.map((m) =>
          m.id === thinkingId ? { id: thinkingId, role: 'ai', text: answer, selectionRequired: agentMeta.selection_required } : m
        ));
        if (!open) setUnread((n) => n + 1);
        return;
      }

      if (agentMeta.requires_approval || agentMeta.requires_human_approval) {
        pendingMsgIdRef.current = thinkingId;
        setApprovalState({
          approvalId: agentMeta.approval_id || null,
          status: 'pending',
          tool: agentMeta.mutation_tool || null,
          requiresApproval: true,
          pendingMsgId: thinkingId
        });
      }

      const aiMsg = { id: thinkingId, role: 'ai', text: answer };
      setMessages((prev) => prev.map((m) => m.id === thinkingId ? aiMsg : m));
      if (!open) setUnread((n) => n + 1);
    } catch (err) {
      const errText = `❌ Hata: ${err.responseData?.message || err.message || 'Bilinmeyen hata'}`;
      setMessages((prev) => prev.map((m) =>
        m.id === thinkingId ? { id: thinkingId, role: 'ai', text: errText } : m
      ));
    } finally {
      setLoading(false);
    }
  }, [input, loading, open]);

  // ── Form handlers ──────────────────────────────────────────
  const handleFormSubmit = async (args) => {
    const formMsg = [...messages].reverse().find((m) => m.formTool);
    if (!formMsg) return;
    const toolName = formMsg.formTool;

    setMessages((prev) => prev.map((m) => m.id === formMsg.id ? { ...m, formTool: null } : m));
    setLoading(true);

    try {
      const result = await aiService.executeTool(toolName, args);
      const agentMeta = result?.meta || {};
      const text = result?.answer || '✅ İşlem tamamlandı.';

      const newMsgId = Date.now();
      if (agentMeta.requires_human_approval) {
        pendingMsgIdRef.current = newMsgId;
        setApprovalState({ approvalId: agentMeta.approval_id, status: 'pending', tool: toolName, requiresApproval: true, pendingMsgId: newMsgId });
      } else {
        window.dispatchEvent(new CustomEvent('erp:data_changed', { detail: { tool: toolName } }));
      }

      setMessages((prev) => [...prev, { id: newMsgId, role: 'ai', text }]);
      if (!open) setUnread((n) => n + 1);
    } catch (err) {
      const reason = err?.responseData?.message || err?.message || 'Bilinmeyen hata';
      setMessages((prev) => [...prev, { id: Date.now(), role: 'ai', text: `❌ İşlem başarısız: ${reason}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormCancel = () => {
    setMessages((prev) => prev.map((m) => m.formTool ? { ...m, formTool: null } : m));
    setMessages((prev) => [...prev, { id: Date.now(), role: 'ai', text: 'Form iptal edildi.' }]);
  };

  // ── Selection pick handler ─────────────────────────────────
  const handleSelectionPick = async (item, selection) => {
    setMessages((prev) => prev.map((m) => m.selectionRequired ? { ...m, selectionRequired: null } : m));
    const userPickMsg = { id: Date.now(), role: 'user', text: item.label };
    setMessages((prev) => [...prev, userPickMsg]);
    setLoading(true);

    const args = { [selection.id_field]: item.id, ...(selection.action_args || {}) };
    try {
      const result = await aiService.executeTool(selection.action, args);
      const agentMeta = result?.meta || {};
      const text = result?.answer || '✅ İşlem tamamlandı.';

      const selMsgId = Date.now();
      if (agentMeta.requires_human_approval) {
        pendingMsgIdRef.current = selMsgId;
        setApprovalState({ approvalId: agentMeta.approval_id, status: 'pending', tool: selection.action, requiresApproval: true, pendingMsgId: selMsgId });
      } else {
        window.dispatchEvent(new CustomEvent('erp:data_changed', { detail: { tool: selection.action } }));
      }

      setMessages((prev) => [...prev, { id: selMsgId, role: 'ai', text }]);
      if (!open) setUnread((n) => n + 1);
    } catch (err) {
      const reason = err?.responseData?.message || err?.message || 'Bilinmeyen hata';
      setMessages((prev) => [...prev, { id: Date.now(), role: 'ai', text: `❌ İşlem başarısız: ${reason}` }]);
    } finally {
      setLoading(false);
    }
  };

  // ── Approval handlers ─────────────────────────────────────
  const handleApprove = async () => {
    if (!approvalState?.approvalId) return;
    setApprovalState(null);
    try {
      await aiService.approveAction(approvalState.approvalId);
    } catch { /* WS handles result */ }
  };

  const handleReject = async () => {
    const id = approvalState?.approvalId;
    setApprovalState(null);
    if (id) { try { await aiService.rejectAction(id); } catch { /* ignore */ } }
    setMessages((prev) => [...prev, { id: Date.now(), role: 'ai', text: '❌ İşlem iptal edildi.' }]);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Derive last AI message id for approval buttons
  const lastAiMsgId = [...messages].reverse().find((m) => m.role === 'ai')?.id;
  const lastSelectionMsgId = [...messages].reverse().find((m) => m.selectionRequired)?.id;
  const lastFormMsgId = [...messages].reverse().find((m) => m.formTool)?.id;

  if (location.pathname === '/chat') return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, fontFamily: 'inherit' }}>
      {/* Chat Paneli */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 64, right: 0,
          width: 380, maxHeight: 560,
          background: 'var(--bg-primary, #fff)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: '1px solid var(--border-color, #e2e8f0)',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>ERP Asistanı</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>
                  {approvalState?.requiresApproval ? '⏳ Onay Bekleniyor' : 'Çevrimiçi'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
                color: '#fff', cursor: 'pointer', width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}
            >✕</button>
          </div>

          {/* Mesajlar */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', background: 'var(--bg-primary, #fff)' }}>
            {messages.map((msg) => {
              if (msg.role === 'thinking') {
                return (
                  <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
                    <div style={{ background: 'var(--bg-secondary, #f1f5f9)', borderRadius: '16px 16px 16px 4px', padding: '8px 14px', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
                      Düşünüyor...
                    </div>
                  </div>
                );
              }

              const isLastAi = msg.id === lastAiMsgId;
              const isActiveForm = msg.id === lastFormMsgId && msg.formTool;
              const isActiveSelection = msg.id === lastSelectionMsgId && msg.selectionRequired;

              return (
                <WidgetMessage
                  key={msg.id}
                  msg={msg}
                  isLastAi={isLastAi}
                  approvalState={isLastAi ? approvalState : null}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  loading={loading}
                  onFormSubmit={isActiveForm ? handleFormSubmit : undefined}
                  onFormCancel={isActiveForm ? handleFormCancel : undefined}
                  onSelectionPick={isActiveSelection ? handleSelectionPick : undefined}
                />
              );
            })}

            {loading && messages[messages.length - 1]?.role !== 'thinking' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
                <div style={{ background: 'var(--bg-secondary, #f1f5f9)', borderRadius: '16px 16px 16px 4px', padding: '8px 14px', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
                  Yazıyor...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px', borderTop: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--bg-primary, #fff)', display: 'flex', gap: 8, flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Sorunuzu yazın..."
              rows={1}
              style={{
                flex: 1, resize: 'none',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: 10, padding: '8px 12px', fontSize: 13,
                outline: 'none', fontFamily: 'inherit',
                background: 'var(--bg-secondary, #f8fafc)',
                color: 'var(--text-primary, #1e293b)',
                maxHeight: 80,
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading ? '#6366f1' : '#cbd5e1',
                color: '#fff', border: 'none', borderRadius: 10,
                width: 38, height: 38, flexShrink: 0, alignSelf: 'flex-end',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, transition: 'background 0.2s',
              }}
            >➤</button>
          </div>
        </div>
      )}

      {/* Floating Buton */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="ERP Asistanı"
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: open ? '#8b5cf6' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, boxShadow: '0 4px 16px rgba(99,102,241,0.5)',
          transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? '✕' : '🤖'}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#ef4444', color: '#fff', borderRadius: '50%',
            width: 20, height: 20, fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
    </div>
  );
}
