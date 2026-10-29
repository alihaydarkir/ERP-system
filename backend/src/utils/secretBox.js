const crypto = require('crypto');

/**
 * Veritabanında saklanan sırlar (SMTP parolası, TOTP sırrı) için AES-256-GCM + HMAC yardımcıları.
 * Anahtar: SETTINGS_ENCRYPTION_KEY > ENCRYPTION_KEY > JWT_SECRET (sha256 ile 32 bayta türetilir).
 * Eski düz metin kayıtlar okunabilir kalır (çağıran ilk okumada şifreli biçime yükseltmelidir).
 */
const ENC_PREFIX = 'enc:v1:';

const rawKeyMaterial = () => String(
  process.env.SETTINGS_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || ''
);

const keyBytes = (label = '') => crypto.createHash('sha256').update(label + rawKeyMaterial()).digest();

const isEncrypted = (stored) => typeof stored === 'string' && stored.startsWith(ENC_PREFIX);

const encryptSecret = (plain) => {
  if (!plain) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return ENC_PREFIX + [iv, cipher.getAuthTag(), ct].map((b) => b.toString('base64')).join(':');
};

const decryptSecret = (stored) => {
  if (!stored || !isEncrypted(stored)) return stored; // eski düz metin
  try {
    const [iv, tag, ct] = stored.slice(ENC_PREFIX.length).split(':').map((p) => Buffer.from(p, 'base64'));
    const d = crypto.createDecipheriv('aes-256-gcm', keyBytes(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
  } catch (e) {
    return ''; // anahtar değişmiş/bozuk kayıt: sır kullanılamaz say
  }
};

// Yedek kodlar gibi düşük entropili tek kullanımlık değerler için anahtarlı özet (DB sızsa bile çevrimdışı kırılamaz).
const keyedHash = (value) => crypto.createHmac('sha256', keyBytes('keyed-hash:')).update(String(value)).digest('hex');

module.exports = { ENC_PREFIX, isEncrypted, encryptSecret, decryptSecret, keyedHash };
