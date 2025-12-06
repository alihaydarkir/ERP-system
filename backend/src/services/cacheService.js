const { redisClient, isRedisConnected } = require('../config/redis');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour in seconds
  }

  /**
   * Get Redis client safely
   */
  getClient() {
    return redisClient();
  }

  /**
   * Check if Redis is available
   */
  isAvailable() {
    return isRedisConnected();
  }

  /**
   * Set a value in cache
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isAvailable()) return { success: false, error: 'Redis not available' };

    try {
      const client = this.getClient();
      const serialized = JSON.stringify(value);
      await client.setEx(key, ttl, serialized);
      return { success: true };
    } catch (error) {
      console.error('Cache set error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a value from cache
   */
  async get(key) {
    if (!this.isAvailable()) return { success: false, data: null };

    try {
      const client = this.getClient();
      const value = await client.get(key);
      if (!value) {
        return { success: false, data: null };
      }
      const deserialized = JSON.parse(value);
      return { success: true, data: deserialized };
    } catch (error) {
      console.error('Cache get error:', error.message);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key) {
    if (!this.isAvailable()) return { success: false, error: 'Redis not available' };

    try {
      const client = this.getClient();
      await client.del(key);
      return { success: true };
    } catch (error) {
      console.error('Cache delete error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern) {
    if (!this.isAvailable()) return { success: false, error: 'Redis not available' };

    try {
      const client = this.getClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return { success: true, deleted: keys.length };
    } catch (error) {
      console.error('Cache delete pattern error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key) {
    if (!this.isAvailable()) return { success: false, exists: false };

    try {
      const client = this.getClient();
      const exists = await client.exists(key);
      return { success: true, exists: exists === 1 };
    } catch (error) {
      console.error('Cache exists error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key, ttl) {
    if (!this.isAvailable()) return { success: false, error: 'Redis not available' };

    try {
      const client = this.getClient();
      await client.expire(key, ttl);
      return { success: true };
    } catch (error) {
      console.error('Cache expire error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Increment a value
   */
  async increment(key, amount = 1) {
    if (!this.isAvailable()) return { success: false, error: 'Redis not available' };

    try {
      const client = this.getClient();
      const value = await client.incrBy(key, amount);
      return { success: true, value };
    } catch (error) {
      console.error('Cache increment error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Decrement a value
   */
  async decrement(key, amount = 1) {
    if (!this.isAvailable()) return { success: false, error: 'Redis not available' };

    try {
      const client = this.getClient();
      const value = await client.decrBy(key, amount);
      return { success: true, value };
    } catch (error) {
      console.error('Cache decrement error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get or set (if not exists)
   */
  async getOrSet(key, fetcher, ttl = this.defaultTTL) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached.success && cached.data !== null) {
        return { success: true, data: cached.data, fromCache: true };
      }

      // Fetch fresh data
      const freshData = await fetcher();

      // Store in cache
      await this.set(key, freshData, ttl);

      return { success: true, data: freshData, fromCache: false };
    } catch (error) {
      console.error('Cache getOrSet error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cache products
   */
  async cacheProducts(products, ttl = 600) {
    return await this.set('products:all', products, ttl);
  }

  /**
   * Get cached products
   */
  async getCachedProducts() {
    return await this.get('products:all');
  }

  /**
   * Cache product by ID
   */
  async cacheProduct(productId, product, ttl = 600) {
    return await this.set(`product:${productId}`, product, ttl);
  }

  /**
   * Get cached product by ID
   */
  async getCachedProduct(productId) {
    return await this.get(`product:${productId}`);
  }

  /**
   * Invalidate product cache
   */
  async invalidateProductCache(productId = null) {
    if (productId) {
      await this.delete(`product:${productId}`);
    }
    return await this.delete('products:all');
  }

  /**
   * Cache orders
   */
  async cacheOrders(orders, ttl = 300) {
    return await this.set('orders:all', orders, ttl);
  }

  /**
   * Get cached orders
   */
  async getCachedOrders() {
    return await this.get('orders:all');
  }

  /**
   * Invalidate order cache
   */
  async invalidateOrderCache() {
    return await this.delete('orders:all');
  }

  /**
   * Cache user session
   */
  async cacheSession(userId, sessionData, ttl = 86400) {
    return await this.set(`session:${userId}`, sessionData, ttl);
  }

  /**
   * Get cached session
   */
  async getCachedSession(userId) {
    return await this.get(`session:${userId}`);
  }

  /**
   * Delete session
   */
  async deleteSession(userId) {
    return await this.delete(`session:${userId}`);
  }

  /**
   * Cache dashboard stats
   */
  async cacheDashboardStats(stats, ttl = 300) {
    return await this.set('dashboard:stats', stats, ttl);
  }

  /**
   * Get cached dashboard stats
   */
  async getCachedDashboardStats() {
    return await this.get('dashboard:stats');
  }

  /**
   * Flush all cache
   */
  async flushAll() {
    if (!this.isAvailable()) return { success: false, error: 'Redis not available' };

    try {
      const client = this.getClient();
      await client.flushAll();
      return { success: true };
    } catch (error) {
      console.error('Cache flush error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isAvailable()) return { success: false, error: 'Redis not available' };

    try {
      const client = this.getClient();
      const info = await client.info('stats');
      return { success: true, stats: info };
    } catch (error) {
      console.error('Cache stats error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CacheService();
