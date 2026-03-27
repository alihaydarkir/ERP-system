jest.mock('../services/aiService', () => ({
  checkHealth: jest.fn(async () => ({
    available: true,
    modelAvailable: true,
    currentModel: 'llama2',
    models: ['llama2']
  })),
  runAgent: jest.fn(),
  executeApprovedAction: jest.fn(async () => ({ executed: true }))
}));

jest.mock('../services/aiApprovalService', () => ({
  getPendingForRequester: jest.fn(),
  findById: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn()
}));

jest.mock('../websocket/notifier', () => ({
  notifyAIApprovalUpdated: jest.fn()
}));

const aiService = require('../services/aiService');
const aiApprovalService = require('../services/aiApprovalService');
const { notifyAIApprovalUpdated } = require('../websocket/notifier');
const { approveAIAction, rejectAIAction } = require('./aiController');

const createRes = () => {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload) => {
    res.body = payload;
    return res;
  });
  return res;
};

describe('AI approval controller flow (critical e2e scenarios)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('happy path: manager approves pending request and execution runs', async () => {
    aiApprovalService.findById.mockResolvedValueOnce({
      id: 101,
      status: 'pending',
      company_id: 1,
      requested_by_user_id: 50,
      agent_tool: 'cancel_order'
    });
    aiApprovalService.approve.mockResolvedValueOnce({
      id: 101,
      status: 'approved',
      company_id: 1,
      requested_by_user_id: 50,
      approved_by_user_id: 10,
      agent_tool: 'cancel_order'
    });

    const req = {
      params: { id: '101' },
      body: { note: 'ok' },
      user: { userId: 10, role: 'manager', company_id: 1 }
    };
    const res = createRes();

    await approveAIAction(req, res);

    expect(res.statusCode).toBe(200);
    expect(aiApprovalService.approve).toHaveBeenCalledWith({
      id: 101,
      approver_user_id: 10,
      note: 'ok'
    });
    expect(aiService.executeApprovedAction).toHaveBeenCalledWith(101, {
      user_id: 10,
      role: 'manager',
      company_id: 1
    });
    expect(notifyAIApprovalUpdated).toHaveBeenCalledWith(expect.objectContaining({
      status: 'approved',
      actor_user_id: 10
    }));
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('executed');
  });

  test('reject path: manager rejects pending request and no execution runs', async () => {
    aiApprovalService.findById.mockResolvedValueOnce({
      id: 202,
      status: 'pending',
      company_id: 1,
      requested_by_user_id: 51,
      agent_tool: 'set_cheque_status'
    });
    aiApprovalService.reject.mockResolvedValueOnce({
      id: 202,
      status: 'rejected',
      company_id: 1,
      requested_by_user_id: 51,
      approved_by_user_id: 10,
      agent_tool: 'set_cheque_status'
    });

    const req = {
      params: { id: '202' },
      body: { note: 'risk' },
      user: { userId: 10, role: 'manager', company_id: 1 }
    };
    const res = createRes();

    await rejectAIAction(req, res);

    expect(res.statusCode).toBe(200);
    expect(aiApprovalService.reject).toHaveBeenCalledWith({
      id: 202,
      approver_user_id: 10,
      note: 'risk'
    });
    expect(aiService.executeApprovedAction).not.toHaveBeenCalled();
    expect(notifyAIApprovalUpdated).toHaveBeenCalledWith(expect.objectContaining({
      status: 'rejected',
      actor_user_id: 10
    }));
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('rejected');
  });

  test('tenant isolation: non-super-admin cannot approve another company request', async () => {
    aiApprovalService.findById.mockResolvedValueOnce({
      id: 303,
      status: 'pending',
      company_id: 2,
      requested_by_user_id: 52,
      agent_tool: 'cancel_order'
    });

    const req = {
      params: { id: '303' },
      body: {},
      user: { userId: 10, role: 'manager', company_id: 1 }
    };
    const res = createRes();

    await approveAIAction(req, res);

    expect(res.statusCode).toBe(403);
    expect(aiApprovalService.approve).not.toHaveBeenCalled();
    expect(aiService.executeApprovedAction).not.toHaveBeenCalled();
    expect(notifyAIApprovalUpdated).not.toHaveBeenCalled();
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  test('role restriction: normal user cannot approve request', async () => {
    const req = {
      params: { id: '404' },
      body: {},
      user: { userId: 30, role: 'user', company_id: 1 }
    };
    const res = createRes();

    await approveAIAction(req, res);

    expect(res.statusCode).toBe(403);
    expect(aiApprovalService.findById).not.toHaveBeenCalled();
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  test('super_admin can approve request from another company', async () => {
    aiApprovalService.findById.mockResolvedValueOnce({
      id: 505,
      status: 'pending',
      company_id: 99,
      requested_by_user_id: 55,
      agent_tool: 'cancel_order'
    });
    aiApprovalService.approve.mockResolvedValueOnce({
      id: 505,
      status: 'approved',
      company_id: 99,
      requested_by_user_id: 55,
      approved_by_user_id: 1,
      agent_tool: 'cancel_order'
    });

    const req = {
      params: { id: '505' },
      body: {},
      user: { userId: 1, role: 'super_admin', company_id: 1 }
    };
    const res = createRes();

    await approveAIAction(req, res);

    expect(res.statusCode).toBe(200);
    expect(aiApprovalService.approve).toHaveBeenCalled();
    expect(aiService.executeApprovedAction).toHaveBeenCalledWith(505, {
      user_id: 1,
      role: 'super_admin',
      company_id: 1
    });
    expect(res.body.success).toBe(true);
  });

  test('idempotency/race: second approve returns not found when record already handled', async () => {
    aiApprovalService.findById.mockResolvedValueOnce({
      id: 606,
      status: 'pending',
      company_id: 1,
      requested_by_user_id: 50,
      agent_tool: 'cancel_order'
    });
    aiApprovalService.approve.mockResolvedValueOnce(null);

    const req = {
      params: { id: '606' },
      body: {},
      user: { userId: 10, role: 'manager', company_id: 1 }
    };
    const res = createRes();

    await approveAIAction(req, res);

    expect(res.statusCode).toBe(404);
    expect(aiService.executeApprovedAction).not.toHaveBeenCalled();
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  test('execution failure path returns AI_APPROVAL_EXECUTION_FAILED', async () => {
    aiApprovalService.findById.mockResolvedValueOnce({
      id: 707,
      status: 'pending',
      company_id: 1,
      requested_by_user_id: 50,
      agent_tool: 'cancel_order'
    });
    aiApprovalService.approve.mockResolvedValueOnce({
      id: 707,
      status: 'approved',
      company_id: 1,
      requested_by_user_id: 50,
      approved_by_user_id: 10,
      agent_tool: 'cancel_order'
    });
    aiService.executeApprovedAction.mockRejectedValueOnce(new Error('execution exploded'));

    const req = {
      params: { id: '707' },
      body: {},
      user: { userId: 10, role: 'manager', company_id: 1 }
    };
    const res = createRes();

    await approveAIAction(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('AI_APPROVAL_EXECUTION_FAILED');
  });

  test('pending record not found returns NOT_FOUND on reject', async () => {
    aiApprovalService.findById.mockResolvedValueOnce(null);

    const req = {
      params: { id: '808' },
      body: {},
      user: { userId: 10, role: 'manager', company_id: 1 }
    };
    const res = createRes();

    await rejectAIAction(req, res);

    expect(res.statusCode).toBe(404);
    expect(aiApprovalService.reject).not.toHaveBeenCalled();
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
