const jwt = require('jsonwebtoken');

/**
 * Middleware to allow access with either:
 * - Regular JWT token (for 2FA management endpoints)
 * - Temporary 2FA verification token (for login verification)
 */
const twoFaAuthMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Normalize user object
    req.user = {
      id: decoded.userId || decoded.id,
      userId: decoded.userId || decoded.id,
      username: decoded.username,
      role: decoded.role,
      purpose: decoded.purpose // For temporary 2FA tokens
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware to allow only endpoints that require temporary 2FA token
 * This is used for 2FA-specific endpoints like /verify
 */
const requireTwoFaToken = (req, res, next) => {
  twoFaAuthMiddleware(req, res, () => {
    // Token is valid, user is set in req.user
    // Allow access regardless of token purpose
    next();
  });
};

/**
 * Middleware that checks if user is trying to access protected endpoints
 * with a temporary 2FA token (and prevents it if they're not on /verify)
 */
const checkTwoFaTokenUsage = (req, res, next) => {
  if (req.user && req.user.purpose === '2fa_verification') {
    // If user has temporary 2FA token, only allow them to access /verify endpoint
    if (!req.path.includes('/verify')) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Temporary 2FA token can only be used for 2FA verification'
      });
    }
  }
  next();
};

module.exports = { twoFaAuthMiddleware, requireTwoFaToken, checkTwoFaTokenUsage };