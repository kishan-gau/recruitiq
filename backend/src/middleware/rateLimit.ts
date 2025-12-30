import { createClient } from 'redis';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import config from '../config/index.ts';
import logger from '../utils/logger.ts';

/**
 * Enhanced rate limiting with Redis support
 * Provides distributed rate limiting, role-based limits, and comprehensive headers
 */

class RateLimitManager {
  constructor() {
    this.redisEnabled = process.env.REDIS_ENABLED === 'true';
    this.redisClient = null;
    this.isConnected = false;

    if (this.redisEnabled) {
      this.initializeRedis();
    } else {
      logger.info('Rate limiting using memory store (development mode)');
    }
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      // Only include password if it's set and not empty
      const redisPassword = process.env.REDIS_PASSWORD?.trim();
      const redisConfig = {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 10000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed after 10 attempts');
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      };
      
      // Only add password if it's actually set
      if (redisPassword) {
        redisConfig.password = redisPassword;
      }
      
      this.redisClient = createClient(redisConfig);

      this.redisClient.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.redisClient.on('ready', () => {
        logger.info('✅ Redis client ready for rate limiting');
        this.isConnected = true;
      });

      this.redisClient.on('reconnecting', () => {
        logger.warn('Redis client reconnecting...');
        this.isConnected = false;
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis for rate limiting:', error);
      logger.warn('Falling back to memory-based rate limiting');
      this.redisEnabled = false;
      this.redisClient = null;
    }
  }

  /**
   * Create store for rate limiter
   */
  createStore() {
    if (this.redisEnabled && this.redisClient && this.isConnected) {
      return new RedisStore({
        client: this.redisClient,
        prefix: 'rl:', // Rate limit prefix
        sendCommand: (...args) => this.redisClient.sendCommand(args),
      });
    }
    
    // If Redis is being initialized, use memory store temporarily
    if (this.redisEnabled && this.redisClient && !this.isConnected) {
      logger.warn('Redis connecting... using memory store temporarily');
      return undefined; // express-rate-limit uses MemoryStore by default
    }
    
    // If Redis is disabled or failed, use memory store
    if (!this.redisEnabled) {
      logger.warn('Redis disabled or unavailable, using memory store for rate limiting');
      return undefined; // express-rate-limit uses MemoryStore by default
    }
    
    // Fallback to memory store
    return undefined;
  }

  /**
   * Create rate limiter with configuration
   * @param {object} options - Rate limiter options
   * @returns {Function} - Express middleware
   */
  createLimiter(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes default
      max = 100, // 100 requests default
      message = 'Too many requests, please try again later',
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = null, // Custom key generator (user-based only, not IP-based)
      skip = null, // Skip function
      handler = null, // Custom handler
      onLimitReached = null, // Callback when limit is reached
    } = options;

    // In test environment, load testing, or development, use very high limits to avoid accidental rate limiting
    // while still keeping the rate limiter functional for explicit rate limit tests
    const isTestEnv = process.env.NODE_ENV === 'test';
    const isLoadTest = process.env.LOAD_TEST === 'true';
    const isDevelopment = process.env.NODE_ENV === 'development';
    const effectiveMax = (isTestEnv || isLoadTest || isDevelopment) ? max * 1000 : max; // 1000x higher limit in dev/test

    const limiterConfig = {
      windowMs,
      max: effectiveMax,
      message: {
        error: 'Rate Limit Exceeded',
        message,
        retryAfter: Math.ceil(windowMs / 1000),
      },
      standardHeaders: true, // Send RateLimit-* headers
      legacyHeaders: false, // Disable X-RateLimit-* headers
      skipSuccessfulRequests,
      skipFailedRequests,
      
      // Use Redis store if available
      store: this.createStore(),

      // Custom key generator - ONLY for user-based limiting
      // Never use IP-based keyGenerator to avoid IPv6 issues
      // express-rate-limit handles IP-based keys automatically with proper IPv6 support
      ...(keyGenerator && typeof keyGenerator === 'function' ? { keyGenerator } : {}),

      // Skip function
      skip: skip || (() => false),

      // Custom handler for rate limit exceeded
      handler: handler || ((req, res) => {
        const retryAfter = Math.ceil(windowMs / 1000);
        
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.id,
          path: req.path,
          method: req.method,
          limit: max,
          windowMs,
        });

        // Call custom callback if provided
        if (onLimitReached) {
          onLimitReached(req);
        }

        res.status(429).json({
          error: 'Rate Limit Exceeded',
          message,
          retryAfter,
          limit: max,
          windowMs,
        });
      }),
    };

    return rateLimit(limiterConfig);
  }

  /**
   * Get Redis connection status
   */
  getStatus() {
    return {
      enabled: this.redisEnabled,
      connected: this.isConnected,
      store: this.redisEnabled && this.isConnected ? 'redis' : 'memory',
    };
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      logger.info('Redis rate limit client closed');
    }
  }
}

// Create singleton instance
const rateLimitManager = new RateLimitManager();

/**
 * Pre-configured rate limiters for common use cases
 */

