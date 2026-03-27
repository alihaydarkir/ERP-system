const ApprovalRequest = require('../models/ApprovalRequest');

class AIApprovalService {
  async createRequest({
    company_id,
    requested_by_user_id,
    agent_tool,
    agent_input,
    risk_level,
    required_role,
    summary
  }) {
    return ApprovalRequest.create({
      company_id,
      requested_by_user_id,
      approval_type: 'ai_agent',
      agent_tool,
      agent_input,
      risk_level,
      required_role,
      summary: summary || null
    });
  }

  async getPendingForRequester({ company_id, user_id }) {
    return ApprovalRequest.getPendingForRequester({ company_id, user_id });
  }

  async findById(id) {
    return ApprovalRequest.findById(id);
  }

  async approve({ id, approver_user_id, note }) {
    return ApprovalRequest.approve({ id, approver_user_id, note });
  }

  async reject({ id, approver_user_id, note }) {
    return ApprovalRequest.reject({ id, approver_user_id, note });
  }

  async markExecuted({ id, result_payload }) {
    return ApprovalRequest.markExecuted({ id, result_payload });
  }

  async markExecutionFailed({ id, error_message }) {
    return ApprovalRequest.markExecutionFailed({ id, error_message });
  }
}

module.exports = new AIApprovalService();
