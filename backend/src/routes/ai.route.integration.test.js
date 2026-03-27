const express = require('express');

const mockAuthMiddleware = jest.fn((req, _res, next) => {
  req.user = { userId: 10, id: 10, role: 'manager', company_id: 1 };
  next();
});

const mockAiMutationLimiter = jest.fn((_req, _res, next) => next());

const mockAgentChat = jest.fn((req, res) => res.json({ ok: true, route: 'chat', message: req.body?.message || null }));
const mockGetHealth = jest.fn((_req, res) => res.json({ ok: true, route: 'health' }));
const mockGetModels = jest.fn((_req, res) => res.json({ ok: true, route: 'models' }));
const mockGetMyApprovals = jest.fn((_req, res) => res.json({ ok: true, route: 'approvals_my' }));
const mockApproveAIAction = jest.fn((_req, res) => res.json({ ok: true, route: 'approve' }));
const mockRejectAIAction = jest.fn((_req, res) => res.json({ ok: true, route: 'reject' }));

jest.mock('../middleware/auth', () => mockAuthMiddleware);
jest.mock('../middleware/rateLimit', () => ({
  aiMutationLimiter: mockAiMutationLimiter
}));
jest.mock('../controllers/aiController', () => ({
  agentChat: mockAgentChat,
  getHealth: mockGetHealth,
  getModels: mockGetModels,
  getMyApprovals: mockGetMyApprovals,
  approveAIAction: mockApproveAIAction,
  rejectAIAction: mockRejectAIAction
}));

const router = require('./ai');

const createTestServer = async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/ai', router);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { server, baseUrl };
};

describe('AI routes integration (router + middleware chain)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/ai/chat non-mutation path does not trigger mutation limiter', async () => {
    const { server, baseUrl } = await createTestServer();

    try {
      const response = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'merhaba nasılsın' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockAuthMiddleware).toHaveBeenCalled();
      expect(mockAiMutationLimiter).not.toHaveBeenCalled();
      expect(mockAgentChat).toHaveBeenCalled();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('POST /api/ai/chat mutation intent path triggers mutation limiter', async () => {
    const { server, baseUrl } = await createTestServer();

    try {
      const response = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'siparişi iptal et' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockAiMutationLimiter).toHaveBeenCalled();
      expect(mockAgentChat).toHaveBeenCalled();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('POST /api/ai/approvals/:id/approve uses mutation limiter and approve controller', async () => {
    const { server, baseUrl } = await createTestServer();

    try {
      const response = await fetch(`${baseUrl}/api/ai/approvals/9/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'go' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockAiMutationLimiter).toHaveBeenCalled();
      expect(mockApproveAIAction).toHaveBeenCalled();
      expect(mockRejectAIAction).not.toHaveBeenCalled();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
