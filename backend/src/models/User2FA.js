const pool = require('../config/database');
const speakeasy = require('speakeasy');
const crypto = require('crypto');
const { encryptSecret, decryptSecret, isEncrypted, keyedHash } = require('../utils/secretBox');

const STEP_SECONDS = 30;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
// Karışabilen karakterler (0/O, 1/I) yok; 10 karakter ≈ 50 bit, anahtarlı özetle saklanır
const BACKUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BACKUP_CODE_LENGTH = 10;

const generateBackupCode = () => {
  let out = '';
  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) out += BACKUP_ALPHABET[crypto.randomInt(BACKUP_ALPHABET.length)];
  return `${out.slice(0, 5)}-${out.slice(5)}`;
};

// Kullanıcı girdisini normalize et (küçük harf, boşluk, tire serbest)
const normalizeBackupCode = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

class User2FA {
  /**
   * Create (or restart) a 2FA setup. 2FA zaten etkinse sır DEĞİŞTİRİLMEZ: önce devre dışı bırakılmalı
   * (aksi halde çalıntı oturum 2FA'yı sıfırlayıp kendi cihazını kaydedebilirdi).
   */
  static async create(user_id) {
    const existing = await this.findByUserId(user_id);
    if (existing && existing.is_enabled) {
      const err = new Error('2FA already enabled');
      err.code = 'TWO_FA_ALREADY_ENABLED';
      throw err;
    }

    const secret = speakeasy.generateSecret({ name: 'ERP System', issuer: 'ERP', length: 32 });

    const query = `
      INSERT INTO user_2fa (user_id, secret, is_enabled, last_used_step, failed_attempts, locked_until)
      VALUES ($1, $2, false, NULL, 0, NULL)
      ON CONFLICT (user_id) DO UPDATE
      SET secret = $2, is_enabled = false, last_used_step = NULL, failed_attempts = 0,
          locked_until = NULL, updated_at = NOW()
      WHERE user_2fa.is_enabled = false
      RETURNING id, user_id, is_enabled
    `;

    const result = await pool.query(query, [user_id, encryptSecret(secret.base32)]);
    if (result.rows.length === 0) {
      const err = new Error('2FA already enabled');
      err.code = 'TWO_FA_ALREADY_ENABLED';
      throw err;
    }
    return {
      ...result.rows[0],
      secret_base32: secret.base32,
      secret_url: secret.otpauth_url
    };
  }

  /**
   * Get 2FA configuration for user (secret çözülmüş halde, yalnızca sunucu içi kullanım için)
   */
  static async findByUserId(user_id) {
    const result = await pool.query('SELECT * FROM user_2fa WHERE user_id = $1', [user_id]);
    const row = result.rows[0];
    if (!row) return row;
    // Eski düz metin sır: okunurken şifreli biçime yükselt
    if (row.secret && !isEncrypted(row.secret)) {
      await pool.query('UPDATE user_2fa SET secret = $1 WHERE id = $2', [encryptSecret(row.secret), row.id]);
    }
    return { ...row, secret: decryptSecret(row.secret) };
  }

  static async enable(user_id) {
    const result = await pool.query(
      'UPDATE user_2fa SET is_enabled = true, failed_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE user_id = $1 RETURNING id, user_id, is_enabled',
      [user_id]
    );
    return result.rows[0];
  }

  static async disable(user_id) {
    const result = await pool.query(
      'UPDATE user_2fa SET is_enabled = false, updated_at = NOW() WHERE user_id = $1 RETURNING id, user_id, is_enabled',
      [user_id]
    );
    return result.rows[0];
  }

  /**
   * Hesabın 2FA deneme kilidi var mı?
   */
  static async isLocked(user_id) {
    const r = await pool.query('SELECT locked_until FROM user_2fa WHERE user_id = $1', [user_id]);
    const until = r.rows[0] && r.rows[0].locked_until;
    return !!until && new Date(until).getTime() > Date.now();
  }

  static async recordFailure(user_id) {
    await pool.query(
      `UPDATE user_2fa
       SET locked_until = CASE WHEN failed_attempts + 1 >= $2 THEN NOW() + ($3::int * INTERVAL '1 minute') ELSE locked_until END,
           failed_attempts = CASE WHEN failed_attempts + 1 >= $2 THEN 0 ELSE failed_attempts + 1 END
       WHERE user_id = $1`,
      [user_id, MAX_FAILED_ATTEMPTS, LOCK_MINUTES]
    );
  }

  static async recordSuccess(user_id) {
    await pool.query('UPDATE user_2fa SET failed_attempts = 0, locked_until = NULL WHERE user_id = $1', [user_id]);
  }

