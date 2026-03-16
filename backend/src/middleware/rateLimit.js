const rateLimit = require('express-rate-limit');

// Genel API için rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına 100 istek
  message: {
    success: false,
    message: 'Çok fazla istek gönderildi. Lütfen 15 dakika sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login gibi hassas endpoint'ler için sıkı limiter
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // IP başına 5 istek
  message: {
    success: false,
    message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Başarılı istekler de sayılır
});

// Şifre sıfırlama için çok sıkı limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 3, // IP başına 3 istek
  message: {
    success: false,
    message: 'Çok fazla şifre sıfırlama talebi. Lütfen 1 saat sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API key veya hassas işlemler için
const sensitiveOperationsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 10, // IP başına 10 istek
  message: {
    success: false,
    message: 'Bu işlem için istek limitine ulaştınız. Lütfen 1 saat sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI endpoint'leri için kullanıcı/IP bazlı key generator
const aiKeyGenerator = (req) => {
  const userId = req.user?.id || req.user?.userId;
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  return userId ? `user:${userId}` : `ip:${ip}`;
};

// AI chat için temel limiter (kısa pencere, burst koruması)
const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: parseInt(process.env.AI_CHAT_RATE_LIMIT_MAX) || 20,
  keyGenerator: aiKeyGenerator,
  message: {
    success: false,
    message: 'AI chat istek limiti aşıldı. Lütfen 1 dakika sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI mutation niyetli mesajlar için daha sıkı limiter
const aiMutationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 dakika
  max: parseInt(process.env.AI_MUTATION_RATE_LIMIT_MAX) || 8,
  keyGenerator: aiKeyGenerator,
  message: {
    success: false,
    message: 'AI işlem limiti aşıldı. Lütfen 10 dakika sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

module.exports = { 
  generalLimiter, 
  strictLimiter,
  passwordResetLimiter,
  sensitiveOperationsLimiter,
  aiChatLimiter,
  aiMutationLimiter
};

