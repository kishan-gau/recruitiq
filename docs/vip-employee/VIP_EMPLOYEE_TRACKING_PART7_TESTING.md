# VIP Employee Tracking - Part 7: Testing Strategy

**Part of:** [VIP Employee Tracking Implementation Plan](./VIP_EMPLOYEE_TRACKING_IMPLEMENTATION_PLAN.md)  
**Version:** 1.0  
**Last Updated:** November 21, 2025

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [E2E Tests](#e2e-tests)
5. [Security Tests](#security-tests)
6. [Performance Tests](#performance-tests)
7. [Test Data Management](#test-data-management)

---

## Testing Overview

### Testing Pyramid

```
        /\
       /E2E\        ← 5 critical user journey tests
      /______\
     /        \
    /Integration\   ← 15 API endpoint tests
   /____________\
  /              \
 /   Unit Tests   \  ← 50+ service/repository tests
/__________________\
```

### Coverage Requirements

| Layer | Minimum Coverage | Target Coverage |
|-------|-----------------|-----------------|
| Services | 90% | 95% |
| Repositories | 85% | 90% |
| Controllers | 75% | 85% |
| Overall | 80% | 90% |

---

## Unit Tests

### VipStatusService Tests

**File:** `backend/tests/unit/products/nexus/services/VipStatusService.test.js`

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import VipStatusService from '../../../../../src/products/nexus/services/VipStatusService.js';
import VipStatusRepository from '../../../../../src/products/nexus/repositories/VipStatusRepository.js';
import { ValidationError, NotFoundError } from '../../../../../src/utils/errors.js';

describe('VipStatusService', () => {
  let service;
  let mockRepository;
  const organizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const userId = 'user-123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findByEmployeeId: jest.fn()
    };
    service = new VipStatusService(mockRepository);
  });

  describe('assignVipStatus', () => {
    const validData = {
      employeeId: 'emp-123',
      vipLevel: 'executive',
      reason: 'Board member',
      effectiveDate: '2025-11-21',
      expiryDate: '2026-11-21',
      securityLevel: 'high'
    };

    it('should assign VIP status successfully', async () => {
      const mockVipStatus = {
        id: 'vip-123',
        ...validData,
        organizationId,
        createdBy: userId
      };

      mockRepository.create.mockResolvedValue(mockVipStatus);

      const result = await service.assignVipStatus(validData, organizationId, userId);

      expect(result).toEqual(mockVipStatus);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: validData.employeeId,
          vipLevel: validData.vipLevel,
          organizationId,
          createdBy: userId
        })
      );
    });

    it('should reject invalid VIP level', async () => {
      const invalidData = { ...validData, vipLevel: 'invalid' };

      await expect(
        service.assignVipStatus(invalidData, organizationId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should require reason for VIP assignment', async () => {
      const dataWithoutReason = { ...validData, reason: '' };

      await expect(
        service.assignVipStatus(dataWithoutReason, organizationId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate security level', async () => {
      const invalidSecurity = { ...validData, securityLevel: 'invalid' };

      await expect(
        service.assignVipStatus(invalidSecurity, organizationId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate date range', async () => {
      const invalidDates = {
        ...validData,
        effectiveDate: '2025-11-21',
        expiryDate: '2025-11-20' // Before effective date
      };

      await expect(
        service.assignVipStatus(invalidDates, organizationId, userId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getVipStatusByEmployee', () => {
    it('should return active VIP status', async () => {
      const mockStatus = {
        id: 'vip-123',
        employeeId: 'emp-123',
        vipLevel: 'executive',
        isActive: true
      };

      mockRepository.findByEmployeeId.mockResolvedValue(mockStatus);

      const result = await service.getVipStatusByEmployee('emp-123', organizationId);

      expect(result).toEqual(mockStatus);
      expect(mockRepository.findByEmployeeId).toHaveBeenCalledWith('emp-123', organizationId);
    });

    it('should return null for non-VIP employee', async () => {
      mockRepository.findByEmployeeId.mockResolvedValue(null);

      const result = await service.getVipStatusByEmployee('emp-123', organizationId);

      expect(result).toBeNull();
    });
  });

  describe('updateVipStatus', () => {
    it('should update VIP status successfully', async () => {
      const existingStatus = {
        id: 'vip-123',
        employeeId: 'emp-123',
        vipLevel: 'executive'
      };

      const updateData = {
        vipLevel: 'c-level',
        securityLevel: 'critical'
      };

      mockRepository.findById.mockResolvedValue(existingStatus);
      mockRepository.update.mockResolvedValue({
        ...existingStatus,
        ...updateData
      });

      const result = await service.updateVipStatus('vip-123', updateData, organizationId, userId);

      expect(result.vipLevel).toBe('c-level');
      expect(mockRepository.update).toHaveBeenCalledWith(
        'vip-123',
        expect.objectContaining({
          vipLevel: 'c-level',
          securityLevel: 'critical',
          updatedBy: userId
        }),
        organizationId
      );
    });

    it('should throw NotFoundError for non-existent status', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateVipStatus('vip-123', {}, organizationId, userId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deactivateVipStatus', () => {
    it('should deactivate VIP status', async () => {
      const existingStatus = {
        id: 'vip-123',
        isActive: true
      };

      mockRepository.findById.mockResolvedValue(existingStatus);
      mockRepository.update.mockResolvedValue({
        ...existingStatus,
        isActive: false,
        deactivatedAt: new Date()
      });

      const result = await service.deactivateVipStatus('vip-123', organizationId, userId);

      expect(result.isActive).toBe(false);
      expect(mockRepository.update).toHaveBeenCalledWith(
        'vip-123',
        expect.objectContaining({
          isActive: false,
          deactivatedAt: expect.any(Date),
          deactivatedBy: userId
        }),
        organizationId
      );
    });
  });
});
```

### AccessLogService Tests

**File:** `backend/tests/unit/products/nexus/services/AccessLogService.test.js`

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import AccessLogService from '../../../../../src/products/nexus/services/AccessLogService.js';
import AccessLogRepository from '../../../../../src/products/nexus/repositories/AccessLogRepository.js';

describe('AccessLogService', () => {
  let service;
  let mockRepository;
  const organizationId = 'org-123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByEmployee: jest.fn(),
      findByDateRange: jest.fn(),
      findSuspiciousActivity: jest.fn()
    };
    service = new AccessLogService(mockRepository);
  });

  describe('logAccess', () => {
    const validData = {
      employeeId: 'emp-123',
      resourceType: 'document',
      resourceId: 'doc-123',
      action: 'view',
      accessedBy: 'user-456',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...'
    };

    it('should log access successfully', async () => {
      const mockLog = {
        id: 'log-123',
        ...validData,
        timestamp: new Date()
      };

      mockRepository.create.mockResolvedValue(mockLog);

      const result = await service.logAccess(validData, organizationId);

      expect(result).toEqual(mockLog);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: validData.employeeId,
          resourceType: validData.resourceType,
          action: validData.action
        })
      );
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validData, employeeId: '' };

      await expect(
        service.logAccess(invalidData, organizationId)
      ).rejects.toThrow();
    });

    it('should validate action type', async () => {
      const invalidAction = { ...validData, action: 'invalid-action' };

      await expect(
        service.logAccess(invalidAction, organizationId)
      ).rejects.toThrow();
    });
  });

  describe('getAccessHistory', () => {
    it('should return paginated access history', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'view', timestamp: new Date() },
        { id: 'log-2', action: 'edit', timestamp: new Date() }
      ];

      mockRepository.findByEmployee.mockResolvedValue({
        logs: mockLogs,
        total: 2
      });

      const result = await service.getAccessHistory('emp-123', organizationId, {
        page: 1,
        limit: 20
      });

      expect(result.logs).toHaveLength(2);
      expect(result.pagination).toBeDefined();
    });
  });

  describe('getSuspiciousActivity', () => {
    it('should detect multiple failed access attempts', async () => {
      const suspiciousLogs = [
        { id: 'log-1', action: 'view', success: false },
        { id: 'log-2', action: 'view', success: false },
        { id: 'log-3', action: 'view', success: false }
      ];

      mockRepository.findSuspiciousActivity.mockResolvedValue(suspiciousLogs);

      const result = await service.getSuspiciousActivity(organizationId, {
        threshold: 3,
        timeWindow: 3600
      });

      expect(result).toHaveLength(3);
    });
  });
});
```

---

## Integration Tests

### VIP Status API Tests

**File:** `backend/tests/integration/products/nexus/vip-status-api.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
import { generateTestToken } from '../../../helpers/auth.js';

describe('VIP Status API - Integration Tests', () => {
  let authToken;
  let organizationId;
  let userId;
  let employeeId;
  let vipStatusId;

  beforeAll(async () => {
    // Create test organization
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name)
      VALUES (gen_random_uuid(), 'Test Org VIP')
      RETURNING id
    `);
    organizationId = orgResult.rows[0].id;

    // Create test user
    const userResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, organization_id)
      VALUES (gen_random_uuid(), 'vip-test@example.com', '$2b$10$dummyhash', $1)
      RETURNING id
    `, [organizationId]);
    userId = userResult.rows[0].id;

    // Create test employee
    const empResult = await pool.query(`
      INSERT INTO nexus.employees (id, organization_id, first_name, last_name, email)
      VALUES (gen_random_uuid(), $1, 'John', 'Executive', 'john.exec@example.com')
      RETURNING id
    `, [organizationId]);
    employeeId = empResult.rows[0].id;

    authToken = generateTestToken({ id: userId, organizationId, role: 'admin' });
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM nexus.vip_status WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM nexus.employees WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  describe('POST /api/products/nexus/vip-status', () => {
    it('should assign VIP status to employee', async () => {
      const vipData = {
        employeeId: employeeId,
        vipLevel: 'executive',
        reason: 'Board member',
        effectiveDate: '2025-11-21',
        expiryDate: '2026-11-21',
        securityLevel: 'high',
        notes: 'Requires enhanced security'
      };

      const response = await request(app)
        .post('/api/products/nexus/vip-status')
        .set('Authorization', `Bearer ${authToken}`)
        .send(vipData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.vipStatus).toBeDefined();
      expect(response.body.vipStatus.employeeId).toBe(employeeId);
      expect(response.body.vipStatus.vipLevel).toBe('executive');

      vipStatusId = response.body.vipStatus.id;
    });

    it('should reject invalid VIP level', async () => {
      const invalidData = {
        employeeId: employeeId,
        vipLevel: 'invalid-level',
        reason: 'Test',
        effectiveDate: '2025-11-21'
      };

      const response = await request(app)
        .post('/api/products/nexus/vip-status')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/products/nexus/vip-status')
        .send({ employeeId: employeeId })
        .expect(401);
    });
  });

  describe('GET /api/products/nexus/vip-status/employee/:employeeId', () => {
    it('should get VIP status by employee', async () => {
      const response = await request(app)
        .get(`/api/products/nexus/vip-status/employee/${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.vipStatus).toBeDefined();
      expect(response.body.vipStatus.employeeId).toBe(employeeId);
    });

    it('should return 404 for non-VIP employee', async () => {
      const nonVipEmployee = await pool.query(`
        INSERT INTO nexus.employees (id, organization_id, first_name, last_name, email)
        VALUES (gen_random_uuid(), $1, 'Jane', 'Regular', 'jane@example.com')
        RETURNING id
      `, [organizationId]);

      await request(app)
        .get(`/api/products/nexus/vip-status/employee/${nonVipEmployee.rows[0].id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/products/nexus/vip-status/:id', () => {
    it('should update VIP status', async () => {
      const updateData = {
        vipLevel: 'c-level',
        securityLevel: 'critical',
        notes: 'Promoted to C-level'
      };

      const response = await request(app)
        .patch(`/api/products/nexus/vip-status/${vipStatusId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.vipStatus.vipLevel).toBe('c-level');
      expect(response.body.vipStatus.securityLevel).toBe('critical');
    });
  });

  describe('DELETE /api/products/nexus/vip-status/:id', () => {
    it('should deactivate VIP status', async () => {
      const response = await request(app)
        .delete(`/api/products/nexus/vip-status/${vipStatusId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deactivation
      const checkResponse = await request(app)
        .get(`/api/products/nexus/vip-status/${vipStatusId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(checkResponse.body.vipStatus.isActive).toBe(false);
    });
  });
});
```

### Access Logging API Tests

**File:** `backend/tests/integration/products/nexus/access-logging-api.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
import { generateTestToken } from '../../../helpers/auth.js';

describe('Access Logging API - Integration Tests', () => {
  let authToken;
  let organizationId;
  let userId;
  let employeeId;

  beforeAll(async () => {
    // Setup test data
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name)
      VALUES (gen_random_uuid(), 'Test Org Access')
      RETURNING id
    `);
    organizationId = orgResult.rows[0].id;

    const userResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, organization_id)
      VALUES (gen_random_uuid(), 'access-test@example.com', '$2b$10$dummyhash', $1)
      RETURNING id
    `, [organizationId]);
    userId = userResult.rows[0].id;

    const empResult = await pool.query(`
      INSERT INTO nexus.employees (id, organization_id, first_name, last_name, email)
      VALUES (gen_random_uuid(), $1, 'VIP', 'Employee', 'vip@example.com')
      RETURNING id
    `, [organizationId]);
    employeeId = empResult.rows[0].id;

    authToken = generateTestToken({ id: userId, organizationId, role: 'admin' });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM nexus.vip_access_logs WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM nexus.employees WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  describe('GET /api/products/nexus/access-logs/employee/:employeeId', () => {
    beforeAll(async () => {
      // Create test access logs
      await pool.query(`
        INSERT INTO nexus.vip_access_logs (
          id, organization_id, employee_id, resource_type, resource_id,
          action, accessed_by, ip_address
        )
        VALUES 
          (gen_random_uuid(), $1, $2, 'document', 'doc-1', 'view', $3, '192.168.1.1'),
          (gen_random_uuid(), $1, $2, 'profile', 'prof-1', 'edit', $3, '192.168.1.1'),
          (gen_random_uuid(), $1, $2, 'document', 'doc-2', 'download', $3, '192.168.1.2')
      `, [organizationId, employeeId, userId]);
    });

    it('should return access history for employee', async () => {
      const response = await request(app)
        .get(`/api/products/nexus/access-logs/employee/${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.logs).toBeDefined();
      expect(response.body.logs.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by resource type', async () => {
      const response = await request(app)
        .get(`/api/products/nexus/access-logs/employee/${employeeId}`)
        .query({ resourceType: 'document' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.logs.every(log => log.resourceType === 'document')).toBe(true);
    });

    it('should filter by date range', async () => {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 7);
      const toDate = new Date();

      const response = await request(app)
        .get(`/api/products/nexus/access-logs/employee/${employeeId}`)
        .query({
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
```

---

## E2E Tests

### VIP Employee Management E2E

**File:** `backend/tests/e2e/vip-employee-management.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

const API_URL = 'http://localhost:4000';

describe('VIP Employee Management - E2E', () => {
  let cookies = {};
  let organizationId;
  let employeeId;
  let vipStatusId;

  const adminUser = {
    email: 'admin@vip-e2e.com',
    password: 'Admin123!@#'
  };

  beforeAll(async () => {
    // Login as admin
    const loginResponse = await request(API_URL)
      .post('/api/auth/login')
      .send(adminUser)
      .expect(200);

    cookies.auth = loginResponse.headers['set-cookie'];
    organizationId = loginResponse.body.user.organizationId;
  });

  describe('Complete VIP Assignment Flow', () => {
    it('should create employee and assign VIP status', async () => {
      // Step 1: Create employee
      const employeeData = {
        firstName: 'CEO',
        lastName: 'VIP',
        email: 'ceo.vip@company.com',
        employeeNumber: 'VIP001',
        departmentId: 'dept-123',
        positionId: 'pos-456'
      };

      const createEmpResponse = await request(API_URL)
        .post('/api/products/nexus/employees')
        .set('Cookie', cookies.auth)
        .send(employeeData)
        .expect(201);

      expect(createEmpResponse.body.success).toBe(true);
      employeeId = createEmpResponse.body.employee.id;

      // Step 2: Assign VIP status
      const vipData = {
        employeeId: employeeId,
        vipLevel: 'c-level',
        reason: 'Chief Executive Officer',
        effectiveDate: new Date().toISOString(),
        securityLevel: 'critical',
        notes: 'Full access required'
      };

      const vipResponse = await request(API_URL)
        .post('/api/products/nexus/vip-status')
        .set('Cookie', cookies.auth)
        .send(vipData)
        .expect(201);

      expect(vipResponse.body.success).toBe(true);
      expect(vipResponse.body.vipStatus.vipLevel).toBe('c-level');
      vipStatusId = vipResponse.body.vipStatus.id;

      // Step 3: Verify employee has VIP badge
      const empDetailsResponse = await request(API_URL)
        .get(`/api/products/nexus/employees/${employeeId}`)
        .set('Cookie', cookies.auth)
        .expect(200);

      expect(empDetailsResponse.body.employee.isVip).toBe(true);
      expect(empDetailsResponse.body.employee.vipLevel).toBe('c-level');
    });

    it('should log access when viewing VIP employee', async () => {
      // View VIP employee profile
      await request(API_URL)
        .get(`/api/products/nexus/employees/${employeeId}`)
        .set('Cookie', cookies.auth)
        .expect(200);

      // Wait for async logging
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify access was logged
      const logsResponse = await request(API_URL)
        .get(`/api/products/nexus/access-logs/employee/${employeeId}`)
        .set('Cookie', cookies.auth)
        .expect(200);

      expect(logsResponse.body.logs.length).toBeGreaterThan(0);
      expect(logsResponse.body.logs[0].action).toBe('view');
      expect(logsResponse.body.logs[0].resourceType).toBe('profile');
    });

    it('should update VIP status and verify changes', async () => {
      // Update VIP level
      const updateData = {
        vipLevel: 'board-member',
        notes: 'Added to board of directors'
      };

      const updateResponse = await request(API_URL)
        .patch(`/api/products/nexus/vip-status/${vipStatusId}`)
        .set('Cookie', cookies.auth)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.vipStatus.vipLevel).toBe('board-member');

      // Verify access log for update
      const logsResponse = await request(API_URL)
        .get(`/api/products/nexus/access-logs/employee/${employeeId}`)
        .set('Cookie', cookies.auth)
        .expect(200);

      const updateLog = logsResponse.body.logs.find(log => log.action === 'update');
      expect(updateLog).toBeDefined();
    });

    it('should deactivate VIP status', async () => {
      // Deactivate VIP status
      await request(API_URL)
        .delete(`/api/products/nexus/vip-status/${vipStatusId}`)
        .set('Cookie', cookies.auth)
        .expect(200);

      // Verify employee no longer has VIP badge
      const empDetailsResponse = await request(API_URL)
        .get(`/api/products/nexus/employees/${employeeId}`)
        .set('Cookie', cookies.auth)
        .expect(200);

      expect(empDetailsResponse.body.employee.isVip).toBe(false);
    });
  });
});
```

---

## Security Tests

### Access Control Tests

**File:** `backend/tests/security/vip-access-control.test.js`

```javascript
import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import { generateTestToken } from '../helpers/auth.js';

describe('VIP Feature - Access Control Tests', () => {
  let adminToken, managerToken, employeeToken;
  let organizationId = 'org-test-123';

  beforeAll(() => {
    adminToken = generateTestToken({
      id: 'user-admin',
      organizationId,
      role: 'admin'
    });

    managerToken = generateTestToken({
      id: 'user-manager',
      organizationId,
      role: 'manager'
    });

    employeeToken = generateTestToken({
      id: 'user-employee',
      organizationId,
      role: 'employee'
    });
  });

  describe('VIP Status Assignment - Role-Based Access', () => {
    it('should allow admin to assign VIP status', async () => {
      const response = await request(app)
        .post('/api/products/nexus/vip-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: 'emp-123',
          vipLevel: 'executive',
          reason: 'Test'
        });

      expect(response.status).not.toBe(403);
    });

    it('should deny manager from assigning VIP status', async () => {
      const response = await request(app)
        .post('/api/products/nexus/vip-status')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          employeeId: 'emp-123',
          vipLevel: 'executive',
          reason: 'Test'
        })
        .expect(403);

      expect(response.body.errorCode).toBe('FORBIDDEN');
    });

    it('should deny employee from assigning VIP status', async () => {
      await request(app)
        .post('/api/products/nexus/vip-status')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          employeeId: 'emp-123',
          vipLevel: 'executive',
          reason: 'Test'
        })
        .expect(403);
    });
  });

  describe('Cross-Organization Access Prevention', () => {
    it('should prevent access to VIP data from other organization', async () => {
      const otherOrgToken = generateTestToken({
        id: 'user-other',
        organizationId: 'org-other-456',
        role: 'admin'
      });

      const response = await request(app)
        .get('/api/products/nexus/vip-status/employee/emp-123')
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .expect(403);

      expect(response.body.errorCode).toBe('FORBIDDEN');
    });
  });
});
```

---

## Performance Tests

### Load Testing

**File:** `backend/tests/performance/vip-load.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';

describe('VIP Feature - Performance Tests', () => {
  const token = 'test-token'; // Use valid test token

  it('should handle 100 concurrent access log requests', async () => {
    const startTime = Date.now();
    const requests = [];

    for (let i = 0; i < 100; i++) {
      requests.push(
        request(app)
          .post('/api/products/nexus/access-logs')
          .set('Authorization', `Bearer ${token}`)
          .send({
            employeeId: `emp-${i}`,
            resourceType: 'document',
            resourceId: `doc-${i}`,
            action: 'view',
            accessedBy: 'user-test',
            ipAddress: '192.168.1.1'
          })
      );
    }

    await Promise.all(requests);
    const duration = Date.now() - startTime;

    // Should complete within 5 seconds
    expect(duration).toBeLessThan(5000);
  });

  it('should paginate large access logs efficiently', async () => {
    const startTime = Date.now();

    const response = await request(app)
      .get('/api/products/nexus/access-logs/employee/emp-test')
      .query({ page: 1, limit: 100 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const duration = Date.now() - startTime;

    // Should respond within 500ms
    expect(duration).toBeLessThan(500);
    expect(response.body.logs).toBeDefined();
  });
});
```

---

## Test Data Management

### Test Factories

**File:** `backend/tests/factories/vipStatusFactory.js`

```javascript
import { v4 as uuidv4 } from 'uuid';

export class VipStatusFactory {
  static createVipStatus(overrides = {}) {
    return {
      id: uuidv4(),
      employeeId: overrides.employeeId || uuidv4(),
      organizationId: overrides.organizationId || uuidv4(),
      vipLevel: overrides.vipLevel || 'executive',
      reason: overrides.reason || 'Test VIP assignment',
      effectiveDate: overrides.effectiveDate || new Date(),
      expiryDate: overrides.expiryDate || null,
      securityLevel: overrides.securityLevel || 'high',
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      notes: overrides.notes || null,
      createdBy: overrides.createdBy || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createAccessLog(overrides = {}) {
    return {
      id: uuidv4(),
      employeeId: overrides.employeeId || uuidv4(),
      organizationId: overrides.organizationId || uuidv4(),
      resourceType: overrides.resourceType || 'document',
      resourceId: overrides.resourceId || uuidv4(),
      action: overrides.action || 'view',
      accessedBy: overrides.accessedBy || uuidv4(),
      ipAddress: overrides.ipAddress || '192.168.1.1',
      userAgent: overrides.userAgent || 'Mozilla/5.0',
      timestamp: new Date(),
      ...overrides
    };
  }
}
```

### Test Data Cleanup

**File:** `backend/tests/helpers/vipTestCleanup.js`

```javascript
import pool from '../../src/config/database.js';

export async function cleanupVipTestData(organizationId) {
  await pool.query(
    'DELETE FROM nexus.vip_access_logs WHERE organization_id = $1',
    [organizationId]
  );
  
  await pool.query(
    'DELETE FROM nexus.vip_status WHERE organization_id = $1',
    [organizationId]
  );
}

export async function setupVipTestData(organizationId, employeeId, userId) {
  const vipResult = await pool.query(`
    INSERT INTO nexus.vip_status (
      id, organization_id, employee_id, vip_level,
      reason, effective_date, security_level, created_by
    )
    VALUES (gen_random_uuid(), $1, $2, 'executive', 'Test', NOW(), 'high', $3)
    RETURNING *
  `, [organizationId, employeeId, userId]);

  return vipResult.rows[0];
}
```

---

## Test Execution Commands

```bash
# Run all VIP feature tests
npm test -- --testPathPattern=vip

# Run unit tests only
npm test -- tests/unit/products/nexus/services/VipStatusService.test.js

# Run integration tests
npm test -- tests/integration/products/nexus/vip-status-api.test.js

# Run E2E tests
npm run test:e2e -- tests/e2e/vip-employee-management.test.js

# Run security tests
npm test -- tests/security/vip-access-control.test.js

# Run with coverage
npm test -- --coverage --testPathPattern=vip
```

---

**Next:** [Part 8 - Implementation Checklist](./VIP_EMPLOYEE_TRACKING_PART8_CHECKLIST.md)
