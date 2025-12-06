import { create } from 'zustand';
import api from '../services/api';

const useSettingsStore = create((set, get) => ({
  // State
  settings: {},
  allSettings: [],
  isLoading: false,
  error: null,

  // Actions
  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/settings/categories');
      if (response.data.success) {
        set({ settings: response.data.data, isLoading: false });
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch settings',
        isLoading: false
      });
    }
  },

  fetchAllSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/settings');
      if (response.data.success) {
        set({ allSettings: response.data.data, isLoading: false });
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch settings',
        isLoading: false
      });
    }
  },

  updateSetting: async (key, value) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/api/settings/${key}`, { value });
      if (response.data.success) {
        // Refetch to get updated grouped settings
        await get().fetchSettings();
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to update setting',
        isLoading: false
      });
      throw error;
    }
  },

  bulkUpdateSettings: async (settings) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put('/api/settings/bulk', settings);
      if (response.data.success) {
        // Refetch to get updated grouped settings
        await get().fetchSettings();
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to update settings',
        isLoading: false
      });
      throw error;
    }
  },

  testEmail: async (toEmail) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/settings/test-email', {
        to: toEmail
      });
      if (response.data.success) {
        set({ isLoading: false });
        return response.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to send test email',
        isLoading: false
      });
      throw error;
    }
  },

  createSetting: async (settingData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/settings', settingData);
      if (response.data.success) {
        await get().fetchSettings();
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to create setting',
        isLoading: false
      });
      throw error;
    }
  },

  deleteSetting: async (key) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.delete(`/api/settings/${key}`);
      if (response.data.success) {
        await get().fetchSettings();
        return true;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to delete setting',
        isLoading: false
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  setLoading: (isLoading) => set({ isLoading })
}));

export default useSettingsStore;
