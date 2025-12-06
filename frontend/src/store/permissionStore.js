import { create } from 'zustand';
import api from '../services/api';

const usePermissionStore = create((set, get) => ({
  permissions: [],
  loading: false,
  error: null,

  // Fetch current user's permissions
  fetchMyPermissions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/api/permissions/my-permissions');
      if (response.data.success) {
        set({ permissions: response.data.data, loading: false });
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      set({ error: error.response?.data?.message || 'İzinler yüklenemedi', loading: false });
    }
  },

  // Check if user has specific permission
  hasPermission: (permissionName) => {
    const { permissions } = get();
    return permissions.includes(permissionName);
  },

  // Check if user has any of the permissions
  hasAnyPermission: (permissionNames) => {
    const { permissions } = get();
    return permissionNames.some(p => permissions.includes(p));
  },

  // Check if user has all permissions
  hasAllPermissions: (permissionNames) => {
    const { permissions } = get();
    return permissionNames.every(p => permissions.includes(p));
  },

  // Clear permissions (on logout)
  clearPermissions: () => {
    set({ permissions: [], error: null });
  }
}));

export default usePermissionStore;