/**
 * Global API rate limiter
 * 100 requests per 15 minutes
 */
export const globalLimiter = rateLimitManager.createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
});

/**
 * Strict rate limiter for authentication endpoints
 * Industry standard: 5 attempts per 15 minutes to prevent brute force
 * This prevents attackers from trying 400+ passwords per hour
 */
export const authLimiter = rateLimitManager.createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 100 : 5, // 5 attempts in production, 100 in test
  message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  skipSuccessfulRequests: true, // Don't count successful logins
  onLimitReached: (req) => {
    logger.warn('Auth rate limit exceeded - potential brute force attack', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
    });
    
    // Track for security monitoring
    if (typeof req.trackSecurityEvent === 'function') {
      req.trackSecurityEvent('RATE_LIMIT_AUTH_EXCEEDED', {
        ip: req.ip,
        path: req.path,
      });
    }
  },
});

/**
 * API rate limiter for regular authenticated endpoints
 * 1000 requests per hour
 */
export const apiLimiter = rateLimitManager.createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: 'API rate limit exceeded, please try again later',
});

/**
 * Strict limiter for resource-intensive operations
 * 10 requests per hour
 */
export const heavyLimiter = rateLimitManager.createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many resource-intensive requests, please try again later',
  onLimitReached: (req) => {
    logger.warn('Heavy operation rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      path: req.path,
    });
  },
});

/**
 * Public endpoint rate limiter
 * 50 requests per 15 minutes
 */
export const publicLimiter = rateLimitManager.createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many requests, please try again later',
});

/**
 * Application submission limiter
 * 5 applications per hour per IP
 */
export const applicationLimiter = rateLimitManager.createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many application submissions, please try again later',
  // Note: Removed custom keyGenerator to avoid IPv6 issues
  // Will use default IP-based limiting from express-rate-limit
});

/**
 * File upload rate limiter
 * 20 uploads per hour
 */
export const uploadLimiter = rateLimitManager.createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many file uploads, please try again later',
});

/**
 * Create custom rate limiter with role-based limits
 * @param {object} limits - Role-based limit configuration
 * @returns {Function} - Express middleware
 */
export function createRoleBasedLimiter(limits = {}) {
  const {
    admin = 10000, // Admin: 10k requests/hour
    recruiter = 5000, // Recruiter: 5k requests/hour
    hiring_manager = 2000, // Hiring Manager: 2k requests/hour
    member = 1000, // Member: 1k requests/hour
    default: defaultLimit = 100, // Default: 100 requests/hour
    windowMs = 60 * 60 * 1000, // 1 hour window
  } = limits;

  const roleToLimit = {
    admin,
    recruiter,
    hiring_manager,
    member,
  };

  return rateLimitManager.createLimiter({
    windowMs,
    max: (req) => {
      // Get user role
      const role = req.user?.role;
      
      // Return role-specific limit or default
      return roleToLimit[role] || defaultLimit;
    },
    message: 'Rate limit exceeded for your role',
    // Use user-based keyGenerator (not IP-based) to avoid IPv6 validation errors
    // Limits are per-user, not per-IP
    keyGenerator: (req) => {
      const userId = req.user?.id;
      const role = req.user?.role || 'anonymous';
      // If authenticated, limit by user ID + role
      // If not authenticated, fall back to IP (handled by express-rate-limit)
      return userId ? `role:${role}:user:${userId}` : undefined;
    },
  });
}

/**
 * Create endpoint-specific rate limiter
 * @param {object} options - Configuration options
 * @returns {Function} - Express middleware
 */
export function createEndpointLimiter(options = {}) {
  const {
    endpoint = 'custom',
    windowMs = 60 * 60 * 1000,
    max = 100,
    message = 'Rate limit exceeded for this endpoint',
  } = options;

  return rateLimitManager.createLimiter({
    windowMs,
    max,
    message,
    // Use endpoint-based keyGenerator for better tracking
    // For authenticated users: endpoint + user ID
    // For anonymous users: let express-rate-limit handle IP (with IPv6 support)
    keyGenerator: (req) => {
      const userId = req.user?.id;
      // If authenticated, limit by endpoint + user ID
      // If not authenticated, return undefined to let express-rate-limit use default IP key
      return userId ? `endpoint:${endpoint}:user:${userId}` : undefined;
    },
  });
}

/**
 * Bypass rate limiting for specific conditions
 * @param {Function} condition - Function that returns true to skip rate limiting
 * @returns {Function} - Middleware wrapper
 */
export function bypassRateLimitIf(condition) {
  return (req, res, next) => {
    if (condition(req)) {
      req.skipRateLimit = true;
    }
    next();
  };
}

/**
 * Middleware to add rate limit info to response headers
 */
export function addRateLimitHeaders(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Add rate limit info to response if available
    if (res.getHeader('RateLimit-Limit')) {
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data.rateLimit = {
          limit: parseInt(res.getHeader('RateLimit-Limit')),
          remaining: parseInt(res.getHeader('RateLimit-Remaining')),
          reset: res.getHeader('RateLimit-Reset'),
        };
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

export { rateLimitManager };
export default rateLimitManager;
