/**
 * TimeOffService Unit Tests
 * Tests business logic for time-off request management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  query: mockQuery
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import service after mocks
const { default: TimeOffService } = await import('../../../../src/products/nexus/services/timeOffService.js');

describe('TimeOffService', () => {
  let service;
  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = 'user-123e4567-e89b-12d3-a456-426614174000';
  const mockEmployeeId = 'emp-123e4567-e89b-12d3-a456-426614174000';
  const mockRequestId = 'req-123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TimeOffService();
  });

  describe('createRequest', () => {
    it('should create a time-off request successfully', async () => {
      // Arrange
      const requestData = {
        employee_id: mockEmployeeId,
        time_off_type: 'vacation',
        start_date: '2025-12-01',
        end_date: '2025-12-05',
        total_days: 5,
        reason: 'Family vacation'
      };

      const mockCreatedRequest = {
        id: mockRequestId,
        organization_id: mockOrganizationId,
        employee_id: mockEmployeeId,
        time_off_type: 'vacation',
        start_date: '2025-12-01',
        end_date: '2025-12-05',
        total_days: 5,
        reason: 'Family vacation',
        status: 'pending',
        created_by: mockUserId,
        updated_by: mockUserId,
        created_at: new Date()
      };

      mockQuery.mockResolvedValue({
        rows: [mockCreatedRequest]
      });

      // Act
      const result = await service.createRequest(requestData, mockOrganizationId, mockUserId);

      // Assert
      expect(result).toEqual(mockCreatedRequest);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hris.time_off_request'),
        [
          mockOrganizationId,
          mockEmployeeId,
          'vacation',
          '2025-12-01',
          '2025-12-05',
          5,
          'Family vacation',
          'pending',
          mockUserId,
          mockUserId
        ],
        mockOrganizationId,
        {
          operation: 'create',
          table: 'hris.time_off_request'
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating time-off request',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Time-off request created successfully',
        expect.any(Object)
      );
    });

    it('should use default values when optional fields are missing', async () => {
      // Arrange
      const minimalRequestData = {
        employee_id: mockEmployeeId,
        start_date: '2025-12-01',
        end_date: '2025-12-01'
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: mockRequestId }]
      });

      // Act
      await service.createRequest(minimalRequestData, mockOrganizationId, mockUserId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [
          mockOrganizationId,
          mockEmployeeId,
          'vacation', // Default time_off_type
          '2025-12-01',
          '2025-12-01',
          1, // Default total_days
          null, // Default reason
          'pending',
          mockUserId,
          mockUserId
        ],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should throw and log error on database failure', async () => {
      // Arrange
      const requestData = {
        employee_id: mockEmployeeId,
        start_date: '2025-12-01',
        end_date: '2025-12-05'
      };

      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.createRequest(requestData, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating time-off request',
        expect.objectContaining({
          error: 'Database connection failed',
          organizationId: mockOrganizationId,
          userId: mockUserId
        })
      );
    });
  });

  describe('reviewRequest', () => {
    it('should approve a time-off request successfully', async () => {
      // Arrange
      const reviewerId = 'reviewer-123';
      const mockApprovedRequest = {
        id: mockRequestId,
        status: 'approved',
        approver_id: reviewerId,
        approved_at: new Date()
      };

      mockQuery.mockResolvedValue({
        rows: [mockApprovedRequest]
      });

      // Act
      const result = await service.reviewRequest(
        mockRequestId,
        'approved',
        reviewerId,
        mockOrganizationId,
        'Approved for vacation'
      );

      // Assert
      expect(result).toEqual(mockApprovedRequest);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE hris.time_off_request'),
        ['approved', reviewerId, 'Approved for vacation', mockRequestId, mockOrganizationId],
        mockOrganizationId,
        {
          operation: 'update',
          table: 'hris.time_off_request'
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Reviewing time-off request',
        expect.any(Object)
      );
    });

    it('should reject a time-off request with comments', async () => {
      // Arrange
      const reviewerId = 'reviewer-123';
      const mockRejectedRequest = {
        id: mockRequestId,
        status: 'rejected',
        approver_id: reviewerId,
        rejection_reason: 'Insufficient staffing'
      };

      mockQuery.mockResolvedValue({
        rows: [mockRejectedRequest]
      });

      // Act
      const result = await service.reviewRequest(
        mockRequestId,
        'rejected',
        reviewerId,
        mockOrganizationId,
        'Insufficient staffing'
      );

      // Assert
      expect(result).toEqual(mockRejectedRequest);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['rejected', reviewerId, 'Insufficient staffing', mockRequestId, mockOrganizationId],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should throw error when request not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        rows: []
      });

      // Act & Assert
      await expect(
        service.reviewRequest(mockRequestId, 'approved', 'reviewer-123', mockOrganizationId)
      ).rejects.toThrow(`Time-off request with ID ${mockRequestId} not found`);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getWorkerRequests', () => {
    it('should return all requests for a worker', async () => {
      // Arrange
      const mockRequests = [
        {
          id: 'req-1',
          employee_id: mockEmployeeId,
          status: 'approved',
          employee_name: 'John Doe',
          approver_name: 'Jane Manager'
        },
        {
          id: 'req-2',
          employee_id: mockEmployeeId,
          status: 'pending',
          employee_name: 'John Doe',
          approver_name: null
        }
      ];

      mockQuery.mockResolvedValue({
        rows: mockRequests
      });

      // Act
      const result = await service.getWorkerRequests(mockEmployeeId, mockOrganizationId);

      // Assert
      expect(result).toEqual(mockRequests);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT tr.*'),
        [mockEmployeeId, mockOrganizationId],
        mockOrganizationId,
        {
          operation: 'findAll',
          table: 'hris.time_off_request'
        }
      );
    });

    it('should filter requests by status', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await service.getWorkerRequests(mockEmployeeId, mockOrganizationId, { status: 'approved' });

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND tr.status = $3'),
        [mockEmployeeId, mockOrganizationId, 'approved'],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter requests by date range', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await service.getWorkerRequests(mockEmployeeId, mockOrganizationId, {
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      });

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND tr.start_date >= $3'),
        [mockEmployeeId, mockOrganizationId, '2025-01-01', '2025-12-31'],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Query timeout');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.getWorkerRequests(mockEmployeeId, mockOrganizationId)
      ).rejects.toThrow('Query timeout');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting worker time-off requests',
        expect.any(Object)
      );
    });
  });

  describe('getPendingRequests', () => {
    it('should return all pending requests for organization', async () => {
      // Arrange
      const mockPendingRequests = [
        {
          id: 'req-1',
          status: 'pending',
          employee_name: 'John Doe',
          department_name: 'Engineering'
        },
        {
          id: 'req-2',
          status: 'pending',
          employee_name: 'Jane Smith',
          department_name: 'Sales'
        }
      ];

      mockQuery.mockResolvedValue({
        rows: mockPendingRequests
      });

      // Act
      const result = await service.getPendingRequests(mockOrganizationId);

      // Assert
      expect(result).toEqual(mockPendingRequests);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE tr.organization_id = $1"),
        [mockOrganizationId],
        mockOrganizationId,
        {
          operation: 'findPending',
          table: 'hris.time_off_request'
        }
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("AND tr.status = 'pending'"),
        expect.any(Array),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should return empty array when no pending requests', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await service.getPendingRequests(mockOrganizationId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('cancelRequest', () => {
    it('should cancel a pending request successfully', async () => {
      // Arrange
      const mockCancelledRequest = {
        id: mockRequestId,
        status: 'cancelled',
        updated_by: mockUserId
      };

      mockQuery.mockResolvedValue({
        rows: [mockCancelledRequest]
      });

      // Act
      const result = await service.cancelRequest(mockRequestId, mockOrganizationId, mockUserId);

      // Assert
      expect(result).toEqual(mockCancelledRequest);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE hris.time_off_request'),
        [mockRequestId, mockOrganizationId, mockUserId],
        mockOrganizationId,
        {
          operation: 'update',
          table: 'hris.time_off_request'
        }
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("AND status = 'pending'"),
        expect.any(Array),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should throw error when request cannot be cancelled', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act & Assert
      await expect(
        service.cancelRequest(mockRequestId, mockOrganizationId, mockUserId)
      ).rejects.toThrow(`Time-off request with ID ${mockRequestId} not found or cannot be cancelled`);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getRequestById', () => {
    it('should return request with full details', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        employee_name: 'John Doe',
        employee_email: 'john.doe@company.com',
        department_name: 'Engineering',
        reviewer_name: 'Jane Manager',
        status: 'approved'
      };

      mockQuery.mockResolvedValue({
        rows: [mockRequest]
      });

      // Act
      const result = await service.getRequestById(mockRequestId, mockOrganizationId);

      // Assert
      expect(result).toEqual(mockRequest);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN hris.employee e ON tr.employee_id = e.id'),
        [mockRequestId, mockOrganizationId],
        mockOrganizationId,
        {
          operation: 'findById',
          table: 'hris.time_off_request'
        }
      );
    });

    it('should throw error when request not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act & Assert
      await expect(
        service.getRequestById(mockRequestId, mockOrganizationId)
      ).rejects.toThrow(`Time-off request with ID ${mockRequestId} not found`);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getTimeOffRequests', () => {
    it('should return paginated requests with total count', async () => {
      // Arrange
      const mockRequests = [
        { id: 'req-1', status: 'pending' },
        { id: 'req-2', status: 'approved' }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockRequests }) // First call: SELECT
        .mockResolvedValueOnce({ rows: [{ total: '10' }] }); // Second call: COUNT

      // Act
      const result = await service.getTimeOffRequests(
        {},
        mockOrganizationId,
        { limit: 20, offset: 0 }
      );

      // Assert
      expect(result).toEqual({
        requests: mockRequests,
        total: 10,
        limit: 20,
        offset: 0
      });
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should filter by status', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      // Act
      await service.getTimeOffRequests(
        { status: 'approved' },
        mockOrganizationId
      );

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('tr.status = $2'),
        expect.arrayContaining([mockOrganizationId, 'approved']),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by employee ID', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      // Act
      await service.getTimeOffRequests(
        { employeeId: mockEmployeeId },
        mockOrganizationId
      );

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('tr.employee_id = $2'),
        expect.arrayContaining([mockOrganizationId, mockEmployeeId]),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by date range', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      // Act
      await service.getTimeOffRequests(
        {
          startDate: '2025-01-01',
          endDate: '2025-12-31'
        },
        mockOrganizationId
      );

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('tr.start_date >= $2'),
        expect.arrayContaining([mockOrganizationId, '2025-01-01', '2025-12-31']),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should apply pagination limits', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '100' }] });

      // Act
      await service.getTimeOffRequests(
        {},
        mockOrganizationId,
        { limit: 10, offset: 20 }
      );

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10, 20]),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should use default pagination when not specified', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      // Act
      const result = await service.getTimeOffRequests({}, mockOrganizationId);

      // Assert
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });
  });
});
