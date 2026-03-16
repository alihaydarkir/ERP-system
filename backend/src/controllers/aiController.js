const aiService = require('../services/aiService');
const { formatSuccess, formatError } = require('../utils/formatters');
const { randomUUID } = require('crypto');

/**
 * POST /api/ai/chat
 * Agent AI ile sohbet — ERP verilerine erişebilir
 */
const agentChat = async (req, res) => {
  const startedAt = Date.now();
  const requestId = randomUUID();
  try {
    const { message } = req.body;
    const company_id = req.user.company_id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json(formatError('Mesaj boş olamaz', null, 'VALIDATION_ERROR'));
    }

    if (message.length > 1000) {
      return res.status(400).json(formatError('Mesaj çok uzun (maksimum 1000 karakter)', null, 'VALIDATION_ERROR'));
    }

    // Ollama çalışıyor mu kontrol et
    const health = await aiService.checkHealth();
    if (!health.available) {
      return res.status(503).json(formatError(
        'AI servisi şu an kullanılamıyor. Lütfen Ollama\'nın çalıştığından emin olun.',
        null,
        'AI_UNAVAILABLE'
      ));
    }

    if (!health.modelAvailable) {
      return res.status(503).json(formatError(
        `Model "${health.currentModel}" bulunamadı. Mevcut modeller: ${health.models.join(', ') || 'Yok'}`,
        null,
        'MODEL_NOT_FOUND'
      ));
    }

    console.log(`[AI Agent][${requestId}] User ${req.user.userId} | Company ${company_id} | Message: ${message.substring(0, 80)}...`);

    const result = await aiService.runAgent(message, {
      company_id,
      user_id: req.user.userId,
      role: req.user.role
    });
    const steps = Array.isArray(result.steps) ? result.steps : [];
    const toolsUsed = steps.filter((s) => s.type === 'tool_call').map((s) => s.tool);

    const payload = {
      answer: result.answer || 'Kayıt bulunamadı.',
      steps,
      model: health.currentModel,
      tools: {
        used: toolsUsed,
        results: steps.filter((s) => s.type === 'tool_result').map((s) => ({
          tool: s.tool,
          result: s.result
        })),
        errors: steps.filter((s) => s.type === 'tool_error').map((s) => ({
          tool: s.tool,
          error: s.error
        }))
      },
      meta: {
        request_id: requestId,
        duration_ms: Date.now() - startedAt,
        requested_at: new Date(startedAt).toISOString(),
        agent: result.meta || {}
      }
    };

    return res.json(formatSuccess(payload, 'AI yanıtı üretildi'));

  } catch (error) {
    console.error(`[AI Agent][${requestId}] Error:`, error.message);
    return res.status(500).json(formatError(
      `AI yanıt üretemedi [${requestId}]: ` + error.message,
      null,
      'AI_AGENT_ERROR'
    ));
  }
};

/**
 * GET /api/ai/health
 * Ollama sağlık kontrolü
 */
const getHealth = async (req, res) => {
  try {
    const health = await aiService.checkHealth();
    return res.json(formatSuccess(health));
  } catch (error) {
    return res.status(500).json(formatError(error.message));
  }
};

/**
 * GET /api/ai/models
 * Mevcut Ollama modellerini listele
 */
const getModels = async (req, res) => {
  try {
    const health = await aiService.checkHealth();
    return res.json(formatSuccess({
      models: health.models || [],
      currentModel: health.currentModel,
      available: health.available
    }));
  } catch (error) {
    return res.status(500).json(formatError(error.message));
  }
};

module.exports = { agentChat, getHealth, getModels };
