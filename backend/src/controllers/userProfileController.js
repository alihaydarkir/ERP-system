const pool = require('../config/database');
const bcrypt = require('bcrypt');
const AuditLog = require('../models/AuditLog');
const { formatSuccess, formatError } = require('../utils/formatters');
const { getClientIP } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');

/**
 * Get user profile
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT
        id, username, email, role,
        profile_image, phone_number, department, job_title,
        preferences, last_login, login_count, two_factor_enabled,
        created_at
      FROM users
      WHERE id = $1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json(formatError('User not found'));
    }

    const user = result.rows[0];

    res.json(formatSuccess(user));
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json(formatError('Failed to fetch profile'));
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, phone_number, department, job_title } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username) {
      updates.push(`username = $${paramCount}`);
      values.push(username);
      paramCount++;
    }

    if (phone_number !== undefined) {
      updates.push(`phone_number = $${paramCount}`);
      values.push(phone_number);
      paramCount++;
    }

    if (department !== undefined) {
      updates.push(`department = $${paramCount}`);
      values.push(department);
      paramCount++;
    }

    if (job_title !== undefined) {
      updates.push(`job_title = $${paramCount}`);
      values.push(job_title);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json(formatError('No fields to update'));
    }

    values.push(userId);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, username, email, role, profile_image, phone_number, department, job_title
    `;

    const result = await pool.query(query, values);

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'UPDATE_PROFILE',
      entity_type: 'user',
      entity_id: userId,
      ip_address: getClientIP(req),
      changes: { updated_fields: Object.keys(req.body) }
    });

    res.json(formatSuccess(result.rows[0], 'Profile updated successfully'));
  } catch (error) {
    console.error('Update profile error:', error);

    if (error.code === '23505') {
      return res.status(400).json(formatError('Username already taken'));
    }

    res.status(500).json(formatError('Failed to update profile'));
  }
};

/**
 * Upload avatar
 */
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json(formatError('No file uploaded'));
    }

    // Get old profile image
    const oldImageQuery = 'SELECT profile_image FROM users WHERE id = $1';
    const oldImageResult = await pool.query(oldImageQuery, [userId]);

    // Delete old avatar if exists
    if (oldImageResult.rows[0]?.profile_image) {
      const oldImagePath = path.join(__dirname, '../../', oldImageResult.rows[0].profile_image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Save new avatar path
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const query = `
      UPDATE users
      SET profile_image = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, username, profile_image
    `;

    const result = await pool.query(query, [avatarUrl, userId]);

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'UPDATE_AVATAR',
      entity_type: 'user',
      entity_id: userId,
      ip_address: getClientIP(req),
      changes: { avatar_url: avatarUrl }
    });

    res.json(formatSuccess(result.rows[0], 'Avatar uploaded successfully'));
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json(formatError('Failed to upload avatar'));
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json(formatError('All fields are required'));
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json(formatError('New passwords do not match'));
    }

    if (newPassword.length < 6) {
      return res.status(400).json(formatError('Password must be at least 6 characters'));
    }

    // Get current password
    const userQuery = 'SELECT password FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json(formatError('User not found'));
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password);

    if (!isValid) {
      return res.status(400).json(formatError('Current password is incorrect'));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updateQuery = `
      UPDATE users
      SET password = $1, updated_at = NOW()
      WHERE id = $2
    `;

    await pool.query(updateQuery, [hashedPassword, userId]);

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'CHANGE_PASSWORD',
      entity_type: 'user',
      entity_id: userId,
      ip_address: getClientIP(req),
      changes: {}
    });

    res.json(formatSuccess(null, 'Password changed successfully'));
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json(formatError('Failed to change password'));
  }
};

/**
 * Update preferences
 */
const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    const query = `
      UPDATE users
      SET preferences = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, username, preferences
    `;

    const result = await pool.query(query, [JSON.stringify(preferences), userId]);

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'UPDATE_PREFERENCES',
      entity_type: 'user',
      entity_id: userId,
      ip_address: getClientIP(req),
      changes: { preferences }
    });

    res.json(formatSuccess(result.rows[0], 'Preferences updated successfully'));
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json(formatError('Failed to update preferences'));
  }
};

