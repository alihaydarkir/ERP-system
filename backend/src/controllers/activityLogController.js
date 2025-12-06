const ActivityLogService = require('../services/activityLogService');

// Get activity logs with filtering
exports.getActivityLogs = async (req, res) => {
  try {
    const { userId, module, action, startDate, endDate, limit = 100, offset = 0 } = req.query;
    
    const filters = {
      userId: userId ? parseInt(userId) : undefined,
      module,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    const logs = await ActivityLogService.getLogs(filters);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Aktivite logları yüklenirken hata oluştu' 
    });
  }
};

// Get activity statistics
exports.getActivityStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const stats = await ActivityLogService.getStatistics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get activity statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Aktivite istatistikleri yüklenirken hata oluştu' 
    });
  }
};

// Clean up old logs
exports.cleanupOldLogs = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    const deletedCount = await ActivityLogService.cleanup(parseInt(days));
    
    // Log this activity
    await ActivityLogService.log(
      req.user.id,
      'cleanup_logs',
      'logs',
      { days, deleted_count: deletedCount },
      req
    );
    
    res.json({
      success: true,
      message: `${deletedCount} eski log başarıyla silindi`,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('Cleanup old logs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eski loglar silinirken hata oluştu' 
    });
  }
};

// Get user's own activity
exports.getMyActivity = async (req, res) => {
  try {
    const { module, action, startDate, endDate, limit = 50, offset = 0 } = req.query;
    
    const filters = {
      userId: req.user.id,
      module,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    const logs = await ActivityLogService.getLogs(filters);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Get my activity error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Aktiviteleriniz yüklenirken hata oluştu' 
    });
  }
};
