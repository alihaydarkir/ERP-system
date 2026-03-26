jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../config/env', () => ({
  config: {
    nodeEnv: 'production',
    corsOrigins: ['http://localhost:5173'],
    security: {
      allowedHosts: ['localhost:5000', 'localhost:5173'],
      strictOriginCheck: true,
    },
  },
}));

const {
  csrfProtection,
  originCheck,
  hostHeaderCheck,
  hppSanitize,
} = require('./security');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('security middleware', () => {
  describe('csrfProtection', () => {
    it('allows safe methods', () => {
      const req = { method: 'GET', headers: {} };
      const res = createRes();
      const next = jest.fn();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('allows bearer token requests without csrf token', () => {
      const req = {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
        },
      };
      const res = createRes();
      const next = jest.fn();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('blocks cookie-based state changing request when csrf token is missing', () => {
      const req = {
        method: 'POST',
        headers: {
          cookie: 'session=abc',
        },
      };
      const res = createRes();
      const next = jest.fn();

      csrfProtection(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'CSRF doğrulaması başarısız',
      }));
    });

    it('allows cookie-based request when csrf header and cookie match', () => {
      const req = {
        method: 'POST',
        headers: {
          cookie: 'session=abc; csrf_token=my-token',
          'x-csrf-token': 'my-token',
        },
      };
      const res = createRes();
      const next = jest.fn();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('originCheck', () => {
    it('allows allowed origin for state-changing request', () => {
      const req = {
        method: 'POST',
        headers: {
          origin: 'http://localhost:5173',
        },
      };
      const res = createRes();
      const next = jest.fn();

      originCheck(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('blocks missing origin/referer for strict requests without bearer auth', () => {
      const req = {
        method: 'POST',
        headers: {},
      };
      const res = createRes();
      const next = jest.fn();

      originCheck(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Origin not allowed',
      }));
    });
  });

  describe('hostHeaderCheck', () => {
    it('allows configured hosts', () => {
      const req = {
        headers: {
          host: 'localhost:5000',
        },
      };
      const res = createRes();
      const next = jest.fn();

      hostHeaderCheck(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('blocks unknown host header', () => {
      const req = {
        headers: {
          host: 'evil.example.com',
        },
      };
      const res = createRes();
      const next = jest.fn();

      hostHeaderCheck(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Host not allowed',
      }));
    });
  });

  describe('hppSanitize', () => {
    it('collapses query arrays but preserves body arrays', () => {
      const req = {
        query: { q: ['first', 'second'] },
        params: { id: ['1', '2'] },
        body: {
          items: [
            { product_id: 1, quantity: 2 },
            { product_id: 2, quantity: 1 },
          ],
          nested: {
            tags: ['a', 'b'],
          },
        },
      };
      const res = createRes();
      const next = jest.fn();

      hppSanitize(req, res, next);

      expect(req.query.q).toBe('first');
      expect(req.params.id).toBe('1');
      expect(Array.isArray(req.body.items)).toBe(true);
      expect(req.body.items).toHaveLength(2);
      expect(req.body.nested.tags).toEqual(['a', 'b']);
      expect(next).toHaveBeenCalled();
    });
  });
});
