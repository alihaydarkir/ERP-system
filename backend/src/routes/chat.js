const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { validate, chatSchemas, ragSchemas } = require('../utils/validators');
const { sendMessage, getHistory, ragRetrieval } = require('../controllers/chatController');

// All chat endpoints require authentication
router.post('/message', authMiddleware, validate(chatSchemas.sendMessage), sendMessage);
router.get('/history', authMiddleware, getHistory);
router.post('/rag', authMiddleware, validate(ragSchemas.search), ragRetrieval);

module.exports = router;

