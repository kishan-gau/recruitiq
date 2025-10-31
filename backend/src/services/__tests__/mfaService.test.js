/**
 * MFA Service Unit Tests
 * Tests for Multi-Factor Authentication service
 */

const mfaService = require('../../services/mfaService');
const pool = require('../../config/database');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../utils/logger');

describe('MFA Service', () => {
  describe('generateSecret', () => {
    it('should generate a valid TOTP secret with QR code', async () => {
      const result = await mfaService.generateSecret('test@example.com');
      
      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('manualEntryKey');
      expect(result).toHaveProperty('otpauthUrl');
      
      // Secret should be base32 encoded
      expect(result.secret).toMatch(/^[A-Z2-7]+=*$/);
      
      // QR code should be data URL
      expect(result.qrCodeUrl).toMatch(/^data:image\/png;base64,/);
      
      // OTPAuth URL should contain email
      expect(result.otpauthUrl).toContain('test@example.com');
      expect(result.otpauthUrl).toContain('RecruitIQ');
    });

    it('should generate unique secrets for multiple calls', async () => {
      const result1 = await mfaService.generateSecret('user1@example.com');
      const result2 = await mfaService.generateSecret('user2@example.com');
      
      expect(result1.secret).not.toEqual(result2.secret);
    });
  });

  describe('verifyToken', () => {
    it('should accept valid TOTP token', () => {
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret({ length: 32 });
      
      // Generate valid token
      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });
      
      const result = mfaService.verifyToken(token, secret.base32);
      expect(result).toBe(true);
    });

    it('should reject invalid TOTP token', () => {
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret({ length: 32 });
      
      const result = mfaService.verifyToken('000000', secret.base32);
      expect(result).toBe(false);
    });

    it('should reject tokens with invalid format', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      
      expect(mfaService.verifyToken('12345', secret)).toBe(false); // Too short
      expect(mfaService.verifyToken('1234567', secret)).toBe(false); // Too long
      expect(mfaService.verifyToken('ABCDEF', secret)).toBe(false); // Non-numeric
    });

    it('should handle tokens with spaces', () => {
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret({ length: 32 });
      
      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });
      
      // Add spaces to token
      const tokenWithSpaces = token.substring(0, 3) + ' ' + token.substring(3);
      
      const result = mfaService.verifyToken(tokenWithSpaces, secret.base32);
      expect(result).toBe(true);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 8 backup codes by default', async () => {
      const result = await mfaService.generateBackupCodes();
      
      expect(result).toHaveProperty('codes');
      expect(result).toHaveProperty('hashedCodes');
      expect(result.codes).toHaveLength(8);
      expect(result.hashedCodes).toHaveLength(8);
    });

    it('should generate specified number of backup codes', async () => {
      const result = await mfaService.generateBackupCodes(10);
      
      expect(result.codes).toHaveLength(10);
      expect(result.hashedCodes).toHaveLength(10);
    });

    it('should generate unique codes', async () => {
      const result = await mfaService.generateBackupCodes();
      
      const uniqueCodes = new Set(result.codes);
      expect(uniqueCodes.size).toBe(result.codes.length);
    });

    it('should generate 8-character hexadecimal codes', async () => {
      const result = await mfaService.generateBackupCodes();
      
      result.codes.forEach(code => {
        expect(code).toMatch(/^[0-9A-F]{8}$/);
        expect(code).toHaveLength(8);
      });
    });

    it('should hash codes properly', async () => {
      const result = await mfaService.generateBackupCodes();
      
      // Verify each hashed code
      for (let i = 0; i < result.codes.length; i++) {
        const isMatch = await bcrypt.compare(result.codes[i], result.hashedCodes[i]);
        expect(isMatch).toBe(true);
      }
    });
  });

  describe('verifyBackupCode', () => {
    it('should accept valid backup code', async () => {
      const { codes, hashedCodes } = await mfaService.generateBackupCodes();
      
      // Test first code
      const index = await mfaService.verifyBackupCode(codes[0], hashedCodes);
      expect(index).toBe(0);
      
      // Test last code
      const lastIndex = await mfaService.verifyBackupCode(
        codes[codes.length - 1],
        hashedCodes
      );
      expect(lastIndex).toBe(codes.length - 1);
    });

    it('should reject invalid backup code', async () => {
      const { hashedCodes } = await mfaService.generateBackupCodes();
      
      const index = await mfaService.verifyBackupCode('FFFFFFFF', hashedCodes);
      expect(index).toBe(-1);
    });

    it('should handle codes with spaces', async () => {
      const { codes, hashedCodes } = await mfaService.generateBackupCodes();
      
      // Add spaces to code
      const codeWithSpaces = codes[0].substring(0, 4) + ' ' + codes[0].substring(4);
      
      const index = await mfaService.verifyBackupCode(codeWithSpaces, hashedCodes);
      expect(index).toBe(0);
    });

    it('should be case-insensitive', async () => {
      const { codes, hashedCodes } = await mfaService.generateBackupCodes();
      
      // Test lowercase
      const index = await mfaService.verifyBackupCode(
        codes[0].toLowerCase(),
        hashedCodes
      );
      expect(index).toBe(0);
    });
  });

  describe('enableMFA', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect = jest.fn().mockResolvedValue(mockClient);
    });

    it('should enable MFA with backup codes', async () => {
      const userId = 'test-user-id';
      const secret = 'JBSWY3DPEHPK3PXP';
      const hashedCodes = ['hash1', 'hash2', 'hash3'];

      await mfaService.enableMFA(userId, secret, hashedCodes);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([secret, hashedCodes, userId])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        mfaService.enableMFA('user-id', 'secret', [])
      ).rejects.toThrow('Failed to enable MFA');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('disableMFA', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect = jest.fn().mockResolvedValue(mockClient);
    });

    it('should disable MFA and clear MFA data', async () => {
      const userId = 'test-user-id';

      await mfaService.disableMFA(userId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [userId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        mfaService.disableMFA('user-id')
      ).rejects.toThrow('Failed to disable MFA');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getMFAStatus', () => {
    beforeEach(() => {
      pool.query = jest.fn();
    });

    it('should return MFA status with backup codes count', async () => {
      const mockUser = {
        mfa_enabled: true,
        mfa_backup_codes: ['hash1', 'hash2', 'hash3', 'hash4', 'hash5'],
        mfa_backup_codes_used: 2,
        mfa_enabled_at: new Date(),
      };

      pool.query.mockResolvedValue({ rows: [mockUser] });

      const status = await mfaService.getMFAStatus('user-id');

      expect(status).toEqual({
        enabled: true,
        backupCodesRemaining: 5,
        backupCodesUsed: 2,
        enabledAt: mockUser.mfa_enabled_at,
      });
    });

    it('should handle MFA not enabled', async () => {
      const mockUser = {
        mfa_enabled: false,
        mfa_backup_codes: null,
        mfa_backup_codes_used: 0,
        mfa_enabled_at: null,
      };

      pool.query.mockResolvedValue({ rows: [mockUser] });

      const status = await mfaService.getMFAStatus('user-id');

      expect(status).toEqual({
        enabled: false,
        backupCodesRemaining: 0,
        backupCodesUsed: 0,
        enabledAt: null,
      });
    });

    it('should throw error if user not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(
        mfaService.getMFAStatus('non-existent-user')
      ).rejects.toThrow('Failed to get MFA status');
    });
  });

  describe('checkMFARequired', () => {
    beforeEach(() => {
      pool.query = jest.fn();
    });

    it('should return MFA status for user', async () => {
      const mockUser = {
        mfa_enabled: true,
        mfa_secret: 'JBSWY3DPEHPK3PXP',
      };

      pool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await mfaService.checkMFARequired('user-id');

      expect(result).toEqual({
        mfaEnabled: true,
        mfaSecret: 'JBSWY3DPEHPK3PXP',
      });
    });

    it('should return false if user not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await mfaService.checkMFARequired('user-id');

      expect(result).toEqual({
        mfaEnabled: false,
        mfaSecret: null,
      });
    });
  });

  describe('markBackupCodeUsed', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect = jest.fn().mockResolvedValue(mockClient);
    });

    it('should remove used backup code from array', async () => {
      await mfaService.markBackupCodeUsed('user-id', 2);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('array_remove'),
        [3, 'user-id'] // PostgreSQL arrays are 1-indexed
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('regenerateBackupCodes', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect = jest.fn().mockResolvedValue(mockClient);
    });

    it('should generate and store new backup codes', async () => {
      const newCodes = await mfaService.regenerateBackupCodes('user-id');

      expect(newCodes).toHaveLength(8);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});
