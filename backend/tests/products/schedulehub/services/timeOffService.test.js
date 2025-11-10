/**
 * Time Off Service Tests
 * Unit tests for TimeOffService business logic
 */

import TimeOffService from '../../../../src/products/schedulehub/services/timeOffService.js';
import pool from '../../../../src/config/database.js';
import { createMockTimeOffRequest, createMockWorker, createMockPool } from '../factories/testData.js';

describe('TimeOffService', () => {
  let service;
  let mockPool;
  const organizationId = 'org-123';
  const userId = 'user-456';

  beforeEach(() => {
    service = new TimeOffService();
    mockPool = createMockPool();
    pool.query = mockPool.query;
    jest.clearAllMocks();
  });

  describe('createRequest', () => {
    test('should create time off request successfully', async () => {
      const requestData = {
        workerId: 'worker-123',
        startDate: '2024-06-01',
        endDate: '2024-06-07',
        requestType: 'vacation',
        reason: 'Family vacation'
      };

      const mockRequest = createMockTimeOffRequest(requestData);
      mockPool.query.mockResolvedValueOnce({ rows: [mockRequest] });

      const result = await service.createRequest(requestData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('pending');
      expect(result.data.request_type).toBe('vacation');
    });

    test('should validate date range', async () => {
      const invalidData = {
        workerId: 'worker-123',
        startDate: '2024-06-07',
        endDate: '2024-06-01', // End before start
        requestType: 'vacation'
      };

      await expect(
        service.createRequest(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate request type enum', async () => {
      const invalidData = {
        workerId: 'worker-123',
        startDate: '2024-06-01',
        endDate: '2024-06-07',
        requestType: 'invalid_type'
      };

      await expect(
        service.createRequest(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate required fields', async () => {
      const invalidData = {
        workerId: 'worker-123'
        // Missing dates and type
      };

      await expect(
        service.createRequest(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });
  });

  describe('reviewRequest', () => {
    test('should approve request and create unavailability', async () => {
      const requestId = 'request-123';
      const mockRequest = createMockTimeOffRequest({
        id: requestId,
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockTimeOffRequest()] }) // Get request
          .mockResolvedValueOnce({ rows: [mockRequest] }) // Update request
          .mockResolvedValueOnce({ rows: [{}] }) // Create unavailability
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.reviewRequest(
        requestId,
        organizationId,
        'approved',
        userId,
        'Approved - sufficient coverage'
      );

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('approved');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.worker_availability'),
        expect.anything()
      );
    });

    test('should deny request without creating unavailability', async () => {
      const requestId = 'request-123';
      const mockRequest = createMockTimeOffRequest({
        id: requestId,
        status: 'denied'
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockTimeOffRequest()] }) // Get request
          .mockResolvedValueOnce({ rows: [mockRequest] }) // Update request
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.reviewRequest(
        requestId,
        organizationId,
        'denied',
        userId,
        'Insufficient coverage'
      );

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('denied');
      // Should not create unavailability for denied requests
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.worker_availability'),
        expect.anything()
      );
    });

    test('should not review already reviewed request', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockTimeOffRequest({ status: 'approved' })] }),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      await expect(
        service.reviewRequest('request-123', organizationId, 'approved', userId)
      ).rejects.toThrow('already reviewed');
    });

    test('should validate status enum', async () => {
      await expect(
        service.reviewRequest('request-123', organizationId, 'invalid_status', userId)
      ).rejects.toThrow();
    });
  });

  describe('getWorkerRequests', () => {
    test('should return worker requests with filters', async () => {
      const workerId = 'worker-123';
      const mockRequests = [
        createMockTimeOffRequest({ worker_id: workerId }),
        createMockTimeOffRequest({ worker_id: workerId })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRequests });

      const result = await service.getWorkerRequests(workerId, organizationId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test('should filter by status', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.getWorkerRequests('worker-123', organizationId, 'pending');

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('status =');
      expect(queryCall[1]).toContain('pending');
    });

    test('should filter by date range', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.getWorkerRequests(
        'worker-123',
        organizationId,
        null,
        '2024-06-01',
        '2024-06-30'
      );

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('start_date >=');
      expect(queryCall[0]).toContain('end_date <=');
    });
  });

  describe('getPendingRequests', () => {
    test('should return all pending requests for organization', async () => {
      const mockRequests = [
        createMockTimeOffRequest({ status: 'pending' }),
        createMockTimeOffRequest({ status: 'pending' }),
        createMockTimeOffRequest({ status: 'pending' })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRequests });

      const result = await service.getPendingRequests(organizationId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data.every(r => r.status === 'pending')).toBe(true);
    });
  });

  describe('cancelRequest', () => {
    test('should cancel pending request', async () => {
      const requestId = 'request-123';
      const mockRequest = createMockTimeOffRequest({
        id: requestId,
        status: 'cancelled'
      });

      mockPool.query.mockResolvedValueOnce({ rows: [mockRequest] });

      const result = await service.cancelRequest(requestId, organizationId);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('cancelled');
    });

    test('should cancel approved request and remove unavailability', async () => {
      const requestId = 'request-123';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockTimeOffRequest({ status: 'approved' })] }) // Get request
          .mockResolvedValueOnce({ rows: [createMockTimeOffRequest({ status: 'cancelled' })] }) // Update
          .mockResolvedValueOnce({ rows: [] }) // Delete unavailability
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.cancelRequest(requestId, organizationId);

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM scheduling.worker_availability'),
        expect.anything()
      );
    });

    test('should not cancel denied request', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [createMockTimeOffRequest({ status: 'denied' })] 
      });

      await expect(
        service.cancelRequest('request-123', organizationId)
      ).rejects.toThrow('Cannot cancel denied request');
    });

    test('should not cancel completed request', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [createMockTimeOffRequest({ 
          status: 'approved',
          end_date: '2024-01-01' // In the past
        })] 
      });

      await expect(
        service.cancelRequest('request-123', organizationId)
      ).rejects.toThrow('Cannot cancel completed time off');
    });
  });
});
