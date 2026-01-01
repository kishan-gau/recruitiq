/**
 * ReconciliationService Test Suite
 * 
 * Tests for PayLinQ reconciliation service following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Dependency injection pattern
 * - Comprehensive service method coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ReconciliationService from '../../../../src/products/paylinq/services/reconciliationService.js';

describe('ReconciliationService', () => {
  let service: any;
  let mockRepository: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testReconciliationId = '323e4567-e89b-12d3-a456-426614174002';
  const testPayrollRunId = '423e4567-e89b-12d3-a456-426614174003';

  beforeEach(() => {
    // Create comprehensive mock repository
    mockRepository = {
      createReconciliation: jest.fn(),
      findReconciliations: jest.fn(),
      findReconciliationById: jest.fn(),
      updateReconciliation: jest.fn(),
      deleteReconciliation: jest.fn(),
      completeReconciliation: jest.fn(),
      getReconciliationSummary: jest.fn(),
      findReconciliationItems: jest.fn()
    };

    // Instantiate service with injected mock repository
    service = new ReconciliationService(mockRepository);
  });

  describe('startReconciliation / createReconciliation', () => {
    it('should start reconciliation with valid data', async () => {
      const reconciliationData = {
        payrollRunId: testPayrollRunId,
        reconciliationType: 'bank',
        reconciliationDate: new Date('2025-01-15'),
        expectedAmount: 50000,
        actualAmount: 49500
      };

      const mockReconciliation = {
        id: testReconciliationId,
        ...reconciliationData
      };

      mockRepository.createReconciliation.mockResolvedValue(mockReconciliation);

      const result = await service.startReconciliation(reconciliationData, testOrganizationId, testUserId);

      expect(result).toEqual(mockReconciliation);
      expect(mockRepository.createReconciliation).toHaveBeenCalledWith(
        expect.objectContaining({
          payrollRunId: testPayrollRunId,
          reconciliationType: 'bank'
        }),
        testOrganizationId,
        testUserId
      );
    });

    it('should throw validation error for missing required fields', async () => {
      const invalidData = {
        reconciliationType: 'bank'
        // Missing payrollRunId
      };

      await expect(service.startReconciliation(invalidData, testOrganizationId, testUserId))
        .rejects.toThrow();
    });

    it('should throw validation error for invalid reconciliation type', async () => {
      const invalidData = {
        payrollRunId: testPayrollRunId,
        reconciliationType: 'invalid_type'
      };

      await expect(service.startReconciliation(invalidData, testOrganizationId, testUserId))
        .rejects.toThrow();
    });

    it('should accept all valid reconciliation types', async () => {
      const validTypes = ['bank', 'gl', 'tax', 'benefit'];

      for (const reconciliationType of validTypes) {
        const data = {
          payrollRunId: testPayrollRunId,
          reconciliationType
        };

        mockRepository.createReconciliation.mockResolvedValue({ id: testReconciliationId, ...data });

        await service.startReconciliation(data, testOrganizationId, testUserId);

        expect(mockRepository.createReconciliation).toHaveBeenCalledWith(
          expect.objectContaining({ reconciliationType }),
          testOrganizationId,
          testUserId
        );
      }
    });

    it('createReconciliation should alias to startReconciliation', async () => {
      const reconciliationData = {
        payrollRunId: testPayrollRunId,
        reconciliationType: 'bank'
      };

      mockRepository.createReconciliation.mockResolvedValue({ id: testReconciliationId });

      await service.createReconciliation(reconciliationData, testOrganizationId, testUserId);

      expect(mockRepository.createReconciliation).toHaveBeenCalled();
    });
  });

  describe('getReconciliations', () => {
    it('should retrieve all reconciliations', async () => {
      const mockReconciliations = [
        { id: '1', reconciliation_type: 'bank' },
        { id: '2', reconciliation_type: 'gl' }
      ];

      mockRepository.findReconciliations.mockResolvedValue(mockReconciliations);

      const result = await service.getReconciliations(testOrganizationId);

      expect(result).toEqual(mockReconciliations);
      expect(mockRepository.findReconciliations).toHaveBeenCalledWith({}, testOrganizationId);
    });

    it('should retrieve reconciliations with filters', async () => {
      const filters = { reconciliationType: 'bank' };
      const mockReconciliations = [{ id: '1', reconciliation_type: 'bank' }];

      mockRepository.findReconciliations.mockResolvedValue(mockReconciliations);

      const result = await service.getReconciliations(testOrganizationId, filters);

      expect(result).toEqual(mockReconciliations);
      expect(mockRepository.findReconciliations).toHaveBeenCalledWith(filters, testOrganizationId);
    });

    it('getReconciliationsByOrganization should alias to getReconciliations', async () => {
      mockRepository.findReconciliations.mockResolvedValue([]);

      await service.getReconciliationsByOrganization(testOrganizationId);

      expect(mockRepository.findReconciliations).toHaveBeenCalledWith({}, testOrganizationId);
    });
  });

  describe('getReconciliationById', () => {
    it('should retrieve reconciliation with summary', async () => {
      const mockReconciliation = {
        id: testReconciliationId,
        reconciliation_type: 'bank',
        expected_amount: 50000
      };

      const mockSummary = {
        totalItems: 10,
        unresolvedItems: 2,
        totalVariance: 500
      };

      mockRepository.findReconciliationById.mockResolvedValue(mockReconciliation);
      mockRepository.getReconciliationSummary.mockResolvedValue(mockSummary);

      const result = await service.getReconciliationById(testReconciliationId, testOrganizationId);

      expect(result).toEqual({
        ...mockReconciliation,
        summary: mockSummary
      });
      expect(mockRepository.findReconciliationById).toHaveBeenCalledWith(
        testReconciliationId,
        testOrganizationId
      );
      expect(mockRepository.getReconciliationSummary).toHaveBeenCalledWith(
        testReconciliationId,
        testOrganizationId
      );
    });

    it('should throw NotFoundError when reconciliation does not exist', async () => {
      mockRepository.findReconciliationById.mockResolvedValue(null);

      await expect(service.getReconciliationById(testReconciliationId, testOrganizationId))
        .rejects.toThrow('Reconciliation not found');
    });
  });

  describe('updateReconciliation', () => {
    it('should update reconciliation', async () => {
      const updateData = {
        actualAmount: 49500,
        notes: 'Updated amount'
      };

      const mockUpdatedReconciliation = {
        id: testReconciliationId,
        ...updateData
      };

      mockRepository.updateReconciliation.mockResolvedValue(mockUpdatedReconciliation);

      const result = await service.updateReconciliation(testReconciliationId, testOrganizationId, updateData);

      expect(result).toEqual(mockUpdatedReconciliation);
      expect(mockRepository.updateReconciliation).toHaveBeenCalledWith(
        testReconciliationId,
        testOrganizationId,
        updateData
      );
    });

    it('should throw NotFoundError when reconciliation does not exist', async () => {
      mockRepository.updateReconciliation.mockResolvedValue(null);

      await expect(service.updateReconciliation(testReconciliationId, testOrganizationId, {}))
        .rejects.toThrow('Reconciliation not found');
    });
  });

  describe('deleteReconciliation', () => {
    it('should delete reconciliation', async () => {
      mockRepository.deleteReconciliation.mockResolvedValue(true);

      const result = await service.deleteReconciliation(testReconciliationId, testOrganizationId, testUserId);

      expect(result).toBe(true);
      expect(mockRepository.deleteReconciliation).toHaveBeenCalledWith(
        testReconciliationId,
        testOrganizationId,
        testUserId
      );
    });

    it('should throw NotFoundError when reconciliation does not exist', async () => {
      mockRepository.deleteReconciliation.mockResolvedValue(false);

      await expect(service.deleteReconciliation(testReconciliationId, testOrganizationId, testUserId))
        .rejects.toThrow('Reconciliation not found');
    });
  });

  describe('completeReconciliation', () => {
    it('should complete reconciliation when all items resolved', async () => {
      const mockReconciliation = {
        id: testReconciliationId,
        expected_amount: 50000
      };

      const mockResolvedItems = [
        { actual_amount: 25000 },
        { actual_amount: 24500 }
      ];

      const mockCompletedReconciliation = {
        id: testReconciliationId,
        status: 'completed',
        actual_amount: 49500,
        variance_amount: 500
      };

      mockRepository.findReconciliationById.mockResolvedValue(mockReconciliation);
      mockRepository.findReconciliationItems
        .mockResolvedValueOnce([]) // No unresolved items
        .mockResolvedValueOnce(mockResolvedItems); // All items
      mockRepository.completeReconciliation.mockResolvedValue(mockCompletedReconciliation);

      const result = await service.completeReconciliation(testReconciliationId, testOrganizationId, testUserId);

      expect(result).toEqual(mockCompletedReconciliation);
      expect(mockRepository.completeReconciliation).toHaveBeenCalledWith(
        testReconciliationId,
        49500,
        testOrganizationId,
        testUserId
      );
    });

    it('should throw error when unresolved items remain', async () => {
      const mockReconciliation = {
        id: testReconciliationId
      };

      const mockUnresolvedItems = [
        { id: '1', is_reconciled: false },
        { id: '2', is_reconciled: false }
      ];

      mockRepository.findReconciliationById.mockResolvedValue(mockReconciliation);
      mockRepository.findReconciliationItems.mockResolvedValue(mockUnresolvedItems);

      await expect(service.completeReconciliation(testReconciliationId, testOrganizationId, testUserId))
        .rejects.toThrow('Cannot complete reconciliation. 2 unresolved items remain.');
    });

    it('should throw NotFoundError when reconciliation does not exist', async () => {
      mockRepository.findReconciliationById.mockResolvedValue(null);

      await expect(service.completeReconciliation(testReconciliationId, testOrganizationId, testUserId))
        .rejects.toThrow('Reconciliation not found');
    });

    it('should throw error when completion fails', async () => {
      const mockReconciliation = {
        id: testReconciliationId
      };

      mockRepository.findReconciliationById.mockResolvedValue(mockReconciliation);
      mockRepository.findReconciliationItems
        .mockResolvedValueOnce([]) // No unresolved items
        .mockResolvedValueOnce([]); // All items
      mockRepository.completeReconciliation.mockResolvedValue(null);

      await expect(service.completeReconciliation(testReconciliationId, testOrganizationId, testUserId))
        .rejects.toThrow('Failed to complete reconciliation');
    });

    it('should calculate correct actual total from all items', async () => {
      const mockReconciliation = {
        id: testReconciliationId
      };

      const mockItems = [
        { actual_amount: '10000.50' },
        { actual_amount: '15000.75' },
        { actual_amount: '5000.25' }
      ];

      mockRepository.findReconciliationById.mockResolvedValue(mockReconciliation);
      mockRepository.findReconciliationItems
        .mockResolvedValueOnce([]) // No unresolved items
        .mockResolvedValueOnce(mockItems); // All items
      mockRepository.completeReconciliation.mockResolvedValue({});

      await service.completeReconciliation(testReconciliationId, testOrganizationId, testUserId);

      expect(mockRepository.completeReconciliation).toHaveBeenCalledWith(
        testReconciliationId,
        30001.5, // Sum of all amounts
        testOrganizationId,
        testUserId
      );
    });
  });

  describe('validation schemas', () => {
    it('should have reconciliationSchema defined', () => {
      expect(service.reconciliationSchema).toBeDefined();
    });

    it('should have reconciliationItemSchema defined', () => {
      expect(service.reconciliationItemSchema).toBeDefined();
    });

    it('should have payrollAdjustmentSchema defined', () => {
      expect(service.payrollAdjustmentSchema).toBeDefined();
    });

    it('should strip unknown fields in reconciliationSchema', () => {
      const data = {
        payrollRunId: testPayrollRunId,
        reconciliationType: 'bank',
        unknownField: 'should be removed'
      };

      const { value } = service.reconciliationSchema.validate(data);
      expect(value).not.toHaveProperty('unknownField');
    });
  });
});
