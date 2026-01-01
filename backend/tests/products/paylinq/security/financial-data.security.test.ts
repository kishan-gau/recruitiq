/**
 * PayLinQ Financial Data Security Test Suite
 * 
 * Critical security tests for financial data handling, audit trails,
 * and payment security.
 * 
 * SECURITY CRITICAL: These tests validate that:
 * 1. Sensitive financial data is handled securely
 * 2. Audit trails are maintained (created_by, updated_by, deleted_by)
 * 3. Soft deletes are enforced (no hard deletes)
 * 4. Payment data is protected
 * 5. Payroll data access is controlled
 * 6. Financial calculations are accurate and secure
 * 
 * @module tests/products/paylinq/security/financial-data
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PaymentService from '../../../../src/products/paylinq/services/paymentService.js';
import PayrollService from '../../../../src/products/paylinq/services/payrollService.js';
import WorkerTypeService from '../../../../src/products/paylinq/services/workerTypeService.js';
import TaxCalculationService from '../../../../src/products/paylinq/services/taxCalculationService.js';

describe('PayLinQ Financial Data Security Tests', () => {
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testPaymentId = '323e4567-e89b-12d3-a456-426614174002';
  const testPaycheckId = '423e4567-e89b-12d3-a456-426614174003';
  const testPayrollRunId = '523e4567-e89b-12d3-a456-426614174004';

  describe('Payment Data Security', () => {
    let paymentService: any;
    let mockRepository: any;

    beforeEach(() => {
      mockRepository = {
        createPaymentTransaction: jest.fn(),
        findPaymentTransactionById: jest.fn(),
        updatePaymentStatus: jest.fn(),
        recordPaymentFailure: jest.fn(),
        findPaymentTransactions: jest.fn(),
      };

      paymentService = new PaymentService(mockRepository);
    });

    it('should require bank account details for ACH payments', async () => {
      const invalidData = {
        paycheckId: testPaycheckId,
        payrollRunId: testPayrollRunId,
        employeeRecordId: '623e4567-e89b-12d3-a456-426614174005',
        paymentMethod: 'ach',
        paymentAmount: 1500.00,
        scheduledDate: new Date('2025-02-15'),
        // Missing bankAccountNumber and routingNumber
        currency: 'USD'
      };

      await expect(
        paymentService.initiatePayment(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(/bank|account|routing/i);

      expect(mockRepository.createPaymentTransaction).not.toHaveBeenCalled();
    });

    it('should validate routing number format', async () => {
      const invalidData = {
        paycheckId: testPaycheckId,
        payrollRunId: testPayrollRunId,
        employeeRecordId: '623e4567-e89b-12d3-a456-426614174005',
        paymentMethod: 'ach',
        paymentAmount: 1500.00,
        scheduledDate: new Date('2025-02-15'),
        bankAccountNumber: '123456789',
        routingNumber: '12345', // Invalid length
        currency: 'USD'
      };

      await expect(
        paymentService.initiatePayment(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow();
    });

    it('should validate payment amount precision (max 2 decimals)', async () => {
      const invalidData = {
        paycheckId: testPaycheckId,
        payrollRunId: testPayrollRunId,
        employeeRecordId: '623e4567-e89b-12d3-a456-426614174005',
        paymentMethod: 'ach',
        paymentAmount: 1500.123, // Too many decimals
        scheduledDate: new Date('2025-02-15'),
        bankAccountNumber: '123456789',
        routingNumber: '021000021',
        currency: 'USD'
      };

      await expect(
        paymentService.initiatePayment(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow();
    });

    it('should enforce maximum payment amount limits', async () => {
      const invalidData = {
        paycheckId: testPaycheckId,
        payrollRunId: testPayrollRunId,
        employeeRecordId: '623e4567-e89b-12d3-a456-426614174005',
        paymentMethod: 'ach',
        paymentAmount: 999999999.99, // Suspiciously large
        scheduledDate: new Date('2025-02-15'),
        bankAccountNumber: '123456789',
        routingNumber: '021000021',
        currency: 'USD'
      };

      await expect(
        paymentService.initiatePayment(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow();
    });

    it('should record payment transaction with audit trail', async () => {
      const validData = {
        paycheckId: testPaycheckId,
        payrollRunId: testPayrollRunId,
        employeeRecordId: '623e4567-e89b-12d3-a456-426614174005',
        paymentMethod: 'ach',
        paymentAmount: 1500.00,
        scheduledDate: new Date('2025-02-15'),
        bankAccountNumber: '123456789',
        routingNumber: '021000021',
        currency: 'USD'
      };

      const createdTransaction = {
        id: testPaymentId,
        organization_id: testOrganizationId,
        created_by: testUserId,
        created_at: new Date(),
        ...validData,
      };

      mockRepository.createPaymentTransaction.mockResolvedValue(createdTransaction);

      await paymentService.initiatePayment(validData, testOrganizationId, testUserId);

      // Verify audit trail fields
      expect(mockRepository.createPaymentTransaction).toHaveBeenCalledWith(
        expect.anything(),
        testOrganizationId,
        testUserId
      );
    });

    it('should not expose sensitive payment details in error messages', async () => {
      const validData = {
        paycheckId: testPaycheckId,
        payrollRunId: testPayrollRunId,
        employeeRecordId: '623e4567-e89b-12d3-a456-426614174005',
        paymentMethod: 'ach',
        paymentAmount: 1500.00,
        scheduledDate: new Date('2025-02-15'),
        bankAccountNumber: '123456789',
        routingNumber: '021000021',
        currency: 'USD'
      };

      mockRepository.createPaymentTransaction.mockRejectedValue(
        new Error('Database error')
      );

      try {
        await paymentService.initiatePayment(validData, testOrganizationId, testUserId);
      } catch (error) {
        // Error should not expose bank account or routing number
        expect(error.message).not.toContain('123456789');
        expect(error.message).not.toContain('021000021');
      }
    });

    it('should validate currency codes', async () => {
      const invalidData = {
        paycheckId: testPaycheckId,
        payrollRunId: testPayrollRunId,
        employeeRecordId: '623e4567-e89b-12d3-a456-426614174005',
        paymentMethod: 'ach',
        paymentAmount: 1500.00,
        scheduledDate: new Date('2025-02-15'),
        bankAccountNumber: '123456789',
        routingNumber: '021000021',
        currency: 'INVALID' // Invalid currency
      };

      await expect(
        paymentService.initiatePayment(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow();
    });
  });

  describe('Payroll Data Security', () => {
    let payrollService: any;
    let mockPayrollRepository: any;
    let mockPaycheckRepository: any;

    beforeEach(() => {
      mockPayrollRepository = {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };

      mockPaycheckRepository = {
        findByPayrollRun: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      };

      payrollService = new PayrollService(mockPayrollRepository, mockPaycheckRepository);
    });

    it('should validate payroll calculation accuracy', async () => {
      const payrollData = {
        payPeriodStart: new Date('2025-01-01'),
        payPeriodEnd: new Date('2025-01-31'),
        payDate: new Date('2025-02-05'),
      };

      const createdPayroll = {
        id: testPayrollRunId,
        organization_id: testOrganizationId,
        ...payrollData,
        total_gross: 0,
        total_net: 0,
        total_deductions: 0,
        total_taxes: 0,
      };

      mockPayrollRepository.create.mockResolvedValue(createdPayroll);

      const result = await payrollService.createPayrollRun(
        payrollData,
        testOrganizationId,
        testUserId
      );

      // Verify financial totals are initialized
      expect(result.totalGross).toBe(0);
      expect(result.totalNet).toBe(0);
      expect(result.totalDeductions).toBe(0);
      expect(result.totalTaxes).toBe(0);
    });

    it('should prevent modification of finalized payroll runs', async () => {
      const finalizedPayroll = {
        id: testPayrollRunId,
        organization_id: testOrganizationId,
        status: 'finalized',
        finalized_at: new Date(),
        finalized_by: testUserId,
      };

      mockPayrollRepository.findById.mockResolvedValue(finalizedPayroll);

      const updateData = {
        payDate: new Date('2025-02-10'),
      };

      await expect(
        payrollService.updatePayrollRun(
          testPayrollRunId,
          updateData,
          testOrganizationId,
          testUserId
        )
      ).rejects.toThrow(/finalized|locked|immutable/i);

      expect(mockPayrollRepository.update).not.toHaveBeenCalled();
    });

    it('should validate paycheck amounts against payroll totals', async () => {
      const payroll = {
        id: testPayrollRunId,
        organization_id: testOrganizationId,
        status: 'draft',
        total_gross: 50000.00,
        total_net: 40000.00,
      };

      const paychecks = [
        {
          id: '723e4567-e89b-12d3-a456-426614174006',
          payroll_run_id: testPayrollRunId,
          gross_pay: 30000.00,
          net_pay: 24000.00,
        },
        {
          id: '823e4567-e89b-12d3-a456-426614174007',
          payroll_run_id: testPayrollRunId,
          gross_pay: 20000.00,
          net_pay: 16000.00,
        }
      ];

      mockPayrollRepository.findById.mockResolvedValue(payroll);
      mockPaycheckRepository.findByPayrollRun.mockResolvedValue(paychecks);

      const result = await payrollService.getPayrollRunById(
        testPayrollRunId,
        testOrganizationId
      );

      // Verify totals match sum of paychecks
      const calculatedGross = paychecks.reduce(
        (sum, pc) => sum + pc.gross_pay,
        0
      );
      const calculatedNet = paychecks.reduce(
        (sum, pc) => sum + pc.net_pay,
        0
      );

      expect(result.totalGross).toBe(calculatedGross);
      expect(result.totalNet).toBe(calculatedNet);
    });

    it('should maintain audit trail for payroll runs', async () => {
      const payrollData = {
        payPeriodStart: new Date('2025-01-01'),
        payPeriodEnd: new Date('2025-01-31'),
        payDate: new Date('2025-02-05'),
      };

      const createdPayroll = {
        id: testPayrollRunId,
        organization_id: testOrganizationId,
        created_by: testUserId,
        created_at: new Date(),
        updated_by: null,
        updated_at: null,
        ...payrollData,
      };

      mockPayrollRepository.create.mockResolvedValue(createdPayroll);

      await payrollService.createPayrollRun(
        payrollData,
        testOrganizationId,
        testUserId
      );

      // Verify creator recorded
      expect(mockPayrollRepository.create).toHaveBeenCalledWith(
        expect.anything(),
        testOrganizationId,
        testUserId
      );
    });
  });

  describe('Soft Delete Enforcement', () => {
    let workerTypeService: any;
    let mockRepository: any;

    beforeEach(() => {
      mockRepository = {
        findTemplateById: jest.fn(),
        delete: jest.fn(),
        countEmployeesByWorkerType: jest.fn(),
      };

      workerTypeService = new WorkerTypeService(mockRepository);
    });

    it('should use soft delete for worker type templates', async () => {
      const workerType = {
        id: '923e4567-e89b-12d3-a456-426614174008',
        organization_id: testOrganizationId,
        name: 'Test Worker Type',
      };

      mockRepository.findTemplateById.mockResolvedValue(workerType);
      mockRepository.countEmployeesByWorkerType.mockResolvedValue(0);
      mockRepository.delete.mockResolvedValue(true);

      await workerTypeService.deleteWorkerTypeTemplate(
        workerType.id,
        testOrganizationId,
        testUserId
      );

      // Verify soft delete was called (repository handles setting deleted_at)
      expect(mockRepository.delete).toHaveBeenCalledWith(
        workerType.id,
        testOrganizationId,
        testUserId
      );
    });

    it('should record who deleted the record', async () => {
      const workerType = {
        id: '923e4567-e89b-12d3-a456-426614174008',
        organization_id: testOrganizationId,
        name: 'Test Worker Type',
      };

      mockRepository.findTemplateById.mockResolvedValue(workerType);
      mockRepository.countEmployeesByWorkerType.mockResolvedValue(0);
      mockRepository.delete.mockResolvedValue(true);

      await workerTypeService.deleteWorkerTypeTemplate(
        workerType.id,
        testOrganizationId,
        testUserId
      );

      // Verify userId (deleted_by) is passed
      expect(mockRepository.delete).toHaveBeenCalledWith(
        workerType.id,
        testOrganizationId,
        testUserId // This becomes deleted_by
      );
    });

    it('should prevent deletion of worker types with active employees', async () => {
      const workerType = {
        id: '923e4567-e89b-12d3-a456-426614174008',
        organization_id: testOrganizationId,
        name: 'Test Worker Type',
      };

      mockRepository.findTemplateById.mockResolvedValue(workerType);
      mockRepository.countEmployeesByWorkerType.mockResolvedValue(5); // Has employees

      await expect(
        workerTypeService.deleteWorkerTypeTemplate(
          workerType.id,
          testOrganizationId,
          testUserId
        )
      ).rejects.toThrow(/employees|in use/i);

      // Verify delete was not called
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('Audit Trail Completeness', () => {
    it('should track all CRUD operations with timestamps and users', async () => {
      const mockRepository = {
        createTemplate: jest.fn(),
        findTemplateById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        countEmployeesByWorkerType: jest.fn(),
      };

      const service = new WorkerTypeService(mockRepository);

      // CREATE - should set created_by and created_at
      const createData = {
        name: 'Test',
        code: 'TEST',
        defaultPayFrequency: 'monthly',
        defaultPaymentMethod: 'ach',
      };

      mockRepository.createTemplate.mockResolvedValue({
        id: 'a23e4567-e89b-12d3-a456-426614174009',
        organization_id: testOrganizationId,
        created_by: testUserId,
        created_at: new Date(),
        ...createData,
      });

      await service.createWorkerTypeTemplate(
        createData,
        testOrganizationId,
        testUserId
      );

      expect(mockRepository.createTemplate).toHaveBeenCalledWith(
        expect.anything(),
        testOrganizationId,
        testUserId
      );

      // UPDATE - should set updated_by and updated_at
      mockRepository.findTemplateById.mockResolvedValue({
        id: 'a23e4567-e89b-12d3-a456-426614174009',
        organization_id: testOrganizationId,
        name: 'Test',
      });

      mockRepository.update.mockResolvedValue({
        id: 'a23e4567-e89b-12d3-a456-426614174009',
        updated_by: testUserId,
        updated_at: new Date(),
      });

      await service.updateWorkerTypeTemplate(
        'a23e4567-e89b-12d3-a456-426614174009',
        { name: 'Updated' },
        testOrganizationId,
        testUserId
      );

      expect(mockRepository.update).toHaveBeenCalledWith(
        'a23e4567-e89b-12d3-a456-426614174009',
        expect.anything(),
        testOrganizationId,
        testUserId
      );

      // DELETE - should set deleted_by and deleted_at
      mockRepository.findTemplateById.mockResolvedValue({
        id: 'a23e4567-e89b-12d3-a456-426614174009',
        organization_id: testOrganizationId,
      });

      mockRepository.countEmployeesByWorkerType.mockResolvedValue(0);
      mockRepository.delete.mockResolvedValue(true);

      await service.deleteWorkerTypeTemplate(
        'a23e4567-e89b-12d3-a456-426614174009',
        testOrganizationId,
        testUserId
      );

      expect(mockRepository.delete).toHaveBeenCalledWith(
        'a23e4567-e89b-12d3-a456-426614174009',
        testOrganizationId,
        testUserId
      );
    });
  });

  describe('Tax Calculation Security', () => {
    let taxService: any;
    let mockRepository: any;

    beforeEach(() => {
      mockRepository = {
        getTaxBrackets: jest.fn(),
        calculateTax: jest.fn(),
      };

      taxService = new TaxCalculationService(mockRepository);
    });

    it('should prevent tax calculation manipulation with negative values', async () => {
      const invalidData = {
        grossIncome: 5000.00,
        deductions: -1000.00, // Negative deduction (would increase taxable income)
        taxYear: 2025,
      };

      await expect(
        taxService.calculateIncomeTax(invalidData, testOrganizationId)
      ).rejects.toThrow();
    });

    it('should validate tax rates are within acceptable range', async () => {
      const invalidTaxRate = {
        bracketMin: 0,
        bracketMax: 50000,
        rate: 150, // 150% tax rate is invalid
      };

      mockRepository.getTaxBrackets.mockResolvedValue([invalidTaxRate]);

      await expect(
        taxService.calculateIncomeTax(
          { grossIncome: 60000, deductions: 0, taxYear: 2025 },
          testOrganizationId
        )
      ).rejects.toThrow(/rate|invalid/i);
    });

    it('should ensure tax calculations are deterministic', async () => {
      const taxData = {
        grossIncome: 60000.00,
        deductions: 12000.00,
        taxYear: 2025,
      };

      const brackets = [
        { bracketMin: 0, bracketMax: 10000, rate: 0.10 },
        { bracketMin: 10000, bracketMax: 40000, rate: 0.15 },
        { bracketMin: 40000, bracketMax: 85000, rate: 0.25 },
      ];

      mockRepository.getTaxBrackets.mockResolvedValue(brackets);

      // Calculate multiple times
      const result1 = await taxService.calculateIncomeTax(
        taxData,
        testOrganizationId
      );
      const result2 = await taxService.calculateIncomeTax(
        taxData,
        testOrganizationId
      );

      // Results should be identical
      expect(result1.totalTax).toBe(result2.totalTax);
      expect(result1.effectiveRate).toBe(result2.effectiveRate);
    });

    it('should prevent precision loss in tax calculations', async () => {
      const taxData = {
        grossIncome: 123456.78,
        deductions: 12345.67,
        taxYear: 2025,
      };

      mockRepository.getTaxBrackets.mockResolvedValue([
        { bracketMin: 0, bracketMax: 200000, rate: 0.25 },
      ]);

      const result = await taxService.calculateIncomeTax(
        taxData,
        testOrganizationId
      );

      // Verify result has proper precision (2 decimal places max)
      expect(result.totalTax).toEqual(expect.any(Number));
      expect(result.totalTax.toFixed(2)).toBe(result.totalTax.toString());
    });
  });

  describe('Financial Data Isolation', () => {
    it('should prevent cross-organization salary data access', async () => {
      const mockPayrollRepository = {
        findById: jest.fn(),
      };

      const mockPaycheckRepository = {
        findByPayrollRun: jest.fn(),
      };

      const service = new PayrollService(
        mockPayrollRepository,
        mockPaycheckRepository
      );

      const org1PayrollId = 'b23e4567-e89b-12d3-a456-426614174010';
      const org2Id = 'c23e4567-e89b-12d3-a456-426614174011';

      // Org2 tries to access Org1's payroll
      mockPayrollRepository.findById.mockResolvedValue(null);

      const result = await service.getPayrollRunById(org1PayrollId, org2Id);

      expect(result).toBeNull();
      expect(mockPayrollRepository.findById).toHaveBeenCalledWith(
        org1PayrollId,
        org2Id
      );
    });

    it('should filter payment data by organization', async () => {
      const mockRepository = {
        findPaymentTransactions: jest.fn(),
      };

      const service = new PaymentService(mockRepository);

      const org1Payments = [
        {
          id: 'd23e4567-e89b-12d3-a456-426614174012',
          organization_id: testOrganizationId,
          payment_amount: 1500.00,
        }
      ];

      mockRepository.findPaymentTransactions.mockResolvedValue(org1Payments);

      const result = await service.listPaymentTransactions(testOrganizationId);

      // Verify only org1 payments returned
      expect(mockRepository.findPaymentTransactions).toHaveBeenCalledWith(
        testOrganizationId,
        expect.anything()
      );

      result.forEach((payment: any) => {
        expect(payment.organizationId).toBe(testOrganizationId);
      });
    });
  });
});
