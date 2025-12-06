const redis = require('redis');
const dotenv = require('dotenv');

dotenv.config();

let redisClient = null;
let isRedisConnected = false;

// Create Redis client with optional connection
const createRedisClient = () => {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: false // Disable auto-reconnect to prevent spam
    }
  });

  client.on('error', (err) => {
    if (!isRedisConnected) {
      console.log('⚠️  Redis not available - running without cache');
    }
  });

  client.on('connect', () => {
    isRedisConnected = true;
    console.log('✅ Redis connected');
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

