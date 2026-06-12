const aiService = require('../services/aiService');
const aiApprovalService = require('../services/aiApprovalService');
const { formatSuccess, formatError } = require('../utils/formatters');
const { randomUUID } = require('crypto');
const { notifyAIApprovalUpdated } = require('../websocket/notifier');
const pool = require('../config/database');

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

/**
 * GET /api/ai/approvals/my
 * Kullanıcının bekleyen AI onay taleplerini listeler
 */
const getMyApprovals = async (req, res) => {
  try {
    const rows = await aiApprovalService.getPendingForRequester({
      company_id: req.user.company_id,
      user_id: req.user.userId
    });

    return res.json(formatSuccess({
      approvals: rows
    }));
  } catch (error) {
    return res.status(500).json(formatError(error.message));
  }
};

/**
 * POST /api/ai/approvals/:id/approve
 * AI aksiyon onayını verir ve işlemi yürütür
 */
const approveAIAction = async (req, res) => {
  const approvalId = Number(req.params.id);
  if (!Number.isInteger(approvalId) || approvalId <= 0) {
    return res.status(400).json(formatError('Geçersiz onay ID', null, 'VALIDATION_ERROR'));
  }

  const userRole = req.user.role;
  if (!['super_admin', 'admin', 'manager'].includes(userRole)) {
    return res.status(403).json(formatError('Bu işlem için onay yetkiniz yok', null, 'FORBIDDEN'));
  }

  try {
    const existing = await aiApprovalService.findById(approvalId);
    if (!existing || existing.status !== 'pending') {
      return res.status(404).json(formatError('Bekleyen onay kaydı bulunamadı', null, 'NOT_FOUND'));
    }

    if (existing.company_id !== req.user.company_id && req.user.role !== 'super_admin') {
      return res.status(403).json(formatError('Farklı şirkete ait onayı çalıştıramazsınız', null, 'FORBIDDEN'));
    }

    const approved = await aiApprovalService.approve({
      id: approvalId,
      approver_user_id: req.user.userId,
      note: req.body?.note
    });

    if (!approved) {
      return res.status(404).json(formatError('Bekleyen onay kaydı bulunamadı', null, 'NOT_FOUND'));
    }

    // executeApprovedAction handles WS notifications internally:
    //   success → notifyAIApprovalUpdated({ status: 'executed' })
    //   failure → notifyAIApprovalUpdated({ status: 'failed' })
    const executionResult = await aiService.executeApprovedAction(approvalId, {
      user_id: req.user.userId,
      role: req.user.role,
      company_id: req.user.company_id
    });

    return res.json(formatSuccess({
      approval_id: approvalId,
      status: 'executed',
      result: executionResult
    }, 'AI işlem onaylandı ve yürütüldü'));
  } catch (error) {
    return res.status(500).json(formatError(error.message, null, 'AI_APPROVAL_EXECUTION_FAILED'));
  }
};

/**
 * POST /api/ai/approvals/:id/reject
 * AI aksiyon onayını reddeder
 */
const rejectAIAction = async (req, res) => {
  const approvalId = Number(req.params.id);
  if (!Number.isInteger(approvalId) || approvalId <= 0) {
    return res.status(400).json(formatError('Geçersiz onay ID', null, 'VALIDATION_ERROR'));
  }

  const userRole = req.user.role;
  if (!['super_admin', 'admin', 'manager'].includes(userRole)) {
    return res.status(403).json(formatError('Bu işlem için onay yetkiniz yok', null, 'FORBIDDEN'));
  }

  try {
    const existing = await aiApprovalService.findById(approvalId);
    if (!existing || existing.status !== 'pending') {
      return res.status(404).json(formatError('Bekleyen onay kaydı bulunamadı', null, 'NOT_FOUND'));
    }

    if (existing.company_id !== req.user.company_id && req.user.role !== 'super_admin') {
      return res.status(403).json(formatError('Farklı şirkete ait onay reddedilemez', null, 'FORBIDDEN'));
    }

    const rejected = await aiApprovalService.reject({
      id: approvalId,
      approver_user_id: req.user.userId,
      note: req.body?.note || 'Reddedildi'
    });

    if (!rejected) {
      return res.status(404).json(formatError('Bekleyen onay kaydı bulunamadı', null, 'NOT_FOUND'));
    }

    notifyAIApprovalUpdated({
      approval: rejected,
      status: 'rejected',
      actor_user_id: req.user.userId,
      actor_role: req.user.role
    });

    return res.json(formatSuccess({
      approval_id: approvalId,
      status: 'rejected'
    }, 'AI işlem onayı reddedildi'));
  } catch (error) {
    return res.status(500).json(formatError(error.message, null, 'AI_APPROVAL_REJECT_FAILED'));
  }
};

