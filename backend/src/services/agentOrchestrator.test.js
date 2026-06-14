jest.mock('./tools', () => ({
  isMutationTool: jest.fn((tool) => ['cancel_order', 'set_product_stock', 'deactivate_product'].includes(tool)),
  validateToolArgs: jest.fn(() => ({ valid: true, sanitizedArgs: {} })),
  execute: jest.fn(async (tool) => ({ ok: true, tool })),
  toOllamaTools: jest.fn(() => [
    { type: 'function', function: { name: 'cancel_order', description: 'test', parameters: {} } }
  ]),
  definitions: []
}));

jest.mock('./aiGateway', () => ({
  chat: jest.fn(async (messages) => {
    const first = messages[0]?.content || '';
    if (first.includes('JSON döndür')) {
      return {
        content: JSON.stringify({
          steps: [{ tool: 'cancel_order', args: { order_identifier: 'ORD-1' } }],
          strategy: 'test'
        })
      };
    }

    if (first.includes('Sadece JSON döndür: {"consistent"')) {
      return { content: JSON.stringify({ consistent: true, notes: [] }) };
    }

    return { content: 'Tamamdır.' };
  }),
  chatWithTools: jest.fn(async () => ({
    content: '',
    tool_calls: [{ function: { name: 'cancel_order', arguments: { order_identifier: 'ORD-1' } } }]
  }))
}));

const AgentOrchestrator = require('./agentOrchestrator');

describe('AgentOrchestrator', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('query path strips mutation steps and asks for explicit action', async () => {
    // run() artık SADECE sorgu yoludur; mutation niyeti aiService'te ayrı onaylı
    // akışta işlenir. Planner yanlışlıkla yazma aracı seçerse run() onu eler.
    process.env.AI_AUTOMATION_MODE = 'copilot';
    const orchestrator = new AgentOrchestrator();

    const requestApproval = jest.fn(async () => ({ id: 99 }));
    const result = await orchestrator.run({
      userMessage: 'siparişi iptal et',
      context: { company_id: 1, user_id: 7, role: 'admin' },
      fallbackTools: [{ name: 'cancel_order', args: { order_identifier: 'ORD-1' } }],
      hasMutationPermission: async () => ({ allowed: true, requiredPermission: null }),
      requestApproval
    });

    // Mutation sorgu yolundan çıkarıldı: onay istenmez, araç çalıştırılmaz.
    expect(result.meta.mutation_blocked_in_query_path).toBe(true);
    expect(result.steps.find((s) => s.type === 'approval_required')).toBeUndefined();
    expect(requestApproval).not.toHaveBeenCalled();
  });

  test('permission denied mutation returns tool_error', async () => {
    process.env.AI_AUTOMATION_MODE = 'transactional';
    const orchestrator = new AgentOrchestrator();

    const result = await orchestrator.execute({
      plan: {
        steps: [{ tool: 'set_product_stock', args: { product_identifier: 'A', stock_quantity: 1 } }]
      },
      context: { company_id: 1, user_id: 8, role: 'user' },
      hasMutationPermission: async () => ({ allowed: false, requiredPermission: 'products.edit' }),
      requestApproval: async () => ({ id: 1 })
    });

    const deniedStep = result.steps.find((s) => s.type === 'tool_error');
    expect(deniedStep).toBeTruthy();
    expect(deniedStep.error).toContain('Permission denied');
  });

  test('high risk tool requires approval even in transactional mode', async () => {
    process.env.AI_AUTOMATION_MODE = 'transactional';
    const orchestrator = new AgentOrchestrator();

    const result = await orchestrator.execute({
      plan: {
        steps: [{ tool: 'deactivate_product', args: { product_identifier: 'ABC' } }]
      },
      context: { company_id: 1, user_id: 8, role: 'admin' },
      hasMutationPermission: async () => ({ allowed: true, requiredPermission: null }),
      requestApproval: async () => ({ id: 42 })
    });

    const approvalStep = result.steps.find((s) => s.type === 'approval_required');
    expect(approvalStep).toBeTruthy();
    expect(approvalStep.approval_id).toBe(42);
  });

  test('low risk mutation executes directly when approval not required', async () => {
    process.env.AI_AUTOMATION_MODE = 'transactional';
    const orchestrator = new AgentOrchestrator();

    const result = await orchestrator.execute({
      plan: {
        steps: [{ tool: 'set_product_stock', args: { product_identifier: 'A', stock_quantity: 5 } }]
      },
      context: { company_id: 1, user_id: 8, role: 'manager' },
      hasMutationPermission: async () => ({ allowed: true, requiredPermission: null }),
      requestApproval: async () => ({ id: 1 })
    });

    const approvalStep = result.steps.find((s) => s.type === 'approval_required');
    const resultStep = result.steps.find((s) => s.type === 'tool_result');

    expect(approvalStep).toBeFalsy();
    expect(resultStep).toBeTruthy();
    expect(resultStep.tool).toBe('set_product_stock');
  });
});
