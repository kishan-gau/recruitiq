/**
 * DepartmentService Unit Tests
 * Tests business logic for department management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies BEFORE importing service
const mockQuery = jest.fn();
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  query: mockQuery
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import service AFTER mocks
const { default: DepartmentService } = await import('../../../../src/products/nexus/services/departmentService.js');

describe('DepartmentService', () => {
  let service;
  const mockOrgId = 'org-123';
  const mockUserId = 'user-456';
  const mockDeptId = 'dept-789';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DepartmentService();
  });

  describe('createDepartment', () => {
    const validDeptData = {
      department_name: 'Engineering',
      department_code: 'ENG',
      description: 'Engineering department',
      is_active: true
    };

    it('should create department successfully', async () => {
      const mockCreated = { id: mockDeptId, ...validDeptData };
      
      mockQuery.mockResolvedValueOnce({ rows: [] }) // Check for duplicate
        .mockResolvedValueOnce({ rows: [mockCreated] }); // Insert

      const result = await service.createDepartment(validDeptData, mockOrgId, mockUserId);

      expect(result).toEqual(mockCreated);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw error if department name is missing', async () => {
      await expect(
        service.createDepartment({}, mockOrgId, mockUserId)
      ).rejects.toThrow('Department name is required');
    });

    it('should throw error if department name already exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-dept' }] });

      await expect(
        service.createDepartment(validDeptData, mockOrgId, mockUserId)
      ).rejects.toThrow('already exists');
    });

    it('should default is_active to true', async () => {
      const deptWithoutActive = { department_name: 'HR' };
      const mockCreated = { id: mockDeptId, ...deptWithoutActive, is_active: true };
      
      mockQuery.mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockCreated] });

      await service.createDepartment(deptWithoutActive, mockOrgId, mockUserId);

      const createCall = mockQuery.mock.calls[1];
      expect(createCall[1][6]).toBe(true); // is_active parameter
    });
  });

  describe('getDepartment', () => {
    it('should get department with employee count', async () => {
      const mockDept = {
        id: mockDeptId,
        department_name: 'Engineering',
        employee_count: '5'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockDept] });

      const result = await service.getDepartment(mockDeptId, mockOrgId);

      expect(result).toEqual(mockDept);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(e.id) as employee_count'),
        [mockDeptId, mockOrgId],
        mockOrgId,
        expect.any(Object)
      );
    });

    it('should throw error if department not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.getDepartment('non-existent', mockOrgId)
      ).rejects.toThrow('Department not found');
    });

    it('should include parent department name', async () => {
      const mockDept = {
        id: mockDeptId,
        department_name: 'Sub-Engineering',
        parent_department_name: 'Engineering',
        employee_count: '3'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockDept] });

      const result = await service.getDepartment(mockDeptId, mockOrgId);

      expect(result.parent_department_name).toBe('Engineering');
    });
  });

  describe('listDepartments', () => {
    const mockDepts = [
      { id: 'dept-1', department_name: 'Engineering', employee_count: '10' },
      { id: 'dept-2', department_name: 'HR', employee_count: '5' }
    ];

    it('should list all departments with pagination', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockDepts })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await service.listDepartments({}, mockOrgId);

      expect(result.departments).toEqual(mockDepts);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should filter by isActive', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockDepts })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      await service.listDepartments({ isActive: true }, mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('d.is_active = $');
    });

    it('should filter by parentDepartmentId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockDepts })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      await service.listDepartments({ parentDepartmentId: 'parent-123' }, mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('d.parent_department_id = $');
    });

    it('should handle null parentDepartmentId (root departments)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockDepts })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      await service.listDepartments({ parentDepartmentId: null }, mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('d.parent_department_id IS NULL');
    });

    it('should apply custom pagination', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockDepts })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      await service.listDepartments({}, mockOrgId, { limit: 10, offset: 5 });

      expect(mockQuery.mock.calls[0][1]).toContain(10);
      expect(mockQuery.mock.calls[0][1]).toContain(5);
    });
  });

  describe('updateDepartment', () => {
    const existingDept = {
      id: mockDeptId,
      department_name: 'Engineering',
      is_active: true
    };

    it('should update department successfully', async () => {
      const updateData = { department_name: 'Software Engineering' };
      const mockUpdated = { ...existingDept, ...updateData };

      mockQuery.mockResolvedValueOnce({ rows: [existingDept] }) // Check exists
        .mockResolvedValueOnce({ rows: [] }) // Check duplicate name
        .mockResolvedValueOnce({ rows: [mockUpdated] }); // Update

      const result = await service.updateDepartment(mockDeptId, updateData, mockOrgId, mockUserId);

      expect(result).toEqual(mockUpdated);
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should throw error if department not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.updateDepartment('non-existent', {}, mockOrgId, mockUserId)
      ).rejects.toThrow('Department not found');
    });

    it('should throw error if new name already exists', async () => {
      const updateData = { department_name: 'HR' };

      mockQuery.mockResolvedValueOnce({ rows: [existingDept] })
        .mockResolvedValueOnce({ rows: [{ id: 'other-dept' }] }); // Duplicate

      await expect(
        service.updateDepartment(mockDeptId, updateData, mockOrgId, mockUserId)
      ).rejects.toThrow('already exists');
    });

    it('should return existing department if no updates', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [existingDept] });

      const result = await service.updateDepartment(mockDeptId, {}, mockOrgId, mockUserId);

      expect(result).toEqual(existingDept);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should update multiple fields', async () => {
      const updateData = {
        department_name: 'Updated Engineering',
        description: 'New description',
        is_active: false
      };

      mockQuery.mockResolvedValueOnce({ rows: [existingDept] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...existingDept, ...updateData }] });

      await service.updateDepartment(mockDeptId, updateData, mockOrgId, mockUserId);

      const updateCall = mockQuery.mock.calls[2];
      expect(updateCall[0]).toContain('department_name = $');
      expect(updateCall[0]).toContain('description = $');
      expect(updateCall[0]).toContain('is_active = $');
    });
  });

  describe('deleteDepartment', () => {
    it('should soft delete department successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockDeptId }] }) // Check exists
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Check employees
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Check children
        .mockResolvedValueOnce({ rows: [] }); // Delete

      const result = await service.deleteDepartment(mockDeptId, mockOrgId, mockUserId);

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(4);
    });

    it('should throw error if department not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.deleteDepartment('non-existent', mockOrgId, mockUserId)
      ).rejects.toThrow('Department not found');
    });

    it('should throw error if department has active employees', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockDeptId }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }); // Has employees

      await expect(
        service.deleteDepartment(mockDeptId, mockOrgId, mockUserId)
      ).rejects.toThrow('Cannot delete department with active employees');
    });

    it('should throw error if department has sub-departments', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockDeptId }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // No employees
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Has children

      await expect(
        service.deleteDepartment(mockDeptId, mockOrgId, mockUserId)
      ).rejects.toThrow('Cannot delete department with sub-departments');
    });

    it('should include deleted_by in update', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockDeptId }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.deleteDepartment(mockDeptId, mockOrgId, mockUserId);

      const deleteCall = mockQuery.mock.calls[3];
      expect(deleteCall[1]).toContain(mockUserId);
    });
  });

  describe('getDepartmentHierarchy', () => {
    it('should get department tree structure', async () => {
      const mockHierarchy = [
        { id: 'dept-1', department_name: 'Engineering', level: 0, path: ['dept-1'] },
        { id: 'dept-2', department_name: 'Frontend', level: 1, path: ['dept-1', 'dept-2'] },
        { id: 'dept-3', department_name: 'Backend', level: 1, path: ['dept-1', 'dept-3'] }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockHierarchy });

      const result = await service.getDepartmentHierarchy(mockOrgId);

      expect(result).toEqual(mockHierarchy);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE dept_tree'),
        [mockOrgId],
        mockOrgId,
        expect.any(Object)
      );
    });

    it('should handle empty hierarchy', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getDepartmentHierarchy(mockOrgId);

      expect(result).toEqual([]);
    });

    it('should order by path', async () => {
      const mockHierarchy = [
        { id: 'dept-1', level: 0, path: ['dept-1'] },
        { id: 'dept-2', level: 1, path: ['dept-1', 'dept-2'] }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockHierarchy });

      await service.getDepartmentHierarchy(mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY path');
    });
  });

  describe('error handling', () => {
    it('should handle database errors in createDepartment', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.createDepartment({ department_name: 'Test' }, mockOrgId, mockUserId)
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors in getDepartment', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.getDepartment(mockDeptId, mockOrgId)
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors in listDepartments', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.listDepartments({}, mockOrgId)
      ).rejects.toThrow('Database error');
    });
  });
});



