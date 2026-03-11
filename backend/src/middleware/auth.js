const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Normalize user object (JWT has 'userId', but code expects 'id')
    req.user = {
      id: decoded.userId || decoded.id,
      userId: decoded.userId || decoded.id,
      username: decoded.username,
      role: decoded.role,
      company_id: decoded.company_id
    };

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

