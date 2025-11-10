/**
 * Role Service Tests
 * Unit tests for RoleService business logic
 */

import RoleService from '../../../../src/products/schedulehub/services/roleService.js';
import pool from '../../../../src/config/database.js';
import { createMockRole, createMockWorkerRole, createMockPool } from '../factories/testData.js';

describe('RoleService', () => {
  let service;
  let mockPool;
  const organizationId = 'org-123';
  const userId = 'user-456';

  beforeEach(() => {
    service = new RoleService();
    mockPool = createMockPool();
    pool.query = mockPool.query;
    jest.clearAllMocks();
  });

  describe('createRole', () => {
    test('should create role successfully', async () => {
      const roleData = {
        name: 'Cashier',
        code: 'CASH-01',
        description: 'Front-end cashier role',
        departmentId: 'dept-123',
        requiredCertifications: ['Food Handler', 'POS Training'],
        defaultHourlyRate: 18.50
      };

      const mockRole = createMockRole(roleData);
      mockPool.query.mockResolvedValueOnce({ rows: [mockRole] });

      const result = await service.createRole(roleData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Cashier');
      expect(result.data.code).toBe('CASH-01');
      expect(result.data.required_certifications).toEqual(['Food Handler', 'POS Training']);
    });

    test('should validate required fields', async () => {
      const invalidData = {
        description: 'Test role'
        // Missing name and code
      };

      await expect(
        service.createRole(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate unique role code', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('duplicate key value'));

      await expect(
        service.createRole({
          name: 'Test',
          code: 'EXISTING-CODE'
        }, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate hourly rate is positive', async () => {
      const invalidData = {
        name: 'Test',
        code: 'TEST-01',
        defaultHourlyRate: -5.00
      };

      await expect(
        service.createRole(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });
  });

  describe('updateRole', () => {
    test('should update role successfully', async () => {
      const roleId = 'role-123';
      const updateData = {
        name: 'Senior Cashier',
        defaultHourlyRate: 22.00,
        requiredCertifications: ['Food Handler', 'POS Training', 'Lead Training']
      };

      const mockRole = createMockRole({
        id: roleId,
        ...updateData
      });

      mockPool.query.mockResolvedValueOnce({ rows: [mockRole] });

      const result = await service.updateRole(roleId, updateData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Senior Cashier');
      expect(result.data.default_hourly_rate).toBe(22.00);
    });

    test('should not update non-existent role', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.updateRole('invalid-id', { name: 'Test' }, organizationId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('listRoles', () => {
    test('should list active roles', async () => {
      const mockRoles = [
        createMockRole({ is_active: true }),
        createMockRole({ is_active: true }),
        createMockRole({ is_active: true })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRoles });

      const result = await service.listRoles(organizationId, true);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data.every(r => r.is_active)).toBe(true);
    });

    test('should filter by department', async () => {
      const departmentId = 'dept-123';
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.listRoles(organizationId, true, departmentId);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('department_id');
      expect(queryCall[1]).toContain(departmentId);
    });

    test('should include inactive roles when requested', async () => {
      const mockRoles = [
        createMockRole({ is_active: true }),
        createMockRole({ is_active: false })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRoles });

      const result = await service.listRoles(organizationId, false);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('getRoleById', () => {
    test('should return role by ID', async () => {
      const mockRole = createMockRole();
      mockPool.query.mockResolvedValueOnce({ rows: [mockRole] });

      const result = await service.getRoleById(mockRole.id, organizationId);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockRole.id);
    });

    test('should return error if not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getRoleById('invalid-id', organizationId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('assignWorkerToRole', () => {
    test('should assign worker with proficiency level', async () => {
      const roleId = 'role-123';
      const workerId = 'worker-456';
      const proficiencyLevel = 'competent';
      const certificationDate = '2024-01-01';

      const mockAssignment = createMockWorkerRole({
        role_id: roleId,
        worker_id: workerId,
        proficiency_level: proficiencyLevel
      });

      mockPool.query.mockResolvedValueOnce({ rows: [mockAssignment] });

      const result = await service.assignWorkerToRole(
        roleId,
        workerId,
        organizationId,
        proficiencyLevel,
        certificationDate,
        'Completed training',
        userId
      );

      expect(result.success).toBe(true);
      expect(result.data.proficiency_level).toBe('competent');
      expect(result.data.certification_date).toBe(certificationDate);
    });

    test('should validate proficiency level enum', async () => {
      await expect(
        service.assignWorkerToRole(
          'role-123',
          'worker-456',
          organizationId,
          'invalid_level'
        )
      ).rejects.toThrow();
    });

    test('should handle duplicate assignment', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('duplicate key'));

      await expect(
        service.assignWorkerToRole(
          'role-123',
          'worker-456',
          organizationId,
          'competent'
        )
      ).rejects.toThrow();
    });

    test('should default to competent if no proficiency specified', async () => {
      const mockAssignment = createMockWorkerRole({
        proficiency_level: 'competent'
      });

      mockPool.query.mockResolvedValueOnce({ rows: [mockAssignment] });

      const result = await service.assignWorkerToRole(
        'role-123',
        'worker-456',
        organizationId
      );

      expect(result.success).toBe(true);
      expect(result.data.proficiency_level).toBe('competent');
    });
  });

  describe('removeWorkerFromRole', () => {
    test('should soft delete worker role assignment', async () => {
      const roleId = 'role-123';
      const workerId = 'worker-456';

      mockPool.query.mockResolvedValueOnce({ 
        rows: [createMockWorkerRole({ is_active: false })] 
      });

      const result = await service.removeWorkerFromRole(roleId, workerId, organizationId);

      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = false'),
        expect.anything()
      );
    });

    test('should return success even if assignment not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.removeWorkerFromRole('role-123', 'worker-456', organizationId);

      expect(result.success).toBe(true);
    });
  });

  describe('getWorkerRoles', () => {
    test('should return active worker roles', async () => {
      const workerId = 'worker-123';
      const mockRoles = [
        createMockWorkerRole({ worker_id: workerId, is_active: true }),
        createMockWorkerRole({ worker_id: workerId, is_active: true })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRoles });

      const result = await service.getWorkerRoles(workerId, organizationId, false);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.every(r => r.is_active)).toBe(true);
    });

    test('should include inactive roles when requested', async () => {
      const mockRoles = [
        createMockWorkerRole({ is_active: true }),
        createMockWorkerRole({ is_active: false })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRoles });

      const result = await service.getWorkerRoles('worker-123', organizationId, true);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test('should include role details in response', async () => {
      const mockRoles = [
        {
          ...createMockWorkerRole(),
          role_name: 'Cashier',
          role_code: 'CASH-01',
          default_hourly_rate: 18.50
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRoles });

      const result = await service.getWorkerRoles('worker-123', organizationId);

      expect(result.success).toBe(true);
      expect(result.data[0].role_name).toBe('Cashier');
    });
  });

  describe('getRoleWorkers', () => {
    test('should return workers assigned to role', async () => {
      const roleId = 'role-123';
      const mockWorkers = [
        createMockWorkerRole({ role_id: roleId }),
        createMockWorkerRole({ role_id: roleId })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockWorkers });

      const result = await service.getRoleWorkers(roleId, organizationId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test('should only return active assignments by default', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.getRoleWorkers('role-123', organizationId, false);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('wr.is_active = true');
    });

    test('should include worker details in response', async () => {
      const mockWorkers = [
        {
          ...createMockWorkerRole(),
          worker_first_name: 'John',
          worker_last_name: 'Doe',
          worker_email: 'john@example.com'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockWorkers });

      const result = await service.getRoleWorkers('role-123', organizationId);

      expect(result.success).toBe(true);
      expect(result.data[0].worker_first_name).toBe('John');
    });
  });
});
