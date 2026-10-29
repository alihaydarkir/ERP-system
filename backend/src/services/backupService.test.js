// Gerçek dosyalarla (geçici klasör), kriptografi sahte: zarf = "sır|anahtar"
jest.mock('./backupCrypto', () => ({
  MIN_PASSWORD_LENGTH: 12,
  normalizeRecoveryCode: (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
  validatePassword: (p) => {
    if (typeof p !== 'string' || p.length < 12) throw Object.assign(new Error('en az 12'), { status: 400 });
  },
  generateRecoveryCode: jest.fn(() => 'YENI-KODD-AAAA-BBBB-CCCC-DDDD'),
  wrap: jest.fn(async (identity, secret) => `${secret}|${identity}`),
  unwrap: jest.fn(async (wrapped, secret) => (wrapped.startsWith(`${secret}|`) ? wrapped.slice(secret.length + 1) : null)),
  createKeys: jest.fn(async (password) => ({
    recipient: 'age1acikanahtar000000000000000000000000000000000000000000000',
    passwordEnvelope: `${password}|AGE-SECRET-KEY-1GIZLI`,
    recoveryEnvelope: 'KODKODKODKOD|AGE-SECRET-KEY-1GIZLI',
    recoveryCode: 'KODK-ODKO-DKOD',
  })),
  decryptStream: jest.fn(),
}));

const fs = require('fs');
const os = require('os');
const path = require('path');
const backupCrypto = require('./backupCrypto');
const backupService = require('./backupService');

const PW = 'dogru-parola-123';
let dir;
const originalEnv = { ...process.env };

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yedek-test-'));
  process.env.BACKUP_DIR = dir;
  process.env.DEPLOYMENT_MODE = 'onprem';
  jest.clearAllMocks();
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  process.env = { ...originalEnv };
});

const readKeyFile = () => JSON.parse(fs.readFileSync(path.join(dir, '.anahtar.json'), 'utf8'));

describe('backupService', () => {
  it('cloud modunda parola işlemleri kapalı', async () => {
    process.env.DEPLOYMENT_MODE = 'cloud';
    await expect(backupService.setup({ password: PW, userId: 1 })).rejects.toMatchObject({ status: 403, code: 'ONPREM_ONLY' });
    expect((await backupService.getStatus()).available).toBe(false);
  });

  it('kurulum: zarflar ve açık anahtar yedek klasörüne yazılır, ikinci kurulum reddedilir', async () => {
    const { recoveryCode } = await backupService.setup({ password: PW, userId: 7 });
    expect(recoveryCode).toBe('KODK-ODKO-DKOD');

    const keys = readKeyFile();
    expect(keys).toMatchObject({ version: 1, created_by: 7, recipient: expect.stringMatching(/^age1/) });
    expect(fs.readFileSync(path.join(dir, '.alici'), 'utf8').trim()).toBe(keys.recipient);
    expect(fs.existsSync(path.join(dir, '.anahtar.json.tmp'))).toBe(false);

    await expect(backupService.setup({ password: PW, userId: 7 })).rejects.toMatchObject({ status: 409 });
  });

  it('durum yanıtında zarf/anahtar yok', async () => {
    await backupService.setup({ password: PW, userId: 1 });
    const status = await backupService.getStatus();
    expect(status.configured).toBe(true);
    expect(JSON.stringify(status)).not.toMatch(/SECRET|Envelope|dogru-parola/);
  });

  it('parola değişimi: yanlış mevcut parola 400; doğruysa yalnız parola zarfı değişir', async () => {
    await backupService.setup({ password: PW, userId: 1 });
    const before = readKeyFile();

    await expect(backupService.changePassword({ currentPassword: 'yanlis-parola-1', newPassword: 'yeni-parola-456' }))
      .rejects.toMatchObject({ status: 400, code: 'WRONG_PASSWORD' });
    await expect(backupService.changePassword({ currentPassword: PW, newPassword: 'kisa' }))
      .rejects.toMatchObject({ status: 400 });

    await backupService.changePassword({ currentPassword: PW, newPassword: 'yeni-parola-456' });
    const after = readKeyFile();
    expect(after.passwordEnvelope).toBe('yeni-parola-456|AGE-SECRET-KEY-1GIZLI');
    expect(after.recipient).toBe(before.recipient);
    expect(after.recoveryEnvelope).toBe(before.recoveryEnvelope);
  });

  it('kurtarma: kod (küçük harf/tireli) ile yeni parola; yanlış kod 400', async () => {
    await backupService.setup({ password: PW, userId: 1 });
    await expect(backupService.recover({ recoveryCode: 'yanlis', newPassword: 'yeni-parola-456' }))
      .rejects.toMatchObject({ code: 'WRONG_RECOVERY_CODE' });

    await backupService.recover({ recoveryCode: 'kodk-odko-dkod', newPassword: 'yeni-parola-456' });
    expect(readKeyFile().passwordEnvelope).toBe('yeni-parola-456|AGE-SECRET-KEY-1GIZLI');
  });

  it('yeni kurtarma kodu: parola ister, eski kodun zarfı değişir', async () => {
    await backupService.setup({ password: PW, userId: 1 });
    await expect(backupService.rotateRecoveryCode({ password: 'yanlis-parola-1' })).rejects.toMatchObject({ status: 400 });

    const { recoveryCode } = await backupService.rotateRecoveryCode({ password: PW });
    expect(recoveryCode).toBe('YENI-KODD-AAAA-BBBB-CCCC-DDDD');
    expect(readKeyFile().recoveryEnvelope).toBe('YENIKODDAAAABBBBCCCCDDDD|AGE-SECRET-KEY-1GIZLI');
  });

  it('yedek listesi en yeniden eskiye; şifresiz yedek sayılır', async () => {
    fs.writeFileSync(path.join(dir, 'erp_db_eski.dump'), 'x');
    fs.utimesSync(path.join(dir, 'erp_db_eski.dump'), new Date('2026-01-01'), new Date('2026-01-01'));
    fs.writeFileSync(path.join(dir, 'erp_db_yeni.dump.age'), 'y');
    fs.writeFileSync(path.join(dir, 'baska.txt'), 'z');

    const status = await backupService.getStatus();
    expect(status.backups.map((b) => b.name)).toEqual(['erp_db_yeni.dump.age', 'erp_db_eski.dump']);
    expect(status.unencrypted_count).toBe(1);
  });

  it('doğrulama: son şifreli yedeğin başlığı PGDMP olmalı', async () => {
    await backupService.setup({ password: PW, userId: 1 });
    fs.writeFileSync(path.join(dir, 'erp_db_1.dump.age'), 'sifreli');

    const streamOf = (text) => new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode(text)); controller.close(); },
    });

    backupCrypto.decryptStream.mockResolvedValueOnce(streamOf('PGDMP\u0001...'));
    await expect(backupService.verifyLatest({ password: PW })).resolves.toMatchObject({ file: 'erp_db_1.dump.age' });
    expect(backupCrypto.decryptStream).toHaveBeenCalledWith('AGE-SECRET-KEY-1GIZLI', expect.anything());

    backupCrypto.decryptStream.mockResolvedValueOnce(streamOf('cop veri'));
    await expect(backupService.verifyLatest({ password: PW })).rejects.toMatchObject({ code: 'NOT_A_DUMP' });

    await expect(backupService.verifyLatest({ password: 'yanlis-parola-1' })).rejects.toMatchObject({ code: 'WRONG_PASSWORD' });
  });
});
