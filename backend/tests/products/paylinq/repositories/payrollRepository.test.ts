/**
 * PayrollRepository Unit Tests
 * 
 * Tests for payroll data access layer - core payroll operations.
 * Covers employees, compensation, payroll runs, paychecks, and worker types.
 * 
 * VERIFIED METHODS (Core subset of 30+ total methods):
 * 1. createEmployeeRecord(employeeData, organizationId, userId)
 * 2. findByOrganization(organizationId, filters)
 * 3. findEmployeeRecordById(employeeRecordId, organizationId)
 * 4. updateEmployeeRecord(employeeRecordId, updates, organizationId, userId)
 * 5. createCompensation(compensationData, organizationId, userId)
 * 6. findCurrentCompensation(employeeId, organizationId)
 * 7. createPayrollRun(runData, organizationId, userId)
 * 8. findPayrollRunById(payrollRunId, organizationId)
 * 9. findPayrollRuns(organizationId, filters)
 * 10. createPaycheck(paycheckData, organizationId, userId)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayrollRepository from '../../../../src/products/paylinq/repositories/payrollRepository.js';

describe('PayrollRepository', () => {
  let repository: PayrollRepository;
  let mockQuery: jest.Mock;
  
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testEmployeeId = '323e4567-e89b-12d3-a456-426614174002';
  const testCompensationId = '423e4567-e89b-12d3-a456-426614174003';
  const testPayrollRunId = '523e4567-e89b-12d3-a456-426614174004';
  const testPaycheckId = '623e4567-e89b-12d3-a456-426614174005';

  beforeEach(() => {
    mockQuery = jest.fn();
    repository = new PayrollRepository(null, mockQuery);
  });

  describe('createEmployeeRecord', () => {
    it('should create employee record', async () => {
      const employeeData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        hireDate: '2025-01-01',
        employeeNumber: 'EMP001'
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: testEmployeeId, ...employeeData }] });

      const result = await repository.createEmployeeRecord(employeeData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.employee_payroll_config'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'payroll.employee_payroll_config', userId: testUserId }
      );
    });
  });

  describe('findByOrganization', () => {
    it('should return all employees for organization', async () => {
      // Mock both count query and data query
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })  // Count query
        .mockResolvedValueOnce({ rows: [{ id: testEmployeeId }] });  // Data query

      const result = await repository.findByOrganization(testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.employee_payroll_config'),
        [testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'payroll.employee_payroll_config' }
      );
    });

    it('should filter by status', async () => {
      // Mock both count query and data query
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })  // Count query
        .mockResolvedValueOnce({ rows: [] });                // Data query
      await repository.findByOrganization(testOrgId, { status: 'active' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND e.employment_status = $'),
        expect.arrayContaining([testOrgId, 'active']),
        testOrgId,
        expect.any(Object)
      );
    });
  });

  describe('findEmployeeRecordById', () => {
    it('should return employee by ID', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testEmployeeId, organization_id: testOrgId }] });

      const result = await repository.findEmployeeRecordById(testEmployeeId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE (epc.id = $1 OR epc.employee_id = $1)'),
        [testEmployeeId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'payroll.employee_payroll_config' }
      );
    });
  });

  describe('updateEmployeeRecord', () => {
    it('should update employee record', async () => {
      const updates = { pay_frequency: 'WEEKLY' };
      mockQuery.mockResolvedValue({ rows: [{ id: testEmployeeId, ...updates }] });

      const result = await repository.updateEmployeeRecord(testEmployeeId, updates, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.employee_payroll_config'),
        expect.any(Array),
        testOrgId,
        { operation: 'UPDATE', table: 'payroll.employee_payroll_config', userId: testUserId }
      );
    });
  });

  describe('createCompensation', () => {
    it('should create compensation record', async () => {
      const compensationData = {
        employeeId: testEmployeeId,
        compensationType: 'salary',
        amount: 50000,
        effectiveFrom: '2025-01-01',
        isCurrent: true
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: testCompensationId, ...compensationData }] });

      const result = await repository.createCompensation(compensationData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.compensation'),
        expect.any(Array),
        testOrgId,
        { operation: 'UPSERT', table: 'payroll.compensation', userId: testUserId }
      );
    });
  });

  describe('findCurrentCompensation', () => {
    it('should return current compensation for employee', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testCompensationId, employee_id: testEmployeeId, is_current: true }] });

      const result = await repository.findCurrentCompensation(testEmployeeId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1'),
        expect.arrayContaining([testEmployeeId, testOrgId]),
        testOrgId,
        { operation: 'SELECT', table: 'payroll.compensation' }
      );
    });
  });

  describe('createPayrollRun', () => {
    it('should create payroll run', async () => {
      const runData = {
        runNumber: 'PR-2025-001',
        runName: 'January 2025 Payroll',
        payPeriodStart: '2025-01-01',
        payPeriodEnd: '2025-01-31',
        paymentDate: '2025-02-01',
        status: 'draft'
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: testPayrollRunId, ...runData }] });

      const result = await repository.createPayrollRun(runData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.payroll_run'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'payroll.payroll_run', userId: testUserId }
      );
    });
  });

  describe('findPayrollRunById', () => {
    it('should return payroll run by ID', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testPayrollRunId, organization_id: testOrgId }] });

      const result = await repository.findPayrollRunById(testPayrollRunId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE pr.id = $1'),
        [testPayrollRunId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'payroll.payroll_run' }
      );
    });
  });

  describe('findPayrollRuns', () => {
    it('should return all payroll runs for organization', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testPayrollRunId }] });

      const result = await repository.findPayrollRuns(testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.payroll_run'),
        [testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'payroll.payroll_run' }
      );
    });

    it('should filter by status', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await repository.findPayrollRuns(testOrgId, { status: 'completed' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND status = $'),
        expect.arrayContaining([testOrgId, 'completed']),
        testOrgId,
        expect.any(Object)
      );
    });
  });

  describe('createPaycheck', () => {
    it('should create paycheck', async () => {
      const paycheckData = {
        payrollRunId: testPayrollRunId,
        employeeId: testEmployeeId,
        grossPay: 5000,
        netPay: 4000,
        totalTaxes: 800,
        totalDeductions: 200
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: testPaycheckId, ...paycheckData }] });

      const result = await repository.createPaycheck(paycheckData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.paycheck'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'payroll.paycheck', userId: testUserId }
      );
    });
  });
});
