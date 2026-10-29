const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const PermissionService = require('../services/permissionService');
const ActivityLogService = require('../services/activityLogService');
const { passwordProblem } = require('../utils/passwordPolicy');

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, limit = 50, offset = 0 } = req.query;
    const { company_id } = req.user; // MULTI-TENANCY
    
    let query = `
      SELECT 
        id, username, email, role, 
        phone_number, department, job_title,
        profile_image, two_factor_enabled,
        last_login, created_at, updated_at
      FROM users
      WHERE company_id = $1
    `;
    
    const params = [company_id]; // MULTI-TENANCY
    let paramIndex = 2;
    
    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kullanıcılar yüklenirken hata oluştu' 
    });
  }
};

// Get single user
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        id, username, email, role, 
        phone_number, department, job_title,
        profile_image, two_factor_enabled,
        last_login, created_at, updated_at
      FROM users
      WHERE id = $1 AND company_id = $2
    `;
    
    const result = await pool.query(query, [id, req.user.company_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kullanıcı bulunamadı' 
      });
    }
    
    // Get user permissions
    const permissions = await PermissionService.getUserPermissions(id);
    
    res.json({
      success: true,
      data: {
        ...result.rows[0],
        permissions
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kullanıcı yüklenirken hata oluştu' 
    });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, role, phone_number, department, job_title } = req.body;
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kullanıcı adı veya email zaten kullanılıyor' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const query = `
      INSERT INTO users (username, email, password_hash, role, phone_number, department, job_title, company_id, approval_status, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', true)
      RETURNING id, username, email, role, phone_number, department, job_title, created_at
    `;
    
    const result = await pool.query(query, [
      username,
      email,
      hashedPassword,
      role || 'user',
      phone_number,
      department,
      job_title,
      req.user.company_id
    ]);
    
    // Log activity
    await ActivityLogService.log(
      req.user.id,
      'create_user',
      'users',
      { new_user_id: result.rows[0].id, username, role },
      req
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Kullanıcı başarıyla oluşturuldu'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kullanıcı oluşturulurken hata oluştu' 
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, phone_number, department, job_title } = req.body;
    
    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE id = $1 AND company_id = $2', [id, req.user.company_id]);
    
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kullanıcı bulunamadı' 
      });
    }
    
    // Check username/email uniqueness
    const duplicateCheck = await pool.query(
      'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
      [username, email, id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kullanıcı adı veya email zaten kullanılıyor' 
      });
    }
    
    const query = `
      UPDATE users 
      SET username = $1, email = $2, role = $3, 
          phone_number = $4, department = $5, job_title = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND company_id = $8
      RETURNING id, username, email, role, phone_number, department, job_title, updated_at
    `;
    
    const result = await pool.query(query, [
      username,
      email,
      role,
      phone_number,
      department,
      job_title,
      id,
      req.user.company_id
    ]);
    
    // Log activity
    await ActivityLogService.log(
      req.user.id,
      'update_user',
      'users',
      { updated_user_id: id, changes: req.body },
      req
    );
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Kullanıcı başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kullanıcı güncellenirken hata oluştu' 
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kendi hesabınızı silemezsiniz' 
      });
    }
    
    // Check if user exists
    const existingUser = await pool.query('SELECT id, username FROM users WHERE id = $1 AND company_id = $2', [id, req.user.company_id]);
    
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kullanıcı bulunamadı' 
      });
    }
    
    await pool.query('DELETE FROM users WHERE id = $1 AND company_id = $2', [id, req.user.company_id]);
    
    // Log activity
    await ActivityLogService.log(
      req.user.id,
      'delete_user',
      'users',
      { deleted_user_id: id, username: existingUser.rows[0].username },
      req
    );
    
    res.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kullanıcı silinirken hata oluştu' 
    });
  }
};

// Change user password (admin)
exports.changeUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const problem = passwordProblem(newPassword);
    if (problem) {
      return res.status(400).json({ success: false, message: problem });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const updated = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3 RETURNING id',
      [hashedPassword, id, req.user.company_id]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    // Log activity
    await ActivityLogService.log(
      req.user.id,
      'change_user_password',
      'users',
      { target_user_id: id },
      req
    );
    
    res.json({
      success: true,
      message: 'Kullanıcı şifresi başarıyla değiştirildi'
    });
  } catch (error) {
    console.error('Change user password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Şifre değiştirilirken hata oluştu' 
    });
  }
};

// Get user statistics
exports.getUserStatistics = async (req, res) => {
  try {
    const { company_id } = req.user; // MULTI-TENANCY
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'manager' THEN 1 END) as manager_count,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 END) as active_week,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN 1 END) as active_month
      FROM users
      WHERE company_id = $1
    `, [company_id]); // MULTI-TENANCY
    
    res.json({
      success: true,
      data: stats.rows[0]
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'İstatistikler yüklenirken hata oluştu' 
    });
  }
};
