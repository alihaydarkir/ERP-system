const PermissionService = require('../services/permissionService');
const ActivityLogService = require('../services/activityLogService');

// Middleware to check if user has required permission
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Kimlik doğrulaması gerekli' 
        });
      }
      
      // Admin always has access
      if (req.user.role === 'admin') {
        return next();
      }
      
      const hasPermission = await PermissionService.hasPermission(userId, permissionName);
      
      if (!hasPermission) {
        // Log unauthorized access attempt
        await ActivityLogService.log(
          userId,
          'unauthorized_access',
          'permissions',
          { permission: permissionName, endpoint: req.path },
          req
        );
        
        return res.status(403).json({ 
          success: false, 
          message: 'Bu işlem için yetkiniz yok' 
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Yetki kontrolü sırasında hata oluştu' 
      });
    }
  };
};

// Middleware to check if user has any of the required permissions
const requireAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Kimlik doğrulaması gerekli' 
        });
      }
      
      // Admin always has access
      if (req.user.role === 'admin') {
        return next();
      }
      
      const hasPermission = await PermissionService.hasAnyPermission(userId, permissionNames);
      
      if (!hasPermission) {
        await ActivityLogService.log(
          userId,
          'unauthorized_access',
          'permissions',
          { permissions: permissionNames, endpoint: req.path },
          req
        );
        
        return res.status(403).json({ 
          success: false, 
          message: 'Bu işlem için yetkiniz yok' 
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Yetki kontrolü sırasında hata oluştu' 
      });
    }
  };
};

// Middleware to log activity
const logActivity = (action, module) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (userId) {
        // Get details from request
        const details = {
          method: req.method,
          path: req.path,
          body: req.body ? Object.keys(req.body) : [],
          params: req.params,
          query: req.query
        };
        
        await ActivityLogService.log(userId, action, module, details, req);
      }
      
      next();
    } catch (error) {
      console.error('Activity log middleware error:', error);
      // Don't block the request
      next();
    }
  };
};

// Middleware to check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;
      
      if (!userRole) {
        return res.status(401).json({ 
          success: false, 
          message: 'Kimlik doğrulaması gerekli' 
        });
      }
      
      // Convert single role to array
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Bu işlem için yetkiniz yok' 
        });
      }
      
      next();
    } catch (error) {
      console.error('Role check middleware error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Yetki kontrolü sırasında hata oluştu' 
      });
    }
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireRole,
  logActivity
};
