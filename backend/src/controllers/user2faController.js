const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const User2FA = require('../models/User2FA');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const cacheService = require('../services/cacheService');
const pool = require('../config/database');
const { getClientIP } = require('../utils/helpers');
const { formatUser, formatSuccess, formatError } = require('../utils/formatters');

/**
 * Start 2FA setup - generate secret and QR code
 */
exports.startSetup = async (req, res) => {
  try {
    const userId = req.user.id;

    // Create 2FA configuration
    const config = await User2FA.create(userId);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(config.secret_url);

    res.status(200).json({
      success: true,
      message: '2FA setup started',
      secret: config.secret_base32,
      qrCode: qrCodeUrl,
      otpauthUrl: config.secret_url,
      instructions: [
        'Scan the QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)',
        'Or enter the secret key manually: ' + config.secret_base32,
        'Enter a verification code to complete setup'
      ]
    });
  } catch (error) {
    console.error('[2FA Setup Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start 2FA setup',
      error: error.message
    });
  }
};

/**
 * Verify token during 2FA setup
 */
exports.verifySetup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token || token.toString().length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token format. Must be 6 digits'
      });
    }

    // Verify the token
    const verification = await User2FA.verifyToken(userId, token);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please try again',
        error: 'INVALID_TOKEN'
      });
    }

    // Generate backup codes
    const backupCodes = await User2FA.generateBackupCodes(userId);

    // Enable 2FA
    await User2FA.enable(userId);

    res.status(200).json({
      success: true,
      message: '2FA setup completed successfully',
      backupCodes: backupCodes,
      warning: 'Save these backup codes in a secure place. Each code can only be used once.'
    });
  } catch (error) {
    console.error('[2FA Verification Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify 2FA setup',
      error: error.message
    });
  }
};

/**
 * Get 2FA status for current user
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await User2FA.getStatus(userId);

    res.status(200).json({
      success: true,
      data: status || {
        user_id: userId,
        is_enabled: false,
        unused_backup_codes: 0
      }
    });
  } catch (error) {
    console.error('[2FA Status Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get 2FA status',
      error: error.message
    });
  }
};

/**
 * Disable 2FA for current user
 */
exports.disable = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password required to disable 2FA'
      });
    }

    // Verify password before disabling
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userWithPassword = await User.findByEmail(user.email);
    const passwordValid = await User.verifyPassword(password, userWithPassword.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Disable 2FA
    await User2FA.disable(userId);

    res.status(200).json({
      success: true,
      message: '2FA has been disabled'
    });
  } catch (error) {
    console.error('[2FA Disable Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA',
      error: error.message
    });
  }
};

/**
 * Verify token during login and complete authentication
 */
exports.verifyLogin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token, backupCode } = req.body;

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let verified = false;

    // Try TOTP verification first
    if (token) {
      if (token.toString().length !== 6) {
        return res.status(400).json({
          success: false,
          message: 'Invalid token format. Must be 6 digits'
        });
      }

      const verification = await User2FA.verifyToken(userId, token);
      if (verification.valid) {
        verified = true;
      }
    }

    // Try backup code verification if TOTP failed
    if (!verified && backupCode) {
      if (!backupCode || backupCode.toString().length !== 8) {
        return res.status(400).json({
          success: false,
          message: 'Invalid backup code format'
        });
      }

      const verification = await User2FA.verifyBackupCode(userId, backupCode.toUpperCase());
      if (verification.valid) {
        verified = true;
      }
    }

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code or backup code',
        error: 'INVALID_2FA_CODE'
      });
    }

    // Generate actual access tokens
    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    // Cache user session
    await cacheService.cacheSession(user.id, {
      userId: user.id,
      username: user.username,
      role: user.role,
      loginAt: new Date()
    });

    // Log activity in audit_logs
    await AuditLog.logLogin(user.id, getClientIP(req));

    // Log login in login_logs table
    const userAgent = req.get('user-agent') || 'Unknown';
    const ipAddress = getClientIP(req);

    // Parse device and browser from user agent
    let device = 'Desktop';
    let browser = 'Unknown';

    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      device = 'Mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      device = 'Tablet';
    }

    if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
    }

    await pool.query(`
      INSERT INTO login_logs (user_id, ip_address, user_agent, device, browser, location, success)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [user.id, ipAddress, userAgent, device, browser, 'Unknown', true]);

    // Update user last_login and login_count
    await pool.query(`
      UPDATE users
      SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1
      WHERE id = $1
    `, [user.id]);

    console.log(`User logged in after 2FA: ${user.username} (${user.id})`);

    res.status(200).json(formatSuccess({
      user: formatUser(user),
      token: accessToken,
      refreshToken
    }, '2FA verification successful, login complete'));
  } catch (error) {
    console.error('[2FA Login Verification Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify 2FA code',
      error: error.message
    });
  }
};

/**
 * Get backup codes for user
 */
exports.getBackupCodes = async (req, res) => {
  try {
    const userId = req.user.id;
    const codes = await User2FA.getBackupCodes(userId);

    res.status(200).json({
      success: true,
      message: 'Backup codes retrieved',
      data: codes.map(c => ({
        code: c.code,
        used: c.used_at !== null
      }))
    });
  } catch (error) {
    console.error('[Get Backup Codes Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backup codes',
      error: error.message
    });
  }
};

/**
 * Regenerate backup codes
 */
exports.regenerateBackupCodes = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if 2FA is enabled
    const status = await User2FA.getStatus(userId);
    if (!status || !status.is_enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled'
      });
    }

    // Generate new backup codes
    const backupCodes = await User2FA.generateBackupCodes(userId);

    res.status(200).json({
      success: true,
      message: 'Backup codes regenerated successfully',
      backupCodes: backupCodes,
      warning: 'Old backup codes have been replaced. Save these new codes in a secure place.'
    });
  } catch (error) {
    console.error('[Regenerate Backup Codes Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate backup codes',
      error: error.message
    });
  }
};

/**
 * Delete 2FA (admin only)
 */
exports.deleteUserTwoFA = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete 2FA for users'
      });
    }

    // Delete 2FA configuration
    await User2FA.delete(userId);

    res.status(200).json({
      success: true,
      message: '2FA configuration deleted successfully'
    });
  } catch (error) {
    console.error('[Delete 2FA Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete 2FA',
      error: error.message
    });
  }
};