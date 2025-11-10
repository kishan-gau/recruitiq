/**
 * Schedule Service Tests
 * Unit tests for ScheduleService business logic
 */

import ScheduleService from '../../../../src/products/schedulehub/services/scheduleService.js';
import pool from '../../../../src/config/database.js';
import { 
  createMockSchedule, 
  createMockShift, 
  createMockWorker,
  createMockPool 
} from '../factories/testData.js';

describe('ScheduleService', () => {
  let service;
  let mockPool;
  const organizationId = 'org-123';
  const userId = 'user-456';

  beforeEach(() => {
    service = new ScheduleService();
    mockPool = createMockPool();
    pool.query = mockPool.query;
    jest.clearAllMocks();
  });

  describe('createSchedule', () => {
    test('should create schedule successfully', async () => {
      const scheduleData = {
        name: 'Week of Jan 1-7',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        notes: 'Test schedule'
      };

      const mockSchedule = createMockSchedule(scheduleData);
      mockPool.query.mockResolvedValueOnce({ rows: [mockSchedule] });

      const result = await service.createSchedule(scheduleData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe(scheduleData.name);
      expect(result.data.status).toBe('draft');
    });

    test('should validate date range', async () => {
      const invalidData = {
        name: 'Test',
        startDate: '2024-01-07',
        endDate: '2024-01-01' // End before start
      };

      await expect(
        service.createSchedule(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate required fields', async () => {
      const invalidData = {
        name: 'Test'
        // Missing dates
      };

      await expect(
        service.createSchedule(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });
  });

  describe('createShift', () => {
    test('should create shift successfully', async () => {
      const shiftData = {
        scheduleId: 'schedule-123',
        shiftDate: '2024-01-01',
        startTime: '09:00',
        endTime: '17:00',
        roleId: 'role-123',
        stationId: 'station-123',
        workerId: 'worker-123',
        breakMinutes: 60
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockSchedule()] }) // Schedule check
          .mockResolvedValueOnce({ rows: [createMockWorker()] }) // Worker check
          .mockResolvedValueOnce({ rows: [{ available: true }] }) // Availability check
          .mockResolvedValueOnce({ rows: [createMockShift()] }) // Insert shift
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.createShift(shiftData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should validate time format', async () => {
      const invalidData = {
        scheduleId: 'schedule-123',
        shiftDate: '2024-01-01',
        startTime: '25:00', // Invalid hour
        endTime: '17:00'
      };

      await expect(
        service.createShift(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate start time before end time', async () => {
      const invalidData = {
        scheduleId: 'schedule-123',
        shiftDate: '2024-01-01',
        startTime: '17:00',
        endTime: '09:00' // End before start
      };

      await expect(
        service.createShift(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should fail if worker not available', async () => {
      const shiftData = {
        scheduleId: 'schedule-123',
        shiftDate: '2024-01-01',
        startTime: '09:00',
        endTime: '17:00',
        workerId: 'worker-123'
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockSchedule()] }) // Schedule exists
          .mockResolvedValueOnce({ rows: [createMockWorker()] }) // Worker exists
          .mockResolvedValueOnce({ rows: [{ available: false }] }), // Not available
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      await expect(
        service.createShift(shiftData, organizationId, userId)
      ).rejects.toThrow('not available');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('assignWorkerToShift', () => {
    test('should assign worker successfully', async () => {
      const shiftId = 'shift-123';
      const workerId = 'worker-123';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockShift({ worker_id: null })] }) // Get shift
          .mockResolvedValueOnce({ rows: [createMockWorker()] }) // Get worker
          .mockResolvedValueOnce({ rows: [{ available: true }] }) // Check availability
          .mockResolvedValueOnce({ rows: [createMockShift({ worker_id: workerId })] }) // Update
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.assignWorkerToShift(shiftId, workerId, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.worker_id).toBe(workerId);
    });

    test('should fail if shift already assigned', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockShift({ worker_id: 'other-worker' })] }),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      await expect(
        service.assignWorkerToShift('shift-123', 'worker-123', organizationId, userId)
      ).rejects.toThrow('already assigned');
    });
  });

  describe('publishSchedule', () => {
    test('should publish schedule successfully', async () => {
      const scheduleId = 'schedule-123';
      const mockSchedule = createMockSchedule({
        id: scheduleId,
        status: 'published',
        published_at: new Date().toISOString()
      });

      mockPool.query.mockResolvedValueOnce({ rows: [mockSchedule] });

      const result = await service.publishSchedule(scheduleId, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('published');
      expect(result.data.published_at).toBeDefined();
    });

    test('should not publish already published schedule', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [createMockSchedule({ status: 'published' })] 
      });

      await expect(
        service.publishSchedule('schedule-123', organizationId, userId)
      ).rejects.toThrow('already published');
    });
  });

  describe('clockIn', () => {
    test('should clock in worker successfully', async () => {
      const shiftId = 'shift-123';
      const mockShift = createMockShift({
        id: shiftId,
        status: 'confirmed',
        actual_clock_in: new Date().toISOString()
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [createMockShift({ status: 'confirmed' })] }) // Get shift
        .mockResolvedValueOnce({ rows: [mockShift] }); // Update shift

      const result = await service.clockIn(shiftId, organizationId);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('in_progress');
      expect(result.data.actual_clock_in).toBeDefined();
    });

    test('should fail if shift already started', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [createMockShift({ status: 'in_progress' })] 
      });

      await expect(
        service.clockIn('shift-123', organizationId)
      ).rejects.toThrow('already started');
    });

    test('should fail if shift is cancelled', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [createMockShift({ status: 'cancelled' })] 
      });

      await expect(
        service.clockIn('shift-123', organizationId)
      ).rejects.toThrow('cancelled');
    });
  });

  describe('cancelShift', () => {
    test('should cancel shift successfully', async () => {
      const shiftId = 'shift-123';
      const cancellationReason = 'Employee called in sick';

      mockPool.query.mockResolvedValueOnce({ 
        rows: [createMockShift({ 
          status: 'cancelled',
          cancellation_reason: cancellationReason 
        })] 
      });

      const result = await service.cancelShift(shiftId, organizationId, cancellationReason, userId);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('cancelled');
      expect(result.data.cancellation_reason).toBe(cancellationReason);
    });

    test('should not cancel completed shift', async () => {
      mockPool.query.mockResolvedValueOnce({ 
        rows: [createMockShift({ status: 'completed' })] 
      });

      await expect(
        service.cancelShift('shift-123', organizationId, 'Test reason', userId)
      ).rejects.toThrow('Cannot cancel completed shift');
    });
  });

  describe('getWorkerShifts', () => {
    test('should return worker shifts for date range', async () => {
      const workerId = 'worker-123';
      const mockShifts = [
        createMockShift({ worker_id: workerId }),
        createMockShift({ worker_id: workerId })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockShifts });

      const result = await service.getWorkerShifts(
        workerId,
        organizationId,
        '2024-01-01',
        '2024-01-31'
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test('should validate date range', async () => {
      await expect(
        service.getWorkerShifts('worker-123', organizationId, '2024-01-31', '2024-01-01')
      ).rejects.toThrow();
    });
  });
});
