/**
 * Run Component DTO Unit Tests
 * 
 * Tests for run component data transformation functions.
 * Validates snake_case (DB) to camelCase (API) conversion.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Pure function testing
 * - EXACT function names from DTO (verified against source)
 * 
 * VERIFIED FUNCTIONS (from source analysis):
 * 1. mapRunComponentDbToApi(dbRunComponent)
 * 2. mapRunComponentsDbToApi(dbRunComponents)
 * 3. mapRunComponentApiToDb(apiData)
 * 4. mapRunComponentsToBreakdown(dbComponents)
 */

import { describe, it, expect } from '@jest/globals';
import {
  mapRunComponentDbToApi,
  mapRunComponentsDbToApi,
  mapRunComponentApiToDb,
  mapRunComponentsToBreakdown
} from '../../../../src/products/paylinq/dto/runComponentDto.js';

describe('Run Component DTO', () => {
  const testRunId = '880e8400-e29b-41d4-a716-446655440004';
  const testComponentId = '660e8400-e29b-41d4-a716-446655440002';

  // ==================== mapRunComponentDbToApi ====================

  describe('mapRunComponentDbToApi', () => {
    it('should map database run component to API format', () => {
      // Arrange
      const dbComponent = {
        id: testComponentId,
        run_id: testRunId,
        component_code: 'BASE',
        component_name: 'Base Salary',
        component_type: 'earning',
        amount: '5000.00',
        calculation_metadata: { rate: 25, hours: 200 },
        is_taxable: true,
        display_order: 1,
        created_at: new Date('2024-01-01')
      };

      // Act
      const result = mapRunComponentDbToApi(dbComponent);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbComponent.id);
      expect(result.runId).toBe(dbComponent.run_id);
      expect(result.componentCode).toBe(dbComponent.component_code);
      expect(result.componentName).toBe(dbComponent.component_name);
      expect(result.componentType).toBe(dbComponent.component_type);
      expect(result.amount).toBe(5000);
      expect(result.calculationMetadata).toEqual(dbComponent.calculation_metadata);
      expect(result.isTaxable).toBe(dbComponent.is_taxable);
      expect(result.displayOrder).toBe(dbComponent.display_order);
      expect(result.createdAt).toBe(dbComponent.created_at);
    });

    it('should return null for null input', () => {
      const result = mapRunComponentDbToApi(null);
      expect(result).toBeNull();
    });

    it('should handle component with null metadata', () => {
      // Arrange
      const dbComponent = {
        id: testComponentId,
        run_id: testRunId,
        component_code: 'BONUS',
        component_name: 'Bonus',
        component_type: 'earning',
        amount: '1000.00',
        calculation_metadata: null,
        is_taxable: true,
        display_order: 2,
        created_at: new Date('2024-01-01')
      };

      // Act
      const result = mapRunComponentDbToApi(dbComponent);

      // Assert
      expect(result.calculationMetadata).toEqual({});
    });
  });

  // ==================== mapRunComponentsDbToApi ====================

  describe('mapRunComponentsDbToApi', () => {
    it('should map array of components to API format', () => {
      // Arrange
      const dbComponents = [
        {
          id: testComponentId,
          run_id: testRunId,
          component_code: 'COMP1',
          component_name: 'Component 1',
          component_type: 'earning',
          amount: '1000.00',
          is_taxable: true,
          display_order: 1,
          created_at: new Date('2024-01-01')
        },
        {
          id: '770e8400-e29b-41d4-a716-446655440003',
          run_id: testRunId,
          component_code: 'COMP2',
          component_name: 'Component 2',
          component_type: 'deduction',
          amount: '100.00',
          is_taxable: false,
          display_order: 2,
          created_at: new Date('2024-01-01')
        }
      ];

      // Act
      const result = mapRunComponentsDbToApi(dbComponents);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].componentName).toBe('Component 1');
      expect(result[1].componentName).toBe('Component 2');
    });

    it('should return empty array for non-array input', () => {
      const result = mapRunComponentsDbToApi(null);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  // ==================== mapRunComponentApiToDb ====================

  describe('mapRunComponentApiToDb', () => {
    it('should map API component to database format', () => {
      // Arrange
      const apiData = {
        runId: testRunId,
        componentCode: 'OT',
        componentName: 'Overtime',
        componentType: 'earning',
        amount: 500,
        calculationMetadata: { hours: 10, rate: 50 },
        isTaxable: true,
        displayOrder: 3
      };

      // Act
      const result = mapRunComponentApiToDb(apiData);

      // Assert
      expect(result).toBeDefined();
      expect(result.run_id).toBe(apiData.runId);
      expect(result.component_code).toBe(apiData.componentCode);
      expect(result.component_name).toBe(apiData.componentName);
      expect(result.component_type).toBe(apiData.componentType);
      expect(result.amount).toBe(apiData.amount);
      expect(result.calculation_metadata).toEqual(apiData.calculationMetadata);
      expect(result.is_taxable).toBe(apiData.isTaxable);
      expect(result.display_order).toBe(apiData.displayOrder);
    });

    it('should return null for null input', () => {
      const result = mapRunComponentApiToDb(null);
      expect(result).toBeNull();
    });

    it('should handle default values', () => {
      // Arrange
      const apiData = {
        runId: testRunId,
        componentCode: 'TEST',
        componentName: 'Test Component',
        componentType: 'earning',
        amount: 100
      };

      // Act
      const result = mapRunComponentApiToDb(apiData);

      // Assert
      expect(result.calculation_metadata).toEqual({});
      expect(result.is_taxable).toBe(true);
      expect(result.display_order).toBe(999);
    });
  });

  // ==================== mapRunComponentsToBreakdown ====================

  describe('mapRunComponentsToBreakdown', () => {
    it('should map components to breakdown structure', () => {
      // Arrange
      const dbComponents = [
        {
          id: '1',
          component_code: 'BASE',
          component_name: 'Base Salary',
          component_type: 'earning',
          amount: '5000.00',
          is_taxable: true,
          calculation_metadata: {
            taxCalculation: {
              taxFreeAmount: '500.00',
              taxableAmount: '4500.00',
              wageTax: '800.00',
              aovTax: '250.00',
              awwTax: '200.00',
              totalTax: '1250.00',
              effectiveTaxRate: 0.25
            }
          }
        },
        {
          id: '2',
          component_code: 'HEALTH',
          component_name: 'Health Insurance',
          component_type: 'deduction',
          amount: '200.00',
          calculation_metadata: {
            deductionType: 'insurance',
            isPreTax: true
          }
        }
      ];

      // Act
      const result = mapRunComponentsToBreakdown(dbComponents);

      // Assert
      expect(result).toBeDefined();
      expect(result.earnings).toHaveLength(1);
      expect(result.deductions).toHaveLength(1);
      expect(result.earnings[0].componentCode).toBe('BASE');
      expect(result.earnings[0].amount).toBe(5000);
      expect(result.earnings[0].wageTax).toBe(800);
      expect(result.deductions[0].componentCode).toBe('HEALTH');
      expect(result.deductions[0].amount).toBe(200);
      expect(result.summary.totalEarnings).toBe(5000);
      expect(result.summary.totalWageTax).toBe(800);
      expect(result.summary.totalDeductions).toBe(200);
    });

    it('should return empty structure for empty array', () => {
      // Act
      const result = mapRunComponentsToBreakdown([]);

      // Assert
      expect(result.earnings).toEqual([]);
      expect(result.deductions).toEqual([]);
      expect(result.taxes).toEqual([]);
      expect(result.benefits).toEqual([]);
      expect(result.summary.totalEarnings).toBe(0);
      expect(result.summary.netPay).toBe(0);
    });

    it('should throw error for null input', () => {
      // Act & Assert
      expect(() => mapRunComponentsToBreakdown(null)).toThrow('Components array is required');
    });

    it('should throw error for non-array input', () => {
      // Act & Assert
      expect(() => mapRunComponentsToBreakdown({ not: 'array' })).toThrow('Components must be an array');
    });

    it('should throw error for components missing required fields', () => {
      // Arrange
      const invalid = [
        { component_code: 'TEST' } // missing component_name and amount
      ];

      // Act & Assert
      expect(() => mapRunComponentsToBreakdown(invalid)).toThrow('Component must have component_code, component_name, and amount');
    });
  });
});
