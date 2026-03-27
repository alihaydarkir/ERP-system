const events = require('./events');

let wsHandlers = null;

const setWebSocketHandlers = (handlers) => {
  wsHandlers = handlers;
};

const emitToApprovers = (eventType, payload, companyId) => {
  if (!wsHandlers || typeof wsHandlers.sendToApprovers !== 'function') return;
  wsHandlers.sendToApprovers(eventType, payload, { companyId });
};

const emitToUser = (userId, eventType, payload) => {
  if (!wsHandlers || typeof wsHandlers.sendToUser !== 'function') return;
  if (!userId) return;
  wsHandlers.sendToUser(userId, eventType, payload);
};

const notifyAIApprovalRequested = ({ approval, requester }) => {
  if (!approval) return;

  const payload = {
    type: 'ai_approval_required',
    approval_id: approval.id,
    status: approval.status,
    risk_level: approval.risk_level,
    required_role: approval.required_role,
    agent_tool: approval.agent_tool,
    summary: approval.summary,
    company_id: approval.company_id,
    requested_by_user_id: approval.requested_by_user_id,
    requested_by_username: requester?.username || null,
    timestamp: new Date().toISOString()
  };

  emitToApprovers(events.AI_APPROVAL_REQUESTED, payload, approval.company_id);
  emitToApprovers(events.NOTIFICATION, payload, approval.company_id);
};

const notifyAIApprovalUpdated = ({ approval, status, actor_user_id, actor_role, execution_result, execution_error }) => {
  if (!approval) return;

  const payload = {
    type: 'ai_approval_status_update',
    approval_id: approval.id,
    status,
    agent_tool: approval.agent_tool,
    company_id: approval.company_id,
    requested_by_user_id: approval.requested_by_user_id,
    approved_by_user_id: approval.approved_by_user_id,
    actor_user_id: actor_user_id || null,
    actor_role: actor_role || null,
    execution_result: execution_result || null,
    execution_error: execution_error || null,
    timestamp: new Date().toISOString()
  };

  emitToApprovers(events.AI_APPROVAL_UPDATED, payload, approval.company_id);
  emitToApprovers(events.NOTIFICATION, payload, approval.company_id);
  emitToUser(approval.requested_by_user_id, events.AI_APPROVAL_UPDATED, payload);
  emitToUser(approval.requested_by_user_id, events.NOTIFICATION, payload);
};

module.exports = {
  setWebSocketHandlers,
  notifyAIApprovalRequested,
  notifyAIApprovalUpdated
};
