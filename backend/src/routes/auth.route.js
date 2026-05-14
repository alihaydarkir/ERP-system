const express = require('express');
const router = express.Router();
const { passwordResetLimiter } = require('../middleware/rateLimit');
const authMiddleware = require('../middleware/auth');
const { validate, userSchemas } = require('../utils/validators');
const {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  forgotPassword,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  verifyEmail
} = require('../controllers/authController');

router.post('/login', validate(userSchemas.login), login);
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
