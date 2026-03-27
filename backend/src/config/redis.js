const redis = require('redis');
const { config } = require('./env');

let redisClient = null;
let isRedisConnected = false;

// Create Redis client with optional connection
const createRedisClient = () => {
  const client = redis.createClient({
    url: config.redisUrl,
    socket: {
      reconnectStrategy: false // Disable auto-reconnect to prevent spam
    }
  });

  client.on('error', (err) => {
    if (isRedisConnected) {
      isRedisConnected = false;
      console.log('⚠️  Redis connection lost - running without cache');
      return;
    }

    if (!isRedisConnected) {
      console.log('⚠️  Redis not available - running without cache');
    }
  });

  client.on('connect', () => {
    isRedisConnected = true;
    console.log('✅ Redis connected');
  });

  client.on('end', () => {
    isRedisConnected = false;
    console.log('⚠️  Redis disconnected - running without cache');
  });

  client.on('reconnecting', () => {
    isRedisConnected = false;
  });

  return client;
};

// Connect to Redis (optional - app will work without it)
const connectRedis = async () => {
  try {
    redisClient = createRedisClient();
    await redisClient.connect();
    isRedisConnected = true;
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.log('⚠️  Redis connection failed - running without cache');
    isRedisConnected = false;
    redisClient = null;
  }
};

// Safe get function
const getRedisClient = () => {
  return isRedisConnected ? redisClient : null;
};

module.exports = {
  redisClient: getRedisClient,
  connectRedis,
  isRedisConnected: () => isRedisConnected,
};

