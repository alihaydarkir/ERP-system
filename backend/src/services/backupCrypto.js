// Yedek şifrelemesinin kriptografi çekirdeği (age formatı; yedek container'ındaki `age` CLI ile uyumlu).
// Zarf şifreleme: yedekler bir X25519 açık anahtarıyla şifrelenir. Özel anahtar iki ayrı
// "zarfta" saklanır: müşterinin yedek parolasıyla ve basılı kurtarma koduyla (scrypt).
// Parola değişince yalnız parola zarfı yenilenir; eski yedekler aynı anahtarla açılmaya devam eder.
// age-encryption bir ES modülüdür; Node 24 require() ile yükler (Jest yükleyemez → testlerde
// gerçek şifreleme ayrı bir Node süreciyle denenir, bkz. backupCrypto.test.js).
const crypto = require('crypto');

const age = () => require('age-encryption');

const MIN_PASSWORD_LENGTH = 12;

// Karıştırılabilen karakterler (0/O, 1/I/L) yok; 24 karakter ≈ 119 bit
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const RECOVERY_LENGTH = 24;

const generateRecoveryCode = () => {
  let raw = '';
  while (raw.length < RECOVERY_LENGTH) {
    const byte = crypto.randomBytes(1)[0];
    // 248 = 31 * 8: modülo yanlılığı olmasın
    if (byte < 248) raw += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length];
  }
  return raw.match(/.{4}/g).join('-');
};

// Basılı kod nasıl yazılırsa yazılsın (küçük harf, boşluk, tire) aynı parolaya dönüşür
const normalizeRecoveryCode = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    const error = new Error(`Yedek parolası en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
    error.status = 400;
    throw error;
  }
};

const wrap = async (identity, passphrase) => {
  const { Encrypter, armor } = age();
  const encrypter = new Encrypter();
  encrypter.setPassphrase(passphrase);
  return armor.encode(await encrypter.encrypt(identity));
};

// Yanlış parolada null döner (hata fırlatmaz)
const unwrap = async (wrapped, passphrase) => {
  const { Decrypter, armor } = age();
  const decrypter = new Decrypter();
  decrypter.addPassphrase(passphrase);
  try {
    return await decrypter.decrypt(armor.decode(wrapped), 'text');
  } catch {
    return null;
  }
};

const createKeys = async (password) => {
  validatePassword(password);
  const { generateX25519Identity, identityToRecipient } = age();
  const identity = await generateX25519Identity();
  const recoveryCode = generateRecoveryCode();
  return {
    recipient: await identityToRecipient(identity),
    passwordEnvelope: await wrap(identity, password),
    recoveryEnvelope: await wrap(identity, normalizeRecoveryCode(recoveryCode)),
    recoveryCode,
  };
};

// Parola ya da kurtarma koduyla özel anahtarı açar: { identity, via } | null
const openIdentity = async (keys, secret) => {
  const byPassword = await unwrap(keys.passwordEnvelope, secret);
  if (byPassword) return { identity: byPassword, via: 'password' };
  const byRecovery = await unwrap(keys.recoveryEnvelope, normalizeRecoveryCode(secret));
  if (byRecovery) return { identity: byRecovery, via: 'recovery' };
  return null;
};

// Yedek dosyasının (ReadableStream) şifresini çözüp akış olarak döner
const decryptStream = async (identity, stream) => {
  const { Decrypter } = age();
  const decrypter = new Decrypter();
  decrypter.addIdentity(identity);
  return decrypter.decrypt(stream);
};

module.exports = {
  MIN_PASSWORD_LENGTH,
  generateRecoveryCode,
  normalizeRecoveryCode,
  validatePassword,
  wrap,
  unwrap,
  createKeys,
  openIdentity,
  decryptStream,
};
