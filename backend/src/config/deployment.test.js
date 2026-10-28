const {
  getDeploymentMode,
  isOnPrem,
  isPrivateHost,
  getOnPremViolations,
  isSentryEnabled,
  superAdminAllowed,
  externalRatesAllowed,
} = require('./deployment');

describe('deployment modu', () => {
  it('varsayılan mod cloud', () => {
    expect(getDeploymentMode({})).toBe('cloud');
    expect(isOnPrem({})).toBe(false);
    expect(isOnPrem({ DEPLOYMENT_MODE: ' OnPrem ' })).toBe(true);
  });

  describe('isPrivateHost', () => {
    it.each([
      'localhost', 'host.docker.internal', 'ollama', '127.0.0.1', '10.0.0.5',
      '172.16.0.1', '172.31.255.255', '192.168.1.20', 'sunucu.local', '::1', 'fd12:3456::1',
    ])('%s yerel sayılır', (host) => {
      expect(isPrivateHost(host)).toBe(true);
    });

    it.each([
      'api.openai.com', 'ollama.example.com', '8.8.8.8', '172.32.0.1', '192.169.1.1', '2001:4860::8888', '',
    ])('%s yerel sayılmaz', (host) => {
      expect(isPrivateHost(host)).toBe(false);
    });
  });

  describe('getOnPremViolations', () => {
    it('cloud modunda hiçbir şeyi engellemez', () => {
      expect(getOnPremViolations({ AI_PROVIDER: 'openai', OLLAMA_BASE_URL: 'https://x.example.com' })).toEqual([]);
    });

    it('onprem + yerel ollama sorunsuz', () => {
      expect(getOnPremViolations({
        DEPLOYMENT_MODE: 'onprem',
        AI_PROVIDER: 'ollama',
        OLLAMA_BASE_URL: 'http://host.docker.internal:11434',
      })).toEqual([]);
      expect(getOnPremViolations({ DEPLOYMENT_MODE: 'onprem' })).toEqual([]);
    });

    it.each(['openai', 'azure', 'OpenAI'])('onprem + %s reddedilir', (provider) => {
      const violations = getOnPremViolations({ DEPLOYMENT_MODE: 'onprem', AI_PROVIDER: provider });
      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatch(/yalnızca "ollama"/);
    });

    it('onprem + dışarıdaki ollama adresi reddedilir', () => {
      const violations = getOnPremViolations({
        DEPLOYMENT_MODE: 'onprem',
        OLLAMA_BASE_URL: 'https://ollama.example.com',
      });
      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatch(/yerel ağda olmalı/);
    });

    it('onprem + geçersiz ollama adresi reddedilir', () => {
      expect(getOnPremViolations({ DEPLOYMENT_MODE: 'onprem', OLLAMA_BASE_URL: 'yok' })[0]).toMatch(/geçersiz/);
    });
  });

  describe('isSentryEnabled', () => {
    const prod = { NODE_ENV: 'production', SENTRY_DSN: 'https://k@sentry.io/1' };

    it('cloud + production + DSN → açık', () => {
      expect(isSentryEnabled(prod)).toBe(true);
    });

    it('onprem → DSN olsa bile kapalı', () => {
      expect(isSentryEnabled({ ...prod, DEPLOYMENT_MODE: 'onprem' })).toBe(false);
    });

    it('DSN yoksa veya production değilse kapalı', () => {
      expect(isSentryEnabled({ NODE_ENV: 'production' })).toBe(false);
      expect(isSentryEnabled({ ...prod, NODE_ENV: 'development' })).toBe(false);
    });
  });

  it('döviz kuru aracı varsayılan açık, ALLOW_EXTERNAL_RATES=false ile kapanır', () => {
    expect(externalRatesAllowed({})).toBe(true);
    expect(externalRatesAllowed({ DEPLOYMENT_MODE: 'onprem' })).toBe(true);
    expect(externalRatesAllowed({ ALLOW_EXTERNAL_RATES: 'false' })).toBe(false);
    expect(externalRatesAllowed({ ALLOW_EXTERNAL_RATES: 'FALSE' })).toBe(false);
  });

  it('super_admin yalnız cloud modunda', () => {
    expect(superAdminAllowed({})).toBe(true);
    expect(superAdminAllowed({ DEPLOYMENT_MODE: 'cloud' })).toBe(true);
    expect(superAdminAllowed({ DEPLOYMENT_MODE: 'onprem' })).toBe(false);
    expect(superAdminAllowed({ DEPLOYMENT_MODE: ' OnPrem ' })).toBe(false);
  });
});

describe('aiGateway onprem savunması', () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.resetModules();
  });

  const loadGateway = (env) => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, ...env };
    return require('../services/aiGateway'); // singleton: env'i yüklenirken okur
  };

  it('onprem + openai → AI çağrısından önce hata', () => {
    const gateway = loadGateway({ DEPLOYMENT_MODE: 'onprem', AI_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test' });
    expect(() => gateway.ensureProviderConfig()).toThrow(/yalnızca "ollama"/);
  });

  it('cloud + openai → izin verilir', () => {
    const gateway = loadGateway({ DEPLOYMENT_MODE: 'cloud', AI_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test' });
    expect(() => gateway.ensureProviderConfig()).not.toThrow();
  });
});

describe('döviz kuru aracı', () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.resetModules();
  });

  it('ALLOW_EXTERNAL_RATES=false iken dışarı istek atmaz', async () => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, ALLOW_EXTERNAL_RATES: 'false' };
    jest.doMock('../config/database', () => ({ query: jest.fn() }));
    const axios = require('axios');
    const getSpy = jest.spyOn(axios, 'get');
    const queryTools = require('../services/tools/queryTools');

    const result = await queryTools.get_currency_rates();

    expect(getSpy).not.toHaveBeenCalled();
    expect(result.summary_text).toMatch(/kapalı/);
    getSpy.mockRestore();
  });
});
