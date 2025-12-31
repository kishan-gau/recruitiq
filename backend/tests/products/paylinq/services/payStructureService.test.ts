/**
 * PayStructureService Test Suite
 * 
 * Tests for PayLinQ pay structure service following TESTING_STANDARDS.md:
 * - ES modules with @jest/globals
 * - Dependency injection pattern
 * - Focus on validation schemas and business logic
 * 
 * VERIFIED METHODS (from grep analysis - 45 total methods):
 * Template Management:
 * 1. createTemplate(templateData, organizationId, userId)
 * 2. getTemplateById(templateId, organizationId)
 * 3. getTemplates(organizationId, filters)
 * 4. updateTemplate(templateId, updates, organizationId, userId)
 * 5. publishTemplate(templateId, organizationId, userId)
 * 6. deprecateTemplate(templateId, reason, organizationId, userId)
 * 7. deleteTemplate(templateId, organizationId, userId)
 * 
 * Component Management:
 * 8. addComponent(templateId, componentData, organizationId, userId)
 * 9. getTemplateComponents(templateId, organizationId)
 * 10. updateComponent(componentId, updates, organizationId, userId)
 * 11. deleteComponent(componentId, organizationId, userId)
 * 12. reorderComponents(templateId, componentOrders, organizationId, userId)
 * 
 * Worker Assignments:
 * 13. assignTemplateToWorker(assignmentData, organizationId, userId)
 * 14. getCurrentWorkerStructure(employeeId, organizationId, asOfDate)
 * 15. getWorkerStructureHistory(employeeId, organizationId)
 * 
 * Overrides:
 * 16. addComponentOverride(overrideData, organizationId, userId)
 * 17. getWorkerOverrides(workerStructureId, organizationId)
 * 18. updateComponentOverride(overrideId, updates, organizationId, userId)
 * 19. deleteComponentOverride(overrideId, organizationId, userId)
 * 
 * Calculation:
 * 20. calculateWorkerPay(employeeId, inputData, organizationId, asOfDate)
 * 
 * Versioning:
 * 21. createNewVersion(templateId, versionType, changeSummary, organizationId, userId)
 * 22. getTemplateVersions(templateCode, organizationId)
 * 23. compareTemplateVersions(fromId, toId, organizationId)
 * 24. upgradeWorkersToVersion(templateId, workerIds, effectiveFrom, upgradeReason, organizationId, userId)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayStructureService from '../../../../src/products/paylinq/services/payStructureService.js';

describe('PayStructureService', () => {
  let service: any;
  let mockRepository: any;
  let mockFormulaEngine: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testTemplateId = '323e4567-e89b-12d3-a456-426614174002';
  const testComponentId = '423e4567-e89b-12d3-a456-426614174003';
  const testEmployeeId = '523e4567-e89b-12d3-a456-426614174004';
  const testWorkerStructureId = '623e4567-e89b-12d3-a456-426614174005';

  beforeEach(() => {
    // Create comprehensive mock repository
    mockRepository = {
      createTemplate: jest.fn(),
      findTemplates: jest.fn(),
      findTemplateById: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      addChangelogEntry: jest.fn(),
      addComponent: jest.fn(),
      getComponents: jest.fn(),
      updateComponent: jest.fn(),
      deleteComponent: jest.fn(),
      assignTemplate: jest.fn(),
      getCurrentStructure: jest.fn(),
      getStructureHistory: jest.fn(),
      addOverride: jest.fn(),
      getOverrides: jest.fn(),
      updateOverride: jest.fn(),
      deleteOverride: jest.fn()
    };

    // Mock formula engine
    mockFormulaEngine = {
      evaluate: jest.fn(),
      validateFormula: jest.fn()
    };

    // Inject mock repositories using DI pattern
    service = new PayStructureService(mockRepository);
    service.formulaEngine = mockFormulaEngine;
  });

  // ==================== createTemplateSchema Validation ====================

  describe('createTemplateSchema validation', () => {
    it('should accept valid template with all required fields', () => {
      // Arrange
      const validTemplate = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay Structure',
        description: 'Standard pay structure for full-time employees',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.createTemplateSchema.validate(validTemplate);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should reject template code with lowercase letters', () => {
      // Arrange
      const invalidTemplate = {
        templateCode: 'standard_pay', // Should be uppercase
        templateName: 'Standard Pay',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.createTemplateSchema.validate(invalidTemplate);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('templateCode');
    });

    it('should reject template code with special characters', () => {
      // Arrange
      const invalidTemplate = {
        templateCode: 'STANDARD-PAY!', // Special characters not allowed
        templateName: 'Standard Pay',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.createTemplateSchema.validate(invalidTemplate);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('templateCode');
    });

    it('should accept template code with numbers and underscores', () => {
      // Arrange
      const validTemplate = {
        templateCode: 'PAY_STRUCTURE_V2',
        templateName: 'Pay Structure Version 2',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.createTemplateSchema.validate(validTemplate);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should apply default version numbers', () => {
      // Arrange
      const template = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error, value } = service.createTemplateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
      expect(value.versionMajor).toBe(1);
      expect(value.versionMinor).toBe(0);
      expect(value.versionPatch).toBe(0);
    });

    it('should apply default status as draft', () => {
      // Arrange
      const template = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error, value } = service.createTemplateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
      expect(value.status).toBe('draft');
    });

    it('should accept all valid status values', () => {
      // Arrange & Act & Assert
      ['draft', 'active', 'deprecated', 'archived'].forEach(status => {
        const template = {
          templateCode: 'STANDARD_PAY',
          templateName: 'Standard Pay',
          status,
          effectiveFrom: new Date('2025-01-01')
        };
        const { error } = service.createTemplateSchema.validate(template);
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid status values', () => {
      // Arrange
      const invalidTemplate = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay',
        status: 'invalid_status',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.createTemplateSchema.validate(invalidTemplate);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('status');
    });

    it('should accept valid pay frequencies', () => {
      // Arrange & Act & Assert
      ['weekly', 'biweekly', 'semimonthly', 'monthly'].forEach(payFrequency => {
        const template = {
          templateCode: 'STANDARD_PAY',
          templateName: 'Standard Pay',
          payFrequency,
          effectiveFrom: new Date('2025-01-01')
        };
        const { error } = service.createTemplateSchema.validate(template);
        expect(error).toBeUndefined();
      });
    });

    it('should apply default currency as SRD', () => {
      // Arrange
      const template = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error, value } = service.createTemplateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
      expect(value.currency).toBe('SRD');
    });

    it('should accept valid 3-letter currency codes', () => {
      // Arrange
      const template = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay',
        currency: 'USD',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.createTemplateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should reject invalid currency code length', () => {
      // Arrange
      const invalidTemplate = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay',
        currency: 'US', // Should be 3 letters
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.createTemplateSchema.validate(invalidTemplate);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('currency');
    });

    it('should accept applicableToWorkerTypes array', () => {
      // Arrange
      const template = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay',
        applicableToWorkerTypes: ['FULL_TIME', 'PART_TIME'],
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.createTemplateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept applicableToJurisdictions with 2-letter codes', () => {
      // Arrange
      const template = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay',
        applicableToJurisdictions: ['US', 'CA', 'GB'],
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.createTemplateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should reject jurisdiction codes not 2 letters', () => {
      // Arrange
      const invalidTemplate = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay',
        applicableToJurisdictions: ['USA'], // Should be 2 letters
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.createTemplateSchema.validate(invalidTemplate);

      // Assert
      expect(error).toBeDefined();
    });

    it('should require effectiveFrom date', () => {
      // Arrange
      const invalidTemplate = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay'
      };

      // Act
      const { error } = service.createTemplateSchema.validate(invalidTemplate);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('effectiveFrom');
    });

    it('should accept null effectiveTo date', () => {
      // Arrange
      const template = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay',
        effectiveFrom: new Date('2025-01-01'),
        effectiveTo: null
      };

      // Act
      const { error } = service.createTemplateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept tags array', () => {
      // Arrange
      const template = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay',
        tags: ['standard', 'full-time', 'monthly'],
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.createTemplateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
    });
  });

  // ==================== addComponentSchema Validation ====================

  describe('addComponentSchema validation', () => {
    it('should accept valid component with all required fields', () => {
      // Arrange
      const validComponent = {
        componentCode: 'BASE_SALARY',
        componentName: 'Base Salary',
        componentCategory: 'earning',
        calculationType: 'fixed',
        sequenceOrder: 1
      };

      // Act
      const { error } = service.addComponentSchema.validate(validComponent);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept all valid component categories', () => {
      // Arrange & Act & Assert
      ['earning', 'deduction', 'tax', 'benefit', 'employer_cost', 'reimbursement'].forEach(componentCategory => {
        const component = {
          componentCode: 'TEST_COMPONENT',
          componentName: 'Test Component',
          componentCategory,
          calculationType: 'fixed',
          sequenceOrder: 1
        };
        const { error } = service.addComponentSchema.validate(component);
        expect(error).toBeUndefined();
      });
    });

    it('should accept all valid calculation types', () => {
      // Arrange & Act & Assert
      ['fixed', 'percentage', 'formula', 'hourly_rate', 'tiered', 'external'].forEach(calculationType => {
        const component = {
          componentCode: 'TEST_COMPONENT',
          componentName: 'Test Component',
          componentCategory: 'earning',
          calculationType,
          sequenceOrder: 1
        };
        const { error } = service.addComponentSchema.validate(component);
        expect(error).toBeUndefined();
      });
    });

    it('should require positive sequence order', () => {
      // Arrange
      const invalidComponent = {
        componentCode: 'BASE_SALARY',
        componentName: 'Base Salary',
        componentCategory: 'earning',
        calculationType: 'fixed',
        sequenceOrder: 0 // Should be at least 1
      };

      // Act
      const { error } = service.addComponentSchema.validate(invalidComponent);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('sequenceOrder');
    });

    it('should accept null payComponentId', () => {
      // Arrange
      const component = {
        payComponentId: null,
        componentCode: 'BASE_SALARY',
        componentName: 'Base Salary',
        componentCategory: 'earning',
        calculationType: 'fixed',
        sequenceOrder: 1
      };

      // Act
      const { error } = service.addComponentSchema.validate(component);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept valid UUID payComponentId', () => {
      // Arrange
      const component = {
        payComponentId: testComponentId,
        componentCode: 'BASE_SALARY',
        componentName: 'Base Salary',
        componentCategory: 'earning',
        calculationType: 'fixed',
        sequenceOrder: 1
      };

      // Act
      const { error } = service.addComponentSchema.validate(component);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept percentage rate between 0 and 1', () => {
      // Arrange
      const component = {
        componentCode: 'TAX_RATE',
        componentName: 'Tax Rate',
        componentCategory: 'tax',
        calculationType: 'percentage',
        percentageRate: 0.15,
        sequenceOrder: 1
      };

      // Act
      const { error } = service.addComponentSchema.validate(component);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should reject percentage rate greater than 1', () => {
      // Arrange
      const invalidComponent = {
        componentCode: 'TAX_RATE',
        componentName: 'Tax Rate',
        componentCategory: 'tax',
        calculationType: 'percentage',
        percentageRate: 1.5, // Should be max 1
        sequenceOrder: 1
      };

      // Act
      const { error } = service.addComponentSchema.validate(invalidComponent);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('percentageRate');
    });

    it('should apply default values for boolean fields', () => {
      // Arrange
      const component = {
        componentCode: 'BASE_SALARY',
        componentName: 'Base Salary',
        componentCategory: 'earning',
        calculationType: 'fixed',
        sequenceOrder: 1
      };

      // Act
      const { error, value } = service.addComponentSchema.validate(component);

      // Assert
      expect(error).toBeUndefined();
      expect(value.isMandatory).toBe(false);
      expect(value.isTaxable).toBe(true);
      expect(value.affectsGrossPay).toBe(true);
      expect(value.affectsNetPay).toBe(true);
      expect(value.allowWorkerOverride).toBe(false);
      expect(value.requiresApproval).toBe(false);
      expect(value.allowCurrencyOverride).toBe(false);
      expect(value.displayOnPayslip).toBe(true);
      expect(value.isConditional).toBe(false);
    });

    it('should accept formula expression', () => {
      // Arrange
      const component = {
        componentCode: 'BONUS',
        componentName: 'Performance Bonus',
        componentCategory: 'earning',
        calculationType: 'formula',
        formulaExpression: 'baseSalary * 0.1',
        sequenceOrder: 1
      };

      // Act
      const { error } = service.addComponentSchema.validate(component);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept formula variables object', () => {
      // Arrange
      const component = {
        componentCode: 'BONUS',
        componentName: 'Performance Bonus',
        componentCategory: 'earning',
        calculationType: 'formula',
        formulaExpression: 'base * multiplier',
        formulaVariables: { base: 'baseSalary', multiplier: 0.1 },
        sequenceOrder: 1
      };

      // Act
      const { error } = service.addComponentSchema.validate(component);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept tier configuration array', () => {
      // Arrange
      const component = {
        componentCode: 'PROGRESSIVE_TAX',
        componentName: 'Progressive Tax',
        componentCategory: 'tax',
        calculationType: 'tiered',
        tierConfiguration: [
          { min: 0, max: 10000, rate: 0.1 },
          { min: 10000, max: 50000, rate: 0.2 }
        ],
        sequenceOrder: 1
      };

      // Act
      const { error } = service.addComponentSchema.validate(component);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept dependsOnComponents array', () => {
      // Arrange
      const component = {
        componentCode: 'NET_PAY',
        componentName: 'Net Pay',
        componentCategory: 'earning',
        calculationType: 'formula',
        dependsOnComponents: ['BASE_SALARY', 'TAXES', 'DEDUCTIONS'],
        sequenceOrder: 100
      };

      // Act
      const { error } = service.addComponentSchema.validate(component);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept min and max amount constraints', () => {
      // Arrange
      const component = {
        componentCode: 'ALLOWANCE',
        componentName: 'Travel Allowance',
        componentCategory: 'earning',
        calculationType: 'fixed',
        minAmount: 0,
        maxAmount: 1000,
        sequenceOrder: 1
      };

      // Act
      const { error } = service.addComponentSchema.validate(component);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept override allowed fields array', () => {
      // Arrange
      const component = {
        componentCode: 'BONUS',
        componentName: 'Bonus',
        componentCategory: 'earning',
        calculationType: 'fixed',
        allowWorkerOverride: true,
        overrideAllowedFields: ['amount', 'percentage'],
        sequenceOrder: 1
      };

      // Act
      const { error } = service.addComponentSchema.validate(component);

      // Assert
      expect(error).toBeUndefined();
    });
  });

  // ==================== assignTemplateSchema Validation ====================

  describe('assignTemplateSchema validation', () => {
    it('should accept valid assignment with all required fields', () => {
      // Arrange
      const validAssignment = {
        employeeId: testEmployeeId,
        templateId: testTemplateId,
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignTemplateSchema.validate(validAssignment);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept null templateId to use org default', () => {
      // Arrange
      const assignment = {
        employeeId: testEmployeeId,
        templateId: null,
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignTemplateSchema.validate(assignment);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept all valid assignment types', () => {
      // Arrange & Act & Assert
      ['default', 'department', 'group', 'custom', 'temporary'].forEach(assignmentType => {
        const assignment = {
          employeeId: testEmployeeId,
          templateId: testTemplateId,
          assignmentType,
          effectiveFrom: new Date('2025-01-01')
        };
        const { error } = service.assignTemplateSchema.validate(assignment);
        expect(error).toBeUndefined();
      });
    });

    it('should apply default assignment type as custom', () => {
      // Arrange
      const assignment = {
        employeeId: testEmployeeId,
        templateId: testTemplateId,
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error, value } = service.assignTemplateSchema.validate(assignment);

      // Assert
      expect(error).toBeUndefined();
      expect(value.assignmentType).toBe('custom');
    });

    it('should accept baseSalary with minimum 0', () => {
      // Arrange
      const assignment = {
        employeeId: testEmployeeId,
        templateId: testTemplateId,
        baseSalary: 50000,
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignTemplateSchema.validate(assignment);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should reject negative baseSalary', () => {
      // Arrange
      const invalidAssignment = {
        employeeId: testEmployeeId,
        templateId: testTemplateId,
        baseSalary: -1000,
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignTemplateSchema.validate(invalidAssignment);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('baseSalary');
    });

    it('should accept hourlyRate with minimum 0', () => {
      // Arrange
      const assignment = {
        employeeId: testEmployeeId,
        templateId: testTemplateId,
        hourlyRate: 25.50,
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignTemplateSchema.validate(assignment);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept valid pay frequencies', () => {
      // Arrange & Act & Assert
      ['weekly', 'biweekly', 'semimonthly', 'monthly'].forEach(payFrequency => {
        const assignment = {
          employeeId: testEmployeeId,
          templateId: testTemplateId,
          payFrequency,
          effectiveFrom: new Date('2025-01-01')
        };
        const { error } = service.assignTemplateSchema.validate(assignment);
        expect(error).toBeUndefined();
      });
    });

    it('should accept 3-letter currency code', () => {
      // Arrange
      const assignment = {
        employeeId: testEmployeeId,
        templateId: testTemplateId,
        currency: 'USD',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignTemplateSchema.validate(assignment);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should require employeeId', () => {
      // Arrange
      const invalidAssignment = {
        templateId: testTemplateId,
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignTemplateSchema.validate(invalidAssignment);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('employeeId');
    });

    it('should require effectiveFrom date', () => {
      // Arrange
      const invalidAssignment = {
        employeeId: testEmployeeId,
        templateId: testTemplateId
      };

      // Act
      const { error } = service.assignTemplateSchema.validate(invalidAssignment);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('effectiveFrom');
    });

    it('should accept null effectiveTo', () => {
      // Arrange
      const assignment = {
        employeeId: testEmployeeId,
        templateId: testTemplateId,
        effectiveFrom: new Date('2025-01-01'),
        effectiveTo: null
      };

      // Act
      const { error } = service.assignTemplateSchema.validate(assignment);

      // Assert
      expect(error).toBeUndefined();
    });
  });

  // ==================== addOverrideSchema Validation ====================

  describe('addOverrideSchema validation', () => {
    it('should accept valid override with all required fields', () => {
      // Arrange
      const validOverride = {
        workerStructureId: testWorkerStructureId,
        componentCode: 'BASE_SALARY',
        overrideType: 'amount',
        overrideAmount: 60000,
        overrideReason: 'Promotion adjustment'
      };

      // Act
      const { error } = service.addOverrideSchema.validate(validOverride);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept all valid override types', () => {
      // Arrange & Act & Assert
      ['amount', 'percentage', 'formula', 'rate', 'disabled', 'custom', 'condition'].forEach(overrideType => {
        const override = {
          workerStructureId: testWorkerStructureId,
          componentCode: 'BASE_SALARY',
          overrideType,
          overrideReason: 'Test reason'
        };
        const { error } = service.addOverrideSchema.validate(override);
        expect(error).toBeUndefined();
      });
    });

    it('should require workerStructureId as UUID', () => {
      // Arrange
      const invalidOverride = {
        workerStructureId: 'invalid-uuid',
        componentCode: 'BASE_SALARY',
        overrideType: 'amount',
        overrideReason: 'Test reason'
      };

      // Act
      const { error } = service.addOverrideSchema.validate(invalidOverride);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('workerStructureId');
    });

    it('should require componentCode', () => {
      // Arrange
      const invalidOverride = {
        workerStructureId: testWorkerStructureId,
        overrideType: 'amount',
        overrideReason: 'Test reason'
      };

      // Act
      const { error } = service.addOverrideSchema.validate(invalidOverride);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('componentCode');
    });

    it('should require overrideReason', () => {
      // Arrange
      const invalidOverride = {
        workerStructureId: testWorkerStructureId,
        componentCode: 'BASE_SALARY',
        overrideType: 'amount'
      };

      // Act
      const { error } = service.addOverrideSchema.validate(invalidOverride);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('overrideReason');
    });

    it('should accept percentage override with valid rate', () => {
      // Arrange
      const override = {
        workerStructureId: testWorkerStructureId,
        componentCode: 'TAX',
        overrideType: 'percentage',
        overridePercentage: 0.25,
        overrideReason: 'Tax rate adjustment'
      };

      // Act
      const { error } = service.addOverrideSchema.validate(override);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should reject percentage override with rate > 1', () => {
      // Arrange
      const invalidOverride = {
        workerStructureId: testWorkerStructureId,
        componentCode: 'TAX',
        overrideType: 'percentage',
        overridePercentage: 1.5,
        overrideReason: 'Tax rate adjustment'
      };

      // Act
      const { error } = service.addOverrideSchema.validate(invalidOverride);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('overridePercentage');
    });

    it('should apply default isDisabled as false', () => {
      // Arrange
      const override = {
        workerStructureId: testWorkerStructureId,
        componentCode: 'BASE_SALARY',
        overrideType: 'amount',
        overrideReason: 'Test reason'
      };

      // Act
      const { error, value } = service.addOverrideSchema.validate(override);

      // Assert
      expect(error).toBeUndefined();
      expect(value.isDisabled).toBe(false);
    });

    it('should apply default requiresApproval as false', () => {
      // Arrange
      const override = {
        workerStructureId: testWorkerStructureId,
        componentCode: 'BASE_SALARY',
        overrideType: 'amount',
        overrideReason: 'Test reason'
      };

      // Act
      const { error, value } = service.addOverrideSchema.validate(override);

      // Assert
      expect(error).toBeUndefined();
      expect(value.requiresApproval).toBe(false);
    });

    it('should accept override with effective dates', () => {
      // Arrange
      const override = {
        workerStructureId: testWorkerStructureId,
        componentCode: 'BASE_SALARY',
        overrideType: 'amount',
        overrideAmount: 65000,
        overrideReason: 'Temporary increase',
        effectiveFrom: new Date('2025-01-01'),
        effectiveTo: new Date('2025-12-31')
      };

      // Act
      const { error } = service.addOverrideSchema.validate(override);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept formula override', () => {
      // Arrange
      const override = {
        workerStructureId: testWorkerStructureId,
        componentCode: 'BONUS',
        overrideType: 'formula',
        overrideFormula: 'baseSalary * 0.15',
        overrideReason: 'Custom bonus calculation'
      };

      // Act
      const { error } = service.addOverrideSchema.validate(override);

      // Assert
      expect(error).toBeUndefined();
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle minimal valid template', () => {
      // Arrange
      const minimalTemplate = {
        templateCode: 'MIN',
        templateName: 'Minimal',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.createTemplateSchema.validate(minimalTemplate);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should handle minimal valid component', () => {
      // Arrange
      const minimalComponent = {
        componentCode: 'MIN',
        componentName: 'Minimal',
        componentCategory: 'earning',
        calculationType: 'fixed',
        sequenceOrder: 1
      };

      // Act
      const { error } = service.addComponentSchema.validate(minimalComponent);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should handle zero salary in assignment', () => {
      // Arrange
      const assignment = {
        employeeId: testEmployeeId,
        templateId: testTemplateId,
        baseSalary: 0,
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignTemplateSchema.validate(assignment);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should handle zero override amount', () => {
      // Arrange
      const override = {
        workerStructureId: testWorkerStructureId,
        componentCode: 'ALLOWANCE',
        overrideType: 'amount',
        overrideAmount: 0,
        overrideReason: 'Temporary suspension'
      };

      // Act
      const { error } = service.addOverrideSchema.validate(override);

      // Assert
      expect(error).toBeUndefined();
    });
  });
});
