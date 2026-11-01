const express = require('express');

const mockAuth = jest.fn((req, res, next) => {
  if (req.headers['x-test-anon']) return res.status(401).json({ success: false });
  req.user = { userId: 10, id: 10, role: 'manager', company_id: 1 };
  return next();
});
const mockGetHistory = jest.fn((_req, res) => res.json({ ok: true, route: 'history' }));

jest.mock('../middleware/auth', () => mockAuth);
jest.mock('../controllers/chatController', () => ({ getHistory: mockGetHistory }));

const router = require('./chat');

const call = async (method, path, headers = {}) => {
  const app = express();
  app.use(express.json());
  app.use('/api/chat', router);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/chat${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: method === 'POST' ? JSON.stringify({ message: 'selam' }) : undefined
    });
    return { status: res.status, body: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

describe('/api/chat: eski RAG uçları kapalı', () => {
  it('POST /message oturumlu kullanıcıya 410 döner ve hiçbir cevap üretmez', async () => {
    const out = await call('POST', '/message');
    expect(out.status).toBe(410);
    expect(out.body.code).toBe('ENDPOINT_REMOVED');
  });

  it('POST /rag 410 döner', async () => {
    expect((await call('POST', '/rag')).status).toBe(410);
  });

  it('oturumsuz istek önce 401 alır (kimlik doğrulaması 410\'dan önce)', async () => {
    expect((await call('POST', '/message', { 'x-test-anon': '1' })).status).toBe(401);
  });

  it('GET /history çalışmaya devam eder', async () => {
    const out = await call('GET', '/history');
    expect(out.status).toBe(200);
    expect(out.body.route).toBe('history');
  });
});
