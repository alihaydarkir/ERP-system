const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { aiMutationLimiter } = require('../middleware/rateLimit');
const { validateAIRequest } = require('../middleware/aiSecurityMiddleware');
const {
	agentChat,
	getHealth,
	getModels,
	getMyApprovals,
	approveAIAction,
	rejectAIAction
} = require('../controllers/aiController');

const mutationIntentRegex = /\b(oluştur|ekle|güncelle|düzenle|sil|iptal|stok|durum|onayla|create|update|delete|cancel|set)\b/i;

const mutationRateGate = (req, res, next) => {
	const message = req.body?.message || '';

	if (typeof message === 'string' && mutationIntentRegex.test(message)) {
		return aiMutationLimiter(req, res, next);
	}

	return next();
};

// Tüm AI endpoint'leri JWT auth gerektirir
router.post('/chat', authMiddleware, validateAIRequest, mutationRateGate, agentChat);
router.get('/health', authMiddleware, getHealth);
router.get('/models', authMiddleware, getModels);
router.get('/approvals/my', authMiddleware, getMyApprovals);
router.post('/approvals/:id/approve', authMiddleware, aiMutationLimiter, approveAIAction);
router.post('/approvals/:id/reject', authMiddleware, aiMutationLimiter, rejectAIAction);

module.exports = router;
