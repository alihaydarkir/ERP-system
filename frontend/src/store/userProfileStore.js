import { create } from 'zustand';
import api from '../services/api';

const useUserProfileStore = create((set, get) => ({
  // State
  profile: null,
  activityHistory: [],
  loginHistory: [],
  isLoading: false,
  error: null,

  // Actions
  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/users/profile');
      if (response.data.success) {
        set({ profile: response.data.data, isLoading: false });
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch profile',
        isLoading: false
      });
      throw error;
    }
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put('/api/users/profile', profileData);
      if (response.data.success) {
        set({ profile: response.data.data, isLoading: false });
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to update profile',
        isLoading: false
      });
      throw error;
    }
  },

  uploadAvatar: async (file) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post('/api/users/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Update profile with new avatar URL
        set((state) => ({
          profile: { ...state.profile, profile_image: response.data.data.profile_image },
          isLoading: false
        }));
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to upload avatar',
        isLoading: false
      });
      throw error;
    }
  },

  changePassword: async (passwordData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put('/api/users/profile/password', passwordData);
      if (response.data.success) {
        set({ isLoading: false });
        return response.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to change password',
        isLoading: false
      });
      throw error;
    }
  },

  updatePreferences: async (preferences) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put('/api/users/profile/preferences', preferences);
      if (response.data.success) {
        set((state) => ({
          profile: { ...state.profile, preferences: response.data.data.preferences },
          isLoading: false
        }));
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to update preferences',
        isLoading: false
      });
      throw error;
    }
  },

  fetchActivityHistory: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/users/profile/activity', { params });
      if (response.data.success) {
        set({ activityHistory: response.data.data, isLoading: false });
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch activity history',
        isLoading: false
      });
      throw error;
    }
  },

  fetchLoginHistory: async (limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/users/profile/login-history', {
        params: { limit }
      });
      if (response.data.success) {
        set({ loginHistory: response.data.data, isLoading: false });
        return response.data.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch login history',
        isLoading: false
      });
      throw error;
    }
  },

  enable2FA: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/users/profile/2fa/enable');
      if (response.data.success) {
        set((state) => ({
          profile: { ...state.profile, two_factor_enabled: true },
          isLoading: false
        }));
        return response.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to enable 2FA',
        isLoading: false
      });
      throw error;
    }
  },

  disable2FA: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/users/profile/2fa/disable');
      if (response.data.success) {
        set((state) => ({
          profile: { ...state.profile, two_factor_enabled: false },
          isLoading: false
        }));
        return response.data;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to disable 2FA',
        isLoading: false
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  setLoading: (isLoading) => set({ isLoading })
}));

export default useUserProfileStore;
