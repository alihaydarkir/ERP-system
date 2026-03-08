// Employee Approval Middleware
const approvalMiddleware = (req, res, next) => {
  // Super admin bypasses approval check
  if (req.user && req.user.role === 'super_admin') {
    return next();
  }

  // Check if user is approved
  if (req.user && req.user.approval_status !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Hesabınız henüz onaylanmadı. Lütfen yöneticinizle iletişime geçin.',
      approval_status: req.user.approval_status,
    });
  }

  next();
};

// Check if user can approve others (admin or manager)
const canApproveUsers = (role) => {
  return ['super_admin', 'admin', 'manager'].includes(role);
};

module.exports = {
  approvalMiddleware,
  canApproveUsers,
};
