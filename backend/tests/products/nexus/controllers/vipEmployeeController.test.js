/**
 * Tests for VIPEmployeeController
 * 
 * Controller Layer: HTTP request/response handling
 * Tests verify:
 * - Request parsing (params, query, body)
 * - Service method calls with correct arguments
 * - Response formatting with appropriate status codes
 * - Error handling
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock VIPEmployeeService BEFORE importing controller
class MockVIPEmployeeService {
  listVIPEmployees = jest.fn();
  getVIPCount = jest.fn();
  getVIPStatus = jest.fn();
  markAsVIP = jest.fn();
  updateAccessControl = jest.fn();
  removeVIPStatus = jest.fn();
  getAuditLog = jest.fn();
  checkAccess = jest.fn();
}

jest.unstable_mockModule('../../../../src/products/nexus/services/vipEmployeeService.js', () => ({
  default: MockVIPEmployeeService
}));

// Import controller AFTER mocking
const { default: VIPEmployeeController } = await import('../../../../src/products/nexus/controllers/vipEmployeeController.js');

describe('VIPEmployeeController', () => {
  let controller;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    controller = new VIPEmployeeController();
    
    mockReq = {
      user: {
        organizationId: 'org-123',
        id: 'user-123'
      },
      params: {},
      query: {},
      body: {},
      originalUrl: '/api/products/nexus/vip-employees',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0')
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('listVIPEmployees', () => {
    it('should list VIP employees successfully', async () => {
      const vipEmployees = [
        { id: 'emp-1', firstName: 'John', lastName: 'CEO', isVip: true, isRestricted: true },
        { id: 'emp-2', firstName: 'Jane', lastName: 'CFO', isVip: true, isRestricted: false }
      ];
      const pagination = { page: 1, limit: 20, total: 2, totalPages: 1 };

      controller.service.listVIPEmployees.mockResolvedValue({
        vipEmployees,
        pagination
      });

      await controller.listVIPEmployees(mockReq, mockRes, mockNext);

      expect(controller.service.listVIPEmployees).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          page: undefined,
          limit: undefined
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        vipEmployees,
        pagination
      });
    });

    it('should pass filters to service', async () => {
      mockReq.query = {
        search: 'John',
        isRestricted: 'true',
        restrictionLevel: 'executive',
        page: '2',
        limit: '10'
      };

      controller.service.listVIPEmployees.mockResolvedValue({
        vipEmployees: [],
        pagination: { page: 2, limit: 10, total: 0, totalPages: 0 }
      });

      await controller.listVIPEmployees(mockReq, mockRes, mockNext);

      expect(controller.service.listVIPEmployees).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          search: 'John',
          isRestricted: 'true',
          restrictionLevel: 'executive',
          page: '2',
          limit: '10'
        })
      );
    });

    it('should call next with error on failure', async () => {
      controller.service.listVIPEmployees.mockRejectedValue(
        new Error('Database error')
      );

      await controller.listVIPEmployees(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getVIPCount', () => {
    it('should return VIP employee counts', async () => {
      const count = { totalVip: 5, restricted: 3, unrestricted: 2 };

      controller.service.getVIPCount.mockResolvedValue(count);

      await controller.getVIPCount(mockReq, mockRes, mockNext);

      expect(controller.service.getVIPCount).toHaveBeenCalledWith('org-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count
      });
    });
  });

  describe('getVIPStatus', () => {
    it('should return VIP status for an employee', async () => {
      mockReq.params.employeeId = 'emp-123';

      const vipStatus = {
        employeeId: 'emp-123',
        isVip: true,
        isRestricted: true,
        restrictionLevel: 'financial',
        accessControl: {
          allowedUserIds: ['user-456'],
          restrictCompensation: true
        }
      };

      controller.service.getVIPStatus.mockResolvedValue(vipStatus);

      await controller.getVIPStatus(mockReq, mockRes, mockNext);

      expect(controller.service.getVIPStatus).toHaveBeenCalledWith(
        'emp-123',
        'org-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        vipStatus
      });
    });
  });

  describe('markAsVIP', () => {
    it('should mark employee as VIP successfully', async () => {
      mockReq.params.employeeId = 'emp-123';
      mockReq.body = {
        isVip: true,
        isRestricted: true,
        restrictionLevel: 'financial',
        restrictionReason: 'C-level executive'
      };

      const result = {
        id: 'emp-123',
        firstName: 'John',
        lastName: 'CEO',
        isVip: true,
        isRestricted: true,
        restrictionLevel: 'financial'
      };

      controller.service.markAsVIP.mockResolvedValue(result);

      await controller.markAsVIP(mockReq, mockRes, mockNext);

      expect(controller.service.markAsVIP).toHaveBeenCalledWith(
        'emp-123',
        mockReq.body,
        'org-123',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        vipEmployee: result,
        message: 'Employee marked as VIP successfully'
      });
    });
  });

  describe('updateVIPStatus', () => {
    it('should update VIP status successfully', async () => {
      mockReq.params.employeeId = 'emp-123';
      mockReq.body = {
        isVip: true,
        isRestricted: false
      };

      const result = {
        id: 'emp-123',
        isVip: true,
        isRestricted: false
      };

      controller.service.markAsVIP.mockResolvedValue(result);

      await controller.updateVIPStatus(mockReq, mockRes, mockNext);

      expect(controller.service.markAsVIP).toHaveBeenCalledWith(
        'emp-123',
        mockReq.body,
        'org-123',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        vipEmployee: result,
        message: 'VIP status updated successfully'
      });
    });
  });

  describe('updateAccessControl', () => {
    it('should update access control rules successfully', async () => {
      mockReq.params.employeeId = 'emp-123';
      mockReq.body = {
        allowedUserIds: ['user-456', 'user-789'],
        restrictCompensation: true,
        restrictPersonalInfo: true
      };

      const result = {
        id: 'ac-123',
        employeeId: 'emp-123',
        allowedUserIds: ['user-456', 'user-789'],
        restrictCompensation: true,
        restrictPersonalInfo: true
      };

      controller.service.updateAccessControl.mockResolvedValue(result);

      await controller.updateAccessControl(mockReq, mockRes, mockNext);

      expect(controller.service.updateAccessControl).toHaveBeenCalledWith(
        'emp-123',
        mockReq.body,
        'org-123',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        accessControl: result,
        message: 'Access control rules updated successfully'
      });
    });
  });

  describe('removeVIPStatus', () => {
    it('should remove VIP status successfully', async () => {
      mockReq.params.employeeId = 'emp-123';

      controller.service.removeVIPStatus.mockResolvedValue({});

      await controller.removeVIPStatus(mockReq, mockRes, mockNext);

      expect(controller.service.removeVIPStatus).toHaveBeenCalledWith(
        'emp-123',
        'org-123',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'VIP status removed successfully'
      });
    });
  });

  describe('getAuditLog', () => {
    it('should return audit log for VIP employee', async () => {
      mockReq.params.employeeId = 'emp-123';
      mockReq.query = {
        accessType: 'compensation',
        accessGranted: 'false',
        page: '1',
        limit: '50'
      };

      const logs = [
        { id: 'log-1', accessType: 'compensation', accessGranted: false, denialReason: 'Not authorized' }
      ];
      const pagination = { page: 1, limit: 50, total: 1, totalPages: 1 };

      controller.service.getAuditLog.mockResolvedValue({
        logs,
        pagination
      });

      await controller.getAuditLog(mockReq, mockRes, mockNext);

      expect(controller.service.getAuditLog).toHaveBeenCalledWith(
        'emp-123',
        'org-123',
        expect.objectContaining({
          accessType: 'compensation',
          accessGranted: 'false'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        auditLog: logs,
        pagination
      });
    });
  });

  describe('checkAccess', () => {
    it('should check access and return granted status', async () => {
      mockReq.params.employeeId = 'emp-123';
      mockReq.query = { accessType: 'compensation' };

      controller.service.checkAccess.mockResolvedValue({
        granted: true,
        reason: 'Authorized via access control rules'
      });

      await controller.checkAccess(mockReq, mockRes, mockNext);

      expect(controller.service.checkAccess).toHaveBeenCalledWith(
        'emp-123',
        'user-123',
        'org-123',
        'compensation',
        expect.objectContaining({
          endpoint: '/api/products/nexus/vip-employees',
          method: 'GET'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        access: {
          granted: true,
          reason: 'Authorized via access control rules'
        }
      });
    });

    it('should check access and return denied status', async () => {
      mockReq.params.employeeId = 'emp-123';

      controller.service.checkAccess.mockResolvedValue({
        granted: false,
        reason: 'User not in authorized list'
      });

      await controller.checkAccess(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        access: {
          granted: false,
          reason: 'User not in authorized list'
        }
      });
    });
  });
});
