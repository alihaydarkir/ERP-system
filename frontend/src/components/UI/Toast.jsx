import { useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import useUIStore from '../../store/uiStore';

const Toast = ({ notification }) => {
  const { removeNotification } = useUIStore();

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
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-white border-l-4 border-green-500 shadow-lg';
      case 'error':
        return 'bg-white border-l-4 border-red-500 shadow-lg';
      case 'warning':
        return 'bg-white border-l-4 border-yellow-500 shadow-lg';
      case 'info':
        return 'bg-white border-l-4 border-blue-500 shadow-lg';
      default:
        return 'bg-white border-l-4 border-gray-500 shadow-lg';
    }
  };

  const getTitle = () => {
    if (notification.title) return notification.title;
    
    switch (notification.type) {
      case 'success':
        return 'Başarılı';
      case 'error':
        return 'Hata';
      case 'warning':
        return 'Uyarı';
      case 'info':
        return 'Bilgi';
      default:
        return '';
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
        {getTitle() && (
          <h4 className="font-semibold text-gray-900 mb-1">
            {getTitle()}
          </h4>
        )}
        <p className="text-sm text-gray-600">
          {notification.message}
        </p>
      </div>

      <button
        onClick={() => removeNotification(notification.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const ToastContainer = () => {
  const { notifications } = useUIStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end">
      {notifications.map((notification) => (
        <Toast key={notification.id} notification={notification} />
      ))}
    </div>
  );
};

export default ToastContainer;
