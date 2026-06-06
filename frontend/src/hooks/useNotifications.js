import { useState, useEffect, useCallback } from 'react';
import { socket } from '../services/socket';

const MAX_NOTIFICATIONS = 50;

const LABELS = {
  'order:created':          { title: 'Yeni Sipariş',        icon: '🛒' },
  'order:updated':          { title: 'Sipariş Güncellendi',  icon: '📦' },
  'order:status_changed':   { title: 'Sipariş Durumu',       icon: '🔄' },
  'product:low_stock':      { title: 'Düşük Stok Uyarısı',  icon: '⚠️' },
  'product:created':        { title: 'Yeni Ürün',            icon: '🆕' },
  'ai:approval_requested':  { title: 'Onay Bekleniyor',      icon: '🤖' },
  notification:             { title: 'Bildirim',             icon: '🔔' },
};

function resolveLink(eventType, payload) {
  if (eventType === 'order:created' || eventType === 'order:updated' || eventType === 'order:status_changed')
    return '/orders';
  if (eventType === 'product:low_stock' || eventType === 'product:created')
    return '/products';
  if (eventType === 'ai:approval_requested')
    return '/chat';
  return null;
}

function makeNotification(eventType, payload) {
  const meta = LABELS[eventType] || { title: 'Bildirim', icon: '🔔' };
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
  return p.type || 'Yeni bildirim';
}

const LISTENED_EVENTS = [
  'order:created',
  'order:updated',
  'order:status_changed',
  'product:low_stock',
  'product:created',
  'ai:approval_requested',
  'notification',
];

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const push = useCallback((eventType, payload) => {
    // Skip duplicate ai_approval_status_update type coming via 'notification' channel
    if (payload?.type === 'ai_approval_status_update') return;

    const notif = makeNotification(eventType, payload);
    setNotifications((prev) => [notif, ...prev].slice(0, MAX_NOTIFICATIONS));
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  return { notifications, unreadCount, markAllRead, markRead, clear };
}
