/**
 * Platform User Controller Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockHash = jest.fn();
const mockCompare = jest.fn();
const mockLoggerError = jest.fn();

jest.unstable_mockModule('../../../src/config/database.js', () => ({
  query: mockQuery
}));

jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    hash: mockHash,
    compare: mockCompare,
    hashSync: jest.fn(),
    compareSync: jest.fn()
  }
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: mockLoggerError,
    warn: jest.fn()
  }
}));

// Import controller after mocks
const { default: platformUserController } = await import('../../../src/controllers/platformUserController.js');

describe('Platform User Controller', () => {
  let req, res;
  const mockUserId = 'user-001';
  const mockPlatformUserId = 'platform-user-001';

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      params: {},
      body: {},
      query: {},
      user: {
        userId: mockUserId,
        role: 'super_admin'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockHash.mockResolvedValue('hashed_password');
  });

  describe('createPlatformUser', () => {
    it('should create a platform user successfully', async () => {
      const mockUser = {
        id: mockPlatformUserId,
        email: 'admin@platform.com',
        name: 'Platform Admin',
        user_type: 'platform',
        role: 'admin',
        is_active: true,
        phone: null,
        timezone: null,
        created_at: new Date()
      };

      req.body = {
        email: 'admin@platform.com',
        password: 'SecureP@ssw0rd123',
        name: 'Platform Admin',
        role: 'admin'
      };

      mockHash.mockResolvedValue('hashed_password');
      mockQuery.mockResolvedValueOnce({ rows: [] }) // Check duplicate
        .mockResolvedValueOnce({ rows: [mockUser] }); // Insert

      await platformUserController.createPlatformUser(req, res);

      expect(mockHash).toHaveBeenCalledWith('SecureP@ssw0rd123', 12);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Platform user created successfully',
        data: expect.objectContaining({
          email: 'admin@platform.com',
          name: 'Platform Admin'
        })
      });
    });

    it('should prevent duplicate email', async () => {
      req.body = {
        email: 'admin@platform.com',
        password: 'SecureP@ssw0rd123',
        name: 'Platform Admin',
        role: 'admin'
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] });

      await platformUserController.createPlatformUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email already exists'
      });
    });
  });

  describe('listPlatformUsers', () => {
    it('should list platform users with pagination', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'admin1@platform.com',
          name: 'Admin One',
          role: 'admin',
          user_type: 'platform',
          is_active: true
        }
      ];

      const mockCountResult = { rows: [{ total: '1' }] };
      const mockUsersResult = { rows: mockUsers };

      req.query = { limit: '10', offset: '0' };

      mockQuery.mockResolvedValueOnce(mockUsersResult)
        .mockResolvedValueOnce(mockCountResult);

      await platformUserController.listPlatformUsers(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        pagination: {
          limit: 10,
          offset: 0,
          total: 1
        }
      });
    });
  });

  describe('getPlatformUser', () => {
    it('should get platform user by ID', async () => {
      const mockUser = {
        id: mockPlatformUserId,
        email: 'admin@platform.com',
        full_name: 'Platform Admin',
        role: 'admin',
        status: 'active'
      };

      req.params.id = mockPlatformUserId;
      mockQuery.mockResolvedValue({ rows: [mockUser] });

      await platformUserController.getPlatformUser(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          email: 'admin@platform.com'
        })
      });
    });

    it('should return 404 for non-existent user', async () => {
      req.params.id = 'non-existent';
      mockQuery.mockResolvedValue({ rows: [] });

      await platformUserController.getPlatformUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Platform user not found'
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      req.params.id = mockPlatformUserId;
      req.body = { 
        currentPassword: 'OldP@ssw0rd123',
        newPassword: 'NewP@ssw0rd123' 
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ password_hash: 'old_hash' }] }) // Get user
        .mockResolvedValueOnce({ rows: [] }); // Update password

      mockCompare.mockResolvedValue(true); // Current password is valid
      mockHash.mockResolvedValue('new_hashed_password');

      await platformUserController.changePassword(req, res);

      expect(mockCompare).toHaveBeenCalledWith('OldP@ssw0rd123', 'old_hash');
      expect(mockHash).toHaveBeenCalledWith('NewP@ssw0rd123', 12);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully'
      });
    });
  });

  describe('deactivatePlatformUser', () => {
    it('should deactivate user successfully', async () => {
      const targetUserId = 'target-user-id'; // Different from mockUserId
      req.params.id = targetUserId;

      mockQuery.mockResolvedValue({ 
        rows: [{ 
          id: targetUserId,
          email: 'admin@platform.com',
          name: 'Platform Admin'
        }] 
      });

      await platformUserController.deactivatePlatformUser(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Platform user deactivated successfully'
      });
    });
  });

  describe('reactivatePlatformUser', () => {
    it('should reactivate user successfully', async () => {
      const targetUserId = 'target-user-id'; // Different from mockUserId
      req.params.id = targetUserId;

      mockQuery.mockResolvedValue({ 
        rows: [{ 
          id: targetUserId,
          email: 'admin@platform.com',
          name: 'Platform Admin'
        }] 
      });

      await platformUserController.reactivatePlatformUser(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Platform user reactivated successfully'
      });
    });
  });
});
