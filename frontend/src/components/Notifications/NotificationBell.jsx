import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

const BADGE_COLORS = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { notifications, alerts, unreadCount, topSeverity, markAllRead, markRead, clear } = useNotifications();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Esc ile kapat
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleOpen = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        title="Bildirimler ve uyarılar"
        aria-label={`Bildirimler${unreadCount > 0 ? ` (${unreadCount} dikkat gerektiren)` : ''}`}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full ${BADGE_COLORS[topSeverity] || BADGE_COLORS.info} text-white text-[10px] font-bold leading-none shadow-md ${topSeverity === 'critical' ? 'animate-pulse' : ''}`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          notifications={notifications}
          alerts={alerts}
          onMarkAllRead={() => { markAllRead(); }}
          onMarkRead={markRead}
          onClear={clear}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
