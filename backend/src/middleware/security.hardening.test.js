// Güvenlik denetimi (29.10.2026) regresyon testleri: origin önek tuzağı, IP sahteciliği,
// girdi bekçisi (null byte / derinlik / prototip anahtarları), bozuk çerez.
jest.mock('../config/database', () => ({ query: jest.fn() }));
jest.mock('../config/env', () => ({
  config: {
    nodeEnv: 'production',
    corsOrigins: ['http://localhost:5173'],
    security: { allowedHosts: ['localhost:5000'], strictOriginCheck: true },
  },
}));

const { originCheck, inputGuard, csrfProtection, ipAccessControl } = require('./security');
const pool = require('../config/database');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('originCheck — tam köken eşleşmesi', () => {
  const run = (headers) => {
    const res = createRes();
    const next = jest.fn();
    originCheck({ method: 'POST', headers }, res, next);
    return { res, next };
  };

  it('izinli köken geçer', () => {
    expect(run({ origin: 'http://localhost:5173' }).next).toHaveBeenCalled();
  });

  it('önek tuzağı (localhost:5173.evil.com) reddedilir', () => {
    const { res, next } = run({ origin: 'http://localhost:5173.evil.com' });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('alt yol / farklı port / farklı şema reddedilir', () => {
    for (const origin of ['http://localhost:51730', 'https://localhost:5173', 'http://localhost:5173@evil.com']) {
      expect(run({ origin }).next).not.toHaveBeenCalled();
    }
  });

  it('Origin yoksa, Referer da önek tuzağıysa reddedilir', () => {
    expect(run({ referer: 'http://localhost:5173.evil.com/x' }).next).not.toHaveBeenCalled();
    expect(run({ referer: 'http://localhost:5173/sayfa' }).next).toHaveBeenCalled();
  });

  it('"null" origin reddedilir', () => {
    expect(run({ origin: 'null' }).next).not.toHaveBeenCalled();
  });
});

describe('ipAccessControl — X-Forwarded-For sahteciliği', () => {
  beforeEach(() => pool.query.mockReset());

  it('kara liste sorgusu başlıktaki değil gerçek (req.ip) adresle yapılır', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const req = { headers: { 'x-forwarded-for': '8.8.8.8' }, ip: '::ffff:172.18.0.1', connection: {} };
    await ipAccessControl(req, createRes(), jest.fn());
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['172.18.0.1']);
  });
});

describe('inputGuard', () => {
  const run = (req) => {
    const res = createRes();
    const next = jest.fn();
    inputGuard({ body: {}, query: {}, params: {}, ...req }, res, next);
    return { res, next };
  };

  it('normal istek geçer', () => {
    expect(run({ body: { name: 'Ürün', items: [{ product_id: 1, quantity: 2 }] } }).next).toHaveBeenCalled();
  });

  it('null byte içeren değer 400', () => {
    const { res, next } = run({ body: { name: 'a\u0000b' } });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('null byte içeren sorgu parametresi ve anahtar 400', () => {
    expect(run({ query: { search: 'x\u0000' } }).res.status).toHaveBeenCalledWith(400);
    expect(run({ body: { 'a\u0000': 1 } }).res.status).toHaveBeenCalledWith(400);
  });

  it('aşırı iç içe yapı 400 (yığın taşırmadan)', () => {
    let deep = {};
    const root = deep;
    for (let i = 0; i < 50000; i++) { deep.a = {}; deep = deep.a; }
    const { res, next } = run({ body: root });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('çok geniş yapı 400', () => {
    const wide = {};
    for (let i = 0; i < 25000; i++) wide[`k${i}`] = {};
    expect(run({ body: wide }).res.status).toHaveBeenCalledWith(400);
  });

  it('prototip kirletme anahtarları 400', () => {
    const body = JSON.parse('{"__proto__": {"admin": true}}');
    expect(run({ body }).res.status).toHaveBeenCalledWith(400);
    expect(run({ body: { constructor: { prototype: {} } } }).res.status).toHaveBeenCalledWith(400);
  });
});

describe('csrfProtection — bozuk çerez', () => {
  it('bozuk yüzde-kodlu csrf çerezi istisna fırlatmaz, 403 döner', () => {
    const res = createRes();
    const next = jest.fn();
    expect(() => csrfProtection({
      method: 'POST', path: '/api/products', headers: { cookie: 'csrf_token=%E0%A4%A', 'x-csrf-token': 'x' },
    }, res, next)).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
