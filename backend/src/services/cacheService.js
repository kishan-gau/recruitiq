/**
 * Redis Cache Service
 * Centralized caching layer for RecruitIQ backend
 * 
 * Features:
 * - User session caching (5-minute TTL)
 * - JWT payload templates (15-minute TTL)
 * - Frequently accessed resources (1-hour TTL)
 * - Graceful degradation (app works without Redis)
 * - Automatic cache invalidation on updates
 * 
 * Usage:
 * ```javascript
 * import cacheService from './services/cacheService.js';
 * 
 * // Get from cache
 * const user = await cacheService.get('user:123');
 * 
 * // Set in cache
 * await cacheService.set('user:123', userData, 300); // 5 min TTL
 * 
 * // Delete from cache
 * await cacheService.del('user:123');
 * 
 * // Invalidate pattern
 * await cacheService.del('user:*');
 * ```
 */

import { createClient } from 'redis';
import logger from '../utils/logger.js';

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5 minutes
    
    // Cache TTL presets
    this.TTL = {
      USER_DATA: 300,           // 5 minutes
      JWT_TEMPLATE: 900,        // 15 minutes
      REFRESH_TOKEN: 604800,    // 7 days
      DEPARTMENTS: 3600,        // 1 hour
      LOCATIONS: 3600,          // 1 hour
      EMPLOYEE_LIST: 300,       // 5 minutes
      PRODUCT_ACCESS: 900,      // 15 minutes
      SESSION: 900              // 15 minutes
    };
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = process.env.REDIS_PORT || 6379;
      const redisUrl = `redis://${redisHost}:${redisPort}`;
      
      // Only include password if it's set and not empty
      const redisPassword = process.env.REDIS_PASSWORD?.trim();

      logger.info('Connecting to Redis cache...', { url: redisUrl, hasPassword: !!redisPassword });

      const redisConfig = {
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis connection failed after 10 retries');
              return new Error('Redis connection failed');
            }
            // Exponential backoff, max 3 seconds
            return Math.min(retries * 100, 3000);
          }
        }
      };
      
      // Only add password if it's actually set
      if (redisPassword) {
        redisConfig.password = redisPassword;
      }
      
      this.client = createClient(redisConfig);

      // Event handlers
      this.client.on('error', (err) => {
        logger.error('Redis client error:', { error: err.message });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis client reconnecting...');
      });

      this.client.on('end', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      
      logger.info('✅ CacheService initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Redis cache:', {
        error: error.message,
        stack: error.stack
      });
      
      // Application continues without cache (graceful degradation)
      this.isConnected = false;
      logger.warn('⚠️ Application running WITHOUT cache layer (degraded performance)');
      return false;
    }
  }

  /**
   * Get value from cache
   * 
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value or null
   */
  async get(key) {
    if (!this.isConnected) {
      return null;
    }
    
    try {
      const value = await this.client.get(key);
      
      if (value) {
        logger.debug('Cache hit', { key });
        return JSON.parse(value);
      }
      
      logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      logger.error('Cache get error', { 
        key, 
        error: error.message 
      });
      return null; // Fail gracefully
    }
  }

  /**
   * Set value in cache
   * 
   * @param {string} key - Cache key
   * @param {any} value - Value to cache (will be JSON stringified)
   * @param {number} ttl - Time to live in seconds (default: 300)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      logger.debug('Cache set', { key, ttl });
      return true;
    } catch (error) {
      logger.error('Cache set error', { 
        key, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Delete value from cache
   * Supports wildcard patterns (e.g., 'user:*')
   * 
   * @param {string} key - Cache key or pattern
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      // Support wildcard patterns
      if (key.includes('*')) {
        const keys = await this.client.keys(key);
        
        if (keys.length > 0) {
          await this.client.del(keys);
          logger.debug('Cache deleted (pattern)', { 
            pattern: key, 
            count: keys.length 
          });
        } else {
          logger.debug('Cache delete pattern - no keys found', { pattern: key });
        }
      } else {
        const result = await this.client.del(key);
        logger.debug('Cache deleted', { key, deleted: result === 1 });
      }
      
      return true;
    } catch (error) {
      logger.error('Cache delete error', { 
        key, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * 
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key exists
   */
  async exists(key) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { 
        key, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Get cache statistics
   * 
   * @returns {Promise<Object>} Cache stats (hits, misses, hit rate)
   */
  async getStats() {
    if (!this.isConnected) {
      return {
        connected: false,
        hits: 0,
        misses: 0,
        hitRate: 0
      };
    }
    
    try {
      const info = await this.client.info('stats');
      
      // Parse Redis INFO output
      const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0');
      const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0');
      const total = hits + misses;
      const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : 0;
      
      return {
        connected: true,
        hits,
        misses,
        hitRate: parseFloat(hitRate),
        total
      };
    } catch (error) {
      logger.error('Failed to get cache stats', { error: error.message });
      return {
        connected: this.isConnected,
        error: error.message
      };
    }
  }

  /**
   * Invalidate user-related caches
   * Call this when user data changes (profile update, role change, etc.)
   * 
   * @param {string} userId - User UUID
   */
  async invalidateUser(userId) {
    await this.del(`user:${userId}:*`);
    await this.del(`user:email:*:${userId}`);
    await this.del(`jwt:template:${userId}:*`);
    await this.del(`session:*:${userId}`);
    
    logger.info('User cache invalidated', { userId });
  }

  /**
   * Invalidate organization-related caches
   * Call this when organization data changes
   * 
   * @param {string} organizationId - Organization UUID
   */
  async invalidateOrganization(organizationId) {
    await this.del(`departments:${organizationId}:*`);
    await this.del(`locations:${organizationId}:*`);
    await this.del(`employees:${organizationId}:*`);
    await this.del(`products:${organizationId}:*`);
    
    logger.info('Organization cache invalidated', { organizationId });
  }

  /**
   * Clear all cache (use with caution!)
   */
  async flush() {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      await this.client.flushDb();
      logger.warn('All cache cleared (FLUSHDB)');
      return true;
    } catch (error) {
      logger.error('Cache flush error', { error: error.message });
      return false;
    }
  }

  /**
   * Check if cache is available
   * 
   * @returns {boolean} True if connected to Redis
   */
  isAvailable() {
    return this.isConnected;
  }

  /**
   * Close Redis connection
   * Call this on application shutdown
   */
  async close() {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Redis connection closed gracefully');
      } catch (error) {
        logger.error('Error closing Redis connection', { 
          error: error.message 
        });
      }
    }
  }

  /**
   * Generate cache key for user lookup by email
   * 
   * @param {string} email - User email
   * @param {string} organizationId - Organization UUID
   * @returns {string} Cache key
   */
  getUserByEmailKey(email, organizationId) {
    return `user:email:${organizationId}:${email}`;
  }

  /**
   * Generate cache key for user by ID
   * 
   * @param {string} userId - User UUID
   * @param {string} organizationId - Organization UUID
   * @returns {string} Cache key
   */
  getUserByIdKey(userId, organizationId) {
    return `user:${userId}:${organizationId}`;
  }

  /**
   * Generate cache key for JWT payload template
   * 
   * @param {string} userId - User UUID
   * @param {string} organizationId - Organization UUID
   * @returns {string} Cache key
   */
  getJWTTemplateKey(userId, organizationId) {
    return `jwt:template:${userId}:${organizationId}`;
  }

  /**
   * Generate cache key for refresh token
   * 
   * @param {string} token - Refresh token
   * @returns {string} Cache key
   */
  getRefreshTokenKey(token) {
    return `refresh_token:${token}`;
  }

  /**
   * Disconnect from Redis
   * Should be called during graceful shutdown or test cleanup
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis client disconnected gracefully');
      } catch (error) {
        logger.error('Error disconnecting Redis client:', { error: error.message });
        // Force disconnect
        try {
          await this.client.disconnect();
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  /**
   * Generate cache key for department list
   * 
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Query filters (optional)
   * @returns {string} Cache key
   */
  getDepartmentsKey(organizationId, filters = {}) {
    const filterKey = Object.keys(filters).length > 0 
      ? `:${JSON.stringify(filters)}` 
      : '';
    return `departments:${organizationId}${filterKey}`;
  }

  /**
   * Generate cache key for location list
   * 
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Query filters (optional)
   * @returns {string} Cache key
   */
  getLocationsKey(organizationId, filters = {}) {
    const filterKey = Object.keys(filters).length > 0 
      ? `:${JSON.stringify(filters)}` 
      : '';
    return `locations:${organizationId}${filterKey}`;
  }
}

// Singleton instance
const cacheService = new CacheService();

export default cacheService;
