/**
 * HRIS Event Integration Tests
 * 
 * End-to-end tests for HRIS event flows:
 * RecruitIQ → Paylinq integration via event system
 */

import request from 'supertest';
import pool from '../../../../src/config/database.js';
import app from '../../../../src/server.js';
import { eventEmitter  } from '../../../../src/products/paylinq/events/eventEmitter.js';
import { handleEmployeeCreated  } from '../../../../src/products/paylinq/events/hrisHandlers.js';

describe('HRIS Event Integration', () => {
  let authToken;
  let organizationId;

  beforeAll(async () => {
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
      ['Test HRIS Integration Org', 'test-hris-integration-org']
    );
    organizationId = orgResult.rows[0].id;

    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, organization_id, legacy_role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['hris@test.com', 'dummy_hash_for_test', 'HRIS Test User', organizationId, 'admin']
    );
    
    authToken = `Bearer test-token-${userResult.rows[0].id}`;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  describe('Employee Created Event Flow', () => {
    test('should sync new employee from RecruitIQ to Paylinq', async () => {
      // Simulate RecruitIQ employee creation event
      const recruitiqEmployee = {
        id: 'recruitiq-emp-123',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@test.com',
        phone: '555-0100',
        hireDate: '2024-01-15',
        department: 'Sales',
        jobTitle: 'Account Executive',
        organizationId: organizationId
      };

      // Listen for Paylinq employee created event
      let paylinqEmployeeCreated = null;
      eventEmitter.on('paylinq.employee.created', (data) => {
        paylinqEmployeeCreated = data;
      });

      // Emit RecruitIQ event
      eventEmitter.emit('recruitiq.employee.created', recruitiqEmployee);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify employee created in Paylinq
      const response = await request(app)
        .get('/api/paylinq/employees')
        .set('Authorization', authToken)
        .query({ email: 'alice.johnson@test.com' })
        .expect(200);

      expect(response.body.employees.length).toBe(1);
      expect(response.body.employees[0].first_name).toBe('Alice');
      expect(response.body.employees[0].external_id).toBe('recruitiq-emp-123');

      // Verify event emitted
      expect(paylinqEmployeeCreated).toBeDefined();
      expect(paylinqEmployeeCreated.email).toBe('alice.johnson@test.com');
    });

    test('should auto-setup default compensation from job template', async () => {
      const recruitiqEmployee = {
        id: 'recruitiq-emp-456',
        firstName: 'Bob',
        lastName: 'Williams',
        email: 'bob.williams@test.com',
        hireDate: '2024-02-01',
        department: 'Engineering',
        jobTitle: 'Senior Engineer',
        compensationTemplate: {
          payType: 'salary',
          payRate: 110000,
          payPeriod: 'bi_weekly'
        },
        organizationId: organizationId
      };

      eventEmitter.emit('recruitiq.employee.created', recruitiqEmployee);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify employee
      const empResponse = await request(app)
        .get('/api/paylinq/employees')
        .set('Authorization', authToken)
        .query({ email: 'bob.williams@test.com' })
        .expect(200);

      const employeeId = empResponse.body.employees[0].id;

      // Verify compensation auto-created
      const compResponse = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/compensation`)
        .set('Authorization', authToken)
        .expect(200);

      expect(compResponse.body.compensationHistory.length).toBe(1);
      expect(compResponse.body.compensationHistory[0].pay_rate).toBe(110000);
      expect(compResponse.body.compensationHistory[0].pay_type).toBe('salary');
    });
  });

  describe('Employee Updated Event Flow', () => {
    let employeeId;

    beforeAll(async () => {
      // Create test employee
      const response = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', authToken)
        .send({
          firstName: 'Charlie',
          lastName: 'Brown',
          email: 'charlie.brown@test.com',
          workerType: 'w2',
          hireDate: '2024-01-01'
        })
        .expect(201);

      employeeId = response.body.employee.id;
    });

    test('should sync employee updates from RecruitIQ', async () => {
      const updateEvent = {
        id: employeeId,
        email: 'charlie.brown@test.com',
        department: 'Marketing', // Changed
        jobTitle: 'Marketing Manager', // Changed
        phone: '555-0200', // Added
        organizationId: organizationId
      };

      eventEmitter.emit('recruitiq.employee.updated', updateEvent);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify updates applied
      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.employee.department).toBe('Marketing');
      expect(response.body.employee.job_title).toBe('Marketing Manager');
      expect(response.body.employee.phone).toBe('555-0200');
    });
  });

  describe('Employee Terminated Event Flow', () => {
    let employeeId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', authToken)
        .send({
          firstName: 'David',
          lastName: 'Miller',
          email: 'david.miller@test.com',
          workerType: 'w2',
          hireDate: '2024-01-01'
        })
        .expect(201);

      employeeId = response.body.employee.id;
    });

    test('should sync termination from RecruitIQ', async () => {
      // Listen for payroll adjustments
      let payrollAdjustmentEvent = null;
      eventEmitter.on('paylinq.payroll.adjusted', (data) => {
        payrollAdjustmentEvent = data;
      });

      const terminationEvent = {
        id: employeeId,
        email: 'david.miller@test.com',
        terminationDate: '2024-06-30',
        terminationReason: 'voluntary_resignation',
        finalPayDate: '2024-07-05',
        organizationId: organizationId
      };

      eventEmitter.emit('recruitiq.employee.terminated', terminationEvent);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify status updated
      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.employee.employment_status).toBe('terminated');
      expect(response.body.employee.termination_date).toBe('2024-06-30');
    });

    test('should stop future payroll runs for terminated employee', async () => {
      // Attempt to create timesheet for terminated employee
      const response = await request(app)
        .post('/api/paylinq/timesheets')
        .set('Authorization', authToken)
        .send({
          employeeId: employeeId,
          periodStart: '2024-07-01',
          periodEnd: '2024-07-07',
          regularHours: 40
        })
        .expect(400);

      expect(response.body.message).toContain('terminated');
    });
  });

  describe('Compensation Change Event Flow', () => {
    let employeeId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', authToken)
        .send({
          firstName: 'Emma',
          lastName: 'Davis',
          email: 'emma.davis@test.com',
          workerType: 'w2',
          hireDate: '2024-01-01'
        })
        .expect(201);

      employeeId = response.body.employee.id;

      // Setup initial compensation
      await request(app)
        .post(`/api/paylinq/employees/${employeeId}/compensation`)
        .set('Authorization', authToken)
        .send({
          payType: 'salary',
          payRate: 75000,
          payPeriod: 'bi_weekly',
          effectiveDate: '2024-01-01'
        })
        .expect(201);
    });

    test('should sync compensation changes from RecruitIQ', async () => {
      const compensationChangeEvent = {
        employeeId: employeeId,
        email: 'emma.davis@test.com',
        newPayRate: 80000, // Raise
        effectiveDate: '2024-07-01',
        reason: 'Annual performance review',
        organizationId: organizationId
      };

      eventEmitter.emit('recruitiq.compensation.updated', compensationChangeEvent);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify new compensation record
      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/compensation`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.compensationHistory.length).toBe(2);
      expect(response.body.compensationHistory[0].pay_rate).toBe(80000);
      expect(response.body.compensationHistory[0].is_current).toBe(true);
    });
  });

  describe('Department Change Event Flow', () => {
    test('should handle department transfers', async () => {
      const response = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', authToken)
        .send({
          firstName: 'Frank',
          lastName: 'Wilson',
          email: 'frank.wilson@test.com',
          workerType: 'w2',
          department: 'Engineering',
          hireDate: '2024-01-01'
        })
        .expect(201);

      const employeeId = response.body.employee.id;

      // Department transfer event
      const transferEvent = {
        employeeId: employeeId,
        oldDepartment: 'Engineering',
        newDepartment: 'Product',
        effectiveDate: '2024-06-01',
        organizationId: organizationId
      };

      eventEmitter.emit('recruitiq.employee.department_changed', transferEvent);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify department updated
      const checkResponse = await request(app)
        .get(`/api/paylinq/employees/${employeeId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(checkResponse.body.employee.department).toBe('Product');
    });
  });

  describe('Event Error Handling', () => {
    test('should handle duplicate employee creation events gracefully', async () => {
      const employeeData = {
        id: 'duplicate-123',
        firstName: 'Grace',
        lastName: 'Taylor',
        email: 'grace.taylor@test.com',
        hireDate: '2024-01-01',
        organizationId: organizationId
      };

      // Emit twice
      eventEmitter.emit('recruitiq.employee.created', employeeData);
      await new Promise(resolve => setTimeout(resolve, 100));

      eventEmitter.emit('recruitiq.employee.created', employeeData);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only have one employee
      const response = await request(app)
        .get('/api/paylinq/employees')
        .set('Authorization', authToken)
        .query({ email: 'grace.taylor@test.com' })
        .expect(200);

      expect(response.body.employees.length).toBe(1);
    });

    test('should handle events for non-existent employees', async () => {
      const updateEvent = {
        id: 'non-existent-id',
        email: 'nobody@test.com',
        department: 'Sales',
        organizationId: organizationId
      };

      // Should not throw error
      eventEmitter.emit('recruitiq.employee.updated', updateEvent);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Event should be logged but not crash
      const response = await request(app)
        .get('/api/paylinq/employees')
        .set('Authorization', authToken)
        .query({ email: 'nobody@test.com' })
        .expect(200);

      expect(response.body.employees.length).toBe(0);
    });

    test('should validate organization context in events', async () => {
      const invalidOrgEvent = {
        id: 'emp-999',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        organizationId: 'wrong-org-id'
      };

      eventEmitter.emit('recruitiq.employee.created', invalidOrgEvent);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not create employee in wrong organization
      const response = await request(app)
        .get('/api/paylinq/employees')
        .set('Authorization', authToken)
        .query({ email: 'test@test.com' })
        .expect(200);

      expect(response.body.employees.length).toBe(0);
    });
  });

  describe('Event History and Audit Trail', () => {
    test('should maintain event history', async () => {
      const employeeData = {
        id: 'audit-emp-123',
        firstName: 'Henry',
        lastName: 'Anderson',
        email: 'henry.anderson@test.com',
        hireDate: '2024-01-01',
        organizationId: organizationId
      };

      eventEmitter.emit('recruitiq.employee.created', employeeData);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check event history (if implemented)
      const eventHistory = eventEmitter.getEventHistory('recruitiq.employee.created');
      expect(eventHistory.length).toBeGreaterThan(0);
      
      const latestEvent = eventHistory[eventHistory.length - 1];
      expect(latestEvent.data.email).toBe('henry.anderson@test.com');
    });
  });
});
