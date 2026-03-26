import { useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import useUIStore from '../../store/uiStore';

const Toast = ({ notification }) => {
  const removeNotification = useUIStore((state) => state.removeNotification);

  useEffect(() => {
    const timer = setTimeout(() => {
      removeNotification(notification.id);
    }, notification.duration || 5000);

    return () => clearTimeout(timer);
  }, [notification, removeNotification]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getStyles = () => {
    const base = 'bg-white dark:bg-gray-800 shadow-lg border-l-4 transition-colors duration-200';
    switch (notification.type) {
      case 'success':
        return `${base} border-green-500`;
      case 'error':
        return `${base} border-red-500`;
      case 'warning':
        return `${base} border-yellow-500`;
      case 'info':
        return `${base} border-blue-500`;
      default:
        return `${base} border-gray-500 dark:border-gray-600`;
    }
  };

  return (
    <div
      className={`${getStyles()} rounded-lg p-4 mb-4 flex items-start gap-3 min-w-[300px] max-w-md animate-slide-in-right`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        {notification.title && (
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {notification.title}
          </h4>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {notification.message}
        </p>
      </div>

      <button
        onClick={() => removeNotification(notification.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function ToastContainer() {
  const notifications = useUIStore((state) => state.notifications);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end pointer-events-none">
        <div className="pointer-events-auto">
            {notifications.map((notification) => (
                <Toast key={notification.id} notification={notification} />
            ))}
        </div>
    </div>
  );
}
