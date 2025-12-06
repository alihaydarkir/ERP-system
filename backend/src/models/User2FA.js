const pool = require('../config/database');
const speakeasy = require('speakeasy');
const crypto = require('crypto');

class User2FA {
  /**
   * Create a new 2FA setup for user
   */
  static async create(user_id) {
    // Generate secret for TOTP
    const secret = speakeasy.generateSecret({
      name: 'ERP System',
      issuer: 'ERP',
      length: 32
    });

    const query = `
      INSERT INTO user_2fa (user_id, secret, is_enabled)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE
      SET secret = $2, is_enabled = false, updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [user_id, secret.base32, false]);
    return {
      ...result.rows[0],
      secret_base32: secret.base32,
      secret_url: secret.otpauth_url
    };
  }

  /**
   * Get 2FA configuration for user
   */
  static async findByUserId(user_id) {
    const query = 'SELECT * FROM user_2fa WHERE user_id = $1';
    const result = await pool.query(query, [user_id]);
    return result.rows[0];
  }

  /**
   * Enable 2FA for user
   */
  static async enable(user_id) {
    const query = `
      UPDATE user_2fa
      SET is_enabled = true, updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [user_id]);
    return result.rows[0];
  }

  /**
   * Disable 2FA for user
   */
  static async disable(user_id) {
    const query = `
      UPDATE user_2fa
      SET is_enabled = false, updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [user_id]);
    return result.rows[0];
  }

  /**
   * Verify TOTP token
   */
  static async verifyToken(user_id, token) {
    const user2fa = await this.findByUserId(user_id);
    if (!user2fa) {
      return { valid: false, message: '2FA not setup' };
    }

    const isValid = speakeasy.totp.verify({
      secret: user2fa.secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps difference
    });

    if (isValid) {
      // Update last verified time
      await pool.query(
        'UPDATE user_2fa SET last_verified_at = NOW() WHERE user_id = $1',
        [user_id]
      );
    }

    return { valid: isValid };
  }

  /**
   * Generate backup codes for 2FA
   */
  static async generateBackupCodes(user_id, count = 10) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete existing unused backup codes
      await client.query(
        'DELETE FROM user_2fa_backup_codes WHERE user_id = $1 AND used_at IS NULL',
        [user_id]
      );

      const codes = [];
      for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);

        await client.query(
          'INSERT INTO user_2fa_backup_codes (user_id, code) VALUES ($1, $2)',
          [user_id, code]
        );
      }

      // Update backup codes generated time
      await client.query(
        'UPDATE user_2fa SET backup_codes_generated_at = NOW() WHERE user_id = $1',
        [user_id]
      );

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
   * Get backup codes for user (unused only)
   */
  static async getBackupCodes(user_id) {
    const query = `
      SELECT code, used_at FROM user_2fa_backup_codes
      WHERE user_id = $1 AND used_at IS NULL
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [user_id]);
    return result.rows;
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(user_id, code) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if code exists and not used
      const checkQuery = `
        SELECT id FROM user_2fa_backup_codes
        WHERE user_id = $1 AND code = $2 AND used_at IS NULL
      `;
      const checkResult = await client.query(checkQuery, [user_id, code]);

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { valid: false, message: 'Invalid backup code' };
      }

      // Mark code as used
      const codeId = checkResult.rows[0].id;
      await client.query(
        'UPDATE user_2fa_backup_codes SET used_at = NOW() WHERE id = $1',
        [codeId]
      );

      await client.query('COMMIT');
      return { valid: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete 2FA and all related data
   */
  static async delete(user_id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete backup codes
      await client.query(
        'DELETE FROM user_2fa_backup_codes WHERE user_id = $1',
        [user_id]
      );

      // Delete 2FA configuration
      await client.query(
        'DELETE FROM user_2fa WHERE user_id = $1',
        [user_id]
      );

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
   * Get 2FA status for user
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