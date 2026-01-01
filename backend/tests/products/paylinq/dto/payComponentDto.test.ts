/**
 * Pay Component DTO Unit Tests
 * 
 * Tests for pay component data transformation functions.
 * Validates snake_case (DB) to camelCase (API) conversion.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Pure function testing
 * - EXACT function names from DTO (verified against source)
 * 
 * VERIFIED FUNCTIONS (from source analysis):
 * 1. mapComponentDbToApi(dbComponent)
 * 2. mapComponentsDbToApi(dbComponents)
 * 3. mapComponentApiToDb(apiData)
 */

import { describe, it, expect } from '@jest/globals';
import {
  mapComponentDbToApi,
  mapComponentsDbToApi,
  mapComponentApiToDb
} from '../../../../src/products/paylinq/dto/payComponentDto.js';

describe('Pay Component DTO', () => {
  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testComponentId = '660e8400-e29b-41d4-a716-446655440002';

  // ==================== mapComponentDbToApi ====================

  describe('mapComponentDbToApi', () => {
    it('should map database component to API format', () => {
      // Arrange
      const dbComponent = {
        id: testComponentId,
        organization_id: testOrgId,
        component_code: 'BASE_SALARY',
        component_name: 'Base Salary',
        component_type: 'earning',
        description: 'Regular base salary',
        calculation_type: 'fixed_amount',
        default_rate: '25.00',
        default_amount: '5000.00',
        formula: null,
        calculation_metadata: { rounding: 'nearest_cent' },
        status: 'active',
        is_taxable: true,
        is_system_component: false,
        display_order: 1,
        default_currency: 'USD',
        allow_currency_override: true,
        icon: 'dollar-sign',
        color: 'green',
        category: 'compensation',
        created_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapComponentDbToApi(dbComponent);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbComponent.id);
      expect(result.organizationId).toBe(dbComponent.organization_id);
      expect(result.componentCode).toBe(dbComponent.component_code);
      expect(result.componentName).toBe(dbComponent.component_name);
      expect(result.componentType).toBe(dbComponent.component_type);
      expect(result.description).toBe(dbComponent.description);
      expect(result.calculationType).toBe(dbComponent.calculation_type);
      expect(result.defaultRate).toBe(dbComponent.default_rate);
      expect(result.defaultAmount).toBe(dbComponent.default_amount);
      expect(result.formula).toBeNull();
      expect(result.calculationMetadata).toEqual(dbComponent.calculation_metadata);
      expect(result.isActive).toBe(true);
      expect(result.isTaxable).toBe(dbComponent.is_taxable);
      expect(result.isSystemDefined).toBe(dbComponent.is_system_component);
      expect(result.displayOrder).toBe(dbComponent.display_order);
      expect(result.defaultCurrency).toBe(dbComponent.default_currency);
      expect(result.allowCurrencyOverride).toBe(dbComponent.allow_currency_override);
      expect(result.icon).toBe(dbComponent.icon);
      expect(result.color).toBe(dbComponent.color);
      expect(result.category).toBe(dbComponent.category);
      expect(result.createdBy).toBe(dbComponent.created_by);
      expect(result.createdAt).toBe(dbComponent.created_at);
      expect(result.updatedBy).toBe(dbComponent.updated_by);
      expect(result.updatedAt).toBe(dbComponent.updated_at);
    });

    it('should return null for null input', () => {
      // Act
      const result = mapComponentDbToApi(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      // Act
      const result = mapComponentDbToApi(undefined);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle component with null optional fields', () => {
      // Arrange
      const dbComponent = {
        id: testComponentId,
        organization_id: testOrgId,
        component_code: 'BONUS',
        component_name: 'Bonus',
        component_type: 'earning',
        description: null,
        calculation_type: 'percentage',
        default_rate: null,
        default_amount: null,
        formula: null,
        calculation_metadata: {},
        status: 'active',
        is_taxable: true,
        is_system_component: true,
        display_order: 2,
        default_currency: null,
        allow_currency_override: true,
        icon: null,
        color: null,
        category: null,
        created_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapComponentDbToApi(dbComponent);

      // Assert
      expect(result).toBeDefined();
      expect(result.description).toBeNull();
      expect(result.defaultRate).toBeNull();
      expect(result.defaultAmount).toBeNull();
      expect(result.defaultCurrency).toBeNull();
      expect(result.icon).toBeNull();
      expect(result.color).toBeNull();
      expect(result.category).toBeNull();
    });

    it('should map inactive status correctly', () => {
      // Arrange
      const dbComponent = {
        id: testComponentId,
        organization_id: testOrgId,
        component_code: 'OLD_COMP',
        component_name: 'Old Component',
        component_type: 'deduction',
        status: 'inactive',
        calculation_type: 'fixed_amount',
        is_taxable: false,
        is_system_component: false,
        display_order: 99,
        created_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapComponentDbToApi(dbComponent);

      // Assert
      expect(result.isActive).toBe(false);
    });

    it('should handle allow_currency_override as false', () => {
      // Arrange
      const dbComponent = {
        id: testComponentId,
        organization_id: testOrgId,
        component_code: 'FIXED_COMP',
        component_name: 'Fixed Component',
        component_type: 'earning',
        calculation_type: 'fixed_amount',
        status: 'active',
        is_taxable: true,
        is_system_component: false,
        display_order: 1,
        allow_currency_override: false,
        created_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapComponentDbToApi(dbComponent);

      // Assert
      expect(result.allowCurrencyOverride).toBe(false);
    });
  });

  // ==================== mapComponentsDbToApi ====================

  describe('mapComponentsDbToApi', () => {
    it('should map array of components to API format', () => {
      // Arrange
      const dbComponents = [
        {
          id: testComponentId,
          organization_id: testOrgId,
          component_code: 'COMP1',
          component_name: 'Component 1',
          component_type: 'earning',
          calculation_type: 'fixed_amount',
          status: 'active',
          is_taxable: true,
          is_system_component: false,
          display_order: 1,
          created_by: testUserId,
          created_at: new Date('2024-01-01'),
          updated_by: testUserId,
          updated_at: new Date('2024-01-01')
        },
        {
          id: '770e8400-e29b-41d4-a716-446655440003',
          organization_id: testOrgId,
          component_code: 'COMP2',
          component_name: 'Component 2',
          component_type: 'deduction',
          calculation_type: 'percentage',
          status: 'active',
          is_taxable: false,
          is_system_component: true,
          display_order: 2,
          created_by: testUserId,
          created_at: new Date('2024-01-01'),
          updated_by: testUserId,
          updated_at: new Date('2024-01-01')
        }
      ];

      // Act
      const result = mapComponentsDbToApi(dbComponents);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].componentName).toBe('Component 1');
      expect(result[1].componentName).toBe('Component 2');
    });

    it('should return empty array for non-array input', () => {
      // Act
      const result = mapComponentsDbToApi(null);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle empty array', () => {
      // Act
      const result = mapComponentsDbToApi([]);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  // ==================== mapComponentApiToDb ====================

  describe('mapComponentApiToDb', () => {
    it('should map API component to database format', () => {
      // Arrange
      const apiData = {
        componentCode: 'API_COMP',
        componentName: 'API Component',
        componentType: 'earning',
        description: 'API description',
        calculationType: 'hourly_rate',
        defaultRate: 30.00,
        defaultAmount: 6000.00,
        formula: 'hours * rate',
        calculationMetadata: { precision: 2 },
        isActive: true, // API uses isActive, not status
        isTaxable: true,
        displayOrder: 5,
        icon: 'clock',
        color: 'blue',
        category: 'hourly'
      };

      // Act
      const result = mapComponentApiToDb(apiData);

      // Assert
      expect(result).toBeDefined();
      expect(result.component_code).toBe(apiData.componentCode);
      expect(result.component_name).toBe(apiData.componentName);
      expect(result.component_type).toBe(apiData.componentType);
      expect(result.description).toBe(apiData.description);
      expect(result.calculation_type).toBe(apiData.calculationType);
      expect(result.default_rate).toBe(apiData.defaultRate);
      expect(result.default_amount).toBe(apiData.defaultAmount);
      expect(result.formula).toBe(apiData.formula);
      expect(result.calculation_metadata).toEqual(apiData.calculationMetadata);
      expect(result.status).toBe('active'); // Mapped from isActive
      expect(result.is_taxable).toBe(apiData.isTaxable);
      expect(result.display_order).toBe(apiData.displayOrder);
      expect(result.icon).toBe(apiData.icon);
      expect(result.color).toBe(apiData.color);
      expect(result.category).toBe(apiData.category);
    });

    it('should return null for null input', () => {
      // Act
      const result = mapComponentApiToDb(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should only include defined fields', () => {
      // Arrange
      const apiData = {
        componentCode: 'PARTIAL',
        componentName: 'Partial Component',
        componentType: 'deduction'
      };

      // Act
      const result = mapComponentApiToDb(apiData);

      // Assert
      expect(result).toBeDefined();
      expect(result.component_code).toBe('PARTIAL');
      expect(result.component_name).toBe('Partial Component');
      expect(result.component_type).toBe('deduction');
      expect(result.description).toBeUndefined();
      expect(result.calculation_type).toBeUndefined();
    });
  });
});
