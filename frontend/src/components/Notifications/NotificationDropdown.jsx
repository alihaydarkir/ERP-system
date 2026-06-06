import { CheckCheck, Trash2, BellOff } from 'lucide-react';

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

export default function NotificationDropdown({ notifications, onMarkAllRead, onMarkRead, onClear, onClose }) {
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
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
              title="Tümünü sil"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
            <BellOff size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Bildirim yok</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => { onMarkRead(n.id); onClose(); }}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex gap-3 items-start ${
                !n.read ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
              }`}
            >
              <span className="text-xl leading-none mt-0.5">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-semibold truncate ${!n.read ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {n.title}
                  </p>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{n.message}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{timeAgo(n.timestamp)}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
