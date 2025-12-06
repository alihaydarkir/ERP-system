const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
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
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;

