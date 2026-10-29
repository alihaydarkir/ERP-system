const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { sensitiveOperationsLimiter } = require('../middleware/rateLimit');
const {
  getStatus,
  setup,
  changePassword,
  recover,
  rotateRecoveryCode,
  verifyLatest
} = require('../controllers/backupController');

// Yalnızca müşterinin kendi yöneticisi; destek oturumu yedek parolasına dokunamaz
const isCompanyAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' || req.user.is_support) {
    return res.status(403).json({ success: false, message: 'Bu işlem için yönetici yetkisi gerekir.' });
  }
  next();
};

router.use(authMiddleware, isCompanyAdmin);

router.get('/', getStatus);
// Parola/kod denemeleri: kaba kuvvete karşı sıkı sınır (2FA'ya ek olarak)
router.post('/setup', sensitiveOperationsLimiter, setup);
router.post('/password', sensitiveOperationsLimiter, changePassword);
router.post('/recover', sensitiveOperationsLimiter, recover);
router.post('/recovery-code', sensitiveOperationsLimiter, rotateRecoveryCode);
router.post('/verify', sensitiveOperationsLimiter, verifyLatest);

module.exports = router;
