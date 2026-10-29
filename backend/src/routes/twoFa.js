const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { generalLimiter, sensitiveOperationsLimiter } = require('../middleware/rateLimit');
const { validate } = require('../validators/validate');
const { twoFaSchemas } = require('../validators/twoFaValidators');
const {
  startSetup,
  verifySetup,
  getStatus,
  disable,
  regenerateBackupCodes,
  deleteUserTwoFA
} = require('../controllers/user2faController');

// Yalnızca tam (access) oturum: geçici 2FA jetonu bu uçlara erişemez (authMiddleware purpose'lı jetonu reddeder).
// Girişteki ikinci adım: POST /api/auth/2fa/verify (authController.verifyTwoFaLogin).
router.use(authMiddleware);

router.get('/status', generalLimiter, getStatus);

// Kurulum: sır + QR üret (2FA etkinse 409)
router.post('/setup', sensitiveOperationsLimiter, startSetup);

// Kurulumu ilk TOTP ile tamamla, yedek kodları bir kez göster
router.post('/setup/verify', sensitiveOperationsLimiter, validate(twoFaSchemas.verify), verifySetup);

// Yedek kodları yeniden üret (güncel TOTP gerekir; kodlar yalnızca yanıtta görünür)
router.post('/backup-codes/regenerate', sensitiveOperationsLimiter, validate(twoFaSchemas.regenerate), regenerateBackupCodes);

// 2FA'yı kapat: parola + güncel kod
router.post('/disable', sensitiveOperationsLimiter, validate(twoFaSchemas.disable), disable);

// Yönetici: aynı şirketteki kullanıcının 2FA'sını sıfırla
router.delete('/:userId', sensitiveOperationsLimiter, deleteUserTwoFA);

module.exports = router;