/**
 * Get activity history
 */
const getActivityHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, action } = req.query;

    let query = `
      SELECT
        id, action, entity_type, entity_id,
        changes as details, ip_address, created_at
      FROM audit_logs
      WHERE user_id = $1
    `;

    const values = [userId];
    let paramCount = 2;

    if (action) {
      query += ` AND action = $${paramCount}`;
      values.push(action);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);

    res.json(formatSuccess(result.rows));
  } catch (error) {
    console.error('Get activity history error:', error);
    res.status(500).json(formatError('Failed to fetch activity history'));
  }
};

/**
 * Get login history
 */
const getLoginHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const query = `
      SELECT
        id, ip_address, user_agent, device, browser,
        location, login_at, success
      FROM login_logs
      WHERE user_id = $1
      ORDER BY login_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, parseInt(limit)]);

    res.json(formatSuccess(result.rows));
  } catch (error) {
    console.error('Get login history error:', error);
    res.status(500).json(formatError('Failed to fetch login history'));
  }
};

/**
 * Enable 2FA
 */
const enable2FA = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      UPDATE users
      SET two_factor_enabled = true, updated_at = NOW()
      WHERE id = $1
      RETURNING id, two_factor_enabled
    `;

    const result = await pool.query(query, [userId]);

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'ENABLE_2FA',
      entity_type: 'user',
      entity_id: userId,
      ip_address: getClientIP(req),
      changes: {}
    });

    res.json(formatSuccess(result.rows[0], '2FA enabled successfully'));
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json(formatError('Failed to enable 2FA'));
  }
};

/**
 * Disable 2FA
 */
const disable2FA = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      UPDATE users
      SET two_factor_enabled = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id, two_factor_enabled
    `;

    const result = await pool.query(query, [userId]);

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'DISABLE_2FA',
      entity_type: 'user',
      entity_id: userId,
      ip_address: getClientIP(req),
      changes: {}
    });

    res.json(formatSuccess(result.rows[0], '2FA disabled successfully'));
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json(formatError('Failed to disable 2FA'));
  }
};

/**
 * Complete onboarding flow for current user
 */
const completeOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      `UPDATE users
       SET onboarding_completed = true,
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    return res.status(200).json({ message: 'Onboarding tamamlandı' });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    return res.status(500).json(formatError('Onboarding tamamlanamadı'));
  }
};

/**
 * Export current user's data as JSON
 */
const exportMyData = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;

    const result = await pool.query(
      `SELECT id, username, email, role, created_at
       FROM users
       WHERE id = $1
         AND company_id = $2`,
      [userId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(formatError('User not found'));
    }

    res.setHeader('Content-Disposition', 'attachment; filename=verilerim.json');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    return res.status(200).send(JSON.stringify(result.rows[0], null, 2));
  } catch (error) {
    console.error('Export my data error:', error);
    return res.status(500).json(formatError('Veriler dışa aktarılamadı'));
  }
};

/**
 * Soft delete current user's account and personal data
 */
const deleteMyData = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;

    const result = await pool.query(
      `UPDATE users
       SET deleted_at = NOW(),
           email = $1,
           password_hash = '',
           updated_at = NOW()
       WHERE id = $2
         AND company_id = $3
       RETURNING id`,
      [`deleted_${userId}@deleted.com`, userId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(formatError('User not found'));
    }

    return res.status(200).json({ message: 'Hesabınız ve verileriniz silindi' });
  } catch (error) {
    console.error('Delete my data error:', error);
    return res.status(500).json(formatError('Veriler silinemedi'));
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  updatePreferences,
  getActivityHistory,
  getLoginHistory,
  enable2FA,
  disable2FA,
  completeOnboarding,
  exportMyData,
  deleteMyData
};
