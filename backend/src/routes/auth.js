const express = require('express');
const router = express.Router();
const { generalLimiter, strictLimiter, passwordResetLimiter } = require('../middleware/rateLimit');
const authMiddleware = require('../middleware/auth');
const { validate, userSchemas } = require('../utils/validators');
const {
  register, login, refreshToken, logout,
  getProfile, updateProfile,
  requestPasswordReset, resetPassword
} = require('../controllers/authController');

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Giriş yap, JWT token al
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: admin@erp.com }
 *               password: { type: string, example: Admin123! }
 *     responses:
 *       200:
 *         description: Giriş başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 token:   { type: string }
 *                 user:    { type: object }
 *       401:
 *         description: Geçersiz kimlik bilgileri
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/login', strictLimiter, validate(userSchemas.login), login);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Yeni kullanıcı / şirket oluştur
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:      { type: string }
 *               email:         { type: string }
 *               password:      { type: string }
 *               companyAction: { type: string, enum: [create, join] }
 *               companyName:   { type: string, description: 'companyAction=create ise' }
 *               companyCode:   { type: string, description: 'companyAction=join ise' }
 *     responses:
 *       201:
 *         description: Kayıt başarılı
 *       400:
 *         description: Validasyon hatası
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/register', strictLimiter, validate(userSchemas.register), register);

router.post('/refresh', generalLimiter, refreshToken);
router.post('/reset-password-request', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, resetPassword);

/**
 * @openapi
 * /api/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Oturum açmış kullanıcının profili
 *     responses:
 *       200:
 *         description: Profil verisi
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.get('/profile',  authMiddleware, getProfile);
router.post('/logout',  authMiddleware, generalLimiter, logout);
router.put('/profile',  authMiddleware, validate(userSchemas.updateUser), updateProfile);

module.exports = router;

