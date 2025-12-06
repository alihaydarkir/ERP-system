const ragService = require('../services/ragService');
const aiService = require('../services/aiService');
const AuditLog = require('../models/AuditLog');
const { formatSuccess, formatError } = require('../utils/formatters');
const { getClientIP } = require('../utils/helpers');

/**
 * Send chat message and get AI response
 */
const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json(formatError('Message cannot be empty'));
    }

    console.log(`Chat message from user ${req.user.userId}: ${message}`);

    // Generate answer using RAG
    const response = await ragService.generateAnswer(message);

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate response');
    }

    // Log chat activity
    await AuditLog.create({
      user_id: req.user.userId,
      action: 'CHAT',
      entity_type: 'chat',
      entity_id: null,
      changes: {
        user_message: message,
        ai_response: response.answer,
        context_used: response.context_used,
        sources_count: response.sources?.length || 0
      },
      ip_address: getClientIP(req)
    });

    res.json(formatSuccess({
      message: response.answer,
      sources: response.sources || [],
      context_used: response.context_used,
      timestamp: new Date()
    }));

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json(formatError('Failed to process message'));
  }
};

/**
 * Get chat history for current user
 */
const getHistory = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const history = await AuditLog.findAll({
      user_id: req.user.userId,
      action: 'CHAT',
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const formatted = history.map(log => ({
      id: log.id,
      user_message: log.changes?.user_message || '',
      ai_response: log.changes?.ai_response || '',
      context_used: log.changes?.context_used || false,
      timestamp: log.created_at
    }));

    res.json(formatSuccess({
      history: formatted,
      count: formatted.length
    }));

  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json(formatError('Failed to fetch chat history'));
  }
};

/**
 * RAG retrieval
 */
const ragRetrieval = async (req, res) => {
  try {
    const { query, limit = 5, threshold = 0.7 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json(formatError('Query cannot be empty'));
    }

    const results = await ragService.search(query, {
      limit: parseInt(limit),
      threshold: parseFloat(threshold)
    });

    if (!results.success) {
      throw new Error(results.error || 'Search failed');
    }

    res.json(formatSuccess({
      results: results.results,
      count: results.count
    }));

  } catch (error) {
    console.error('RAG retrieval error:', error);
    res.status(500).json(formatError('Failed to search knowledge base'));
  }
};

module.exports = {
  sendMessage,
  getHistory,
  ragRetrieval
};

