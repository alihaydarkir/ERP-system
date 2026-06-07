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
	rejectAIAction,
	executeTool
} = require('../controllers/aiController');

// Tüm AI endpoint'leri JWT auth gerektirir
router.post('/chat', authMiddleware, validateAIRequest, agentChat);
router.get('/health', authMiddleware, getHealth);
router.get('/models', authMiddleware, getModels);
router.get('/approvals/my', authMiddleware, getMyApprovals);
router.post('/approvals/:id/approve', authMiddleware, aiMutationLimiter, approveAIAction);
router.post('/approvals/:id/reject', authMiddleware, aiMutationLimiter, rejectAIAction);
router.post('/execute-tool', authMiddleware, aiMutationLimiter, executeTool);

module.exports = router;
