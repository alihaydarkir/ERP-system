const Joi = require('joi');
const dotenv = require('dotenv');

// Load .env once and validate eagerly
dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(5000),
  CORS_ORIGINS: Joi.string().allow('', null),
  ALLOWED_HOSTS: Joi.string().allow('', null),
  STRICT_ORIGIN_CHECK: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).default('true'),

  DATABASE_URL: Joi.string().uri().allow('', null),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().integer().default(5432),
  DB_USER: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().allow(''),
  DB_NAME: Joi.string().default('erp_db'),

  JWT_SECRET: Joi.string().min(24).required(),
  JWT_EXPIRY: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: Joi.string().default('7d'),
  JWT_REFRESH_EXPIRY: Joi.string().allow('', null),

  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).allow('', null).default('redis://localhost:6379'),

  RATE_LIMIT_MAX: Joi.number().integer().min(1).allow(null),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
}).unknown(true);

const { value: env, error } = envSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: false,
});

if (error) {
  console.error('❌ Invalid environment configuration:');
  error.details.forEach((detail) => console.error(`- ${detail.message}`));
  process.exit(1);
}

const parseCorsOrigins = (origins) => {
  if (!origins) {
    return ['http://localhost:3000', 'http://localhost:5173'];
  }
  return origins.split(',').map(origin => origin.trim()).filter(Boolean);
};

const parseAllowedHosts = (hosts) => {
  if (!hosts) {
    return ['localhost:5000', 'localhost:3000', 'localhost:5173'];
  }
  return hosts.split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
};

const toBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return fallback;
};

const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  corsOrigins: parseCorsOrigins(env.CORS_ORIGINS),
  rateLimitMax: env.RATE_LIMIT_MAX || (env.NODE_ENV === 'production' ? 100 : 1000),
  db: {
    connectionString: env.DATABASE_URL,
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    name: env.DB_NAME,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRY,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRY || env.REFRESH_TOKEN_EXPIRY,
  },
  security: {
    allowedHosts: parseAllowedHosts(env.ALLOWED_HOSTS),
    strictOriginCheck: toBoolean(env.STRICT_ORIGIN_CHECK, env.NODE_ENV === 'production'),
  },
  redisUrl: env.REDIS_URL || 'redis://localhost:6379',
  frontendUrl: env.FRONTEND_URL,
};

module.exports = {
  env,
  config,
};
