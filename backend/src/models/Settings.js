const pool = require('../config/database');

class Settings {
  /**
   * Get all settings
   */
  static async findAll() {
    const query = 'SELECT * FROM system_settings ORDER BY category, key';
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get settings by category
   */
  static async findByCategory(category) {
    const query = 'SELECT * FROM system_settings WHERE category = $1 ORDER BY key';
    const result = await pool.query(query, [category]);
    return result.rows;
  }

  /**
   * Get all settings grouped by category
   */
  static async findAllGrouped() {
    const settings = await this.findAll();
    const grouped = {};

    settings.forEach(setting => {
      const { category, key, value, type } = setting;

      if (!grouped[category]) {
        grouped[category] = {};
      }

      // Parse value based on type
      let parsedValue = value;
      if (type === 'number') {
        parsedValue = parseFloat(value);
      } else if (type === 'boolean') {
        parsedValue = value === 'true';
      } else if (type === 'json') {
        try {
          parsedValue = JSON.parse(value);
        } catch (e) {
          parsedValue = value;
        }
      }

      grouped[category][key] = parsedValue;
    });

    return grouped;
  }

  /**
   * Get single setting by key
   */
  static async findByKey(key) {
    const query = 'SELECT * FROM system_settings WHERE key = $1';
    const result = await pool.query(query, [key]);

    if (result.rows.length === 0) {
      return null;
    }

    const setting = result.rows[0];

    // Parse value based on type
    let parsedValue = setting.value;
    if (setting.type === 'number') {
      parsedValue = parseFloat(setting.value);
    } else if (setting.type === 'boolean') {
      parsedValue = setting.value === 'true';
    } else if (setting.type === 'json') {
      try {
        parsedValue = JSON.parse(setting.value);
      } catch (e) {
        parsedValue = setting.value;
      }
    }

    return {
      ...setting,
      parsedValue
    };
  }

  /**
   * Update setting
   */
  static async update(key, value, userId) {
    // Convert value to string for storage
    let stringValue = value;
    if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      stringValue = value.toString();
    } else {
      stringValue = String(value);
    }

    const query = `
      UPDATE system_settings
      SET value = $1, updated_by = $2, updated_at = NOW()
      WHERE key = $3
      RETURNING *
    `;

    const result = await pool.query(query, [stringValue, userId, key]);
    return result.rows[0];
  }

  /**
   * Bulk update settings
   */
  static async bulkUpdate(settings, userId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const updatedSettings = [];

      for (const [key, value] of Object.entries(settings)) {
        // Convert value to string for storage
        let stringValue = value;
        if (typeof value === 'object') {
          stringValue = JSON.stringify(value);
        } else if (typeof value === 'boolean') {
          stringValue = value.toString();
        } else {
          stringValue = String(value);
        }

        const query = `
          UPDATE system_settings
          SET value = $1, updated_by = $2, updated_at = NOW()
          WHERE key = $3
          RETURNING *
        `;

        const result = await client.query(query, [stringValue, userId, key]);

        if (result.rows.length > 0) {
          updatedSettings.push(result.rows[0]);
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
   * Create new setting
   */
  static async create(data, userId) {
    const { key, value, type = 'string', category, description } = data;

    // Convert value to string for storage
    let stringValue = value;
    if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      stringValue = value.toString();
    } else {
      stringValue = String(value);
    }

    const query = `
      INSERT INTO system_settings (key, value, type, category, description, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [key, stringValue, type, category, description, userId]);
    return result.rows[0];
  }

  /**
   * Delete setting
   */
  static async delete(key) {
    const query = 'DELETE FROM system_settings WHERE key = $1 RETURNING *';
    const result = await pool.query(query, [key]);
    return result.rows[0];
  }
}

module.exports = Settings;
