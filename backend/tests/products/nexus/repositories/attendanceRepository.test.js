/**
 * AttendanceRepository Tests
 * Unit tests for attendance repository
 */

import AttendanceRepository from '../../../../src/products/nexus/repositories/attendanceRepository.js';
import pool from '../../../../src/config/database.js';

describe('AttendanceRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new AttendanceRepository();
  });

  describe('clockIn', () => {
    it('should create a clock-in record', async () => {
      const mockAttendance = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employee_id: '123e4567-e89b-12d3-a456-426614174001',
        clock_in: '2024-01-15T09:00:00Z',
        location: 'Office HQ',
        ip_address: '192.168.1.100',
        notes: 'Regular clock in',
        organization_id: '123e4567-e89b-12d3-a456-426614174002',
        created_at: '2024-01-15T09:00:00Z'
      };

      db.query.mockResolvedValue({ rows: [mockAttendance] });

      const data = {
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T09:00:00Z',
        location: 'Office HQ',
        ipAddress: '192.168.1.100',
        notes: 'Regular clock in'
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await repository.clockIn(data, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hris.attendance'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('employeeId', data.employeeId);
      expect(result).toHaveProperty('clockIn');
    });

    it('should handle optional fields', async () => {
      const mockAttendance = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employee_id: '123e4567-e89b-12d3-a456-426614174001',
        clock_in: '2024-01-15T09:00:00Z',
        organization_id: '123e4567-e89b-12d3-a456-426614174002',
        created_at: '2024-01-15T09:00:00Z'
      };

      db.query.mockResolvedValue({ rows: [mockAttendance] });

      const data = {
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T09:00:00Z'
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await repository.clockIn(data, organizationId);

      expect(result).toBeDefined();
      expect(result.location).toBeUndefined();
      expect(result.ipAddress).toBeUndefined();
    });
  });

  describe('clockOut', () => {
    it('should update record with clock-out time and calculate hours', async () => {
      const mockUpdated = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employee_id: '123e4567-e89b-12d3-a456-426614174001',
        clock_in: '2024-01-15T09:00:00Z',
        clock_out: '2024-01-15T17:00:00Z',
        hours_worked: 8.0,
        location: 'Office HQ',
        organization_id: '123e4567-e89b-12d3-a456-426614174002',
        updated_at: '2024-01-15T17:00:00Z'
      };

      db.query.mockResolvedValue({ rows: [mockUpdated] });

      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const clockOut = '2024-01-15T17:00:00Z';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await repository.clockOut(employeeId, { clockOut }, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE hris.attendance'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('clockOut');
      expect(result).toHaveProperty('hoursWorked', 8.0);
    });

    it('should return null if no active clock-in found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const clockOut = '2024-01-15T17:00:00Z';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await repository.clockOut(employeeId, { clockOut }, organizationId);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find attendance record by ID', async () => {
      const mockAttendance = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employee_id: '123e4567-e89b-12d3-a456-426614174001',
        clock_in: '2024-01-15T09:00:00Z',
        clock_out: '2024-01-15T17:00:00Z',
        hours_worked: 8.0,
        organization_id: '123e4567-e89b-12d3-a456-426614174002'
      };

      db.query.mockResolvedValue({ rows: [mockAttendance] });

      const id = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await repository.findById(id, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([id, organizationId])
      );
      expect(result).toHaveProperty('id', id);
      expect(result).toHaveProperty('hoursWorked', 8.0);
    });

    it('should return null if attendance not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const id = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await repository.findById(id, organizationId);

      expect(result).toBeNull();
    });
  });

  describe('findByEmployee', () => {
    it('should find all attendance records for an employee', async () => {
      const mockRecords = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          employee_id: '123e4567-e89b-12d3-a456-426614174001',
          clock_in: '2024-01-15T09:00:00Z',
          clock_out: '2024-01-15T17:00:00Z',
          hours_worked: 8.0,
          organization_id: '123e4567-e89b-12d3-a456-426614174002'
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          employee_id: '123e4567-e89b-12d3-a456-426614174001',
          clock_in: '2024-01-16T09:00:00Z',
          clock_out: '2024-01-16T17:00:00Z',
          hours_worked: 8.0,
          organization_id: '123e4567-e89b-12d3-a456-426614174002'
        }
      ];

      db.query.mockResolvedValue({ rows: mockRecords });

      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await repository.findByEmployee(employeeId, organizationId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('employeeId', employeeId);
      expect(result[1]).toHaveProperty('employeeId', employeeId);
    });

    it('should support pagination', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';
      const filters = { limit: 10, offset: 0 };

      await repository.findByEmployee(employeeId, organizationId, filters);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10, 0])
      );
    });
  });

  describe('findByEmployeeAndDateRange', () => {
    it('should find attendance records within date range', async () => {
      const mockRecords = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          employee_id: '123e4567-e89b-12d3-a456-426614174001',
          clock_in: '2024-01-15T09:00:00Z',
          clock_out: '2024-01-15T17:00:00Z',
          hours_worked: 8.0,
          organization_id: '123e4567-e89b-12d3-a456-426614174002'
        }
      ];

      db.query.mockResolvedValue({ rows: mockRecords });

      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await repository.findByEmployeeAndDateRange(
        employeeId,
        startDate,
        endDate,
        organizationId
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('clock_in::date BETWEEN'),
        expect.arrayContaining([employeeId, startDate, endDate, organizationId])
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getCurrentClockIn', () => {
    it('should find active clock-in record (not clocked out)', async () => {
      const mockRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employee_id: '123e4567-e89b-12d3-a456-426614174001',
        clock_in: '2024-01-15T09:00:00Z',
        clock_out: null,
        organization_id: '123e4567-e89b-12d3-a456-426614174002'
      };

      db.query.mockResolvedValue({ rows: [mockRecord] });

      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await repository.getCurrentClockIn(employeeId, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('clock_out IS NULL'),
        expect.arrayContaining([employeeId, organizationId])
      );
      expect(result).toHaveProperty('clockOut', null);
    });

    it('should return null if no active clock-in', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await repository.getCurrentClockIn(employeeId, organizationId);

      expect(result).toBeNull();
    });
  });

  describe('createManual', () => {
    it('should create manual attendance record with hours', async () => {
      const mockAttendance = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employee_id: '123e4567-e89b-12d3-a456-426614174001',
        clock_in: '2024-01-15T09:00:00Z',
        clock_out: '2024-01-15T17:00:00Z',
        hours_worked: 8.0,
        notes: 'Manual entry for sick leave documentation',
        organization_id: '123e4567-e89b-12d3-a456-426614174002',
        created_at: '2024-01-15T18:00:00Z'
      };

      db.query.mockResolvedValue({ rows: [mockAttendance] });

      const data = {
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T09:00:00Z',
        clockOut: '2024-01-15T17:00:00Z',
        hoursWorked: 8.0,
        notes: 'Manual entry for sick leave documentation'
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await repository.createManual(data, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hris.attendance'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('hoursWorked', 8.0);
      expect(result).toHaveProperty('notes');
    });
  });
});
