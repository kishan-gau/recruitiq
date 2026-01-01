/**
 * Unit Tests for Password Reset Service
 * Tests token generation, validation, password reset flow, and cleanup
 */

import { jest } from '@jest/globals';

// Mock dependencies BEFORE importing
const mockPool = { query: jest.fn(), connect: jest.fn() };
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const mockCrypto = {
  randomBytes: jest.fn(),
  createHash: jest.fn(),
};
const mockBcrypt = { hash: jest.fn() };
const mockTokenBlacklist = { blacklistAllUserTokens: jest.fn() };

jest.unstable_mockModule('crypto', () => ({ default: mockCrypto }));
jest.unstable_mockModule('bcryptjs', () => ({ default: mockBcrypt }));
jest.unstable_mockModule('../../config/database', () => ({ 
  default: mockPool,
  query: mockPool.query,
  getClient: mockPool.connect,
  transaction: jest.fn(),
  healthCheck: jest.fn(),
  closePool: jest.fn()
}));
jest.unstable_mockModule('../../utils/logger', () => ({ default: mockLogger }));
jest.unstable_mockModule('../tokenBlacklist', () => ({ default: mockTokenBlacklist }));

let passwordResetService;
let mockClient;

beforeAll(async () => {
  passwordResetService = (await import('../passwordResetService')).default;
});

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Create mock client for database transactions
  mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  
  // Mock pool.connect to return mock client
  mockPool.connect.mockResolvedValue(mockClient);
});

