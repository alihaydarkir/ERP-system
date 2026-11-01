import { CheckCheck, Trash2, BellOff, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

const SEVERITY_STYLES = {
  critical: 'border-l-4 border-red-500 bg-red-50/60 dark:bg-red-900/10',
  warning: 'border-l-4 border-amber-500 bg-amber-50/60 dark:bg-amber-900/10',
  info: 'border-l-4 border-blue-400 bg-blue-50/40 dark:bg-blue-900/10',
};

export default function NotificationDropdown({ notifications, alerts = [], onMarkAllRead, onMarkRead, onClear, onClose }) {
  const hasUnread = notifications.some((n) => !n.read);
  const navigate = useNavigate();
  const isEmpty = notifications.length === 0 && alerts.length === 0;

  const go = (link) => {
    onClose();
    if (link) navigate(link);
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Bildirimler</span>
        <div className="flex items-center gap-2">
          {hasUnread && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              title="Tümünü okundu işaretle"
            >
              <CheckCheck size={14} />
              Tümünü oku
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              title="Son olayları temizle"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[28rem] overflow-y-auto">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
            <BellOff size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Her şey yolunda, dikkat gerektiren bir şey yok</p>
          </div>
        )}

        {/* Kalıcı uyarılar */}
        {alerts.length > 0 && (
          <div>
            <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Dikkat gerektirenler</p>
            <div className="space-y-px">
              {alerts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => go(a.link)}
                  className={`w-full text-left px-4 py-3 hover:brightness-95 transition flex gap-3 items-start ${SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.info}`}
                >
                  <span className="text-xl leading-none mt-0.5">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{a.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{a.message}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-400 mt-1 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Canlı olaylar */}
        {notifications.length > 0 && (
          <div>
            <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Son olaylar</p>
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    onMarkRead(n.id);
                    go(n.link);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex gap-3 items-start ${
                    !n.read ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <span className="text-xl leading-none mt-0.5">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-semibold ${!n.read ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{timeAgo(n.timestamp)}</p>
                  </div>
                  {n.link && <ChevronRight size={14} className="text-gray-400 mt-1 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
