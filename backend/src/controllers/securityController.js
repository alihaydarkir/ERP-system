const pool = require('../config/database');
const { formatSuccess, formatError } = require('../utils/formatters');

/**
 * Get IP blacklist
 */
const getBlacklist = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ip_address,
        reason,
        created_at AS blocked_at,
        expires_at,
        blocked_by,
        CASE 
          WHEN expires_at IS NULL THEN true
          WHEN expires_at > NOW() THEN true
          ELSE false
        END as is_active
      FROM ip_blacklist
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json(formatSuccess(result.rows));
  } catch (error) {
    console.error('Get blacklist error:', error);
    res.status(500).json(formatError('Failed to fetch blacklist'));
  }
};

/**
 * Add IP to blacklist
 */
const blockIP = async (req, res) => {
  try {
    const { ip_address, reason, expires_at } = req.body;
    const blocked_by = req.user.userId;

    await pool.query(`
      INSERT INTO ip_blacklist (ip_address, reason, blocked_by, expires_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (ip_address) 
      DO UPDATE SET 
        reason = EXCLUDED.reason,
        expires_at = EXCLUDED.expires_at,
        blocked_by = EXCLUDED.blocked_by,
        is_active = true,
        updated_at = NOW()
    `, [ip_address, reason, blocked_by, expires_at || null]);
    res.json(formatSuccess({ ip_address }, 'IP başarıyla engellendi'));
  } catch (error) {
    console.error('Block IP error:', error);
    res.status(500).json(formatError('IP engellenirken hata oluştu'));
  }
};

/**
 * Remove IP from blacklist
 */
const unblockIP = async (req, res) => {
  try {
    const { ip_address } = req.params;

    await pool.query(`
      DELETE FROM ip_blacklist
      WHERE ip_address = $1
    `, [ip_address]);
    res.json(formatSuccess({ ip_address }, 'IP engeli kaldırıldı'));
  } catch (error) {
    console.error('Unblock IP error:', error);
    res.status(500).json(formatError('IP engeli kaldırılırken hata oluştu'));
  }
};

/**
 * Get login attempts
 */
const getLoginAttempts = async (req, res) => {
  try {
    const { limit = 100, failed_only = false } = req.query;

    let query = `
      SELECT 
        la.*,
        u.username as user_username,
        u.email as user_email
      FROM login_attempts la
      LEFT JOIN users u ON la.user_id = u.id
    `;

    if (failed_only === 'true') {
      query += ' WHERE la.success = false';
    }

    query += ' ORDER BY la.created_at DESC LIMIT $1';

    const result = await pool.query(query, [parseInt(limit)]);

    res.json(formatSuccess(result.rows));
  } catch (error) {
    console.error('Get login attempts error:', error);
    res.status(500).json(formatError('Failed to fetch login attempts'));
  }
};

/**
 * Get active user sessions
 */
const getActiveSessions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        us.id,
        us.user_id,
        us.ip_address,
        us.user_agent,
        us.created_at,
        us.last_activity,
        u.username,
        u.email,
        u.role
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.last_activity > NOW() - INTERVAL '24 hours'
      ORDER BY us.last_activity DESC
    `);

    res.json(formatSuccess(result.rows));
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json(formatError('Failed to fetch active sessions'));
  }
};

/**
 * Terminate user session
 */
const terminateSession = async (req, res) => {
  try {
    const { session_id } = req.params;

    await pool.query(`
      DELETE FROM user_sessions
      WHERE id = $1
    `, [session_id]);
    res.json(formatSuccess({ session_id }, 'Oturum sonlandırıldı'));
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json(formatError('Oturum sonlandırılırken hata oluştu'));
  }
};

/**
 * Get security statistics
 */
const getSecurityStats = async (req, res) => {
  try {
    // Bugünkü başarısız giriş denemeleri
    const failedLoginsToday = await pool.query(`
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE success = false 
      AND created_at > CURRENT_DATE
    `);

    // Aktif IP engellemeleri
    const activeBlocks = await pool.query(`
      SELECT COUNT(*) as count
      FROM ip_blacklist
      WHERE expires_at IS NULL OR expires_at > NOW()
    `);

    // Son 24 saatteki aktif oturumlar
    const activeSessions = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM user_sessions
      WHERE last_activity > NOW() - INTERVAL '24 hours'
    `);

    // Son 7 gündeki başarısız giriş trendleri
    const weeklyFailedLogins = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM login_attempts
      WHERE success = false 
      AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json(formatSuccess({
      failedLoginsToday: parseInt(failedLoginsToday.rows[0].count),
      activeBlocks: parseInt(activeBlocks.rows[0].count),
      activeSessions: parseInt(activeSessions.rows[0].count),
      weeklyTrend: weeklyFailedLogins.rows
    }));
  } catch (error) {
    console.error('Get security stats error:', error);
    res.status(500).json(formatError('Failed to fetch security statistics'));
  }
};

module.exports = {
  getBlacklist,
  blockIP,
  unblockIP,
  getLoginAttempts,
  getActiveSessions,
  terminateSession,
  getSecurityStats
};
