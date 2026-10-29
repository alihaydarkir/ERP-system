const express = require('express');
const router = express.Router();
const { passwordResetLimiter } = require('../middleware/rateLimit');
const authMiddleware = require('../middleware/auth');
const { validate, userSchemas } = require('../utils/validators');
const {
  register,
  login,
  refreshToken,
  verifyTwoFaLogin,
  logout,
  getProfile,
  updateProfile,
  forgotPassword,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  verifyEmail
} = require('../controllers/authController');

const { twoFaSchemas } = require('../validators/twoFaValidators');
const { validate: validateBody } = require('../validators/validate');
const { authLoginLimiter } = require('../middleware/rateLimit');

router.post('/login', validate(userSchemas.login), login);
// Girişte ikinci adım (parola sonrası verilen tempToken + TOTP/yedek kod)
router.post('/2fa/verify', authLoginLimiter, validateBody(twoFaSchemas.loginVerify), verifyTwoFaLogin);
router.post('/register', validate(userSchemas.register), register);

router.post('/refresh', refreshToken);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.get('/verify-email', verifyEmail); // backward-compatible
router.post('/send-verification', authMiddleware, sendVerificationEmail);

// Backward-compatible aliases
router.post('/reset-password-request', passwordResetLimiter, requestPasswordReset);

router.get('/profile', authMiddleware, getProfile);
router.post('/logout', logout);
router.put('/profile', authMiddleware, validate(userSchemas.updateUser), updateProfile);

module.exports = router;
