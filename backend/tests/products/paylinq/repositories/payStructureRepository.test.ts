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
        expect.stringContaining('INSERT INTO pay_structure_templates'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'pay_structure_templates' }
      );
    });
  });

  describe('findTemplateById', () => {
    it('should return template by ID', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testTemplateId, organization_id: testOrgId }] });

      const result = await repository.findTemplateById(testTemplateId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [testTemplateId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'pay_structure_templates' }
      );
    });
  });

  describe('findTemplates', () => {
    it('should return all templates for organization', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testTemplateId }] });

      const result = await repository.findTemplates(testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM pay_structure_templates'),
        [testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'pay_structure_templates' }
      );
    });

    it('should filter by status', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await repository.findTemplates(testOrgId, { status: 'active' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND status = $'),
        expect.arrayContaining([testOrgId, 'active']),
        testOrgId,
        expect.any(Object)
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
        expect.stringContaining('UPDATE pay_structure_templates'),
        expect.any(Array),
        testOrgId,
        { operation: 'UPDATE', table: 'pay_structure_templates' }
      );
    });
  });

  describe('publishTemplate', () => {
    it('should publish template', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testTemplateId, status: 'published' }] });

      const result = await repository.publishTemplate(testTemplateId, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pay_structure_templates'),
        expect.any(Array),
        testOrgId,
        { operation: 'UPDATE', table: 'pay_structure_templates' }
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
        expect.stringContaining('INSERT INTO structure_components'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'structure_components' }
      );
    });
  });

  describe('getTemplateComponents', () => {
    it('should return components for template', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testComponentId }] });

      const result = await repository.getTemplateComponents(testTemplateId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE template_id = $1'),
        [testTemplateId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'structure_components' }
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
        expect.stringContaining('INSERT INTO worker_pay_structures'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'worker_pay_structures' }
      );
    });
  });

  describe('getCurrentWorkerStructure', () => {
    it('should return current worker structure', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: '823e4567-e89b-12d3-a456-426614174007', employee_id: testEmployeeId }] });

      const result = await repository.getCurrentWorkerStructure(testEmployeeId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1'),
        expect.arrayContaining([testEmployeeId, testOrgId]),
        testOrgId,
        { operation: 'SELECT', table: 'worker_pay_structures' }
      );
    });
  });

  describe('getWorkerStructureHistory', () => {
    it('should return worker structure history', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: '923e4567-e89b-12d3-a456-426614174008' }] });

      const result = await repository.getWorkerStructureHistory(testEmployeeId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1'),
        [testEmployeeId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'worker_pay_structures' }
      );
    });
  });
});
