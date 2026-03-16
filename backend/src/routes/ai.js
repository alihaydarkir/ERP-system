const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { aiChatLimiter, aiMutationLimiter } = require('../middleware/rateLimit');
const { agentChat, getHealth, getModels } = require('../controllers/aiController');

const mutationIntentRegex = /\b(oluştur|ekle|güncelle|düzenle|sil|iptal|stok|durum|onayla|create|update|delete|cancel|set)\b/i;

const mutationRateGate = (req, res, next) => {
	const message = req.body?.message || '';

	if (typeof message === 'string' && mutationIntentRegex.test(message)) {
		return aiMutationLimiter(req, res, next);
	}

	return next();
};

// Tüm AI endpoint'leri JWT auth gerektirir
router.post('/chat', authMiddleware, aiChatLimiter, mutationRateGate, agentChat);
router.get('/health', authMiddleware, aiChatLimiter, getHealth);
router.get('/models', authMiddleware, aiChatLimiter, getModels);

module.exports = router;
