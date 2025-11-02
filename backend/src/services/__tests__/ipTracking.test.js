/**
 * Unit Tests for IP Tracking Service
 * Tests IP recording, suspicious activity detection, and history management
 */

import { jest } from '@jest/globals';

// Mock dependencies BEFORE importing
const mockRedisClient = {
  connect: jest.fn(),
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

const mockCreateClient = jest.fn(() => mockRedisClient);

const mockConfig = {
  redis: {
    url: 'redis://localhost:6379',
    password: 'testpassword',
    db: 0,
  },
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.unstable_mockModule('redis', () => ({
  createClient: mockCreateClient,
}));
jest.unstable_mockModule('../../config/index.js', () => ({
  default: mockConfig,
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: mockLogger,
}));

// Import after mocking
let ipTrackingService;

beforeAll(async () => {
  const module = await import('../ipTracking.js');
  ipTrackingService = module.default;
});

beforeEach(() => {
  jest.clearAllMocks();
  ipTrackingService.isConnected = false;
  ipTrackingService.client = null;
  ipTrackingService.inMemoryStore.clear();
});

describe('IPTrackingService', () => {
  describe('connect', () => {
    it('should establish Redis connection successfully', async () => {
      ipTrackingService.isConnected = false;
      mockRedisClient.connect.mockResolvedValue();
      
      await ipTrackingService.connect();
      
      expect(mockCreateClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
        password: 'testpassword',
        database: 0,
      });
    });

    it('should not reconnect if already connected', async () => {
      ipTrackingService.isConnected = true;
      
      await ipTrackingService.connect();
      
      expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));
      
      await ipTrackingService.connect();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect'),
        expect.any(Error)
      );
      expect(ipTrackingService.isConnected).toBe(false);
    });
  });

  describe('recordIP', () => {
    it('should record new IP for user', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await ipTrackingService.recordIP('user-123', '203.0.113.45');
      
      expect(result.isNewIP).toBe(true);
      expect(result.totalKnownIPs).toBe(1);
      expect(result.isSuspicious).toBe(false); // First IP is not suspicious
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it('should update existing IP', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      
      const existingHistory = JSON.stringify([
        { ip: '203.0.113.45', firstSeen: Date.now() - 1000000, lastSeen: Date.now() - 1000000, count: 5, metadata: {} }
      ]);
      
      mockRedisClient.get.mockResolvedValue(existingHistory);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await ipTrackingService.recordIP('user-123', '203.0.113.45');
      
      expect(result.isNewIP).toBe(false);
      expect(result.daysSinceLastSeen).toBeGreaterThanOrEqual(0);
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it('should detect suspicious new IP when user has history', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      
      const existingHistory = JSON.stringify([
        { ip: '203.0.113.45', firstSeen: Date.now() - 1000000, lastSeen: Date.now() - 500000, count: 10, metadata: {} }
      ]);
      
      mockRedisClient.get.mockResolvedValue(existingHistory);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await ipTrackingService.recordIP('user-123', '198.51.100.22');
      
      expect(result.isNewIP).toBe(true);
      expect(result.isSuspicious).toBe(true);
      expect(result.suspiciousReasons).toContain('New IP address detected');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Suspicious IP activity detected',
        expect.any(Object)
      );
    });

    it('should detect IP not seen in 30+ days', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      
      const thirtyOneDaysAgo = Date.now() - (31 * 24 * 60 * 60 * 1000);
      const existingHistory = JSON.stringify([
        { ip: '203.0.113.45', firstSeen: thirtyOneDaysAgo, lastSeen: thirtyOneDaysAgo, count: 5, metadata: {} }
      ]);
      
      mockRedisClient.get.mockResolvedValue(existingHistory);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await ipTrackingService.recordIP('user-123', '203.0.113.45');
      
      expect(result.isSuspicious).toBe(true);
      expect(result.suspiciousReasons.some(r => r.includes('not seen in'))).toBe(true);
    });

    it('should detect frequent IP changes', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      
      // 4 different IPs in last 24 hours
      const existingHistory = JSON.stringify([
        { ip: '203.0.113.1', lastSeen: oneHourAgo, count: 1, metadata: {} },
        { ip: '203.0.113.2', lastSeen: oneHourAgo + 10000, count: 1, metadata: {} },
        { ip: '203.0.113.3', lastSeen: oneHourAgo + 20000, count: 1, metadata: {} },
        { ip: '203.0.113.4', lastSeen: oneHourAgo + 30000, count: 1, metadata: {} }
      ]);
      
      mockRedisClient.get.mockResolvedValue(existingHistory);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await ipTrackingService.recordIP('user-123', '203.0.113.5');
      
      expect(result.isSuspicious).toBe(true);
      expect(result.suspiciousReasons.some(r => r.includes('Frequent IP changes'))).toBe(true);
    });

    it('should detect private IP addresses', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await ipTrackingService.recordIP('user-123', '192.168.1.1');
      
      expect(result.suspiciousReasons).toContain('Private/internal IP address');
    });

    it('should limit IP history to max count', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      
      // Create 11 IPs (max is 10)
      const manyIPs = Array.from({ length: 11 }, (_, i) => ({
        ip: `203.0.113.${i}`,
        firstSeen: Date.now() - (i * 10000),
        lastSeen: Date.now() - (i * 10000),
        count: 1,
        metadata: {}
      }));
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(manyIPs));
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await ipTrackingService.recordIP('user-123', '198.51.100.1');
      
      expect(result.totalKnownIPs).toBeLessThanOrEqual(10);
    });

    it('should use in-memory store when Redis not connected', async () => {
      ipTrackingService.isConnected = false;
      
      const result = await ipTrackingService.recordIP('user-123', '203.0.113.45');
      
      expect(result.isNewIP).toBe(true);
      expect(ipTrackingService.inMemoryStore.has('ip:history:user-123')).toBe(true);
    });

    it('should handle metadata', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const metadata = { country: 'US', city: 'New York' };
      await ipTrackingService.recordIP('user-123', '203.0.113.45', metadata);
      
      const setExCall = mockRedisClient.setEx.mock.calls[0];
      const storedData = JSON.parse(setExCall[2]);
      
      expect(storedData[0].metadata).toEqual(metadata);
    });

    it('should handle errors gracefully', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
      
      const result = await ipTrackingService.recordIP('user-123', '203.0.113.45');
      
      expect(result.error).toBeTruthy();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('countRecentIPChanges', () => {
    it('should count IPs from last 24 hours', () => {
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      const ipHistory = [
        { ip: '203.0.113.1', lastSeen: now - 1000 },
        { ip: '203.0.113.2', lastSeen: now - 60000 },
        { ip: '203.0.113.3', lastSeen: oneDayAgo - 1000 }, // Outside 24h window
      ];
      
      const count = ipTrackingService.countRecentIPChanges(ipHistory);
      
      expect(count).toBe(2);
    });

    it('should return 0 for empty history', () => {
      const count = ipTrackingService.countRecentIPChanges([]);
      expect(count).toBe(0);
    });
  });

  describe('isPrivateIP', () => {
    it('should detect 10.x.x.x range', () => {
      expect(ipTrackingService.isPrivateIP('10.0.0.1')).toBe(true);
      expect(ipTrackingService.isPrivateIP('10.255.255.255')).toBe(true);
    });

    it('should detect 172.16-31.x.x range', () => {
      expect(ipTrackingService.isPrivateIP('172.16.0.1')).toBe(true);
      expect(ipTrackingService.isPrivateIP('172.31.255.255')).toBe(true);
    });

    it('should detect 192.168.x.x range', () => {
      expect(ipTrackingService.isPrivateIP('192.168.0.1')).toBe(true);
      expect(ipTrackingService.isPrivateIP('192.168.255.255')).toBe(true);
    });

    it('should detect localhost 127.x.x.x', () => {
      expect(ipTrackingService.isPrivateIP('127.0.0.1')).toBe(true);
      expect(ipTrackingService.isPrivateIP('127.0.0.255')).toBe(true);
    });

    it('should detect link-local 169.254.x.x', () => {
      expect(ipTrackingService.isPrivateIP('169.254.1.1')).toBe(true);
    });

    it('should detect IPv6 localhost', () => {
      expect(ipTrackingService.isPrivateIP('::1')).toBe(true);
    });

    it('should detect IPv6 link-local', () => {
      expect(ipTrackingService.isPrivateIP('fe80::1')).toBe(true);
    });

    it('should detect IPv6 unique local', () => {
      expect(ipTrackingService.isPrivateIP('fc00::1')).toBe(true);
    });

    it('should return false for public IPs', () => {
      expect(ipTrackingService.isPrivateIP('8.8.8.8')).toBe(false);
      expect(ipTrackingService.isPrivateIP('203.0.113.1')).toBe(false);
      expect(ipTrackingService.isPrivateIP('198.51.100.1')).toBe(false);
    });
  });

  describe('getIPHistory', () => {
    it('should retrieve IP history from Redis', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      
      const history = [
        { ip: '203.0.113.45', lastSeen: Date.now(), count: 5 }
      ];
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(history));
      
      const result = await ipTrackingService.getIPHistory('user-123');
      
      expect(result).toEqual(history);
      expect(mockRedisClient.get).toHaveBeenCalledWith('ip:history:user-123');
    });

    it('should return empty array when no history exists', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await ipTrackingService.getIPHistory('user-123');
      
      expect(result).toEqual([]);
    });

    it('should use in-memory store when Redis not connected', async () => {
      ipTrackingService.isConnected = false;
      const history = [{ ip: '203.0.113.45', count: 1 }];
      ipTrackingService.inMemoryStore.set('ip:history:user-123', history);
      
      const result = await ipTrackingService.getIPHistory('user-123');
      
      expect(result).toEqual(history);
    });

    it('should handle errors gracefully', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
      
      const result = await ipTrackingService.getIPHistory('user-123');
      
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('isKnownIP', () => {
    it('should return true for known IP', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      
      const history = [
        { ip: '203.0.113.45', count: 5 },
        { ip: '198.51.100.1', count: 2 }
      ];
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(history));
      
      const result = await ipTrackingService.isKnownIP('user-123', '203.0.113.45');
      
      expect(result).toBe(true);
    });

    it('should return false for unknown IP', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      
      const history = [{ ip: '203.0.113.45', count: 5 }];
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(history));
      
      const result = await ipTrackingService.isKnownIP('user-123', '198.51.100.1');
      
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
      
      const result = await ipTrackingService.isKnownIP('user-123', '203.0.113.45');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('clearIPHistory', () => {
    it('should clear IP history from Redis', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      mockRedisClient.del.mockResolvedValue(1);
      
      const result = await ipTrackingService.clearIPHistory('user-123');
      
      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith('ip:history:user-123');
      expect(mockLogger.info).toHaveBeenCalledWith('IP history cleared', { userId: 'user-123' });
    });

    it('should clear from in-memory store when Redis not connected', async () => {
      ipTrackingService.isConnected = false;
      ipTrackingService.inMemoryStore.set('ip:history:user-123', []);
      
      const result = await ipTrackingService.clearIPHistory('user-123');
      
      expect(result).toBe(true);
      expect(ipTrackingService.inMemoryStore.has('ip:history:user-123')).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));
      
      const result = await ipTrackingService.clearIPHistory('user-123');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return statistics from Redis', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      
      mockRedisClient.keys.mockResolvedValue([
        'ip:history:user1',
        'ip:history:user2',
        'ip:history:user3'
      ]);
      
      const stats = await ipTrackingService.getStats();
      
      expect(stats.connected).toBe(true);
      expect(stats.totalUsers).toBe(3);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('ip:history:*');
    });

    it('should return in-memory stats when not connected', async () => {
      ipTrackingService.isConnected = false;
      ipTrackingService.inMemoryStore.set('key1', []);
      ipTrackingService.inMemoryStore.set('key2', []);
      
      const stats = await ipTrackingService.getStats();
      
      expect(stats.connected).toBe(false);
      expect(stats.inMemoryEntries).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));
      
      const stats = await ipTrackingService.getStats();
      
      expect(stats.error).toBeTruthy();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect Redis client when connected', async () => {
      ipTrackingService.isConnected = true;
      ipTrackingService.client = mockRedisClient;
      mockRedisClient.quit.mockResolvedValue('OK');
      
      await ipTrackingService.disconnect();
      
      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(ipTrackingService.isConnected).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('IP tracking Redis disconnected');
    });

    it('should not attempt disconnect when not connected', async () => {
      ipTrackingService.isConnected = false;
      ipTrackingService.client = null;
      
      await ipTrackingService.disconnect();
      
      expect(mockRedisClient.quit).not.toHaveBeenCalled();
    });
  });
});
