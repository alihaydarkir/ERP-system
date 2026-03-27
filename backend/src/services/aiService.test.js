jest.mock('./tools', () => ({
  isMutationTool: jest.fn((tool) => ['cancel_order', 'set_cheque_status', 'deactivate_product', 'set_product_stock'].includes(tool)),
  validateToolArgs: jest.fn(() => ({ valid: true, sanitizedArgs: { order_identifier: 'ORD-1' } })),
  execute: jest.fn(async (tool, args) => ({ ok: true, tool, args }))
}));

jest.mock('./permissionService', () => ({
  hasPermission: jest.fn(async () => true)
}));

jest.mock('../config/database', () => ({
  query: jest.fn(async () => ({ rows: [{ role: 'admin' }] }))
}));

jest.mock('./aiGateway', () => ({
  getProvider: jest.fn(() => 'ollama'),
  getDefaultModel: jest.fn(() => 'llama2'),
  chat: jest.fn(async () => ({ content: 'ok', model: 'llama2' })),
  generate: jest.fn(async () => ({ content: 'ok', model: 'llama2', context: [] })),
  embeddings: jest.fn(async () => ({ embedding: [0.1, 0.2] })),
  health: jest.fn(async () => ({ available: true, modelAvailable: true, currentModel: 'llama2', models: ['llama2'] }))
}));

jest.mock('./aiApprovalService', () => ({
  createRequest: jest.fn(async (payload) => ({
    id: 777,
    status: 'pending',
    ...payload
  })),
  findById: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  markExecuted: jest.fn(),
  markExecutionFailed: jest.fn()
}));

jest.mock('../websocket/notifier', () => ({
  notifyAIApprovalRequested: jest.fn(),
  notifyAIApprovalUpdated: jest.fn()
}));

jest.mock('./agentOrchestrator', () => {
  return jest.fn().mockImplementation(() => ({
    run: jest.fn(async () => ({
      answer: 'ok',
      steps: [],
      meta: {}
    }))
  }));
});

const aiService = require('./aiService');
const aiApprovalService = require('./aiApprovalService');
const agentTools = require('./tools');
const { notifyAIApprovalRequested, notifyAIApprovalUpdated } = require('../websocket/notifier');

describe('AIService high-risk approval flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_AUTOMATION_MODE = 'transactional';
  });

  test('creates approval request for high-risk cancel_order tool', async () => {
    const result = await aiService.runAgent('ORD-1 siparişini iptal et', {
      company_id: 1,
      user_id: 10,
      role: 'admin'
    });

    expect(aiApprovalService.createRequest).toHaveBeenCalled();
    expect(notifyAIApprovalRequested).toHaveBeenCalled();
    expect(result.meta.requires_human_approval).toBe(true);
    expect(result.meta.approval_id).toBe(777);
  });

  test('detects high-risk delete/deactivate tools', () => {
    expect(aiService.isHighRiskMutationTool('deactivate_product')).toBe(true);
    expect(aiService.isHighRiskMutationTool('delete_customer')).toBe(true);
    expect(aiService.isHighRiskMutationTool('set_product_stock')).toBe(false);
  });

  test('forces external approval for high-risk tool', () => {
    expect(aiService.shouldRequireExternalApproval('cancel_order')).toBe(true);
  });

  test('executeApprovedAction throws when approval record not found', async () => {
    aiApprovalService.findById.mockResolvedValueOnce(null);

    await expect(aiService.executeApprovedAction(999, {
      user_id: 1,
      role: 'admin',
      company_id: 1
    })).rejects.toThrow('Onay kaydı bulunamadı');
  });

  test('executeApprovedAction throws when approval not approved yet', async () => {
    aiApprovalService.findById.mockResolvedValueOnce({
      id: 7,
      status: 'pending',
      company_id: 1,
      requested_by_user_id: 10,
      required_role: 'manager',
      agent_tool: 'cancel_order',
      agent_input: { order_identifier: 'ORD-1' }
    });

    await expect(aiService.executeApprovedAction(7, {
      user_id: 1,
      role: 'admin',
      company_id: 1
    })).rejects.toThrow('Bu kayıt henüz approved durumunda değil');
  });

  test('executeApprovedAction marks executed and emits websocket update', async () => {
    aiApprovalService.findById.mockResolvedValueOnce({
      id: 11,
      status: 'approved',
      company_id: 1,
      requested_by_user_id: 10,
      required_role: 'manager',
      agent_tool: 'cancel_order',
      agent_input: { order_identifier: 'ORD-1' },
      approved_by_user_id: 2
    });

    const result = await aiService.executeApprovedAction(11, {
      user_id: 2,
      role: 'admin',
      company_id: 1
    });

    expect(result.ok).toBe(true);
    expect(aiApprovalService.markExecuted).toHaveBeenCalledWith({
      id: 11,
      result_payload: expect.any(Object)
    });
    expect(notifyAIApprovalUpdated).toHaveBeenCalledWith(expect.objectContaining({
      status: 'executed',
      actor_user_id: 2,
      actor_role: 'admin'
    }));
  });

  test('executeApprovedAction marks failed when tool execution errors', async () => {
    aiApprovalService.findById.mockResolvedValueOnce({
      id: 12,
      status: 'approved',
      company_id: 1,
      requested_by_user_id: 10,
      required_role: 'manager',
      agent_tool: 'cancel_order',
      agent_input: { order_identifier: 'ORD-1' },
      approved_by_user_id: 2
    });

    agentTools.execute.mockRejectedValueOnce(new Error('Tool boom'));

    await expect(aiService.executeApprovedAction(12, {
      user_id: 2,
      role: 'admin',
      company_id: 1
    })).rejects.toThrow('Tool boom');

    expect(aiApprovalService.markExecutionFailed).toHaveBeenCalledWith({
      id: 12,
      error_message: 'Tool boom'
    });
    expect(notifyAIApprovalUpdated).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      execution_error: 'Tool boom'
    }));
  });
});
