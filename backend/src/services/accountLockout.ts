/**
 * Account Lockout Service
 * Prevents brute force attacks by tracking failed login attempts
 * Implements account lockout with exponential backoff
 */

import { createClient } from 'redis';
import config from '../config/index.ts';
import logger from '../utils/logger.ts';

// Configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes window to count attempts
const PROGRESSIVE_DELAYS = [0, 2000, 5000, 10000, 30000]; // Progressive delays in ms

class AccountLockoutService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.inMemoryStore = new Map(); // Fallback if Redis is down
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      const redisConfig = {
        url: config.redis.url,
        database: config.redis.db,
      };
      
      // Only add password if it's actually set
      if (config.redis.password) {
        redisConfig.password = config.redis.password;
      }
      
      this.client = createClient(redisConfig);

      this.client.on('error', (err) => {
        logger.error('Account Lockout Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Account lockout Redis connected');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis for account lockout:', error);
      this.isConnected = false;
    }
  }

  /**
   * Record a failed login attempt
   * @param {string} identifier - Email or IP address
   * @param {string} type - 'email' or 'ip'
   * @returns {object} Lockout status
   */
  async recordFailedAttempt(identifier, type = 'email') {
    try {
      const key = `lockout:${type}:${identifier}`;
      const now = Date.now();

      let attempts = [];

      if (this.isConnected) {
        const stored = await this.client.get(key);
        if (stored) {
          attempts = JSON.parse(stored);
        }
      } else {
        // Fallback to in-memory
        attempts = this.inMemoryStore.get(key) || [];
      }

      // Remove attempts older than the window
      attempts = attempts.filter(timestamp => 
        now - timestamp < ATTEMPT_WINDOW_MS
      );

      // Add new attempt
      attempts.push(now);

      // Store updated attempts
      const ttlSeconds = Math.ceil(ATTEMPT_WINDOW_MS / 1000);
      if (this.isConnected) {
        await this.client.setEx(key, ttlSeconds, JSON.stringify(attempts));
      } else {
        this.inMemoryStore.set(key, attempts);
        // Clean up in-memory store after TTL
        setTimeout(() => this.inMemoryStore.delete(key), ATTEMPT_WINDOW_MS);
      }

      const failedCount = attempts.length;
      const isLocked = failedCount >= MAX_FAILED_ATTEMPTS;

      // Calculate lockout info
      let lockoutInfo = {
        failedAttempts: failedCount,
        maxAttempts: MAX_FAILED_ATTEMPTS,
        isLocked,
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - failedCount),
      };

      if (isLocked) {
        const oldestRelevantAttempt = attempts[attempts.length - MAX_FAILED_ATTEMPTS];
        const lockoutUntil = oldestRelevantAttempt + LOCKOUT_DURATION_MS;
        const lockoutRemaining = Math.max(0, lockoutUntil - now);

        lockoutInfo = {
          ...lockoutInfo,
          lockedUntil: new Date(lockoutUntil),
          lockoutRemainingMs: lockoutRemaining,
          lockoutRemainingMinutes: Math.ceil(lockoutRemaining / 60000),
        };

        logger.warn('Account locked due to failed attempts', {
          identifier,
          type,
          failedAttempts: failedCount,
          lockedUntil: lockoutInfo.lockedUntil,
        });
      } else if (failedCount > 0) {
        logger.info('Failed login attempt recorded', {
          identifier,
          type,
          failedAttempts: failedCount,
          remainingAttempts: lockoutInfo.remainingAttempts,
        });
      }

      return lockoutInfo;
    } catch (error) {
      logger.error('Failed to record failed attempt:', error);
      return { error: error.message };
    }
  }

  /**
   * Check if account/IP is locked
   * @param {string} identifier - Email or IP address
   * @param {string} type - 'email' or 'ip'
   * @returns {object} Lock status
   */
  async checkLockout(identifier, type = 'email') {
    try {
      const key = `lockout:${type}:${identifier}`;
      const now = Date.now();

      let attempts = [];

      if (this.isConnected) {
        const stored = await this.client.get(key);
        if (stored) {
          attempts = JSON.parse(stored);
        }
      } else {
        attempts = this.inMemoryStore.get(key) || [];
      }

      // Remove attempts older than the window
      attempts = attempts.filter(timestamp => 
        now - timestamp < ATTEMPT_WINDOW_MS
      );

      const failedCount = attempts.length;
      const isLocked = failedCount >= MAX_FAILED_ATTEMPTS;

      if (isLocked) {
        const oldestRelevantAttempt = attempts[attempts.length - MAX_FAILED_ATTEMPTS];
        const lockoutUntil = oldestRelevantAttempt + LOCKOUT_DURATION_MS;
        const lockoutRemaining = Math.max(0, lockoutUntil - now);

        return {
          isLocked: lockoutRemaining > 0,
          failedAttempts: failedCount,
          lockedUntil: new Date(lockoutUntil),
          lockoutRemainingMs: lockoutRemaining,
          lockoutRemainingMinutes: Math.ceil(lockoutRemaining / 60000),
        };
      }

      return {
        isLocked: false,
        failedAttempts: failedCount,
        remainingAttempts: MAX_FAILED_ATTEMPTS - failedCount,
      };
    } catch (error) {
      logger.error('Failed to check lockout:', error);
      return { isLocked: false, error: error.message };
    }
  }

  /**
   * Get progressive delay based on failed attempts
   * @param {number} failedAttempts - Number of failed attempts
   * @returns {number} Delay in milliseconds
   */
  getProgressiveDelay(failedAttempts) {
    if (failedAttempts >= PROGRESSIVE_DELAYS.length) {
      return PROGRESSIVE_DELAYS[PROGRESSIVE_DELAYS.length - 1];
    }
    return PROGRESSIVE_DELAYS[failedAttempts] || 0;
  }

  /**
   * Clear failed attempts (on successful login)
   * @param {string} identifier - Email or IP address
   * @param {string} type - 'email' or 'ip'
   */
  async clearFailedAttempts(identifier, type = 'email') {
    try {
      const key = `lockout:${type}:${identifier}`;

      if (this.isConnected) {
        await this.client.del(key);
      } else {
        this.inMemoryStore.delete(key);
      }

      logger.debug('Failed attempts cleared', { identifier, type });
      return true;
    } catch (error) {
      logger.error('Failed to clear attempts:', error);
      return false;
    }
  }

  /**
   * Manually lock an account (admin action)
   * @param {string} identifier - Email or IP address
   * @param {string} type - 'email' or 'ip'
   * @param {number} durationMs - Lock duration in milliseconds
   */
  async manualLock(identifier, type = 'email', durationMs = LOCKOUT_DURATION_MS) {
    try {
      const key = `lockout:manual:${type}:${identifier}`;
      const ttlSeconds = Math.ceil(durationMs / 1000);

      if (this.isConnected) {
        await this.client.setEx(key, ttlSeconds, Date.now().toString());
      } else {
        this.inMemoryStore.set(key, Date.now());
        setTimeout(() => this.inMemoryStore.delete(key), durationMs);
      }

      logger.warn('Manual lockout applied', { identifier, type, durationMs });
      return true;
    } catch (error) {
      logger.error('Failed to apply manual lock:', error);
      return false;
    }
  }

  /**
   * Check if account has manual lock
   * @param {string} identifier - Email or IP address
   * @param {string} type - 'email' or 'ip'
   * @returns {boolean} True if manually locked
   */
  async isManuallyLocked(identifier, type = 'email') {
    try {
      const key = `lockout:manual:${type}:${identifier}`;

      if (this.isConnected) {
        const result = await this.client.get(key);
        return result !== null;
      } else {
        return this.inMemoryStore.has(key);
      }
    } catch (error) {
      logger.error('Failed to check manual lock:', error);
      return false;
    }
  }

  /**
   * Get lockout statistics
   * @returns {object} Statistics
   */
  async getStats() {
    try {
      if (!this.isConnected) {
        return { 
          connected: false,
          inMemoryEntries: this.inMemoryStore.size 
        };
      }

      const keys = await this.client.keys('lockout:*');
      const manualLocks = keys.filter(k => k.includes(':manual:')).length;
      const autoLocks = keys.filter(k => !k.includes(':manual:')).length;

      return {
        connected: true,
        totalLockouts: keys.length,
        automaticLockouts: autoLocks,
        manualLockouts: manualLocks,
        inMemoryEntries: this.inMemoryStore.size,
      };
    } catch (error) {
      logger.error('Failed to get lockout stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Account lockout Redis disconnected');
    }
  }
}

// Singleton instance
const accountLockoutService = new AccountLockoutService();

// Initialize on module load
accountLockoutService.connect().catch(err => {
  logger.error('Failed to initialize account lockout service:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await accountLockoutService.disconnect();
});

process.on('SIGINT', async () => {
  await accountLockoutService.disconnect();
});

export default accountLockoutService;
export { MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MS };
