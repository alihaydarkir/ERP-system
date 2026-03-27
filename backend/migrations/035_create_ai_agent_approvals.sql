CREATE TABLE IF NOT EXISTS ai_agent_approvals (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requested_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approval_type VARCHAR(50) NOT NULL DEFAULT 'ai_agent',
  agent_tool VARCHAR(120) NOT NULL,
  agent_input JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('none', 'low', 'medium', 'high')),
  required_role VARCHAR(30),
  summary TEXT,
  approval_note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed', 'cancelled')),
  execution_result JSONB,
  execution_error TEXT,
  approved_at TIMESTAMP,
  executed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_approvals_company_status ON ai_agent_approvals(company_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_approvals_requester ON ai_agent_approvals(requested_by_user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_approvals_tool ON ai_agent_approvals(agent_tool);
