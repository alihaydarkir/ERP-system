const pool = require('../config/database');

// company_id NULL satırları varsayılan şablondur; şirketin kendi satırı varsa o geçerlidir.
// Yazma her zaman şirketin satırına yapılır (upsert), şablon uygulamadan değişmez.

// GET yanıtlarında açık metin dönmeyen ayarlar. Form maskeyi geri gönderirse değer korunur.
const SECRET_KEYS = new Set(['emailSmtpPassword']);
const SECRET_MASK = '••••••••';

const isSecret = (key) => SECRET_KEYS.has(key);

const maskValue = (key, value) => (isSecret(key) && value ? SECRET_MASK : value);

const isUnchangedSecret = (key, value) => isSecret(key) && value === SECRET_MASK;

const toStorage = (value) => {
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const parseValue = (type, value) => {
  if (type === 'number') return parseFloat(value);
  if (type === 'boolean') return value === 'true';
  if (type === 'json') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  return value;
};

const maskRow = (row) => (row ? { ...row, value: maskValue(row.key, row.value) } : row);

const EFFECTIVE_SETTINGS = `
  SELECT DISTINCT ON (key) *
  FROM system_settings
  WHERE company_id = $1 OR company_id IS NULL
  ORDER BY key, company_id NULLS LAST
`;

// Şablondaki ya da şirketin kendi satırındaki tip/kategori/açıklamayı alarak şirket satırına yazar.
const UPSERT_COMPANY_SETTING = `
  INSERT INTO system_settings (company_id, key, value, type, category, description, updated_by)
  SELECT $1, s.key, $2, s.type, s.category, s.description, $3
  FROM system_settings s
  WHERE s.key = $4 AND (s.company_id = $1 OR s.company_id IS NULL)
  ORDER BY s.company_id NULLS LAST
  LIMIT 1
  ON CONFLICT (company_id, key) WHERE company_id IS NOT NULL
  DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
  RETURNING *
`;

class Settings {
  /**
   * Get all settings of a company (defaults merged with company values, secrets masked)
   */
  static async findAll(companyId) {
    const query = `SELECT * FROM (${EFFECTIVE_SETTINGS}) s ORDER BY category, key`;
    const result = await pool.query(query, [companyId]);
    return result.rows.map(maskRow);
  }

  /**
   * Get settings by category
   */
  static async findByCategory(category, companyId) {
    const query = `SELECT * FROM (${EFFECTIVE_SETTINGS}) s WHERE category = $2 ORDER BY key`;
    const result = await pool.query(query, [companyId, category]);
    return result.rows.map(maskRow);
  }

  /**
   * Get all settings grouped by category
   */
  static async findAllGrouped(companyId) {
    const settings = await this.findAll(companyId);
    const grouped = {};

    settings.forEach(({ category, key, value, type }) => {
      if (!grouped[category]) {
        grouped[category] = {};
      }
      grouped[category][key] = isSecret(key) ? value : parseValue(type, value);
    });

    return grouped;
  }

  /**
   * Get single setting by key. Secrets are masked unless { reveal: true } (internal use only).
   */
  static async findByKey(key, companyId, { reveal = false } = {}) {
    const query = `SELECT * FROM (${EFFECTIVE_SETTINGS}) s WHERE key = $2`;
    const result = await pool.query(query, [companyId, key]);

    if (result.rows.length === 0) {
      return null;
    }

    const setting = reveal ? result.rows[0] : maskRow(result.rows[0]);
    return {
      ...setting,
      parsedValue: parseValue(setting.type, setting.value)
    };
  }

  /**
   * Update setting for a company. Returns null when the key does not exist.
   */
  static async update(key, value, userId, companyId) {
    if (isUnchangedSecret(key, value)) {
      return this.findByKey(key, companyId);
    }

    const result = await pool.query(UPSERT_COMPANY_SETTING, [companyId, toStorage(value), userId, key]);
    return maskRow(result.rows[0]) || null;
  }

  /**
   * Bulk update settings for a company
   */
  static async bulkUpdate(settings, userId, companyId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const updatedSettings = [];

      for (const [key, value] of Object.entries(settings)) {
        if (isUnchangedSecret(key, value)) continue;

        const result = await client.query(UPSERT_COMPANY_SETTING, [companyId, toStorage(value), userId, key]);

        if (result.rows.length > 0) {
          updatedSettings.push(maskRow(result.rows[0]));
        }
      }

      await client.query('COMMIT');
      return updatedSettings;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create new company setting. A key that already exists (default or company) is a conflict.
   */
  static async create(data, userId, companyId) {
    const { key, value, type = 'string', category, description } = data;

    if (await this.findByKey(key, companyId)) {
      const error = new Error('Setting with this key already exists');
      error.code = '23505';
      throw error;
    }

    const query = `
      INSERT INTO system_settings (company_id, key, value, type, category, description, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [companyId, key, toStorage(value), type, category, description, userId]);
    return maskRow(result.rows[0]);
  }

  /**
   * Delete company's own setting (an override falls back to the default; defaults cannot be deleted)
   */
  static async delete(key, companyId) {
    const query = 'DELETE FROM system_settings WHERE key = $1 AND company_id = $2 RETURNING *';
    const result = await pool.query(query, [key, companyId]);
    return maskRow(result.rows[0]);
  }
}

Settings.SECRET_MASK = SECRET_MASK;
Settings.maskValue = maskValue;

module.exports = Settings;
