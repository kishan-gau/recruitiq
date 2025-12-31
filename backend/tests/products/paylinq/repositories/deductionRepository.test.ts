/**
 * DeductionRepository Test Suite
 * 
 * Tests for PayLinQ employee deduction repository following TESTING_STANDARDS.md:
 * - ES modules with @jest/globals  
 * - Database query mocking via dependency injection
 * - Valid UUID v4 formats
 * - Multi-tenant isolation validation
 * - Data layer operations coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import DeductionRepository from '../../../../src/products/paylinq/repositories/deductionRepository.js';

describe('DeductionRepository', () => {
  let repository: any;
  let mockQuery: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testEmployeeId = '223e4567-e89b-12d3-a456-426614174001';
  const testDeductionId = '323e4567-e89b-12d3-a456-426614174002';
  const testUserId = '423e4567-e89b-12d3-a456-426614174003';

  /**
   * Helper to create DB format employee deduction (snake_case)
   */
  const createDbDeduction = (overrides: any = {}) => ({
    id: testDeductionId,
    organization_id: testOrganizationId,
    employee_id: testEmployeeId,
    deduction_type: 'benefit',
    deduction_name: 'Health Insurance',
    deduction_code: 'HEALTH',
    calculation_type: 'fixed_amount',
    deduction_amount: 150.00,
    deduction_percentage: null,
    max_per_payroll: null,
    max_annual: 3600.00,
    is_pre_tax: true,
    is_recurring: true,
    frequency: 'per_payroll',
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    is_active: true,
    priority: 1,
    notes: 'Monthly health insurance deduction',
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    created_by: testUserId,
    updated_by: testUserId,
    deleted_at: null,
    deleted_by: null,
    ...overrides
  });

  beforeEach(() => {
    // Create mock query function
    mockQuery = jest.fn();
    
    // Inject mock via constructor (dependency injection)
    repository = new DeductionRepository({ query: mockQuery });
  });

  // ==================== CREATE EMPLOYEE DEDUCTION ====================

  describe('createEmployeeDeduction', () => {
    it('should create employee deduction with all fields', async () => {
      const deductionData = {
        employeeId: testEmployeeId,
        deductionType: 'benefit',
        deductionName: 'Health Insurance',
        deductionCode: 'HEALTH',
        calculationType: 'fixed_amount',
        deductionAmount: 150.00,
        deductionPercentage: null,
        maxPerPayroll: null,
        maxAnnual: 3600.00,
        isPreTax: true,
        isRecurring: true,
        frequency: 'per_payroll',
        effectiveFrom: new Date('2025-01-01'),
        effectiveTo: null,
        isActive: true,
        priority: 1,
        notes: 'Monthly health insurance'
      };

      const dbDeduction = createDbDeduction();
      mockQuery.mockResolvedValue({ rows: [dbDeduction] });

      const result = await repository.createEmployeeDeduction(
        deductionData,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual(dbDeduction);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.employee_deduction'),
        [
          testOrganizationId,
          testEmployeeId,
          'benefit',
          'Health Insurance',
          'HEALTH',
          'fixed_amount',
          150.00,
          null,
          null,
          3600.00,
          true,
          true,
          'per_payroll',
          deductionData.effectiveFrom,
          null,
          true,
          1,
          'Monthly health insurance',
          testUserId
        ],
        testOrganizationId,
        expect.objectContaining({ 
          operation: 'INSERT', 
          table: 'payroll.employee_deduction',
          userId: testUserId
        })
      );
    });

    it('should apply default values for optional fields', async () => {
      const minimalData = {
        employeeId: testEmployeeId,
        deductionType: 'loan',
        deductionName: 'Personal Loan',
        deductionCode: 'LOAN01',
        calculationType: 'fixed_amount',
        deductionAmount: 100.00,
        effectiveFrom: new Date('2025-01-01')
      };

      mockQuery.mockResolvedValue({ rows: [createDbDeduction()] });

      await repository.createEmployeeDeduction(
        minimalData,
        testOrganizationId,
        testUserId
      );

      // Verify defaults: isPreTax=false, isRecurring=true, frequency='per_payroll', isActive=true, priority=1
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          false, // isPreTax default
          true,  // isRecurring default
          'per_payroll', // frequency default
          true,  // isActive default
          1      // priority default
        ]),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should return RETURNING * fields', async () => {
      const dbDeduction = createDbDeduction();
      mockQuery.mockResolvedValue({ rows: [dbDeduction] });

      const result = await repository.createEmployeeDeduction(
        { employeeId: testEmployeeId, deductionType: 'benefit' },
        testOrganizationId,
        testUserId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('RETURNING *'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(result).toEqual(dbDeduction);
    });
  });

  // ==================== FIND EMPLOYEE DEDUCTIONS ====================

  describe('findEmployeeDeductions', () => {
    it('should find deductions by employeeId with organization isolation', async () => {
      const dbDeductions = [
        createDbDeduction(),
        createDbDeduction({ 
          id: '523e4567-e89b-12d3-a456-426614174005',
          deduction_code: 'DENTAL'
        })
      ];

      mockQuery.mockResolvedValue({ rows: dbDeductions });

      const result = await repository.findEmployeeDeductions(
        { employeeId: testEmployeeId },
        testOrganizationId
      );

      expect(result).toEqual(dbDeductions);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ed.organization_id = $1'),
        expect.arrayContaining([testOrganizationId, testEmployeeId]),
        testOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by deductionType', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findEmployeeDeductions(
        { deductionType: 'benefit' },
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND ed.deduction_type = $2'),
        [testOrganizationId, 'benefit'],
        testOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by deductionCode', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findEmployeeDeductions(
        { deductionCode: 'HEALTH' },
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND ed.deduction_code = $2'),
        [testOrganizationId, 'HEALTH'],
        testOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by isActive flag', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findEmployeeDeductions(
        { isActive: true },
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND ed.is_active = $2'),
        [testOrganizationId, true],
        testOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by isPreTax flag', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findEmployeeDeductions(
        { isPreTax: true },
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND ed.is_pre_tax = $2'),
        [testOrganizationId, true],
        testOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by effective date', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const effectiveDate = new Date('2025-06-15');

      await repository.findEmployeeDeductions(
        { effectiveDate },
        testOrganizationId
      );

      // Note: effectiveDate is used twice in the query
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND ed.effective_from <= $'),
        expect.arrayContaining([testOrganizationId, effectiveDate, effectiveDate]),
        testOrganizationId,
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND (ed.effective_to IS NULL OR ed.effective_to >= $'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should exclude soft deleted records', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findEmployeeDeductions({}, testOrganizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND ed.deleted_at IS NULL'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should order by priority and deduction_name', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findEmployeeDeductions({}, testOrganizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY ed.priority ASC, ed.deduction_name ASC'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // ==================== FIND BY ID ====================

  describe('findEmployeeDeductionById', () => {
    it('should find deduction by ID with employee JOIN', async () => {
      const dbDeduction = {
        ...createDbDeduction(),
        employee_number: 'EMP001',
        first_name: 'John',
        last_name: 'Doe'
      };

      mockQuery.mockResolvedValue({ rows: [dbDeduction] });

      const result = await repository.findEmployeeDeductionById(
        testDeductionId,
        testOrganizationId
      );

      expect(result).toEqual(dbDeduction);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN hris.employee e ON e.id = ed.employee_id'),
        [testDeductionId, testOrganizationId],
        testOrganizationId,
        expect.objectContaining({ 
          operation: 'SELECT', 
          table: 'payroll.employee_deduction'
        })
      );
    });

    it('should filter by ID and organization_id', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findEmployeeDeductionById(
        testDeductionId,
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ed.id = $1 AND ed.organization_id = $2'),
        [testDeductionId, testOrganizationId],
        testOrganizationId,
        expect.any(Object)
      );
    });

    it('should return null when deduction not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findEmployeeDeductionById(
        testDeductionId,
        testOrganizationId
      );

      expect(result).toBeNull();
    });

    it('should exclude soft deleted records', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findEmployeeDeductionById(
        testDeductionId,
        testOrganizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND ed.deleted_at IS NULL'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // ==================== UPDATE EMPLOYEE DEDUCTION ====================

  describe('updateEmployeeDeduction', () => {
    it('should update deduction with valid fields', async () => {
      const updates = {
        deduction_amount: 200.00,
        max_annual: 4800.00,
        notes: 'Updated deduction amount'
      };

      const updatedDeduction = createDbDeduction(updates);
      mockQuery.mockResolvedValue({ rows: [updatedDeduction] });

      const result = await repository.updateEmployeeDeduction(
        testDeductionId,
        updates,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual(updatedDeduction);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.employee_deduction'),
        expect.arrayContaining([200.00, 4800.00, 'Updated deduction amount', testUserId]),
        testOrganizationId,
        expect.objectContaining({ 
          operation: 'UPDATE', 
          table: 'payroll.employee_deduction',
          userId: testUserId
        })
      );
    });

    it('should include updated_by and updated_at in SET clause', async () => {
      mockQuery.mockResolvedValue({ rows: [createDbDeduction()] });

      await repository.updateEmployeeDeduction(
        testDeductionId,
        { deduction_amount: 175.00 },
        testOrganizationId,
        testUserId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('updated_by = $'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should filter by ID and organization_id', async () => {
      mockQuery.mockResolvedValue({ rows: [createDbDeduction()] });

      await repository.updateEmployeeDeduction(
        testDeductionId,
        { deduction_amount: 175.00 },
        testOrganizationId,
        testUserId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/WHERE id = \$\d+ AND organization_id = \$\d+/),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should throw error when no valid fields to update', async () => {
      const invalidUpdates = {
        invalid_field: 'value',
        another_invalid: 123
      };

      await expect(
        repository.updateEmployeeDeduction(
          testDeductionId,
          invalidUpdates,
          testOrganizationId,
          testUserId
        )
      ).rejects.toThrow('No valid fields to update');
    });

    it('should only allow whitelisted fields', async () => {
      const mixedUpdates = {
        deduction_amount: 200.00,
        organization_id: 'malicious-org-id', // Should be ignored
        employee_id: 'malicious-emp-id', // Should be ignored
        notes: 'Valid note'
      };

      mockQuery.mockResolvedValue({ rows: [createDbDeduction()] });

      await repository.updateEmployeeDeduction(
        testDeductionId,
        mixedUpdates,
        testOrganizationId,
        testUserId
      );

      // Verify only whitelisted fields in SET clause
      const call = mockQuery.mock.calls[0];
      const query = call[0];
      const setClauseMatch = query.match(/SET (.*?) WHERE/s);
      const setClause = setClauseMatch ? setClauseMatch[1] : '';
      
      expect(setClause).toContain('deduction_amount = $');
      expect(setClause).toContain('notes = $');
      expect(setClause).not.toContain('organization_id = $');
      expect(setClause).not.toContain('employee_id = $');
    });
  });

  // ==================== DEACTIVATE DEDUCTION ====================

  describe('deactivateEmployeeDeduction', () => {
    it('should deactivate employee deduction', async () => {
      const deactivatedDeduction = createDbDeduction({
        is_active: false,
        effective_to: new Date('2025-06-30')
      });

      mockQuery.mockResolvedValue({ rows: [deactivatedDeduction] });

      const result = await repository.deactivateEmployeeDeduction(
        testDeductionId,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual(deactivatedDeduction);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.employee_deduction'),
        [testUserId, testDeductionId, testOrganizationId],
        testOrganizationId,
        expect.objectContaining({ 
          operation: 'UPDATE', 
          table: 'payroll.employee_deduction',
          userId: testUserId
        })
      );
    });

    it('should set is_active to false', async () => {
      mockQuery.mockResolvedValue({ rows: [createDbDeduction()] });

      await repository.deactivateEmployeeDeduction(
        testDeductionId,
        testOrganizationId,
        testUserId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET is_active = false'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should set effective_to to CURRENT_DATE', async () => {
      mockQuery.mockResolvedValue({ rows: [createDbDeduction()] });

      await repository.deactivateEmployeeDeduction(
        testDeductionId,
        testOrganizationId,
        testUserId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('effective_to = CURRENT_DATE'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should update updated_by and updated_at', async () => {
      mockQuery.mockResolvedValue({ rows: [createDbDeduction()] });

      await repository.deactivateEmployeeDeduction(
        testDeductionId,
        testOrganizationId,
        testUserId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('updated_by = $1'),
        [testUserId, testDeductionId, testOrganizationId],
        expect.any(String),
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // ==================== SOFT DELETE ====================

  describe('softDeleteEmployeeDeduction', () => {
    it('should soft delete employee deduction', async () => {
      const deletedDeduction = createDbDeduction({
        deleted_at: new Date(),
        deleted_by: testUserId,
        is_active: false
      });

      mockQuery.mockResolvedValue({ rows: [deletedDeduction] });

      const result = await repository.softDeleteEmployeeDeduction(
        testDeductionId,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual(deletedDeduction);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.employee_deduction'),
        [testUserId, testDeductionId, testOrganizationId],
        testOrganizationId,
        expect.objectContaining({ 
          operation: 'DELETE',
          userId: testUserId
        })
      );
    });

    it('should set deleted_at and deleted_by', async () => {
      mockQuery.mockResolvedValue({ rows: [createDbDeduction()] });

      await repository.softDeleteEmployeeDeduction(
        testDeductionId,
        testOrganizationId,
        testUserId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET deleted_at = NOW()'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('deleted_by = $1'),
        [testUserId, testDeductionId, testOrganizationId],
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should also set is_active to false', async () => {
      mockQuery.mockResolvedValue({ rows: [createDbDeduction()] });

      await repository.softDeleteEmployeeDeduction(
        testDeductionId,
        testOrganizationId,
        testUserId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = false'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should return undefined when deduction not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.softDeleteEmployeeDeduction(
        testDeductionId,
        testOrganizationId,
        testUserId
      );

      expect(result).toBeUndefined();
    });

    it('should filter by ID and organization_id', async () => {
      mockQuery.mockResolvedValue({ rows: [createDbDeduction()] });

      await repository.softDeleteEmployeeDeduction(
        testDeductionId,
        testOrganizationId,
        testUserId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/WHERE id = \$\d+ AND organization_id = \$\d+/),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should use RETURNING * to return deleted record', async () => {
      const deletedDeduction = createDbDeduction();
      mockQuery.mockResolvedValue({ rows: [deletedDeduction] });

      const result = await repository.softDeleteEmployeeDeduction(
        testDeductionId,
        testOrganizationId,
        testUserId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('RETURNING *'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(result).toEqual(deletedDeduction);
    });
  });

  // ==================== CONSTRUCTOR & DEPENDENCY INJECTION ====================

  describe('constructor', () => {
    it('should create repository without database parameter', () => {
      const repo = new DeductionRepository();
      expect(repo).toBeDefined();
    });

    it('should accept custom database via DI', () => {
      const customQuery = jest.fn();
      const repo = new DeductionRepository({ query: customQuery });
      expect(repo.query).toBe(customQuery);
    });
  });
});
