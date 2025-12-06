const express = require('express');
const router = express.Router();
const { generalLimiter, strictLimiter, passwordResetLimiter } = require('../middleware/rateLimit');
const authMiddleware = require('../middleware/auth');
const { validate, userSchemas } = require('../utils/validators');
const {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  requestPasswordReset,
  resetPassword
} = require('../controllers/authController');

// Public routes with validation
router.post('/register', strictLimiter, validate(userSchemas.register), register);
router.post('/login', strictLimiter, validate(userSchemas.login), login); // Strict limiter for login
router.post('/refresh', generalLimiter, refreshToken);
router.post('/reset-password-request', passwordResetLimiter, requestPasswordReset); // Password reset limiter
router.post('/reset-password', passwordResetLimiter, resetPassword); // Password reset limiter

// Protected routes (require authentication)
router.post('/logout', authMiddleware, generalLimiter, logout);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, validate(userSchemas.updateUser), updateProfile);

module.exports = router;

