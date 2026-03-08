const jwt = require('jsonwebtoken');
const User = require('../models/User');
const User2FA = require('../models/User2FA');
const AuditLog = require('../models/AuditLog');
const ActivityLogService = require('../services/activityLogService');
const pool = require('../config/database');
const emailService = require('../services/emailService');
const cacheService = require('../services/cacheService');
const { formatUser, formatSuccess, formatError } = require('../utils/formatters');
const { getClientIP } = require('../utils/helpers');

/**
 * Register new user
 */
const register = async (req, res) => {
  try {
    console.log('🔍 req.body BEFORE destructuring:', req.body);
    
    const { 
      username, 
      email, 
      password, 
      role = 'user',
      // Company options
      companyAction = 'join_default', // 'create' or 'join' or 'join_default'
      companyName,
      companyCode,
      joinCompanyCode
    } = req.body;

    // DEBUG: Log company action
    console.log('🔍 Register request AFTER destructuring:', { username, email, companyAction, companyName, companyCode });

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json(formatError('Email already registered'));
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json(formatError('Username already taken'));
    }

    let company_id = null;
    let userRole = role;

    // Handle company selection
    if (companyAction === 'create') {
      // Create new company
      if (!companyName || !companyCode) {
        return res.status(400).json(formatError('Şirket adı ve kodu gereklidir'));
      }

      // Check if company code already exists
      const existingCompany = await pool.query(
        'SELECT id FROM companies WHERE company_code = $1',
        [companyCode]
      );

      if (existingCompany.rows.length > 0) {
        return res.status(400).json(formatError('Bu şirket kodu zaten kullanılıyor'));
      }

      // Create new company
      const newCompany = await pool.query(
        `INSERT INTO companies (company_name, company_code, is_active)
         VALUES ($1, $2, true)
         RETURNING id, company_name, company_code`,
        [companyName, companyCode]
      );

      company_id = newCompany.rows[0].id;
      userRole = 'admin'; // First user of new company becomes admin

      console.log(`New company created: ${companyName} (${companyCode})`);
    } else if (companyAction === 'join') {
      // Join existing company - requires admin approval
      if (!joinCompanyCode) {
        return res.status(400).json(formatError('Şirket kodu gereklidir'));
      }

      const existingCompany = await pool.query(
        'SELECT id, company_name, company_code, is_active FROM companies WHERE company_code = $1',
        [joinCompanyCode]
      );

      if (existingCompany.rows.length === 0) {
        return res.status(404).json(formatError('Şirket bulunamadı'));
      }

      if (!existingCompany.rows[0].is_active) {
        return res.status(400).json(formatError('Bu şirket aktif değil'));
      }

      company_id = existingCompany.rows[0].id;
      console.log(`User requesting to join company: ${existingCompany.rows[0].company_name}`);
    } else {
      // Join default company
      const defaultCompany = await pool.query(
        "SELECT id FROM companies WHERE company_code = 'DEFAULT_COMPANY' LIMIT 1"
      );
      
      if (defaultCompany.rows.length > 0) {
        company_id = defaultCompany.rows[0].id;
      }
    }

    // Create user with appropriate approval status
    const approval_status = (companyAction === 'join') ? 'pending' : 'approved';
    const user = await User.create({ 
      username, 
      email, 
      password, 
      role: userRole, 
      company_id,
      approval_status
    });

    // If user needs approval, don't generate tokens yet
    if (approval_status === 'pending') {
      // Log activity
      await AuditLog.create({
        user_id: user.id,
        action: 'REGISTER_PENDING',
        entity_type: 'user',
        entity_id: user.id,
        changes: { username, email, role: userRole, status: 'pending_approval' },
        ip_address: getClientIP(req)
      });

      // Get company info
      const companyInfo = await pool.query(
        'SELECT id, company_name, company_code FROM companies WHERE id = $1',
        [user.company_id]
      );

      console.log(`User registered (pending approval): ${username} (${user.id})`);

      return res.status(201).json(formatSuccess({
        message: 'Kayıt başarılı! Şirket yöneticisinin onayı bekleniyor.',
        user: { username: user.username, email: user.email },
        company: companyInfo.rows[0] || null,
        requiresApproval: true
      }, 'Registration pending approval'));
    }

    // For approved users, continue with normal flow

    // Log activity
    await AuditLog.create({
      user_id: user.id,
      action: 'REGISTER',
      entity_type: 'user',
      entity_id: user.id,
      changes: { username, email, role },
      ip_address: getClientIP(req),
      company_id: user.company_id // MULTI-TENANCY
    });

    // Log to activity logs
    await ActivityLogService.log(
      user.id,
      'register',
      'auth',
      { username, email, role },
      req
    );

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(user).catch(err =>
      console.error('Welcome email error:', err)
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, company_id: user.company_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    // Get company info
    const companyInfo = await pool.query(
      'SELECT id, company_name, company_code FROM companies WHERE id = $1',
      [user.company_id]
    );

    console.log(`User registered: ${username} (${user.id})`);

    res.status(201).json(formatSuccess({
      user: formatUser(user),
      company: companyInfo.rows[0] || null,
      token,
      refreshToken
    }, 'Registration successful'));

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json(formatError('Registration failed', error.message));
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = getClientIP(req);
    const userAgent = req.get('user-agent') || 'Unknown';

    // Son 15 dakikada aynı IP'den yapılan başarısız giriş denemelerini kontrol et
    const failedAttempts = await pool.query(`
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE ip_address = $1
      AND success = false
      AND created_at > NOW() - INTERVAL '15 minutes'
    `, [clientIp]);

    const attemptCount = parseInt(failedAttempts.rows[0]?.count || 0);

    // 5'ten fazla başarısız deneme varsa engelle
    if (attemptCount >= 5) {
      console.warn(`⚠️ Too many failed login attempts from IP: ${clientIp}`);
      return res.status(429).json(formatError('Çok fazla başarısız giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.'));
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      // Başarısız denemeyi kaydet
      await pool.query(`
        INSERT INTO login_attempts (ip_address, username, success, user_agent)
        VALUES ($1, $2, false, $3)
      `, [clientIp, email, userAgent]);

      return res.status(401).json(formatError('Invalid credentials'));
    }

    console.log('🔍 DEBUG - User object from DB:', { 
      id: user.id, 
      email: user.email, 
      company_id: user.company_id,
      has_company_id: 'company_id' in user,
      all_keys: Object.keys(user)
    });

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      // Başarısız denemeyi kaydet
      await pool.query(`
        INSERT INTO login_attempts (ip_address, username, success, user_agent)
        VALUES ($1, $2, false, $3)
      `, [clientIp, email, userAgent]);

      return res.status(401).json(formatError('Invalid credentials'));
    }

    // Check approval status
    if (user.approval_status === 'pending') {
      return res.status(403).json(formatError('Hesabınız henüz onaylanmadı. Lütfen yönetici onayını bekleyin.'));
    }

    if (user.approval_status === 'rejected') {
      const reason = user.rejection_reason || 'Yönetici tarafından reddedildi';
      return res.status(403).json(formatError(`Hesabınız reddedildi. Sebep: ${reason}`));
    }

    // Check if user has 2FA enabled
    const twoFaStatus = await User2FA.getStatus(user.id);
    if (twoFaStatus && twoFaStatus.is_enabled) {
      // Generate temporary token for 2FA verification (valid for 5 minutes)
      const tempToken = jwt.sign(
        { userId: user.id, username: user.username, purpose: '2fa_verification' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      console.log(`User login attempt with 2FA: ${user.username} (${user.id})`);

      return res.status(200).json(formatSuccess({
        userId: user.id,
        username: user.username,
        tempToken,
        requiresTwoFa: true
      }, '2FA verification required'));
    }

    // Generate tokens
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, company_id: user.company_id },
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

    // Başarılı giriş denemesini kaydet
    await pool.query(`
      INSERT INTO login_attempts (user_id, ip_address, username, success, user_agent)
      VALUES ($1, $2, $3, true, $4)
    `, [user.id, clientIp, email, userAgent]);

    // Kullanıcının aktif oturumunu kaydet
    await pool.query(`
      INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, last_activity, expires_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '7 days')
    `, [user.id, token, clientIp, userAgent]);

    // Log activity in audit_logs
    await AuditLog.logLogin(user.id, getClientIP(req), user.company_id);

    // Log to activity logs
    await ActivityLogService.log(
      user.id,
      'login',
      'auth',
      { username: user.username, email: user.email },
      req
    );

    // Log login in login_logs table
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

    // Get company info
    const companyInfo = await pool.query(
      'SELECT id, company_name, company_code FROM companies WHERE id = $1',
      [user.company_id]
    );

    console.log(`User logged in: ${user.username} (${user.id})`);

    res.json(formatSuccess({
      user: formatUser(user),
      company: companyInfo.rows[0] || null,
      token,
      refreshToken
    }, 'Login successful'));

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(formatError('Login failed'));
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json(formatError('Refresh token required'));
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json(formatError('User not found'));
    }

    // Generate new access token
    const newToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );

    res.json(formatSuccess({ token: newToken }, 'Token refreshed'));

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json(formatError('Invalid refresh token'));
  }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
  try {
    const userId = req.user.userId;
    const token = req.headers.authorization?.split(' ')[1];

    // Delete cached session
    await cacheService.deleteSession(userId);

    // Kullanıcının oturumunu sonlandır
    if (token) {
      await pool.query(`
        DELETE FROM user_sessions
        WHERE user_id = $1 AND session_token = $2
      `, [userId, token]);
    }

    // Log activity
    await AuditLog.logLogout(userId, getClientIP(req), req.user.company_id);

    // Log to activity logs
    await ActivityLogService.log(
      userId,
      'logout',
      'auth',
      { username: req.user.username },
      req
    );

    console.log(`User logged out: ${req.user.username} (${userId})`);

    res.json(formatSuccess(null, 'Logout successful'));

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json(formatError('Logout failed'));
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json(formatError('User not found'));
    }

    res.json(formatSuccess(formatUser(user)));

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json(formatError('Failed to get profile'));
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updates = req.body;

    // Don't allow role update through profile endpoint
    delete updates.role;

    const updatedUser = await User.update(userId, updates);

    // Log activity
    await AuditLog.create({
      user_id: userId,
      action: 'UPDATE',
      entity_type: 'user',
      entity_id: userId,
      changes: updates,
      ip_address: getClientIP(req)
    });

    // Invalidate session cache
    await cacheService.deleteSession(userId);

    console.log(`User profile updated: ${updatedUser.username} (${userId})`);

    res.json(formatSuccess(formatUser(updatedUser), 'Profile updated'));

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json(formatError('Failed to update profile'));
  }
};

/**
 * Request password reset
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return res.json(formatSuccess(null, 'If email exists, reset link has been sent'));
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send reset email
    await emailService.sendPasswordResetEmail(user, resetToken);

    // Log activity
    await AuditLog.create({
      user_id: user.id,
      action: 'PASSWORD_RESET_REQUEST',
      entity_type: 'user',
      entity_id: user.id,
      changes: { email },
      ip_address: getClientIP(req)
    });

    res.json(formatSuccess(null, 'If email exists, reset link has been sent'));

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json(formatError('Failed to process request'));
  }
};

/**
 * Reset password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json(formatError('Invalid reset token'));
    }

    // Update password
    await User.update(decoded.userId, { password: newPassword });

    // Log activity
    await AuditLog.create({
      user_id: decoded.userId,
      action: 'PASSWORD_RESET',
      entity_type: 'user',
      entity_id: decoded.userId,
      changes: { password_changed: true },
      ip_address: getClientIP(req)
    });

    console.log(`Password reset: User ${decoded.userId}`);

    res.json(formatSuccess(null, 'Password reset successful'));

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json(formatError('Invalid or expired reset token'));
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  requestPasswordReset,
  resetPassword
};
