import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import LoginPage from './LoginPage';
import useAuthStore from '../store/authStore';
import { authService } from '../services/authService';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => navigate }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../services/authService', () => ({
  authService: { login: vi.fn(), verifyTwoFa: vi.fn() },
}));

const fillAndLogin = () => {
  fireEvent.change(screen.getByLabelText('E-posta Adresi'), { target: { value: 'ali@sirket.com' } });
  fireEvent.change(document.getElementById('login-password'), { target: { value: 'Gizli-Parola-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));
};

const renderPage = () => render(<MemoryRouter><LoginPage /></MemoryRouter>);

describe('LoginPage — 2FA akışı', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('2FA kapalı hesapta doğrudan oturum açar (kod adımı çıkmaz)', async () => {
    authService.login.mockResolvedValue({ success: true, data: { user: { username: 'ali' }, company: null } });
    renderPage();
    fillAndLogin();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'));
    expect(screen.queryByTestId('two-factor-step')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('requiresTwoFa gelince çökmez, kod adımını gösterir ve henüz oturum açmaz', async () => {
    authService.login.mockResolvedValue({ success: true, data: { requiresTwoFa: true, tempToken: 'tmp', userId: 7 } });
    renderPage();
    fillAndLogin();
    expect(await screen.findByTestId('two-factor-step')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('kod doğrulanınca oturum açılır ve panele gidilir', async () => {
    authService.login.mockResolvedValue({ success: true, data: { requiresTwoFa: true, tempToken: 'tmp' } });
    authService.verifyTwoFa.mockResolvedValue({ success: true, data: { user: { username: 'ali' }, company: { id: 1 } } });
    renderPage();
    fillAndLogin();
    await screen.findByTestId('two-factor-step');
    fireEvent.change(screen.getByLabelText('Doğrulama kodu'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Doğrula' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'));
    expect(authService.verifyTwoFa).toHaveBeenCalledWith('tmp', '123456');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('Geri dön ilk adıma döner', async () => {
    authService.login.mockResolvedValue({ success: true, data: { requiresTwoFa: true, tempToken: 'tmp' } });
    renderPage();
    fillAndLogin();
    await screen.findByTestId('two-factor-step');
    fireEvent.click(screen.getByText('Geri dön'));
    expect(await screen.findByLabelText('E-posta Adresi')).toBeInTheDocument();
    expect(screen.queryByTestId('two-factor-step')).toBeNull();
  });
});
