/**
 * PayslipTemplateService Test Suite
 * 
 * Tests for PayLinQ payslip template service following TESTING_STANDARDS.md:
 * - ES modules with @jest/globals
 * - Focus on validation schemas and business logic
 * - DB operations use pool directly (integration test candidate)
 * 
 * VERIFIED METHODS (from grep analysis):
 * 1. getTemplates(organizationId, filters = {})
 * 2. getTemplateById(templateId, organizationId)
 * 3. createTemplate(templateData, organizationId, userId)
 * 4. updateTemplate(templateId, updates, organizationId, userId)
 * 5. deleteTemplate(templateId, organizationId, userId)
 * 6. duplicateTemplate(templateId, organizationId, userId)
 * 7. activateTemplate(templateId, organizationId, userId)
 * 8. archiveTemplate(templateId, organizationId, userId)
 * 9. getTemplateAssignments(templateId, organizationId)
 * 10. createAssignment(assignmentData, organizationId, userId)
 * 11. updateAssignment(assignmentId, updates, organizationId, userId)
 * 12. deleteAssignment(assignmentId, organizationId, userId)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import PayslipTemplateService from '../../../../src/products/paylinq/services/payslipTemplateService.js';

describe('PayslipTemplateService', () => {
  let service: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testTemplateId = '323e4567-e89b-12d3-a456-426614174002';
  const testEmployeeId = '423e4567-e89b-12d3-a456-426614174003';
  const testWorkerTypeId = '523e4567-e89b-12d3-a456-426614174004';
  const testDepartmentId = '623e4567-e89b-12d3-a456-426614174005';

  beforeEach(() => {
    // Initialize service (uses pool directly, no DI)
    service = new PayslipTemplateService();
  });

  // ==================== Validation Schemas ====================

  describe('templateSchema validation', () => {
    it('should accept valid template with all required fields', () => {
      // Arrange
      const validTemplate = {
        templateName: 'Standard Payslip',
        templateCode: 'standard-payslip',
        description: 'Standard payslip template',
        layoutType: 'standard'
      };

      // Act
      const { error } = service.templateSchema.validate(validTemplate);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept all layout types', () => {
      // Arrange & Act & Assert
      ['standard', 'compact', 'detailed', 'custom'].forEach(layoutType => {
        const template = {
          templateName: 'Test Template',
          templateCode: 'test-template',
          layoutType
        };
        const { error } = service.templateSchema.validate(template);
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid template code pattern', () => {
      // Arrange
      const invalidTemplate = {
        templateName: 'Test Template',
        templateCode: 'INVALID_CODE', // Should be lowercase with hyphens
        layoutType: 'standard'
      };

      // Act
      const { error } = service.templateSchema.validate(invalidTemplate);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('templateCode');
    });

    it('should reject template without name', () => {
      // Arrange
      const invalidTemplate = {
        templateCode: 'test-template',
        layoutType: 'standard'
      };

      // Act
      const { error } = service.templateSchema.validate(invalidTemplate);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('templateName');
    });

    it('should reject template without code', () => {
      // Arrange
      const invalidTemplate = {
        templateName: 'Test Template',
        layoutType: 'standard'
      };

      // Act
      const { error } = service.templateSchema.validate(invalidTemplate);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('templateCode');
    });

    it('should apply default values', () => {
      // Arrange
      const minimalTemplate = {
        templateName: 'Test Template',
        templateCode: 'test-template'
      };

      // Act
      const { error, value } = service.templateSchema.validate(minimalTemplate);

      // Assert
      expect(error).toBeUndefined();
      expect(value.layoutType).toBe('standard');
      expect(value.showCompanyLogo).toBe(true);
      expect(value.headerColor).toBe('#10b981');
      expect(value.showEmployeeInfo).toBe(true);
      expect(value.showPaymentDetails).toBe(true);
      expect(value.showEarningsSection).toBe(true);
      expect(value.showDeductionsSection).toBe(true);
      expect(value.showTaxesSection).toBe(true);
      expect(value.showLeaveBalances).toBe(false);
      expect(value.showYtdTotals).toBe(true);
      expect(value.showQrCode).toBe(false);
      expect(value.fontFamily).toBe('Arial');
      expect(value.fontSize).toBe(10);
      expect(value.primaryColor).toBe('#10b981');
      expect(value.secondaryColor).toBe('#6b7280');
      expect(value.showConfidentialityNotice).toBe(true);
      expect(value.pageSize).toBe('A4');
      expect(value.pageOrientation).toBe('portrait');
      expect(value.language).toBe('en');
      expect(value.currencyDisplayFormat).toBe('SRD #,##0.00');
      expect(value.dateFormat).toBe('MMM dd, yyyy');
    });

    it('should accept valid color codes', () => {
      // Arrange
      const template = {
        templateName: 'Test Template',
        templateCode: 'test-template',
        headerColor: '#ff5733',
        primaryColor: '#00ff00',
        secondaryColor: '#0000ff'
      };

      // Act
      const { error } = service.templateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should reject invalid color codes', () => {
      // Arrange
      const template = {
        templateName: 'Test Template',
        templateCode: 'test-template',
        headerColor: 'red' // Should be hex format
      };

      // Act
      const { error } = service.templateSchema.validate(template);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('headerColor');
    });

    it('should accept valid page sizes', () => {
      // Arrange & Act & Assert
      ['A4', 'Letter', 'Legal'].forEach(pageSize => {
        const template = {
          templateName: 'Test Template',
          templateCode: 'test-template',
          pageSize
        };
        const { error } = service.templateSchema.validate(template);
        expect(error).toBeUndefined();
      });
    });

    it('should accept valid page orientations', () => {
      // Arrange & Act & Assert
      ['portrait', 'landscape'].forEach(pageOrientation => {
        const template = {
          templateName: 'Test Template',
          templateCode: 'test-template',
          pageOrientation
        };
        const { error } = service.templateSchema.validate(template);
        expect(error).toBeUndefined();
      });
    });

    it('should accept custom sections array', () => {
      // Arrange
      const template = {
        templateName: 'Test Template',
        templateCode: 'test-template',
        customSections: [
          { title: 'Section 1', content: 'Content 1', order: 0 },
          { title: 'Section 2', content: 'Content 2', order: 1 }
        ]
      };

      // Act
      const { error } = service.templateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should reject custom sections without required fields', () => {
      // Arrange
      const template = {
        templateName: 'Test Template',
        templateCode: 'test-template',
        customSections: [
          { title: 'Section 1' } // Missing content and order
        ]
      };

      // Act
      const { error } = service.templateSchema.validate(template);

      // Assert
      expect(error).toBeDefined();
    });

    it('should reject invalid font size', () => {
      // Arrange
      const template = {
        templateName: 'Test Template',
        templateCode: 'test-template',
        fontSize: 30 // Max is 20
      };

      // Act
      const { error } = service.templateSchema.validate(template);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('fontSize');
    });

    it('should accept font size in valid range', () => {
      // Arrange
      const template = {
        templateName: 'Test Template',
        templateCode: 'test-template',
        fontSize: 12
      };

      // Act
      const { error } = service.templateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
    });
  });

  // ==================== assignmentSchema validation ====================

  describe('assignmentSchema validation', () => {
    it('should accept valid organization assignment', () => {
      // Arrange
      const validAssignment = {
        templateId: testTemplateId,
        assignmentType: 'organization',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignmentSchema.validate(validAssignment);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept valid worker_type assignment with workerTypeId', () => {
      // Arrange
      const validAssignment = {
        templateId: testTemplateId,
        assignmentType: 'worker_type',
        workerTypeId: testWorkerTypeId,
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignmentSchema.validate(validAssignment);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept valid department assignment with departmentId', () => {
      // Arrange
      const validAssignment = {
        templateId: testTemplateId,
        assignmentType: 'department',
        departmentId: testDepartmentId,
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignmentSchema.validate(validAssignment);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept valid employee assignment with employeeId', () => {
      // Arrange
      const validAssignment = {
        templateId: testTemplateId,
        assignmentType: 'employee',
        employeeId: testEmployeeId,
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignmentSchema.validate(validAssignment);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should require workerTypeId when assignmentType is worker_type', () => {
      // Arrange
      const invalidAssignment = {
        templateId: testTemplateId,
        assignmentType: 'worker_type',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignmentSchema.validate(invalidAssignment);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('workerTypeId');
    });

    it('should require departmentId when assignmentType is department', () => {
      // Arrange
      const invalidAssignment = {
        templateId: testTemplateId,
        assignmentType: 'department',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignmentSchema.validate(invalidAssignment);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('departmentId');
    });

    it('should require employeeId when assignmentType is employee', () => {
      // Arrange
      const invalidAssignment = {
        templateId: testTemplateId,
        assignmentType: 'employee',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignmentSchema.validate(invalidAssignment);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('employeeId');
    });

    it('should reject invalid assignment type', () => {
      // Arrange
      const invalidAssignment = {
        templateId: testTemplateId,
        assignmentType: 'invalid_type',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignmentSchema.validate(invalidAssignment);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('assignmentType');
    });

    it('should accept assignment without templateId', () => {
      // Arrange - Should be rejected
      const invalidAssignment = {
        assignmentType: 'organization',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignmentSchema.validate(invalidAssignment);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('templateId');
    });

    it('should reject assignment without effectiveFrom', () => {
      // Arrange
      const invalidAssignment = {
        templateId: testTemplateId,
        assignmentType: 'organization'
      };

      // Act
      const { error } = service.assignmentSchema.validate(invalidAssignment);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('effectiveFrom');
    });

    it('should accept priority value in valid range', () => {
      // Arrange
      const validAssignment = {
        templateId: testTemplateId,
        assignmentType: 'organization',
        priority: 50,
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignmentSchema.validate(validAssignment);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should reject priority value outside valid range', () => {
      // Arrange
      const invalidAssignment = {
        templateId: testTemplateId,
        assignmentType: 'organization',
        priority: 150, // Max is 100
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error } = service.assignmentSchema.validate(invalidAssignment);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('priority');
    });

    it('should require effectiveTo to be after effectiveFrom', () => {
      // Arrange
      const invalidAssignment = {
        templateId: testTemplateId,
        assignmentType: 'organization',
        effectiveFrom: new Date('2025-01-15'),
        effectiveTo: new Date('2025-01-10') // Before effectiveFrom
      };

      // Act
      const { error } = service.assignmentSchema.validate(invalidAssignment);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('effectiveTo');
    });

    it('should accept valid date range', () => {
      // Arrange
      const validAssignment = {
        templateId: testTemplateId,
        assignmentType: 'organization',
        effectiveFrom: new Date('2025-01-01'),
        effectiveTo: new Date('2025-12-31')
      };

      // Act
      const { error } = service.assignmentSchema.validate(validAssignment);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should apply default priority value', () => {
      // Arrange
      const assignment = {
        templateId: testTemplateId,
        assignmentType: 'organization',
        effectiveFrom: new Date('2025-01-01')
      };

      // Act
      const { error, value } = service.assignmentSchema.validate(assignment);

      // Assert
      expect(error).toBeUndefined();
      expect(value.priority).toBe(0);
    });
  });

  // ==================== Edge Cases and Complex Scenarios ====================

  describe('Edge Cases', () => {
    it('should handle minimal valid template', () => {
      // Arrange
      const minimalTemplate = {
        templateName: 'Minimal',
        templateCode: 'minimal'
      };

      // Act
      const { error, value } = service.templateSchema.validate(minimalTemplate);

      // Assert
      expect(error).toBeUndefined();
      expect(value.templateName).toBe('Minimal');
      expect(value.templateCode).toBe('minimal');
    });

    it('should handle template with all optional fields', () => {
      // Arrange
      const fullTemplate = {
        templateName: 'Full Template',
        templateCode: 'full-template',
        description: 'Complete template with all fields',
        layoutType: 'detailed',
        showCompanyLogo: true,
        companyLogoUrl: 'https://example.com/logo.png',
        headerText: 'Employee Payslip',
        headerColor: '#10b981',
        showEmployeeInfo: true,
        showPaymentDetails: true,
        showEarningsSection: true,
        showDeductionsSection: true,
        showTaxesSection: true,
        showLeaveBalances: true,
        showYtdTotals: true,
        showQrCode: true,
        customSections: [
          { title: 'Notice', content: 'Important information', order: 0 }
        ],
        fieldConfiguration: { custom: 'config' },
        fontFamily: 'Arial',
        fontSize: 11,
        primaryColor: '#10b981',
        secondaryColor: '#6b7280',
        footerText: 'Confidential document',
        showConfidentialityNotice: true,
        confidentialityText: 'This is confidential',
        pageSize: 'Letter',
        pageOrientation: 'landscape',
        language: 'en',
        currencyDisplayFormat: 'USD $#,##0.00',
        dateFormat: 'yyyy-MM-dd',
        displayRules: { rule: 'value' }
      };

      // Act
      const { error } = service.templateSchema.validate(fullTemplate);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should strip unknown fields from template', () => {
      // Arrange
      const templateWithExtra = {
        templateName: 'Test',
        templateCode: 'test',
        unknownField: 'should be removed'
      };

      // Act
      const { error, value } = service.templateSchema.validate(templateWithExtra, { stripUnknown: true });

      // Assert
      expect(error).toBeUndefined();
      expect(value).not.toHaveProperty('unknownField');
    });

    it('should handle empty description', () => {
      // Arrange
      const template = {
        templateName: 'Test',
        templateCode: 'test',
        description: ''
      };

      // Act
      const { error } = service.templateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should handle null description', () => {
      // Arrange
      const template = {
        templateName: 'Test',
        templateCode: 'test',
        description: null
      };

      // Act
      const { error } = service.templateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should handle empty custom sections array', () => {
      // Arrange
      const template = {
        templateName: 'Test',
        templateCode: 'test',
        customSections: []
      };

      // Act
      const { error } = service.templateSchema.validate(template);

      // Assert
      expect(error).toBeUndefined();
    });
  });
});
