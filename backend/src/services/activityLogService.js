const pool = require('../config/database');

class ActivityLogService {
  // Log an activity
  static async log(userId, action, module, details = {}, req = null) {
    try {
      const ipAddress = req ? (req.ip || req.connection.remoteAddress) : null;
      const userAgent = req ? req.get('user-agent') : null;
      
      const query = `
        INSERT INTO activity_logs (user_id, action, module, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      
      const result = await pool.query(query, [
        userId,
        action,
        module,
        JSON.stringify(details),
        ipAddress,
        userAgent
      ]);
      
      return result.rows[0].id;
    } catch (error) {
      console.error('Activity log error:', error);
      // Don't throw - logging should not break the main flow
      return null;
    }
  }

  // Get activity logs with filters
  static async getLogs(filters = {}) {
    try {
      let query = `
        SELECT 
          al.*,
          u.username,
          u.email
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;
      
      if (filters.userId) {
        query += ` AND al.user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }
      
      if (filters.module) {
        query += ` AND al.module = $${paramIndex}`;
        params.push(filters.module);
        paramIndex++;
      }
      
      if (filters.action) {
        query += ` AND al.action = $${paramIndex}`;
        params.push(filters.action);
        paramIndex++;
      }
      
      if (filters.startDate) {
        query += ` AND al.created_at >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }
      
      if (filters.endDate) {
        query += ` AND al.created_at <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }
      
      query += ` ORDER BY al.created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      } else {
        query += ` LIMIT 100`;
      }
      
      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Get activity logs error:', error);
      throw error;
    }
  }

  // Get activity statistics
  static async getStatistics(userId = null, days = 7) {
    try {
      const query = `
        SELECT 
          module,
          action,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM activity_logs
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        ${userId ? 'AND user_id = $1' : ''}
        GROUP BY module, action, DATE(created_at)
        ORDER BY date DESC, count DESC
      `;
      
      const params = userId ? [userId] : [];
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Get activity statistics error:', error);
      throw error;
    }
  }

  // Delete old logs (cleanup)
  static async cleanup(daysToKeep = 90) {
    try {
      const query = `
        DELETE FROM activity_logs
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      `;
      
      const result = await pool.query(query);
      return result.rowCount;
    } catch (error) {
      console.error('Activity log cleanup error:', error);
      throw error;
    }
  }
}

module.exports = ActivityLogService;
