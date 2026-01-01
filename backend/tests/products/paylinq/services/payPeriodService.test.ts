/**
 * PayPeriodService Tests
 * 
 * Testing Strategy:
 * - Service exports class (not singleton)
 * - No DTOs needed - SQL queries already return camelCase
 * - Tests mock query function from database.js
 * - Covers pay period config CRUD, period calculations, and holidays
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Create mocks before any imports
const mockQuery = jest.fn();
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock modules using unstable_mockModule for proper ES module support
jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  default: { query: mockQuery },
  query: mockQuery
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger,
  logSecurityEvent: jest.fn(),
  SecurityEventType: {
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  }
}));

// Import after mocking
const { default: PayPeriodService } = await import('../../../../src/products/paylinq/services/payPeriodService.js');
const { ValidationError, NotFoundError } = await import('../../../../src/middleware/errorHandler.js');

describe('PayPeriodService', () => {
  let service: any;
  const orgId = '123e4567-e89b-12d3-a456-426614174000';
  const userId = '987fcdeb-51a2-43d7-8f9e-abc123456789';

  // Helper to create mock pay period config (camelCase - as returned by SQL)
  const createMockConfig = (overrides = {}) => ({
    id: expect.any(String),
    payFrequency: 'bi-weekly',
    periodStartDate: '2025-01-01',
    payDayOffset: 7,
    firstPayDay: null,
    secondPayDay: null,
    isActive: true,
    notes: null,
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    ...overrides
  });

  // Helper to create mock holiday (camelCase - as returned by SQL)
  const createMockHoliday = (overrides = {}) => ({
    id: expect.any(String),
    holidayName: 'Christmas',
    holidayDate: '2025-12-25',
    isRecurring: true,
    affectsPaySchedule: true,
    affectsWorkSchedule: true,
    isActive: true,
    createdAt: expect.any(Date),
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Inject mock database object that matches service's expectation
    service = new PayPeriodService({ query: mockQuery });
  });

  describe('getPayPeriodConfig', () => {
    it('should return pay period config for organization', async () => {
      const mockConfig = createMockConfig();
      mockQuery.mockResolvedValue({ rows: [mockConfig] });

      const result = await service.getPayPeriodConfig(orgId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.pay_period_config'),
        [orgId],
        orgId,
        expect.any(Object)
      );
      expect(result).toEqual(mockConfig);
      expect(result.payFrequency).toBe('bi-weekly');
      expect(result.payDayOffset).toBe(7);
    });

    it('should return null if no config exists', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await service.getPayPeriodConfig(orgId);

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(service.getPayPeriodConfig(orgId)).rejects.toThrow('Database error');
    });
  });

  describe('savePayPeriodConfig', () => {
    const validConfigData = {
      payFrequency: 'monthly',
      periodStartDate: '2025-01-01',
      payDayOffset: 5,
      firstPayDay: null,
      secondPayDay: null,
      notes: 'Monthly payroll'
    };

    it('should create new config when none exists', async () => {
      const mockConfig = createMockConfig(validConfigData);
      
      // Mock getPayPeriodConfig returning null (no existing config)
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // getPayPeriodConfig
        .mockResolvedValueOnce({ rows: [mockConfig] }); // INSERT

      const result = await service.savePayPeriodConfig(validConfigData, orgId, userId);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('INSERT INTO payroll.pay_period_config'),
        expect.arrayContaining([orgId, 'monthly', '2025-01-01', 5]),
        orgId,
        expect.any(Object)
      );
      expect(result).toEqual(mockConfig);
      expect(result.payFrequency).toBe('monthly');
    });

    it('should update existing config', async () => {
      const existingConfig = createMockConfig({ payFrequency: 'bi-weekly' });
      const updatedConfig = createMockConfig({ payFrequency: 'monthly' });
      
      mockQuery
        .mockResolvedValueOnce({ rows: [existingConfig] }) // getPayPeriodConfig
        .mockResolvedValueOnce({ rows: [updatedConfig] }); // UPDATE

      const result = await service.savePayPeriodConfig(validConfigData, orgId, userId);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('UPDATE payroll.pay_period_config'),
        expect.arrayContaining(['monthly', '2025-01-01', 5]),
        orgId,
        expect.any(Object)
      );
      expect(result.payFrequency).toBe('monthly');
    });

    it('should throw ValidationError for invalid pay frequency', async () => {
      const invalidData = { ...validConfigData, payFrequency: 'invalid' };

      await expect(
        service.savePayPeriodConfig(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid date format', async () => {
      const invalidData = { ...validConfigData, periodStartDate: 'not-a-date' };

      await expect(
        service.savePayPeriodConfig(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid payDayOffset', async () => {
      const invalidData = { ...validConfigData, payDayOffset: 50 };

      await expect(
        service.savePayPeriodConfig(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidData = { payFrequency: 'monthly' };

      await expect(
        service.savePayPeriodConfig(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should accept semi-monthly config with pay days', async () => {
      const semiMonthlyData = {
        payFrequency: 'semi-monthly',
        periodStartDate: '2025-01-01',
        payDayOffset: 3,
        firstPayDay: 15,
        secondPayDay: 30,
        notes: 'Semi-monthly payroll'
      };
      const mockConfig = createMockConfig(semiMonthlyData);

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockConfig] });

      const result = await service.savePayPeriodConfig(semiMonthlyData, orgId, userId);

      expect(result.firstPayDay).toBe(15);
      expect(result.secondPayDay).toBe(30);
    });
  });

  describe('getCurrentPayPeriod', () => {
    it('should calculate current pay period for weekly frequency', async () => {
      const config = createMockConfig({
        payFrequency: 'weekly',
        periodStartDate: '2025-01-06', // Monday
        payDayOffset: 7
      });
      // Mock both queries: first for config, second for organization timezone
      mockQuery.mockResolvedValueOnce({ rows: [config] });
      mockQuery.mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] });

      const result = await service.getCurrentPayPeriod(orgId);

      expect(result).toHaveProperty('periodStart');
      expect(result).toHaveProperty('periodEnd');
      expect(result).toHaveProperty('payDate');
      expect(result.frequency).toBe('weekly');
      expect(typeof result.periodStart).toBe('string');
      expect(typeof result.periodEnd).toBe('string');
    });

    it('should calculate current pay period for bi-weekly frequency', async () => {
      const config = createMockConfig({
        payFrequency: 'bi-weekly',
        periodStartDate: '2025-01-06',
        payDayOffset: 5
      });
      // Mock both queries: first for config, second for organization timezone
      mockQuery.mockResolvedValueOnce({ rows: [config] });
      mockQuery.mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] });

      const result = await service.getCurrentPayPeriod(orgId);

      expect(result.frequency).toBe('bi-weekly');
      expect(result).toHaveProperty('payDate');
    });

    it('should calculate current pay period for semi-monthly frequency', async () => {
      const config = createMockConfig({
        payFrequency: 'semi-monthly',
        periodStartDate: '2025-01-01',
        payDayOffset: 3
      });
      // Mock both queries: first for config, second for organization timezone
      mockQuery.mockResolvedValueOnce({ rows: [config] });
      mockQuery.mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] });

      // Use Jest fake timers to set a specific date (Jan 10, 2025)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10T12:00:00Z'));

      const result = await service.getCurrentPayPeriod(orgId);

      expect(result.frequency).toBe('semi-monthly');
      // Jan 10 should be in the 1-15 period
      expect(result.periodStart).toBe('2025-01-01');
      expect(result.periodEnd).toBe('2025-01-15');
      
      jest.useRealTimers();
    });

    it('should calculate current pay period for monthly frequency', async () => {
      const config = createMockConfig({
        payFrequency: 'monthly',
        periodStartDate: '2025-01-01',
        payDayOffset: 5
      });
      // Mock both queries: first for config, second for organization timezone
      mockQuery.mockResolvedValueOnce({ rows: [config] });
      mockQuery.mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] });

      // Use Jest fake timers to set a specific date (Jan 20, 2025)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-20T12:00:00Z'));

      const result = await service.getCurrentPayPeriod(orgId);

      expect(result.frequency).toBe('monthly');
      expect(result.periodStart).toBe('2025-01-01');
      expect(result.periodEnd).toBe('2025-01-31');
      
      jest.useRealTimers();
    });

    it('should throw NotFoundError when config not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        service.getCurrentPayPeriod(orgId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getNextPayPeriod', () => {
    it('should calculate next pay period after current', async () => {
      const config = createMockConfig({
        payFrequency: 'bi-weekly',
        periodStartDate: '2025-01-06',
        payDayOffset: 7
      });
      // Mock all 4 queries: 
      // 1. getCurrentPayPeriod calls getPayPeriodConfig
      mockQuery.mockResolvedValueOnce({ rows: [config] });
      // 2. getCurrentPayPeriod queries timezone
      mockQuery.mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] });
      // 3. getNextPayPeriod calls getPayPeriodConfig again
      mockQuery.mockResolvedValueOnce({ rows: [config] });
      // 4. getNextPayPeriod queries timezone
      mockQuery.mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] });

      const nextPeriod = await service.getNextPayPeriod(orgId);

      expect(nextPeriod).toHaveProperty('periodStart');
      expect(nextPeriod).toHaveProperty('periodEnd');
      expect(nextPeriod).toHaveProperty('payDate');
      expect(nextPeriod.frequency).toBe('bi-weekly');
    });

    it('should calculate next monthly period', async () => {
      const config = createMockConfig({
        payFrequency: 'monthly',
        periodStartDate: '2025-01-01',
        payDayOffset: 5
      });
      // Mock all 4 queries:
      // 1. getCurrentPayPeriod calls getPayPeriodConfig
      mockQuery.mockResolvedValueOnce({ rows: [config] });
      // 2. getCurrentPayPeriod queries timezone
      mockQuery.mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] });
      // 3. getNextPayPeriod calls getPayPeriodConfig again
      mockQuery.mockResolvedValueOnce({ rows: [config] });
      // 4. getNextPayPeriod queries timezone
      mockQuery.mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] });

      // Use Jest fake timers to set a specific date (Jan 15, 2025 at noon UTC to avoid timezone issues)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));

      const nextPeriod = await service.getNextPayPeriod(orgId);

      // Should calculate February period (next month after January)
      // Note: Due to date parsing and timezone, verify the month changed
      const nextStart = new Date(nextPeriod.periodStart + 'T00:00:00.000Z');
      const nextEnd = new Date(nextPeriod.periodEnd + 'T00:00:00.000Z');
      
      expect(nextStart.getUTCMonth()).toBe(1); // February (0-indexed)
      expect(nextStart.getUTCDate()).toBe(1);  // 1st of month
      expect(nextEnd.getUTCMonth()).toBe(1);   // February
      expect([28, 29]).toContain(nextEnd.getUTCDate()); // Last day of Feb (28 or 29)
      
      jest.useRealTimers();
    });
  });

  describe('getHolidays', () => {
    it('should return all holidays for organization', async () => {
      const mockHolidays = [
        createMockHoliday({ holidayName: 'New Year', holidayDate: '2025-01-01' }),
        createMockHoliday({ holidayName: 'Christmas', holidayDate: '2025-12-25' })
      ];
      mockQuery.mockResolvedValue({ rows: mockHolidays });

      const result = await service.getHolidays(orgId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.company_holiday'),
        [orgId],
        orgId,
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
      expect(result[0].holidayName).toBe('New Year');
      expect(result[1].holidayName).toBe('Christmas');
    });

    it('should filter holidays by year', async () => {
      const mockHolidays = [
        createMockHoliday({ holidayDate: '2025-01-01' })
      ];
      mockQuery.mockResolvedValue({ rows: mockHolidays });

      const result = await service.getHolidays(orgId, 2025);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('EXTRACT(YEAR FROM holiday_date)'),
        [orgId, 2025],
        orgId,
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array if no holidays', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await service.getHolidays(orgId);

      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(service.getHolidays(orgId)).rejects.toThrow('Database error');
    });
  });

  describe('createHoliday', () => {
    const validHolidayData = {
      holidayName: 'Independence Day',
      holidayDate: '2025-07-04',
      isRecurring: true,
      affectsPaySchedule: true,
      affectsWorkSchedule: true
    };

    it('should create holiday successfully', async () => {
      const mockHoliday = createMockHoliday(validHolidayData);
      mockQuery.mockResolvedValue({ rows: [mockHoliday] });

      const result = await service.createHoliday(validHolidayData, orgId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.company_holiday'),
        expect.arrayContaining([
          orgId,
          'Independence Day',
          '2025-07-04',
          true,
          true,
          true,
          userId
        ]),
        orgId,
        expect.any(Object)
      );
      expect(result).toEqual(mockHoliday);
      expect(result.holidayName).toBe('Independence Day');
      expect(result.isRecurring).toBe(true);
    });

    it('should create holiday with defaults', async () => {
      const minimalData = {
        holidayName: 'Special Day',
        holidayDate: '2025-06-15'
      };
      const mockHoliday = createMockHoliday({
        ...minimalData,
        isRecurring: false,
        affectsPaySchedule: true,
        affectsWorkSchedule: true
      });
      mockQuery.mockResolvedValue({ rows: [mockHoliday] });

      const result = await service.createHoliday(minimalData, orgId, userId);

      expect(result.holidayName).toBe('Special Day');
      expect(result.isRecurring).toBe(false);
    });

    it('should throw ValidationError for missing holiday name', async () => {
      const invalidData = {
        holidayDate: '2025-07-04'
      };

      await expect(
        service.createHoliday(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid date format', async () => {
      const invalidData = {
        holidayName: 'Bad Date Holiday',
        holidayDate: 'invalid-date'
      };

      await expect(
        service.createHoliday(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for holiday name too long', async () => {
      const invalidData = {
        holidayName: 'A'.repeat(101),
        holidayDate: '2025-07-04'
      };

      await expect(
        service.createHoliday(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteHoliday', () => {
    const holidayId = '456e7890-e12b-34c5-d678-901234567890';

    it('should soft delete holiday successfully', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: holidayId }] });

      const result = await service.deleteHoliday(holidayId, orgId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.company_holiday'),
        [holidayId, orgId],
        orgId,
        expect.any(Object)
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundError when holiday not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        service.deleteHoliday(holidayId, orgId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(
        service.deleteHoliday(holidayId, orgId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('Helper Methods', () => {
    it('should add days correctly', () => {
      const date = new Date('2025-01-15T00:00:00Z');
      const result = service.addDays(date, 10);
      
      expect(result.getUTCDate()).toBe(25);
      expect(result.getUTCMonth()).toBe(0); // January
    });

    it('should format date to ISO string', () => {
      const date = new Date('2025-03-15T14:30:00Z');
      const result = service.formatDate(date);
      
      expect(result).toBe('2025-03-15');
    });
  });
});

