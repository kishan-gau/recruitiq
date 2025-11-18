/**
 * ReportsService Tests
 * Comprehensive tests for reporting and analytics service
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
const mockDbQuery = jest.fn();
const mockDb = { query: mockDbQuery };
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  query: mockDbQuery
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

const { default: ReportsService } = await import('../../../../src/products/nexus/services/reportsService.js');

describe('ReportsService', () => {
  let service;
  const organizationId = 'org-123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService();
  });

  describe('getHeadcountReport', () => {
    it('should generate headcount report without grouping', async () => {
      const mockData = [{
        total_employees: 100,
        active_employees: 85,
        inactive_employees: 10,
        terminated_employees: 5,
        male_count: 60,
        female_count: 38,
        other_gender_count: 2
      }];

      mockDbQuery.mockResolvedValue({ rows: mockData });

      const result = await service.getHeadcountReport(organizationId);

      expect(result.report_type).toBe('headcount');
      expect(result.data).toEqual(mockData);
      expect(result.group_by).toBe('department');
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT e.id) as total_employees'),
        [organizationId],
        organizationId,
        expect.objectContaining({ operation: 'report' })
      );
    });

    it('should generate headcount report grouped by department', async () => {
      const mockData = [
        {
          total_employees: 50,
          active_employees: 45,
          group_id: 'dept-1',
          group_name: 'Engineering',
          group_type: 'department'
        },
        {
          total_employees: 50,
          active_employees: 40,
          group_id: 'dept-2',
          group_name: 'Sales',
          group_type: 'department'
        }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockData });

      const result = await service.getHeadcountReport(organizationId, { groupBy: 'department' });

      expect(result.data).toEqual(mockData);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('d.department_name as group_name'),
        [organizationId],
        organizationId,
        expect.any(Object)
      );
    });

    it('should generate headcount report grouped by location', async () => {
      const mockData = [
        {
          total_employees: 75,
          group_id: 'loc-1',
          group_name: 'New York',
          group_type: 'location'
        }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockData });

      const result = await service.getHeadcountReport(organizationId, { groupBy: 'location' });

      expect(result.data).toEqual(mockData);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('l.location_name as group_name'),
        [organizationId],
        organizationId,
        expect.any(Object)
      );
    });

    it('should generate headcount report grouped by employment_type', async () => {
      const mockData = [
        {
          total_employees: 60,
          group_id: 'full-time',
          group_name: 'full-time',
          group_type: 'employment_type'
        }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockData });

      const result = await service.getHeadcountReport(organizationId, { groupBy: 'employment_type' });

      expect(result.data).toEqual(mockData);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.employment_type as group_id'),
        [organizationId],
        organizationId,
        expect.any(Object)
      );
    });

    it('should filter by department', async () => {
      const departmentId = 'dept-123';
      mockDbQuery.mockResolvedValue({ rows: [] });

      await service.getHeadcountReport(organizationId, { departmentId });

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.department_id = $2'),
        [organizationId, departmentId],
        organizationId,
        expect.any(Object)
      );
    });

    it('should filter by location', async () => {
      const locationId = 'loc-123';
      mockDbQuery.mockResolvedValue({ rows: [] });

      await service.getHeadcountReport(organizationId, { locationId });

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.location_id = $2'),
        [organizationId, locationId],
        organizationId,
        expect.any(Object)
      );
    });

    it('should filter by employment type', async () => {
      const employmentType = 'full-time';
      mockDbQuery.mockResolvedValue({ rows: [] });

      await service.getHeadcountReport(organizationId, { employmentType });

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.employment_type = $2'),
        [organizationId, employmentType],
        organizationId,
        expect.any(Object)
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.getHeadcountReport(organizationId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error generating headcount report',
        expect.objectContaining({ error: dbError.message })
      );
    });
  });

  describe('getTurnoverReport', () => {
    it('should generate turnover report', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';
      const mockData = {
        employee_count: 100,
        total_terminations: 10,
        voluntary_terminations: 6,
        involuntary_terminations: 4,
        new_hires: 15,
        turnover_rate: 10.0,
        by_department: [
          { department_id: 'dept-1', department_name: 'Engineering', terminations: 5 }
        ]
      };

      mockDbQuery.mockResolvedValue({ rows: [mockData] });

      const result = await service.getTurnoverReport(organizationId, startDate, endDate);

      expect(result.report_type).toBe('turnover');
      expect(result.period).toEqual({ start_date: startDate, end_date: endDate });
      expect(result.data).toEqual(mockData);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WITH period_employees AS'),
        [organizationId, startDate, endDate],
        organizationId,
        expect.any(Object)
      );
    });

    it('should return zero values when no data', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.getTurnoverReport(organizationId, '2025-01-01', '2025-12-31');

      expect(result.data).toEqual({
        employee_count: 0,
        total_terminations: 0,
        voluntary_terminations: 0,
        involuntary_terminations: 0,
        new_hires: 0,
        turnover_rate: 0,
        by_department: []
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query timeout');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(
        service.getTurnoverReport(organizationId, '2025-01-01', '2025-12-31')
      ).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getTimeOffReport', () => {
    it('should generate time-off report', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';
      const mockData = {
        total_requests: 50,
        pending_requests: 5,
        approved_requests: 40,
        rejected_requests: 3,
        cancelled_requests: 2,
        total_days_taken: 200,
        avg_days_per_request: 5,
        by_leave_type: [
          { leave_type: 'vacation', count: 30, total_days: 150 }
        ]
      };

      mockDbQuery.mockResolvedValue({ rows: [mockData] });

      const result = await service.getTimeOffReport(organizationId, startDate, endDate);

      expect(result.report_type).toBe('time_off');
      expect(result.period).toEqual({ start_date: startDate, end_date: endDate });
      expect(result.data).toEqual(mockData);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) FILTER (WHERE status = \'pending\')'),
        [organizationId, startDate, endDate],
        organizationId,
        expect.any(Object)
      );
    });

    it('should return zero values when no requests', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.getTimeOffReport(organizationId, '2025-01-01', '2025-12-31');

      expect(result.data).toEqual({
        total_requests: 0,
        pending_requests: 0,
        approved_requests: 0,
        rejected_requests: 0,
        cancelled_requests: 0,
        total_days_taken: 0,
        avg_days_per_request: 0,
        by_leave_type: []
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Connection lost');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(
        service.getTimeOffReport(organizationId, '2025-01-01', '2025-12-31')
      ).rejects.toThrow(dbError);
    });
  });

  describe('getAttendanceReport', () => {
    it('should generate attendance report', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';
      const mockData = {
        total_employees: 100,
        total_records: 2000,
        present_count: 1800,
        absent_count: 150,
        late_count: 40,
        half_day_count: 10,
        total_hours: 14400,
        avg_hours_per_day: 8,
        attendance_rate: 90.0,
        by_employee: []
      };

      mockDbQuery.mockResolvedValue({ rows: [mockData] });

      const result = await service.getAttendanceReport(organizationId, startDate, endDate);

      expect(result.report_type).toBe('attendance');
      expect(result.data).toEqual(mockData);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT employee_id) as total_employees'),
        [organizationId, startDate, endDate],
        organizationId,
        expect.any(Object)
      );
    });

    it('should return zero values when no attendance data', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.getAttendanceReport(organizationId, '2025-01-01', '2025-01-31');

      expect(result.data).toEqual({
        total_employees: 0,
        total_records: 0,
        present_count: 0,
        absent_count: 0,
        late_count: 0,
        half_day_count: 0,
        total_hours: 0,
        avg_hours_per_day: 0,
        attendance_rate: 0,
        by_employee: []
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(
        service.getAttendanceReport(organizationId, '2025-01-01', '2025-01-31')
      ).rejects.toThrow(dbError);
    });
  });

  describe('getPerformanceReport', () => {
    it('should generate performance report', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';
      const mockData = {
        total_reviews: 50,
        employees_reviewed: 48,
        avg_rating: 3.8,
        excellent_count: 20,
        good_count: 25,
        satisfactory_count: 4,
        needs_improvement_count: 1,
        by_period: [],
        by_department: []
      };

      mockDbQuery.mockResolvedValue({ rows: [mockData] });

      const result = await service.getPerformanceReport(organizationId, startDate, endDate);

      expect(result.report_type).toBe('performance');
      expect(result.data).toEqual(mockData);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as total_reviews'),
        [organizationId, startDate, endDate],
        organizationId,
        expect.any(Object)
      );
    });

    it('should return zero values when no performance data', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.getPerformanceReport(organizationId, '2025-01-01', '2025-12-31');

      expect(result.data).toEqual({
        total_reviews: 0,
        employees_reviewed: 0,
        avg_rating: 0,
        excellent_count: 0,
        good_count: 0,
        satisfactory_count: 0,
        needs_improvement_count: 0,
        by_period: [],
        by_department: []
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(
        service.getPerformanceReport(organizationId, '2025-01-01', '2025-12-31')
      ).rejects.toThrow(dbError);
    });
  });

  describe('getBenefitsReport', () => {
    it('should generate benefits report', async () => {
      const mockData = {
        total_plans: 5,
        active_plans: 4,
        total_enrollments: 150,
        active_enrollments: 140,
        pending_enrollments: 8,
        terminated_enrollments: 2,
        enrolled_employees: 85,
        by_plan: []
      };

      mockDbQuery.mockResolvedValue({ rows: [mockData] });

      const result = await service.getBenefitsReport(organizationId);

      expect(result.report_type).toBe('benefits');
      expect(result.data).toEqual(mockData);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT bp.id) as total_plans'),
        [organizationId],
        organizationId,
        expect.any(Object)
      );
    });

    it('should return zero values when no benefits data', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.getBenefitsReport(organizationId);

      expect(result.data).toEqual({
        total_plans: 0,
        active_plans: 0,
        total_enrollments: 0,
        active_enrollments: 0,
        pending_enrollments: 0,
        terminated_enrollments: 0,
        enrolled_employees: 0,
        by_plan: []
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Connection timeout');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.getBenefitsReport(organizationId)).rejects.toThrow(dbError);
    });
  });

  describe('getDashboardReport', () => {
    it('should generate dashboard report with all metrics', async () => {
      const mockEmployees = { total_employees: 100, active_employees: 95, new_hires_30d: 5 };
      const mockTimeOff = { pending_requests: 10 };
      const mockAttendance = { present_today: 90, absent_today: 5 };
      const mockDocuments = { expiring_documents: 3 };

      mockDbQuery
        .mockResolvedValueOnce({ rows: [mockEmployees] })
        .mockResolvedValueOnce({ rows: [mockTimeOff] })
        .mockResolvedValueOnce({ rows: [mockAttendance] })
        .mockResolvedValueOnce({ rows: [mockDocuments] });

      const result = await service.getDashboardReport(organizationId);

      expect(result.report_type).toBe('dashboard');
      expect(result.data).toEqual({
        employees: mockEmployees,
        time_off: mockTimeOff,
        attendance: mockAttendance,
        documents: mockDocuments
      });
      expect(mockDbQuery).toHaveBeenCalledTimes(4);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Query failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.getDashboardReport(organizationId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error generating dashboard report',
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should log errors with proper context', async () => {
      const dbError = new Error('Database connection failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.getHeadcountReport(organizationId)).rejects.toThrow(dbError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error generating headcount report',
        expect.objectContaining({
          error: dbError.message,
          organizationId
        })
      );
    });

    it('should propagate errors to caller', async () => {
      const error = new Error('Custom error');
      mockDbQuery.mockRejectedValue(error);

      await expect(service.getTurnoverReport(organizationId, '2025-01-01', '2025-12-31'))
        .rejects.toThrow('Custom error');
    });
  });

  describe('constructor', () => {
    it('should initialize with logger', () => {
      const newService = new ReportsService();
      expect(newService.logger).toBeDefined();
    });
  });
});
