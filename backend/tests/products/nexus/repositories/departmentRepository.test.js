/**
 * DepartmentRepository Tests
 * Unit tests for department repository
 */

import DepartmentRepository from '../../../../src/products/nexus/repositories/departmentRepository.js';
import pool from '../../../../src/config/database.js';

describe('DepartmentRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new DepartmentRepository();
  });

  describe('create', () => {
    it('should create a new department', async () => {
      const mockDepartment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Engineering',
        code: 'ENG',
        parent_id: null,
        location_id: '123e4567-e89b-12d3-a456-426614174001',
        manager_id: '123e4567-e89b-12d3-a456-426614174002',
        description: 'Engineering department',
        organization_id: '123e4567-e89b-12d3-a456-426614174003',
        created_at: '2024-01-15T10:00:00Z'
      };

      db.query.mockResolvedValue({ rows: [mockDepartment] });

      const data = {
        name: 'Engineering',
        code: 'ENG',
        locationId: '123e4567-e89b-12d3-a456-426614174001',
        managerId: '123e4567-e89b-12d3-a456-426614174002',
        description: 'Engineering department',
        organizationId: '123e4567-e89b-12d3-a456-426614174003'
      };

      const result = await repository.create(data);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hris.departments'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', 'Engineering');
      expect(result).toHaveProperty('code', 'ENG');
    });

    it('should create department with parent (subdepartment)', async () => {
      const mockDepartment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Backend Team',
        code: 'ENG-BE',
        parent_id: '123e4567-e89b-12d3-a456-426614174004',
        organization_id: '123e4567-e89b-12d3-a456-426614174003',
        created_at: '2024-01-15T10:00:00Z'
      };

      db.query.mockResolvedValue({ rows: [mockDepartment] });

      const data = {
        name: 'Backend Team',
        code: 'ENG-BE',
        parentId: '123e4567-e89b-12d3-a456-426614174004',
        organizationId: '123e4567-e89b-12d3-a456-426614174003'
      };

      const result = await repository.create(data);

      expect(result).toHaveProperty('parentId', data.parentId);
    });
  });

  describe('findById', () => {
    it('should find department by ID', async () => {
      const mockDepartment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Engineering',
        code: 'ENG',
        employee_count: 25,
        organization_id: '123e4567-e89b-12d3-a456-426614174003'
      };

      db.query.mockResolvedValue({ rows: [mockDepartment] });

      const id = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174003';

      const result = await repository.findById(id, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([id, organizationId])
      );
      expect(result).toHaveProperty('id', id);
      expect(result).toHaveProperty('employeeCount', 25);
    });

    it('should return null if department not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const id = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174003';

      const result = await repository.findById(id, organizationId);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all departments', async () => {
      const mockDepartments = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Engineering',
          code: 'ENG',
          employee_count: 25,
          organization_id: '123e4567-e89b-12d3-a456-426614174003'
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Sales',
          code: 'SALES',
          employee_count: 15,
          organization_id: '123e4567-e89b-12d3-a456-426614174003'
        }
      ];

      db.query.mockResolvedValue({ rows: mockDepartments });

      const organizationId = '123e4567-e89b-12d3-a456-426614174003';

      const result = await repository.findAll(organizationId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('name', 'Engineering');
      expect(result[1]).toHaveProperty('name', 'Sales');
    });

    it('should filter by location', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const organizationId = '123e4567-e89b-12d3-a456-426614174003';
      const filters = { locationId: '123e4567-e89b-12d3-a456-426614174001' };

      await repository.findAll(organizationId, filters);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('location_id ='),
        expect.any(Array)
      );
    });

    it('should filter by manager', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const organizationId = '123e4567-e89b-12d3-a456-426614174003';
      const filters = { managerId: '123e4567-e89b-12d3-a456-426614174002' };

      await repository.findAll(organizationId, filters);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('manager_id ='),
        expect.any(Array)
      );
    });

    it('should support pagination', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const organizationId = '123e4567-e89b-12d3-a456-426614174003';
      const filters = { limit: 10, offset: 0 };

      await repository.findAll(organizationId, filters);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10, 0])
      );
    });
  });

  describe('update', () => {
    it('should update department', async () => {
      const mockUpdated = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Engineering Department',
        code: 'ENG',
        description: 'Updated description',
        organization_id: '123e4567-e89b-12d3-a456-426614174003',
        updated_at: '2024-01-15T11:00:00Z'
      };

      db.query.mockResolvedValue({ rows: [mockUpdated] });

      const id = '123e4567-e89b-12d3-a456-426614174000';
      const data = {
        name: 'Engineering Department',
        description: 'Updated description'
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174003';

      const result = await repository.update(id, data, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE hris.departments'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('name', 'Engineering Department');
    });
  });

  describe('delete', () => {
    it('should soft delete department', async () => {
      db.query.mockResolvedValue({ rowCount: 1 });

      const id = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174003';

      await repository.delete(id, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at = NOW()'),
        expect.arrayContaining([id, organizationId])
      );
    });
  });

  describe('getHierarchy', () => {
    it('should get department hierarchy (tree structure)', async () => {
      const mockHierarchy = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Engineering',
          code: 'ENG',
          parent_id: null,
          level: 0,
          path: 'Engineering',
          organization_id: '123e4567-e89b-12d3-a456-426614174003'
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Backend Team',
          code: 'ENG-BE',
          parent_id: '123e4567-e89b-12d3-a456-426614174000',
          level: 1,
          path: 'Engineering > Backend Team',
          organization_id: '123e4567-e89b-12d3-a456-426614174003'
        }
      ];

      db.query.mockResolvedValue({ rows: mockHierarchy });

      const departmentId = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174003';

      const result = await repository.getHierarchy(departmentId, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE'),
        expect.arrayContaining([departmentId, organizationId])
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('level', 0);
      expect(result[1]).toHaveProperty('level', 1);
    });
  });

  describe('findByCode', () => {
    it('should find department by code', async () => {
      const mockDepartment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Engineering',
        code: 'ENG',
        organization_id: '123e4567-e89b-12d3-a456-426614174003'
      };

      db.query.mockResolvedValue({ rows: [mockDepartment] });

      const code = 'ENG';
      const organizationId = '123e4567-e89b-12d3-a456-426614174003';

      const result = await repository.findByCode(code, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('code ='),
        expect.arrayContaining([code, organizationId])
      );
      expect(result).toHaveProperty('code', 'ENG');
    });

    it('should return null if code not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const code = 'NOTFOUND';
      const organizationId = '123e4567-e89b-12d3-a456-426614174003';

      const result = await repository.findByCode(code, organizationId);

      expect(result).toBeNull();
    });
  });

  describe('getEmployees', () => {
    it('should get all employees in a department', async () => {
      const mockEmployees = [
        {
          id: '123e4567-e89b-12d3-a456-426614174010',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          department_id: '123e4567-e89b-12d3-a456-426614174000'
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174011',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
          department_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      ];

      db.query.mockResolvedValue({ rows: mockEmployees });

      const departmentId = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174003';

      const result = await repository.getEmployees(departmentId, organizationId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('firstName', 'John');
      expect(result[1]).toHaveProperty('firstName', 'Jane');
    });
  });
});
