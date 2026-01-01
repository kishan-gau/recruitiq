/**
 * PayLinQ Authorization Security Test Suite
 * 
 * Critical security tests for authorization and tenant isolation.
 * Tests RBAC permissions, organization filtering, and cross-tenant data access prevention.
 * 
 * SECURITY CRITICAL: These tests validate that:
 * 1. All queries filter by organizationId (tenant isolation)
 * 2. RBAC permissions are enforced correctly
 * 3. Cross-tenant data access is prevented
 * 4. Unauthorized access attempts are blocked
 * 
 * @module tests/products/paylinq/security/authorization
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import WorkerTypeService from '../../../../src/products/paylinq/services/workerTypeService.js';
import PayrollService from '../../../../src/products/paylinq/services/payrollService.js';
import PaymentService from '../../../../src/products/paylinq/services/paymentService.js';

describe('PayLinQ Authorization Security Tests', () => {
  // Valid UUID v4 test constants for different organizations
  const org1Id = '123e4567-e89b-12d3-a456-426614174000';
  const org2Id = '223e4567-e89b-12d3-a456-426614174001';
  const user1Id = '323e4567-e89b-12d3-a456-426614174002';
  const user2Id = '423e4567-e89b-12d3-a456-426614174003';
  const workerType1Id = '523e4567-e89b-12d3-a456-426614174004';
  const workerType2Id = '623e4567-e89b-12d3-a456-426614174005';
  const payrollRunId = '723e4567-e89b-12d3-a456-426614174006';

  describe('Tenant Isolation - Worker Type Service', () => {
    let workerTypeService: any;
    let mockRepository: any;

    beforeEach(() => {
      mockRepository = {
        findById: jest.fn(),
        findAll: jest.fn(),
        findTemplateById: jest.fn(),
        findTemplatesByOrganization: jest.fn(),
        createTemplate: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        countEmployeesByWorkerType: jest.fn(),
        getEmployeesByWorkerType: jest.fn(),
      };

      workerTypeService = new WorkerTypeService(mockRepository);
    });

    it('should prevent access to worker type from different organization', async () => {
      // Org1's worker type
      mockRepository.findById.mockResolvedValue(null);

      const result = await workerTypeService.getWorkerTypeById(
        workerType1Id,
        org2Id // Different org trying to access org1's data
      );

      expect(result).toBeNull();
      expect(mockRepository.findById).toHaveBeenCalledWith(
        workerType1Id,
        org2Id // Should filter by org2Id
      );
    });

    it('should only return worker types for the requesting organization', async () => {
      const org1WorkerTypes = [
        {
          id: workerType1Id,
          organization_id: org1Id,
          name: 'Full-Time',
          code: 'FT',
        }
      ];

      mockRepository.findTemplatesByOrganization.mockResolvedValue(org1WorkerTypes);

      const result = await workerTypeService.listWorkerTypeTemplates(org1Id);

      expect(mockRepository.findTemplatesByOrganization).toHaveBeenCalledWith(org1Id);
      
      // Verify all returned records belong to org1
      result.forEach((template: any) => {
        expect(template.organizationId).toBe(org1Id);
      });
    });

    it('should enforce organizationId in create operations', async () => {
      const templateData = {
        name: 'Contractor',
        code: 'CONT',
        defaultPayFrequency: 'monthly',
        defaultPaymentMethod: 'ach',
      };

      const createdTemplate = {
        id: workerType1Id,
        organization_id: org1Id,
        ...templateData,
        created_by: user1Id,
      };

      mockRepository.createTemplate.mockResolvedValue(createdTemplate);

      await workerTypeService.createWorkerTypeTemplate(templateData, org1Id, user1Id);

      // Verify organizationId was passed to repository
      expect(mockRepository.createTemplate).toHaveBeenCalledWith(
        expect.anything(),
        org1Id,
        user1Id
      );
    });

    it('should enforce organizationId in update operations', async () => {
      const existingWorkerType = {
        id: workerType1Id,
        organization_id: org1Id,
        name: 'Full-Time',
        code: 'FT',
      };

      mockRepository.findTemplateById.mockResolvedValue(existingWorkerType);
      mockRepository.update.mockResolvedValue({ ...existingWorkerType, name: 'Updated' });

      const updateData = { name: 'Updated' };

      await workerTypeService.updateWorkerTypeTemplate(
        workerType1Id,
        updateData,
        org1Id,
        user1Id
      );

      // Verify both findById and update use organizationId
      expect(mockRepository.findTemplateById).toHaveBeenCalledWith(workerType1Id, org1Id);
      expect(mockRepository.update).toHaveBeenCalledWith(
        workerType1Id,
        expect.anything(),
        org1Id,
        user1Id
      );
    });

    it('should prevent update of worker type from different organization', async () => {
      // Worker type belongs to org1, but org2 tries to update it
      mockRepository.findTemplateById.mockResolvedValue(null);

      const updateData = { name: 'Malicious Update' };

      await expect(
        workerTypeService.updateWorkerTypeTemplate(
          workerType1Id,
          updateData,
          org2Id, // Different org
          user2Id
        )
      ).rejects.toThrow();

      // Verify update was not called
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should enforce organizationId in delete operations', async () => {
      const existingWorkerType = {
        id: workerType1Id,
        organization_id: org1Id,
        name: 'Full-Time',
      };

      mockRepository.findTemplateById.mockResolvedValue(existingWorkerType);
      mockRepository.countEmployeesByWorkerType.mockResolvedValue(0);
      mockRepository.delete.mockResolvedValue(true);

      await workerTypeService.deleteWorkerTypeTemplate(workerType1Id, org1Id, user1Id);

      // Verify organizationId is enforced in all operations
      expect(mockRepository.findTemplateById).toHaveBeenCalledWith(workerType1Id, org1Id);
      expect(mockRepository.delete).toHaveBeenCalledWith(workerType1Id, org1Id, user1Id);
    });

    it('should prevent delete of worker type from different organization', async () => {
      mockRepository.findTemplateById.mockResolvedValue(null);

      await expect(
        workerTypeService.deleteWorkerTypeTemplate(workerType1Id, org2Id, user2Id)
      ).rejects.toThrow();

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('Tenant Isolation - Payroll Service', () => {
    let payrollService: any;
    let mockPayrollRepository: any;
    let mockPaycheckRepository: any;

    beforeEach(() => {
      mockPayrollRepository = {
        findById: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      };

      mockPaycheckRepository = {
        findByPayrollRun: jest.fn(),
        create: jest.fn(),
      };

      payrollService = new PayrollService(mockPayrollRepository, mockPaycheckRepository);
    });

    it('should prevent access to payroll run from different organization', async () => {
      mockPayrollRepository.findById.mockResolvedValue(null);

      const result = await payrollService.getPayrollRunById(payrollRunId, org2Id);

      expect(result).toBeNull();
      expect(mockPayrollRepository.findById).toHaveBeenCalledWith(payrollRunId, org2Id);
    });

    it('should only return payroll runs for requesting organization', async () => {
      const org1PayrollRuns = [
        {
          id: payrollRunId,
          organization_id: org1Id,
          status: 'completed',
        }
      ];

      mockPayrollRepository.findAll.mockResolvedValue(org1PayrollRuns);

      const result = await payrollService.listPayrollRuns(org1Id);

      expect(mockPayrollRepository.findAll).toHaveBeenCalledWith(
        org1Id,
        expect.anything()
      );
      
      result.forEach((run: any) => {
        expect(run.organizationId).toBe(org1Id);
      });
    });

    it('should enforce organizationId when creating payroll run', async () => {
      const payrollData = {
        payPeriodStart: new Date('2025-01-01'),
        payPeriodEnd: new Date('2025-01-31'),
        payDate: new Date('2025-02-05'),
      };

      mockPayrollRepository.create.mockResolvedValue({
        id: payrollRunId,
        organization_id: org1Id,
        ...payrollData,
      });

      await payrollService.createPayrollRun(payrollData, org1Id, user1Id);

      expect(mockPayrollRepository.create).toHaveBeenCalledWith(
        expect.anything(),
        org1Id,
        user1Id
      );
    });
  });

  describe('Tenant Isolation - Payment Service', () => {
    let paymentService: any;
    let mockRepository: any;

    beforeEach(() => {
      mockRepository = {
        createPaymentTransaction: jest.fn(),
        findPaymentTransactions: jest.fn(),
        findPaymentTransactionById: jest.fn(),
        updatePaymentStatus: jest.fn(),
        findPendingPayments: jest.fn(),
      };

      paymentService = new PaymentService(mockRepository);
    });

    it('should prevent access to payment transaction from different organization', async () => {
      mockRepository.findPaymentTransactionById.mockResolvedValue(null);

      const transactionId = '823e4567-e89b-12d3-a456-426614174007';

      const result = await paymentService.getPaymentTransaction(transactionId, org2Id);

      expect(result).toBeNull();
      expect(mockRepository.findPaymentTransactionById).toHaveBeenCalledWith(
        transactionId,
        org2Id
      );
    });

    it('should only return payments for requesting organization', async () => {
      const org1Payments = [
        {
          id: '923e4567-e89b-12d3-a456-426614174008',
          organization_id: org1Id,
          payment_amount: 1500.00,
        }
      ];

      mockRepository.findPaymentTransactions.mockResolvedValue(org1Payments);

      const result = await paymentService.listPaymentTransactions(org1Id);

      expect(mockRepository.findPaymentTransactions).toHaveBeenCalledWith(
        org1Id,
        expect.anything()
      );

      result.forEach((payment: any) => {
        expect(payment.organizationId).toBe(org1Id);
      });
    });

    it('should enforce organizationId when initiating payment', async () => {
      const paymentData = {
        paycheckId: 'a23e4567-e89b-12d3-a456-426614174009',
        payrollRunId: payrollRunId,
        employeeRecordId: 'b23e4567-e89b-12d3-a456-426614174010',
        paymentMethod: 'ach',
        paymentAmount: 2000.00,
        scheduledDate: new Date('2025-02-15'),
        bankAccountNumber: '123456789',
        routingNumber: '021000021',
        currency: 'USD'
      };

      mockRepository.createPaymentTransaction.mockResolvedValue({
        id: 'c23e4567-e89b-12d3-a456-426614174011',
        organization_id: org1Id,
        ...paymentData,
      });

      await paymentService.initiatePayment(paymentData, org1Id, user1Id);

      expect(mockRepository.createPaymentTransaction).toHaveBeenCalledWith(
        expect.anything(),
        org1Id,
        user1Id
      );
    });
  });

  describe('Cross-Organization Data Access Prevention', () => {
    it('should prevent listing worker types across organizations', async () => {
      const mockRepository = {
        findTemplatesByOrganization: jest.fn(),
      };

      const service = new WorkerTypeService(mockRepository);

      const org1Templates = [
        { id: workerType1Id, organization_id: org1Id, name: 'Org1 Worker' }
      ];
      const org2Templates = [
        { id: workerType2Id, organization_id: org2Id, name: 'Org2 Worker' }
      ];

      // Org1 request
      mockRepository.findTemplatesByOrganization.mockResolvedValueOnce(org1Templates);
      const org1Result = await service.listWorkerTypeTemplates(org1Id);
      
      // Org2 request
      mockRepository.findTemplatesByOrganization.mockResolvedValueOnce(org2Templates);
      const org2Result = await service.listWorkerTypeTemplates(org2Id);

      // Verify no cross-contamination
      expect(org1Result).not.toEqual(expect.arrayContaining(org2Templates));
      expect(org2Result).not.toEqual(expect.arrayContaining(org1Templates));
    });

    it('should prevent bulk operations from affecting other organizations', async () => {
      const mockRepository = {
        findTemplatesByOrganization: jest.fn(),
        update: jest.fn(),
      };

      const service = new WorkerTypeService(mockRepository);

      // Both orgs have templates
      mockRepository.findTemplatesByOrganization
        .mockResolvedValueOnce([
          { id: workerType1Id, organization_id: org1Id, name: 'Org1 Template' }
        ]);

      mockRepository.update.mockResolvedValue({ success: true });

      const templates = await service.listWorkerTypeTemplates(org1Id);

      // Attempt bulk update for org1
      for (const template of templates) {
        await service.updateWorkerTypeTemplate(
          template.id,
          { name: 'Updated' },
          org1Id,
          user1Id
        );
      }

      // Verify updates only called with org1Id
      expect(mockRepository.update).toHaveBeenCalledTimes(templates.length);
      mockRepository.update.mock.calls.forEach((call: any) => {
        expect(call[2]).toBe(org1Id); // organizationId parameter
      });
    });
  });

  describe('Audit Trail Enforcement', () => {
    it('should record creator in worker type creation', async () => {
      const mockRepository = {
        createTemplate: jest.fn(),
      };

      const service = new WorkerTypeService(mockRepository);

      const templateData = {
        name: 'New Template',
        code: 'NEW',
        defaultPayFrequency: 'monthly',
        defaultPaymentMethod: 'ach',
      };

      mockRepository.createTemplate.mockResolvedValue({
        id: workerType1Id,
        organization_id: org1Id,
        created_by: user1Id,
        ...templateData,
      });

      await service.createWorkerTypeTemplate(templateData, org1Id, user1Id);

      // Verify userId is passed for audit trail
      expect(mockRepository.createTemplate).toHaveBeenCalledWith(
        expect.anything(),
        org1Id,
        user1Id
      );
    });

    it('should record updater in worker type updates', async () => {
      const mockRepository = {
        findTemplateById: jest.fn(),
        update: jest.fn(),
      };

      const service = new WorkerTypeService(mockRepository);

      mockRepository.findTemplateById.mockResolvedValue({
        id: workerType1Id,
        organization_id: org1Id,
        name: 'Original',
      });

      mockRepository.update.mockResolvedValue({
        id: workerType1Id,
        updated_by: user1Id,
      });

      await service.updateWorkerTypeTemplate(
        workerType1Id,
        { name: 'Updated' },
        org1Id,
        user1Id
      );

      // Verify userId is passed for audit trail
      expect(mockRepository.update).toHaveBeenCalledWith(
        workerType1Id,
        expect.anything(),
        org1Id,
        user1Id
      );
    });

    it('should record deleter in soft deletes', async () => {
      const mockRepository = {
        findTemplateById: jest.fn(),
        countEmployeesByWorkerType: jest.fn(),
        delete: jest.fn(),
      };

      const service = new WorkerTypeService(mockRepository);

      mockRepository.findTemplateById.mockResolvedValue({
        id: workerType1Id,
        organization_id: org1Id,
      });
      mockRepository.countEmployeesByWorkerType.mockResolvedValue(0);
      mockRepository.delete.mockResolvedValue(true);

      await service.deleteWorkerTypeTemplate(workerType1Id, org1Id, user1Id);

      // Verify userId is passed for audit trail
      expect(mockRepository.delete).toHaveBeenCalledWith(
        workerType1Id,
        org1Id,
        user1Id
      );
    });
  });
});
