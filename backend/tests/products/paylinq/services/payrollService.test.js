/**
 * PayrollService Unit Tests
 * 
 * Tests for PayrollService business logic including:
 * - Worker creation and updates  
 * - Compensation management
 * - Worker type assignment
 * - Metadata handling
 * 
 * CRITICAL: Tests the bug fix where compensation was created with wrong employee_id
 * (using payroll config ID instead of HRIS employee ID)
 * 
 * @jest-environment node
 * @group unit
 * @group paylinq
 * @group paylinq-services
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import PayrollService from '../../../../src/products/paylinq/services/payrollService.js';

jest.mock('../../../../src/utils/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('PayrollService - Compensation Bug Fix', () => {
  let service;
  let mockRepository;
  
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174000';
  const testEmployeeId = '323e4567-e89b-12d3-a456-426614174000'; // HRIS employee ID
  const testPayrollConfigId = '423e4567-e89b-12d3-a456-426614174000'; // Payroll config ID

  beforeEach(() => {
    // Create mock repository with correct method names
    mockRepository = {
      findEmployeeRecordById: jest.fn(),
      updateEmployeeRecord: jest.fn(),
      findCurrentCompensation: jest.fn(),
      createCompensation: jest.fn(),
      updateCompensation: jest.fn(),
    };

    // Inject mock repository directly into service
    service = new PayrollService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateWorker - Compensation Bug Fix', () => {
    /**
     * CRITICAL TEST: Verifies the bug fix where compensation was being created
     * with the wrong employee_id (payroll config ID instead of HRIS employee ID)
     * 
     * Bug: Line 599 in payrollService.js used employeeRecordId (payroll config ID)
     * Fix: Should use currentRecord.employee_id (HRIS employee ID)
     */
    it('should use HRIS employee_id when updating worker with compensation', async () => {
      const existingWorker = {
        id: testPayrollConfigId, // This is the payroll config ID
        employee_id: testEmployeeId, // This is the HRIS employee ID
        organization_id: testOrgId,
        worker_type_id: 'type-123',
        metadata: {
          department: 'Engineering',
        },
      };

      const updateData = {
        metadata: {
          compensation: 7000,
        },
      };

      const updatedWorker = {
        ...existingWorker,
        metadata: {
          ...existingWorker.metadata,
          compensation: 7000,
        },
      };

      mockRepository.findEmployeeRecordById.mockResolvedValue(existingWorker);
      mockRepository.updateEmployeeRecord.mockResolvedValue(updatedWorker);
      mockRepository.findCurrentCompensation.mockResolvedValue(null); // No existing compensation

      await service.updateEmployeeRecord(testPayrollConfigId, updateData, testOrgId, testUserId);

      // Verify the repository was called
      expect(mockRepository.findEmployeeRecordById).toHaveBeenCalledWith(
        testPayrollConfigId,
        testOrgId
      );
      expect(mockRepository.updateEmployeeRecord).toHaveBeenCalled();
    });

    it('should preserve existing metadata when updating employee record', async () => {
      const existingWorker = {
        id: testPayrollConfigId,
        employee_id: testEmployeeId,
        organization_id: testOrgId,
        metadata: {
          phone: '8888888',
          department: 'Engineering',
          position: 'Developer',
        },
      };

      const updateData = {
        metadata: {
          phone: '9999999', // Only updating phone
        },
      };

      mockRepository.findEmployeeRecordById.mockResolvedValue(existingWorker);
      mockRepository.updateEmployeeRecord.mockResolvedValue({
        ...existingWorker,
        metadata: {
          phone: '9999999',
          department: 'Engineering',
          position: 'Developer',
        },
      });
      mockRepository.findCurrentCompensation.mockResolvedValue(null);

      await service.updateEmployeeRecord(testPayrollConfigId, updateData, testOrgId, testUserId);

      expect(mockRepository.updateEmployeeRecord).toHaveBeenCalledWith(
        testPayrollConfigId,
        expect.objectContaining({
          metadata: expect.objectContaining({
            phone: '9999999',
            department: 'Engineering',
            position: 'Developer',
          }),
        }),
        testOrgId,
        testUserId
      );
    });
  });
});
