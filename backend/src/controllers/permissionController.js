const PermissionService = require('../services/permissionService');
const ActivityLogService = require('../services/activityLogService');

// Get all permissions grouped by module
exports.getAllPermissions = async (req, res) => {
  try {
    const permissions = await PermissionService.getAllPermissions();
    
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Get all permissions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'İzinler yüklenirken hata oluştu' 
    });
  }
};

// Get permissions for a specific role
exports.getRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;
    
    const permissions = await PermissionService.getRolePermissions(role);
    
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Rol izinleri yüklenirken hata oluştu' 
    });
  }
};

// Update permissions for a role
exports.updateRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;
    const { permissionIds } = req.body;
    
    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'permissionIds bir dizi olmalıdır' 
      });
    }
    
    await PermissionService.updateRolePermissions(role, permissionIds);
    
    // Log activity
    await ActivityLogService.log(
      req.user.id,
      'update_role_permissions',
      'settings',
      { role, permission_count: permissionIds.length },
      req
    );
    
    res.json({
      success: true,
      message: 'Rol izinleri başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Update role permissions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Rol izinleri güncellenirken hata oluştu' 
    });
  }
};

// Get user-specific permissions
exports.getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const permissions = await PermissionService.getUserPermissions(userId);
    
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kullanıcı izinleri yüklenirken hata oluştu' 
    });
  }
};

// Get current user's permissions
exports.getMyPermissions = async (req, res) => {
  try {
    const permissions = await PermissionService.getUserPermissions(req.user.id);
    
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Get my permissions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'İzinler yüklenirken hata oluştu' 
    });
  }
};
