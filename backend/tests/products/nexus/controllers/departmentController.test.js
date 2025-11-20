/**
 * Tests for DepartmentController
 * 
 * Tests controller-level HTTP handling, request parsing, and response formatting.
 * Business logic is tested in departmentService.test.js.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Create a mock service class that will be instantiated by the controller
class MockDepartmentService {
  createDepartment = jest.fn();
  getDepartment = jest.fn();
  updateDepartment = jest.fn();
  deleteDepartment = jest.fn();
  listDepartments = jest.fn();
  addMemberToDepartment = jest.fn();
  removeMemberFromDepartment = jest.fn();
  getDepartmentMembers = jest.fn();
  getDepartmentHierarchy = jest.fn();
}

// Mock the module to return our mock class
jest.unstable_mockModule('../../../../src/products/nexus/services/departmentService.js', () => ({
  default: MockDepartmentService
}));

const { default: DepartmentController } = await import('../../../../src/products/nexus/controllers/departmentController.js');

describe('DepartmentController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    controller = new DepartmentController();
    
    // The controller now has a MockDepartmentService instance
    // Access it to reset mocks
    controller.service.createDepartment.mockReset();
    controller.service.getDepartment.mockReset();
    controller.service.updateDepartment.mockReset();
    controller.service.deleteDepartment.mockReset();
    controller.service.listDepartments.mockReset();
    controller.service.addMemberToDepartment.mockReset();
    controller.service.removeMemberFromDepartment.mockReset();
    controller.service.getDepartmentMembers.mockReset();
    controller.service.getDepartmentHierarchy.mockReset();

    // Mock request
    mockReq = {
      user: {
        organizationId: 'org-123',
        userId: 'user-123',
        id: 'user-123'
      },
      params: {},
      query: {},
      body: {}
    };

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createDepartment', () => {
    it('should create department and return 201', async () => {
      const departmentData = {
        name: 'Engineering',
        description: 'Engineering department'
      };

      const createdDepartment = {
        id: 'dept-123',
        ...departmentData,
        organizationId: 'org-123'
      };

      mockReq.body = departmentData;
      controller.service.createDepartment.mockResolvedValue(createdDepartment);

      await controller.createDepartment(mockReq, mockRes);

      expect(controller.service.createDepartment).toHaveBeenCalledWith(
        departmentData,
        'org-123',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: createdDepartment
      });
    });

    it('should handle validation errors with 400', async () => {
      mockReq.body = { name: '' };
      controller.service.createDepartment.mockRejectedValue(new Error('Name is required'));

      await controller.createDepartment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Name is required'
      });
    });
  });

  describe('getDepartment', () => {
    it('should get department by id', async () => {
      const department = {
        id: 'dept-123',
        name: 'Engineering',
        organizationId: 'org-123'
      };

      mockReq.params = { id: 'dept-123' };
      controller.service.getDepartment.mockResolvedValue(department);

      await controller.getDepartment(mockReq, mockRes);

      expect(controller.service.getDepartment).toHaveBeenCalledWith('dept-123', 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: department
      });
    });

    it('should return 404 when department not found', async () => {
      mockReq.params = { id: 'dept-999' };
      controller.service.getDepartment.mockRejectedValue(new Error('Department not found'));

      await controller.getDepartment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Department not found'
      });
    });

    it('should return 500 for other errors', async () => {
      mockReq.params = { id: 'dept-123' };
      controller.service.getDepartment.mockRejectedValue(new Error('Database error'));

      await controller.getDepartment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('updateDepartment', () => {
    it('should update department', async () => {
      const updateData = {
        name: 'Updated Engineering',
        description: 'Updated description'
      };

      const updatedDepartment = {
        id: 'dept-123',
        ...updateData,
        organizationId: 'org-123'
      };

      mockReq.params = { id: 'dept-123' };
      mockReq.body = updateData;
      controller.service.updateDepartment.mockResolvedValue(updatedDepartment);

      await controller.updateDepartment(mockReq, mockRes);

      expect(controller.service.updateDepartment).toHaveBeenCalledWith(
        'dept-123',
        updateData,
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedDepartment
      });
    });

    it('should return 404 when department not found', async () => {
      mockReq.params = { id: 'dept-999' };
      mockReq.body = { name: 'Updated' };
      controller.service.updateDepartment.mockRejectedValue(new Error('Department not found'));

      await controller.updateDepartment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Department not found'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { id: 'dept-123' };
      mockReq.body = { name: '' };
      controller.service.updateDepartment.mockRejectedValue(new Error('Validation failed'));

      await controller.updateDepartment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed'
      });
    });
  });

  describe('deleteDepartment', () => {
    it('should delete department', async () => {
      mockReq.params = { id: 'dept-123' };
      controller.service.deleteDepartment.mockResolvedValue({ success: true });

      await controller.deleteDepartment(mockReq, mockRes);

      expect(controller.service.deleteDepartment).toHaveBeenCalledWith(
        'dept-123',
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Department deleted successfully'
      });
    });

    it('should return 404 when department not found', async () => {
      mockReq.params = { id: 'dept-999' };
      controller.service.deleteDepartment.mockRejectedValue(new Error('Department not found'));

      await controller.deleteDepartment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Department not found'
      });
    });
  });

  describe('getDepartments', () => {
    it('should get departments with default pagination', async () => {
      const departments = [
        { id: 'dept-1', name: 'Engineering' },
        { id: 'dept-2', name: 'Sales' }
      ];

      controller.service.listDepartments.mockResolvedValue(departments);

      await controller.getDepartments(mockReq, mockRes);

      expect(controller.service.listDepartments).toHaveBeenCalledWith(
        {},
        'org-123',
        { limit: 50, offset: 0 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: departments
      });
    });

    it('should get departments with filters and custom pagination', async () => {
      mockReq.query = { locationId: 'loc-123', limit: '20', offset: '40' };

      const departments = [{ id: 'dept-1', name: 'Engineering' }];

      controller.service.listDepartments.mockResolvedValue(departments);

      await controller.getDepartments(mockReq, mockRes);

      expect(controller.service.listDepartments).toHaveBeenCalledWith(
        { locationId: 'loc-123' },
        'org-123',
        { limit: 20, offset: 40 }
      );
    });

    it('should handle errors', async () => {
      controller.service.listDepartments.mockRejectedValue(new Error('Database error'));

      await controller.getDepartments(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getDepartmentHierarchy', () => {
    it('should get department hierarchy', async () => {
      mockReq.params = { id: 'dept-123' };
      
      const hierarchy = {
        id: 'dept-123',
        name: 'Engineering',
        children: [
          { id: 'dept-124', name: 'Frontend' },
          { id: 'dept-125', name: 'Backend' }
        ]
      };

      controller.service.getDepartmentHierarchy.mockResolvedValue(hierarchy);

      await controller.getDepartmentHierarchy(mockReq, mockRes);

      expect(controller.service.getDepartmentHierarchy).toHaveBeenCalledWith('dept-123', 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: hierarchy
      });
    });

    it('should handle errors', async () => {
      mockReq.params = { id: 'dept-999' };
      
      controller.service.getDepartmentHierarchy.mockRejectedValue(new Error('Database error'));

      await controller.getDepartmentHierarchy(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });
});
