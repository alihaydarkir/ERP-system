import { create } from 'zustand';

const useUIStore = create((set) => ({
  sidebarOpen: true,
  theme: 'light',
  notifications: [],
  confirmDialog: {
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Onayla',
    cancelText: 'İptal',
    type: 'danger'
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  setTheme: (theme) => set({ theme }),
  
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, {
      ...notification,
      id: notification.id || Date.now() + Math.random(),
    }],
  })),
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),
  
  clearNotifications: () => set({ notifications: [] }),

  // Confirmation Dialog
  showConfirm: ({ title, message, onConfirm, confirmText, cancelText, type }) => 
    set({
      confirmDialog: {
        isOpen: true,
        title: title || 'Emin misiniz?',
        message,
        onConfirm,
        confirmText: confirmText || 'Onayla',
        cancelText: cancelText || 'İptal',
        type: type || 'danger'
      }
    }),

  hideConfirm: () => 
    set({
      confirmDialog: {
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        confirmText: 'Onayla',
        cancelText: 'İptal',
        type: 'danger'
      }
    }),

  // Helper functions for common notification types
  showSuccess: (message, title = 'Başarılı') => set((state) => ({
    notifications: [...state.notifications, {
      id: Date.now() + Math.random(),
      type: 'success',
      title,
      message,
      duration: 4000,
    }],
  })),

  showError: (message, title = 'Hata') => set((state) => ({
    notifications: [...state.notifications, {
      id: Date.now() + Math.random(),
      type: 'error',
      title,
      message,
      duration: 5000,
    }],
  })),

  showWarning: (message, title = 'Uyarı') => set((state) => ({
    notifications: [...state.notifications, {
      id: Date.now() + Math.random(),
      type: 'warning',
      title,
      message,
      duration: 4000,
    }],
  })),

  showInfo: (message, title = 'Bilgi') => set((state) => ({
    notifications: [...state.notifications, {
      id: Date.now() + Math.random(),
      type: 'info',
      title,
      message,
      duration: 4000,
    }],
  })),
}));

export default useUIStore;

