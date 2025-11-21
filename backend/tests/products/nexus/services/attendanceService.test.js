/**
 * AttendanceService Unit Tests
 * Tests business logic for employee attendance tracking
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
const { default: AttendanceService } = await import('../../../../src/products/nexus/services/attendanceService.js');

describe('AttendanceService', () => {
  let service;
  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = 'user-123e4567-e89b-12d3-a456-426614174000';
  const mockEmployeeId = 'emp-123e4567-e89b-12d3-a456-426614174000';
  const mockAttendanceId = 'att-123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AttendanceService();
  });

  describe('clockIn', () => {
    it('should clock in employee successfully', async () => {
      // Arrange
      const clockInData = {
        employee_id: mockEmployeeId,
        clock_in_time: new Date(),
        clock_in_location: 'Office',
        clock_in_notes: 'On time',
        work_type: 'regular'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Check for existing clock-in
        .mockResolvedValueOnce({ rows: [{ id: mockAttendanceId }] }); // Insert

      // Act
      const result = await service.clockIn(clockInData, mockOrganizationId, mockUserId);

      // Assert
      expect(result.id).toBe(mockAttendanceId);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Clocking in employee',
        expect.any(Object)
      );
    });

    it('should throw error when employee_id is missing', async () => {
      // Arrange
      const clockInData = {};

      // Act & Assert
      await expect(
        service.clockIn(clockInData, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Employee ID is required');
    });

    it('should throw error when employee already clocked in today', async () => {
      // Arrange
      const clockInData = { employee_id: mockEmployeeId };
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-123' }] });

      // Act & Assert
      await expect(
        service.clockIn(clockInData, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Employee already has an active clock-in for today');
    });

    it('should use default values when optional fields missing', async () => {
      // Arrange
      const clockInData = { employee_id: mockEmployeeId };
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: mockAttendanceId }] });

      // Act
      await service.clockIn(clockInData, mockOrganizationId, mockUserId);

      // Assert - check that INSERT was called with default values
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO hris.attendance_record'),
        expect.arrayContaining([
          mockOrganizationId,
          mockEmployeeId,
          expect.any(String), // attendance_date (date string)
          expect.any(Date), // clock_in_time
          null, // clock_in_location
          null, // clock_in_ip
          'present', // status default
          null // notes
        ]),
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('clockOut', () => {
    it('should clock out employee successfully', async () => {
      // Arrange
      const clockInTime = new Date('2025-01-01T09:00:00Z');
      const clockOutTime = new Date('2025-01-01T17:00:00Z');
      
      const activeAttendance = {
        id: mockAttendanceId,
        employee_id: mockEmployeeId,
        clock_in_time: clockInTime
      };

      const clockOutData = {
        clock_out_time: clockOutTime,
        clock_out_location: 'Office',
        clock_out_notes: 'End of day'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [activeAttendance] }) // Find active
        .mockResolvedValueOnce({ rows: [{ id: mockAttendanceId, total_hours: '8.00' }] }); // Update

      // Act
      const result = await service.clockOut(mockEmployeeId, clockOutData, mockOrganizationId, mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Employee clocked out successfully',
        expect.objectContaining({ totalHours: '8.00' })
      );
    });

    it('should throw error when no active clock-in found', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(
        service.clockOut(mockEmployeeId, {}, mockOrganizationId, mockUserId)
      ).rejects.toThrow('No active clock-in found for today');
    });

    it('should calculate total hours correctly', async () => {
      // Arrange
      const clockInTime = new Date('2025-01-01T09:00:00Z');
      const clockOutTime = new Date('2025-01-01T13:30:00Z'); // 4.5 hours

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: mockAttendanceId, clock_in_time: clockInTime }] })
        .mockResolvedValueOnce({ rows: [{ total_hours: '4.50' }] });

      // Act
      await service.clockOut(mockEmployeeId, { clock_out_time: clockOutTime }, mockOrganizationId, mockUserId);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.arrayContaining([
          clockOutTime,
          null,
          null,
          '4.50', // Calculated hours
          mockUserId,
          mockAttendanceId,
          mockOrganizationId
        ]),
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('getAttendanceRecord', () => {
    it('should return attendance record with employee details', async () => {
      // Arrange
      const mockRecord = {
        id: mockAttendanceId,
        employee_id: mockEmployeeId,
        employee_name: 'John Doe',
        employee_email: 'john@example.com'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRecord] });

      // Act
      const result = await service.getAttendanceRecord(mockAttendanceId, mockOrganizationId);

      // Assert
      expect(result).toEqual(mockRecord);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN hris.employee'),
        [mockAttendanceId, mockOrganizationId],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should throw error when record not found', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(
        service.getAttendanceRecord(mockAttendanceId, mockOrganizationId)
      ).rejects.toThrow('Attendance record not found');
    });
  });

  describe('getEmployeeAttendance', () => {
    it('should return employee attendance records', async () => {
      // Arrange
      const mockRecords = [
        { id: 'att-1', employee_name: 'John Doe' },
        { id: 'att-2', employee_name: 'John Doe' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRecords });

      // Act
      const result = await service.getEmployeeAttendance(mockEmployeeId, {}, mockOrganizationId);

      // Assert
      expect(result).toEqual(mockRecords);
      expect(result.length).toBe(2);
    });

    it('should apply date range filters', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await service.getEmployeeAttendance(
        mockEmployeeId,
        { startDate: '2025-01-01', endDate: '2025-12-31' },
        mockOrganizationId
      );

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DATE(a.clock_in_time) >='),
        expect.arrayContaining([mockEmployeeId, mockOrganizationId, '2025-01-01', '2025-12-31']),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should apply work type filter', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await service.getEmployeeAttendance(
        mockEmployeeId,
        { workType: 'overtime' },
        mockOrganizationId
      );

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('a.work_type ='),
        expect.arrayContaining(['overtime']),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should apply pagination', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await service.getEmployeeAttendance(
        mockEmployeeId,
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
  });

  describe('getAttendanceSummary', () => {
    it('should return attendance summary statistics', async () => {
      // Arrange
      const mockSummary = {
        total_days: '20',
        total_hours: '160.00',
        average_hours: '8.00',
        incomplete_records: '0'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockSummary] });

      // Act
      const result = await service.getAttendanceSummary(
        mockEmployeeId,
        '2025-01-01',
        '2025-01-31',
        mockOrganizationId
      );

      // Assert
      expect(result).toEqual(mockSummary);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SUM(total_hours)'),
        [mockEmployeeId, mockOrganizationId, '2025-01-01', '2025-01-31'],
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('getDailyAttendance', () => {
    it('should return daily attendance for organization', async () => {
      // Arrange
      const mockRecords = [
        { id: 'att-1', employee_name: 'John Doe' },
        { id: 'att-2', employee_name: 'Jane Smith' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRecords });

      // Act
      const result = await service.getDailyAttendance('2025-01-15', mockOrganizationId);

      // Assert
      expect(result).toEqual(mockRecords);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('a.attendance_date ='), // Updated to match actual implementation
        [mockOrganizationId, '2025-01-15', 100, 0],
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('updateAttendance', () => {
    it('should update attendance record successfully', async () => {
      // Arrange
      const existingRecord = {
        id: mockAttendanceId,
        clock_in_time: new Date('2025-01-01T09:00:00Z'),
        clock_out_time: new Date('2025-01-01T17:00:00Z')
      };

      const updateData = {
        work_type: 'overtime',
        clock_in_notes: 'Updated notes'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [existingRecord] }) // Check
        .mockResolvedValueOnce({ rows: [{ ...existingRecord, ...updateData }] }); // Update

      // Act
      const result = await service.updateAttendance(
        mockAttendanceId,
        updateData,
        mockOrganizationId,
        mockUserId
      );

      // Assert
      expect(result).toMatchObject(updateData);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Attendance record updated successfully',
        expect.any(Object)
      );
    });

    it('should throw error when record not found', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(
        service.updateAttendance(mockAttendanceId, {}, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Attendance record not found');
    });

    it('should return existing record when no updates provided', async () => {
      // Arrange
      const existingRecord = { id: mockAttendanceId };
      mockQuery.mockResolvedValueOnce({ rows: [existingRecord] });

      // Act
      const result = await service.updateAttendance(
        mockAttendanceId,
        {},
        mockOrganizationId,
        mockUserId
      );

      // Assert
      expect(result).toEqual(existingRecord);
      expect(mockQuery).toHaveBeenCalledTimes(1); // Only check query
    });

    it('should recalculate hours when times are updated', async () => {
      // Arrange
      const existingRecord = {
        id: mockAttendanceId,
        clock_in_time: new Date('2025-01-01T09:00:00Z'),
        clock_out_time: new Date('2025-01-01T17:00:00Z')
      };

      const updateData = {
        clock_out_time: new Date('2025-01-01T18:00:00Z') // Extended to 9 hours
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [existingRecord] })
        .mockResolvedValueOnce({ rows: [{ ...existingRecord, total_hours: '9.00' }] });

      // Act
      await service.updateAttendance(mockAttendanceId, updateData, mockOrganizationId, mockUserId);

      // Assert - Check that total_hours is recalculated
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('total_hours ='),
        expect.any(Array),
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('deleteAttendance', () => {
    it('should soft delete attendance record successfully', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: mockAttendanceId }] }) // Check
        .mockResolvedValueOnce({ rows: [] }); // Delete

      // Act
      const result = await service.deleteAttendance(mockAttendanceId, mockOrganizationId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('deleted_at = CURRENT_TIMESTAMP'),
        [mockAttendanceId, mockOrganizationId, mockUserId],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should throw error when record not found', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(
        service.deleteAttendance(mockAttendanceId, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Attendance record not found');
    });
  });
});
