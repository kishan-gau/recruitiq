/**
 * Unit tests for TimeOffService
 * Tests time off request management with approval workflows
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock external dependencies first
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

const mockPool = {
  query: jest.fn(),
  connect: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock console.error to avoid test output noise
console.error = jest.fn();

// Mock modules using Jest's ES module mocking
jest.unstable_mockModule('../../../../../src/config/database.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('../../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../../../../../src/validators/dateValidators.js', () => ({
  dateOnlyRequired: expect.any(Object)
}));

// Import service after mocking
const { default: TimeOffService } = await import('../../../../../src/products/schedulehub/services/timeOffService.js');

describe('TimeOffService', () => {
  let service;

  // Helper function to create valid request data
  const createValidRequest = (overrides = {}) => ({
    workerId: '12345678-1234-1234-1234-123456789abc',
    requestType: 'vacation',
    startDate: '2024-03-01',
    endDate: '2024-03-05',
    isFullDay: true,
    totalDays: 5,
    reason: 'Family vacation',
    notes: 'Taking time off for family trip',
    ...overrides
  });

  // Helper function to create database time off request record
  const createDbRequest = (overrides = {}) => ({
    id: '87654321-4321-4321-4321-210987654321',
    organization_id: '11111111-1111-1111-1111-111111111111',
    employee_id: '12345678-1234-1234-1234-123456789abc',
    request_type: 'vacation',
    start_date: '2024-03-01',
    end_date: '2024-03-05',
    is_full_day: true,
    start_time: null,
    end_time: null,
    total_days: 5,
    reason: 'Family vacation',
    notes: 'Taking time off for family trip',
    status: 'pending',
    created_at: new Date('2024-01-15T10:00:00Z'),
    reviewed_by: null,
    reviewed_at: null,
    denial_reason: null,
    ...overrides
  });

  // Helper function to create database request with worker name
  const createDbRequestWithWorker = (overrides = {}) => ({
    ...createDbRequest(overrides),
    worker_name: 'John Doe'
  });

  beforeEach(() => {
    service = new TimeOffService();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock behaviors
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
    mockClient.release.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createRequest', () => {
    const organizationId = '11111111-1111-1111-1111-111111111111';
    const userId = '22222222-2222-2222-2222-222222222222';

    it('should create time off request successfully', async () => {
      const requestData = createValidRequest();
      const dbRequest = createDbRequest();
      
      // Mock successful transaction
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [dbRequest] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.createRequest(requestData, organizationId, userId);

      expect(result).toEqual({
        success: true,
        data: dbRequest
      });

      // Verify transaction flow
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.time_off_requests'),
        [
          organizationId,
          requestData.workerId,
          requestData.requestType,
          requestData.startDate,
          requestData.endDate,
          requestData.isFullDay,
          null, // startTime
          null, // endTime
          requestData.totalDays,
          requestData.reason,
          requestData.notes,
          'pending'
        ]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Time off request created',
        { requestId: dbRequest.id, organizationId }
      );
    });

    it('should handle partial day requests with start and end times', async () => {
      const requestData = createValidRequest({
        isFullDay: false,
        startTime: '09:00',
        endTime: '17:00',
        totalDays: 0.5
      });
      const dbRequest = createDbRequest({
        is_full_day: false,
        start_time: '09:00',
        end_time: '17:00',
        total_days: 0.5
      });
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [dbRequest] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.createRequest(requestData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.time_off_requests'),
        [
          organizationId,
          requestData.workerId,
          requestData.requestType,
          requestData.startDate,
          requestData.endDate,
          false, // isFullDay
          '09:00', // startTime
          '17:00', // endTime
          0.5, // totalDays
          requestData.reason,
          requestData.notes,
          'pending'
        ]
      );
    });

    it('should throw validation error for invalid worker ID', async () => {
      const requestData = createValidRequest({
        workerId: 'invalid-uuid'
      });

      await expect(
        service.createRequest(requestData, organizationId, userId)
      ).rejects.toThrow('Validation error');

      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should throw validation error for invalid request type', async () => {
      const requestData = createValidRequest({
        requestType: 'invalid-type'
      });

      await expect(
        service.createRequest(requestData, organizationId, userId)
      ).rejects.toThrow('Validation error');

      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should throw validation error when end date is before start date', async () => {
      const requestData = createValidRequest({
        startDate: '2024-03-05',
        endDate: '2024-03-01' // Before start date
      });

      await expect(
        service.createRequest(requestData, organizationId, userId)
      ).rejects.toThrow('End date must be on or after start date');

      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should throw validation error for partial day without time', async () => {
      const requestData = createValidRequest({
        isFullDay: false,
        startTime: undefined,
        endTime: undefined
      });

      await expect(
        service.createRequest(requestData, organizationId, userId)
      ).rejects.toThrow('Validation error');

      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should throw validation error for invalid time format', async () => {
      const requestData = createValidRequest({
        isFullDay: false,
        startTime: '25:00', // Invalid time
        endTime: '17:00'
      });

      await expect(
        service.createRequest(requestData, organizationId, userId)
      ).rejects.toThrow('Validation error');

      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should throw validation error for non-positive total days', async () => {
      const requestData = createValidRequest({
        totalDays: -1
      });

      await expect(
        service.createRequest(requestData, organizationId, userId)
      ).rejects.toThrow('Validation error');

      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should rollback transaction on database error', async () => {
      const requestData = createValidRequest();
      const error = new Error('Database error');
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(error); // INSERT fails

      await expect(
        service.createRequest(requestData, organizationId, userId)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating time off request:',
        error
      );
    });
  });

  describe('reviewRequest', () => {
    const requestId = '87654321-4321-4321-4321-210987654321';
    const organizationId = '11111111-1111-1111-1111-111111111111';
    const reviewerId = '22222222-2222-2222-2222-222222222222';

    it('should approve request successfully and create unavailability entries', async () => {
      const dbRequest = createDbRequest({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date('2024-01-15T12:00:00Z')
      });
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [dbRequest] }) // UPDATE request
        .mockResolvedValueOnce({ rows: [] }) // INSERT availability
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.reviewRequest(requestId, organizationId, true, reviewerId);

      expect(result).toEqual({
        success: true,
        data: dbRequest
      });

      // Verify request update
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scheduling.time_off_requests'),
        ['approved', reviewerId, null, requestId, organizationId]
      );

      // Verify unavailability creation
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.worker_availability'),
        [
          organizationId,
          dbRequest.employee_id,
          dbRequest.start_date,
          dbRequest.end_date,
          '00:00',
          '23:59',
          `Approved time off: ${dbRequest.request_type}`
        ]
      );

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Time off request reviewed',
        { requestId, approved: true, organizationId }
      );
    });

    it('should deny request successfully without creating unavailability', async () => {
      const denialReason = 'Insufficient coverage';
      const dbRequest = createDbRequest({
        status: 'denied',
        reviewed_by: reviewerId,
        reviewed_at: new Date('2024-01-15T12:00:00Z'),
        denial_reason: denialReason
      });
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [dbRequest] }) // UPDATE request
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.reviewRequest(requestId, organizationId, false, reviewerId, denialReason);

      expect(result).toEqual({
        success: true,
        data: dbRequest
      });

      // Verify request update with denial reason
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scheduling.time_off_requests'),
        ['denied', reviewerId, denialReason, requestId, organizationId]
      );

      // Should not create unavailability for denied requests
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.worker_availability'),
        expect.any(Array)
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Time off request reviewed',
        { requestId, approved: false, organizationId }
      );
    });

    it('should throw error when request not found or already reviewed', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // UPDATE returns no rows

      await expect(
        service.reviewRequest(requestId, organizationId, true, reviewerId)
      ).rejects.toThrow('Request not found or already reviewed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on database error during approval', async () => {
      const error = new Error('Database error');
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [createDbRequest()] }) // UPDATE request
        .mockRejectedValueOnce(error); // INSERT availability fails

      await expect(
        service.reviewRequest(requestId, organizationId, true, reviewerId)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error reviewing time off request:',
        error
      );
    });
  });

  describe('getWorkerRequests', () => {
    const workerId = '12345678-1234-1234-1234-123456789abc';
    const organizationId = '11111111-1111-1111-1111-111111111111';

    it('should get worker requests without filters', async () => {
      const requests = [
        createDbRequest(),
        createDbRequest({ id: '87654321-4321-4321-4321-210987654322' })
      ];
      
      mockPool.query.mockResolvedValue({ rows: requests });

      const result = await service.getWorkerRequests(workerId, organizationId);

      expect(result).toEqual({
        success: true,
        data: requests
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM scheduling.time_off_requests'),
        [workerId, organizationId]
      );
    });

    it('should get worker requests with status filter', async () => {
      const requests = [createDbRequest({ status: 'pending' })];
      mockPool.query.mockResolvedValue({ rows: requests });

      const filters = { status: 'pending' };
      const result = await service.getWorkerRequests(workerId, organizationId, filters);

      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND status = $3'),
        [workerId, organizationId, 'pending']
      );
    });

    it('should get worker requests with date range filters', async () => {
      const requests = [createDbRequest()];
      mockPool.query.mockResolvedValue({ rows: requests });

      const filters = {
        startDate: '2024-03-01',
        endDate: '2024-03-31'
      };
      const result = await service.getWorkerRequests(workerId, organizationId, filters);

      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND end_date >= $3 AND start_date <= $4'),
        [workerId, organizationId, '2024-03-01', '2024-03-31']
      );
    });

    it('should get worker requests with all filters', async () => {
      const requests = [createDbRequest()];
      mockPool.query.mockResolvedValue({ rows: requests });

      const filters = {
        status: 'approved',
        startDate: '2024-03-01',
        endDate: '2024-03-31'
      };
      const result = await service.getWorkerRequests(workerId, organizationId, filters);

      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND status = $3 AND end_date >= $4 AND start_date <= $5'),
        [workerId, organizationId, 'approved', '2024-03-01', '2024-03-31']
      );
    });

    it('should handle database error', async () => {
      const error = new Error('Database error');
      mockPool.query.mockRejectedValue(error);

      await expect(
        service.getWorkerRequests(workerId, organizationId)
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching worker requests:',
        error
      );
    });
  });

  describe('listRequests', () => {
    const organizationId = '11111111-1111-1111-1111-111111111111';

    it('should list all requests without filters', async () => {
      const requests = [
        createDbRequestWithWorker(),
        createDbRequestWithWorker({ id: '87654321-4321-4321-4321-210987654322' })
      ];
      
      mockPool.query.mockResolvedValue({ rows: requests });

      const result = await service.listRequests(organizationId);

      expect(result).toEqual({
        success: true,
        data: requests
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN hris.employee e ON r.employee_id = e.id'),
        [organizationId]
      );
    });

    it('should list requests with status filter', async () => {
      const requests = [createDbRequestWithWorker({ status: 'pending' })];
      mockPool.query.mockResolvedValue({ rows: requests });

      const result = await service.listRequests(organizationId, 'pending');

      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND r.status = $2'),
        [organizationId, 'pending']
      );
    });

    it('should list requests with date range filters', async () => {
      const requests = [createDbRequestWithWorker()];
      mockPool.query.mockResolvedValue({ rows: requests });

      const result = await service.listRequests(organizationId, null, '2024-03-01', '2024-03-31');

      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND r.end_date >= $2 AND r.start_date <= $3'),
        [organizationId, '2024-03-01', '2024-03-31']
      );
    });

    it('should list requests with all filters', async () => {
      const requests = [createDbRequestWithWorker()];
      mockPool.query.mockResolvedValue({ rows: requests });

      const result = await service.listRequests(organizationId, 'approved', '2024-03-01', '2024-03-31');

      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND r.status = $2 AND r.end_date >= $3 AND r.start_date <= $4'),
        [organizationId, 'approved', '2024-03-01', '2024-03-31']
      );
    });

    it('should handle database error', async () => {
      const error = new Error('Database error');
      mockPool.query.mockRejectedValue(error);

      await expect(
        service.listRequests(organizationId)
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error listing requests:',
        error
      );
    });
  });

  describe('getRequestById', () => {
    const requestId = '87654321-4321-4321-4321-210987654321';
    const organizationId = '11111111-1111-1111-1111-111111111111';

    it('should get request by ID successfully', async () => {
      const request = createDbRequestWithWorker();
      mockPool.query.mockResolvedValue({ rows: [request] });

      const result = await service.getRequestById(requestId, organizationId);

      expect(result).toEqual({
        success: true,
        data: request
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN hris.employee e ON r.employee_id = e.id'),
        [requestId, organizationId]
      );
    });

    it('should return error when request not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.getRequestById(requestId, organizationId);

      expect(result).toEqual({
        success: false,
        error: 'Request not found'
      });
    });

    it('should handle database error', async () => {
      const error = new Error('Database error');
      mockPool.query.mockRejectedValue(error);

      await expect(
        service.getRequestById(requestId, organizationId)
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching request by ID:',
        error
      );
    });
  });

  describe('getPendingRequests', () => {
    const organizationId = '11111111-1111-1111-1111-111111111111';

    it('should get pending requests successfully', async () => {
      const requests = [
        createDbRequestWithWorker({ status: 'pending' }),
        createDbRequestWithWorker({ 
          id: '87654321-4321-4321-4321-210987654322',
          status: 'pending' 
        })
      ];
      
      mockPool.query.mockResolvedValue({ rows: requests });

      const result = await service.getPendingRequests(organizationId);

      expect(result).toEqual({
        success: true,
        data: requests
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("r.status = 'pending'"),
        [organizationId]
      );
    });

    it('should return empty array when no pending requests', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.getPendingRequests(organizationId);

      expect(result).toEqual({
        success: true,
        data: []
      });
    });

    it('should handle database error', async () => {
      const error = new Error('Database error');
      mockPool.query.mockRejectedValue(error);

      await expect(
        service.getPendingRequests(organizationId)
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching pending requests:',
        error
      );
    });
  });

  describe('cancelRequest', () => {
    const requestId = '87654321-4321-4321-4321-210987654321';
    const organizationId = '11111111-1111-1111-1111-111111111111';
    const userId = '22222222-2222-2222-2222-222222222222';

    it('should cancel request successfully', async () => {
      const dbRequest = createDbRequest({ status: 'cancelled' });
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [dbRequest] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.cancelRequest(requestId, organizationId, userId);

      expect(result).toEqual({
        success: true,
        data: dbRequest
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scheduling.time_off_requests'),
        [requestId, organizationId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when request cannot be cancelled', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // UPDATE returns no rows

      await expect(
        service.cancelRequest(requestId, organizationId, userId)
      ).rejects.toThrow('Request not found or cannot be cancelled');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on database error', async () => {
      const error = new Error('Database error');
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(error); // UPDATE fails

      await expect(
        service.cancelRequest(requestId, organizationId, userId)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error cancelling request:',
        error
      );
    });
  });

  describe('constructor', () => {
    it('should initialize service with logger', () => {
      const newService = new TimeOffService();
      expect(newService.logger).toBe(mockLogger);
    });
  });

  describe('validation schema', () => {
    it('should have createRequestSchema with proper validation rules', () => {
      expect(service.createRequestSchema).toBeDefined();
      expect(typeof service.createRequestSchema.validate).toBe('function');
    });
  });
});