const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { redisClient: getRedisClient, isRedisConnected } = require('../config/redis');

const getClientIp = (req) => req.ip || req.connection?.remoteAddress || 'unknown';

const getCookieValue = (req, name) => {
  const raw = String(req.headers.cookie || '');
  if (!raw) return null;

  const pairs = raw.split(';').map((part) => part.trim());
  for (const pair of pairs) {
    const [key, ...rest] = pair.split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
};

const extractUserIdFromToken = (req) => {
  const bearerToken = req.headers.authorization?.split(' ')[1];
  const cookieToken = getCookieValue(req, 'access_token');
  const token = bearerToken || cookieToken;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    return decoded.userId || decoded.id || null;
  } catch (_) {
    return null;
  }
};

const aiUserKeyGenerator = (req) => {
  const userId = req.user?.id || req.user?.userId || extractUserIdFromToken(req);
  return userId ? `user:${userId}` : `ip:${getClientIp(req)}`;
};

const getRetryAfterSeconds = (req, windowMs) => {
  const resetTime = req.rateLimit?.resetTime;
  if (!resetTime) {
    return Math.max(1, Math.ceil(windowMs / 1000));
  }

  return Math.max(
    1,
    Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000)
  );
};

const createDefault429Handler = ({ windowMs, messageBuilder }) => (req, res) => {
  const retryAfterSeconds = getRetryAfterSeconds(req, windowMs);
  res.set('Retry-After', String(retryAfterSeconds));

  return res.status(429).json({
    success: false,
    message: typeof messageBuilder === 'function'
      ? messageBuilder({ req, retryAfterSeconds })
      : 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.'
  });
};

const buildRedisStore = (prefix) => {
  const client = getRedisClient();
  if (!client || !isRedisConnected()) {
    return null;
  }

  return new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
    prefix: `rl:${prefix}:`
  });
};

const createRateLimiter = ({
  prefix,
  windowMs,
  max,
  keyGenerator,
  messageBuilder,
  skipSuccessfulRequests = false
}) => {
  const baseOptions = {
    windowMs,
    max,
    keyGenerator,
    skipSuccessfulRequests,
    standardHeaders: false,
    legacyHeaders: true,
    handler: createDefault429Handler({ windowMs, messageBuilder })
  };

  const memoryLimiter = rateLimit(baseOptions);
  let redisLimiter = null;

  return (req, res, next) => {
    if (isRedisConnected()) {
      if (!redisLimiter) {
        const store = buildRedisStore(prefix);
        if (store) {
          redisLimiter = rateLimit({
            ...baseOptions,
            store,
            passOnStoreError: true
          });
        }
      }

      if (redisLimiter) {
        return redisLimiter(req, res, next);
      }
    }

    return memoryLimiter(req, res, next);
  };
};

const generalApiLimiter = createRateLimiter({
  prefix: 'api-general',
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 100 : 1000,
  messageBuilder: () => 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.'
});

const authLoginLimiter = createRateLimiter({
  prefix: 'auth-login',
  windowMs: 15 * 60 * 1000,
  max: 10,
  messageBuilder: ({ retryAfterSeconds }) => {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    return `Çok fazla deneme. ${minutes} dakika sonra tekrar deneyin.`;
  }
});

const authRegisterLimiter = createRateLimiter({
  prefix: 'auth-register',
  windowMs: 60 * 60 * 1000,
  max: 5,
  messageBuilder: ({ retryAfterSeconds }) => {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    return `Çok fazla deneme. ${minutes} dakika sonra tekrar deneyin.`;
  }
});

const authRefreshLimiter = createRateLimiter({
  prefix: 'auth-refresh',
  windowMs: 15 * 60 * 1000,
  max: 20,
  messageBuilder: ({ retryAfterSeconds }) => {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    return `Çok fazla deneme. ${minutes} dakika sonra tekrar deneyin.`;
  }
});

const passwordResetLimiter = createRateLimiter({
  prefix: 'auth-password-reset',
  windowMs: 60 * 60 * 1000,
  max: 3,
  messageBuilder: ({ retryAfterSeconds }) => {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    return `Çok fazla deneme. ${minutes} dakika sonra tekrar deneyin.`;
  }
});

const sensitiveOperationsLimiter = createRateLimiter({
  prefix: 'sensitive-ops',
  windowMs: 60 * 60 * 1000,
  max: 10,
  messageBuilder: ({ retryAfterSeconds }) => {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    return `Bu işlem için istek limitine ulaştınız. ${minutes} dakika sonra tekrar deneyin.`;
  }
});

const aiUserLimiter = createRateLimiter({
  prefix: 'ai-user',
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: aiUserKeyGenerator,
  messageBuilder: () => 'AI istek limiti aşıldı.'
});

const aiMutationLimiter = createRateLimiter({
  prefix: 'ai-mutation',
  windowMs: 10 * 60 * 1000,
  max: parseInt(process.env.AI_MUTATION_RATE_LIMIT_MAX, 10) || 8,
  keyGenerator: aiUserKeyGenerator,
  messageBuilder: ({ retryAfterSeconds }) => {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    return `AI işlem limiti aşıldı. ${minutes} dakika sonra tekrar deneyin.`;
  }
});

// Backward-compatible aliases
const generalLimiter = generalApiLimiter;
const strictLimiter = authLoginLimiter;
const aiChatLimiter = aiUserLimiter;

module.exports = {
  generalApiLimiter,
  authLoginLimiter,
  authRegisterLimiter,
  authRefreshLimiter,
  aiUserLimiter,
  generalLimiter,
  strictLimiter,
  passwordResetLimiter,
  sensitiveOperationsLimiter,
  aiChatLimiter,
  aiMutationLimiter
};

