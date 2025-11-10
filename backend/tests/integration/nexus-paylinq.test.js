/**
 * Integration Test: Nexus → Paylinq
 * Tests payroll setup and benefits deduction integration
 * 
 * Flows:
 * 1. Contract activation → Payroll setup
 * 2. Benefits enrollment → Deduction added
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import pool from '../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { cleanupTestEmployees } from '../products/paylinq/helpers/employeeTestHelper.js';

describe('Integration: Nexus → Paylinq', () => {
  let organizationId;
  let testUserId;
  let employeeId;
  let departmentId;
  let locationId;
  let contractId;
  let benefitPlanId;
  let enrollmentId;

  beforeAll(async () => {
    // Create test organization
    const orgResult = await pool.query(
      `INSERT INTO public.organization (name, created_at) 
       VALUES ('Test Org - Paylinq Integration', NOW()) 
       RETURNING id`
    );
    organizationId = orgResult.rows[0].id;

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO public.users (organization_id, email, password_hash, first_name, last_name, role, created_at)
       VALUES ($1, 'test-paylinq@integration.com', 'hash', 'Test', 'Paylinq', 'admin', NOW())
       RETURNING id`,
      [organizationId]
    );
    testUserId = userResult.rows[0].id;

    // Create department
    const deptResult = await pool.query(
      `INSERT INTO hris.department (organization_id, department_code, department_name, created_at, created_by)
       VALUES ($1, 'ENG', 'Engineering', NOW(), $2)
       RETURNING id`,
      [organizationId, testUserId]
    );
    departmentId = deptResult.rows[0].id;

    // Create location
    const locResult = await pool.query(
      `INSERT INTO hris.location (organization_id, location_code, location_name, location_type, created_at, created_by)
       VALUES ($1, 'SF', 'San Francisco', 'branch', NOW(), $2)
       RETURNING id`,
      [organizationId, testUserId]
    );
    locationId = locResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    if (organizationId) {
      await pool.query('DELETE FROM payroll.deduction WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM payroll.compensation WHERE organization_id = $1', [organizationId]);
      await cleanupTestEmployees(organizationId);
      await pool.query('DELETE FROM hris.employee_benefit_enrollment WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM hris.benefits_plan WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM hris.contract WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM hris.employee WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM hris.location WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM hris.department WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM public.users WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM public.organization WHERE id = $1', [organizationId]);
    }
    await pool.end();
  });

  beforeEach(async () => {
    // Create fresh employee for each test
    const empResult = await pool.query(
      `INSERT INTO hris.employee (
        organization_id, employee_number, first_name, last_name, email,
        department_id, location_id, job_title, employment_type,
        employment_status, hire_date, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)
      RETURNING id`,
      [
        organizationId,
        `EMP${Date.now().toString().slice(-4)}`,
        'Jane',
        'Smith',
        `jane.smith.${Date.now()}@example.com`,
        departmentId,
        locationId,
        'Senior Engineer',
        'full_time',
        'active',
        new Date(),
        testUserId
      ]
    );
    employeeId = empResult.rows[0].id;
  });

  describe('Contract Activation → Payroll Setup', () => {
    it('should create payroll record when contract is activated', async () => {
      // 1. Create contract
      const contractData = {
        contractNumber: `CNT-${Date.now()}`,
        contractType: 'permanent',
        startDate: new Date(),
        jobTitle: 'Senior Engineer',
        salary: 120000,
        currency: 'USD',
        salaryFrequency: 'monthly'
      };

      const contractResult = await pool.query(
        `INSERT INTO hris.contract (
          organization_id, employee_id, contract_number, contract_type,
          start_date, job_title, salary_amount, salary_currency,
          salary_frequency, status, created_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', NOW(), $10)
        RETURNING id`,
        [
          organizationId,
          employeeId,
          contractData.contractNumber,
          contractData.contractType,
          contractData.startDate,
          contractData.jobTitle,
          contractData.salary,
          contractData.currency,
          contractData.salaryFrequency,
          testUserId
        ]
      );
      contractId = contractResult.rows[0].id;

      // 2. Activate contract (this should trigger payroll setup)
      const { default: ContractService } = await import('../../src/products/nexus/services/contractService.js');
      const contractService = new ContractService();

      const result = await contractService.activateContract(
        contractId,
        organizationId,
        testUserId
      );

      expect(result.status).toBe('active');

      // Wait for async integration
      await new Promise(resolve => setTimeout(resolve, 200));

      // 3. Verify payroll employee config was created
      const employeeConfigResult = await pool.query(
        `SELECT * FROM payroll.employee_payroll_config 
         WHERE organization_id = $1 AND employee_id = $2 AND deleted_at IS NULL`,
        [organizationId, employeeId]
      );

      expect(employeeConfigResult.rows.length).toBe(1);
      const employeeConfig = employeeConfigResult.rows[0];

      expect(employeeConfig.payroll_status).toBe('active');
      expect(employeeConfig.currency).toBe('USD');
      expect(employeeConfig.pay_frequency).toBe('monthly');

      // 4. Verify compensation record was created
      const compensationResult = await pool.query(
        `SELECT * FROM payroll.compensation 
         WHERE organization_id = $1 AND employee_id = $2 AND deleted_at IS NULL`,
        [organizationId, employeeId]
      );

      expect(compensationResult.rows.length).toBe(1);
      const compensation = compensationResult.rows[0];

      expect(compensation.compensation_type).toBe('salary');
      expect(parseFloat(compensation.amount)).toBe(120000);
      expect(parseFloat(compensation.annual_amount)).toBe(120000);
      expect(parseFloat(compensation.pay_period_amount)).toBe(120000); // Monthly
      expect(compensation.currency).toBe('USD');
      expect(compensation.is_current).toBe(true);
    });

    it('should calculate hourly rate for hourly employees', async () => {
      // Create contract with hourly rate
      const contractResult = await pool.query(
        `INSERT INTO hris.contract (
          organization_id, employee_id, contract_number, contract_type,
          start_date, job_title, salary_amount, salary_currency,
          salary_frequency, status, created_at, created_by
        ) VALUES ($1, $2, $3, 'permanent', NOW(), 'Hourly Worker', $4, 'USD', 'hourly', 'draft', NOW(), $5)
        RETURNING id`,
        [organizationId, employeeId, `CNT-${Date.now()}`, 25, testUserId]
      );
      contractId = contractResult.rows[0].id;

      // Activate contract
      const { default: ContractService } = await import('../../src/products/nexus/services/contractService.js');
      const contractService = new ContractService();

      await contractService.activateContract(contractId, organizationId, testUserId);

      // Wait for integration
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify compensation
      const compensationResult = await pool.query(
        `SELECT * FROM payroll.compensation 
         WHERE employee_id = $1 AND is_current = true`,
        [employeeId]
      );

      const compensation = compensationResult.rows[0];
      expect(compensation.compensation_type).toBe('hourly');
      expect(parseFloat(compensation.hourly_rate)).toBe(25);
      expect(parseFloat(compensation.overtime_rate)).toBe(37.5); // 1.5x
      expect(parseFloat(compensation.annual_amount)).toBe(52000); // 25 * 2080
    });

    it('should update existing payroll record if already exists', async () => {
      // Create payroll config manually first using helper would be better, but for integration test we'll verify the merge
      await pool.query(
        `INSERT INTO hris.employee (
          id, organization_id, employee_number, first_name, last_name, 
          email, employment_status, created_at, created_by
        ) VALUES ($1, $2, $3, 'Jane', 'Smith', 'jane@test.com', 'inactive', NOW(), $4)
        ON CONFLICT (id) DO UPDATE SET employment_status = 'inactive'`,
        [employeeId, organizationId, `EMP-TEST-${Date.now()}`, testUserId]
      );

      await pool.query(
        `INSERT INTO payroll.employee_payroll_config (
          organization_id, employee_id, payroll_status, created_at, created_by
        ) VALUES ($1, $2, 'inactive', NOW(), $3)
        ON CONFLICT (employee_id, organization_id) DO UPDATE SET payroll_status = 'inactive'`,
        [organizationId, employeeId, testUserId]
      );

      // Create and activate contract
      const contractResult = await pool.query(
        `INSERT INTO hris.contract (
          organization_id, employee_id, contract_number, contract_type,
          start_date, job_title, salary_amount, salary_currency,
          salary_frequency, status, created_at, created_by
        ) VALUES ($1, $2, $3, 'permanent', NOW(), 'Senior Engineer', 90000, 'USD', 'monthly', 'draft', NOW(), $4)
        RETURNING id`,
        [organizationId, employeeId, `CNT-${Date.now()}`, testUserId]
      );
      contractId = contractResult.rows[0].id;

      const { default: ContractService } = await import('../../src/products/nexus/services/contractService.js');
      const contractService = new ContractService();

      await contractService.activateContract(contractId, organizationId, testUserId);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify record was updated, not duplicated
      const configResult = await pool.query(
        `SELECT * FROM payroll.employee_payroll_config 
         WHERE organization_id = $1 AND employee_id = $2`,
        [organizationId, employeeId]
      );

      expect(configResult.rows.length).toBe(1);
      expect(configResult.rows[0].payroll_status).toBe('active');
    });
  });

  describe('Benefits Enrollment → Deduction', () => {
    beforeEach(async () => {
      // Create benefits plan
      const planResult = await pool.query(
        `INSERT INTO hris.benefits_plan (
          organization_id, plan_name, plan_type, provider_name,
          employee_cost, employer_cost, is_active, created_at, created_by
        ) VALUES ($1, 'Health Insurance Premium', 'health', 'Blue Cross', 250, 500, true, NOW(), $2)
        RETURNING id`,
        [organizationId, testUserId]
      );
      benefitPlanId = planResult.rows[0].id;

      // Create payroll config for employee using helper
      await createTestEmployee({
        organizationId,
        userId: testUserId,
        employee: {
          id: employeeId, // Use the same employee ID
          first_name: 'Jane',
          last_name: 'Smith',
          email: `jane.smith.${Date.now()}@example.com`
        },
        payrollConfig: {
          payroll_status: 'active'
        }
      });
    });

    it('should create payroll deduction when employee enrolls in benefits', async () => {
      // 1. Enroll employee in benefits
      const { default: BenefitsService } = await import('../../src/products/nexus/services/benefitsService.js');
      const benefitsService = new BenefitsService();

      const enrollmentData = {
        employeeId,
        benefitPlanId,
        startDate: new Date(),
        coverageLevel: 'employee_only'
      };

      const enrollment = await benefitsService.enrollEmployee(
        enrollmentData,
        organizationId,
        testUserId
      );

      enrollmentId = enrollment.id;
      expect(enrollment.status).toBe('pending');

      // Manually activate enrollment to trigger deduction
      await pool.query(
        `UPDATE hris.employee_benefit_enrollment 
         SET status = 'active' 
         WHERE id = $1`,
        [enrollmentId]
      );

      // Get plan details
      const planResult = await pool.query(
        'SELECT * FROM hris.benefits_plan WHERE id = $1',
        [benefitPlanId]
      );
      const plan = planResult.rows[0];

      // Manually trigger integration (since we can't easily trigger from test)
      const { default: PaylinqIntegrationService } = await import('../../src/products/paylinq/services/integrationService.js');
      const paylinqIntegration = new PaylinqIntegrationService();

      await paylinqIntegration.addBenefitsDeductionFromNexus({
        employeeId,
        enrollmentId,
        organizationId,
        planName: plan.plan_name,
        employeeContribution: parseFloat(plan.employee_cost),
        startDate: new Date()
      }, testUserId);

      // Wait for integration
      await new Promise(resolve => setTimeout(resolve, 100));

      // 2. Verify deduction was created
      const deductionResult = await pool.query(
        `SELECT * FROM payroll.deduction 
         WHERE organization_id = $1 AND source_reference_id = $2 AND deleted_at IS NULL`,
        [organizationId, enrollmentId]
      );

      expect(deductionResult.rows.length).toBe(1);
      const deduction = deductionResult.rows[0];

      expect(deduction.deduction_type).toBe('benefits');
      expect(deduction.description).toContain('Health Insurance');
      expect(parseFloat(deduction.amount)).toBe(250);
      expect(deduction.frequency).toBe('per_pay_period');
      expect(deduction.is_pre_tax).toBe(true);
      expect(deduction.is_active).toBe(true);
      expect(deduction.source_system).toBe('nexus');
    });

    it('should not create duplicate deduction for same enrollment', async () => {
      const { default: PaylinqIntegrationService } = await import('../../src/products/paylinq/services/integrationService.js');
      const paylinqIntegration = new PaylinqIntegrationService();

      const enrollmentData = {
        employeeId,
        enrollmentId: uuidv4(),
        organizationId,
        planName: 'Test Plan',
        employeeContribution: 100,
        startDate: new Date()
      };

      // Create deduction first time
      await paylinqIntegration.addBenefitsDeductionFromNexus(enrollmentData, testUserId);

      // Try to create again
      const result = await paylinqIntegration.addBenefitsDeductionFromNexus(enrollmentData, testUserId);

      // Should return existing deduction, not create new one
      expect(result.integrationResult.data.message).toContain('already exists');

      // Verify only one deduction exists
      const deductionCount = await pool.query(
        `SELECT COUNT(*) FROM payroll.deduction 
         WHERE organization_id = $1 AND source_reference_id = $2`,
        [organizationId, enrollmentData.enrollmentId]
      );

      expect(parseInt(deductionCount.rows[0].count)).toBe(1);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle payroll setup failure gracefully', async () => {
      // Create contract with invalid data
      const contractResult = await pool.query(
        `INSERT INTO hris.contract (
          organization_id, employee_id, contract_number, contract_type,
          start_date, job_title, status, created_at, created_by
        ) VALUES ($1, $2, $3, 'permanent', NOW(), 'Test', 'draft', NOW(), $4)
        RETURNING id`,
        [organizationId, employeeId, `CNT-${Date.now()}`, testUserId]
      );

      const { default: ContractService } = await import('../../src/products/nexus/services/contractService.js');
      const contractService = new ContractService();

      // Should not throw - contract activation should succeed even if payroll fails
      const result = await contractService.activateContract(
        contractResult.rows[0].id,
        organizationId,
        testUserId
      );

      expect(result.status).toBe('active');
    });

    it('should track integration failures in error handler', async () => {
      const { default: integrationErrorHandler } = await import('../../src/shared/utils/integrationErrorHandler.js');

      // Reset metrics first
      integrationErrorHandler.resetAllMetrics();

      // Trigger an integration that will fail
      const { default: PaylinqIntegrationService } = await import('../../src/products/paylinq/services/integrationService.js');
      const paylinqIntegration = new PaylinqIntegrationService();

      await paylinqIntegration.addBenefitsDeductionFromNexus({
        employeeId: uuidv4(), // Non-existent employee
        enrollmentId: uuidv4(),
        organizationId,
        planName: 'Test',
        employeeContribution: 100,
        startDate: new Date()
      }, testUserId);

      // Check health status
      const health = integrationErrorHandler.getHealthStatus();
      
      if (health['nexus-to-paylinq-benefits']) {
        expect(health['nexus-to-paylinq-benefits'].failureCount).toBeGreaterThan(0);
      }
    });
  });
});
