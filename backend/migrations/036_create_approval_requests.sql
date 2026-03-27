CREATE TABLE IF NOT EXISTS approval_requests (
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

-- Legacy table migration (if exists)
DO $$
BEGIN
  IF to_regclass('public.ai_agent_approvals') IS NOT NULL THEN
    EXECUTE '
      INSERT INTO approval_requests (
        id,
        company_id,
        requested_by_user_id,
        approved_by_user_id,
        approval_type,
        agent_tool,
        agent_input,
        risk_level,
        required_role,
        summary,
        approval_note,
        status,
        execution_result,
        execution_error,
        approved_at,
        executed_at,
        created_at,
        updated_at
      )
      SELECT
        legacy.id,
        legacy.company_id,
        legacy.requested_by_user_id,
        legacy.approved_by_user_id,
        legacy.approval_type,
        legacy.agent_tool,
        legacy.agent_input,
        legacy.risk_level,
        legacy.required_role,
        legacy.summary,
        legacy.approval_note,
        legacy.status,
        legacy.execution_result,
        legacy.execution_error,
        legacy.approved_at,
        legacy.executed_at,
        legacy.created_at,
        legacy.updated_at
      FROM ai_agent_approvals AS legacy
      WHERE NOT EXISTS (SELECT 1 FROM approval_requests n WHERE n.id = legacy.id)
    ';
  END IF;
END $$;

SELECT setval(
  pg_get_serial_sequence('approval_requests', 'id'),
  COALESCE((SELECT MAX(id) FROM approval_requests), 1),
  true
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_company_status ON approval_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requested_by_user_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_tool ON approval_requests(agent_tool);
