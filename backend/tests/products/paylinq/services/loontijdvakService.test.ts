/**
 * LoontijdvakService Test Suite
 * 
 * Tests for PayLinQ Loontijdvak (wage period) service following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Dependency injection pattern
 * - Comprehensive service method coverage
 * - Validation of Surinamese wage period calculations
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import LoontijdvakService from '../../../../src/products/paylinq/services/loontijdvakService.js';

describe('LoontijdvakService', () => {
  let service: any;

  beforeEach(() => {
    service = new LoontijdvakService();
  });

  describe('getPeriodsPerYear', () => {
    it('should return 364 for daily loontijdvak', () => {
      const result = service.getPeriodsPerYear('daily');
      expect(result).toBe(364);
    });

    it('should return 52 for weekly loontijdvak', () => {
      const result = service.getPeriodsPerYear('weekly');
      expect(result).toBe(52);
    });

    it('should return 12 for monthly loontijdvak', () => {
      const result = service.getPeriodsPerYear('monthly');
      expect(result).toBe(12);
    });

    it('should return 1 for yearly loontijdvak', () => {
      const result = service.getPeriodsPerYear('yearly');
      expect(result).toBe(1);
    });

    it('should throw error for invalid loontijdvak type', () => {
      expect(() => service.getPeriodsPerYear('invalid'))
        .toThrow('Invalid loontijdvak type: invalid');
    });
  });

  describe('getLoontijdvakFraction', () => {
    it('should calculate daily fraction (1/364)', () => {
      const result = service.getLoontijdvakFraction('daily');
      expect(result).toBeCloseTo(1 / 364, 6);
    });

    it('should calculate weekly fraction (1/52)', () => {
      const result = service.getLoontijdvakFraction('weekly');
      expect(result).toBeCloseTo(1 / 52, 6);
    });

    it('should calculate monthly fraction (1/12)', () => {
      const result = service.getLoontijdvakFraction('monthly');
      expect(result).toBeCloseTo(1 / 12, 6);
    });

    it('should calculate yearly fraction (1/1)', () => {
      const result = service.getLoontijdvakFraction('yearly');
      expect(result).toBe(1.0);
    });

    it('should throw error for invalid loontijdvak type', () => {
      expect(() => service.getLoontijdvakFraction('invalid'))
        .toThrow('Invalid loontijdvak type');
    });
  });

  describe('prorateAnnualAmount', () => {
    it('should prorate annual amount to monthly', () => {
      const result = service.prorateAnnualAmount(108000, 'monthly');
      expect(result).toBe(9000); // 108000 / 12
    });

    it('should prorate annual amount to weekly', () => {
      const result = service.prorateAnnualAmount(108000, 'weekly');
      expect(result).toBeCloseTo(2076.92, 2); // 108000 / 52
    });

    it('should prorate annual amount to daily', () => {
      const result = service.prorateAnnualAmount(108000, 'daily');
      expect(result).toBeCloseTo(296.70, 2); // 108000 / 364
    });

    it('should return same amount for yearly', () => {
      const result = service.prorateAnnualAmount(108000, 'yearly');
      expect(result).toBe(108000);
    });

    it('should round to 2 decimal places', () => {
      const result = service.prorateAnnualAmount(1000, 'weekly');
      expect(result).toBe(19.23); // 1000 / 52 = 19.230769...
    });

    it('should throw error for negative amount', () => {
      expect(() => service.prorateAnnualAmount(-1000, 'monthly'))
        .toThrow('Annual amount must be a non-negative number');
    });

    it('should throw error for non-numeric amount', () => {
      expect(() => service.prorateAnnualAmount('invalid' as any, 'monthly'))
        .toThrow('Annual amount must be a non-negative number');
    });

    it('should handle zero amount', () => {
      const result = service.prorateAnnualAmount(0, 'monthly');
      expect(result).toBe(0);
    });
  });

  describe('constructor', () => {
    it('should create service without repository', () => {
      const testService = new LoontijdvakService();
      expect(testService).toBeDefined();
      expect(testService.repository).toBeNull();
    });

    it('should accept custom repository via DI', () => {
      const mockRepo = { someMethod: () => {} };
      const testService = new LoontijdvakService(mockRepo);
      expect(testService.repository).toBe(mockRepo);
    });
  });

  describe('edge cases', () => {
    it('should handle very large annual amounts', () => {
      const result = service.prorateAnnualAmount(10000000, 'monthly');
      expect(result).toBe(833333.33);
    });

    it('should handle very small annual amounts', () => {
      const result = service.prorateAnnualAmount(0.12, 'monthly');
      expect(result).toBe(0.01);
    });

    it('should handle fractional annual amounts', () => {
      const result = service.prorateAnnualAmount(12345.67, 'monthly');
      expect(result).toBe(1028.81); // 12345.67 / 12
    });
  });

  describe('Surinamese wage period compliance', () => {
    it('should use 364-day year for daily calculations', () => {
      // Article 13.3a: 364 days = 52 weeks × 7
      const daysPerYear = service.getPeriodsPerYear('daily');
      expect(daysPerYear).toBe(364);
      expect(daysPerYear).toBe(52 * 7);
    });

    it('should use 52-week year for weekly calculations', () => {
      // Article 13.3a: 52 weeks
      const weeksPerYear = service.getPeriodsPerYear('weekly');
      expect(weeksPerYear).toBe(52);
    });

    it('should use 12-month year for monthly calculations', () => {
      // Article 13.3b: 12 months
      const monthsPerYear = service.getPeriodsPerYear('monthly');
      expect(monthsPerYear).toBe(12);
    });

    it('should correctly calculate tax-free allowance proration', () => {
      // Example: Tax-free allowance of SRD 108,000 per year
      const annualAllowance = 108000;
      
      const monthlyAllowance = service.prorateAnnualAmount(annualAllowance, 'monthly');
      const weeklyAllowance = service.prorateAnnualAmount(annualAllowance, 'weekly');
      const dailyAllowance = service.prorateAnnualAmount(annualAllowance, 'daily');

      expect(monthlyAllowance).toBe(9000);
      expect(weeklyAllowance).toBeCloseTo(2076.92, 2);
      expect(dailyAllowance).toBeCloseTo(296.70, 2);
    });
  });
});
