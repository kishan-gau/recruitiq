/**
 * PayStructureRepository Unit Tests
 * 
 * Tests for pay structure template data access layer.
 * Covers template CRUD, components, worker assignments, and overrides.
 * 
 * VERIFIED METHODS (Core subset of 20+ total methods):
 * 1. createTemplate(templateData, organizationId, userId)
 * 2. findTemplateById(templateId, organizationId)
 * 3. findTemplates(organizationId, filters)
 * 4. updateTemplate(templateId, updates, organizationId, userId)
 * 5. publishTemplate(templateId, organizationId, userId)
 * 6. addComponent(componentData, templateId, organizationId, userId)
 * 7. getTemplateComponents(templateId, organizationId)
 * 8. assignTemplateToWorker(assignmentData, organizationId, userId)
 * 9. getCurrentWorkerStructure(employeeId, organizationId, asOfDate)
 * 10. getWorkerStructureHistory(employeeId, organizationId)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayStructureRepository from '../../../../src/products/paylinq/repositories/payStructureRepository.js';

describe('PayStructureRepository', () => {
  let repository: PayStructureRepository;
  let mockQuery: jest.Mock;
  
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testTemplateId = '323e4567-e89b-12d3-a456-426614174002';
  const testEmployeeId = '423e4567-e89b-12d3-a456-426614174003';
  const testComponentId = '523e4567-e89b-12d3-a456-426614174004';

  beforeEach(() => {
    mockQuery = jest.fn();
    repository = new PayStructureRepository({ query: mockQuery });
  });

  describe('createTemplate', () => {
    it('should create pay structure template', async () => {
      const templateData = {
        templateName: 'Standard Salary Structure',
        templateCode: 'STD_SAL',
        description: 'Standard monthly salary structure',
        isDefault: false
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: testTemplateId, ...templateData }] });

      const result = await repository.createTemplate(templateData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.pay_structure_template'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'payroll.pay_structure_template', userId: testUserId }
      );
    });
  });

  describe('findTemplateById', () => {
    it('should return template by ID', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testTemplateId, organization_id: testOrgId }] });

      const result = await repository.findTemplateById(testTemplateId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.pay_structure_template'),
        [testTemplateId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'payroll.pay_structure_template' }
      );
    });
  });

  describe('findTemplates', () => {
    it('should return all templates for organization', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testTemplateId }] });

      const result = await repository.findTemplates(testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.pay_structure_template'),
        [testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'payroll.pay_structure_template' }
      );
    });

    it('should filter by status', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await repository.findTemplates(testOrgId, { status: 'active' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND pst.status = $'),
        expect.arrayContaining([testOrgId, 'active']),
        testOrgId,
        { operation: 'SELECT', table: 'payroll.pay_structure_template' }
      );
    });
  });

  describe('updateTemplate', () => {
    it('should update template', async () => {
      const updates = { templateName: 'Updated Name' };
      mockQuery.mockResolvedValue({ rows: [{ id: testTemplateId, ...updates }] });

      const result = await repository.updateTemplate(testTemplateId, updates, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.pay_structure_template'),
        expect.any(Array),
        testOrgId,
        { operation: 'UPDATE', table: 'payroll.pay_structure_template', userId: testUserId }
      );
    });
  });

  describe('publishTemplate', () => {
    it('should publish template', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testTemplateId, status: 'published' }] });

      const result = await repository.publishTemplate(testTemplateId, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.pay_structure_template'),
        expect.any(Array),
        testOrgId,
        { operation: 'UPDATE', table: 'payroll.pay_structure_template', userId: testUserId }
      );
    });
  });

  describe('addComponent', () => {
    it('should add component to template', async () => {
      const componentData = {
        payComponentId: testComponentId,
        displayOrder: 1,
        isMandatory: true
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: '623e4567-e89b-12d3-a456-426614174005', ...componentData }] });

      const result = await repository.addComponent(componentData, testTemplateId, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.pay_structure_component'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'payroll.pay_structure_component', userId: testUserId }
      );
    });
  });

  describe('getTemplateComponents', () => {
    it('should return components for template', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testComponentId }] });

      const result = await repository.getTemplateComponents(testTemplateId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.pay_structure_component'),
        [testTemplateId],
        testOrgId,
        { operation: 'SELECT', table: 'payroll.pay_structure_component' }
      );
    });
  });

  describe('assignTemplateToWorker', () => {
    it('should assign template to worker', async () => {
      const assignmentData = {
        employeeId: testEmployeeId,
        templateId: testTemplateId,
        effectiveFrom: '2025-01-01'
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: '723e4567-e89b-12d3-a456-426614174006', ...assignmentData }] });

      const result = await repository.assignTemplateToWorker(assignmentData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.worker_pay_structure'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'payroll.worker_pay_structure', userId: testUserId }
      );
    });
  });

  describe('getCurrentWorkerStructure', () => {
    it('should return current worker structure', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: '823e4567-e89b-12d3-a456-426614174007', employee_id: testEmployeeId }] });

      const result = await repository.getCurrentWorkerStructure(testEmployeeId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.worker_pay_structure'),
        expect.arrayContaining([testEmployeeId, testOrgId]),
        testOrgId,
        { operation: 'SELECT', table: 'payroll.worker_pay_structure' }
      );
    });
  });

  describe('getWorkerStructureHistory', () => {
    it('should return worker structure history', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: '923e4567-e89b-12d3-a456-426614174008' }] });

      const result = await repository.getWorkerStructureHistory(testEmployeeId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.worker_pay_structure'),
        expect.arrayContaining([testEmployeeId, testOrgId]),
        testOrgId,
        { operation: 'SELECT', table: 'payroll.worker_pay_structure' }
      );
    });
  });
});
