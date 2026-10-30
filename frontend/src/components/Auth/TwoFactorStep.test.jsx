import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import TwoFactorStep from './TwoFactorStep';
import { authService } from '../../services/authService';

vi.mock('../../services/authService', () => ({
  authService: { verifyTwoFa: vi.fn() },
}));

const apiError = (status, code, message) => ({ response: { status, data: { success: false, code, message } } });

const setup = (props = {}) => {
  const handlers = { onSuccess: vi.fn(), onBack: vi.fn(), onExpired: vi.fn() };
  render(<TwoFactorStep tempToken='temp-jwt' {...handlers} {...props} />);
  return handlers;
};

const submit = (value) => {
  fireEvent.change(screen.getByLabelText('Doğrulama kodu'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Doğrula' }));
};

describe('TwoFactorStep (girişte ikinci adım)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('doğru kodla tempToken + kod gönderir ve onSuccess çağrılır', async () => {
    authService.verifyTwoFa.mockResolvedValue({ success: true, data: { user: { username: 'ali' }, company: null } });
    const h = setup();
    submit('123456');
    await waitFor(() => expect(h.onSuccess).toHaveBeenCalledWith({ user: { username: 'ali' }, company: null }));
    expect(authService.verifyTwoFa).toHaveBeenCalledWith('temp-jwt', '123456');
  });

  it('yedek kodu da aynı alandan gönderir', async () => {
    authService.verifyTwoFa.mockResolvedValue({ success: true, data: { user: { username: 'ali' } } });
    const h = setup();
    submit('ABCDE-23456');
    await waitFor(() => expect(h.onSuccess).toHaveBeenCalled());
    expect(authService.verifyTwoFa).toHaveBeenCalledWith('temp-jwt', 'ABCDE-23456');
  });

  it('hatalı kodda mesajı gösterir, alanı temizler, oturum açmaz', async () => {
    authService.verifyTwoFa.mockRejectedValue(apiError(401, 'INVALID_2FA_CODE', 'Doğrulama kodu geçersiz.'));
    const h = setup();
    submit('000000');
    expect(await screen.findByText('Doğrulama kodu geçersiz.')).toBeInTheDocument();
    expect(h.onSuccess).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Doğrulama kodu')).toHaveValue('');
  });

  it('5 hatadan sonra kilit (429): alan ve düğme devre dışı', async () => {
    authService.verifyTwoFa.mockRejectedValue(apiError(429, 'TWO_FA_LOCKED', 'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.'));
    setup();
    submit('000000');
    expect(await screen.findByText(/15 dakika sonra/)).toBeInTheDocument();
    expect(screen.getByLabelText('Doğrulama kodu')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Doğrula' })).toBeDisabled();
  });

  it('doğrulama oturumu bitmişse onExpired çağrılır', async () => {
    authService.verifyTwoFa.mockRejectedValue(apiError(401, 'TWO_FA_SESSION_EXPIRED', 'Doğrulama oturumu geçersiz veya süresi doldu.'));
    const h = setup();
    submit('123456');
    await waitFor(() => expect(h.onExpired).toHaveBeenCalledWith('Doğrulama oturumu geçersiz veya süresi doldu.'));
  });

  it('boş kodu göndermez', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Doğrula' }));
    expect(authService.verifyTwoFa).not.toHaveBeenCalled();
    expect(screen.getByText('Doğrulama kodunu girin')).toBeInTheDocument();
  });

  it('Geri dön onBack çağırır', () => {
    const h = setup();
    fireEvent.click(screen.getByText('Geri dön'));
    expect(h.onBack).toHaveBeenCalled();
  });
});
