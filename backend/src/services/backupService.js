// Şifreli yedek yönetimi (Ayarlar → Yedekler). Anahtar zarfları yedeklerin yanında
// (`$BACKUP_DIR/.anahtar.json`) durur, çünkü geri yükleme çoğu zaman veritabanı bozukken
// yapılır. Zarflar parolayla/kurtarma koduyla şifreli olduğundan orada durmaları güvenlidir.
// Yedek container'ı yalnız `.alici` dosyasındaki açık anahtarı okur (docker/yedek/yedekle.sh).
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const backupCrypto = require('./backupCrypto');
const { isOnPrem } = require('../config/deployment');

const KEY_FILE = '.anahtar.json';
const RECIPIENT_FILE = '.alici';
const BACKUP_FILE = /\.dump(\.age)?$/;

const backupDir = () => process.env.BACKUP_DIR || '/backups';

const httpError = (status, message, code) => Object.assign(new Error(message), { status, code });

// Yedek parolasıyla ilgili işlemler yalnız müşterinin kendi kurulumunda: demo/bulutta yeni
// kayıt olan herkes kendi şirketinin admin'i olur ve paylaşılan yedeğin parolasını değiştirebilirdi.
const assertAvailable = () => {
  if (!isOnPrem()) {
    throw httpError(403, 'Yedek şifrelemesi yalnız şirket içi kurulumda (DEPLOYMENT_MODE=onprem) yönetilir.', 'ONPREM_ONLY');
  }
};

const writeAtomic = async (file, content) => {
  const tmp = `${file}.tmp`;
  await fs.promises.writeFile(tmp, content, { mode: 0o600 });
  await fs.promises.rename(tmp, file);
};

