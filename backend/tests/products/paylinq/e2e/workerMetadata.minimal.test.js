/**
 * Minimal E2E Test: Worker Metadata Handling
 * Quick test to verify metadata is saved and retrieved
 */

import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { createTestEmployee, cleanupTestEmployees } from '../helpers/employeeTestHelper.js';

describe('Worker Metadata Minimal Test', () => {
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
      [organizationId, 'Test Org Meta Min', 'testmetamin', 'professional']
    );

    // Create test user
    userId = uuidv4();
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    await pool.query(
      `INSERT INTO users (id, organization_id, email, password_hash, name, user_type, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, organizationId, 'admin@testmetamin.com', hashedPassword, 'Admin User', 'tenant', true]
    );

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@testmetamin.com',
        password: 'testpass123'
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    if (workerId) {
      await cleanupTestEmployees(organizationId);
    }
    await pool.query('DELETE FROM users WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  test('should create worker with metadata and verify in database', async () => {
    const workerData = {
      hrisEmployeeId: 'EMP-MIN-001',
      employeeNumber: 'EMP-MIN-001',
      firstName: 'Test',
      lastName: 'Worker',
      email: 'test.worker@test.com',
      hireDate: '2024-01-15T00:00:00.000Z',
      status: 'active',
      paymentMethod: 'direct_deposit',
      bankAccountNumber: '1234567890',
      bankRoutingNumber: '987654321',
      metadata: {
        phone: '+597-123-4567',
        department: 'Engineering',
        position: 'Software Engineer',
        compensation: 5000
      }
    };

    // Create worker
    const response = await request(app)
      .post('/api/paylinq/workers')
      .set('Authorization', `Bearer ${authToken}`)
      .send(workerData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.employee).toBeDefined();
    
    workerId = response.body.employee.id;
    console.log('Created worker ID:', workerId);

    // Verify metadata in database
    const result = await pool.query(
      `SELECT e.id, epc.employee_number, epc.metadata
       FROM hris.employee e
       JOIN payroll.employee_payroll_config epc ON e.id = epc.employee_id
       WHERE e.id = $1 AND e.organization_id = $2`,
      [workerId, organizationId]
    );

    expect(result.rows.length).toBe(1);
    const worker = result.rows[0];
    
    console.log('Worker metadata from DB:', JSON.stringify(worker.metadata, null, 2));
    
    // Verify metadata fields
    expect(worker.metadata).toBeDefined();
    expect(worker.metadata.phone).toBe('+597-123-4567');
    expect(worker.metadata.department).toBe('Engineering');
    expect(worker.metadata.position).toBe('Software Engineer');
    expect(worker.metadata.compensation).toBe(5000);
  });

  test('should retrieve worker with metadata via API', async () => {
    expect(workerId).toBeDefined();
    
    const response = await request(app)
      .get(`/api/paylinq/workers/${workerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.employee).toBeDefined();
    console.log('Worker from API:', JSON.stringify(response.body.employee, null, 2));
  });

  test('should update worker metadata', async () => {
    expect(workerId).toBeDefined();

    const updateData = {
      metadata: {
        phone: '+597-999-8888',
        department: 'Product',
        position: 'Product Manager',
        compensation: 6000
      }
    };

    const response = await request(app)
      .put(`/api/paylinq/workers/${workerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify in database
    const result = await pool.query(
      'SELECT metadata FROM payroll.employee_payroll_config WHERE employee_id = $1',
      [workerId]
    );

    const metadata = result.rows[0].metadata;
    console.log('Updated metadata from DB:', JSON.stringify(metadata, null, 2));
    
    expect(metadata.phone).toBe('+597-999-8888');
    expect(metadata.department).toBe('Product');
    expect(metadata.position).toBe('Product Manager');
    expect(metadata.compensation).toBe(6000);
  });
});
