/**
 * Nexus User Access Controller Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies before importing controller
const mockGrantSystemAccess = jest.fn();
const mockGetUserAccountStatus = jest.fn();
const mockRevokeSystemAccess = jest.fn();
const mockUpdateEmployeeAccess = jest.fn();

// Mock the EmployeeService class
class MockEmployeeService {
  grantSystemAccess = mockGrantSystemAccess;
  getUserAccountStatus = mockGetUserAccountStatus;
  revokeSystemAccess = mockRevokeSystemAccess;
  updateEmployeeAccess = mockUpdateEmployeeAccess;
}

jest.unstable_mockModule('../../../../src/products/nexus/services/employeeService.js', () => ({
  default: MockEmployeeService
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Import controller after mocks are set up
const { default: userAccessController } = await import('../../../../src/products/nexus/controllers/userAccessController.js');

describe('Nexus User Access Controller', () => {
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
    it('should grant system access successfully', async () => {
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
        mockOrganizationId,
        {
          email: 'employee@company.com',
          password: undefined,
          sendEmail: true
        },
        mockUserId
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'System access granted successfully',
        data: mockResult
      });
    });

    it('should handle duplicate user account errors', async () => {
      req.body = { email: 'employee@company.com' };
      
      const duplicateError = new Error('Employee already has user account');
      duplicateError.code = '23505'; // PostgreSQL unique violation
      mockGrantSystemAccess.mockRejectedValue(duplicateError);

      await userAccessController.grantAccess(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Employee already has user account'
      });
    });
  });

  describe('getUserAccount', () => {
    it('should return user account status', async () => {
      const mockUserAccount = {
        id: 'ua-001',
        email: 'employee@company.com',
        account_status: 'active',
        user_type: 'tenant',
        created_at: '2024-01-01T00:00:00Z',
        last_login: '2024-01-15T10:30:00Z'
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

    it('should return 404 when no account exists', async () => {
      mockGetUserAccountStatus.mockResolvedValue(null);

      await userAccessController.getUserAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No user account found for this employee'
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
        success: true,
        message: 'System access revoked successfully'
      });
    });

    it('should return 404 when account does not exist', async () => {
      const notFoundError = new Error('No user account not found for this employee');
      mockRevokeSystemAccess.mockRejectedValue(notFoundError);

      await userAccessController.revokeAccess(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No user account not found for this employee'
      });
    });
  });

  describe('updateAccess', () => {
    it('should update multiple fields successfully', async () => {
      const mockUpdatedAccount = {
        id: 'ua-001',
        email: 'newemail@company.com',
        account_status: 'inactive'
      };

      req.body = {
        email: 'newemail@company.com',
        status: 'inactive'
      };

      mockUpdateEmployeeAccess.mockResolvedValue(mockUpdatedAccount);

      await userAccessController.updateAccess(req, res);

      expect(mockUpdateEmployeeAccess).toHaveBeenCalledWith(
        mockEmployeeId,
        mockOrganizationId,
        {
          email: 'newemail@company.com',
          status: 'inactive'
        },
        mockUserId
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Access settings updated successfully',
        data: mockUpdatedAccount
      });
    });
  });
});
