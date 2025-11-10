/**
 * Pay Schedule Service Tests
 * 
 * Unit tests for PayScheduleService business logic.
 */

import PayScheduleService from '../../../../src/products/paylinq/services/payScheduleService.js';
import PayrollRepository from '../../../../src/products/paylinq/repositories/payrollRepository.js';

// Mock dependencies

describe('PayScheduleService', () => {
  let service;
  let mockPayrollRepository;

  beforeEach(() => {
    service = new PayScheduleService();
    mockPayrollRepository = PayrollRepository.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('Pay Schedule Management', () => {
    describe('createPaySchedule', () => {
      test('should create weekly pay schedule', async () => {
        const scheduleData = {
          scheduleName: 'Weekly Payroll',
          frequency: 'weekly',
          dayOfWeek: 'Friday',
          isActive: true
        };

        mockPayrollRepository.createPaySchedule = jest.fn().mockResolvedValue({
          id: 'schedule-123',
          ...scheduleData
        });

        const result = await service.createPaySchedule(
          scheduleData,
          'org-789',
          'user-123'
        );

        expect(result).toBeDefined();
        expect(result.schedule_name).toBe('Weekly Payroll');
        expect(result.frequency).toBe('weekly');
      });

      test('should create bi-weekly pay schedule', async () => {
        const scheduleData = {
          scheduleName: 'Bi-Weekly Payroll',
          frequency: 'bi-weekly',
          dayOfWeek: 'Friday',
          startDate: '2024-01-05',
          isActive: true
        };

        mockPayrollRepository.createPaySchedule = jest.fn().mockResolvedValue({
          id: 'schedule-456',
          ...scheduleData
        });

        const result = await service.createPaySchedule(
          scheduleData,
          'org-789',
          'user-123'
        );

        expect(result.frequency).toBe('bi-weekly');
      });

      test('should create semi-monthly pay schedule', async () => {
        const scheduleData = {
          scheduleName: 'Semi-Monthly Payroll',
          frequency: 'semi-monthly',
          firstPayDay: 15,
          secondPayDay: 30,
          isActive: true
        };

        mockPayrollRepository.createPaySchedule = jest.fn().mockResolvedValue({
          id: 'schedule-789',
          ...scheduleData
        });

        const result = await service.createPaySchedule(
          scheduleData,
          'org-789',
          'user-123'
        );

        expect(result.frequency).toBe('semi-monthly');
        expect(result.first_pay_day).toBe(15);
      });

      test('should create monthly pay schedule', async () => {
        const scheduleData = {
          scheduleName: 'Monthly Payroll',
          frequency: 'monthly',
          dayOfMonth: 30,
          isActive: true
        };

        mockPayrollRepository.createPaySchedule = jest.fn().mockResolvedValue({
          id: 'schedule-101',
          ...scheduleData
        });

        const result = await service.createPaySchedule(
          scheduleData,
          'org-789',
          'user-123'
        );

        expect(result.frequency).toBe('monthly');
      });

      test('should validate frequency enum', async () => {
        const invalidData = {
          scheduleName: 'Invalid Schedule',
          frequency: 'invalid_frequency',
          isActive: true
        };

        await expect(
          service.createPaySchedule(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });
    });

    describe('updatePaySchedule', () => {
      test('should update pay schedule', async () => {
        const updates = {
          dayOfWeek: 'Thursday'
        };

        mockPayrollRepository.updatePaySchedule = jest.fn().mockResolvedValue({
          id: 'schedule-123',
          ...updates
        });

        const result = await service.updatePaySchedule(
          'schedule-123',
          updates,
          'org-789',
          'user-123'
        );

        expect(result.day_of_week).toBe('Thursday');
      });
    });

    describe('getPaySchedules', () => {
      test('should retrieve all pay schedules', async () => {
        const mockSchedules = [
          { id: 'schedule-1', frequency: 'weekly' },
          { id: 'schedule-2', frequency: 'monthly' }
        ];

        mockPayrollRepository.findPaySchedules = jest.fn().mockResolvedValue(mockSchedules);

        const result = await service.getPaySchedules('org-789');

        expect(result).toEqual(mockSchedules);
      });
    });
  });

  describe('Pay Date Calculations', () => {
    describe('getNextPayDate', () => {
      test('should calculate next weekly pay date', () => {
        const currentDate = new Date('2024-01-15'); // Monday
        const dayOfWeek = 5; // Friday

        const result = service.getNextPayDate(currentDate, 'weekly', { dayOfWeek });

        expect(result.getDay()).toBe(5); // Friday
        expect(result >= currentDate).toBe(true);
      });

      test('should calculate next bi-weekly pay date', () => {
        const startDate = new Date('2024-01-05'); // First pay date
        const currentDate = new Date('2024-01-10');

        const result = service.getNextPayDate(currentDate, 'bi-weekly', {
          dayOfWeek: 5,
          startDate
        });

        const expectedDate = new Date('2024-01-19'); // 2 weeks from start
        expect(result.getDate()).toBe(expectedDate.getDate());
      });

      test('should calculate next semi-monthly pay date', () => {
        const currentDate = new Date('2024-01-10');
        const firstPayDay = 15;
        const secondPayDay = 30;

        const result = service.getNextPayDate(currentDate, 'semi-monthly', {
          firstPayDay,
          secondPayDay
        });

        expect(result.getDate()).toBe(15); // Next is 15th
      });

      test('should calculate next monthly pay date', () => {
        const currentDate = new Date('2024-01-10');
        const dayOfMonth = 30;

        const result = service.getNextPayDate(currentDate, 'monthly', { dayOfMonth });

        expect(result.getDate()).toBe(30);
      });
    });

    describe('getPayPeriodDates', () => {
      test('should calculate weekly pay period', () => {
        const payDate = new Date('2024-01-19'); // Friday

        const result = service.getPayPeriodDates(payDate, 'weekly');

        expect(result.periodStart.getDay()).toBe(1); // Monday
        expect(result.periodEnd.getDay()).toBe(0); // Sunday
      });

      test('should calculate bi-weekly pay period', () => {
        const payDate = new Date('2024-01-19');

        const result = service.getPayPeriodDates(payDate, 'bi-weekly');

        const daysDifference = Math.floor(
          (result.periodEnd - result.periodStart) / (1000 * 60 * 60 * 24)
        );

        expect(daysDifference).toBe(13); // 14 days (0-13)
      });

      test('should calculate semi-monthly pay period (first half)', () => {
        const payDate = new Date('2024-01-15');

        const result = service.getPayPeriodDates(payDate, 'semi-monthly', {
          isFirstPeriod: true
        });

        expect(result.periodStart.getDate()).toBe(1);
        expect(result.periodEnd.getDate()).toBe(15);
      });

      test('should calculate semi-monthly pay period (second half)', () => {
        const payDate = new Date('2024-01-30');

        const result = service.getPayPeriodDates(payDate, 'semi-monthly', {
          isFirstPeriod: false
        });

        expect(result.periodStart.getDate()).toBe(16);
        // End date is last day of month
      });

      test('should calculate monthly pay period', () => {
        const payDate = new Date('2024-01-30');

        const result = service.getPayPeriodDates(payDate, 'monthly');

        expect(result.periodStart.getDate()).toBe(1);
        // End date is last day of month
      });
    });

    describe('getPayPeriodsForYear', () => {
      test('should calculate 52 weekly pay periods', () => {
        const year = 2024;

        const result = service.getPayPeriodsForYear(year, 'weekly', {
          dayOfWeek: 5
        });

        expect(result.length).toBeGreaterThanOrEqual(52);
        expect(result.length).toBeLessThanOrEqual(53);
      });

      test('should calculate 26 bi-weekly pay periods', () => {
        const year = 2024;
        const startDate = new Date('2024-01-05');

        const result = service.getPayPeriodsForYear(year, 'bi-weekly', {
          dayOfWeek: 5,
          startDate
        });

        expect(result.length).toBeGreaterThanOrEqual(26);
        expect(result.length).toBeLessThanOrEqual(27);
      });

      test('should calculate 24 semi-monthly pay periods', () => {
        const year = 2024;

        const result = service.getPayPeriodsForYear(year, 'semi-monthly', {
          firstPayDay: 15,
          secondPayDay: 30
        });

        expect(result.length).toBe(24); // Exactly 24
      });

      test('should calculate 12 monthly pay periods', () => {
        const year = 2024;

        const result = service.getPayPeriodsForYear(year, 'monthly', {
          dayOfMonth: 30
        });

        expect(result.length).toBe(12); // Exactly 12
      });
    });
  });

  describe('Working Days Calculations', () => {
    describe('getWorkingDaysInPeriod', () => {
      test('should calculate working days excluding weekends', () => {
        const periodStart = new Date('2024-01-01'); // Monday
        const periodEnd = new Date('2024-01-05'); // Friday

        const result = service.getWorkingDaysInPeriod(periodStart, periodEnd);

        expect(result).toBe(5); // Mon-Fri
      });

      test('should exclude weekends from count', () => {
        const periodStart = new Date('2024-01-01'); // Monday
        const periodEnd = new Date('2024-01-07'); // Sunday

        const result = service.getWorkingDaysInPeriod(periodStart, periodEnd);

        expect(result).toBe(5); // Mon-Fri (excludes Sat-Sun)
      });

      test('should handle single day period', () => {
        const periodStart = new Date('2024-01-03'); // Wednesday
        const periodEnd = new Date('2024-01-03');

        const result = service.getWorkingDaysInPeriod(periodStart, periodEnd);

        expect(result).toBe(1);
      });
    });

    describe('getWorkingDaysInMonth', () => {
      test('should calculate working days in January 2024', () => {
        const year = 2024;
        const month = 1; // January

        const result = service.getWorkingDaysInMonth(year, month);

        expect(result).toBeGreaterThan(20);
        expect(result).toBeLessThan(24);
      });
    });
  });

  describe('Pay Schedule Reporting', () => {
    describe('getUpcomingPayDates', () => {
      test('should retrieve next N pay dates', async () => {
        const mockSchedule = {
          id: 'schedule-123',
          frequency: 'weekly',
          day_of_week: 5 // Friday
        };

        mockPayrollRepository.findPayScheduleById = jest.fn().mockResolvedValue(mockSchedule);

        const result = await service.getUpcomingPayDates('schedule-123', 4, 'org-789');

        expect(result).toHaveLength(4);
        result.forEach(date => {
          expect(date.getDay()).toBe(5); // All Fridays
        });
      });
    });

    describe('getPayScheduleCalendar', () => {
      test('should generate annual pay schedule calendar', async () => {
        const mockSchedule = {
          id: 'schedule-123',
          frequency: 'semi-monthly',
          first_pay_day: 15,
          second_pay_day: 30
        };

        mockPayrollRepository.findPayScheduleById = jest.fn().mockResolvedValue(mockSchedule);

        const result = await service.getPayScheduleCalendar(
          'schedule-123',
          2024,
          'org-789'
        );

        expect(result.year).toBe(2024);
        expect(result.frequency).toBe('semi-monthly');
        expect(result.payPeriods).toHaveLength(24);
      });
    });
  });

  describe('Pay Period Validation', () => {
    test('should validate pay date is business day', () => {
      const saturday = new Date('2024-01-06'); // Saturday
      const isValid = service.isBusinessDay(saturday);
      expect(isValid).toBe(false);
    });

    test('should validate weekday as business day', () => {
      const wednesday = new Date('2024-01-03'); // Wednesday
      const isValid = service.isBusinessDay(wednesday);
      expect(isValid).toBe(true);
    });

    test('should adjust weekend pay date to Friday', () => {
      const saturday = new Date('2024-01-06'); // Saturday
      const adjusted = service.adjustToBusinessDay(saturday);
      expect(adjusted.getDay()).toBe(5); // Friday
    });
  });

  describe('Annualization Calculations', () => {
    describe('annualizePay', () => {
      test('should annualize weekly pay', () => {
        const weeklyPay = 1000.0;
        const result = service.annualizePay(weeklyPay, 'weekly');
        expect(result).toBe(52000.0); // 1000 * 52
      });

      test('should annualize bi-weekly pay', () => {
        const biWeeklyPay = 2000.0;
        const result = service.annualizePay(biWeeklyPay, 'bi-weekly');
        expect(result).toBe(52000.0); // 2000 * 26
      });

      test('should annualize semi-monthly pay', () => {
        const semiMonthlyPay = 2166.67;
        const result = service.annualizePay(semiMonthlyPay, 'semi-monthly');
        expect(result).toBeCloseTo(52000.0, 0); // 2166.67 * 24
      });

      test('should annualize monthly pay', () => {
        const monthlyPay = 4333.33;
        const result = service.annualizePay(monthlyPay, 'monthly');
        expect(result).toBeCloseTo(52000.0, 0); // 4333.33 * 12
      });
    });

    describe('convertPayRate', () => {
      test('should convert monthly to weekly', () => {
        const monthlyPay = 5000.0;
        const result = service.convertPayRate(monthlyPay, 'monthly', 'weekly');
        expect(result).toBeCloseTo(1153.85, 2); // 5000 * 12 / 52
      });

      test('should convert hourly to annual', () => {
        const hourlyRate = 25.0;
        const result = service.convertPayRate(hourlyRate, 'hour', 'annual');
        expect(result).toBe(52000.0); // 25 * 40 * 52
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle repository errors', async () => {
      mockPayrollRepository.createPaySchedule = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        service.createPaySchedule({
          scheduleName: 'Test',
          frequency: 'weekly',
          dayOfWeek: 'Friday',
          isActive: true
        }, 'org-789', 'user-123')
      ).rejects.toThrow('Database error');
    });

    test('should handle invalid frequency', () => {
      expect(() => {
        service.getNextPayDate(new Date(), 'invalid_frequency', {});
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle February 29 in leap year', () => {
      const leapYear = 2024;
      const month = 2; // February

      const result = service.getWorkingDaysInMonth(leapYear, month);

      expect(result).toBeGreaterThan(19); // Has 29 days
    });

    test('should handle month-end pay dates', () => {
      const payDate = new Date('2024-01-31');
      const result = service.getPayPeriodDates(payDate, 'monthly');

      expect(result.periodStart.getDate()).toBe(1);
      expect(result.periodEnd.getDate()).toBe(31);
    });

    test('should handle December to January transition', () => {
      const currentDate = new Date('2024-12-28');
      const dayOfWeek = 5; // Friday

      const result = service.getNextPayDate(currentDate, 'weekly', { dayOfWeek });

      expect(result.getMonth()).toBe(0); // January
      expect(result.getFullYear()).toBe(2025);
    });
  });
});
