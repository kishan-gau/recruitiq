/**
 * Availability Service Tests
 * Unit tests for AvailabilityService business logic
 */

import AvailabilityService from '../../../../src/products/schedulehub/services/availabilityService.js';
import pool from '../../../../src/config/database.js';
import { createMockAvailability, createMockWorker, createMockPool } from '../factories/testData.js';

describe('AvailabilityService', () => {
  let service;
  let mockPool;
  const organizationId = 'org-123';
  const userId = 'user-456';

  beforeEach(() => {
    service = new AvailabilityService();
    mockPool = createMockPool();
    pool.query = mockPool.query;
    jest.clearAllMocks();
  });

  describe('createAvailability', () => {
    test('should create recurring availability', async () => {
      const availabilityData = {
        workerId: 'worker-123',
        type: 'recurring',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        priority: 'available'
      };

      const mockAvailability = createMockAvailability(availabilityData);
      mockPool.query.mockResolvedValueOnce({ rows: [mockAvailability] });

      const result = await service.createAvailability(availabilityData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('recurring');
      expect(result.data.day_of_week).toBe(1);
    });

    test('should create one-time availability', async () => {
      const availabilityData = {
        workerId: 'worker-123',
        type: 'one_time',
        startDate: '2024-06-15',
        endDate: '2024-06-15',
        startTime: '09:00',
        endTime: '17:00',
        priority: 'available'
      };

      const mockAvailability = createMockAvailability({
        ...availabilityData,
        day_of_week: null
      });
      mockPool.query.mockResolvedValueOnce({ rows: [mockAvailability] });

      const result = await service.createAvailability(availabilityData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('one_time');
      expect(result.data.start_date).toBeDefined();
    });

    test('should validate recurring requires day of week', async () => {
      const invalidData = {
        workerId: 'worker-123',
        type: 'recurring',
        startTime: '09:00',
        endTime: '17:00'
        // Missing dayOfWeek
      };

      await expect(
        service.createAvailability(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate one-time requires dates', async () => {
      const invalidData = {
        workerId: 'worker-123',
        type: 'one_time',
        startTime: '09:00',
        endTime: '17:00'
        // Missing dates
      };

      await expect(
        service.createAvailability(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate time range', async () => {
      const invalidData = {
        workerId: 'worker-123',
        type: 'recurring',
        dayOfWeek: 1,
        startTime: '17:00',
        endTime: '09:00' // End before start
      };

      await expect(
        service.createAvailability(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate priority enum', async () => {
      const invalidData = {
        workerId: 'worker-123',
        type: 'recurring',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        priority: 'invalid_priority'
      };

      await expect(
        service.createAvailability(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });
  });

  describe('checkWorkerAvailable', () => {
    test('should return available if no conflicts', async () => {
      const workerId = 'worker-123';
      
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // No unavailable periods
        .mockResolvedValueOnce({ rows: [] }) // No one-time conflicts
        .mockResolvedValueOnce({ rows: [{ exists: true }] }); // Recurring available

      const result = await service.checkWorkerAvailable(
        workerId,
        organizationId,
        '2024-01-01', // Monday
        '09:00',
        '17:00'
      );

      expect(result.success).toBe(true);
      expect(result.available).toBe(true);
    });

    test('should return unavailable if blocked', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ reason: 'Time off approved' }] 
      });

      const result = await service.checkWorkerAvailable(
        'worker-123',
        organizationId,
        '2024-06-15',
        '09:00',
        '17:00'
      );

      expect(result.success).toBe(true);
      expect(result.available).toBe(false);
      expect(result.reason).toContain('Time off');
    });

    test('should prioritize one-time over recurring', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // No unavailable
        .mockResolvedValueOnce({ rows: [{ priority: 'preferred' }] }) // One-time available
        .mockResolvedValueOnce({ rows: [] }); // Skip recurring check

      const result = await service.checkWorkerAvailable(
        'worker-123',
        organizationId,
        '2024-06-15',
        '09:00',
        '17:00'
      );

      expect(result.success).toBe(true);
      expect(result.available).toBe(true);
      expect(mockPool.query).toHaveBeenCalledTimes(2); // Should not check recurring
    });
  });

  describe('getAvailableWorkers', () => {
    test('should return available workers for time slot', async () => {
      const mockWorkers = [
        createMockWorker(),
        createMockWorker()
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockWorkers });

      const result = await service.getAvailableWorkers(
        organizationId,
        '2024-01-01',
        '09:00',
        '17:00'
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test('should filter by role if provided', async () => {
      const roleId = 'role-123';
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.getAvailableWorkers(
        organizationId,
        '2024-01-01',
        '09:00',
        '17:00',
        roleId
      );

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('worker_roles');
      expect(queryCall[1]).toContain(roleId);
    });

    test('should exclude workers with shifts', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.getAvailableWorkers(
        organizationId,
        '2024-01-01',
        '09:00',
        '17:00'
      );

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('NOT EXISTS');
      expect(queryCall[0]).toContain('scheduling.shifts');
    });
  });

  describe('createDefaultAvailability', () => {
    test('should create Mon-Fri 9am-5pm availability', async () => {
      const workerId = 'worker-123';
      const mockAvailabilities = [
        createMockAvailability({ day_of_week: 1 }),
        createMockAvailability({ day_of_week: 2 }),
        createMockAvailability({ day_of_week: 3 }),
        createMockAvailability({ day_of_week: 4 }),
        createMockAvailability({ day_of_week: 5 })
      ];

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: mockAvailabilities }) // INSERT
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.createDefaultAvailability(workerId, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(5);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('updateAvailability', () => {
    test('should update availability successfully', async () => {
      const availabilityId = 'avail-123';
      const updateData = {
        startTime: '08:00',
        endTime: '16:00',
        priority: 'preferred'
      };

      const mockAvailability = createMockAvailability({
        id: availabilityId,
        ...updateData
      });

      mockPool.query.mockResolvedValueOnce({ rows: [mockAvailability] });

      const result = await service.updateAvailability(
        availabilityId,
        updateData,
        organizationId,
        userId
      );

      expect(result.success).toBe(true);
      expect(result.data.start_time).toBe('08:00');
      expect(result.data.priority).toBe('preferred');
    });
  });

  describe('deleteAvailability', () => {
    test('should delete availability successfully', async () => {
      const availabilityId = 'avail-123';

      mockPool.query.mockResolvedValueOnce({ rows: [{ id: availabilityId }] });

      const result = await service.deleteAvailability(availabilityId, organizationId);

      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM'),
        expect.anything()
      );
    });
  });

  describe('getWorkerAvailability', () => {
    test('should return worker availability with filters', async () => {
      const workerId = 'worker-123';
      const mockAvailabilities = [
        createMockAvailability({ worker_id: workerId, type: 'recurring' }),
        createMockAvailability({ worker_id: workerId, type: 'recurring' })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockAvailabilities });

      const result = await service.getWorkerAvailability(
        workerId,
        organizationId,
        { type: 'recurring' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test('should filter by day of week', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.getWorkerAvailability(
        'worker-123',
        organizationId,
        { dayOfWeek: 1 }
      );

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('day_of_week');
      expect(queryCall[1]).toContain(1);
    });
  });
});
