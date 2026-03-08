// Tenant (Company) Middleware - Automatically filter queries by company_id
const tenantMiddleware = (req, res, next) => {
  // Skip for super_admin
  if (req.user && req.user.role === 'super_admin') {
    req.isSuperAdmin = true;
    return next();
  }

  // Ensure user has company_id
  if (!req.user || !req.user.company_id) {
    return res.status(403).json({
      success: false,
      message: 'Kullanıcı şirkete atanmamış',
    });
  }

  // Attach company_id to request
  req.companyId = req.user.company_id;
  req.isSuperAdmin = false;
  
  next();
};

// Helper function to add company filter to queries
const addCompanyFilter = (req) => {
  if (req.isSuperAdmin) {
    return {}; // No filter for super admin
  }
  return { company_id: req.companyId };
};

// Helper function to validate company ownership
const validateCompanyOwnership = (req, resourceCompanyId) => {
  if (req.isSuperAdmin) {
    return true; // Super admin can access all
  }
  return req.companyId === resourceCompanyId;
};

module.exports = {
  tenantMiddleware,
  addCompanyFilter,
  validateCompanyOwnership,
};
