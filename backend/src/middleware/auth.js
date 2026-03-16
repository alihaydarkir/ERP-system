const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');

const hashToken = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Revoked token kontrolü (tablo henüz migrate edilmediyse isteği bloklama)
    try {
      const tokenHash = hashToken(token);
      const revoked = await pool.query(
        `SELECT 1
         FROM revoked_access_tokens
         WHERE token_hash = $1 AND expires_at > NOW()
         LIMIT 1`,
        [tokenHash]
      );

      if (revoked.rows.length > 0) {
        return res.status(401).json({ error: 'Token revoked' });
      }
    } catch (revokedErr) {
      // Migration uygulanmamışsa auth akışını bozma
      if (revokedErr.code !== '42P01') {
        throw revokedErr;
      }
    }

    // Normalize user object (JWT has 'userId', but code expects 'id')
    req.user = {
      id: decoded.userId || decoded.id,
      userId: decoded.userId || decoded.id,
      username: decoded.username,
      role: decoded.role,
      company_id: decoded.company_id
    };

    // Aktif session kontrolü
    const sessionResult = await pool.query(
      `SELECT id
       FROM user_sessions
       WHERE user_id = $1
         AND is_active = true
         AND expires_at > NOW()
       ORDER BY last_activity DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    // Rolling session activity update
    const sessionId = sessionResult.rows[0].id;
    await pool.query(
      `UPDATE user_sessions
       SET last_activity = NOW()
       WHERE id = $1`,
      [sessionId]
    );

    // Eski token'larda company_id olmayabilir — DB'den çek
    if (!req.user.company_id) {
      try {
        const result = await pool.query(
          'SELECT company_id FROM users WHERE id = $1',
          [req.user.id]
        );
        if (result.rows[0]?.company_id) {
          req.user.company_id = result.rows[0].company_id;
        }
      } catch (dbErr) {
        // company_id alınamazsa devam et
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;

