/**
 * Token Blacklist Service
 * Manages JWT token blacklisting for logout and revocation
 * Uses Redis for fast in-memory storage
 */

import { createClient } from 'redis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class TokenBlacklistService {
  constructor() {
    this.client = null;
    this.isConnected = false;
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
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Token blacklist Redis connected');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis for token blacklist:', error);
      // Continue without Redis - fallback to in-memory
      this.isConnected = false;
    }
  }

  /**
   * Add token to blacklist
   * @param {string} token - JWT token to blacklist
   * @param {number} expiresIn - Token expiration time in seconds
   */
  async blacklistToken(token, expiresIn = 604800) { // Default 7 days
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, token blacklist unavailable');
        return false;
      }

      const key = `blacklist:${token}`;
      await this.client.setEx(key, expiresIn, '1');
      
      logger.info('Token blacklisted', { 
        tokenPrefix: token.substring(0, 10),
        expiresIn 
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to blacklist token:', error);
      return false;
    }
  }

  /**
   * Check if token is blacklisted
   * @param {string} token - JWT token to check
   * @returns {boolean} True if token is blacklisted
   */
  async isBlacklisted(token) {
    try {
      if (!this.isConnected) {
        return false; // If Redis is down, allow access
      }

      const key = `blacklist:${token}`;
      const result = await this.client.get(key);
      
      return result !== null;
    } catch (error) {
      logger.error('Failed to check token blacklist:', error);
      return false; // Fail open on errors
    }
  }

  /**
   * Blacklist all tokens for a user
   * @param {string} userId - User ID
   * @param {number} expiresIn - Expiration time in seconds
   */
  async blacklistUserTokens(userId, expiresIn = 604800) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const key = `blacklist:user:${userId}`;
      await this.client.setEx(key, expiresIn, Date.now().toString());
      
      logger.info('All tokens blacklisted for user', { userId });
      
      return true;
    } catch (error) {
      logger.error('Failed to blacklist user tokens:', error);
      return false;
    }
  }

  /**
   * Check if all user tokens are blacklisted
   * @param {string} userId - User ID
   * @param {number} tokenIssuedAt - Token issued at timestamp (seconds)
   * @returns {boolean} True if all user tokens are blacklisted
   */
  async areUserTokensBlacklisted(userId, tokenIssuedAt) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const key = `blacklist:user:${userId}`;
      const blacklistedAt = await this.client.get(key);
      
      if (!blacklistedAt) {
        return false;
      }

      // If token was issued before blacklist time, it's invalid
      return tokenIssuedAt < parseInt(blacklistedAt, 10);
    } catch (error) {
      logger.error('Failed to check user tokens blacklist:', error);
      return false;
    }
  }

  /**
   * Remove token from blacklist (rare use case)
   * @param {string} token - JWT token to remove
   */
  async removeFromBlacklist(token) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const key = `blacklist:${token}`;
      await this.client.del(key);
      
      logger.info('Token removed from blacklist', { 
        tokenPrefix: token.substring(0, 10)
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to remove token from blacklist:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Token blacklist Redis disconnected');
    }
  }

  /**
   * Get blacklist statistics
   * @returns {object} Statistics about blacklisted tokens
   */
  async getStats() {
    try {
      if (!this.isConnected) {
        return { connected: false };
      }

      const keys = await this.client.keys('blacklist:*');
      
      return {
        connected: true,
        totalBlacklisted: keys.length,
        userBlacklists: keys.filter(k => k.startsWith('blacklist:user:')).length,
        tokenBlacklists: keys.filter(k => !k.startsWith('blacklist:user:')).length,
      };
    } catch (error) {
      logger.error('Failed to get blacklist stats:', error);
      return { error: error.message };
    }
  }
}

// Singleton instance
const tokenBlacklistService = new TokenBlacklistService();

// Initialize on module load
tokenBlacklistService.connect().catch(err => {
  logger.error('Failed to initialize token blacklist service:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await tokenBlacklistService.disconnect();
});

process.on('SIGINT', async () => {
  await tokenBlacklistService.disconnect();
});

export default tokenBlacklistService;
