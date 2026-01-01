/**
 * Worker Type DTO Unit Tests
 * 
 * Tests for worker type data transformation functions.
 * Validates snake_case (DB) to camelCase (API) conversion.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Pure function testing
 * - EXACT function names from DTO (verified against source)
 * 
 * VERIFIED FUNCTIONS (from source analysis):
 * 1. mapWorkerTypeDbToApi(dbWorkerType)
 * 2. mapWorkerTypesDbToApi(dbWorkerTypes)
 * 3. mapWorkerTypeApiToDb(apiData)
 * 4. mapAssignmentDbToApi(dbHistory)
 * 5. mapAssignmentsDbToApi(dbAssignments)
 * 6. mapAssignmentApiToDb(apiData)
 */

import { describe, it, expect } from '@jest/globals';
import {
  mapWorkerTypeDbToApi,
  mapWorkerTypesDbToApi,
  mapWorkerTypeApiToDb,
  mapAssignmentDbToApi,
  mapAssignmentsDbToApi,
  mapAssignmentApiToDb
} from '../../../../src/products/paylinq/dto/workerTypeDto.js';

describe('Worker Type DTO', () => {
  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testWorkerTypeId = '660e8400-e29b-41d4-a716-446655440002';
  const testEmployeeId = '770e8400-e29b-41d4-a716-446655440003';

  // ==================== mapWorkerTypeDbToApi ====================

  describe('mapWorkerTypeDbToApi', () => {
    it('should map database worker type to API format', () => {
      // Arrange
      const dbWorkerType = {
        id: testWorkerTypeId,
        organization_id: testOrgId,
        name: 'Full-Time Employee',
        code: 'FTE',
        description: 'Regular full-time employment',
        benefits_eligible: true,
        pto_eligible: true,
        sick_leave_eligible: true,
        vacation_accrual_rate: '0.0833',
        default_pay_frequency: 'bi_weekly',
        default_payment_method: 'direct_deposit',
        overtime_eligible: true,
        pay_structure_template_code: 'STD_001',
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        deleted_at: null,
        created_by: testUserId,
        updated_by: testUserId,
        deleted_by: null
      };

      // Act
      const result = mapWorkerTypeDbToApi(dbWorkerType);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbWorkerType.id);
      expect(result.organizationId).toBe(dbWorkerType.organization_id);
      expect(result.name).toBe(dbWorkerType.name);
      expect(result.code).toBe(dbWorkerType.code);
      expect(result.description).toBe(dbWorkerType.description);
      expect(result.benefitsEligible).toBe(dbWorkerType.benefits_eligible);
      expect(result.ptoEligible).toBe(dbWorkerType.pto_eligible);
      expect(result.sickLeaveEligible).toBe(dbWorkerType.sick_leave_eligible);
      expect(result.vacationAccrualRate).toBe(0.0833);
      expect(result.defaultPayFrequency).toBe(dbWorkerType.default_pay_frequency);
      expect(result.defaultPaymentMethod).toBe(dbWorkerType.default_payment_method);
      expect(result.overtimeEligible).toBe(dbWorkerType.overtime_eligible);
      expect(result.payStructureTemplateCode).toBe(dbWorkerType.pay_structure_template_code);
      expect(result.isActive).toBe(dbWorkerType.is_active);
      expect(result.createdAt).toBe(dbWorkerType.created_at);
      expect(result.updatedAt).toBe(dbWorkerType.updated_at);
    });

    it('should return null for null input', () => {
      const result = mapWorkerTypeDbToApi(null);
      expect(result).toBeNull();
    });

    it('should handle worker type with null optional fields', () => {
      // Arrange
      const dbWorkerType = {
        id: testWorkerTypeId,
        organization_id: testOrgId,
        name: 'Contractor',
        code: 'CTR',
        description: null,
        benefits_eligible: false,
        pto_eligible: false,
        sick_leave_eligible: false,
        vacation_accrual_rate: null,
        default_pay_frequency: null,
        default_payment_method: null,
        overtime_eligible: undefined,
        pay_structure_template_code: null,
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapWorkerTypeDbToApi(dbWorkerType);

      // Assert
      expect(result.description).toBeNull();
      expect(result.vacationAccrualRate).toBeNull();
      expect(result.defaultPayFrequency).toBeNull();
      expect(result.overtimeEligible).toBe(true); // Default value
    });
  });

  // ==================== mapWorkerTypesDbToApi ====================

  describe('mapWorkerTypesDbToApi', () => {
    it('should map array of worker types to API format', () => {
      // Arrange
      const dbWorkerTypes = [
        {
          id: testWorkerTypeId,
          organization_id: testOrgId,
          name: 'Full-Time',
          code: 'FT',
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        },
        {
          id: '880e8400-e29b-41d4-a716-446655440004',
          organization_id: testOrgId,
          name: 'Part-Time',
          code: 'PT',
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        }
      ];

      // Act
      const result = mapWorkerTypesDbToApi(dbWorkerTypes);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Full-Time');
      expect(result[1].name).toBe('Part-Time');
    });

    it('should return empty array for non-array input', () => {
      const result = mapWorkerTypesDbToApi(null);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  // ==================== mapWorkerTypeApiToDb ====================

  describe('mapWorkerTypeApiToDb', () => {
    it('should map API worker type to database format', () => {
      // Arrange
      const apiData = {
        name: 'New Worker Type',
        code: 'NEW',
        description: 'New type description',
        benefitsEligible: true,
        ptoEligible: true,
        sickLeaveEligible: true,
        vacationAccrualRate: 0.0769,
        isActive: true,
        defaultPayFrequency: 'monthly',
        defaultPaymentMethod: 'check',
        overtimeEligible: false,
        payStructureTemplateCode: 'CUSTOM_001'
      };

      // Act
      const result = mapWorkerTypeApiToDb(apiData);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe(apiData.name);
      expect(result.code).toBe(apiData.code);
      expect(result.description).toBe(apiData.description);
      expect(result.benefits_eligible).toBe(apiData.benefitsEligible);
      expect(result.pto_eligible).toBe(apiData.ptoEligible);
      expect(result.sick_leave_eligible).toBe(apiData.sickLeaveEligible);
      expect(result.vacation_accrual_rate).toBe(apiData.vacationAccrualRate);
      expect(result.is_active).toBe(apiData.isActive);
      expect(result.default_pay_frequency).toBe(apiData.defaultPayFrequency);
      expect(result.default_payment_method).toBe(apiData.defaultPaymentMethod);
      expect(result.overtime_eligible).toBe(apiData.overtimeEligible);
      expect(result.pay_structure_template_code).toBe(apiData.payStructureTemplateCode);
    });

    it('should return null for null input', () => {
      const result = mapWorkerTypeApiToDb(null);
      expect(result).toBeNull();
    });

    it('should only include defined fields', () => {
      // Arrange
      const apiData = {
        name: 'Minimal Type',
        code: 'MIN'
      };

      // Act
      const result = mapWorkerTypeApiToDb(apiData);

      // Assert
      expect(result.name).toBe('Minimal Type');
      expect(result.code).toBe('MIN');
      expect(result.description).toBeUndefined();
    });
  });

  // ==================== mapAssignmentDbToApi ====================

  describe('mapAssignmentDbToApi', () => {
    it('should map database assignment to API format', () => {
      // Arrange
      const dbAssignment = {
        id: '990e8400-e29b-41d4-a716-446655440005',
        organization_id: testOrgId,
        employee_id: testEmployeeId,
        worker_type_id: testWorkerTypeId,
        effective_from: new Date('2024-01-01'),
        effective_to: new Date('2024-12-31'),
        is_current: true,
        pay_frequency: 'bi_weekly',
        payment_method: 'direct_deposit',
        change_reason: 'Promotion',
        recorded_at: new Date('2024-01-01'),
        recorded_by: testUserId,
        worker_type_name: 'Full-Time Employee',
        worker_type_code: 'FTE',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        deleted_at: null
      };

      // Act
      const result = mapAssignmentDbToApi(dbAssignment);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbAssignment.id);
      expect(result.organizationId).toBe(dbAssignment.organization_id);
      expect(result.employeeId).toBe(dbAssignment.employee_id);
      expect(result.workerTypeId).toBe(dbAssignment.worker_type_id);
      expect(result.effectiveFrom).toBe(dbAssignment.effective_from);
      expect(result.effectiveTo).toBe(dbAssignment.effective_to);
      expect(result.isCurrent).toBe(dbAssignment.is_current);
      expect(result.payFrequency).toBe(dbAssignment.pay_frequency);
      expect(result.paymentMethod).toBe(dbAssignment.payment_method);
      expect(result.changeReason).toBe(dbAssignment.change_reason);
      expect(result.recordedAt).toBe(dbAssignment.recorded_at);
      expect(result.recordedBy).toBe(dbAssignment.recorded_by);
      expect(result.workerTypeName).toBe(dbAssignment.worker_type_name);
      expect(result.workerTypeCode).toBe(dbAssignment.worker_type_code);
    });

    it('should return null for null input', () => {
      const result = mapAssignmentDbToApi(null);
      expect(result).toBeNull();
    });

    it('should handle assignment with null optional fields', () => {
      // Arrange
      const dbAssignment = {
        id: '990e8400-e29b-41d4-a716-446655440005',
        organization_id: testOrgId,
        employee_id: testEmployeeId,
        worker_type_id: testWorkerTypeId,
        effective_from: new Date('2024-01-01'),
        effective_to: null,
        is_current: true,
        pay_frequency: null,
        payment_method: null,
        change_reason: null,
        recorded_at: new Date('2024-01-01'),
        recorded_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapAssignmentDbToApi(dbAssignment);

      // Assert
      expect(result.effectiveTo).toBeNull();
      expect(result.payFrequency).toBeNull();
      expect(result.paymentMethod).toBeNull();
      expect(result.changeReason).toBeNull();
      expect(result.workerTypeName).toBeNull();
    });
  });

  // ==================== mapAssignmentsDbToApi ====================

  describe('mapAssignmentsDbToApi', () => {
    it('should map array of assignments to API format', () => {
      // Arrange
      const dbAssignments = [
        {
          id: '1',
          organization_id: testOrgId,
          employee_id: testEmployeeId,
          worker_type_id: testWorkerTypeId,
          effective_from: new Date('2024-01-01'),
          is_current: true,
          recorded_at: new Date('2024-01-01'),
          recorded_by: testUserId,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        },
        {
          id: '2',
          organization_id: testOrgId,
          employee_id: testEmployeeId,
          worker_type_id: '880e8400-e29b-41d4-a716-446655440004',
          effective_from: new Date('2023-01-01'),
          is_current: false,
          recorded_at: new Date('2023-01-01'),
          recorded_by: testUserId,
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-01')
        }
      ];

      // Act
      const result = mapAssignmentsDbToApi(dbAssignments);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].isCurrent).toBe(true);
      expect(result[1].isCurrent).toBe(false);
    });

    it('should return empty array for non-array input', () => {
      const result = mapAssignmentsDbToApi(null);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  // ==================== mapAssignmentApiToDb ====================

  describe('mapAssignmentApiToDb', () => {
    it('should map API assignment to database format', () => {
      // Arrange
      const apiData = {
        employeeId: testEmployeeId,
        workerTypeId: testWorkerTypeId,
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: new Date('2024-12-31'),
        isCurrent: true,
        payFrequency: 'monthly',
        paymentMethod: 'check',
        changeReason: 'Role change'
      };

      // Act
      const result = mapAssignmentApiToDb(apiData);

      // Assert
      expect(result).toBeDefined();
      expect(result.employee_id).toBe(apiData.employeeId);
      expect(result.worker_type_id).toBe(apiData.workerTypeId);
      expect(result.effective_from).toBe(apiData.effectiveFrom);
      expect(result.effective_to).toBe(apiData.effectiveTo);
      expect(result.is_current).toBe(apiData.isCurrent);
      expect(result.pay_frequency).toBe(apiData.payFrequency);
      expect(result.payment_method).toBe(apiData.paymentMethod);
      expect(result.change_reason).toBe(apiData.changeReason);
    });

    it('should return null for null input', () => {
      const result = mapAssignmentApiToDb(null);
      expect(result).toBeNull();
    });

    it('should only include defined fields', () => {
      // Arrange
      const apiData = {
        employeeId: testEmployeeId,
        workerTypeId: testWorkerTypeId,
        effectiveFrom: new Date('2024-01-01')
      };

      // Act
      const result = mapAssignmentApiToDb(apiData);

      // Assert
      expect(result.employee_id).toBe(testEmployeeId);
      expect(result.worker_type_id).toBe(testWorkerTypeId);
      expect(result.effective_from).toEqual(apiData.effectiveFrom);
      expect(result.effective_to).toBeUndefined();
    });
  });
});
