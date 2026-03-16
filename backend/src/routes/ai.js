const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { agentChat, getHealth, getModels } = require('../controllers/aiController');

// Tüm AI endpoint'leri JWT auth gerektirir
router.post('/chat', authMiddleware, agentChat);
router.get('/health', authMiddleware, getHealth);
router.get('/models', authMiddleware, getModels);

module.exports = router;
