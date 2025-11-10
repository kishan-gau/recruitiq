/**
 * Worker Service Tests
 * Unit tests for WorkerService business logic
 */

import WorkerService from '../../../../src/products/schedulehub/services/workerService.js';
import pool from '../../../../src/config/database.js';
import { createMockWorker, createMockPool } from '../factories/testData.js';

describe('WorkerService', () => {
  let service;
  let mockPool;
  const organizationId = 'org-123';
  const userId = 'user-456';

  beforeEach(() => {
    service = new WorkerService();
    mockPool = createMockPool();
    pool.query = mockPool.query;
    jest.clearAllMocks();
  });

  describe('createWorker', () => {
    test('should create worker successfully', async () => {
      const workerData = {
        employeeId: 'emp-789',
        status: 'active',
        hireDate: '2024-01-01',
        employmentType: 'full_time',
        defaultHourlyRate: 25.00,
        maxHoursPerWeek: 40
      };

      const mockWorker = createMockWorker({
        employee_id: workerData.employeeId,
        organization_id: organizationId
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'emp-789' }] }) // Employee check
        .mockResolvedValueOnce({ rows: [] }) // Worker exists check
        .mockResolvedValueOnce({ rows: [mockWorker] }); // Insert worker

      const result = await service.createWorker(workerData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.employee_id).toBe(workerData.employeeId);
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    test('should fail if employee not found', async () => {
      const workerData = {
        employeeId: 'invalid-emp'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Employee not found

      await expect(
        service.createWorker(workerData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should fail if worker already exists', async () => {
      const workerData = {
        employeeId: 'emp-789'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'emp-789' }] }) // Employee exists
        .mockResolvedValueOnce({ rows: [{ id: 'worker-123' }] }); // Worker already exists

      await expect(
        service.createWorker(workerData, organizationId, userId)
      ).rejects.toThrow('already exists');
    });

    test('should validate required fields', async () => {
      const invalidData = {
        // Missing employeeId
        status: 'active'
      };

      await expect(
        service.createWorker(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate employment type enum', async () => {
      const invalidData = {
        employeeId: 'emp-789',
        employmentType: 'invalid_type'
      };

      await expect(
        service.createWorker(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });
  });

  describe('getWorkerById', () => {
    test('should return worker by ID', async () => {
      const mockWorker = createMockWorker({ organization_id: organizationId });

      mockPool.query.mockResolvedValueOnce({ rows: [mockWorker] });

      const result = await service.getWorkerById(mockWorker.id, organizationId);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockWorker.id);
    });

    test('should return error if worker not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getWorkerById('invalid-id', organizationId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('listWorkers', () => {
    test('should list workers with pagination', async () => {
      const mockWorkers = [
        createMockWorker(),
        createMockWorker(),
        createMockWorker()
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockWorkers }); // Data query

      const result = await service.listWorkers(organizationId, { page: 1, limit: 50 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 10,
        pages: 1
      });
    });

    test('should filter by status', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [createMockWorker()] });

      await service.listWorkers(organizationId, { status: 'active' });

      const queryCall = mockPool.query.mock.calls[1];
      expect(queryCall[0]).toContain('status =');
      expect(queryCall[1]).toContain('active');
    });

    test('should filter by department', async () => {
      const departmentId = 'dept-123';

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [createMockWorker()] });

      await service.listWorkers(organizationId, { departmentId });

      const queryCall = mockPool.query.mock.calls[1];
      expect(queryCall[0]).toContain('primary_department_id');
      expect(queryCall[1]).toContain(departmentId);
    });

    test('should search by name or email', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [createMockWorker()] });

      await service.listWorkers(organizationId, { search: 'john' });

      const queryCall = mockPool.query.mock.calls[1];
      expect(queryCall[0]).toContain('ILIKE');
    });
  });

  describe('updateWorker', () => {
    test('should update worker successfully', async () => {
      const workerId = 'worker-123';
      const updateData = {
        status: 'inactive',
        defaultHourlyRate: 30.00
      };

      const mockWorker = createMockWorker({
        id: workerId,
        ...updateData
      });

      mockPool.query.mockResolvedValueOnce({ rows: [mockWorker] });

      const result = await service.updateWorker(workerId, updateData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('inactive');
      expect(result.data.default_hourly_rate).toBe(30.00);
    });

    test('should validate status enum', async () => {
      const updateData = {
        status: 'invalid_status'
      };

      await expect(
        service.updateWorker('worker-123', updateData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should not allow updating terminated worker', async () => {
      const workerId = 'worker-123';
      mockPool.query.mockResolvedValueOnce({ 
        rows: [createMockWorker({ status: 'terminated' })] 
      });

      await expect(
        service.updateWorker(workerId, { status: 'active' }, organizationId, userId)
      ).rejects.toThrow('terminated');
    });
  });

  describe('terminateWorker', () => {
    test('should terminate worker and cancel future shifts', async () => {
      const workerId = 'worker-123';
      const terminationDate = '2024-12-31';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockWorker()] }) // Update worker
          .mockResolvedValueOnce({ rows: [] }) // Cancel shifts
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.terminateWorker(workerId, organizationId, terminationDate, userId);

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scheduling.shifts'),
        expect.anything()
      );
    });

    test('should rollback on error', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockRejectedValueOnce(new Error('Database error')),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      await expect(
        service.terminateWorker('worker-123', organizationId, '2024-12-31', userId)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getWorkerAvailabilitySummary', () => {
    test('should return availability for date range', async () => {
      const workerId = 'worker-123';
      const mockAvailability = [
        { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
        { day_of_week: 2, start_time: '09:00', end_time: '17:00' }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockAvailability });

      const result = await service.getWorkerAvailabilitySummary(
        workerId,
        organizationId,
        '2024-01-01',
        '2024-01-31'
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('getWorkerShiftHistory', () => {
    test('should return shift history with filters', async () => {
      const workerId = 'worker-123';
      const mockShifts = [
        createMockWorker({ worker_id: workerId, status: 'completed' }),
        createMockWorker({ worker_id: workerId, status: 'completed' })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockShifts });

      const result = await service.getWorkerShiftHistory(
        workerId,
        organizationId,
        { status: 'completed', limit: 50 }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test('should filter by date range', async () => {
      const workerId = 'worker-123';

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.getWorkerShiftHistory(
        workerId,
        organizationId,
        { startDate: '2024-01-01', endDate: '2024-01-31' }
      );

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('shift_date >=');
      expect(queryCall[0]).toContain('shift_date <=');
    });
  });
});
