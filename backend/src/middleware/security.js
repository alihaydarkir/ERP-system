const pool = require('../config/database');
const { config } = require('../config/env');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const hasBearerAuth = (req) => {
  const auth = String(req.headers.authorization || '');
  return auth.toLowerCase().startsWith('bearer ');
};

const getCookieValue = (req, cookieName) => {
  const cookieHeader = String(req.headers.cookie || '');
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map((part) => part.trim());
  const match = cookies.find((item) => item.startsWith(`${cookieName}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(cookieName.length + 1));
};

// Normalize IP to avoid IPv6 localhost variants leaking through
const getClientIp = (req) => {
  const xff = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xff) ? xff[0] : (xff ? xff.split(',')[0] : (req.ip || req.connection.remoteAddress || ''));
  return ip.replace('::ffff:', '').trim();
};

/**
 * IP Whitelist/Blacklist kontrolü
 */
const ipAccessControl = async (req, res, next) => {
  try {
    const clientIp = getClientIp(req);
    
    // IP blacklist kontrolü
    const blacklistCheck = await pool.query(
      'SELECT * FROM ip_blacklist WHERE ip_address = $1 AND is_active = true',
      [clientIp]
    );
    
    if (blacklistCheck.rows.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Bu IP adresi engellenmiştir. Destek ile iletişime geçin.'
      });
    }
    
    next();
  } catch (error) {
    console.error('IP access control error:', error);
    next(); // Hata durumunda devam et
  }
};

/**
 * Şüpheli aktivite tespiti
 */
const detectSuspiciousActivity = async (req, res, next) => {
  try {
    const clientIp = getClientIp(req);
    
    // Son 5 dakikada aynı IP'den gelen hatalı istekleri kontrol et
    const failedRequests = await pool.query(`
      SELECT COUNT(*) as count 
      FROM activity_logs 
      WHERE ip_address = $1 
      AND created_at > NOW() - INTERVAL '5 minutes'
      AND (action LIKE '%fail%' OR action LIKE '%error%')
    `, [clientIp]);
    
    const failCount = parseInt(failedRequests.rows[0]?.count || 0);
    
    // 5 dakikada 10'dan fazla hatalı istek varsa şüpheli
    if (failCount > 10) {
      console.warn(`⚠️ Suspicious activity detected from IP: ${clientIp}`);
      
      // Blacklist'e ekle
      await pool.query(`
        INSERT INTO ip_blacklist (ip_address, reason, expires_at, is_active)
        VALUES ($1, $2, NOW() + INTERVAL '1 hour', true)
        ON CONFLICT (ip_address) DO NOTHING
      `, [clientIp, 'Automated - Too many failed requests']);
      
      return res.status(429).json({
        success: false,
        message: 'Şüpheli aktivite tespit edildi. IP adresiniz geçici olarak engellenmiştir.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Suspicious activity detection error:', error);
    next();
  }
};

/**
 * Session güvenliği
 */
const sessionSecurity = async (req, res, next) => {
  try {
    if (req.user && req.user.userId) {
      const userId = req.user.userId;
      
      // Aynı kullanıcının birden fazla cihazdan girişini kontrol et
      const activeSessions = await pool.query(`
        SELECT COUNT(DISTINCT ip_address) as device_count
        FROM activity_logs
        WHERE user_id = $1
        AND action = 'login'
        AND created_at > NOW() - INTERVAL '24 hours'
      `, [userId]);
      
      const deviceCount = parseInt(activeSessions.rows[0]?.device_count || 0);
      
      // 5'ten fazla farklı cihazdan giriş varsa uyar
      if (deviceCount > 5) {
        console.warn(`⚠️ User ${userId} has too many active sessions: ${deviceCount}`);
        // Bildirim gönder veya log tut
      }
    }
    
    next();
  } catch (error) {
    console.error('Session security error:', error);
    next();
  }
};

/**
 * SQL Injection koruması (basic)
 */
const sqlInjectionProtection = (req, res, next) => {
  // Sadece gerçekten tehlikeli SQL injection pattern'lerini kontrol et
  const suspiciousPatterns = [
    /(\s|^)(union\s+select|drop\s+table|delete\s+from|truncate\s+table)(\s|$)/gi,
    /(;.*--)|(\/\*.*\*\/)/gi,  // SQL comments
    /(xp_cmdshell|sp_executesql)/gi,  // SQL Server commands
    /(<script[\s\S]*?>|javascript:)/gi  // XSS
  ];
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
    }
    return false;
  };
  
  // Query parameters kontrolü
  for (const key in req.query) {
    if (checkValue(req.query[key])) {
      console.warn(`⚠️ SQL Injection attempt detected in query: ${key}`);
      return res.status(400).json({
        success: false,
        message: 'Geçersiz istek parametresi'
      });
    }
  }
  
  // Body kontrolü
  for (const key in req.body) {
    if (checkValue(req.body[key])) {
      console.warn(`⚠️ SQL Injection attempt detected in body: ${key}`);
      return res.status(400).json({
        success: false,
        message: 'Geçersiz istek verisi'
      });
    }
  }
  
  next();
};

/**
 * CSRF Token doğrulama (state-changing işlemler için)
 */
const csrfProtection = (req, res, next) => {
  // Safe methods için CSRF kontrolü yapma
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Authorization: Bearer kullanılan API çağrıları CSRF riski taşımaz
  if (hasBearerAuth(req)) {
    return next();
  }

  // Cookie taşımayan (stateless) isteklerde CSRF kontrolü zorunlu değil
  // Bu sayede login/register gibi token üreten endpoint'ler bloklanmaz.
  const hasCookieHeader = String(req.headers.cookie || '').trim().length > 0;
  if (!hasCookieHeader) {
    return next();
  }

  // Cookie tabanlı akışlar için CSRF zorunlu
  const headerToken = String(req.headers['x-csrf-token'] || '').trim();
  const cookieToken = getCookieValue(req, 'csrf_token') || getCookieValue(req, '__Host-csrf_token');

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF doğrulaması başarısız'
    });
  }

  return next();
};

/**
 * Origin kontrolü (state-changing istekler için)
 */
const originCheck = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const allowedOrigins = Array.isArray(config.corsOrigins) ? config.corsOrigins : ['http://localhost:3000', 'http://localhost:5173'];
  const strictOriginCheck = config.security?.strictOriginCheck ?? (config.nodeEnv === 'production');

  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const matchesAllowed = (value) => allowedOrigins.some((o) => value.startsWith(o));

  if (origin && matchesAllowed(origin)) return next();
  if (!origin && referer && matchesAllowed(referer)) return next();
  if (!origin && !referer) {
    // Native clients / curl için bearer auth varlığında izin ver
    if (hasBearerAuth(req)) return next();
    // Geliştirmede esnek, production'da sıkı davran
    if (!strictOriginCheck) return next();
  }

  return res.status(403).json({ success: false, message: 'Origin not allowed' });
};

/**
 * Host header kontrolü — DNS rebinding/Host header injection'a karşı
 */
const hostHeaderCheck = (req, res, next) => {
  const allowedHosts = Array.isArray(config.security?.allowedHosts)
    ? config.security.allowedHosts
    : ['localhost:5000', 'localhost:3000', 'localhost:5173'];

  const host = (req.headers.host || '').toLowerCase();
  if (!host || allowedHosts.includes(host)) return next();
  return res.status(403).json({ success: false, message: 'Host not allowed' });
};

/**
 * HPP (HTTP Parameter Pollution) temizleyici — ilk değeri al, çoğul parametreleri reddet opsiyonu
 */
const hppSanitize = (req, res, next) => {
  const sanitizeObject = (obj, { collapseArrays = true } = {}) => {
    if (!obj || typeof obj !== 'object') return obj;

    for (const key of Object.keys(obj)) {
      const value = obj[key];

      if (Array.isArray(value)) {
        if (collapseArrays) {
          // Query/params için HPP koruması: ilk değeri al
          obj[key] = value[0];
        } else {
          // JSON body için meşru array'leri koru (örn: order.items)
          obj[key] = value.map((item) => (
            item && typeof item === 'object'
              ? sanitizeObject(item, { collapseArrays: false })
              : item
          ));
        }
      } else if (value && typeof value === 'object') {
        obj[key] = sanitizeObject(value, { collapseArrays });
      }
    }

    return obj;
  };

  req.query = sanitizeObject(req.query, { collapseArrays: true });
  req.params = sanitizeObject(req.params, { collapseArrays: true });
  req.body = sanitizeObject(req.body, { collapseArrays: false });
  return next();
};

module.exports = {
  ipAccessControl,
  detectSuspiciousActivity,
  sessionSecurity,
  sqlInjectionProtection,
  csrfProtection,
  originCheck,
  hostHeaderCheck,
  hppSanitize
};
