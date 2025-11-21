# VIP Employee Feature - Part 7: Testing Strategy

**Part of:** VIP Employee Implementation Plan  
**Version:** 1.0  
**Last Updated:** November 21, 2025

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Coverage Requirements](#test-coverage-requirements)
3. [Unit Tests](#unit-tests)
4. [Integration Tests](#integration-tests)
5. [E2E Tests](#e2e-tests)
6. [Test Data Management](#test-data-management)
7. [Test Execution](#test-execution)

---

## Testing Philosophy

### Testing Pyramid

```
        /\
       /  \
      / E2E \          ← Few, slow, expensive (5 scenarios)
     /______\
    /        \
   /Integration\       ← Some, medium speed (15 tests)
  /____________\
 /              \
/   Unit Tests   \    ← Many, fast, cheap (50+ tests)
/__________________\
```

**Distribution:**
- **Unit Tests:** 70% (50+ tests)
- **Integration Tests:** 25% (15 tests)
- **E2E Tests:** 5% (5 scenarios)

---

## Test Coverage Requirements

### Minimum Coverage (MANDATORY)

| Component | Minimum Coverage | Target Coverage |
|-----------|------------------|-----------------|
| **Overall** | 80% | 90% |
| **Services** | 90% | 95% |
| **Repositories** | 85% | 90% |
| **Controllers** | 75% | 85% |
| **Utilities** | 90% | 95% |

### What to Test

**✅ MUST Test:**
- All VIP employee business logic
- VIP status validation and assignment
- Cross-product VIP flag propagation
- Security and authorization for VIP actions
- Data integrity across products
- Audit trail functionality
- Error handling and edge cases

**❌ DO NOT Test:**
- Third-party library internals
- Database connection pooling
- Express framework behavior
- Basic CRUD operations (already tested)

---

## Unit Tests

### 1. VIP Service Tests

**File:** `backend/tests/unit/products/nexus/services/VIPEmployeeService.test.js`

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import VIPEmployeeService from '../../../../../src/products/nexus/services/VIPEmployeeService.js';
import VIPEmployeeRepository from '../../../../../src/products/nexus/repositories/VIPEmployeeRepository.js';
import EmployeeRepository from '../../../../../src/products/nexus/repositories/EmployeeRepository.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../../../src/utils/errors.js';

describe('VIPEmployeeService', () => {
  let service;
  let mockVIPRepo;
  let mockEmployeeRepo;
  const testOrgId = 'org-123';
  const testUserId = 'user-123';
  const testEmployeeId = 'emp-123';

  beforeEach(() => {
    // Mock repositories
    mockVIPRepo = {
      createVIPEmployee: jest.fn(),
      findByEmployeeId: jest.fn(),
      findAllByOrganization: jest.fn(),
      updateVIPEmployee: jest.fn(),
      removeVIPStatus: jest.fn(),
      updateCrossProductFlags: jest.fn(),
      getVIPSummary: jest.fn()
    };

    mockEmployeeRepo = {
      findById: jest.fn(),
      updateVIPFlag: jest.fn(),
      findAllVIPEmployees: jest.fn()
    };

    // Inject mocks
    service = new VIPEmployeeService(mockVIPRepo, mockEmployeeRepo);
  });

  describe('assignVIPStatus', () => {
    const validData = {
      employeeId: testEmployeeId,
      vipLevel: 'high',
      reason: 'Executive team member',
      assignedByDepartment: 'HR',
      notes: 'CEO direct report'
    };

    it('should assign VIP status to employee', async () => {
      // Arrange
      const mockEmployee = {
        id: testEmployeeId,
        fullName: 'John Doe',
        isVIP: false
      };

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockVIPRepo.findByEmployeeId.mockResolvedValue(null);
      mockVIPRepo.createVIPEmployee.mockResolvedValue({
        id: 'vip-123',
        employeeId: testEmployeeId,
        vipLevel: 'high',
        ...validData
      });

      // Act
      const result = await service.assignVIPStatus(validData, testOrgId, testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result.employeeId).toBe(testEmployeeId);
      expect(result.vipLevel).toBe('high');
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(testEmployeeId, testOrgId);
      expect(mockVIPRepo.createVIPEmployee).toHaveBeenCalled();
      expect(mockEmployeeRepo.updateVIPFlag).toHaveBeenCalledWith(
        testEmployeeId,
        true,
        testOrgId
      );
    });

    it('should throw NotFoundError if employee does not exist', async () => {
      // Arrange
      mockEmployeeRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.assignVIPStatus(validData, testOrgId, testUserId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if employee already has VIP status', async () => {
      // Arrange
      mockEmployeeRepo.findById.mockResolvedValue({ id: testEmployeeId });
      mockVIPRepo.findByEmployeeId.mockResolvedValue({
        id: 'vip-123',
        employeeId: testEmployeeId
      });

      // Act & Assert
      await expect(
        service.assignVIPStatus(validData, testOrgId, testUserId)
      ).rejects.toThrow(ConflictError);
    });

    it('should validate VIP level enum', async () => {
      // Arrange
      const invalidData = { ...validData, vipLevel: 'invalid' };

      // Act & Assert
      await expect(
        service.assignVIPStatus(invalidData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should require reason field', async () => {
      // Arrange
      const invalidData = { ...validData, reason: '' };

      // Act & Assert
      await expect(
        service.assignVIPStatus(invalidData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateVIPStatus', () => {
    it('should update VIP employee information', async () => {
      // Arrange
      const updateData = {
        vipLevel: 'critical',
        notes: 'Updated notes'
      };

      const existingVIP = {
        id: 'vip-123',
        employeeId: testEmployeeId,
        vipLevel: 'high'
      };

      mockVIPRepo.findByEmployeeId.mockResolvedValue(existingVIP);
      mockVIPRepo.updateVIPEmployee.mockResolvedValue({
        ...existingVIP,
        ...updateData
      });

      // Act
      const result = await service.updateVIPStatus(
        testEmployeeId,
        updateData,
        testOrgId,
        testUserId
      );

      // Assert
      expect(result.vipLevel).toBe('critical');
      expect(mockVIPRepo.updateVIPEmployee).toHaveBeenCalled();
    });

    it('should throw NotFoundError if VIP record does not exist', async () => {
      // Arrange
      mockVIPRepo.findByEmployeeId.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateVIPStatus(testEmployeeId, {}, testOrgId, testUserId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('removeVIPStatus', () => {
    it('should remove VIP status from employee', async () => {
      // Arrange
      const removalData = {
        removalReason: 'Role change'
      };

      mockVIPRepo.findByEmployeeId.mockResolvedValue({
        id: 'vip-123',
        employeeId: testEmployeeId
      });
      mockVIPRepo.removeVIPStatus.mockResolvedValue(true);

      // Act
      await service.removeVIPStatus(
        testEmployeeId,
        removalData,
        testOrgId,
        testUserId
      );

      // Assert
      expect(mockVIPRepo.removeVIPStatus).toHaveBeenCalled();
      expect(mockEmployeeRepo.updateVIPFlag).toHaveBeenCalledWith(
        testEmployeeId,
        false,
        testOrgId
      );
    });

    it('should require removalReason', async () => {
      // Arrange
      mockVIPRepo.findByEmployeeId.mockResolvedValue({
        id: 'vip-123',
        employeeId: testEmployeeId
      });

      // Act & Assert
      await expect(
        service.removeVIPStatus(testEmployeeId, {}, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('syncCrossProductFlags', () => {
    it('should sync VIP flags across all products', async () => {
      // Arrange
      const vipEmployees = [
        { employeeId: 'emp-1' },
        { employeeId: 'emp-2' }
      ];

      mockVIPRepo.findAllByOrganization.mockResolvedValue(vipEmployees);
      mockVIPRepo.updateCrossProductFlags.mockResolvedValue({
        updated: 2,
        failed: 0
      });

      // Act
      const result = await service.syncCrossProductFlags(testOrgId);

      // Assert
      expect(result.updated).toBe(2);
      expect(mockVIPRepo.updateCrossProductFlags).toHaveBeenCalled();
    });
  });

  describe('getVIPSummary', () => {
    it('should return VIP summary statistics', async () => {
      // Arrange
      const mockSummary = {
        totalVIPs: 5,
        byLevel: { critical: 1, high: 2, medium: 2 },
        byDepartment: { 'Executive': 2, 'Finance': 3 }
      };

      mockVIPRepo.getVIPSummary.mockResolvedValue(mockSummary);

      // Act
      const result = await service.getVIPSummary(testOrgId);

      // Assert
      expect(result.totalVIPs).toBe(5);
      expect(result.byLevel.critical).toBe(1);
      expect(mockVIPRepo.getVIPSummary).toHaveBeenCalledWith(testOrgId);
    });
  });
});
```

### 2. VIP Repository Tests

**File:** `backend/tests/unit/products/nexus/repositories/VIPEmployeeRepository.test.js`

```javascript
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import VIPEmployeeRepository from '../../../../../src/products/nexus/repositories/VIPEmployeeRepository.js';
import pool from '../../../../../src/config/database.js';

// Mock database
jest.mock('../../../../../src/config/database.js');

describe('VIPEmployeeRepository', () => {
  let repository;
  const testOrgId = 'org-123';
  const testEmployeeId = 'emp-123';

  beforeEach(() => {
    repository = new VIPEmployeeRepository();
    jest.clearAllMocks();
  });

  describe('createVIPEmployee', () => {
    it('should create VIP employee record', async () => {
      // Arrange
      const vipData = {
        employeeId: testEmployeeId,
        vipLevel: 'high',
        reason: 'Executive',
        assignedByDepartment: 'HR',
        notes: 'Test notes'
      };

      const mockResult = {
        rows: [{
          id: 'vip-123',
          ...vipData,
          organizationId: testOrgId,
          createdAt: new Date()
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.createVIPEmployee(
        vipData,
        testOrgId,
        'user-123'
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.employeeId).toBe(testEmployeeId);
      expect(pool.query).toHaveBeenCalled();
      
      // Verify SQL contains required fields
      const sqlCall = pool.query.mock.calls[0][0];
      expect(sqlCall).toContain('INSERT INTO nexus.vip_employees');
      expect(sqlCall).toContain('employee_id');
      expect(sqlCall).toContain('vip_level');
      expect(sqlCall).toContain('organization_id');
    });
  });

  describe('findByEmployeeId', () => {
    it('should find VIP record by employee ID', async () => {
      // Arrange
      const mockResult = {
        rows: [{
          id: 'vip-123',
          employeeId: testEmployeeId,
          vipLevel: 'high',
          isActive: true
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.findByEmployeeId(testEmployeeId, testOrgId);

      // Assert
      expect(result).toBeDefined();
      expect(result.employeeId).toBe(testEmployeeId);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1'),
        expect.arrayContaining([testEmployeeId, testOrgId])
      );
    });

    it('should return null if VIP record not found', async () => {
      // Arrange
      pool.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.findByEmployeeId(testEmployeeId, testOrgId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateCrossProductFlags', () => {
    it('should update is_vip flags in all product tables', async () => {
      // Arrange
      const employeeIds = ['emp-1', 'emp-2'];
      
      pool.query
        .mockResolvedValueOnce({ rowCount: 2 }) // PayLinQ workers
        .mockResolvedValueOnce({ rowCount: 2 }) // ScheduleHub assignments
        .mockResolvedValueOnce({ rowCount: 2 }); // RecruitIQ candidates

      // Act
      const result = await repository.updateCrossProductFlags(
        employeeIds,
        true,
        testOrgId
      );

      // Assert
      expect(result.paylinq).toBe(2);
      expect(result.schedulehub).toBe(2);
      expect(result.recruitiq).toBe(2);
      expect(pool.query).toHaveBeenCalledTimes(3);
    });
  });
});
```

### 3. VIP Controller Tests

**File:** `backend/tests/unit/products/nexus/controllers/vipEmployeeController.test.js`

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  assignVIPStatus,
  updateVIPStatus,
  removeVIPStatus,
  getVIPEmployee,
  listVIPEmployees,
  getVIPSummary,
  syncCrossProductFlags
} from '../../../../../src/products/nexus/controllers/vipEmployeeController.js';
import VIPEmployeeService from '../../../../../src/products/nexus/services/VIPEmployeeService.js';

// Mock service
jest.mock('../../../../../src/products/nexus/services/VIPEmployeeService.js');

describe('VIPEmployeeController', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      query: {},
      user: {
        id: 'user-123',
        organizationId: 'org-123',
        role: 'admin'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('assignVIPStatus', () => {
    it('should assign VIP status and return 201', async () => {
      // Arrange
      mockReq.body = {
        employeeId: 'emp-123',
        vipLevel: 'high',
        reason: 'Executive'
      };

      const mockVIPEmployee = {
        id: 'vip-123',
        employeeId: 'emp-123',
        vipLevel: 'high'
      };

      VIPEmployeeService.prototype.assignVIPStatus.mockResolvedValue(mockVIPEmployee);

      // Act
      await assignVIPStatus(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        vipEmployee: mockVIPEmployee
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors and call next', async () => {
      // Arrange
      const error = new Error('Test error');
      VIPEmployeeService.prototype.assignVIPStatus.mockRejectedValue(error);

      // Act
      await assignVIPStatus(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('listVIPEmployees', () => {
    it('should return paginated list of VIP employees', async () => {
      // Arrange
      mockReq.query = { page: '1', limit: '20' };

      const mockResult = {
        vipEmployees: [
          { id: 'vip-1', employeeId: 'emp-1' },
          { id: 'vip-2', employeeId: 'emp-2' }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      };

      VIPEmployeeService.prototype.listVIPEmployees.mockResolvedValue(mockResult);

      // Act
      await listVIPEmployees(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        vipEmployees: mockResult.vipEmployees,
        pagination: mockResult.pagination
      });
    });
  });

  describe('getVIPSummary', () => {
    it('should return VIP summary statistics', async () => {
      // Arrange
      const mockSummary = {
        totalVIPs: 5,
        byLevel: { critical: 1, high: 2, medium: 2 },
        byDepartment: { 'Executive': 2, 'Finance': 3 }
      };

      VIPEmployeeService.prototype.getVIPSummary.mockResolvedValue(mockSummary);

      // Act
      await getVIPSummary(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        summary: mockSummary
      });
    });
  });
});
```

---

## Integration Tests

### 1. VIP Employee API Tests

**File:** `backend/tests/integration/products/nexus/vip-employee-api.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/app.js';
import pool from '../../../../src/config/database.js';
import { generateTestToken } from '../../../helpers/auth.js';

describe('VIP Employee API - Integration Tests', () => {
  let authToken;
  let organizationId;
  let userId;
  let employeeId;

  beforeAll(async () => {
    // Setup test organization and user
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name)
      VALUES (gen_random_uuid(), 'Test Org')
      RETURNING id
    `);
    organizationId = orgResult.rows[0].id;

    const userResult = await pool.query(`
      INSERT INTO hris.user_account (
        id, email, password_hash, organization_id, role
      )
      VALUES (gen_random_uuid(), 'test@example.com', '$2b$10$dummy', $1, 'admin')
      RETURNING id
    `, [organizationId]);
    userId = userResult.rows[0].id;

    // Create test employee
    const empResult = await pool.query(`
      INSERT INTO nexus.employees (
        id, organization_id, employee_code, full_name,
        email, hire_date, employment_status, created_by
      )
      VALUES (
        gen_random_uuid(), $1, 'EMP001', 'John Doe',
        'john@example.com', CURRENT_DATE, 'active', $2
      )
      RETURNING id
    `, [organizationId, userId]);
    employeeId = empResult.rows[0].id;

    // Generate auth token
    authToken = generateTestToken({
      id: userId,
      organizationId,
      role: 'admin'
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM nexus.vip_employees WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM nexus.employees WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  describe('POST /api/products/nexus/vip-employees', () => {
    it('should assign VIP status to employee', async () => {
      // Act
      const response = await request(app)
        .post('/api/products/nexus/vip-employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId,
          vipLevel: 'high',
          reason: 'Executive team member',
          assignedByDepartment: 'HR',
          notes: 'CEO direct report'
        })
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.vipEmployee).toBeDefined();
      expect(response.body.vipEmployee.employeeId).toBe(employeeId);
      expect(response.body.vipEmployee.vipLevel).toBe('high');

      // Verify in database
      const dbCheck = await pool.query(
        'SELECT * FROM nexus.vip_employees WHERE employee_id = $1 AND organization_id = $2',
        [employeeId, organizationId]
      );
      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].is_active).toBe(true);

      // Verify employee is_vip flag updated
      const empCheck = await pool.query(
        'SELECT is_vip FROM nexus.employees WHERE id = $1',
        [employeeId]
      );
      expect(empCheck.rows[0].is_vip).toBe(true);
    });

    it('should return 400 for invalid VIP level', async () => {
      // Act
      const response = await request(app)
        .post('/api/products/nexus/vip-employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId,
          vipLevel: 'invalid',
          reason: 'Test'
        })
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return 409 if employee already has VIP status', async () => {
      // Arrange - Create VIP record first
      await pool.query(`
        INSERT INTO nexus.vip_employees (
          id, employee_id, organization_id, vip_level,
          reason, assigned_by_department, created_by
        )
        VALUES (gen_random_uuid(), $1, $2, 'medium', 'Test', 'HR', $3)
      `, [employeeId, organizationId, userId]);

      // Act
      const response = await request(app)
        .post('/api/products/nexus/vip-employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId,
          vipLevel: 'high',
          reason: 'Test'
        })
        .expect(409);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('CONFLICT');

      // Cleanup
      await pool.query(
        'DELETE FROM nexus.vip_employees WHERE employee_id = $1',
        [employeeId]
      );
    });

    it('should return 401 without authentication', async () => {
      // Act
      await request(app)
        .post('/api/products/nexus/vip-employees')
        .send({
          employeeId,
          vipLevel: 'high',
          reason: 'Test'
        })
        .expect(401);
    });
  });

  describe('GET /api/products/nexus/vip-employees', () => {
    beforeEach(async () => {
      // Create test VIP employees
      await pool.query(`
        INSERT INTO nexus.vip_employees (
          id, employee_id, organization_id, vip_level,
          reason, assigned_by_department, created_by
        )
        SELECT
          gen_random_uuid(),
          e.id,
          $1,
          CASE WHEN e.employee_code = 'EMP001' THEN 'critical'
               WHEN e.employee_code = 'EMP002' THEN 'high'
               ELSE 'medium' END,
          'Test reason',
          'HR',
          $2
        FROM nexus.employees e
        WHERE e.organization_id = $1
        LIMIT 3
      `, [organizationId, userId]);
    });

    afterEach(async () => {
      await pool.query(
        'DELETE FROM nexus.vip_employees WHERE organization_id = $1',
        [organizationId]
      );
    });

    it('should return list of VIP employees', async () => {
      // Act
      const response = await request(app)
        .get('/api/products/nexus/vip-employees')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.vipEmployees).toBeInstanceOf(Array);
      expect(response.body.vipEmployees.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by VIP level', async () => {
      // Act
      const response = await request(app)
        .get('/api/products/nexus/vip-employees?vipLevel=critical')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.vipEmployees.every(v => v.vipLevel === 'critical')).toBe(true);
    });

    it('should support pagination', async () => {
      // Act
      const response = await request(app)
        .get('/api/products/nexus/vip-employees?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.vipEmployees.length).toBeLessThanOrEqual(2);
    });
  });

  describe('PATCH /api/products/nexus/vip-employees/:employeeId', () => {
    let vipEmployeeId;

    beforeEach(async () => {
      // Create VIP employee
      const result = await pool.query(`
        INSERT INTO nexus.vip_employees (
          id, employee_id, organization_id, vip_level,
          reason, assigned_by_department, created_by
        )
        VALUES (gen_random_uuid(), $1, $2, 'medium', 'Test', 'HR', $3)
        RETURNING id
      `, [employeeId, organizationId, userId]);
      vipEmployeeId = result.rows[0].id;
    });

    afterEach(async () => {
      await pool.query('DELETE FROM nexus.vip_employees WHERE id = $1', [vipEmployeeId]);
    });

    it('should update VIP employee information', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/products/nexus/vip-employees/${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vipLevel: 'critical',
          notes: 'Updated to critical priority'
        })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.vipEmployee.vipLevel).toBe('critical');

      // Verify in database
      const dbCheck = await pool.query(
        'SELECT vip_level FROM nexus.vip_employees WHERE id = $1',
        [vipEmployeeId]
      );
      expect(dbCheck.rows[0].vip_level).toBe('critical');
    });

    it('should return 404 if VIP record not found', async () => {
      // Act
      const response = await request(app)
        .patch('/api/products/nexus/vip-employees/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ vipLevel: 'high' })
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/products/nexus/vip-employees/:employeeId', () => {
    let vipEmployeeId;

    beforeEach(async () => {
      // Create VIP employee
      const result = await pool.query(`
        INSERT INTO nexus.vip_employees (
          id, employee_id, organization_id, vip_level,
          reason, assigned_by_department, created_by
        )
        VALUES (gen_random_uuid(), $1, $2, 'medium', 'Test', 'HR', $3)
        RETURNING id
      `, [employeeId, organizationId, userId]);
      vipEmployeeId = result.rows[0].id;

      // Set employee is_vip flag
      await pool.query(
        'UPDATE nexus.employees SET is_vip = true WHERE id = $1',
        [employeeId]
      );
    });

    it('should remove VIP status from employee', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/products/nexus/vip-employees/${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          removalReason: 'Role changed'
        })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);

      // Verify VIP record is inactive
      const vipCheck = await pool.query(
        'SELECT is_active FROM nexus.vip_employees WHERE id = $1',
        [vipEmployeeId]
      );
      expect(vipCheck.rows[0].is_active).toBe(false);

      // Verify employee is_vip flag cleared
      const empCheck = await pool.query(
        'SELECT is_vip FROM nexus.employees WHERE id = $1',
        [employeeId]
      );
      expect(empCheck.rows[0].is_vip).toBe(false);
    });

    it('should require removalReason', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/products/nexus/vip-employees/${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/products/nexus/vip-employees/summary', () => {
    beforeEach(async () => {
      // Create test VIP employees with different levels
      await pool.query(`
        INSERT INTO nexus.vip_employees (
          id, employee_id, organization_id, vip_level,
          reason, assigned_by_department, created_by
        )
        VALUES
          (gen_random_uuid(), $1, $2, 'critical', 'Test', 'Executive', $3),
          (gen_random_uuid(), $1, $2, 'high', 'Test', 'Finance', $3),
          (gen_random_uuid(), $1, $2, 'high', 'Test', 'Finance', $3),
          (gen_random_uuid(), $1, $2, 'medium', 'Test', 'HR', $3)
      `, [employeeId, organizationId, userId]);
    });

    afterEach(async () => {
      await pool.query(
        'DELETE FROM nexus.vip_employees WHERE organization_id = $1',
        [organizationId]
      );
    });

    it('should return VIP summary statistics', async () => {
      // Act
      const response = await request(app)
        .get('/api/products/nexus/vip-employees/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.totalVIPs).toBeGreaterThan(0);
      expect(response.body.summary.byLevel).toBeDefined();
      expect(response.body.summary.byDepartment).toBeDefined();
    });
  });

  describe('POST /api/products/nexus/vip-employees/sync', () => {
    it('should sync VIP flags across products', async () => {
      // Act
      const response = await request(app)
        .post('/api/products/nexus/vip-employees/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.updated).toBeDefined();
    });
  });
});
```

---

## E2E Tests

### VIP Employee Workflow E2E Test

**File:** `backend/tests/e2e/products/nexus/vip-employee-workflow.e2e.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import pool from '../../../../src/config/database.js';

const API_URL = 'http://localhost:4000';

describe('VIP Employee Workflow - E2E Tests', () => {
  let authCookie;
  let organizationId;
  let userId;
  let employeeId;

  beforeAll(async () => {
    // Setup test data
    // ... (similar to integration tests setup)
  });

  afterAll(async () => {
    // Cleanup
    await pool.end();
  });

  it('should complete full VIP employee lifecycle', async () => {
    // 1. Login
    const loginRes = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#'
      })
      .expect(200);

    authCookie = loginRes.headers['set-cookie'];

    // 2. Assign VIP status
    const assignRes = await request(API_URL)
      .post('/api/products/nexus/vip-employees')
      .set('Cookie', authCookie)
      .send({
        employeeId,
        vipLevel: 'high',
        reason: 'Executive team member',
        assignedByDepartment: 'HR'
      })
      .expect(201);

    expect(assignRes.body.vipEmployee).toBeDefined();
    const vipId = assignRes.body.vipEmployee.id;

    // 3. Verify VIP status appears in employee details
    const empRes = await request(API_URL)
      .get(`/api/products/nexus/employees/${employeeId}`)
      .set('Cookie', authCookie)
      .expect(200);

    expect(empRes.body.employee.isVIP).toBe(true);
    expect(empRes.body.employee.vipLevel).toBe('high');

    // 4. Update VIP status
    await request(API_URL)
      .patch(`/api/products/nexus/vip-employees/${employeeId}`)
      .set('Cookie', authCookie)
      .send({
        vipLevel: 'critical',
        notes: 'Promoted to C-suite'
      })
      .expect(200);

    // 5. Verify update in list
    const listRes = await request(API_URL)
      .get('/api/products/nexus/vip-employees')
      .set('Cookie', authCookie)
      .expect(200);

    const vipEmployee = listRes.body.vipEmployees.find(v => v.id === vipId);
    expect(vipEmployee.vipLevel).toBe('critical');

    // 6. Sync cross-product flags
    await request(API_URL)
      .post('/api/products/nexus/vip-employees/sync')
      .set('Cookie', authCookie)
      .expect(200);

    // 7. Remove VIP status
    await request(API_URL)
      .delete(`/api/products/nexus/vip-employees/${employeeId}`)
      .set('Cookie', authCookie)
      .send({
        removalReason: 'Employee left company'
      })
      .expect(200);

    // 8. Verify VIP status removed from employee
    const finalEmpRes = await request(API_URL)
      .get(`/api/products/nexus/employees/${employeeId}`)
      .set('Cookie', authCookie)
      .expect(200);

    expect(finalEmpRes.body.employee.isVIP).toBe(false);
  });
});
```

---

## Test Data Management

### Test Factory

**File:** `backend/tests/helpers/factories/vipEmployeeFactory.js`

```javascript
import { v4 as uuidv4 } from 'uuid';
import pool from '../../../src/config/database.js';

export class VIPEmployeeFactory {
  /**
   * Create test VIP employee
   */
  static async createVIPEmployee(overrides = {}) {
    const defaultData = {
      id: uuidv4(),
      employeeId: overrides.employeeId || uuidv4(),
      organizationId: overrides.organizationId,
      vipLevel: 'medium',
      reason: 'Test reason',
      assignedByDepartment: 'HR',
      notes: 'Test notes',
      isActive: true,
      createdBy: overrides.createdBy,
      ...overrides
    };

    const result = await pool.query(`
      INSERT INTO nexus.vip_employees (
        id, employee_id, organization_id, vip_level,
        reason, assigned_by_department, notes, is_active, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      defaultData.id,
      defaultData.employeeId,
      defaultData.organizationId,
      defaultData.vipLevel,
      defaultData.reason,
      defaultData.assignedByDepartment,
      defaultData.notes,
      defaultData.isActive,
      defaultData.createdBy
    ]);

    return result.rows[0];
  }

  /**
   * Cleanup test data
   */
  static async cleanup(organizationId) {
    await pool.query(
      'DELETE FROM nexus.vip_employees WHERE organization_id = $1',
      [organizationId]
    );
  }
}
```

---

## Test Execution

### Running Tests

```powershell
# Run all VIP employee tests
cd backend
npm test -- tests/products/nexus --coverage

# Run specific test suites
npm test -- VIPEmployeeService.test.js
npm test -- vip-employee-api.test.js

# Run with watch mode
npm test -- --watch VIPEmployeeService.test.js

# Run E2E tests
npm run test:e2e -- vip-employee-workflow.e2e.test.js

# Generate coverage report
npm test -- --coverage --coverageReporters=html
```

### Coverage Verification

```powershell
# Check coverage meets requirements
npm test -- --coverage --coverageThreshold='{"global":{"lines":80,"branches":80,"functions":80,"statements":80}}'
```

---

## Success Criteria

**All tests MUST:**
- [ ] Pass consistently (no flaky tests)
- [ ] Meet minimum coverage requirements (80% overall, 90% services)
- [ ] Complete within reasonable time (< 30 seconds for unit tests)
- [ ] Be independent (no test order dependencies)
- [ ] Clean up test data properly
- [ ] Follow testing standards from TESTING_STANDARDS.md
- [ ] Include meaningful assertions
- [ ] Test error conditions and edge cases

---

**Next Part:** [Part 8 - Deployment & Rollout Strategy](./Part8-Deployment-Rollout.md)