describe('PasswordResetService', () => {
  describe('generateResetToken', () => {
    it('should generate a secure reset token with hash and expiry', () => {
      // Mock crypto.randomBytes
      const mockBuffer = Buffer.from('a'.repeat(64), 'hex');
      mockCrypto.randomBytes.mockReturnValue(mockBuffer);

      // Mock crypto.createHash
      const mockHashObj = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashedtoken123'),
      };
      mockCrypto.createHash.mockReturnValue(mockHashObj);

      const result = passwordResetService.generateResetToken();

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('hashedToken', 'hashedtoken123');
      expect(result).toHaveProperty('expiresAt');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should set expiry to 1 hour from now', () => {
      const mockBuffer = Buffer.from('a'.repeat(64), 'hex');
      mockCrypto.randomBytes.mockReturnValue(mockBuffer);

      const mockHashObj = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash'),
      };
      mockCrypto.createHash.mockReturnValue(mockHashObj);

      const before = Date.now();
      const result = passwordResetService.generateResetToken();
      const after = Date.now();

      const expectedExpiry = 60 * 60 * 1000; // 1 hour in ms
      const expiryTime = result.expiresAt.getTime() - before;

      expect(expiryTime).toBeGreaterThanOrEqual(expectedExpiry - 100);
      expect(expiryTime).toBeLessThanOrEqual(expectedExpiry + 100);
    });

    it('should throw error if token generation fails', () => {
      mockCrypto.randomBytes.mockImplementation(() => {
        throw new Error('Crypto error');
      });

      expect(() => passwordResetService.generateResetToken()).toThrow('Failed to generate reset token');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('hashToken', () => {
    it('should hash a token using SHA-256', () => {
      const mockHashObj = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashed123'),
      };
      mockCrypto.createHash.mockReturnValue(mockHashObj);

      const result = passwordResetService.hashToken('plaintoken');

      expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHashObj.update).toHaveBeenCalledWith('plaintoken');
      expect(mockHashObj.digest).toHaveBeenCalledWith('hex');
      expect(result).toBe('hashed123');
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate and store reset token for valid email', async () => {
      const mockBuffer = Buffer.from('a'.repeat(64), 'hex');
      mockCrypto.randomBytes.mockReturnValue(mockBuffer);

      const mockHashObj = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashedtoken'),
      };
      mockCrypto.createHash.mockReturnValue(mockHashObj);

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'user-123', email: 'test@example.com', name: 'Test User' }],
      }); // SELECT user
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // UPDATE (invalidate old)
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // UPDATE (new token)
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await passwordResetService.requestPasswordReset('test@example.com');

      expect(result.success).toBe(true);
      expect(result.emailFound).toBe(true);
      expect(result.token).toBeTruthy();
      expect(result.userId).toBe('user-123');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return success without revealing non-existent email', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT (no user found)
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await passwordResetService.requestPasswordReset('nonexistent@example.com');

      expect(result.success).toBe(true);
      expect(result.emailFound).toBe(false);
      expect(result.token).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('non-existent email')
      );
    });

    it('should convert email to lowercase', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      await passwordResetService.requestPasswordReset('TEST@EXAMPLE.COM');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test@example.com'])
      );
    });

    it('should rollback on error', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        passwordResetService.requestPasswordReset('test@example.com')
      ).rejects.toThrow('Failed to request password reset');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('verifyResetToken', () => {
    it('should verify valid non-expired token', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 min future

      const mockHashObj = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashedtoken'),
      };
      mockCrypto.createHash.mockReturnValue(mockHashObj);

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            password_reset_token: 'hashedtoken',
            password_reset_expires_at: futureDate,
          },
        ],
      });

      const result = await passwordResetService.verifyResetToken('plaintoken');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
    });

    it('should reject invalid token', async () => {
      const mockHashObj = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashedtoken'),
      };
      mockCrypto.createHash.mockReturnValue(mockHashObj);

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // No matching token

      const result = await passwordResetService.verifyResetToken('invalidtoken');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid or expired');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should reject expired token and clean it up', async () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago

      const mockHashObj = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashedtoken'),
      };
      mockCrypto.createHash.mockReturnValue(mockHashObj);

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            password_reset_token: 'hashedtoken',
            password_reset_expires_at: pastDate,
          },
        ],
      }); // SELECT
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // UPDATE cleanup

      const result = await passwordResetService.verifyResetToken('expiredtoken');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['user-123'],
        null,
        expect.any(Object)
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Expired password reset token')
      );
    });

    it('should throw error on database failure', async () => {
      const mockHashObj = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash'),
      };
      mockCrypto.createHash.mockReturnValue(mockHashObj);

      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        passwordResetService.verifyResetToken('token')
      ).rejects.toThrow('Failed to verify reset token');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);

      const mockHashObj = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashedtoken'),
      };
      mockCrypto.createHash.mockReturnValue(mockHashObj);

      // Mock verifyResetToken
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            password_reset_token: 'hashedtoken',
            password_reset_expires_at: futureDate,
          },
        ],
      });

      // Mock bcrypt hash
      mockBcrypt.hash.mockResolvedValue('$2a$12$newhash');

      // Mock transaction queries
      mockClient.query.mockResolvedValue({ rows: [] });

      // Mock token blacklist
      mockTokenBlacklist.blacklistAllUserTokens.mockResolvedValue();

      const result = await passwordResetService.resetPassword('validtoken', 'newPassword123!');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newPassword123!', 12);
      expect(mockTokenBlacklist.blacklistAllUserTokens).toHaveBeenCalledWith('user-123');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Password reset successful')
      );
    });

    it('should fail with invalid token', async () => {
      const mockHashObj = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash'),
      };
      mockCrypto.createHash.mockReturnValue(mockHashObj);

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // No token found

      const result = await passwordResetService.resetPassword('invalidtoken', 'newPassword');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired');
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);

      const mockHashObj = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash'),
      };
      mockCrypto.createHash.mockReturnValue(mockHashObj);

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test',
            password_reset_token: 'hash',
            password_reset_expires_at: futureDate,
          },
        ],
      });

      mockBcrypt.hash.mockResolvedValue('hash');
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        passwordResetService.resetPassword('token', 'password')
      ).rejects.toThrow('Failed to reset password');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should clean up expired tokens and return count', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 3,
        rows: [{ id: '1' }, { id: '2' }, { id: '3' }],
      });

      const count = await passwordResetService.cleanupExpiredTokens();

      expect(count).toBe(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('password_reset_expires_at < NOW()'),
        [],
        null,
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up 3 expired')
      );
    });

    it('should return 0 when no tokens to clean up', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0, rows: [] });

      const count = await passwordResetService.cleanupExpiredTokens();

      expect(count).toBe(0);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should return 0 on error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const count = await passwordResetService.cleanupExpiredTokens();

      expect(count).toBe(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('canRequestReset', () => {
    it('should allow reset request when no recent token exists', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await passwordResetService.canRequestReset('test@example.com');

      expect(result.canRequest).toBe(true);
      expect(result.waitTime).toBeUndefined();
    });

    it('should deny reset request when recent token exists', async () => {
      const futureDate = new Date(Date.now() + 45 * 60 * 1000); // 45 min future

      mockPool.query.mockResolvedValue({
        rows: [{ password_reset_expires_at: futureDate }],
      });

      const result = await passwordResetService.canRequestReset('test@example.com');

      expect(result.canRequest).toBe(false);
      expect(result.waitTime).toBeGreaterThan(40); // Should be ~45 minutes
      expect(result.message).toContain('wait');
    });

    it('should convert email to lowercase', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await passwordResetService.canRequestReset('TEST@EXAMPLE.COM');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test@example.com']),
        null,
        expect.any(Object)
      );
    });

    it('should fail open on error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const result = await passwordResetService.canRequestReset('test@example.com');

      expect(result.canRequest).toBe(true); // Fail open
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
