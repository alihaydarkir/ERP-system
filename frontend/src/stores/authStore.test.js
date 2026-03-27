import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockClearPermissions = vi.fn();

vi.mock('../store/permissionStore', () => ({
  default: {
    getState: () => ({
      clearPermissions: mockClearPermissions
    })
  }
}));

import useAuthStore from '../store/authStore';

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      company: null,
      isAuthenticated: false,
      isAuthLoading: true,
      isAuthInitialized: false
    });
  });

  it('login() sonrası isAuthenticated true olur', () => {
    useAuthStore.getState().login({ id: 1, name: 'Ali' }, { id: 10, name: 'ACME' });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual({ id: 1, name: 'Ali' });
    expect(state.company).toEqual({ id: 10, name: 'ACME' });
  });

  it('logout() sonrası store temizlenir', () => {
    useAuthStore.setState({
      user: { id: 1, name: 'Ali' },
      company: { id: 10, name: 'ACME' },
      isAuthenticated: true,
      isAuthLoading: false,
      isAuthInitialized: true
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.company).toBeNull();
    expect(mockClearPermissions).toHaveBeenCalledTimes(1);
  });

  it('Token localStoragea yazılmaz (memory-only)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    useAuthStore.getState().login({ id: 2, name: 'Veli', token: 'abc123' }, null);

    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });
});