const readKeys = async () => {
  try {
    return JSON.parse(await fs.promises.readFile(path.join(backupDir(), KEY_FILE), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const writeKeys = async (keys) => {
  await fs.promises.mkdir(backupDir(), { recursive: true });
  await writeAtomic(path.join(backupDir(), KEY_FILE), JSON.stringify(keys, null, 2));
  await writeAtomic(path.join(backupDir(), RECIPIENT_FILE), `${keys.recipient}\n`);
};

const requireKeys = async () => {
  const keys = await readKeys();
  if (!keys) throw httpError(409, 'Yedek şifrelemesi henüz kurulmadı.', 'NOT_CONFIGURED');
  return keys;
};

const listBackups = async () => {
  let names = [];
  try {
    names = await fs.promises.readdir(backupDir());
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const files = await Promise.all(
    names.filter((name) => BACKUP_FILE.test(name)).map(async (name) => {
      const stat = await fs.promises.stat(path.join(backupDir(), name));
      return { name, size: stat.size, created_at: stat.mtime.toISOString(), encrypted: name.endsWith('.age') };
    })
  );
  return files.sort((a, b) => b.created_at.localeCompare(a.created_at));
};

const getStatus = async () => {
  const keys = await readKeys();
  const backups = await listBackups();
  return {
    available: isOnPrem(),
    configured: Boolean(keys),
    key_id: keys ? `${keys.recipient.slice(0, 10)}…${keys.recipient.slice(-6)}` : null,
    created_at: keys?.created_at || null,
    password_changed_at: keys?.password_changed_at || null,
    recovery_rotated_at: keys?.recovery_rotated_at || null,
    last_backup_at: backups[0]?.created_at || null,
    unencrypted_count: backups.filter((b) => !b.encrypted).length,
    backups: backups.slice(0, 30),
  };
};

// Kurulum: anahtar çifti + iki zarf; kurtarma kodu yalnız bu yanıtta döner
const setup = async ({ password, userId }) => {
  assertAvailable();
  if (await readKeys()) throw httpError(409, 'Yedek şifrelemesi zaten kurulu.', 'ALREADY_CONFIGURED');

  const { recipient, passwordEnvelope, recoveryEnvelope, recoveryCode } = await backupCrypto.createKeys(password);
  const now = new Date().toISOString();
  await writeKeys({
    version: 1,
    recipient,
    passwordEnvelope,
    recoveryEnvelope,
    created_at: now,
    created_by: userId,
    password_changed_at: now,
    recovery_rotated_at: now,
  });
  return { recoveryCode };
};

const changePassword = async ({ currentPassword, newPassword }) => {
  assertAvailable();
  const keys = await requireKeys();
  backupCrypto.validatePassword(newPassword);
  const identity = await backupCrypto.unwrap(keys.passwordEnvelope, currentPassword || '');
  if (!identity) throw httpError(400, 'Mevcut yedek parolası yanlış.', 'WRONG_PASSWORD');

  await writeKeys({
    ...keys,
    passwordEnvelope: await backupCrypto.wrap(identity, newPassword),
    password_changed_at: new Date().toISOString(),
  });
};

// Parola unutuldu: basılı kurtarma koduyla yeni parola. Kurtarma kodu aynı kalır.
const recover = async ({ recoveryCode, newPassword }) => {
  assertAvailable();
  const keys = await requireKeys();
  backupCrypto.validatePassword(newPassword);
  const identity = await backupCrypto.unwrap(keys.recoveryEnvelope, backupCrypto.normalizeRecoveryCode(recoveryCode));
  if (!identity) throw httpError(400, 'Kurtarma kodu yanlış.', 'WRONG_RECOVERY_CODE');

  await writeKeys({
    ...keys,
    passwordEnvelope: await backupCrypto.wrap(identity, newPassword),
    password_changed_at: new Date().toISOString(),
  });
};

// Yeni kurtarma kodu (eskisi kaybolduysa/görüldüyse): eski kod artık hiçbir yedeği açmaz
const rotateRecoveryCode = async ({ password }) => {
  assertAvailable();
  const keys = await requireKeys();
  const identity = await backupCrypto.unwrap(keys.passwordEnvelope, password || '');
  if (!identity) throw httpError(400, 'Yedek parolası yanlış.', 'WRONG_PASSWORD');

  const recoveryCode = backupCrypto.generateRecoveryCode();
  await writeKeys({
    ...keys,
    recoveryEnvelope: await backupCrypto.wrap(identity, backupCrypto.normalizeRecoveryCode(recoveryCode)),
    recovery_rotated_at: new Date().toISOString(),
  });
  return { recoveryCode };
};

// Son şifreli yedeği parolayla gerçekten açıp pg_dump başlığını (PGDMP) okur; hiçbir şey yazmaz
const verifyLatest = async ({ password }) => {
  assertAvailable();
  const keys = await requireKeys();
  const latest = (await listBackups()).find((b) => b.encrypted);
  if (!latest) throw httpError(404, 'Henüz şifreli yedek yok.', 'NO_BACKUP');

  const opened = await backupCrypto.unwrap(keys.passwordEnvelope, password || '');
  if (!opened) throw httpError(400, 'Yedek parolası yanlış.', 'WRONG_PASSWORD');

  const input = Readable.toWeb(fs.createReadStream(path.join(backupDir(), latest.name)));
  const reader = (await backupCrypto.decryptStream(opened, input)).getReader();
  let header = Buffer.alloc(0);
  try {
    while (header.length < 5) {
      const { value, done } = await reader.read();
      if (done) break;
      header = Buffer.concat([header, Buffer.from(value)]);
    }
  } catch {
    throw httpError(422, `Yedek açılamadı: ${latest.name} bozuk ya da bu anahtarla şifrelenmemiş.`, 'CORRUPT_BACKUP');
  } finally {
    await reader.cancel().catch(() => {});
  }

  if (header.subarray(0, 5).toString('latin1') !== 'PGDMP') {
    throw httpError(422, `Yedek açıldı ama geçerli bir veritabanı dökümü değil: ${latest.name}`, 'NOT_A_DUMP');
  }
  return { file: latest.name, size: latest.size, created_at: latest.created_at };
};

module.exports = {
  KEY_FILE,
  RECIPIENT_FILE,
  readKeys,
  listBackups,
  getStatus,
  setup,
  changePassword,
  recover,
  rotateRecoveryCode,
  verifyLatest,
};
