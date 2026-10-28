const diagnostics = require('./diagnosticsService');

describe('diagnosticsService', () => {
  beforeEach(() => diagnostics.clearEntries());

  describe('sanitize', () => {
    const s = diagnostics.sanitize;

    it('e-posta, JWT, IBAN, telefon, vergi no ve IP maskelenir', () => {
      const out = s(
        'ahmet@yilmazinsaat.com eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjF9.abc_DEF-123 ' +
        'TR33 0006 1005 1978 6457 8413 26 +90 532 123 45 67 1234567890 192.168.1.20'
      );
      expect(out).not.toMatch(/ahmet|yilmaz|eyJ|0006|532|1234567890|192\.168/);
      expect(out).toContain('[e-posta]');
      expect(out).toContain('[jwt]');
      expect(out).toContain('[iban]');
      expect(out).toContain('[numara]');
      expect(out).toContain('[ip]');
    });

    it('anahtar=değer sırları ve URL parametreleri maskelenir', () => {
      const out = s('password=Hunter2 token: abc123 GET /api/customers?search=Kaya%20Tekstil');
      expect(out).not.toMatch(/Hunter2|abc123|Kaya/);
      expect(out).toContain('/api/customers?[parametre]');
    });

    it('postgres detayındaki değer maskelenir', () => {
      const out = s('Key (email)=(fatma@kayatekstil.com) already exists. Key (tax_number)=(1234567) x');
      expect(out).not.toMatch(/fatma|kaya|1234567/);
      expect(out).toContain('Key (email)=([değer])');
    });

    it('tırnak içi değerler maskelenir, kod tanımlayıcıları kalır', () => {
      const out = s(`invalid input syntax for type integer: "Ahmet Yılmaz" (reading 'id') column "company_id"`);
      expect(out).not.toContain('Ahmet');
      expect(out).toContain("(reading 'id')");
      expect(out).toContain('column "company_id"');
    });

    it('uzun girdiler kısaltılır', () => {
      expect(s('x'.repeat(5000)).length).toBeLessThanOrEqual(2001);
    });
  });

  describe('halka', () => {
    it('kayıtlar maskelenmiş saklanır, Error yığını dahil', () => {
      diagnostics.record('error', ['Create customer error:', new Error('duplicate (email)=(a@b.com)')]);
      const [entry] = diagnostics.recentEntries();
      expect(entry.level).toBe('error');
      expect(entry.message).toContain('Create customer error');
      expect(entry.message).not.toContain('a@b.com');
      expect(entry.message).toMatch(/at /); // yığın izi korunur
    });

    it(`en fazla ${diagnostics.MAX_ENTRIES} kayıt tutar`, () => {
      for (let i = 0; i < diagnostics.MAX_ENTRIES + 25; i += 1) diagnostics.record('warn', [`uyarı ${i}`]);
      const all = diagnostics.recentEntries();
      expect(all).toHaveLength(diagnostics.MAX_ENTRIES);
      expect(all[all.length - 1].message).toBe(`uyarı ${diagnostics.MAX_ENTRIES + 24}`);
    });
  });

  it('yapılandırma özeti sır içermez', () => {
    const summary = diagnostics.configSummary({
      DEPLOYMENT_MODE: 'onprem',
      OLLAMA_BASE_URL: 'http://host.docker.internal:11434',
      OLLAMA_MODEL: 'qwen3.5:9b',
      JWT_SECRET: 'cok-gizli-jwt',
      DB_PASSWORD: 'cok-gizli-db',
      SMTP_HOST: 'smtp.firma.com',
      SENTRY_DSN: 'https://key@sentry.io/1',
    });
    const text = JSON.stringify(summary);
    expect(text).not.toMatch(/cok-gizli|smtp\.firma|sentry\.io|host\.docker/);
    expect(summary).toMatchObject({
      deployment_mode: 'onprem',
      ollama_host: 'yerel',
      super_admin_allowed: false,
      sentry_enabled: false,
      smtp_configured: true,
    });
  });

  it('paket: sağlık, migration ve maskelenmiş hatalar; müşteri tablosu sorgulanmaz', async () => {
    const queries = [];
    const pool = {
      query: jest.fn(async (sql) => {
        queries.push(sql);
        if (/schema_migrations/.test(sql)) return { rows: [{ migration_name: '000_create_migrations_table.sql' }] };
        return { rows: [{ version: 'PostgreSQL 16.4, compiled', size: '42 MB' }] };
      }),
    };
    diagnostics.record('error', ['Login failed for ali@firma.com']);

    const bundle = await diagnostics.buildBundle({
      pool,
      checkAi: async () => ({ available: true, currentModel: 'qwen3.5:9b', modelAvailable: true, models: ['qwen3.5:9b'] }),
      getRedisStatus: async () => 'ok',
      company: { id: 3 },
    });

    expect(bundle.company_id).toBe(3);
    expect(bundle.health.database).toMatchObject({ status: 'ok', version: 'PostgreSQL 16.4', size: '42 MB' });
    expect(bundle.health.ai).toMatchObject({ available: true, model: 'qwen3.5:9b' });
    expect(bundle.migrations.applied_count).toBe(1);
    expect(bundle.migrations.pending.length).toBeGreaterThan(0);
    expect(JSON.stringify(bundle)).not.toContain('ali@firma.com');
    expect(queries.join(' ')).not.toMatch(/customers|products|orders|cheques|invoices|users/);
  });
});
