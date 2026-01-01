/**
 * ReconciliationRepository Unit Tests
 * 
 * Tests for payroll reconciliation data access layer.
 * Covers reconciliation records, items, adjustments, and discrepancy resolution.
 * 
 * VERIFIED METHODS:
 * 1. createReconciliation(reconciliationData, organizationId, userId)
 * 2. findReconciliations(criteria, organizationId)
 * 3. findReconciliationById(reconciliationId, organizationId)
 * 4. updateReconciliation(reconciliationId, organizationId, updates)
 * 5. completeReconciliation(reconciliationId, actualTotal, organizationId, userId)
 * 6. createReconciliationItem(itemData, organizationId, userId)
 * 7. findReconciliationItems(reconciliationId, organizationId, filters)
 * 8. getReconciliationSummary(reconciliationId, organizationId)
 * 9. createPayrollAdjustment(adjustmentData, organizationId, userId)
 * 10. findAdjustmentsByRun(payrollRunId, organizationId)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ReconciliationRepository from '../../../../src/products/paylinq/repositories/reconciliationRepository.js';

describe('ReconciliationRepository', () => {
  let repository: ReconciliationRepository;
  let mockQuery: jest.Mock;
  
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testReconciliationId = '323e4567-e89b-12d3-a456-426614174002';
  const testPayrollRunId = '423e4567-e89b-12d3-a456-426614174003';
  const testEmployeeId = '523e4567-e89b-12d3-a456-426614174004';

  beforeEach(() => {
    mockQuery = jest.fn();
    repository = new ReconciliationRepository({ query: mockQuery });
  });

  describe('createReconciliation', () => {
    it('should create reconciliation record', async () => {
      const reconciliationData = {
        payrollRunId: testPayrollRunId,
        expectedTotal: 100000,
        reconciliationDate: '2025-06-15',
        status: 'pending'
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: testReconciliationId, ...reconciliationData }] });

      const result = await repository.createReconciliation(reconciliationData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reconciliations'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'reconciliations' }
      );
    });
  });

  describe('findReconciliations', () => {
    it('should find reconciliations by criteria', async () => {
      const criteria = { status: 'pending' };
      mockQuery.mockResolvedValue({ rows: [{ id: testReconciliationId }] });

      const result = await repository.findReconciliations(criteria, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM reconciliations'),
        expect.arrayContaining([testOrgId]),
        testOrgId,
        { operation: 'SELECT', table: 'reconciliations' }
      );
    });
  });

  describe('findReconciliationById', () => {
    it('should return reconciliation by ID', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testReconciliationId, organization_id: testOrgId }] });

      const result = await repository.findReconciliationById(testReconciliationId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [testReconciliationId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'reconciliations' }
      );
    });
  });

  describe('updateReconciliation', () => {
    it('should update reconciliation', async () => {
      const updates = { status: 'completed' };
      mockQuery.mockResolvedValue({ rows: [{ id: testReconciliationId, ...updates }] });

      const result = await repository.updateReconciliation(testReconciliationId, testOrgId, updates);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reconciliations'),
        expect.any(Array),
        testOrgId,
        { operation: 'UPDATE', table: 'reconciliations' }
      );
    });
  });

  describe('completeReconciliation', () => {
    it('should complete reconciliation with actual total', async () => {
      const actualTotal = 99500;
      mockQuery.mockResolvedValue({ rows: [{ id: testReconciliationId, actual_total: actualTotal, status: 'completed' }] });

      const result = await repository.completeReconciliation(testReconciliationId, actualTotal, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reconciliations'),
        expect.arrayContaining([actualTotal, testUserId, testReconciliationId, testOrgId]),
        testOrgId,
        { operation: 'UPDATE', table: 'reconciliations' }
      );
    });
  });

  describe('createReconciliationItem', () => {
    it('should create reconciliation item', async () => {
      const itemData = {
        reconciliationId: testReconciliationId,
        itemType: 'discrepancy',
        description: 'Missing payment record',
        amount: 500,
        status: 'pending'
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: '623e4567-e89b-12d3-a456-426614174005', ...itemData }] });

      const result = await repository.createReconciliationItem(itemData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reconciliation_items'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'reconciliation_items' }
      );
    });
  });

  describe('findReconciliationItems', () => {
    it('should return items for reconciliation', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: '723e4567-e89b-12d3-a456-426614174006' }] });

      const result = await repository.findReconciliationItems(testReconciliationId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE reconciliation_id = $1'),
        [testReconciliationId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'reconciliation_items' }
      );
    });
  });

  describe('getReconciliationSummary', () => {
    it('should return reconciliation summary', async () => {
      const summary = {
        total_items: 10,
        pending_items: 5,
        resolved_items: 5,
        total_discrepancy: 500
      };
      
      mockQuery.mockResolvedValue({ rows: [summary] });

      const result = await repository.getReconciliationSummary(testReconciliationId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE reconciliation_id = $1'),
        [testReconciliationId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'reconciliation_items' }
      );
    });
  });

  describe('createPayrollAdjustment', () => {
    it('should create payroll adjustment', async () => {
      const adjustmentData = {
        payrollRunId: testPayrollRunId,
        employeeId: testEmployeeId,
        adjustmentType: 'correction',
        amount: 100,
        reason: 'Calculation error correction'
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: '823e4567-e89b-12d3-a456-426614174007', ...adjustmentData }] });

      const result = await repository.createPayrollAdjustment(adjustmentData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll_adjustments'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'payroll_adjustments' }
      );
    });
  });

  describe('findAdjustmentsByRun', () => {
    it('should return adjustments for payroll run', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: '923e4567-e89b-12d3-a456-426614174008' }] });

      const result = await repository.findAdjustmentsByRun(testPayrollRunId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE payroll_run_id = $1'),
        [testPayrollRunId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'payroll_adjustments' }
      );
    });
  });
});
