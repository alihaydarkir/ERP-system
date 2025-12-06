import { useEffect } from 'react';
import useAuthStore from '../store/authStore';
import api from '../services/api';

export const useAuth = () => {
  const { user, token, isAuthenticated, setUser } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      // Fetch user data
      api.get('/auth/me')
        .then((res) => setUser(res.data.user))
        .catch(() => {
          useAuthStore.getState().logout();
        });
    }
  }, [token, user, setUser]);

  return {
    user,
    isAuthenticated,
    ...useAuthStore(),
  };
};

export default useAuth;

