/**
 * Worker Type API Integration Tests
 * 
 * Tests the complete HTTP request/response cycle for worker type endpoints:
 * - Template CRUD operations
 * - Employee assignments
 * - Tenant isolation
 * - Authentication/authorization
 * - Database state verification
 * - Resource-specific response keys (NOT generic "data")
 * 
 * Reference: docs/API_STANDARDS.md, docs/TESTING_STANDARDS.md
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { createTestEmployee, cleanupTestEmployees } from '../helpers/employeeTestHelper.js';

describe('Worker Type API Integration Tests', () => {
  let agent;
  let csrfToken;
  let organizationId;
  let userId;
  let testTemplateId;
  let testEmployeeId;
  
  // Second organization for tenant isolation tests
  let agent2;
  let csrfToken2;
  let org2Id;
  let user2Id;

  beforeAll(async () => {
    // Create test organization 1
    const timestamp = Date.now();
    const orgSlug = `worker-type-test-${timestamp}`;
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, slug, tier, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      ['Worker Type Test Org', orgSlug, 'professional']
    );
    organizationId = orgResult.rows[0].id;

    // Create test user 1 with all required fields
    const testEmail = `admin-${timestamp}@workertype.com`;
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    const userResult = await pool.query(
      `INSERT INTO hris.user_account (
        organization_id, email, password_hash, 
        enabled_products, is_active, email_verified, account_status, created_at
      ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, NOW())
      RETURNING id`,
      [
        organizationId,
        testEmail,
        hashedPassword,
        JSON.stringify(['paylinq']),
        true,
        true,
        'active'
      ]
    );
    userId = userResult.rows[0].id;

    // Create authenticated agent 1 with cookie-based auth
    agent = request.agent(app);
    
    // Get CSRF token
    const csrfResponse = await agent.get('/api/csrf-token');
    csrfToken = csrfResponse.body.csrfToken;
    
    // Login to get session cookies
    const loginResponse = await agent
      .post('/api/auth/tenant/login')
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: testEmail,
        password: 'TestPassword123!'
      });
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
    }

    // Create test organization 2 (for tenant isolation tests)
    const org2Slug = `worker-type-test-2-${timestamp}`;
    const org2Result = await pool.query(
      `INSERT INTO organizations (name, slug, tier, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      ['Worker Type Test Org 2', org2Slug, 'professional']
    );
    org2Id = org2Result.rows[0].id;

    const testEmail2 = `admin2-${timestamp}@workertype.com`;
    const user2Result = await pool.query(
      `INSERT INTO hris.user_account (
        organization_id, email, password_hash, 
        enabled_products, is_active, email_verified, account_status, created_at
      ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, NOW())
      RETURNING id`,
      [
        org2Id,
        testEmail2,
        hashedPassword,
        JSON.stringify(['paylinq']),
        true,
        true,
        'active'
      ]
    );
    user2Id = user2Result.rows[0].id;

    // Create authenticated agent 2
    agent2 = request.agent(app);
    
    const csrf2Response = await agent2.get('/api/csrf-token');
    csrfToken2 = csrf2Response.body.csrfToken;
    
    const login2Response = await agent2
      .post('/api/auth/tenant/login')
      .set('X-CSRF-Token', csrfToken2)
      .send({
        email: testEmail2,
        password: 'TestPassword123!'
      });
    
    if (login2Response.status !== 200) {
      throw new Error(`Login 2 failed: ${JSON.stringify(login2Response.body)}`);
    }
  });

  afterAll(async () => {
    // Cleanup test data in correct order (children first)
    await cleanupTestEmployees(organizationId);
    await cleanupTestEmployees(org2Id);
    
    await pool.query('DELETE FROM payroll.worker_type WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM payroll.worker_type_template WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    
    await pool.query('DELETE FROM payroll.worker_type WHERE organization_id = $1', [org2Id]);
    await pool.query('DELETE FROM payroll.worker_type_template WHERE organization_id = $1', [org2Id]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [org2Id]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [org2Id]);
    
    await pool.end();
  });

  // ==================== TEMPLATE CRUD OPERATIONS ====================

  describe('POST /api/products/paylinq/worker-types - Create Template', () => {
    it('should create worker type template with valid data', async () => {
      const templateData = {
        name: 'Full-Time Employee',
        code: 'FT-EMP',
        description: 'Standard full-time employee',
        defaultPayFrequency: 'bi-weekly',
        defaultPaymentMethod: 'ach',
        benefitsEligible: true,
        overtimeEligible: true,
        ptoEligible: true,
        sickLeaveEligible: true,
        vacationAccrualRate: 0.05
      };

      const response = await agent
        .post('/api/products/paylinq/worker-types')
        .set('X-CSRF-Token', csrfToken)
        .send(templateData)
        .expect(201);

      // Assert: Resource-specific key (NOT generic "data")
      expect(response.body.success).toBe(true);
      expect(response.body.workerTypeTemplate).toBeDefined();
      expect(response.body).not.toHaveProperty('data');

      const { workerTypeTemplate } = response.body;
      expect(workerTypeTemplate.id).toBeDefined();
      expect(workerTypeTemplate.name).toBe('Full-Time Employee');
      expect(workerTypeTemplate.code).toBe('FT-EMP');
      expect(workerTypeTemplate.defaultPayFrequency).toBe('bi-weekly'); // camelCase
      expect(workerTypeTemplate.benefitsEligible).toBe(true); // camelCase
      
      // ❌ Should NOT have snake_case fields
      expect(workerTypeTemplate.default_pay_frequency).toBeUndefined();
      expect(workerTypeTemplate.benefits_eligible).toBeUndefined();

      testTemplateId = workerTypeTemplate.id;
    });

    it('should verify template is stored in database', async () => {
      const result = await pool.query(
        `SELECT * FROM payroll.worker_type_template 
         WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
        [testTemplateId, organizationId]
      );

      expect(result.rows.length).toBe(1);
      const dbTemplate = result.rows[0];
      
      expect(dbTemplate.name).toBe('Full-Time Employee');
      expect(dbTemplate.code).toBe('FT-EMP');
      expect(dbTemplate.default_pay_frequency).toBe('bi-weekly'); // snake_case in DB
      expect(dbTemplate.benefits_eligible).toBe(true); // snake_case in DB
      expect(dbTemplate.organization_id).toBe(organizationId);
      expect(dbTemplate.created_by).toBe(userId);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        name: 'X', // Too short
        code: 'INVALID'
      };

      const response = await agent
        .post('/api/products/paylinq/worker-types')
        .set('X-CSRF-Token', csrfToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for duplicate code', async () => {
      const duplicateData = {
        name: 'Duplicate Test',
        code: 'FT-EMP', // Already exists
        description: 'Duplicate code test',
        defaultPayFrequency: 'monthly',
        defaultPaymentMethod: 'check'
      };

      const response = await agent
        .post('/api/products/paylinq/worker-types')
        .set('X-CSRF-Token', csrfToken)
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('CONFLICT');
    });

    it('should return 401 without authentication', async () => {
      const templateData = {
        name: 'Unauthorized Test',
        code: 'UNAUTH',
        defaultPayFrequency: 'monthly',
        defaultPaymentMethod: 'cash'
      };

      // Create fresh request without agent (no cookies)
      await request(app)
        .post('/api/products/paylinq/worker-types')
        .send(templateData)
        .expect(401);
    });
  });

  describe('GET /api/products/paylinq/worker-types - List Templates', () => {
    beforeAll(async () => {
      // Create additional templates for listing tests
      await agent
        .post('/api/products/paylinq/worker-types')
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Part-Time Employee',
          code: 'PT-EMP',
          defaultPayFrequency: 'weekly',
          defaultPaymentMethod: 'check',
          benefitsEligible: false
        });

      await agent
        .post('/api/products/paylinq/worker-types')
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Contractor',
          code: 'CONTRACT',
          defaultPayFrequency: 'monthly',
          defaultPaymentMethod: 'ach',
          benefitsEligible: false,
          overtimeEligible: false
        });
    });

    it('should return list of worker type templates', async () => {
      const response = await agent
        .get('/api/products/paylinq/worker-types')
        .expect(200);

      // Assert: Resource-specific plural key
      expect(response.body.success).toBe(true);
      expect(response.body.workerTypeTemplates).toBeDefined();
      expect(Array.isArray(response.body.workerTypeTemplates)).toBe(true);
      expect(response.body.workerTypeTemplates.length).toBeGreaterThanOrEqual(3);
      expect(response.body).not.toHaveProperty('data');

      // Verify camelCase formatting
      const template = response.body.workerTypeTemplates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('code');
      expect(template).toHaveProperty('defaultPayFrequency'); // camelCase
      expect(template).not.toHaveProperty('default_pay_frequency'); // No snake_case
    });

    it('should filter templates by benefitsEligible', async () => {
      const response = await agent
        .get('/api/products/paylinq/worker-types?benefitsEligible=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workerTypeTemplates).toBeDefined();
      
      // All returned templates should have benefitsEligible = true
      response.body.workerTypeTemplates.forEach(template => {
        expect(template.benefitsEligible).toBe(true);
      });
    });

    it('should only return templates for authenticated organization', async () => {
      const response = await agent
        .get('/api/products/paylinq/worker-types')
        .expect(200);

      // Verify in database that all templates belong to org1
      const templateIds = response.body.workerTypeTemplates.map(t => t.id);
      
      const dbResult = await pool.query(
        `SELECT DISTINCT organization_id FROM payroll.worker_type_template WHERE id = ANY($1)`,
        [templateIds]
      );

      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].organization_id).toBe(organizationId);
    });
  });

  describe('GET /api/products/paylinq/worker-types/:id - Get Template by ID', () => {
    it('should return worker type template by ID', async () => {
      const response = await agent
        .get(`/api/products/paylinq/worker-types/${testTemplateId}`)
        .expect(200);

      // Assert: Resource-specific key
      expect(response.body.success).toBe(true);
      expect(response.body.workerTypeTemplate).toBeDefined();
      expect(response.body).not.toHaveProperty('data');

      const { workerTypeTemplate } = response.body;
      expect(workerTypeTemplate.id).toBe(testTemplateId);
      expect(workerTypeTemplate.name).toBe('Full-Time Employee');
      expect(workerTypeTemplate.code).toBe('FT-EMP');
      expect(workerTypeTemplate.defaultPayFrequency).toBe('bi-weekly');
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = uuidv4();

      const response = await agent
        .get(`/api/products/paylinq/worker-types/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('NOT_FOUND');
    });

    it('should return 403 for cross-organization access', async () => {
      // Org2 user tries to access Org1's template
      const response = await agent2
        .get(`/api/products/paylinq/worker-types/${testTemplateId}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('PUT /api/products/paylinq/worker-types/:id - Update Template', () => {
    it('should update worker type template', async () => {
      const updateData = {
        name: 'Full-Time Employee Updated',
        description: 'Updated description',
        benefitsEligible: true,
        vacationAccrualRate: 0.08
      };

      const response = await agent
        .put(`/api/products/paylinq/worker-types/${testTemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(updateData)
        .expect(200);

      // Assert: Resource-specific key
      expect(response.body.success).toBe(true);
      expect(response.body.workerTypeTemplate).toBeDefined();

      const { workerTypeTemplate } = response.body;
      expect(workerTypeTemplate.name).toBe('Full-Time Employee Updated');
      expect(workerTypeTemplate.description).toBe('Updated description');
      expect(workerTypeTemplate.vacationAccrualRate).toBe(0.08);
      expect(workerTypeTemplate.code).toBe('FT-EMP'); // Unchanged
    });

    it('should verify update persisted in database', async () => {
      const result = await pool.query(
        `SELECT * FROM payroll.worker_type_template WHERE id = $1`,
        [testTemplateId]
      );

      expect(result.rows.length).toBe(1);
      const dbTemplate = result.rows[0];
      
      expect(dbTemplate.name).toBe('Full-Time Employee Updated');
      expect(dbTemplate.description).toBe('Updated description');
      expect(parseFloat(dbTemplate.vacation_accrual_rate)).toBe(0.08); // Parse NUMERIC as float
      expect(dbTemplate.updated_by).toBe(userId);
      expect(dbTemplate.updated_at).not.toBeNull();
    });

    it('should return 400 for invalid update data', async () => {
      const invalidUpdate = {
        defaultPayFrequency: 'invalid-frequency'
      };

      const response = await agent
        .put(`/api/products/paylinq/worker-types/${testTemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return 403 for cross-organization update attempt', async () => {
      const updateData = { name: 'Hacked Name' };

      const response = await agent2
        .put(`/api/products/paylinq/worker-types/${testTemplateId}`)
        .set('X-CSRF-Token', csrfToken2)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('FORBIDDEN');

      // Verify template was NOT updated
      const result = await pool.query(
        'SELECT name FROM payroll.worker_type_template WHERE id = $1',
        [testTemplateId]
      );
      expect(result.rows[0].name).not.toBe('Hacked Name');
    });
  });

  describe('DELETE /api/products/paylinq/worker-types/:id - Delete Template', () => {
    let deleteTestTemplateId;

    beforeAll(async () => {
      // Create template specifically for deletion test
      const response = await agent
        .post('/api/products/paylinq/worker-types')
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'To Be Deleted',
          code: 'DELETE-TEST',
          defaultPayFrequency: 'monthly',
          defaultPaymentMethod: 'cash'
        });

      deleteTestTemplateId = response.body.workerTypeTemplate.id;
    });

    it('should soft delete worker type template', async () => {
      const response = await agent
        .delete(`/api/products/paylinq/worker-types/${deleteTestTemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
    });

    it('should verify soft delete in database', async () => {
      const result = await pool.query(
        `SELECT deleted_at, deleted_by FROM payroll.worker_type_template WHERE id = $1`,
        [deleteTestTemplateId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].deleted_at).not.toBeNull();
      expect(result.rows[0].deleted_by).toBe(userId);
    });

    it('should not return soft-deleted template in list', async () => {
      const response = await agent
        .get('/api/products/paylinq/worker-types')
        .expect(200);

      const deletedTemplate = response.body.workerTypeTemplates.find(
        t => t.id === deleteTestTemplateId
      );

      expect(deletedTemplate).toBeUndefined();
    });

    it('should return 404 when trying to get soft-deleted template', async () => {
      await agent
        .get(`/api/products/paylinq/worker-types/${deleteTestTemplateId}`)
        .expect(404);
    });
  });

  // ==================== EMPLOYEE ASSIGNMENTS ====================

  describe('POST /api/products/paylinq/worker-type-assignments - Assign Worker Type', () => {
    beforeAll(async () => {
      // Create test employee
      const { employee } = await createTestEmployee({
        organizationId,
        userId,
        employee: {
          employee_number: 'EMP-WT-TEST-001',
          first_name: 'Worker',
          last_name: 'TypeTest'
        }
      });
      testEmployeeId = employee.id;
    });

    it('should assign worker type to employee', async () => {
      const assignmentData = {
        employeeRecordId: testEmployeeId,
        workerTypeTemplateId: testTemplateId,
        effectiveFrom: new Date('2024-01-01'),
        payFrequency: null,
        paymentMethod: null,
        notes: 'Initial assignment'
      };

      const response = await agent
        .post('/api/products/paylinq/worker-type-assignments')
        .set('X-CSRF-Token', csrfToken)
        .send(assignmentData)
        .expect(201);

      // Assert: Resource-specific key
      expect(response.body.success).toBe(true);
      expect(response.body.workerTypeAssignment).toBeDefined();
      expect(response.body).not.toHaveProperty('data');

      const { workerTypeAssignment } = response.body;
      expect(workerTypeAssignment.id).toBeDefined();
      expect(workerTypeAssignment.employeeId).toBe(testEmployeeId); // camelCase
      expect(workerTypeAssignment.workerTypeTemplateId).toBe(testTemplateId); // camelCase
      expect(workerTypeAssignment.isCurrent).toBe(true); // camelCase
      
      // ❌ No snake_case
      expect(workerTypeAssignment.employee_id).toBeUndefined();
      expect(workerTypeAssignment.is_current).toBeUndefined();
    });

    it('should verify assignment in database', async () => {
      const result = await pool.query(
        `SELECT * FROM payroll.worker_type 
         WHERE employee_id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
        [testEmployeeId, organizationId]
      );

      expect(result.rows.length).toBe(1);
      const assignment = result.rows[0];
      
      expect(assignment.worker_type_template_id).toBe(testTemplateId);
      expect(assignment.is_current).toBe(true);
      expect(assignment.organization_id).toBe(organizationId);
      expect(assignment.created_by).toBe(userId);
    });

    it('should return 404 when assigning non-existent template', async () => {
      const fakeTemplateId = uuidv4();
      const assignmentData = {
        employeeRecordId: testEmployeeId,
        workerTypeTemplateId: fakeTemplateId,
        effectiveFrom: new Date()
      };

      const response = await agent
        .post('/api/products/paylinq/worker-type-assignments')
        .set('X-CSRF-Token', csrfToken)
        .send(assignmentData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid date range', async () => {
      const invalidData = {
        employeeRecordId: testEmployeeId,
        workerTypeTemplateId: testTemplateId,
        effectiveFrom: new Date('2024-12-01'),
        effectiveTo: new Date('2024-01-01') // Before effectiveFrom
      };

      const response = await agent
        .post('/api/products/paylinq/worker-type-assignments')
        .set('X-CSRF-Token', csrfToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/products/paylinq/worker-type-assignments/current/:employeeId - Get Current Assignment', () => {
    it('should return current worker type assignment', async () => {
      const response = await agent
        .get(`/api/products/paylinq/worker-type-assignments/current/${testEmployeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workerTypeAssignment).toBeDefined();

      const { workerTypeAssignment } = response.body;
      expect(workerTypeAssignment.employeeId).toBe(testEmployeeId);
      expect(workerTypeAssignment.workerTypeTemplateId).toBe(testTemplateId);
      expect(workerTypeAssignment.isCurrent).toBe(true);
      expect(workerTypeAssignment.templateName).toBe('Full-Time Employee Updated');
    });

    it('should return null when no current assignment', async () => {
      // Create employee without assignment
      const { employee } = await createTestEmployee({
        organizationId,
        userId,
        employee: {
          employee_number: 'EMP-NO-WT',
          first_name: 'No',
          last_name: 'Assignment'
        }
      });

      const response = await agent
        .get(`/api/products/paylinq/worker-type-assignments/current/${employee.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workerTypeAssignment).toBeNull();
    });
  });

  describe('GET /api/products/paylinq/worker-type-assignments/history/:employeeId - Get Assignment History', () => {
    it('should return assignment history', async () => {
      const response = await agent
        .get(`/api/products/paylinq/worker-type-assignments/history/${testEmployeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workerTypeAssignments).toBeDefined();
      expect(Array.isArray(response.body.workerTypeAssignments)).toBe(true);
      expect(response.body.workerTypeAssignments.length).toBeGreaterThanOrEqual(1);

      const assignment = response.body.workerTypeAssignments[0];
      expect(assignment.employeeId).toBe(testEmployeeId);
      expect(assignment.templateName).toBeDefined();
      expect(assignment.effectiveFrom).toBeDefined();
    });

    it('should return empty array for employee with no history', async () => {
      const { employee } = await createTestEmployee({
        organizationId,
        userId,
        employee: {
          employee_number: 'EMP-NO-HISTORY',
          first_name: 'No',
          last_name: 'History'
        }
      });

      const response = await agent
        .get(`/api/products/paylinq/worker-type-assignments/history/${employee.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workerTypeAssignments).toEqual([]);
    });
  });

  // ==================== REPORTS & ANALYTICS ====================

  describe('GET /api/products/paylinq/worker-types/reports/employee-count - Employee Count by Worker Type', () => {
    it('should return employee counts grouped by worker type', async () => {
      const response = await agent
        .get('/api/products/paylinq/worker-types/reports/employee-count')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.employeeCounts).toBeDefined();
      expect(Array.isArray(response.body.employeeCounts)).toBe(true);

      if (response.body.employeeCounts.length > 0) {
        const count = response.body.employeeCounts[0];
        expect(count).toHaveProperty('workerTypeTemplateId');
        expect(count).toHaveProperty('templateName');
        expect(count).toHaveProperty('employeeCount');
        expect(typeof count.employeeCount).toBe('number');
      }
    });
  });

  // ==================== TENANT ISOLATION TESTS ====================

  describe('Tenant Isolation', () => {
    let org2TemplateId;

    beforeAll(async () => {
      // Create template in org2
      const response = await agent2
        .post('/api/products/paylinq/worker-types')
        .set('X-CSRF-Token', csrfToken2)
        .send({
          name: 'Org2 Template',
          code: 'ORG2-TEMPLATE',
          defaultPayFrequency: 'monthly',
          defaultPaymentMethod: 'cash'
        });

      org2TemplateId = response.body.workerTypeTemplate.id;
    });

    it('should not allow org1 to access org2 template', async () => {
      const response = await agent
        .get(`/api/products/paylinq/worker-types/${org2TemplateId}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('FORBIDDEN');
    });

    it('should not allow org1 to update org2 template', async () => {
      const response = await agent
        .put(`/api/products/paylinq/worker-types/${org2TemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Attempted Hack' })
        .expect(403);

      expect(response.body.success).toBe(false);

      // Verify not updated
      const dbResult = await pool.query(
        'SELECT name FROM payroll.worker_type_template WHERE id = $1',
        [org2TemplateId]
      );
      expect(dbResult.rows[0].name).toBe('Org2 Template');
    });

    it('should not allow org1 to delete org2 template', async () => {
      const response = await agent
        .delete(`/api/products/paylinq/worker-types/${org2TemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(403);

      expect(response.body.success).toBe(false);

      // Verify not deleted
      const dbResult = await pool.query(
        'SELECT deleted_at FROM payroll.worker_type_template WHERE id = $1',
        [org2TemplateId]
      );
      expect(dbResult.rows[0].deleted_at).toBeNull();
    });

    it('should not return org2 templates in org1 list', async () => {
      const response = await agent
        .get('/api/products/paylinq/worker-types')
        .expect(200);

      const org2Template = response.body.workerTypeTemplates.find(
        t => t.id === org2TemplateId
      );

      expect(org2Template).toBeUndefined();
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('should handle template with minimal data', async () => {
      const minimalData = {
        name: 'Minimal Template',
        code: 'MIN-TEMPLATE',
        defaultPayFrequency: 'monthly',
        defaultPaymentMethod: 'cash'
      };

      const response = await agent
        .post('/api/products/paylinq/worker-types')
        .set('X-CSRF-Token', csrfToken)
        .send(minimalData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.workerTypeTemplate.name).toBe('Minimal Template');
    });

    it('should handle template with all fields populated', async () => {
      const completeData = {
        name: 'Complete Template',
        code: 'COMPLETE-TEMPLATE',
        description: 'All fields populated',
        defaultPayFrequency: 'semi-monthly',
        defaultPaymentMethod: 'ach', // ✅ Valid payment method
        benefitsEligible: true,
        overtimeEligible: true,
        ptoEligible: true,
        sickLeaveEligible: true,
        vacationAccrualRate: 0.10
        // Note: overtimeMultiplier and taxSettings are stripped by validation (stripUnknown: true)
      };

      const response = await agent
        .post('/api/products/paylinq/worker-types')
        .set('X-CSRF-Token', csrfToken)
        .send(completeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.workerTypeTemplate.description).toBe('All fields populated');
      expect(response.body.workerTypeTemplate.vacationAccrualRate).toBe(0.10);
    });

    it('should handle updating single field', async () => {
      const response = await agent
        .put(`/api/products/paylinq/worker-types/${testTemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ description: 'Only description updated' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workerTypeTemplate.description).toBe('Only description updated');
      expect(response.body.workerTypeTemplate.name).toBe('Full-Time Employee Updated'); // Unchanged
    });
  });
});
