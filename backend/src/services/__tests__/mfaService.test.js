/**
 * Unit Tests for MFA Service
 * Tests TOTP generation, verification, backup codes, and MFA management
 */

import { jest } from '@jest/globals';

// Mock dependencies BEFORE importing
const mockPool = { query: jest.fn(), connect: jest.fn() };
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const mockSpeakeasy = { generateSecret: jest.fn(), totp: { verify: jest.fn() } };
const mockQRCode = { toDataURL: jest.fn() };
const mockCrypto = { randomBytes: jest.fn() };
const mockBcrypt = { hash: jest.fn(), compare: jest.fn() };

jest.unstable_mockModule('speakeasy', () => ({ default: mockSpeakeasy }));
jest.unstable_mockModule('qrcode', () => ({ default: mockQRCode }));
jest.unstable_mockModule('crypto', () => ({ default: mockCrypto }));
jest.unstable_mockModule('bcryptjs', () => ({ default: mockBcrypt }));
jest.unstable_mockModule('../../config/database.js', () => ({ default: mockPool }));
jest.unstable_mockModule('../../utils/logger.js', () => ({ default: mockLogger }));

let mfaService;
let mockClient;

beforeAll(async () => {
  mfaService = (await import('../../services/mfaService.js')).default;
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

describe('MFAService', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('generateSecret', () => {
    it('should generate MFA secret with QR code', async () => {
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/RecruitIQ:test@example.com?secret=JBSWY3DPEHPK3PXP',
      };
      mockSpeakeasy.generateSecret.mockReturnValue(mockSecret);
      mockQRCode.toDataURL.mockResolvedValue('data:image/png;base64,iVBORw0KG...');

      const result = await mfaService.generateSecret('test@example.com');

      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.qrCodeUrl).toBe('data:image/png;base64,iVBORw0KG...');
    });

    it('should handle QR generation errors', async () => {
      mockSpeakeasy.generateSecret.mockReturnValue({ base32: 'SECRET', otpauth_url: 'url' });
      mockQRCode.toDataURL.mockRejectedValue(new Error('QR failed'));
      await expect(mfaService.generateSecret('test@example.com')).rejects.toThrow('Failed to generate MFA secret');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid TOTP token', () => {
      mockSpeakeasy.totp.verify.mockReturnValue(true);
      expect(mfaService.verifyToken('123456', 'SECRET')).toBe(true);
    });

    it('should reject invalid TOTP token', () => {
      mockSpeakeasy.totp.verify.mockReturnValue(false);
      expect(mfaService.verifyToken('000000', 'SECRET')).toBe(false);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 8 backup codes', async () => {
      mockCrypto.randomBytes.mockImplementation(() => Buffer.from('aaaa', 'hex'));
      mockBcrypt.hash.mockResolvedValue('$2a$10$hash');

      const result = await mfaService.generateBackupCodes();

      expect(result.codes).toHaveLength(8);
      expect(result.hashedCodes).toHaveLength(8);
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify valid backup code', async () => {
      mockBcrypt.compare.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const result = await mfaService.verifyBackupCode('CODE123', ['hash1', 'hash2']);
      expect(result).toBe(1); // Returns index of matched code
    });

    it('should reject invalid backup code', async () => {
      mockBcrypt.compare.mockResolvedValue(false);
      const result = await mfaService.verifyBackupCode('INVALID', ['hash1']);
      expect(result).toBe(-1); // Returns -1 for no match
    });
  });

  describe('enableMFA', () => {
    it('should enable MFA for user', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });
      await mfaService.enableMFA('user-123', 'SECRET', ['hash1']);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getMFAStatus', () => {
    it('should return MFA status', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ mfa_enabled: true, mfa_backup_codes: ['hash1', 'hash2'], mfa_backup_codes_used: 0 }],
      });
      const status = await mfaService.getMFAStatus('user-id');
      expect(status.enabled).toBe(true);
    });

    it('should throw if user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      // The actual service throws "Failed to get MFA status" when user not found
      await expect(mfaService.getMFAStatus('none')).rejects.toThrow('Failed to get MFA status');
    });
  });

  describe('checkMFARequired', () => {
    it('should return MFA requirement status', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ mfa_enabled: true, mfa_secret: 'SECRET' }],
      });
      const result = await mfaService.checkMFARequired('user-123');
      expect(result.mfaEnabled).toBe(true);
    });
  });

  describe('disableMFA', () => {
    it('should disable MFA for user', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });
      await mfaService.disableMFA('user-123');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('markBackupCodeUsed', () => {
    it('should mark backup code as used', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });
      await mfaService.markBackupCodeUsed('user-123', 1);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should regenerate backup codes', async () => {
      mockCrypto.randomBytes.mockImplementation(() => Buffer.from('bbbb', 'hex'));
      mockBcrypt.hash.mockResolvedValue('$2a$10$newhash');
      mockClient.query.mockResolvedValue({ rows: [] });

      const codes = await mfaService.regenerateBackupCodes('user-123');
      expect(codes).toHaveLength(8); // Method returns array of codes directly
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
