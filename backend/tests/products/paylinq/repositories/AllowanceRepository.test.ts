/**
 * AllowanceRepository Test Suite
 * 
 * Tests for PayLinQ allowance repository following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals  
 * - Database query mocking via dependency injection
 * - Valid UUID v4 formats
 * - Multi-tenant isolation validation
 * - Data layer operations coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import AllowanceRepository from '../../../../src/products/paylinq/repositories/AllowanceRepository.js';

describe('AllowanceRepository', () => {
  let repository: any;
  let mockQuery: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testEmployeeId = '223e4567-e89b-12d3-a456-426614174001';
  const testAllowanceId = '323e4567-e89b-12d3-a456-426614174002';

  /**
   * Helper to create DB format allowance (snake_case)
   */
  const createDbAllowance = (overrides: any = {}) => ({
    id: testAllowanceId,
    organization_id: testOrganizationId,
    allowance_type: 'tax_free_sum_monthly',
    allowance_name: 'Tax Free Sum',
    country: 'SR',
    state: null,
    amount: 1500.00,
    is_percentage: false,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    is_active: true,
    description: 'Monthly tax-free allowance',
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    ...overrides
  });

  /**
   * Helper to create DB format allowance usage record
   */
  const createDbAllowanceUsage = (overrides: any = {}) => ({
    id: testAllowanceId,
    organization_id: testOrganizationId,
    employee_id: testEmployeeId,
    allowance_type: 'holiday_allowance',
    calendar_year: 2025,
    amount_used: 5000.00,
    amount_remaining: 3000.00,
    last_updated: new Date('2025-01-15'),
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-15'),
    ...overrides
  });

  beforeEach(() => {
    // Create mock query function with proper structure
    mockQuery = jest.fn();
    
    // Inject mock via constructor (dependency injection)
    repository = new AllowanceRepository({ query: mockQuery });
  });

  // ==================== FIND ACTIVE ALLOWANCE ====================

  describe('findActiveAllowanceByType', () => {
    it('should find active allowance by type with organization isolation', async () => {
      const effectiveDate = new Date('2025-06-15');
      const dbAllowance = createDbAllowance({
        allowance_type: 'tax_free_sum_monthly'
      });

      mockQuery.mockResolvedValue({ rows: [dbAllowance] });

      const result = await repository.findActiveAllowanceByType(
        'tax_free_sum_monthly',
        effectiveDate,
        testOrganizationId
      );

      expect(result).toEqual(dbAllowance);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.allowance'),
        [testOrganizationId, 'tax_free_sum_monthly', effectiveDate],
        testOrganizationId,
        expect.objectContaining({ 
          operation: 'SELECT', 
          table: 'payroll.allowance',
          method: 'findActiveAllowanceByType'
        })
      );
    });

    it('should filter by organization_id', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findActiveAllowanceByType(
        'tax_free_sum_monthly',
        new Date(),
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should filter by effective date range', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findActiveAllowanceByType(
        'tax_free_sum_monthly',
        new Date('2025-06-15'),
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND effective_from <= $3'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND (effective_to IS NULL OR effective_to >= $3)'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should filter by is_active flag', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findActiveAllowanceByType(
        'tax_free_sum_monthly',
        new Date(),
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND is_active = true'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should filter out soft deleted records', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findActiveAllowanceByType(
        'tax_free_sum_monthly',
        new Date(),
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND deleted_at IS NULL'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should return null when no active allowance found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findActiveAllowanceByType(
        'tax_free_sum_monthly',
        new Date(),
        testOrganizationId
      );

      expect(result).toBeNull();
    });

    it('should throw error when organizationId is missing', async () => {
      await expect(
        repository.findActiveAllowanceByType('tax_free_sum_monthly', new Date(), null)
      ).rejects.toThrow('organizationId is required for tenant isolation');
    });

    it('should order by effective_from DESC and limit to 1 result', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findActiveAllowanceByType(
        'tax_free_sum_monthly',
        new Date(),
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY effective_from DESC'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // ==================== EMPLOYEE ALLOWANCE USAGE ====================

  describe('getEmployeeAllowanceUsage', () => {
    it('should get employee allowance usage with organization isolation', async () => {
      const dbUsage = createDbAllowanceUsage();
      mockQuery.mockResolvedValue({ rows: [dbUsage] });

      const result = await repository.getEmployeeAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        2025,
        testOrganizationId
      );

      expect(result).toEqual(dbUsage);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.employee_allowance_usage'),
        [testOrganizationId, testEmployeeId, 'holiday_allowance', 2025],
        testOrganizationId,
        expect.objectContaining({ 
          operation: 'SELECT', 
          table: 'payroll.employee_allowance_usage',
          method: 'getEmployeeAllowanceUsage'
        })
      );
    });

    it('should filter by all required fields', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.getEmployeeAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        2025,
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND employee_id = $2'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND allowance_type = $3'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND calendar_year = $4'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should return null when no usage record found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getEmployeeAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        2025,
        testOrganizationId
      );

      expect(result).toBeNull();
    });

    it('should throw error when organizationId is missing', async () => {
      await expect(
        repository.getEmployeeAllowanceUsage(testEmployeeId, 'holiday_allowance', 2025, null)
      ).rejects.toThrow('organizationId is required for tenant isolation');
    });
  });

  // ==================== RECORD ALLOWANCE USAGE ====================

  describe('recordAllowanceUsage', () => {
    it('should insert new allowance usage record', async () => {
      const dbUsage = createDbAllowanceUsage({
        amount_used: 2000.00
      });

      mockQuery.mockResolvedValue({ rows: [dbUsage] });

      const result = await repository.recordAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        2000.00,
        2025,
        testOrganizationId
      );

      expect(result).toEqual(dbUsage);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.employee_allowance_usage'),
        [testOrganizationId, testEmployeeId, 'holiday_allowance', 2025, 2000.00],
        testOrganizationId,
        expect.objectContaining({ 
          operation: 'INSERT', 
          table: 'payroll.employee_allowance_usage',
          method: 'recordAllowanceUsage'
        })
      );
    });

    it('should use ON CONFLICT for upsert behavior', async () => {
      mockQuery.mockResolvedValue({ rows: [createDbAllowanceUsage()] });

      await repository.recordAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        1000.00,
        2025,
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (employee_id, allowance_type, calendar_year)'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DO UPDATE SET'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should add to existing amount_used on conflict', async () => {
      mockQuery.mockResolvedValue({ rows: [createDbAllowanceUsage()] });

      await repository.recordAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        1000.00,
        2025,
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('amount_used = payroll.employee_allowance_usage.amount_used + EXCLUDED.amount_used'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should update last_updated timestamp', async () => {
      mockQuery.mockResolvedValue({ rows: [createDbAllowanceUsage()] });

      await repository.recordAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        1000.00,
        2025,
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('last_updated = NOW()'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should throw error when organizationId is missing', async () => {
      await expect(
        repository.recordAllowanceUsage(testEmployeeId, 'holiday_allowance', 1000.00, 2025, null)
      ).rejects.toThrow('organizationId is required for tenant isolation');
    });

    it('should return updated usage record', async () => {
      const expectedUsage = createDbAllowanceUsage({ amount_used: 6000.00 });
      mockQuery.mockResolvedValue({ rows: [expectedUsage] });

      const result = await repository.recordAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        1000.00,
        2025,
        testOrganizationId
      );

      expect(result).toEqual(expectedUsage);
    });
  });

  // ==================== GET ALL ALLOWANCES ====================

  describe('getAllAllowances', () => {
    it('should get all allowances for organization', async () => {
      const dbAllowances = [
        createDbAllowance({ allowance_type: 'tax_free_sum_monthly' }),
        createDbAllowance({ 
          id: '423e4567-e89b-12d3-a456-426614174003',
          allowance_type: 'holiday_allowance'
        })
      ];

      mockQuery.mockResolvedValue({ rows: dbAllowances });

      const result = await repository.getAllAllowances(testOrganizationId);

      expect(result).toEqual(dbAllowances);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.allowance'),
        [testOrganizationId],
        testOrganizationId,
        expect.objectContaining({ 
          operation: 'SELECT', 
          table: 'payroll.allowance',
          method: 'getAllAllowances'
        })
      );
    });

    it('should filter by organization_id', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.getAllAllowances(testOrganizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1'),
        [testOrganizationId],
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should filter out soft deleted records', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.getAllAllowances(testOrganizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND deleted_at IS NULL'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should order by allowance_type and effective_from', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.getAllAllowances(testOrganizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY allowance_type, effective_from DESC'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should throw error when organizationId is missing', async () => {
      await expect(
        repository.getAllAllowances(null)
      ).rejects.toThrow('organizationId is required for tenant isolation');
    });

    it('should return empty array when no allowances found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getAllAllowances(testOrganizationId);

      expect(result).toEqual([]);
    });
  });

  // ==================== RESET ALLOWANCE USAGE ====================

  describe('resetAllowanceUsage', () => {
    it('should reset allowance usage for specific employee and year', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      await repository.resetAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        2025,
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.employee_allowance_usage'),
        [testOrganizationId, testEmployeeId, 'holiday_allowance', 2025],
        testOrganizationId,
        expect.objectContaining({ 
          operation: 'UPDATE', 
          table: 'payroll.employee_allowance_usage',
          method: 'resetAllowanceUsage'
        })
      );
    });

    it('should set amount_used to 0', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      await repository.resetAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        2025,
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('amount_used = 0'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should set amount_remaining to NULL', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      await repository.resetAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        2025,
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('amount_remaining = NULL'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should update last_updated timestamp', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      await repository.resetAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        2025,
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('last_updated = NOW()'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should filter by all required fields', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      await repository.resetAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        2025,
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND employee_id = $2'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND allowance_type = $3'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND calendar_year = $4'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should throw error when organizationId is missing', async () => {
      await expect(
        repository.resetAllowanceUsage(testEmployeeId, 'holiday_allowance', 2025, null)
      ).rejects.toThrow('organizationId is required for tenant isolation');
    });
  });

  // ==================== CONSTRUCTOR & DEPENDENCY INJECTION ====================

  describe('constructor', () => {
    it('should create repository without database parameter', () => {
      const repo = new AllowanceRepository();
      expect(repo).toBeDefined();
    });

    it('should accept custom database via DI', () => {
      const customQuery = jest.fn();
      const repo = new AllowanceRepository({ query: customQuery });
      expect(repo.query).toBe(customQuery);
    });
  });
});
