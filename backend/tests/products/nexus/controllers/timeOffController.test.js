/**
 * TimeOffController Tests
 * Tests for time-off management HTTP handlers
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Step 1: Create mock SERVICE as a CLASS (critical for ES6 class controllers)
class MockTimeOffService {
  createTimeOffRequest = jest.fn();
  reviewTimeOffRequest = jest.fn();
  cancelTimeOffRequest = jest.fn();
  getTimeOffRequests = jest.fn();
  getEmployeeTimeOffBalance = jest.fn();
  createTimeOffType = jest.fn();
  accrueTimeOff = jest.fn();
}

// Step 2: Mock the service module BEFORE importing controller
jest.unstable_mockModule('../../../../src/products/nexus/services/timeOffService.js', () => ({
  default: MockTimeOffService
}));

// Step 3: Mock logger
const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Step 4: Import controller AFTER mocking dependencies
const { default: TimeOffController } = await import('../../../../src/products/nexus/controllers/timeOffController.js');

describe('TimeOffController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create controller instance (instantiates MockTimeOffService)
    controller = new TimeOffController();

    // Mock request
    mockReq = {
      user: {
        organizationId: 'org-123',
        userId: 'user-456'
      },
      params: {},
      query: {},
      body: {}
    };

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('createRequest', () => {
    it('should create time-off request and return 201', async () => {
      const requestData = {
        employeeId: 'emp-123',
        type: 'vacation',
        startDate: '2025-12-01',
        endDate: '2025-12-05',
        reason: 'Holiday vacation'
      };
      const request = { id: 'req-123', ...requestData, status: 'pending' };

      mockReq.body = requestData;
      controller.service.createTimeOffRequest.mockResolvedValue(request);

      await controller.createRequest(mockReq, mockRes);

      expect(controller.service.createTimeOffRequest).toHaveBeenCalledWith(
        requestData,
        'org-123',
        'user-456'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: request
      });
    });

    it('should handle validation errors with 400', async () => {
      const error = new Error('Insufficient balance');
      mockReq.body = { type: 'vacation' };
      controller.service.createTimeOffRequest.mockRejectedValue(error);

      await controller.createRequest(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient balance'
      });
    });
  });

  describe('reviewRequest', () => {
    it('should approve time-off request', async () => {
      mockReq.params = { id: 'req-123' };
      mockReq.body = { 
        action: 'approve',
        comments: 'Approved for vacation'
      };
      const request = { 
        id: 'req-123', 
        status: 'approved',
        reviewedBy: 'user-456' 
      };
      controller.service.reviewTimeOffRequest.mockResolvedValue(request);

      await controller.reviewRequest(mockReq, mockRes);

      expect(controller.service.reviewTimeOffRequest).toHaveBeenCalledWith(
        'req-123',
        { action: 'approve', comments: 'Approved for vacation' },
        'org-123',
        'user-456'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: request
      });
    });

    it('should return 404 when request not found', async () => {
      mockReq.params = { id: 'req-999' };
      mockReq.body = { action: 'approve' };
      const error = new Error('Request not found');
      controller.service.reviewTimeOffRequest.mockRejectedValue(error);

      await controller.reviewRequest(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Request not found'
      });
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { id: 'req-123' };
      mockReq.body = { action: 'invalid' };
      const error = new Error('Invalid action');
      controller.service.reviewTimeOffRequest.mockRejectedValue(error);

      await controller.reviewRequest(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('cancelRequest', () => {
    it('should cancel time-off request', async () => {
      mockReq.params = { id: 'req-123' };
      const request = { 
        id: 'req-123', 
        status: 'cancelled',
        cancelledBy: 'user-456' 
      };
      controller.service.cancelTimeOffRequest.mockResolvedValue(request);

      await controller.cancelRequest(mockReq, mockRes);

      expect(controller.service.cancelTimeOffRequest).toHaveBeenCalledWith(
        'req-123',
        'org-123',
        'user-456'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: request
      });
    });

    it('should return 404 when request not found', async () => {
      mockReq.params = { id: 'req-999' };
      const error = new Error('Request not found');
      controller.service.cancelTimeOffRequest.mockRejectedValue(error);

      await controller.cancelRequest(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { id: 'req-123' };
      const error = new Error('Cannot cancel approved request');
      controller.service.cancelTimeOffRequest.mockRejectedValue(error);

      await controller.cancelRequest(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getRequests', () => {
    it('should get requests with default pagination', async () => {
      const requests = [
        { id: 'req-1', type: 'vacation', status: 'pending' },
        { id: 'req-2', type: 'sick', status: 'approved' }
      ];
      controller.service.getTimeOffRequests.mockResolvedValue(requests);

      await controller.getRequests(mockReq, mockRes);

      expect(controller.service.getTimeOffRequests).toHaveBeenCalledWith(
        {},
        'org-123',
        { limit: 50, offset: 0 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: requests
      });
    });

    it('should get requests with filters and custom pagination', async () => {
      mockReq.query = { 
        employeeId: 'emp-123',
        status: 'approved',
        startDate: '2025-11-01',
        endDate: '2025-11-30',
        limit: '20',
        offset: '10'
      };
      const requests = [{ id: 'req-1', employeeId: 'emp-123', status: 'approved' }];
      controller.service.getTimeOffRequests.mockResolvedValue(requests);

      await controller.getRequests(mockReq, mockRes);

      expect(controller.service.getTimeOffRequests).toHaveBeenCalledWith(
        { 
          employeeId: 'emp-123',
          status: 'approved',
          startDate: '2025-11-01',
          endDate: '2025-11-30'
        },
        'org-123',
        { limit: 20, offset: 10 }
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      controller.service.getTimeOffRequests.mockRejectedValue(error);

      await controller.getRequests(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getBalances', () => {
    it('should get employee time-off balances', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      const balances = {
        vacation: { total: 20, used: 5, remaining: 15 },
        sick: { total: 10, used: 2, remaining: 8 },
        personal: { total: 5, used: 0, remaining: 5 }
      };
      controller.service.getEmployeeTimeOffBalance.mockResolvedValue(balances);

      await controller.getBalances(mockReq, mockRes);

      expect(controller.service.getEmployeeTimeOffBalance).toHaveBeenCalledWith(
        'emp-123',
        'org-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: balances
      });
    });

    it('should handle errors', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      const error = new Error('Employee not found');
      controller.service.getEmployeeTimeOffBalance.mockRejectedValue(error);

      await controller.getBalances(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createType', () => {
    it('should create time-off type', async () => {
      const typeData = {
        name: 'Bereavement',
        category: 'personal',
        maxDays: 3,
        carryOverDays: 0
      };
      const type = { id: 'type-123', ...typeData };

      mockReq.body = typeData;
      controller.service.createTimeOffType.mockResolvedValue(type);

      await controller.createType(mockReq, mockRes);

      expect(controller.service.createTimeOffType).toHaveBeenCalledWith(
        typeData,
        'org-123',
        'user-456'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: type
      });
    });

    it('should handle validation errors', async () => {
      const error = new Error('Type name already exists');
      mockReq.body = { name: 'Vacation' };
      controller.service.createTimeOffType.mockRejectedValue(error);

      await controller.createType(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('accrueTimeOff', () => {
    it('should accrue time-off for employee', async () => {
      mockReq.body = {
        employeeId: 'emp-123',
        timeOffTypeId: 'type-456',
        daysAccrued: 1.67,
        accrualPeriod: 'monthly'
      };
      const accrual = { 
        id: 'acc-123',
        employeeId: 'emp-123',
        timeOffTypeId: 'type-456',
        daysAccrued: 1.67,
        newBalance: 21.67
      };
      controller.service.accrueTimeOff.mockResolvedValue(accrual);

      await controller.accrueTimeOff(mockReq, mockRes);

      expect(controller.service.accrueTimeOff).toHaveBeenCalledWith(
        'emp-123',
        'type-456',
        1.67,
        'monthly',
        'org-123',
        'user-456'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: accrual
      });
    });

    it('should return 400 when required fields are missing', async () => {
      mockReq.body = { employeeId: 'emp-123' }; // Missing required fields

      await controller.accrueTimeOff(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'employeeId, timeOffTypeId, and daysAccrued are required'
      });
      expect(controller.service.accrueTimeOff).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockReq.body = {
        employeeId: 'emp-123',
        timeOffTypeId: 'type-456',
        daysAccrued: 1.67
      };
      const error = new Error('Invalid accrual amount');
      controller.service.accrueTimeOff.mockRejectedValue(error);

      await controller.accrueTimeOff(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});