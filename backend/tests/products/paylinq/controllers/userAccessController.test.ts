/**
 * User Access Controller Unit Tests
 * 
 * Tests for PayLinQ user access controller HTTP handlers.
 * Covers granting/revoking system access to employees.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Mock req/res objects
 * - Service layer mocking
 * - EXACT method names from controller (verified against source)
 * 
 * VERIFIED METHODS (from source analysis):
 * 1. grantAccess(req, res)
 * 2. getUserAccount(req, res)
 * 3. revokeAccess(req, res)
 * 4. updateAccess(req, res)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock service methods
const mockGrantSystemAccess = jest.fn();
const mockGetUserAccountStatus = jest.fn();
const mockRevokeSystemAccess = jest.fn();
const mockUpdateEmployeeAccess = jest.fn();

// Mock payroll service before importing controller
jest.unstable_mockModule('../../../../src/products/paylinq/services/payrollService.js', () => ({
  default: jest.fn().mockImplementation(() => ({
    grantSystemAccess: mockGrantSystemAccess,
    getUserAccountStatus: mockGetUserAccountStatus,
    revokeSystemAccess: mockRevokeSystemAccess,
    updateEmployeeAccess: mockUpdateEmployeeAccess
  }))
}));

// Mock logger to prevent console output during tests
jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Import controller after mocking dependencies
const userAccessControllerModule = await import('../../../../src/products/paylinq/controllers/userAccessController.js');
const userAccessController = userAccessControllerModule.default;

describe('User Access Controller', () => {
  let mockReq: any;
  let mockRes: any;

  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testEmployeeId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    // Setup: Create fresh mock request/response for each test
    mockReq = {
      user: {
        id: testUserId,
        userId: testUserId,
        organizationId: testOrgId,
        organization_id: testOrgId
      },
      params: {
        employeeId: testEmployeeId
      },
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Clear all mocks
    mockGrantSystemAccess.mockClear();
    mockGetUserAccountStatus.mockClear();
    mockRevokeSystemAccess.mockClear();
    mockUpdateEmployeeAccess.mockClear();
    mockRes.status.mockClear();
    mockRes.json.mockClear();
  });

  // ==================== grantAccess ====================

  describe('grantAccess', () => {
    it('should grant system access successfully', async () => {
      // Arrange
      const accessData = {
        email: 'employee@example.com',
        role: 'employee',
        permissions: ['view_payslip']
      };
      mockReq.body = accessData;
      
      const result = {
        userAccount: {
          id: 'user-account-id',
          email: 'employee@example.com'
        }
      };
      mockGrantSystemAccess.mockResolvedValue(result);

      // Act
      await userAccessController.grantAccess(mockReq, mockRes);

      // Assert
      expect(mockGrantSystemAccess).toHaveBeenCalledWith(
        testEmployeeId,
        accessData,
        testOrgId,
        testUserId
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'System access granted successfully',
        data: result
      });
    });

    it('should return 404 when employee not found', async () => {
      // Arrange
      mockReq.body = { email: 'test@example.com' };
      mockGrantSystemAccess.mockRejectedValue(new Error('Employee not found'));

      // Act
      await userAccessController.grantAccess(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Employee not found'
      });
    });

    it('should return 409 when employee already has access', async () => {
      // Arrange
      mockReq.body = { email: 'test@example.com' };
      mockGrantSystemAccess.mockRejectedValue(
        new Error('Employee already has system access')
      );

      // Act
      await userAccessController.grantAccess(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Employee already has system access'
      });
    });

    it('should return 400 when employee has no email', async () => {
      // Arrange
      mockReq.body = {};
      mockGrantSystemAccess.mockRejectedValue(
        new Error('Employee must have an email address')
      );

      // Act
      await userAccessController.grantAccess(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Employee must have an email address'
      });
    });

    it('should return 500 on unexpected error', async () => {
      // Arrange
      mockReq.body = { email: 'test@example.com' };
      mockGrantSystemAccess.mockRejectedValue(new Error('Database error'));

      // Act
      await userAccessController.grantAccess(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to grant system access'
      });
    });
  });

  // ==================== getUserAccount ====================

  describe('getUserAccount', () => {
    it('should return user account status', async () => {
      // Arrange
      const status = {
        hasAccess: true,
        email: 'employee@example.com',
        role: 'employee',
        isActive: true
      };
      mockGetUserAccountStatus.mockResolvedValue(status);

      // Act
      await userAccessController.getUserAccount(mockReq, mockRes);

      // Assert
      expect(mockGetUserAccountStatus).toHaveBeenCalledWith(
        testEmployeeId,
        testOrgId
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: status
      });
    });

    it('should return 404 when employee not found', async () => {
      // Arrange
      mockGetUserAccountStatus.mockRejectedValue(new Error('Employee not found'));

      // Act
      await userAccessController.getUserAccount(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Employee not found'
      });
    });

    it('should return 500 on unexpected error', async () => {
      // Arrange
      mockGetUserAccountStatus.mockRejectedValue(new Error('Service error'));

      // Act
      await userAccessController.getUserAccount(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get user account status'
      });
    });
  });

  // ==================== revokeAccess ====================

  describe('revokeAccess', () => {
    it('should revoke system access successfully', async () => {
      // Arrange
      const result = {
        message: 'System access revoked successfully'
      };
      mockRevokeSystemAccess.mockResolvedValue(result);

      // Act
      await userAccessController.revokeAccess(mockReq, mockRes);

      // Assert
      expect(mockRevokeSystemAccess).toHaveBeenCalledWith(
        testEmployeeId,
        testOrgId,
        testUserId
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: result.message
      });
    });

    it('should return 404 when employee not found', async () => {
      // Arrange
      mockRevokeSystemAccess.mockRejectedValue(new Error('Employee not found'));

      // Act
      await userAccessController.revokeAccess(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Employee not found'
      });
    });

    it('should return 500 on unexpected error', async () => {
      // Arrange
      mockRevokeSystemAccess.mockRejectedValue(new Error('Database error'));

      // Act
      await userAccessController.revokeAccess(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to revoke system access'
      });
    });
  });

  // ==================== updateAccess ====================

  describe('updateAccess', () => {
    it('should update employee access successfully', async () => {
      // Arrange
      const updates = {
        email: 'newemail@example.com',
        role: 'manager'
      };
      mockReq.body = updates;
      
      const result = {
        userAccountId: 'account-id',
        email: 'newemail@example.com',
        role: 'manager'
      };
      mockUpdateEmployeeAccess.mockResolvedValue(result);

      // Act
      await userAccessController.updateAccess(mockReq, mockRes);

      // Assert
      expect(mockUpdateEmployeeAccess).toHaveBeenCalledWith(
        testEmployeeId,
        updates,
        testOrgId,
        testUserId
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Access updated successfully',
        data: result
      });
    });

    it('should return 404 when employee not found', async () => {
      // Arrange
      mockReq.body = { email: 'test@example.com' };
      mockUpdateEmployeeAccess.mockRejectedValue(new Error('Employee not found'));

      // Act
      await userAccessController.updateAccess(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Employee not found'
      });
    });

    it('should return 400 for invalid email', async () => {
      // Arrange
      mockReq.body = { email: 'invalid-email' };
      mockUpdateEmployeeAccess.mockRejectedValue(new Error('Invalid email format'));

      // Act
      await userAccessController.updateAccess(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid email format'
      });
    });

    it('should return 400 when email already in use', async () => {
      // Arrange
      mockReq.body = { email: 'existing@example.com' };
      mockUpdateEmployeeAccess.mockRejectedValue(
        new Error('Email already in use by another user')
      );

      // Act
      await userAccessController.updateAccess(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email already in use by another user'
      });
    });

    it('should return 500 on unexpected error', async () => {
      // Arrange
      mockReq.body = { role: 'admin' };
      mockUpdateEmployeeAccess.mockRejectedValue(new Error('Database error'));

      // Act
      await userAccessController.updateAccess(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update access'
      });
    });
  });

  // ==================== Default Export ====================

  describe('default export', () => {
    it('should export all controller methods', () => {
      expect(userAccessController).toBeDefined();
      expect(userAccessController.grantAccess).toBeDefined();
      expect(userAccessController.getUserAccount).toBeDefined();
      expect(userAccessController.revokeAccess).toBeDefined();
      expect(userAccessController.updateAccess).toBeDefined();
    });

    it('should have all methods as functions', () => {
      expect(typeof userAccessController.grantAccess).toBe('function');
      expect(typeof userAccessController.getUserAccount).toBe('function');
      expect(typeof userAccessController.revokeAccess).toBe('function');
      expect(typeof userAccessController.updateAccess).toBe('function');
    });
  });
});
