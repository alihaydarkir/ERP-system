const { isOnPrem } = require('../config/deployment');

const rbacMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

// Küresel (tüm şirketleri etkileyen) kaynaklar: IP kara listesi, rol izin şablonları.
// Tek şirketli şirket içi kurulumda (onprem) şirket yöneticisi yeterlidir; bulutta yalnız super_admin.
const requirePlatformScope = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (isOnPrem() || req.user.role === 'super_admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Bu işlem tüm şirketleri etkilediği için platform yöneticisine aittir.'
  });
};

rbacMiddleware.requirePlatformScope = requirePlatformScope;
module.exports = rbacMiddleware;

