const events = require('./events');
const {
  setWebSocketHandlers,
  notifyAIApprovalRequested,
  notifyAIApprovalUpdated
} = require('./notifier');

describe('websocket notifier', () => {
  const handlers = {
    sendToApprovers: jest.fn(),
    sendToUser: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setWebSocketHandlers(handlers);
  });

  test('notifyAIApprovalRequested emits to approvers with dedicated event and notification', () => {
    notifyAIApprovalRequested({
      approval: {
        id: 1,
        status: 'pending',
        risk_level: 'high',
        required_role: 'manager',
        agent_tool: 'cancel_order',
        summary: 'cancel order',
        company_id: 9,
        requested_by_user_id: 70
      },
      requester: { username: 'ali' }
    });

    expect(handlers.sendToApprovers).toHaveBeenCalledWith(
      events.AI_APPROVAL_REQUESTED,
      expect.objectContaining({
        approval_id: 1,
        status: 'pending',
        requested_by_username: 'ali'
      }),
      { companyId: 9 }
    );

    expect(handlers.sendToApprovers).toHaveBeenCalledWith(
      events.NOTIFICATION,
      expect.objectContaining({
        type: 'ai_approval_required',
        approval_id: 1
      }),
      { companyId: 9 }
    );
  });

  test('notifyAIApprovalUpdated emits to approvers and requester', () => {
    notifyAIApprovalUpdated({
      approval: {
        id: 2,
        company_id: 9,
        requested_by_user_id: 70,
        approved_by_user_id: 11,
        agent_tool: 'set_cheque_status'
      },
      status: 'executed',
      actor_user_id: 11,
      actor_role: 'admin',
      execution_result: { ok: true }
    });

    expect(handlers.sendToApprovers).toHaveBeenCalledWith(
      events.AI_APPROVAL_UPDATED,
      expect.objectContaining({
        approval_id: 2,
        status: 'executed',
        actor_user_id: 11
      }),
      { companyId: 9 }
    );

    expect(handlers.sendToUser).toHaveBeenCalledWith(
      70,
      events.AI_APPROVAL_UPDATED,
      expect.objectContaining({
        approval_id: 2,
        status: 'executed'
      })
    );

    expect(handlers.sendToUser).toHaveBeenCalledWith(
      70,
      events.NOTIFICATION,
      expect.objectContaining({
        type: 'ai_approval_status_update',
        approval_id: 2
      })
    );
  });
});
