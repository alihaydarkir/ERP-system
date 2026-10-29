jest.mock('../services/backupService', () => ({
  getStatus: jest.fn(),
  setup: jest.fn(),
  changePassword: jest.fn(),
  recover: jest.fn(),
  rotateRecoveryCode: jest.fn(),
  verifyLatest: jest.fn(),
}));
jest.mock('../services/backupNotifications', () => ({ notify: jest.fn() }));
jest.mock('../models/User2FA', () => ({ findByUserId: jest.fn(), verifyToken: jest.fn() }));
jest.mock('../models/AuditLog', () => ({ create: jest.fn().mockResolvedValue({}) }));

const backupService = require('../services/backupService');
const backupNotifications = require('../services/backupNotifications');
const User2FA = require('../models/User2FA');
const AuditLog = require('../models/AuditLog');
const controller = require('./backupController');

const makeReq = (body) => ({
  body,
  user: { id: 5, username: 'yonetici', role: 'admin', company_id: 2 },
  headers: {},
  ip: '10.0.0.5',
  connection: {},
});
const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn((body) => { res.body = body; return res; });
  return res;
};

describe('backupController — 2FA zorunlu', () => {
  beforeEach(() => jest.clearAllMocks());

  it('2FA açık değilse 403 TWO_FA_REQUIRED, işlem yapılmaz', async () => {
    User2FA.findByUserId.mockResolvedValue(null);
    const res = makeRes();
    await controller.changePassword(makeReq({ current_password: 'a', new_password: 'b', totp: '123456' }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.code).toBe('TWO_FA_REQUIRED');
    expect(backupService.changePassword).not.toHaveBeenCalled();
  });

  it('2FA kodu hatalıysa 403 TWO_FA_INVALID', async () => {
    User2FA.findByUserId.mockResolvedValue({ is_enabled: true });
    User2FA.verifyToken.mockResolvedValue({ valid: false });
    const res = makeRes();
    await controller.recover(makeReq({ recovery_code: 'x', new_password: 'y', totp: '000000' }), res);
    expect(res.body.code).toBe('TWO_FA_INVALID');
    expect(backupService.recover).not.toHaveBeenCalled();
  });

  it('geçerli 2FA: işlem yapılır, audit + bildirim', async () => {
    User2FA.findByUserId.mockResolvedValue({ is_enabled: true });
    User2FA.verifyToken.mockResolvedValue({ valid: true });
    backupService.rotateRecoveryCode.mockResolvedValue({ recoveryCode: 'AAAA-BBBB' });
    const res = makeRes();

    await controller.rotateRecoveryCode(makeReq({ password: 'dogru-parola-123', totp: ' 123456 ' }), res);

    expect(User2FA.verifyToken).toHaveBeenCalledWith(5, '123456');
    expect(res.body.data).toEqual({ recovery_code: 'AAAA-BBBB' });
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'BACKUP_RECOVERY_ROTATED', company_id: 2 }));
    expect(JSON.stringify(AuditLog.create.mock.calls)).not.toContain('AAAA-BBBB');
    expect(backupNotifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 2, action: 'BACKUP_RECOVERY_ROTATED' })
    );
  });

  it('yanlış kurtarma kodu denemesi de audit\'e yazılır', async () => {
    User2FA.findByUserId.mockResolvedValue({ is_enabled: true });
    User2FA.verifyToken.mockResolvedValue({ valid: true });
    backupService.recover.mockRejectedValue(Object.assign(new Error('Kurtarma kodu yanlış.'), { status: 400, code: 'WRONG_RECOVERY_CODE' }));
    const res = makeRes();

    await controller.recover(makeReq({ recovery_code: 'x', new_password: 'yeni-parola-456', totp: '123456' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'BACKUP_RECOVERY_FAILED' }));
    expect(backupNotifications.notify).not.toHaveBeenCalled();
  });
});
