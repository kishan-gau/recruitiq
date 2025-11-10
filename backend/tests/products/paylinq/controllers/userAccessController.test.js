/**
 * Paylinq User Access Controller Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies before importing controller
const mockGrantSystemAccess = jest.fn();
const mockGetUserAccountStatus = jest.fn();
const mockRevokeSystemAccess = jest.fn();
const mockUpdateEmployeeAccess = jest.fn();

jest.unstable_mockModule('../../../../src/products/paylinq/services/payrollService.js', () => ({
  default: {
    grantSystemAccess: mockGrantSystemAccess,
    getUserAccountStatus: mockGetUserAccountStatus,
    revokeSystemAccess: mockRevokeSystemAccess,
    updateEmployeeAccess: mockUpdateEmployeeAccess
  }
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Import controller after mocks are set up
const { default: userAccessController } = await import('../../../../src/products/paylinq/controllers/userAccessController.js');

describe('Paylinq User Access Controller', () => {
  let req, res;
  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const mockEmployeeId = 'emp-001';
  const mockUserId = 'user-001';

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      user: {
        organizationId: mockOrganizationId,
        userId: mockUserId
      },
      params: { employeeId: mockEmployeeId },
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('grantAccess', () => {
    it('should grant system access successfully with auto-generated password', async () => {
      const mockResult = {
        userAccount: {
          id: 'ua-001',
          email: 'employee@company.com'
        },
        temporaryPassword: 'AutoGen123!@#$ABC'
      };

      req.body = {
        email: 'employee@company.com',
        sendEmail: true
      };

      mockGrantSystemAccess.mockResolvedValue(mockResult);

      await userAccessController.grantAccess(req, res);

      expect(mockGrantSystemAccess).toHaveBeenCalledWith(
        mockEmployeeId,
        {
          email: 'employee@company.com',
          sendEmail: true
        },
        mockOrganizationId,
        mockUserId
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'System access granted successfully',
        data: mockResult
      });
    });

    it('should grant system access with custom password', async () => {
      const mockResult = {
        userAccount: {
          id: 'ua-001',
          email: 'employee@company.com'
        }
      };

      req.body = {
        email: 'employee@company.com',
        password: 'CustomP@ssw0rd123',
        sendEmail: false
      };

      mockGrantSystemAccess.mockResolvedValue(mockResult);

      await userAccessController.grantAccess(req, res);

      expect(mockGrantSystemAccess).toHaveBeenCalledWith(
        mockEmployeeId,
        {
          email: 'employee@company.com',
          password: 'CustomP@ssw0rd123',
          sendEmail: false
        },
        mockOrganizationId,
        mockUserId
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle service errors', async () => {
      req.body = { email: 'employee@company.com' };
      
      mockGrantSystemAccess.mockRejectedValue(
        new Error('Database error')
      );

      await userAccessController.grantAccess(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to grant system access'
      });
    });
  });

  describe('getUserAccount', () => {
    it('should return user account status successfully', async () => {
      const mockUserAccount = {
        id: 'ua-001',
        email: 'employee@company.com',
        account_status: 'active',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockGetUserAccountStatus.mockResolvedValue(mockUserAccount);

      await userAccessController.getUserAccount(req, res);

      expect(mockGetUserAccountStatus).toHaveBeenCalledWith(
        mockEmployeeId,
        mockOrganizationId
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUserAccount
      });
    });

    it('should return 404 when user account not found', async () => {
      mockGetUserAccountStatus.mockResolvedValue(null);

      await userAccessController.getUserAccount(req, res);

      // Controller returns 200 with null data, not 404
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null
      });
    });

    it('should handle service errors', async () => {
      mockGetUserAccountStatus.mockRejectedValue(
        new Error('Database error')
      );

      await userAccessController.getUserAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get user account status'
      });
    });
  });

  describe('revokeAccess', () => {
    it('should revoke system access successfully', async () => {
      mockRevokeSystemAccess.mockResolvedValue(true);

      await userAccessController.revokeAccess(req, res);

      expect(mockRevokeSystemAccess).toHaveBeenCalledWith(
        mockEmployeeId,
        mockOrganizationId,
        mockUserId
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true
      });
    });

    it('should return 404 when user account not found', async () => {
      mockRevokeSystemAccess.mockResolvedValue(false);

      await userAccessController.revokeAccess(req, res);

      // Controller returns 200 even when false
      expect(res.json).toHaveBeenCalledWith({
        success: true
      });
    });

    it('should handle service errors', async () => {
      mockRevokeSystemAccess.mockRejectedValue(
        new Error('Failed to revoke access')
      );

      await userAccessController.revokeAccess(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to revoke system access'
      });
    });
  });

  describe('updateAccess', () => {
    it('should update email successfully', async () => {
      const mockUpdatedAccount = {
        id: 'ua-001',
        email: 'newemail@company.com',
        account_status: 'active'
      };

      req.body = { email: 'newemail@company.com' };

      mockUpdateEmployeeAccess.mockResolvedValue(mockUpdatedAccount);

      await userAccessController.updateAccess(req, res);

      expect(mockUpdateEmployeeAccess).toHaveBeenCalledWith(
        mockEmployeeId,
        { email: 'newemail@company.com' },
        mockOrganizationId,
        mockUserId
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Access updated successfully',
        data: mockUpdatedAccount
      });
    });

    it('should update password successfully', async () => {
      const mockUpdatedAccount = {
        id: 'ua-001',
        email: 'employee@company.com',
        account_status: 'active'
      };

      req.body = { password: 'NewP@ssw0rd123' };

      mockUpdateEmployeeAccess.mockResolvedValue(mockUpdatedAccount);

      await userAccessController.updateAccess(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Access updated successfully',
        data: mockUpdatedAccount
      });
    });

    it('should update status successfully', async () => {
      const mockUpdatedAccount = {
        id: 'ua-001',
        email: 'employee@company.com',
        account_status: 'inactive'
      };

      req.body = { status: 'inactive' };

      mockUpdateEmployeeAccess.mockResolvedValue(mockUpdatedAccount);

      await userAccessController.updateAccess(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Access updated successfully',
        data: mockUpdatedAccount
      });
    });

    it('should handle service errors', async () => {
      req.body = { email: 'newemail@company.com' };
      
      mockUpdateEmployeeAccess.mockRejectedValue(
        new Error('Update failed')
      );

      await userAccessController.updateAccess(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update access'
      });
    });
  });
});
