import { useState, useEffect, useCallback } from 'react';
import { socket } from '../services/socket';
import api from '../services/api';

const MAX_NOTIFICATIONS = 50;
const ALERT_REFRESH_MS = 2 * 60 * 1000;
const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

const LABELS = {
  'order:created':          { title: 'Yeni Sipariş',        icon: '🛒' },
  'order:updated':          { title: 'Sipariş Güncellendi',  icon: '📦' },
  'order:status_changed':   { title: 'Sipariş Durumu',       icon: '🔄' },
  'product:low_stock':      { title: 'Düşük Stok Uyarısı',  icon: '⚠️' },
  'product:created':        { title: 'Yeni Ürün',            icon: '🆕' },
  'ai:approval_requested':  { title: 'Yönetici onayı bekleniyor', icon: '⏳' },
  notification:             { title: 'Bildirim',             icon: '🔔' },
};

// "notification" kanalından gelen olaylar payload.type ile ayrışır
const TYPE_LABELS = {
  ai_approval_required:   { title: 'Yönetici onayı bekleniyor', icon: '⏳', link: '/chat' },
  support_session_started:{ title: 'Destek oturumu açıldı',     icon: '🛠️', link: '/settings' },
  backup_security_event:  { title: 'Yedek güvenlik olayı',      icon: '🔐', link: '/settings' },
  new_order:              { title: 'Yeni sipariş',              icon: '🛒', link: '/orders' },
};

function resolveLink(eventType, payload) {
  if (TYPE_LABELS[payload?.type]) return TYPE_LABELS[payload.type].link;
  if (eventType === 'order:created' || eventType === 'order:updated' || eventType === 'order:status_changed')
    return '/orders';
  if (eventType === 'product:low_stock' || eventType === 'product:created')
    return '/products';
  if (eventType === 'ai:approval_requested')
    return '/chat';
  return null;
}

function makeNotification(eventType, payload) {
  const meta = TYPE_LABELS[payload?.type] || LABELS[eventType] || { title: 'Bildirim', icon: '🔔' };
  return {
    id: `${Date.now()}-${Math.random()}`,
    eventType,
    title: meta.title,
    icon: meta.icon,
    message: payload.message || payload.summary || buildMessage(eventType, payload),
    link: resolveLink(eventType, payload),
    payload,
    timestamp: new Date(),
    read: false,
  };
}

function buildMessage(eventType, p) {
  if (eventType === 'order:created')        return `Sipariş #${p.orderId || p.id || ''} oluşturuldu`;
  if (eventType === 'order:updated')        return `Sipariş #${p.orderId || p.id || ''} güncellendi`;
  if (eventType === 'order:status_changed') return `Sipariş durumu: ${p.status || ''}`;
  if (eventType === 'product:low_stock')    return `${p.productName || 'Ürün'} — kalan stok: ${p.stock ?? ''}`;
  if (eventType === 'product:created')      return `${p.name || 'Yeni ürün'} eklendi`;
  if (eventType === 'ai:approval_requested') return `${p.agent_tool || 'İşlem'} onayı gerekiyor`;
  if (p.type === 'support_session_started') return p.message || 'Destek ekibi oturum açtı';
  return p.type || 'Yeni bildirim';
}

const LISTENED_EVENTS = [
  'order:created',
  'order:updated',
  'order:status_changed',
  'product:low_stock',
  'product:created',
  'notification',
  // ai:approval_requested is handled inline in ChatPage, not as a bell notification
];

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  // Kalıcı uyarılar: sunucudaki gerçek verilerden hesaplanır (kritik stok, vadesi geçmiş çek...)
  const [alerts, setAlerts] = useState([]);

  const push = useCallback((eventType, payload) => {
    // Skip duplicate ai_approval_status_update type coming via 'notification' channel
    if (payload?.type === 'ai_approval_status_update') return;

    const notif = makeNotification(eventType, payload);
    setNotifications((prev) => [notif, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  const refreshAlerts = useCallback(async () => {
    try {
      const res = await api.get('/api/alerts');
      const list = res.data?.data?.alerts || [];
      setAlerts([...list].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)));
    } catch {
      // Uyarılar yüklenemezse zil boş kalır, uygulama etkilenmez
    }
  }, []);

  useEffect(() => {
    const handlers = LISTENED_EVENTS.map((ev) => {
      const fn = (payload) => push(ev, payload);
      socket.on(ev, fn);
      return { ev, fn };
    });

    return () => {
      handlers.forEach(({ ev, fn }) => socket.off(ev, fn));
    };
  }, [push]);

  // Uyarıları açılışta, düzenli aralıkla, veri değişince ve sekmeye dönünce yenile
  useEffect(() => {
    refreshAlerts();
    const timer = setInterval(refreshAlerts, ALERT_REFRESH_MS);
    const onChange = () => refreshAlerts();
    const onFocus = () => refreshAlerts();
    window.addEventListener('erp:data_changed', onChange);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('erp:data_changed', onChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshAlerts]);

  const unreadCount = notifications.filter((n) => !n.read).length + alerts.length;
  const topSeverity = alerts[0]?.severity || (notifications.some((n) => !n.read) ? 'info' : null);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  return { notifications, alerts, unreadCount, topSeverity, markAllRead, markRead, clear };
}