  /**
   * TOTP doğrula. Aynı zaman adımı ikinci kez kabul edilmez (tekrar saldırısı) ve kilitli hesapta reddedilir.
   * Hatalı deneme sayılır (5 hatada 15 dk kilit); başarıda sayaç sıfırlanır.
   */
  static async verifyToken(user_id, token) {
    const user2fa = await this.findByUserId(user_id);
    if (!user2fa) {
      return { valid: false, message: '2FA not setup' };
    }
    if (await this.isLocked(user_id)) {
      return { valid: false, locked: true, message: 'Too many attempts' };
    }

    const delta = speakeasy.totp.verifyDelta({
      secret: user2fa.secret,
      encoding: 'base32',
      token: String(token || '').trim(),
      step: STEP_SECONDS,
      window: 1 // ±30 sn saat kayması
    });

    if (!delta) {
      await this.recordFailure(user_id);
      return { valid: false };
    }

    const usedStep = Math.floor(Date.now() / 1000 / STEP_SECONDS) + delta.delta;
    // Atomik: yalnızca daha önce kullanılmamış (daha yüksek) adım kabul edilir
    const claim = await pool.query(
      `UPDATE user_2fa SET last_used_step = $2, last_verified_at = NOW()
       WHERE user_id = $1 AND (last_used_step IS NULL OR last_used_step < $2)
       RETURNING id`,
      [user_id, usedStep]
    );
    if (claim.rows.length === 0) {
      await this.recordFailure(user_id);
      return { valid: false, replay: true };
    }

    await this.recordSuccess(user_id);
    return { valid: true };
  }

  /**
   * Yeni yedek kod seti üretir (eskiler silinir). Kodlar yalnızca BU çağrıda düz metin döner;
   * veritabanında anahtarlı özet olarak saklanır.
   */
  static async generateBackupCodes(user_id, count = 10) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM user_2fa_backup_codes WHERE user_id = $1', [user_id]);

      const codes = [];
      for (let i = 0; i < count; i++) {
        const code = generateBackupCode();
        codes.push(code);
        await client.query(
          'INSERT INTO user_2fa_backup_codes (user_id, code_hash) VALUES ($1, $2)',
          [user_id, keyedHash(normalizeBackupCode(code))]
        );
      }

      await client.query('UPDATE user_2fa SET backup_codes_generated_at = NOW() WHERE user_id = $1', [user_id]);
      await client.query('COMMIT');
      return codes;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Kalan kullanılmamış yedek kod SAYISI (kodların kendisi artık geri okunamaz)
   */
  static async countUnusedBackupCodes(user_id) {
    const r = await pool.query(
      'SELECT COUNT(*)::int AS n FROM user_2fa_backup_codes WHERE user_id = $1 AND used_at IS NULL',
      [user_id]
    );
    return r.rows[0].n;
  }

  /**
   * Yedek kod doğrula (tek kullanımlık, atomik; kilit ve deneme sayacına tabi)
   */
  static async verifyBackupCode(user_id, code) {
    if (await this.isLocked(user_id)) {
      return { valid: false, locked: true, message: 'Too many attempts' };
    }
    const normalized = normalizeBackupCode(code);
    if (normalized.length !== BACKUP_CODE_LENGTH) {
      await this.recordFailure(user_id);
      return { valid: false, message: 'Invalid backup code' };
    }

    const used = await pool.query(
      `UPDATE user_2fa_backup_codes SET used_at = NOW()
       WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL
       RETURNING id`,
      [user_id, keyedHash(normalized)]
    );
    if (used.rows.length === 0) {
      await this.recordFailure(user_id);
      return { valid: false, message: 'Invalid backup code' };
    }
    await this.recordSuccess(user_id);
    return { valid: true };
  }

  /**
   * Giriş kodu: 6 haneli TOTP ya da yedek kod
   */
  static async verifyLoginCode(user_id, code) {
    const raw = String(code || '').trim();
    if (/^\d{6}$/.test(raw)) return this.verifyToken(user_id, raw);
    return this.verifyBackupCode(user_id, raw);
  }

  static async delete(user_id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM user_2fa_backup_codes WHERE user_id = $1', [user_id]);
      await client.query('DELETE FROM user_2fa WHERE user_id = $1', [user_id]);
      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get 2FA status for user (sır ve kodlar içermez)
   */
  static async getStatus(user_id) {
    const query = `
      SELECT
        id,
        user_id,
        is_enabled,
        last_verified_at,
        backup_codes_generated_at,
        (SELECT COUNT(*) FROM user_2fa_backup_codes
         WHERE user_id = user_2fa.user_id AND used_at IS NULL) as unused_backup_codes
      FROM user_2fa
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [user_id]);
    return result.rows[0];
  }
}

module.exports = User2FA;
module.exports.MAX_FAILED_ATTEMPTS = MAX_FAILED_ATTEMPTS;
