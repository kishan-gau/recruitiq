/**
 * Unit Tests for Token Blacklist Service
 * Tests Redis-based token blacklisting for logout and revocation
 */

import { jest } from '@jest/globals';

// Mock dependencies BEFORE importing
const mockRedisClient = {
  connect: jest.fn(),
  setEx: jest.fn(),
  get: jest.fn(),
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
let TokenBlacklistService;
let tokenBlacklistInstance;

beforeAll(async () => {
  // Import the class constructor before it's instantiated
  const module = await import('../tokenBlacklist');
  
  // We need to create a fresh instance for testing
  // The module exports a singleton, so we'll work with that
  tokenBlacklistInstance = module.default;
});

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Reset connection state
  tokenBlacklistInstance.isConnected = false;
  tokenBlacklistInstance.client = null;
});

describe('TokenBlacklistService', () => {
  describe('connect', () => {
    it('should establish Redis connection successfully', async () => {
      // Reset to allow fresh connection
      tokenBlacklistInstance.isConnected = false;
      tokenBlacklistInstance.client = null;
      
      mockRedisClient.connect.mockResolvedValue();
      
      await tokenBlacklistInstance.connect();
      
      expect(mockCreateClient).toHaveBeenCalled();
      expect(mockCreateClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
        password: 'testpassword',
        database: 0,
      });
    });

    it('should not reconnect if already connected', async () => {
      tokenBlacklistInstance.isConnected = true;
      
      await tokenBlacklistInstance.connect();
      
      expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));
      
      await tokenBlacklistInstance.connect();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect'),
        expect.any(Error)
      );
      expect(tokenBlacklistInstance.isConnected).toBe(false);
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist token successfully', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await tokenBlacklistInstance.blacklistToken('token123', 3600);
      
      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('blacklist:token123', 3600, '1');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Token blacklisted',
        expect.objectContaining({ tokenPrefix: 'token123', expiresIn: 3600 })
      );
    });

    it('should use default expiration of 7 days', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      await tokenBlacklistInstance.blacklistToken('token123');
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('blacklist:token123', 604800, '1');
    });

    it('should return false when Redis not connected', async () => {
      tokenBlacklistInstance.isConnected = false;
      
      const result = await tokenBlacklistInstance.blacklistToken('token123');
      
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Redis not connected, token blacklist unavailable'
      );
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));
      
      const result = await tokenBlacklistInstance.blacklistToken('token123');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to blacklist token:',
        expect.any(Error)
      );
    });
  });

  describe('isBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.get.mockResolvedValue('1');
      
      const result = await tokenBlacklistInstance.isBlacklisted('token123');
      
      expect(result).toBe(true);
      expect(mockRedisClient.get).toHaveBeenCalledWith('blacklist:token123');
    });

    it('should return false for non-blacklisted token', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await tokenBlacklistInstance.isBlacklisted('token123');
      
      expect(result).toBe(false);
    });

    it('should return false when Redis not connected (fail open)', async () => {
      tokenBlacklistInstance.isConnected = false;
      
      const result = await tokenBlacklistInstance.isBlacklisted('token123');
      
      expect(result).toBe(false);
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should return false on Redis errors (fail open)', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
      
      const result = await tokenBlacklistInstance.isBlacklisted('token123');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to check token blacklist:',
        expect.any(Error)
      );
    });
  });

  describe('blacklistUserTokens', () => {
    it('should blacklist all user tokens successfully', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const mockDate = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(mockDate);
      
      const result = await tokenBlacklistInstance.blacklistUserTokens('user-123', 7200);
      
      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'blacklist:user:user-123',
        7200,
        mockDate.toString()
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'All tokens blacklisted for user',
        { userId: 'user-123' }
      );
      
      jest.restoreAllMocks();
    });

    it('should use default expiration of 7 days', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      await tokenBlacklistInstance.blacklistUserTokens('user-123');
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'blacklist:user:user-123',
        604800,
        expect.any(String)
      );
    });

    it('should return false when Redis not connected', async () => {
      tokenBlacklistInstance.isConnected = false;
      
      const result = await tokenBlacklistInstance.blacklistUserTokens('user-123');
      
      expect(result).toBe(false);
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));
      
      const result = await tokenBlacklistInstance.blacklistUserTokens('user-123');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to blacklist user tokens:',
        expect.any(Error)
      );
    });
  });

  describe('areUserTokensBlacklisted', () => {
    it('should return true if token issued before blacklist time', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      
      const blacklistedAt = 2000000; // Blacklist timestamp (ms)
      const tokenIssuedAt = 1000000; // Token issued timestamp (should be in same units - ms)
      
      mockRedisClient.get.mockResolvedValue(blacklistedAt.toString());
      
      const result = await tokenBlacklistInstance.areUserTokensBlacklisted(
        'user-123',
        tokenIssuedAt
      );
      
      // tokenIssuedAt (1000000) < blacklistedAt (2000000) = true (token is blacklisted)
      expect(result).toBe(true);
      expect(mockRedisClient.get).toHaveBeenCalledWith('blacklist:user:user-123');
    });

    it('should return false if token issued after blacklist time', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      
      const blacklistedAt = 1000000; // Blacklist timestamp (ms)
      const tokenIssuedAt = 2000000; // Token issued after blacklist (ms)
      
      mockRedisClient.get.mockResolvedValue(blacklistedAt.toString());
      
      const result = await tokenBlacklistInstance.areUserTokensBlacklisted(
        'user-123',
        tokenIssuedAt
      );
      
      // tokenIssuedAt (2000000) > blacklistedAt (1000000) = false (token is still valid)
      expect(result).toBe(false);
    });

    it('should return false if no user blacklist exists', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await tokenBlacklistInstance.areUserTokensBlacklisted(
        'user-123',
        Date.now()
      );
      
      expect(result).toBe(false);
    });

    it('should return false when Redis not connected', async () => {
      tokenBlacklistInstance.isConnected = false;
      
      const result = await tokenBlacklistInstance.areUserTokensBlacklisted(
        'user-123',
        Date.now()
      );
      
      expect(result).toBe(false);
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should return false on Redis errors (fail open)', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
      
      const result = await tokenBlacklistInstance.areUserTokensBlacklisted(
        'user-123',
        Date.now()
      );
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to check user tokens blacklist:',
        expect.any(Error)
      );
    });
  });

  describe('removeFromBlacklist', () => {
    it('should remove token from blacklist successfully', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.del.mockResolvedValue(1);
      
      const result = await tokenBlacklistInstance.removeFromBlacklist('token123');
      
      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith('blacklist:token123');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Token removed from blacklist',
        { tokenPrefix: 'token123' }
      );
    });

    it('should return false when Redis not connected', async () => {
      tokenBlacklistInstance.isConnected = false;
      
      const result = await tokenBlacklistInstance.removeFromBlacklist('token123');
      
      expect(result).toBe(false);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));
      
      const result = await tokenBlacklistInstance.removeFromBlacklist('token123');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to remove token from blacklist:',
        expect.any(Error)
      );
    });
  });

  describe('disconnect', () => {
    it('should disconnect Redis client when connected', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.quit.mockResolvedValue('OK');
      
      await tokenBlacklistInstance.disconnect();
      
      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(tokenBlacklistInstance.isConnected).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Token blacklist Redis disconnected');
    });

    it('should not attempt disconnect when not connected', async () => {
      tokenBlacklistInstance.isConnected = false;
      tokenBlacklistInstance.client = null;
      
      await tokenBlacklistInstance.disconnect();
      
      expect(mockRedisClient.quit).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return statistics about blacklisted tokens', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      
      mockRedisClient.keys.mockResolvedValue([
        'blacklist:token1',
        'blacklist:token2',
        'blacklist:user:user1',
        'blacklist:user:user2',
        'blacklist:token3',
      ]);
      
      const stats = await tokenBlacklistInstance.getStats();
      
      expect(stats).toEqual({
        connected: true,
        totalBlacklisted: 5,
        userBlacklists: 2,
        tokenBlacklists: 3,
      });
      expect(mockRedisClient.keys).toHaveBeenCalledWith('blacklist:*');
    });

    it('should return not connected when Redis not available', async () => {
      tokenBlacklistInstance.isConnected = false;
      
      const stats = await tokenBlacklistInstance.getStats();
      
      expect(stats).toEqual({ connected: false });
      expect(mockRedisClient.keys).not.toHaveBeenCalled();
    });

    it('should return error message on Redis failure', async () => {
      tokenBlacklistInstance.isConnected = true;
      tokenBlacklistInstance.client = mockRedisClient;
      mockRedisClient.keys.mockRejectedValue(new Error('Redis keys error'));
      
      const stats = await tokenBlacklistInstance.getStats();
      
      expect(stats).toEqual({ error: 'Redis keys error' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get blacklist stats:',
        expect.any(Error)
      );
    });
  });
});
