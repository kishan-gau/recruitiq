/**
 * WorkerTypeRepository Test Suite
 * 
 * Tests for PayLinQ worker type repository following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals  
 * - Database query mocking via dependency injection
 * - Valid UUID v4 formats
 * - Multi-tenant isolation validation
 * - Data layer operations coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import WorkerTypeRepository from '../../../../src/products/paylinq/repositories/workerTypeRepository.js';

describe('WorkerTypeRepository', () => {
  let repository: any;
  let mockQuery: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testWorkerTypeId = '323e4567-e89b-12d3-a456-426614174002';
  const testEmployeeId = '423e4567-e89b-12d3-a456-426614174003';

  /**
   * Helper to create DB format worker type (snake_case)
   */
  const createDbWorkerType = (overrides: any = {}) => ({
    id: testWorkerTypeId,
    organization_id: testOrganizationId,
    name: 'Full-Time Employee',
    code: 'FTE',
    description: 'Standard full-time employee',
    benefits_eligible: true,
    pto_eligible: true,
    sick_leave_eligible: true,
    vacation_accrual_rate: 0.0769,
    is_active: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    created_by: testUserId,
    updated_by: testUserId,
    deleted_at: null,
    deleted_by: null,
    // Pay config fields (from JOIN)
    default_pay_frequency: 'monthly',
    default_payment_method: 'ach',
    overtime_eligible: true,
    pay_structure_template_code: 'STANDARD_PAY',
    ...overrides
  });

  beforeEach(() => {
    // Create mock query function with proper structure
    mockQuery = jest.fn();
    
    // Inject mock via constructor (dependency injection)
    repository = new WorkerTypeRepository({ query: mockQuery });
  });

  // ==================== FIND OPERATIONS ====================

  describe('findAll', () => {
    it('should find all worker types with organization isolation', async () => {
      const dbWorkerTypes = [
        createDbWorkerType({ code: 'FTE', name: 'Full-Time' }),
        createDbWorkerType({ 
          id: '523e4567-e89b-12d3-a456-426614174004',
          code: 'PTE', 
          name: 'Part-Time' 
        })
      ];

      mockQuery.mockResolvedValue({ rows: dbWorkerTypes });

      const result = await repository.findAll(testOrganizationId);

      expect(result).toEqual(dbWorkerTypes);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM hris.worker_type'),
        [testOrganizationId],
        testOrganizationId,
        expect.objectContaining({ operation: 'SELECT', table: 'hris.worker_type' })
      );
      // Verify organization_id filter
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('wt.organization_id = $1'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      // Verify soft delete filter
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('wt.deleted_at IS NULL'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should apply isActive filter', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findAll(testOrganizationId, { isActive: true });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('wt.is_active = $2'),
        [testOrganizationId, true],
        testOrganizationId,
        expect.any(Object)
      );
    });

    it('should apply code filter', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findAll(testOrganizationId, { code: 'FTE' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('wt.code = $2'),
        [testOrganizationId, 'FTE'],
        testOrganizationId,
        expect.any(Object)
      );
    });

    it('should apply search filter across multiple fields', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findAll(testOrganizationId, { search: 'employee' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE $2'),
        [testOrganizationId, '%employee%'],
        testOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('findById', () => {
    it('should find worker type by ID with organization isolation', async () => {
      const dbWorkerType = createDbWorkerType();
      mockQuery.mockResolvedValue({ rows: [dbWorkerType] });

      const result = await repository.findById(testWorkerTypeId, testOrganizationId);

      expect(result).toEqual(dbWorkerType);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE wt.id = $1 AND wt.organization_id = $2'),
        [testWorkerTypeId, testOrganizationId],
        testOrganizationId,
        expect.objectContaining({ operation: 'SELECT', table: 'hris.worker_type' })
      );
    });

    it('should return null when worker type not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById(testWorkerTypeId, testOrganizationId);

      expect(result).toBeNull();
    });

    it('should join with pay config table', async () => {
      mockQuery.mockResolvedValue({ rows: [createDbWorkerType()] });

      await repository.findById(testWorkerTypeId, testOrganizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN payroll.worker_type_pay_config'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('findByCode', () => {
    it('should find worker type by code with organization isolation', async () => {
      const dbWorkerType = createDbWorkerType({ code: 'FTE' });
      mockQuery.mockResolvedValue({ rows: [dbWorkerType] });

      const result = await repository.findByCode('FTE', testOrganizationId);

      expect(result).toEqual(dbWorkerType);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE wt.code = $1 AND wt.organization_id = $2'),
        ['FTE', testOrganizationId],
        testOrganizationId,
        expect.any(Object)
      );
    });

    it('should return null when code not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByCode('INVALID', testOrganizationId);

      expect(result).toBeNull();
    });
  });

  describe('findAllWithPagination', () => {
    it('should return paginated results with metadata', async () => {
      const dbWorkerTypes = [
        createDbWorkerType({ code: 'FTE' }),
        createDbWorkerType({ 
          id: '623e4567-e89b-12d3-a456-426614174005',
          code: 'PTE' 
        })
      ];

      // Mock count query
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '25' }] });
      // Mock data query
      mockQuery.mockResolvedValueOnce({ rows: dbWorkerTypes });

      const result = await repository.findAllWithPagination(
        testOrganizationId,
        {},
        { page: 1, limit: 20, sortBy: 'name', sortOrder: 'asc' }
      );

      expect(result.workerTypes).toEqual(dbWorkerTypes);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2,
        hasNext: true,
        hasPrev: false
      });
      expect(mockQuery).toHaveBeenCalledTimes(2); // Count + data
    });

    it('should apply correct LIMIT and OFFSET', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '100' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findAllWithPagination(
        testOrganizationId,
        {},
        { page: 3, limit: 20 }
      );

      // Check data query (second call)
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [testOrganizationId, 20, 40], // offset = (3-1) * 20
        testOrganizationId,
        expect.any(Object)
      );
    });

    it('should sanitize sort field to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findAllWithPagination(
        testOrganizationId,
        {},
        { page: 1, limit: 20, sortBy: 'DROP TABLE users;', sortOrder: 'asc' }
      );

      // Should default to 'name' when invalid sortBy provided
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('ORDER BY wt.name ASC'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should sanitize sort order', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findAllWithPagination(
        testOrganizationId,
        {},
        { page: 1, limit: 20, sortBy: 'name', sortOrder: 'INVALID' }
      );

      // Should default to ASC when invalid sortOrder provided
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('ORDER BY wt.name ASC'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // ==================== PAY CONFIGURATION ====================

  describe('upsertPayConfig', () => {
    it('should insert pay config when not exists', async () => {
      const payConfig = {
        defaultPayFrequency: 'monthly',
        defaultPaymentMethod: 'ach',
        overtimeEligible: true,
        payStructureTemplateCode: 'STANDARD_PAY'
      };

      const dbPayConfig = {
        id: '723e4567-e89b-12d3-a456-426614174006',
        worker_type_id: testWorkerTypeId,
        organization_id: testOrganizationId,
        default_pay_frequency: 'monthly',
        default_payment_method: 'ach',
        overtime_eligible: true,
        pay_structure_template_code: 'STANDARD_PAY',
        created_by: testUserId,
        created_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [dbPayConfig] });

      const result = await repository.upsertPayConfig(
        testWorkerTypeId,
        payConfig,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual(dbPayConfig);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.worker_type_pay_config'),
        [
          testWorkerTypeId,
          testOrganizationId,
          'monthly',
          'ach',
          true,
          'STANDARD_PAY',
          testUserId
        ],
        testOrganizationId,
        expect.objectContaining({ 
          operation: 'INSERT', 
          table: 'payroll.worker_type_pay_config',
          userId: testUserId
        })
      );
    });

    it('should use ON CONFLICT for upsert behavior', async () => {
      mockQuery.mockResolvedValue({ rows: [{}] });

      await repository.upsertPayConfig(
        testWorkerTypeId,
        { defaultPayFrequency: 'weekly', defaultPaymentMethod: 'check' },
        testOrganizationId,
        testUserId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (worker_type_id, organization_id)'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DO UPDATE SET'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('getPayConfig', () => {
    it('should get pay configuration with organization isolation', async () => {
      const dbPayConfig = {
        worker_type_id: testWorkerTypeId,
        organization_id: testOrganizationId,
        default_pay_frequency: 'monthly',
        overtime_eligible: true
      };

      mockQuery.mockResolvedValue({ rows: [dbPayConfig] });

      const result = await repository.getPayConfig(testWorkerTypeId, testOrganizationId);

      expect(result).toEqual(dbPayConfig);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE worker_type_id = $1 AND organization_id = $2'),
        [testWorkerTypeId, testOrganizationId],
        testOrganizationId,
        expect.any(Object)
      );
    });

    it('should return null when config not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getPayConfig(testWorkerTypeId, testOrganizationId);

      expect(result).toBeNull();
    });
  });

  describe('deletePayConfig', () => {
    it('should soft delete pay config', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await repository.deletePayConfig(
        testWorkerTypeId,
        testOrganizationId,
        testUserId
      );

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.worker_type_pay_config'),
        [testUserId, testWorkerTypeId, testOrganizationId],
        testOrganizationId,
        expect.objectContaining({ 
          operation: 'DELETE',
          userId: testUserId
        })
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET deleted_at = NOW()'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should return false when config not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repository.deletePayConfig(
        testWorkerTypeId,
        testOrganizationId,
        testUserId
      );

      expect(result).toBe(false);
    });
  });

  // ==================== WORKER TYPE HISTORY ====================

  describe('recordWorkerTypeChange', () => {
    it('should record worker type change with all fields', async () => {
      const effectiveFrom = new Date('2025-01-01');
      const changeReason = 'Promotion to full-time';

      const dbHistory = {
        id: '823e4567-e89b-12d3-a456-426614174007',
        organization_id: testOrganizationId,
        employee_id: testEmployeeId,
        worker_type_id: testWorkerTypeId,
        effective_from: effectiveFrom,
        change_reason: changeReason,
        recorded_by: testUserId,
        recorded_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [dbHistory] });

      const result = await repository.recordWorkerTypeChange(
        testEmployeeId,
        testWorkerTypeId,
        effectiveFrom,
        testOrganizationId,
        testUserId,
        changeReason
      );

      expect(result).toEqual(dbHistory);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.worker_type_history'),
        [testOrganizationId, testEmployeeId, testWorkerTypeId, effectiveFrom, changeReason, testUserId],
        testOrganizationId,
        expect.objectContaining({ 
          operation: 'INSERT',
          table: 'payroll.worker_type_history',
          userId: testUserId
        })
      );
    });
  });

  describe('getWorkerTypeHistory', () => {
    it('should get worker type history with joins', async () => {
      const dbHistory = [
        {
          id: '923e4567-e89b-12d3-a456-426614174008',
          employee_id: testEmployeeId,
          worker_type_id: testWorkerTypeId,
          worker_type_name: 'Full-Time',
          worker_type_code: 'FTE',
          recorded_by_name: 'John Admin',
          effective_from: new Date('2025-01-01')
        }
      ];

      mockQuery.mockResolvedValue({ rows: dbHistory });

      const result = await repository.getWorkerTypeHistory(
        testEmployeeId,
        testOrganizationId
      );

      expect(result).toEqual(dbHistory);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN hris.worker_type'),
        [testEmployeeId, testOrganizationId],
        testOrganizationId,
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY wth.effective_from DESC'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // ==================== STATISTICS ====================

  describe('countEmployeesByWorkerType', () => {
    it('should return employee counts by worker type', async () => {
      const mockCounts = [
        { id: testWorkerTypeId, name: 'Full-Time', code: 'FTE', employee_count: '15' },
        { id: 'a23e4567-e89b-12d3-a456-426614174009', name: 'Part-Time', code: 'PTE', employee_count: '8' }
      ];

      mockQuery.mockResolvedValue({ rows: mockCounts });

      const result = await repository.countEmployeesByWorkerType(testOrganizationId);

      expect(result).toEqual(mockCounts);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(e.id) as employee_count'),
        [testOrganizationId],
        testOrganizationId,
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY wt.id, wt.name, wt.code'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('getEmployeesByWorkerType', () => {
    it('should get employees with specific worker type', async () => {
      const mockEmployees = [
        {
          id: testEmployeeId,
          employee_number: 'EMP001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          employment_status: 'active',
          hire_date: new Date('2024-01-15')
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockEmployees });

      const result = await repository.getEmployeesByWorkerType(
        testWorkerTypeId,
        testOrganizationId
      );

      expect(result).toEqual(mockEmployees);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.worker_type_id = $1'),
        [testWorkerTypeId, testOrganizationId],
        testOrganizationId,
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY e.last_name, e.first_name'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // ==================== UPDATE & DELETE ====================

  describe('update', () => {
    it('should update both HRIS and pay config in transaction', async () => {
      const updates = {
        name: 'Updated Name',
        default_pay_frequency: 'bi-weekly',
        overtime_eligible: false
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      // Mock transaction sequence
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [createDbWorkerType()], rowCount: 1 }) // UPDATE worker_type
        .mockResolvedValueOnce({}) // UPSERT pay_config
        .mockResolvedValueOnce({}); // COMMIT

      // Mock pool.connect
      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient)
      };

      // Mock database import
      jest.unstable_mockModule('../../../../src/config/database.js', () => ({
        default: mockPool
      }));

      // Mock final findById
      mockQuery.mockResolvedValue({ rows: [createDbWorkerType()] });

      const result = await repository.update(
        testWorkerTypeId,
        updates,
        testOrganizationId,
        testUserId
      );

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error for invalid field names', async () => {
      const invalidUpdates = {
        'DROP TABLE': 'value' // SQL injection attempt
      };

      await expect(
        repository.update(testWorkerTypeId, invalidUpdates, testOrganizationId, testUserId)
      ).rejects.toThrow('No valid fields to update');
    });
  });

  describe('delete', () => {
    it('should prevent deletion when worker type has active employees', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] }); // Has active employees

      await expect(
        repository.delete(testWorkerTypeId, testOrganizationId, testUserId)
      ).rejects.toThrow(/Cannot delete worker type.*5 active employee/);
    });

    it('should soft delete worker type when no active employees', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] }); // No active employees
      mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // Delete success

      const result = await repository.delete(
        testWorkerTypeId,
        testOrganizationId,
        testUserId
      );

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE hris.worker_type'),
        [testUserId, testWorkerTypeId, testOrganizationId],
        testOrganizationId,
        expect.objectContaining({ operation: 'DELETE' })
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SET deleted_at = NOW()'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should throw error when worker type not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      mockQuery.mockResolvedValueOnce({ rowCount: 0 }); // Not found

      await expect(
        repository.delete(testWorkerTypeId, testOrganizationId, testUserId)
      ).rejects.toThrow('Worker type not found or already deleted');
    });
  });
});
