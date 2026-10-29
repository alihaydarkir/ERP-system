const backupService = require('../services/backupService');
const backupNotifications = require('../services/backupNotifications');
const User2FA = require('../models/User2FA');
const AuditLog = require('../models/AuditLog');
const { formatSuccess, formatError } = require('../utils/formatters');
const { getClientIP } = require('../utils/helpers');

const handleError = (res, error, fallback) => {
  if (error.status) {
    return res.status(error.status).json({ ...formatError(error.message), code: error.code });
  }
  console.error(fallback, error);
  return res.status(500).json(formatError(fallback));
};

// Parolayla ilgili her işlem yöneticinin 2FA kodunu ister. 2FA açık değilse önce açılmalı.
const verifyTwoFactor = async (req) => {
  const twoFa = await User2FA.findByUserId(req.user.id);
  if (!twoFa?.is_enabled) {
    throw Object.assign(new Error('Bu işlem için önce hesabınızda iki aşamalı doğrulamayı (2FA) açın.'), {
      status: 403,
      code: 'TWO_FA_REQUIRED',
    });
  }
  const { valid } = await User2FA.verifyToken(req.user.id, String(req.body?.totp || '').trim());
  if (!valid) {
    throw Object.assign(new Error('İki aşamalı doğrulama kodu hatalı.'), { status: 403, code: 'TWO_FA_INVALID' });
  }
};

const audit = (req, action, changes = {}) =>
  AuditLog.create({
    user_id: req.user.id,
    action,
    entity_type: 'backup_encryption',
    entity_id: null,
    company_id: req.user.company_id,
    ip_address: getClientIP(req),
    changes,
  });

// Kayıt + bildirim (bildirim beklenmez: SMTP yavaşsa yanıtı geciktirmesin)
const recordEvent = async (req, action, changes) => {
  await audit(req, action, changes);
  backupNotifications.notify({ companyId: req.user.company_id, actor: req.user, action });
};

// GET /api/backups — durum ve yedek listesi (sır içermez)
const getStatus = async (req, res) => {
  try {
    res.json(formatSuccess(await backupService.getStatus()));
  } catch (error) {
    handleError(res, error, 'Yedek durumu alınamadı');
  }
};

// POST /api/backups/setup { password, totp } — kurtarma kodu yalnız bu yanıtta döner
const setup = async (req, res) => {
  try {
    await verifyTwoFactor(req);
    const { recoveryCode } = await backupService.setup({ password: req.body?.password, userId: req.user.id });
    await recordEvent(req, 'BACKUP_ENCRYPTION_SETUP');
    res.status(201).json(formatSuccess({ recovery_code: recoveryCode }, 'Yedek şifrelemesi kuruldu'));
  } catch (error) {
    handleError(res, error, 'Yedek şifrelemesi kurulamadı');
  }
};

// POST /api/backups/password { current_password, new_password, totp }
const changePassword = async (req, res) => {
  try {
    await verifyTwoFactor(req);
    await backupService.changePassword({
      currentPassword: req.body?.current_password,
      newPassword: req.body?.new_password,
    });
    await recordEvent(req, 'BACKUP_PASSWORD_CHANGED');
    res.json(formatSuccess(null, 'Yedek parolası değiştirildi. Eski yedekler yeni parolayla açılır.'));
  } catch (error) {
    if (error.code === 'WRONG_PASSWORD') await audit(req, 'BACKUP_PASSWORD_CHANGE_FAILED').catch(() => {});
    handleError(res, error, 'Yedek parolası değiştirilemedi');
  }
};

// POST /api/backups/recover { recovery_code, new_password, totp } — parola unutuldu
const recover = async (req, res) => {
  try {
    await verifyTwoFactor(req);
    await backupService.recover({ recoveryCode: req.body?.recovery_code, newPassword: req.body?.new_password });
    await recordEvent(req, 'BACKUP_RECOVERY_USED');
    res.json(formatSuccess(null, 'Yeni yedek parolası belirlendi. Eski yedekler yeni parolayla açılır.'));
  } catch (error) {
    if (error.code === 'WRONG_RECOVERY_CODE') await audit(req, 'BACKUP_RECOVERY_FAILED').catch(() => {});
    handleError(res, error, 'Kurtarma yapılamadı');
  }
};

// POST /api/backups/recovery-code { password, totp } — yeni kod yalnız bu yanıtta döner
const rotateRecoveryCode = async (req, res) => {
  try {
    await verifyTwoFactor(req);
    const { recoveryCode } = await backupService.rotateRecoveryCode({ password: req.body?.password });
    await recordEvent(req, 'BACKUP_RECOVERY_ROTATED');
    res.json(formatSuccess({ recovery_code: recoveryCode }, 'Yeni kurtarma kodu üretildi'));
  } catch (error) {
    handleError(res, error, 'Kurtarma kodu üretilemedi');
  }
};

// POST /api/backups/verify { password, totp } — son yedeği gerçekten açıp dener
const verifyLatest = async (req, res) => {
  try {
    await verifyTwoFactor(req);
    const result = await backupService.verifyLatest({ password: req.body?.password });
    await audit(req, 'BACKUP_VERIFIED', { file: result.file });
    res.json(formatSuccess(result, 'Son yedek parolayla açıldı ve okunabiliyor.'));
  } catch (error) {
    handleError(res, error, 'Yedek doğrulanamadı');
  }
};

module.exports = {
  getStatus,
  setup,
  changePassword,
  recover,
  rotateRecoveryCode,
  verifyLatest,
};
