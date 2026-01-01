/**
 * IP Tracking Service
 * Tracks user IP addresses to detect suspicious login patterns
 * Alerts on anomalous behavior (new location, VPN, etc.)
 */

import { createClient } from 'redis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// Interface for IP metadata
interface IPMetadata {
  country?: string;
  city?: string;
  region?: string;
  isp?: string;
  userAgent?: string;
  [key: string]: unknown;
}

// Interface for IP history entry
interface IPHistoryEntry {
  ip: string;
  firstSeen: number;
  lastSeen: number;
  count: number;
  metadata: IPMetadata;
}

// Configuration
const IP_HISTORY_MAX_COUNT = 10; // Keep last 10 IPs
const IP_HISTORY_TTL_DAYS = 90; // Keep IP history for 90 days
const NEW_IP_THRESHOLD_DAYS = 30; // Consider IP "new" if not seen in 30 days

class IPTrackingService {
  
  client: any;

  inMemoryStore: Map<string, any>;

  isConnected: boolean;

constructor() {
    this.client = null;
    this.isConnected = false;
    this.inMemoryStore = new Map(); // Fallback
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
        logger.error('IP Tracking Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('IP tracking Redis connected');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis for IP tracking:', error);
      this.isConnected = false;
    }
  }

  /**
   * Record an IP address for a user
   * @param {string} userId - User ID
   * @param {string} ip - IP address
   * @param {object} metadata - Optional metadata (country, city, etc.)
   * @returns {object} IP analysis
   */
  async recordIP(userId: string, ip: string, metadata: IPMetadata = {}) {
    try {
      const key = `ip:history:${userId}`;
      const now = Date.now();

      let ipHistory = [];

      if (this.isConnected) {
        const stored = await this.client.get(key);
        if (stored) {
          ipHistory = JSON.parse(stored);
        }
      } else {
        ipHistory = this.inMemoryStore.get(key) || [];
      }

      // Check if this is a known IP
      const existingIP = ipHistory.find(entry => entry.ip === ip);
      const isNewIP = !existingIP;
      const daysSinceLastSeen = existingIP 
        ? Math.floor((now - existingIP.lastSeen) / (1000 * 60 * 60 * 24))
        : null;

      if (existingIP) {
        // Update existing IP
        existingIP.lastSeen = now;
        existingIP.count = (existingIP.count || 1) + 1;
        existingIP.metadata = { ...existingIP.metadata, ...metadata };
      } else {
        // Add new IP
        ipHistory.push({
          ip,
          firstSeen: now,
          lastSeen: now,
          count: 1,
          metadata,
        });
      }

      // Sort by last seen (most recent first)
      ipHistory.sort((a, b) => b.lastSeen - a.lastSeen);

      // Keep only the most recent IPs
      if (ipHistory.length > IP_HISTORY_MAX_COUNT) {
        ipHistory = ipHistory.slice(0, IP_HISTORY_MAX_COUNT);
      }

      // Store updated history
      const ttlSeconds = IP_HISTORY_TTL_DAYS * 24 * 60 * 60;
      if (this.isConnected) {
        await this.client.setEx(key, ttlSeconds, JSON.stringify(ipHistory));
      } else {
        this.inMemoryStore.set(key, ipHistory);
        // Clean up in-memory store after TTL
        setTimeout(() => this.inMemoryStore.delete(key), ttlSeconds * 1000);
      }

      // Analyze the IP
      const analysis = {
        isNewIP,
        daysSinceLastSeen,
        totalKnownIPs: ipHistory.length,
        recentIPChanges: this.countRecentIPChanges(ipHistory),
        isSuspicious: false,
        suspiciousReasons: [],
      };

      // Detect suspicious patterns
      if (isNewIP && ipHistory.length > 1) {
        analysis.isSuspicious = true;
        analysis.suspiciousReasons.push('New IP address detected');
      }

      if (existingIP && daysSinceLastSeen > NEW_IP_THRESHOLD_DAYS) {
        analysis.isSuspicious = true;
        analysis.suspiciousReasons.push(`IP not seen in ${daysSinceLastSeen} days`);
      }

      if (analysis.recentIPChanges > 3) {
        analysis.isSuspicious = true;
        analysis.suspiciousReasons.push(`Frequent IP changes (${analysis.recentIPChanges} in 24h)`);
      }

      // Check for private/reserved IPs
      if (this.isPrivateIP(ip)) {
        analysis.suspiciousReasons.push('Private/internal IP address');
      }

      // Log suspicious activity
      if (analysis.isSuspicious) {
        logger.warn('Suspicious IP activity detected', {
          userId,
          ip,
          reasons: analysis.suspiciousReasons,
          knownIPs: ipHistory.length,
        });
      }

      return analysis;
    } catch (error) {
      logger.error('Failed to record IP:', error);
      return { error: error.message };
    }
  }

  /**
   * Count recent IP changes (last 24 hours)
   * @param {Array} ipHistory - IP history array
   * @returns {number} Number of unique IPs in last 24 hours
   */
  countRecentIPChanges(ipHistory: IPHistoryEntry[]): number {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentIPs = ipHistory.filter(entry => entry.lastSeen > oneDayAgo);
    return recentIPs.length;
  }

  /**
   * Check if IP is private/internal
   * @param {string} ip - IP address
   * @returns {boolean} True if private
   */
  isPrivateIP(ip: string): boolean {
    // IPv4 private ranges
    const privateRanges = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^127\./,                   // 127.0.0.0/8 (localhost)
      /^169\.254\./,              // 169.254.0.0/16 (link-local)
      /^::1$/,                    // IPv6 localhost
      /^fe80:/,                   // IPv6 link-local
      /^fc00:/,                   // IPv6 unique local
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Get IP history for a user
   * @param {string} userId - User ID
   * @returns {Array} IP history
   */
  async getIPHistory(userId: string): Promise<IPHistoryEntry[]> {
    try {
      const key = `ip:history:${userId}`;

      if (this.isConnected) {
        const stored = await this.client.get(key);
        return stored ? JSON.parse(stored) : [];
      } else {
        return this.inMemoryStore.get(key) || [];
      }
    } catch (error) {
      logger.error('Failed to get IP history:', error);
      return [];
    }
  }

  /**
   * Check if IP is known for user
   * @param {string} userId - User ID
   * @param {string} ip - IP address
   * @returns {boolean} True if IP is known
   */
  async isKnownIP(userId: string, ip: string): Promise<boolean> {
    try {
      const history = await this.getIPHistory(userId);
      return history.some(entry => entry.ip === ip);
    } catch (error) {
      logger.error('Failed to check known IP:', error);
      return false;
    }
  }

  /**
   * Clear IP history for user
   * @param {string} userId - User ID
   */
  async clearIPHistory(userId: string): Promise<boolean> {
    try {
      const key = `ip:history:${userId}`;

      if (this.isConnected) {
        await this.client.del(key);
      } else {
        this.inMemoryStore.delete(key);
      }

      logger.info('IP history cleared', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to clear IP history:', error);
      return false;
    }
  }

  /**
   * Get statistics
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

      const keys = await this.client.keys('ip:history:*');

      return {
        connected: true,
        totalUsers: keys.length,
        inMemoryEntries: this.inMemoryStore.size,
      };
    } catch (error) {
      logger.error('Failed to get IP tracking stats:', error);
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
      logger.info('IP tracking Redis disconnected');
    }
  }
}

// Singleton instance
const ipTrackingService = new IPTrackingService();

// Initialize on module load
ipTrackingService.connect().catch(err => {
  logger.error('Failed to initialize IP tracking service:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await ipTrackingService.disconnect();
});

process.on('SIGINT', async () => {
  await ipTrackingService.disconnect();
});

export default ipTrackingService;
