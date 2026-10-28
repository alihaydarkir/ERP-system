const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const { supportLogin } = require('../controllers/authController');
const {
  listGrants,
  createGrant,
  revokeGrant,
  getGrantActivity,
  downloadDiagnostics
} = require('../controllers/supportAccessController');

// Yalnızca müşterinin kendi yöneticisi (destek oturumu kendi iznini yönetemez)
const isCompanyAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' || req.user.is_support) {
    return res.status(403).json({ success: false, message: 'Bu işlem için yönetici yetkisi gerekir.' });
  }
  next();
};

// Erişim koduyla destek girişi (rate limit: server.js → authLoginLimiter)
router.post('/login', supportLogin);

router.get('/grants', authMiddleware, isCompanyAdmin, listGrants);
router.post('/grants', authMiddleware, isCompanyAdmin, createGrant);
router.post('/grants/:id/revoke', authMiddleware, isCompanyAdmin, validateId, revokeGrant);
router.get('/grants/:id/activity', authMiddleware, isCompanyAdmin, validateId, getGrantActivity);
router.get('/diagnostics', authMiddleware, isCompanyAdmin, downloadDiagnostics);

module.exports = router;
