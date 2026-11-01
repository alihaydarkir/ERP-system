import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import TwoFactorSection from './TwoFactorSection';
import twoFactorService from '../../services/twoFactorService';

vi.mock('../../services/twoFactorService', () => ({
  default: {
    getStatus: vi.fn(),
    startSetup: vi.fn(),
    completeSetup: vi.fn(),
    regenerateBackupCodes: vi.fn(),
    disable: vi.fn(),
  },
}));

const CODES = ['AAAAA-11111', 'BBBBB-22222', 'CCCCC-33333'];
const off = { data: { is_enabled: false, unused_backup_codes: 0 } };
const on = (n = 10) => ({ data: { is_enabled: true, unused_backup_codes: n } });

describe('TwoFactorSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('2FA kapalıyken Etkinleştir görünür', async () => {
    twoFactorService.getStatus.mockResolvedValue(off);
    render(<TwoFactorSection />);
    expect(await screen.findByRole('button', { name: /Etkinleştir/ })).toBeInTheDocument();
  });

  it('kurulum: QR + anahtar gösterilir, kod 6 haneli olmadan gönderilemez', async () => {
    twoFactorService.getStatus.mockResolvedValue(off);
    twoFactorService.startSetup.mockResolvedValue({ success: true, secret: 'JBSWY3DPEHPK3PXP', qrCode: 'data:image/png;base64,AAAA' });
    render(<TwoFactorSection />);
    fireEvent.click(await screen.findByRole('button', { name: /Etkinleştir/ }));
    expect(await screen.findByAltText('2FA QR kodu')).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: /Doğrula ve etkinleştir/ });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('6 haneli kod'), { target: { value: '12ab34' } });
    expect(screen.getByLabelText('6 haneli kod')).toHaveValue('1234'); // yalnızca rakam
    expect(submit).toBeDisabled();
  });

  it('kurulum tamamlanınca yedek kodlar gösterilir; kaydedildi onayı olmadan kapanmaz', async () => {
    twoFactorService.getStatus.mockResolvedValueOnce(off).mockResolvedValue(on(3));
    twoFactorService.startSetup.mockResolvedValue({ success: true, secret: 'SECRET', qrCode: 'data:image/png;base64,AAAA' });
    twoFactorService.completeSetup.mockResolvedValue({ success: true, backupCodes: CODES });
    const onChanged = vi.fn();
    render(<TwoFactorSection onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole('button', { name: /Etkinleştir/ }));
    fireEvent.change(await screen.findByLabelText('6 haneli kod'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Doğrula ve etkinleştir/ }));

    expect(await screen.findByTestId('two-factor-backup-codes')).toBeInTheDocument();
    CODES.forEach((c) => expect(screen.getByText(c)).toBeInTheDocument());
    expect(twoFactorService.completeSetup).toHaveBeenCalledWith('123456');
    expect(onChanged).toHaveBeenCalled();

    const done = screen.getByRole('button', { name: 'Tamam' });
    expect(done).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Kodları güvenli bir yere kaydettim'));
    expect(done).toBeEnabled();
    fireEvent.click(done);
    // kapandıktan sonra kodlar bir daha gösterilmez
    await waitFor(() => expect(screen.queryByText(CODES[0])).toBeNull());
    expect(screen.getByTestId('two-factor-status')).toHaveTextContent('Kalan yedek kod: 3');
  });

  it('etkinken durum, kalan yedek kod ve işlemler görünür; azalınca uyarır', async () => {
    twoFactorService.getStatus.mockResolvedValue(on(1));
    render(<TwoFactorSection />);
    expect(await screen.findByText(/Kalan yedek kod: 1/)).toBeInTheDocument();
    expect(screen.getByText(/azalıyor/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yedek kodları yenile/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Devre dışı bırak/ })).toBeInTheDocument();
  });

  it('kapatma: parola ve kod olmadan gönderilemez; gönderince servis çağrılır', async () => {
    twoFactorService.getStatus.mockResolvedValueOnce(on()).mockResolvedValue(off);
    twoFactorService.disable.mockResolvedValue({ success: true });
    const onChanged = vi.fn();
    render(<TwoFactorSection onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole('button', { name: /Devre dışı bırak/ }));
    const submit = await screen.findByRole('button', { name: 'Kapat' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Parola'), { target: { value: 'Gizli-Parola-1' } });
    fireEvent.change(screen.getByLabelText('Kod'), { target: { value: '654321' } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(twoFactorService.disable).toHaveBeenCalledWith('Gizli-Parola-1', '654321'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: /Etkinleştir/ })).toBeInTheDocument();
  });

  it('yedek kodları yenile: 6 haneli TOTP ister, yeni kodları gösterir', async () => {
    twoFactorService.getStatus.mockResolvedValue(on(2));
    twoFactorService.regenerateBackupCodes.mockResolvedValue({ success: true, backupCodes: CODES });
    render(<TwoFactorSection />);
    fireEvent.click(await screen.findByRole('button', { name: /Yedek kodları yenile/ }));
    const submit = await screen.findByRole('button', { name: 'Yenile' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('6 haneli kod'), { target: { value: '123456' } });
    fireEvent.click(submit);
    expect(await screen.findByTestId('two-factor-backup-codes')).toBeInTheDocument();
    expect(twoFactorService.regenerateBackupCodes).toHaveBeenCalledWith('123456');
  });

  it('2FA zaten etkinse (409) kurulum başlamaz, durum yenilenir', async () => {
    twoFactorService.getStatus.mockResolvedValueOnce(off).mockResolvedValue(on());
    twoFactorService.startSetup.mockRejectedValue({ response: { status: 409, data: { message: '2FA zaten etkin' } } });
    render(<TwoFactorSection />);
    fireEvent.click(await screen.findByRole('button', { name: /Etkinleştir/ }));
    expect(await screen.findByTestId('two-factor-status')).toHaveTextContent('Kalan yedek kod');
    expect(screen.queryByTestId('two-factor-setup')).toBeNull();
  });
});
