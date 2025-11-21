/**
 * E2E Test: Worker Metadata Handling
 * 
 * Tests the complete flow of creating and editing workers with metadata fields
 * including phone, dateOfBirth, department, position, compensation, etc.
 * 
 * Verifies:
 * 1. Metadata is saved when creating a worker
 * 2. Metadata is retrieved when fetching worker details
 * 3. Metadata is updated when editing a worker
 * 4. Metadata persists through the entire lifecycle
 */

import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { cleanupTestEmployees } from '../helpers/employeeTestHelper.js';


// SKIPPED: Bearer token auth incomplete - migrating to cookie-based auth
// TODO: Re-enable once cookie auth is implemented for all apps

describe.skip('Worker Metadata E2E Tests', () => {
  let authToken;
  let organizationId;
  let userId;
  let workerId;

  beforeAll(async () => {
    // Create test organization
    organizationId = uuidv4();
    await pool.query(
      `INSERT INTO organizations (id, name, slug, tier)
       VALUES ($1, $2, $3, $4)`,
      [organizationId, 'Test Org Metadata', 'testmetadata', 'professional']
    );

    // Create test user with admin role
    userId = uuidv4();
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    await pool.query(
      `INSERT INTO hris.user_account (id, organization_id, email, password_hash, email_verified) VALUES ($1, $2, $3, $4, $5)`,
      [userId, organizationId, 'admin@testmetadata.com', hashedPassword, 'Admin User', 'tenant', true]
    );

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@testmetadata.com',
        password: 'testpassword123'
      });

    authToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up in reverse order of dependencies
    if (workerId) {
      await cleanupTestEmployees(organizationId);
    }
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  describe.skip('POST /api/paylinq/workers - Create Worker with Metadata', () => {
    it('should create a worker with complete metadata', async () => {
      const workerData = {
        hrisEmployeeId: 'EMP-METADATA-001',
        employeeNumber: 'EMP-METADATA-001',
        firstName: 'John',
        lastName: 'MetadataTest',
        email: 'john.metadata@test.com',
        hireDate: '2024-01-15T00:00:00.000Z',
        status: 'active',
        paymentMethod: 'ach',
        bankAccountNumber: '1234567890',
        bankRoutingNumber: '987654321',
        metadata: {
          phone: '+597-123-4567',
          nationalId: 'NAT-12345',
          dateOfBirth: '1990-05-15',
          workerType: 'Full-Time',
          department: 'Engineering',
          position: 'Senior Software Engineer',
          compensation: 8500,
          payFrequency: 'monthly',
          bankName: 'DSB Bank',
          address: '123 Main St, Paramaribo, Suriname'
        }
      };

      const response = await request(app)
        .post('/api/paylinq/workers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
      expect(response.body.employee.id).toBeDefined();
      
      // Store worker ID for cleanup and subsequent tests
      workerId = response.body.employee.id;

      // Verify basic fields
      expect(response.body.employee.employeeNumber).toBe('EMP-METADATA-001');
      expect(response.body.employee.email).toBe('john.metadata@test.com');
      
      // Note: The response might not include metadata in the mapped format,
      // but we'll verify it's stored in the database
    });

    it('should verify metadata is stored in database', async () => {
      const result = await pool.query(
        `SELECT e.id, epc.employee_number, e.first_name, e.last_name, epc.metadata
         FROM hris.employee e
         JOIN payroll.employee_payroll_config epc ON e.id = epc.employee_id
         WHERE e.id = $1 AND e.organization_id = $2`,
        [workerId, organizationId]
      );

      expect(result.rows.length).toBe(1);
      const worker = result.rows[0];
      
      expect(worker.employee_number).toBe('EMP-METADATA-001');
      expect(worker.first_name).toBe('John');
      expect(worker.last_name).toBe('MetadataTest');
      
      // Verify metadata is stored as JSONB
      expect(worker.metadata).toBeDefined();
      expect(typeof worker.metadata).toBe('object');
      
      // Verify all metadata fields
      expect(worker.metadata.phone).toBe('+597-123-4567');
      expect(worker.metadata.nationalId).toBe('NAT-12345');
      expect(worker.metadata.dateOfBirth).toBe('1990-05-15');
      expect(worker.metadata.workerType).toBe('Full-Time');
      expect(worker.metadata.department).toBe('Engineering');
      expect(worker.metadata.position).toBe('Senior Software Engineer');
      expect(worker.metadata.compensation).toBe(8500);
      expect(worker.metadata.payFrequency).toBe('monthly');
      expect(worker.metadata.bankName).toBe('DSB Bank');
      expect(worker.metadata.address).toBe('123 Main St, Paramaribo, Suriname');
    });
  });

  describe.skip('GET /api/paylinq/workers/:id - Retrieve Worker with Metadata', () => {
    it('should retrieve worker with metadata intact', async () => {
      const response = await request(app)
        .get(`/api/paylinq/workers/${workerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
      expect(response.body.employee.id).toBe(workerId);
      
      // The metadata should be present in the response
      // (either as direct fields or in a metadata object depending on mapper)
      const employee = response.body.employee;
      expect(employee.employeeNumber).toBe('EMP-METADATA-001');
      
      // Check if metadata is included in response
      if (employee.metadata) {
        expect(employee.metadata.phone).toBe('+597-123-4567');
        expect(employee.metadata.department).toBe('Engineering');
        expect(employee.metadata.position).toBe('Senior Software Engineer');
        expect(employee.metadata.compensation).toBe(8500);
      }
    });
  });

  describe.skip('PUT /api/paylinq/workers/:id - Update Worker Metadata', () => {
    it('should update worker metadata fields', async () => {
      const updateData = {
        firstName: 'John',
        lastName: 'MetadataTest',
        email: 'john.metadata@test.com',
        status: 'active',
        bankName: 'Hakrinbank',
        bankAccountNumber: '9876543210',
        metadata: {
          phone: '+597-999-8888',
          nationalId: 'NAT-12345',
          dateOfBirth: '1990-05-15',
          workerType: 'Full-Time',
          department: 'Product Management',
          position: 'Senior Product Manager',
          compensation: 9500,
          address: '456 Updated Ave, Paramaribo, Suriname'
        }
      };

      const response = await request(app)
        .put(`/api/paylinq/workers/${workerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
    });

    it('should verify updated metadata in database', async () => {
      const result = await pool.query(
        `SELECT epc.employee_id as id, epc.employee_number, epc.metadata, epc.bank_name, epc.account_number
         FROM payroll.employee_payroll_config epc
         WHERE epc.employee_id = $1 AND epc.organization_id = $2`,
        [workerId, organizationId]
      );

      expect(result.rows.length).toBe(1);
      const worker = result.rows[0];
      
      // Verify regular fields updated
      expect(worker.bank_name).toBe('Hakrinbank');
      expect(worker.account_number).toBe('9876543210');
      
      // Verify metadata fields updated
      expect(worker.metadata).toBeDefined();
      expect(worker.metadata.phone).toBe('+597-999-8888');
      expect(worker.metadata.department).toBe('Product Management');
      expect(worker.metadata.position).toBe('Senior Product Manager');
      expect(worker.metadata.compensation).toBe(9500);
      expect(worker.metadata.address).toBe('456 Updated Ave, Paramaribo, Suriname');
      
      // Verify unchanged metadata fields persist
      expect(worker.metadata.nationalId).toBe('NAT-12345');
      expect(worker.metadata.dateOfBirth).toBe('1990-05-15');
      expect(worker.metadata.workerType).toBe('Full-Time');
    });
  });

  describe.skip('GET /api/paylinq/workers - List Workers with Metadata', () => {
    it('should list workers and include metadata', async () => {
      const response = await request(app)
        .get('/api/paylinq/workers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.employees).toBeDefined();
      expect(Array.isArray(response.body.employees)).toBe(true);
      
      // Find our test worker
      const testWorker = response.body.employees.find(
        emp => emp.id === workerId || emp.employeeNumber === 'EMP-METADATA-001'
      );
      
      expect(testWorker).toBeDefined();
      expect(testWorker.employeeNumber).toBe('EMP-METADATA-001');
    });
  });

  describe.skip('Edge Cases - Metadata Handling', () => {
    let edgeCaseWorkerId;

    afterEach(async () => {
      if (edgeCaseWorkerId) {
        await pool.query('DELETE FROM hris.employee WHERE employee_id = $1', [edgeCaseWorkerId]);
        edgeCaseWorkerId = null;
      }
    });

    it('should handle worker creation with null metadata', async () => {
      const workerData = {
        hrisEmployeeId: 'EMP-NULL-META',
        employeeNumber: 'EMP-NULL-META',
        firstName: 'Jane',
        lastName: 'NullMeta',
        email: 'jane.nullmeta@test.com',
        hireDate: '2024-02-01T00:00:00.000Z',
        status: 'active',
        paymentMethod: 'check',
        metadata: null
      };

      const response = await request(app)
        .post('/api/paylinq/workers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      edgeCaseWorkerId = response.body.employee.id;

      // Verify in database
      const result = await pool.query(
        'SELECT metadata FROM payroll.employee_payroll_config WHERE employee_id = $1',
        [edgeCaseWorkerId]
      );
      
      expect(result.rows[0].metadata).toBeNull();
    });

    it('should handle worker creation without metadata field', async () => {
      const workerData = {
        hrisEmployeeId: 'EMP-NO-META',
        employeeNumber: 'EMP-NO-META',
        firstName: 'Bob',
        lastName: 'NoMeta',
        email: 'bob.nometa@test.com',
        hireDate: '2024-02-15T00:00:00.000Z',
        status: 'active',
        paymentMethod: 'cash'
        // No metadata field at all
      };

      const response = await request(app)
        .post('/api/paylinq/workers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      edgeCaseWorkerId = response.body.employee.id;

      // Verify in database - should be null
      const result = await pool.query(
        'SELECT metadata FROM payroll.employee_payroll_config WHERE employee_id = $1',
        [edgeCaseWorkerId]
      );
      
      expect(result.rows[0].metadata).toBeNull();
    });

    it('should handle partial metadata updates', async () => {
      // First create a worker with full metadata
      const createData = {
        hrisEmployeeId: 'EMP-PARTIAL',
        employeeNumber: 'EMP-PARTIAL',
        firstName: 'Alice',
        lastName: 'Partial',
        email: 'alice.partial@test.com',
        hireDate: '2024-03-01T00:00:00.000Z',
        status: 'active',
        paymentMethod: 'ach',
        metadata: {
          phone: '+597-111-2222',
          department: 'Sales',
          position: 'Sales Rep',
          compensation: 5000
        }
      };

      const createResponse = await request(app)
        .post('/api/paylinq/workers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createData)
        .expect(201);

      edgeCaseWorkerId = createResponse.body.employee.id;

      // Update with partial metadata (only department and compensation)
      const updateData = {
        metadata: {
          phone: '+597-111-2222',
          department: 'Marketing',
          position: 'Sales Rep',
          compensation: 6000
        }
      };

      await request(app)
        .put(`/api/paylinq/workers/${edgeCaseWorkerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Verify the update
      const result = await pool.query(
        'SELECT metadata FROM payroll.employee_payroll_config WHERE employee_id = $1',
        [edgeCaseWorkerId]
      );

      const metadata = result.rows[0].metadata;
      expect(metadata.department).toBe('Marketing');
      expect(metadata.compensation).toBe(6000);
      expect(metadata.phone).toBe('+597-111-2222');
      expect(metadata.position).toBe('Sales Rep');
    });

    it('should handle metadata with special characters', async () => {
      const workerData = {
        hrisEmployeeId: 'EMP-SPECIAL',
        employeeNumber: 'EMP-SPECIAL',
        firstName: 'José',
        lastName: "O'Brien-González",
        email: 'jose.special@test.com',
        hireDate: '2024-04-01T00:00:00.000Z',
        status: 'active',
        paymentMethod: 'ach',
        metadata: {
          phone: '+597-555-1234',
          department: 'R&D',
          position: 'Software Engineer (Senior)',
          compensation: 7500,
          address: '789 "Special" St., Apt #5, Paramaribo'
        }
      };

      const response = await request(app)
        .post('/api/paylinq/workers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      edgeCaseWorkerId = response.body.employee.id;

      // Verify special characters are preserved
      const result = await pool.query(
        'SELECT metadata FROM payroll.employee_payroll_config WHERE employee_id = $1',
        [edgeCaseWorkerId]
      );

      const metadata = result.rows[0].metadata;
      expect(metadata.department).toBe('R&D');
      expect(metadata.position).toBe('Software Engineer (Senior)');
      expect(metadata.address).toBe('789 "Special" St., Apt #5, Paramaribo');
    });

    it('should handle nested metadata objects', async () => {
      const workerData = {
        hrisEmployeeId: 'EMP-NESTED',
        employeeNumber: 'EMP-NESTED',
        firstName: 'Carlos',
        lastName: 'Nested',
        email: 'carlos.nested@test.com',
        hireDate: '2024-05-01T00:00:00.000Z',
        status: 'active',
        paymentMethod: 'ach',
        metadata: {
          phone: '+597-666-7777',
          department: 'IT',
          position: 'DevOps Engineer',
          compensation: 8000,
          certifications: ['AWS', 'Azure', 'GCP'],
          emergencyContact: {
            name: 'Maria Nested',
            relationship: 'Spouse',
            phone: '+597-666-8888'
          }
        }
      };

      const response = await request(app)
        .post('/api/paylinq/workers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      edgeCaseWorkerId = response.body.employee.id;

      // Verify nested structures are preserved
      const result = await pool.query(
        'SELECT metadata FROM payroll.employee_payroll_config WHERE employee_id = $1',
        [edgeCaseWorkerId]
      );

      const metadata = result.rows[0].metadata;
      expect(Array.isArray(metadata.certifications)).toBe(true);
      expect(metadata.certifications).toEqual(['AWS', 'Azure', 'GCP']);
      expect(metadata.emergencyContact).toBeDefined();
      expect(metadata.emergencyContact.name).toBe('Maria Nested');
      expect(metadata.emergencyContact.phone).toBe('+597-666-8888');
    });
  });

  describe.skip('Integration with Frontend Flow', () => {
    it('should simulate complete frontend create worker flow', async () => {
      // Simulate frontend AddWorkerModal submission
      const formData = {
        employeeNumber: 'SR-100',
        fullName: 'Frontend Test User',
        email: 'frontend.test@example.com',
        phone: '+597-123-9999',
        nationalId: '99887766',
        dateOfBirth: '1995-08-20',
        startDate: '2024-06-01',
        workerType: 'Part-Time',
        department: 'Customer Support',
        position: 'Support Specialist',
        compensation: '4500',
        payFrequency: 'biweekly',
        bankName: 'FINA Bank',
        bankAccount: '5544332211',
        address: '321 Frontend Ave, Paramaribo'
      };

      // Transform to API format (as frontend does)
      const nameParts = formData.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
      const hireDateISO = new Date(formData.startDate).toISOString();

      const apiPayload = {
        hrisEmployeeId: formData.employeeNumber,
        employeeNumber: formData.employeeNumber,
        firstName: firstName,
        lastName: lastName,
        email: formData.email,
        hireDate: hireDateISO,
        status: 'active',
        paymentMethod: 'ach',
        bankAccountNumber: formData.bankAccount,
        bankRoutingNumber: '',
        metadata: {
          phone: formData.phone,
          nationalId: formData.nationalId,
          dateOfBirth: formData.dateOfBirth,
          workerType: formData.workerType,
          department: formData.department,
          position: formData.position,
          compensation: Number(formData.compensation),
          payFrequency: formData.payFrequency,
          bankName: formData.bankName,
          address: formData.address,
        },
      };

      const response = await request(app)
        .post('/api/paylinq/workers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(apiPayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      const createdWorkerId = response.body.employee.id;

      // Verify in database
      const result = await pool.query(
        'SELECT * FROM payroll.employee_payroll_config WHERE employee_id = $1',
        [createdWorkerId]
      );

      const worker = result.rows[0];
      expect(worker.metadata.phone).toBe('+597-123-9999');
      expect(worker.metadata.department).toBe('Customer Support');
      expect(worker.metadata.position).toBe('Support Specialist');
      expect(worker.metadata.compensation).toBe(4500);

      // Cleanup
      await pool.query('DELETE FROM hris.employee WHERE id = $1', [createdWorkerId]);
    });

    it('should simulate complete frontend edit worker flow', async () => {
      // Fetch worker (as frontend does for edit modal)
      const fetchResponse = await request(app)
        .get(`/api/paylinq/workers/${workerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(fetchResponse.body.success).toBe(true);

      // Simulate edit with updated fields
      const updatePayload = {
        firstName: 'John',
        lastName: 'MetadataTest',
        email: 'john.metadata@test.com',
        status: 'active',
        bankName: 'RBC Suriname',
        bankAccountNumber: '1111222233',
        metadata: {
          phone: '+597-100-2000',
          nationalId: 'NAT-12345',
          dateOfBirth: '1990-05-15',
          workerType: 'Full-Time',
          department: 'Executive',
          position: 'VP of Engineering',
          compensation: 12000,
          address: '999 Executive Blvd, Paramaribo'
        }
      };

      const updateResponse = await request(app)
        .put(`/api/paylinq/workers/${workerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatePayload)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // Verify update persisted
      const verifyResult = await pool.query(
        'SELECT metadata FROM payroll.employee_payroll_config WHERE employee_id = $1',
        [workerId]
      );

      const metadata = verifyResult.rows[0].metadata;
      expect(metadata.department).toBe('Executive');
      expect(metadata.position).toBe('VP of Engineering');
      expect(metadata.compensation).toBe(12000);
    });
  });
});
