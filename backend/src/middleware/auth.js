const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { config } = require('../config/env');
const supportAccess = require('../services/supportAccessService');
const { superAdminAllowed } = require('../config/deployment');

const hashToken = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');
const getCookieValue = (req, name) => {
  const header = String(req.headers.cookie || '');
  if (!header) return null;

  const pairs = header.split(';').map((part) => part.trim());
  for (const pair of pairs) {
    const [key, ...rest] = pair.split('=');
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return null; // bozuk yüzde-kodlu çerez: yok say
      }
    }
  }

  return null;
};

// Destek oturumu: her istekte izin geçerli mi, yetki seviyesi ve yasaklı yollar; her istek audit_logs'a yazılır.
// Geçerliyse uygulama içinde yönetici gibi görür (rol kontrolleri 'admin'e göre), ama is_support işaretlidir.
const applySupportSession = async (req, res, next, decoded) => {
  const grant = await supportAccess.getActiveGrantForRequest(
    decoded.support_grant_id,
    req.user.id,
    req.user.company_id
  );
  if (!grant) {
    return res.status(401).json({ error: 'Destek erişimi sona erdi veya iptal edildi', code: 'SUPPORT_ACCESS_ENDED' });
  }

  const path = String(req.originalUrl || '').split('?')[0];
  const denial = supportAccess.getSupportDenial({ method: req.method, path, accessLevel: grant.access_level });

  res.on('finish', () => {
    supportAccess.logSupportRequest({
      grantId: grant.id,
      userId: req.user.id,
      companyId: req.user.company_id,
      method: req.method,
      path,
      status: res.statusCode,
      ip: req.ip,
    }).catch((err) => console.error('Destek isteği audit kaydı yazılamadı:', err.message));
  });

  if (denial) {
    return res.status(denial.status).json({ error: denial.message, code: 'SUPPORT_FORBIDDEN' });
  }

  req.user.role = 'admin';
  req.user.actual_role = 'support';
  req.user.is_support = true;
  req.user.support_grant_id = grant.id;
  req.user.support_access_level = grant.access_level;
  req.user.support_expires_at = grant.expires_at;
  return next();
};

const authMiddleware = async (req, res, next) => {
  try {
    const bearerToken = req.headers.authorization?.split(' ')[1];
    const cookieToken = getCookieValue(req, 'access_token');
    const token = bearerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, config.jwt.secret);

    // Yalnızca erişim jetonu oturum açar: refresh (sid) ve 2FA ara jetonu (purpose/typ) kabul edilmez.
    // (typ'siz eski erişim jetonları süreleri dolana kadar geçerli kalır: sid/purpose taşımazlar.)
    if (decoded.purpose || decoded.sid || (decoded.typ && decoded.typ !== 'access')) {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // onprem'de super_admin: mod sonradan açıldıysa elde kalan token'lar da geçmez
    if (decoded.role === 'super_admin' && !superAdminAllowed()) {
      return res.status(401).json({ error: 'super_admin is disabled in on-prem mode' });
    }

    // Revoked token kontrolü (tablo henüz migrate edilmediyse isteği bloklama)
    try {
      const tokenHash = hashToken(token);
      const revoked = await pool.query(
        `SELECT 1
         FROM revoked_access_tokens
         WHERE token_hash = $1 AND expires_at > NOW()
         LIMIT 1`,
        [tokenHash]
      );

      if (revoked.rows.length > 0) {
        return res.status(401).json({ error: 'Token revoked' });
      }
    } catch (revokedErr) {
      // Migration uygulanmamışsa auth akışını bozma
      if (revokedErr.code !== '42P01') {
        throw revokedErr;
      }
    }

    // Normalize user object (JWT has 'userId', but code expects 'id')
    req.user = {
      id: decoded.userId || decoded.id,
      userId: decoded.userId || decoded.id,
      username: decoded.username,
      role: decoded.role,
      company_id: decoded.company_id
    };

    // Aktif session kontrolü
    const sessionResult = await pool.query(
      `SELECT id
       FROM user_sessions
       WHERE user_id = $1
         AND is_active = true
         AND expires_at > NOW()
       ORDER BY last_activity DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    // Rolling session activity update
    const sessionId = sessionResult.rows[0].id;
    await pool.query(
      `UPDATE user_sessions
       SET last_activity = NOW()
       WHERE id = $1`,
      [sessionId]
    );

    // Kullanıcıyı her istekte DB'den doğrula: devre dışı/silinmiş hesap ve rol değişikliği
    // token süresini beklemeden etkili olur. Rol ve şirket token'dan değil DB'den okunur.
    const userRow = await pool.query(
      'SELECT role, company_id, is_active, deleted_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const dbUser = userRow.rows[0];
    if (!dbUser || dbUser.is_active === false || dbUser.deleted_at) {
      return res.status(401).json({ error: 'Account disabled or removed' });
    }
    if (dbUser.role === 'super_admin' && !superAdminAllowed()) {
      return res.status(401).json({ error: 'super_admin is disabled in on-prem mode' });
    }
    req.user.role = dbUser.role;
    req.user.company_id = dbUser.company_id;

    if (req.user.role === 'support') {
      return await applySupportSession(req, res, next, decoded);
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;

