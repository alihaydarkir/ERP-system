import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { aiService } from '../../services/aiService';

const BOT_AVATAR = '🤖';

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 8,
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: '#6366f1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, marginRight: 6, flexShrink: 0, alignSelf: 'flex-end',
        }}>{BOT_AVATAR}</div>
      )}
      <div style={{
        maxWidth: '78%',
        padding: '8px 12px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? '#6366f1' : 'var(--bg-secondary, #f1f5f9)',
        color: isUser ? '#fff' : 'var(--text-primary, #1e293b)',
        fontSize: 13,
        lineHeight: 1.5,
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
      }}>
        {msg.text}
      </div>
    </div>
  );
}

export default function FloatingChatWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', text: 'Merhaba! Size nasıl yardımcı olabilirim?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
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

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await aiService.agentChat(text);
      const answer = data?.answer || 'Yanıt alınamadı.';
      const aiMsg = { id: Date.now() + 1, role: 'ai', text: answer };
      setMessages(prev => [...prev, aiMsg]);
      if (!open) setUnread(n => n + 1);
    } catch (err) {
      const errMsg = { id: Date.now() + 1, role: 'ai', text: `Hata: ${err.message}` };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, open]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (location.pathname === '/chat') return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, fontFamily: 'inherit' }}>
      {/* Chat Paneli */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: 64,
          right: 0,
          width: 360,
          height: 480,
          background: 'var(--bg-primary, #fff)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-color, #e2e8f0)',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>ERP Asistanı</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>erp-assistant · Çevrimiçi</div>
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
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px 14px',
            background: 'var(--bg-primary, #fff)',
          }}>
            {messages.map(msg => <Message key={msg.id} msg={msg} />)}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#6366f1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>🤖</div>
                <div style={{
                  background: 'var(--bg-secondary, #f1f5f9)',
                  borderRadius: '16px 16px 16px 4px',
                  padding: '8px 14px', fontSize: 13,
                  color: 'var(--text-secondary, #64748b)',
                }}>
                  <span style={{ animation: 'pulse 1s infinite' }}>Yazıyor...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--bg-primary, #fff)',
            display: 'flex',
            gap: 8,
            flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Sorunuzu yazın..."
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit',
                background: 'var(--bg-secondary, #f8fafc)',
                color: 'var(--text-primary, #1e293b)',
                maxHeight: 80,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading ? '#6366f1' : '#cbd5e1',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                width: 38,
                height: 38,
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
                alignSelf: 'flex-end',
                transition: 'background 0.2s',
              }}
            >➤</button>
          </div>
        </div>
      )}

      {/* Floating Buton */}
      <button
        onClick={() => setOpen(o => !o)}
        title="ERP Asistanı"
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: open ? '#8b5cf6' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          boxShadow: '0 4px 16px rgba(99,102,241,0.5)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          position: 'relative',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open ? '✕' : '🤖'}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute',
            top: -4, right: -4,
            background: '#ef4444',
            color: '#fff',
            borderRadius: '50%',
            width: 20, height: 20,
            fontSize: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700,
            border: '2px solid #fff',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
    </div>
  );
}
