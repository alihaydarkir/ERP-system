const QRCode = require('qrcode');
const User2FA = require('../models/User2FA');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const pool = require('../config/database');
const { getClientIP } = require('../utils/helpers');

/**
 * 2FA yönetim uçları (oturum açmış kullanıcı için). Girişteki ikinci adım authController.verifyTwoFaLogin'dedir.
 * Hata yanıtlarında iç hata mesajı (error.message) dönmez.
 */

const audit = (req, action, entityId, changes = {}) => AuditLog.create({
  user_id: req.user.id,
  action,
  entity_type: 'user_2fa',
  entity_id: entityId,
  changes,
  ip_address: getClientIP(req),
  company_id: req.user.company_id
}).catch((e) => console.error('[2FA audit]', e.message));

const fail = (res, status, message, error) => res.status(status).json({ success: false, message, ...(error ? { error } : {}) });

/**
 * Kurulumu başlat: sır + QR kodu. 2FA zaten etkinse 409 (sır sıfırlanmaz).
 */
exports.startSetup = async (req, res) => {
  try {
    const setup = await User2FA.create(req.user.id);
    const qrCode = await QRCode.toDataURL(setup.secret_url);

    res.status(200).json({
      success: true,
      message: '2FA kurulumu başlatıldı',
      secret: setup.secret_base32,
      qrCode,
      otpauthUrl: setup.secret_url
    });
  } catch (error) {
    if (error.code === 'TWO_FA_ALREADY_ENABLED') {
      return fail(res, 409, '2FA zaten etkin. Yeniden kurmak için önce devre dışı bırakın.', 'TWO_FA_ALREADY_ENABLED');
    }
    console.error('[2FA Setup Error]:', error);
    return fail(res, 500, '2FA kurulumu başlatılamadı');
  }
};

/**
 * Kurulumu tamamla: ilk TOTP ile doğrula, etkinleştir, yedek kodları (bir kez) göster.
 */
exports.verifySetup = async (req, res) => {
  try {
    const userId = req.user.id;
    const existing = await User2FA.findByUserId(userId);
    if (!existing) return fail(res, 400, 'Önce kurulumu başlatın', 'TWO_FA_NOT_STARTED');
    if (existing.is_enabled) return fail(res, 409, '2FA zaten etkin', 'TWO_FA_ALREADY_ENABLED');

    const verification = await User2FA.verifyToken(userId, req.body.token);
    if (verification.locked) return fail(res, 429, 'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.', 'TWO_FA_LOCKED');
    if (!verification.valid) return fail(res, 400, 'Doğrulama kodu geçersiz', 'INVALID_TOKEN');

    const backupCodes = await User2FA.generateBackupCodes(userId);
    await User2FA.enable(userId);
    await audit(req, '2FA_ENABLED', userId);

    res.status(200).json({
      success: true,
      message: '2FA etkinleştirildi',
      backupCodes,
      warning: 'Yedek kodları güvenli bir yere kaydedin. Her biri yalnızca bir kez kullanılabilir ve bir daha gösterilmez.'
    });
  } catch (error) {
    console.error('[2FA Verification Error]:', error);
    return fail(res, 500, '2FA doğrulanamadı');
  }
};

exports.getStatus = async (req, res) => {
  try {
    const status = await User2FA.getStatus(req.user.id);
    res.status(200).json({
      success: true,
      data: status || { user_id: req.user.id, is_enabled: false, unused_backup_codes: 0 }
    });
  } catch (error) {
    console.error('[2FA Status Error]:', error);
    return fail(res, 500, '2FA durumu alınamadı');
  }
};

/**
 * 2FA'yı kapat: parola + güncel kod şart (çalıntı oturum tek başına kapatamaz).
 */
exports.disable = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, code } = req.body;

    const status = await User2FA.findByUserId(userId);
    if (!status || !status.is_enabled) return fail(res, 400, '2FA etkin değil', 'TWO_FA_NOT_ENABLED');

    const row = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const passwordValid = row.rows.length > 0 && await User.verifyPassword(password, row.rows[0].password_hash);
    if (!passwordValid) return fail(res, 400, 'Parola yanlış', 'INVALID_PASSWORD');

    const verification = await User2FA.verifyLoginCode(userId, code);
    if (verification.locked) return fail(res, 429, 'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.', 'TWO_FA_LOCKED');
    if (!verification.valid) return fail(res, 400, 'Doğrulama kodu geçersiz', 'INVALID_2FA_CODE');

    await User2FA.delete(userId); // sır ve yedek kodlar silinir; yeniden kurulumda yeni sır üretilir
    await audit(req, '2FA_DISABLED', userId);

    res.status(200).json({ success: true, message: '2FA devre dışı bırakıldı' });
  } catch (error) {
    console.error('[2FA Disable Error]:', error);
    return fail(res, 500, '2FA devre dışı bırakılamadı');
  }
};

/**
 * Yedek kodları yeniden üret (güncel TOTP gerekir); yeni kodlar yalnızca bu yanıtta görünür.
 */
exports.regenerateBackupCodes = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await User2FA.findByUserId(userId);
    if (!status || !status.is_enabled) return fail(res, 400, '2FA etkin değil', 'TWO_FA_NOT_ENABLED');

    const verification = await User2FA.verifyToken(userId, req.body.token);
    if (verification.locked) return fail(res, 429, 'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.', 'TWO_FA_LOCKED');
    if (!verification.valid) return fail(res, 400, 'Doğrulama kodu geçersiz', 'INVALID_TOKEN');

    const backupCodes = await User2FA.generateBackupCodes(userId);
    await audit(req, '2FA_BACKUP_CODES_REGENERATED', userId);

    res.status(200).json({
      success: true,
      message: 'Yeni yedek kodlar üretildi (eskiler geçersiz)',
      backupCodes,
      warning: 'Bu kodlar bir daha gösterilmez.'
    });
  } catch (error) {
    console.error('[2FA Backup Codes Error]:', error);
    return fail(res, 500, 'Yedek kodlar üretilemedi');
  }
};

/**
 * Yönetici: şirketindeki bir kullanıcının 2FA'sını sıfırla (cihaz kaybı). Yalnızca aynı şirket.
 */
exports.deleteUserTwoFA = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return fail(res, 403, 'Bu işlem için yönetici yetkisi gerekir');
    const targetId = Number(req.params.userId);
    if (!Number.isInteger(targetId) || targetId <= 0) return fail(res, 400, 'Geçersiz kullanıcı');

    const target = await pool.query('SELECT id FROM users WHERE id = $1 AND company_id = $2', [targetId, req.user.company_id]);
    if (target.rows.length === 0) return fail(res, 404, 'Kullanıcı bulunamadı');

    await User2FA.delete(targetId);
    await audit(req, '2FA_RESET_BY_ADMIN', targetId, { target_user_id: targetId });

    res.status(200).json({ success: true, message: 'Kullanıcının 2FA ayarı sıfırlandı' });
  } catch (error) {
    console.error('[2FA Delete Error]:', error);
    return fail(res, 500, '2FA sıfırlanamadı');
  }
};
