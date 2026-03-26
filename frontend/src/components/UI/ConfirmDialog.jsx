import { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Emin misiniz?', 
  message, 
  confirmText = 'Onayla',
  cancelText = 'İptal',
  type = 'danger'
}) => {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'text-red-600 dark:text-red-400',
          button: 'bg-red-600 hover:bg-red-700 dark:hover:bg-red-800 text-white focus:ring-red-500'
        };
      case 'warning':
        return {
          icon: 'text-yellow-600 dark:text-yellow-400',
          button: 'bg-yellow-600 hover:bg-yellow-700 dark:hover:bg-yellow-800 text-white focus:ring-yellow-500'
        };
      case 'info':
        return {
          icon: 'text-blue-600 dark:text-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-800 text-white focus:ring-blue-500'
        };
      case 'success':
        return {
          icon: 'text-green-600 dark:text-green-400',
          button: 'bg-green-600 hover:bg-green-700 dark:hover:bg-green-800 text-white focus:ring-green-500'
        };
      default:
        return {
          icon: 'text-gray-600 dark:text-gray-400',
          button: 'bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-800 text-white focus:ring-gray-500'
        };
    }
  };

  const styles = getTypeStyles();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full animate-scale-in border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-transparent border-0"
            aria-label="Dialogu kapat"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 ${styles.icon} bg-gray-50 dark:bg-gray-700/50 p-3 rounded-full`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              
              <div className="flex-1 min-w-0 mt-1">
                <h3 id="confirm-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                  {title}
                </h3>
                <p id="confirm-dialog-message" className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors transform active:scale-95 ${styles.button}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
