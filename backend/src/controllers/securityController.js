const pool = require('../config/database');
const { formatSuccess, formatError } = require('../utils/formatters');
const { isOnPrem } = require('../config/deployment');

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

    // Çok kiracılılık: yalnız bu şirketin kullanıcılarının giriş denemeleri
    let query = `
      SELECT 
        la.*,
        u.username as user_username,
        u.email as user_email
      FROM login_attempts la
      JOIN users u ON la.user_id = u.id
      WHERE u.company_id = $1
    `;

    if (failed_only === 'true') {
      query += ' AND la.success = false';
    }

    query += ' ORDER BY la.created_at DESC LIMIT $2';

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    const result = await pool.query(query, [req.user.company_id, safeLimit]);

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
        AND u.company_id = $1
      ORDER BY us.last_activity DESC
    `, [req.user.company_id]);

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

    const deleted = await pool.query(`
      DELETE FROM user_sessions us
      USING users u
      WHERE us.id = $1 AND us.user_id = u.id AND u.company_id = $2
      RETURNING us.id
    `, [session_id, req.user.company_id]);
    if (deleted.rows.length === 0) {
      return res.status(404).json(formatError('Oturum bulunamadı'));
    }
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
      FROM login_attempts la
      JOIN users u ON la.user_id = u.id
      WHERE la.success = false 
      AND la.created_at > CURRENT_DATE
      AND u.company_id = $1
    `, [req.user.company_id]);

    // Aktif IP engellemeleri: küresel kaynak, yalnız platform kapsamına gösterilir
    const activeBlocks = isOnPrem() || req.user.role === 'super_admin'
      ? await pool.query(`
      SELECT COUNT(*) as count
      FROM ip_blacklist
      WHERE expires_at IS NULL OR expires_at > NOW()
    `)
      : { rows: [{ count: 0 }] };

    // Son 24 saatteki aktif oturumlar
    const activeSessions = await pool.query(`
      SELECT COUNT(DISTINCT us.user_id) as count
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.last_activity > NOW() - INTERVAL '24 hours'
      AND u.company_id = $1
    `, [req.user.company_id]);

    // Son 7 gündeki başarısız giriş trendleri
    const weeklyFailedLogins = await pool.query(`
      SELECT 
        DATE(la.created_at) as date,
        COUNT(*) as count
      FROM login_attempts la
      JOIN users u ON la.user_id = u.id
      WHERE la.success = false 
      AND la.created_at > NOW() - INTERVAL '7 days'
      AND u.company_id = $1
      GROUP BY DATE(la.created_at)
      ORDER BY date DESC
    `, [req.user.company_id]);

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
