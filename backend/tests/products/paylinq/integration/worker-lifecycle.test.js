/**
 * Worker Lifecycle - Integration Test
 * 
 * Tests the complete worker/employee lifecycle with real database:
 * 1. Worker Creation: Create worker with payroll configuration
 * 2. Worker Updates: Update worker information and compensation
 * 3. Payroll Inclusion: Include worker in payroll runs
 * 4. Worker Status Changes: Handle status transitions (active/inactive)
 * 5. Worker Termination: Properly terminate worker and handle final pay
 * 
 * This integration test validates that the employee management workflow
 * works correctly from onboarding through termination, including all
 * payroll-related operations.
 * 
 * Following TESTING_STANDARDS.md guidelines:
 * - Real database operations (no mocking)
 * - Complete lifecycle testing
 * - Status transition validation
 * - Proper cleanup in afterAll
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../../../src/config/database.js';
import { query } from '../../../../src/config/database.js';
import PayrollService from '../../../../src/products/paylinq/services/payrollService.js';
import TaxCalculationService from '../../../../src/products/paylinq/services/taxCalculationService.js';

describe('Worker Lifecycle - Integration Tests', () => {
  let organizationId;
  let userId;
  let workerId;
  let compensationId;
  let payrollRunId;
  let payrollService;
  let taxCalculationService;
  let taxRuleSetId;

  beforeAll(async () => {
    // Initialize services
    payrollService = new PayrollService();
    taxCalculationService = new TaxCalculationService();

    // Create test organization
    organizationId = uuidv4();
    await query(
      `INSERT INTO organizations (id, name, slug, tier)
       VALUES ($1, $2, $3, $4)`,
      [organizationId, 'Test Worker Lifecycle Org', 'test-worker-lifecycle', 'professional'],
      organizationId
    );

    // Create test user
    userId = uuidv4();
    await query(
      `INSERT INTO hris.user_account (id, organization_id, email, password_hash, full_name, user_type, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, organizationId, 'admin@testworker.com', 'hash', 'HR Admin', 'tenant', true],
      organizationId
    );

    // Setup basic tax rules for testing
    const taxRuleSetResult = await query(
      `INSERT INTO payroll.tax_rule_set (
        id, organization_id, tax_type, tax_name, country, effective_from,
        is_active, calculation_method, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        uuidv4(),
        organizationId,
        'wage',
        'Test Wage Tax',
        'SR',
        '2025-01-01',
        true,
        'bracket',
        userId
      ],
      organizationId
    );
    taxRuleSetId = taxRuleSetResult.rows[0].id;

    // Create simple tax bracket
    await query(
      `INSERT INTO payroll.tax_bracket (
        id, organization_id, tax_rule_set_id, bracket_order,
        income_min, income_max, rate_percentage, fixed_amount, created_by
      ) VALUES ($1, $2, $3, 1, 0, NULL, 10, 0, $4)`,
      [uuidv4(), organizationId, taxRuleSetId, userId],
      organizationId
    );
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await query('DELETE FROM payroll.paycheck WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM payroll.payroll_run WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM payroll.compensation WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM payroll.employee_payroll_config WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM hris.employee WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM payroll.tax_bracket WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM payroll.tax_rule_set WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM hris.user_account WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM organizations WHERE id = $1', [organizationId], organizationId);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    await pool.end();
  });

  // ==================== WORKER CREATION ====================

  describe('Worker Creation', () => {
    it('should create a new worker with complete information', async () => {
      // Arrange
      const workerData = {
        employeeNumber: 'WKR-001',
        firstName: 'Alice',
        lastName: 'Worker',
        email: 'alice.worker@test.com',
        hireDate: '2025-01-01',
        phone: '+597-123-4567',
        dateOfBirth: '1990-05-15',
        // Payroll configuration
        payFrequency: 'monthly',
        paymentMethod: 'ach',
        currency: 'SRD',
        status: 'active'
      };

      // Act
      const result = await payrollService.createEmployeeRecord(
        workerData,
        organizationId,
        userId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.employee).toBeDefined();
      expect(result.employee.id).toBeDefined();
      expect(result.employee.employeeNumber).toBe('WKR-001');
      expect(result.employee.email).toBe('alice.worker@test.com');
      
      // Store worker ID for subsequent tests
      workerId = result.employee.id;
    });

    it('should verify worker exists in HRIS schema', async () => {
      // Act
      const result = await query(
        `SELECT * FROM hris.employee 
         WHERE id = $1 AND organization_id = $2`,
        [workerId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(1);
      const employee = result.rows[0];
      expect(employee.employee_number).toBe('WKR-001');
      expect(employee.first_name).toBe('Alice');
      expect(employee.last_name).toBe('Worker');
      expect(employee.email).toBe('alice.worker@test.com');
      expect(employee.employment_status).toBe('active');
    });

    it('should verify payroll configuration exists', async () => {
      // Act
      const result = await query(
        `SELECT * FROM payroll.employee_payroll_config 
         WHERE employee_id = $1 AND organization_id = $2`,
        [workerId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(1);
      const config = result.rows[0];
      expect(config.pay_frequency).toBe('monthly');
      expect(config.payment_method).toBe('ach');
      expect(config.currency).toBe('SRD');
      expect(config.payroll_status).toBe('active');
    });
  });

  // ==================== COMPENSATION SETUP ====================

  describe('Compensation Setup', () => {
    it('should create initial compensation for worker', async () => {
      // Arrange
      const compensationData = {
        employeeRecordId: workerId,
        effectiveDate: '2025-01-01',
        amount: 6000,
        currency: 'SRD',
        payFrequency: 'monthly',
        compensationType: 'base_salary'
      };

      // Act
      const result = await payrollService.createCompensation(
        compensationData,
        organizationId,
        userId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.compensation).toBeDefined();
      expect(result.compensation.id).toBeDefined();
      expect(parseFloat(result.compensation.amount)).toBe(6000);
      expect(result.compensation.currency).toBe('SRD');
      
      // Store compensation ID
      compensationId = result.compensation.id;
    });

    it('should retrieve current compensation', async () => {
      // Act
      const result = await payrollService.getCurrentCompensation(
        workerId,
        organizationId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.compensation).toBeDefined();
      expect(parseFloat(result.compensation.amount)).toBe(6000);
      expect(result.compensation.isActive).toBe(true);
    });

    it('should retrieve compensation history', async () => {
      // Act
      const result = await payrollService.getCompensationHistory(
        workerId,
        organizationId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.compensations).toBeDefined();
      expect(result.compensations.length).toBe(1);
      expect(parseFloat(result.compensations[0].amount)).toBe(6000);
    });
  });

  // ==================== WORKER UPDATES ====================

  describe('Worker Updates', () => {
    it('should update worker personal information', async () => {
      // Arrange
      const updates = {
        phone: '+597-999-8888',
        email: 'alice.updated@test.com'
      };

      // Act
      const result = await payrollService.updateEmployeeRecord(
        workerId,
        updates,
        organizationId,
        userId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.employee).toBeDefined();
      expect(result.employee.email).toBe('alice.updated@test.com');
    });

    it('should verify updates persisted in database', async () => {
      // Act
      const result = await query(
        `SELECT email, phone FROM hris.employee 
         WHERE id = $1 AND organization_id = $2`,
        [workerId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].email).toBe('alice.updated@test.com');
      expect(result.rows[0].phone).toBe('+597-999-8888');
    });

    it('should update compensation with raise', async () => {
      // Arrange
      const updates = {
        amount: 7000, // Raise from 6000 to 7000
        effectiveDate: '2025-02-01'
      };

      // Act
      const result = await payrollService.updateCompensation(
        compensationId,
        updates,
        organizationId,
        userId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.compensation).toBeDefined();
      expect(parseFloat(result.compensation.amount)).toBe(7000);
    });

    it('should track compensation history after raise', async () => {
      // Act
      const result = await payrollService.getCompensationHistory(
        workerId,
        organizationId
      );

      // Assert
      expect(result.compensations).toBeDefined();
      expect(result.compensations.length).toBeGreaterThanOrEqual(1);
      
      // Most recent compensation should be 7000
      const currentComp = result.compensations.find(c => c.isActive);
      expect(parseFloat(currentComp.amount)).toBe(7000);
    });
  });

  // ==================== PAYROLL INCLUSION ====================

  describe('Payroll Inclusion', () => {
    it('should include worker in payroll run', async () => {
      // Arrange - Create payroll run
      const runData = {
        payPeriodStart: '2025-02-01',
        payPeriodEnd: '2025-02-28',
        payDate: '2025-03-05',
        runType: 'regular',
        status: 'draft',
        description: 'February 2025 Payroll'
      };

      const payrollResult = await payrollService.createPayrollRun(
        runData,
        organizationId,
        userId
      );
      payrollRunId = payrollResult.payrollRun.id;

      // Act - Calculate payroll
      const result = await payrollService.calculatePayroll(
        payrollRunId,
        organizationId,
        userId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.paychecks).toBeDefined();
      expect(result.paychecks.length).toBe(1); // Only one worker
    });

    it('should create paycheck for worker with correct calculations', async () => {
      // Act
      const result = await query(
        `SELECT * FROM payroll.paycheck 
         WHERE payroll_run_id = $1 AND employee_id = $2 AND organization_id = $3`,
        [payrollRunId, workerId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(1);
      const paycheck = result.rows[0];
      
      expect(parseFloat(paycheck.gross_pay)).toBe(7000); // Updated compensation
      expect(parseFloat(paycheck.tax_deductions)).toBeGreaterThan(0); // 10% tax
      expect(parseFloat(paycheck.tax_deductions)).toBeCloseTo(700, 0); // ~10% of 7000
      expect(parseFloat(paycheck.net_pay)).toBeLessThan(7000);
      expect(parseFloat(paycheck.net_pay)).toBeCloseTo(6300, 0); // 7000 - 700
    });

    it('should retrieve worker payroll history', async () => {
      // Act
      const result = await payrollService.getEmployeePayrollHistory(
        workerId,
        organizationId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.paychecks).toBeDefined();
      expect(result.paychecks.length).toBe(1);
      expect(parseFloat(result.paychecks[0].grossPay)).toBe(7000);
    });
  });

  // ==================== WORKER STATUS CHANGES ====================

  describe('Worker Status Changes', () => {
    it('should update worker status to inactive', async () => {
      // Arrange
      const updates = {
        status: 'inactive'
      };

      // Act
      const result = await payrollService.updateEmployeeRecord(
        workerId,
        updates,
        organizationId,
        userId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.employee).toBeDefined();
      // Note: The mapped response may use different field names
    });

    it('should verify inactive status in database', async () => {
      // Act
      const result = await query(
        `SELECT employment_status, payroll_status 
         FROM hris.employee e
         LEFT JOIN payroll.employee_payroll_config epc ON e.id = epc.employee_id
         WHERE e.id = $1 AND e.organization_id = $2`,
        [workerId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].employment_status).toBe('inactive');
    });

    it('should not include inactive worker in new payroll runs', async () => {
      // Arrange - Create new payroll run
      const runData = {
        payPeriodStart: '2025-03-01',
        payPeriodEnd: '2025-03-31',
        payDate: '2025-04-05',
        runType: 'regular',
        status: 'draft',
        description: 'March 2025 Payroll'
      };

      const payrollResult = await payrollService.createPayrollRun(
        runData,
        organizationId,
        userId
      );
      const newPayrollRunId = payrollResult.payrollRun.id;

      // Act - Calculate payroll (should skip inactive worker)
      const result = await payrollService.calculatePayroll(
        newPayrollRunId,
        organizationId,
        userId
      );

      // Assert - No paychecks for inactive worker
      expect(result.paychecks).toBeDefined();
      expect(result.paychecks.length).toBe(0);

      // Cleanup
      await query(
        'DELETE FROM payroll.payroll_run WHERE id = $1',
        [newPayrollRunId],
        organizationId
      );
    });

    it('should reactivate worker', async () => {
      // Arrange
      const updates = {
        status: 'active'
      };

      // Act
      const result = await payrollService.updateEmployeeRecord(
        workerId,
        updates,
        organizationId,
        userId
      );

      // Assert
      expect(result).toBeDefined();
      
      // Verify in database
      const dbResult = await query(
        `SELECT employment_status FROM hris.employee 
         WHERE id = $1 AND organization_id = $2`,
        [workerId, organizationId],
        organizationId
      );
      expect(dbResult.rows[0].employment_status).toBe('active');
    });
  });

  // ==================== WORKER TERMINATION ====================

  describe('Worker Termination', () => {
    it('should mark worker as terminated with termination date', async () => {
      // Arrange
      const terminationDate = '2025-03-15';
      
      // Update worker to terminated status
      await query(
        `UPDATE hris.employee 
         SET employment_status = 'terminated', termination_date = $1, updated_by = $2
         WHERE id = $3 AND organization_id = $4`,
        [terminationDate, userId, workerId, organizationId],
        organizationId
      );

      // Act - Verify termination
      const result = await query(
        `SELECT employment_status, termination_date 
         FROM hris.employee 
         WHERE id = $1 AND organization_id = $2`,
        [workerId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].employment_status).toBe('terminated');
      expect(result.rows[0].termination_date).toBeDefined();
    });

    it('should set payroll config to inactive after termination', async () => {
      // Act
      await query(
        `UPDATE payroll.employee_payroll_config 
         SET payroll_status = 'inactive', updated_by = $1
         WHERE employee_id = $2 AND organization_id = $3`,
        [userId, workerId, organizationId],
        organizationId
      );

      // Verify
      const result = await query(
        `SELECT payroll_status FROM payroll.employee_payroll_config 
         WHERE employee_id = $1 AND organization_id = $2`,
        [workerId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].payroll_status).toBe('inactive');
    });

    it('should retrieve complete worker lifecycle data', async () => {
      // Act
      const result = await payrollService.getEmployeeById(
        workerId,
        organizationId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.employee).toBeDefined();
      expect(result.employee.id).toBe(workerId);
      expect(result.employee.employeeNumber).toBe('WKR-001');
      
      // Worker should have complete history
      const historyResult = await payrollService.getEmployeePayrollHistory(
        workerId,
        organizationId
      );
      expect(historyResult.paychecks).toBeDefined();
      expect(historyResult.paychecks.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==================== DATA INTEGRITY ====================

  describe('Data Integrity', () => {
    it('should maintain referential integrity throughout lifecycle', async () => {
      // Act - Get complete worker data with all relationships
      const result = await query(
        `SELECT 
          e.id as employee_id,
          e.employee_number,
          e.employment_status,
          epc.id as payroll_config_id,
          epc.payroll_status,
          c.id as compensation_id,
          c.amount,
          COUNT(pc.id) as paycheck_count
         FROM hris.employee e
         LEFT JOIN payroll.employee_payroll_config epc ON e.id = epc.employee_id
         LEFT JOIN payroll.compensation c ON e.id = c.employee_id AND c.is_active = true
         LEFT JOIN payroll.paycheck pc ON e.id = pc.employee_id
         WHERE e.id = $1 AND e.organization_id = $2
         GROUP BY e.id, e.employee_number, e.employment_status, epc.id, epc.payroll_status, c.id, c.amount`,
        [workerId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(1);
      const worker = result.rows[0];
      
      expect(worker.employee_id).toBe(workerId);
      expect(worker.payroll_config_id).toBeDefined();
      expect(worker.compensation_id).toBeDefined();
      expect(parseInt(worker.paycheck_count)).toBeGreaterThanOrEqual(1);
    });

    it('should enforce organization isolation for worker data', async () => {
      // Arrange - Create another organization
      const otherOrgId = uuidv4();
      await query(
        `INSERT INTO organizations (id, name, slug, tier)
         VALUES ($1, $2, $3, $4)`,
        [otherOrgId, 'Other Org', 'other-org-worker', 'professional'],
        otherOrgId
      );

      // Act - Try to access worker from different organization
      const result = await query(
        `SELECT * FROM hris.employee 
         WHERE id = $1 AND organization_id = $2`,
        [workerId, otherOrgId],
        otherOrgId
      );

      // Assert
      expect(result.rows.length).toBe(0);

      // Cleanup
      await query('DELETE FROM organizations WHERE id = $1', [otherOrgId], otherOrgId);
    });

    it('should track all audit information throughout lifecycle', async () => {
      // Act
      const result = await query(
        `SELECT 
          created_at, created_by, updated_at, updated_by
         FROM hris.employee 
         WHERE id = $1 AND organization_id = $2`,
        [workerId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(1);
      const audit = result.rows[0];
      
      expect(audit.created_at).toBeDefined();
      expect(audit.created_by).toBe(userId);
      expect(audit.updated_at).toBeDefined();
      expect(audit.updated_by).toBe(userId);
    });
  });
});