/**
 * POST /api/ai/execute-tool
 * Direkt olarak bir tool'u form verisiyle çalıştırır — LLM planning atlayarak
 */
const executeTool = async (req, res) => {
  try {
    const { tool, args } = req.body;
    if (!tool || typeof tool !== 'string') {
      return res.status(400).json(formatError('tool adı zorunlu', null, 'VALIDATION_ERROR'));
    }
    if (!args || typeof args !== 'object') {
      return res.status(400).json(formatError('args nesnesi zorunlu', null, 'VALIDATION_ERROR'));
    }

    const result = await aiService.runDirectTool(tool, args, {
      company_id: req.user.company_id,
      user_id: req.user.userId,
      role: req.user.role
    });

    return res.json(formatSuccess(result, result.answer));
  } catch (error) {
    return res.status(500).json(formatError(error.message, null, 'TOOL_EXECUTION_ERROR'));
  }
};

/**
 * GET /api/ai/customer-dashboard
 * Müşteri rolüne özel dashboard özeti — kendi siparişleri ve çekleri
 */
const getCustomerDashboard = async (req, res) => {
  const { userId, company_id } = req.user;

  if (req.user.role !== 'customer') {
    return res.status(403).json(formatError('Bu endpoint yalnızca müşteri hesapları içindir', null, 'FORBIDDEN'));
  }

  try {
    // Kullanıcının müşteri kaydını bul
    const custR = await pool.query(
      `SELECT id, full_name, company_name FROM customers WHERE user_id = $1 AND company_id = $2 LIMIT 1`,
      [userId, company_id]
    );

    if (!custR.rows[0]) {
      return res.json(formatSuccess({
        customer: null,
        orders: { total: 0, pending: 0, completed: 0, cancelled: 0, total_spent: 0 },
        cheques: { pending_count: 0, pending_amount: 0, overdue_count: 0, overdue_amount: 0 },
        recentOrders: [],
        recentCheques: []
      }));
    }

    const customerId = custR.rows[0].id;
    const customer = custR.rows[0];

    const [orderStats, chequeStats, recentOrders, recentCheques] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                                                    AS total,
          COUNT(CASE WHEN status = 'pending'   THEN 1 END)                           AS pending,
          COUNT(CASE WHEN status = 'completed' THEN 1 END)                           AS completed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END)                           AS cancelled,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) AS total_spent
        FROM orders
        WHERE company_id = $1 AND customer_id = $2
      `, [company_id, customerId]),

      pool.query(`
        SELECT
          COUNT(CASE WHEN status = 'pending' THEN 1 END)                                           AS pending_count,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0)                    AS pending_amount,
          COUNT(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN 1 END)               AS overdue_count,
          COALESCE(SUM(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN amount ELSE 0 END), 0) AS overdue_amount
        FROM cheques
        WHERE company_id = $1 AND customer_id = $2
      `, [company_id, customerId]),

      pool.query(`
        SELECT id, order_number, status, total_amount, created_at
        FROM orders
        WHERE company_id = $1 AND customer_id = $2
        ORDER BY created_at DESC LIMIT 5
      `, [company_id, customerId]),

      pool.query(`
        SELECT id, check_serial_no, amount, due_date, status, bank_name,
               (CURRENT_DATE - due_date::date) AS days_overdue
        FROM cheques
        WHERE company_id = $1 AND customer_id = $2
        ORDER BY due_date ASC LIMIT 5
      `, [company_id, customerId])
    ]);

    return res.json(formatSuccess({
      customer,
      orders: orderStats.rows[0],
      cheques: chequeStats.rows[0],
      recentOrders: recentOrders.rows,
      recentCheques: recentCheques.rows
    }));
  } catch (error) {
    return res.status(500).json(formatError(error.message, null, 'CUSTOMER_DASHBOARD_ERROR'));
  }
};

module.exports = {
  agentChat,
  getHealth,
  getModels,
  getMyApprovals,
  approveAIAction,
  rejectAIAction,
  executeTool,
  getCustomerDashboard
};
