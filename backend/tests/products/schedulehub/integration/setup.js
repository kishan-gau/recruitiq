/**
 * ScheduleHub Integration Test Setup
 * Provides test database setup and helper functions
 */

import pool from '../../../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';
import app from '../../../../src/server.js';
import bcrypt from 'bcrypt';

/**
 * Create test organization with user and return authenticated agent
 */
export const createTestOrganization = async () => {
  // Create organization with unique slug
  const timestamp = Date.now();
  const orgSlug = `test-org-schedulehub-${timestamp}`;
  const orgResult = await pool.query(
    `INSERT INTO organizations (name, slug, created_at) 
     VALUES ('Test Org - ScheduleHub Integration', $1, NOW()) 
     RETURNING id`,
    [orgSlug]
  );
  const organizationId = orgResult.rows[0].id;

  // Generate consistent email for both INSERT and LOGIN
  const testEmail = `admin-${Date.now()}@schedulehub.test`;
  
  // Hash password for test user
  const passwordHash = await bcrypt.hash('TestPassword123!', 10);
  
  // Create test user in hris.user_account (tenant user)
  // Note: user_account table does NOT have first_name/last_name columns
  // Those are in the hris.employee table linked via employee_id
  const userResult = await pool.query(
    `INSERT INTO hris.user_account (
      organization_id, email, password_hash, 
      enabled_products, is_active, email_verified, account_status, created_at
    ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, NOW())
    RETURNING id`,
    [
      organizationId,
      testEmail,  // Use consistent email variable
      passwordHash,
      JSON.stringify(['schedulehub']), // Enable ScheduleHub product access (cast to JSONB)
      true,
      true,
      'active'
    ]
  );
  const userId = userResult.rows[0].id;

  // Create authenticated agent with cookie-based auth
  const agent = request.agent(app);
  
  // Get CSRF token
  const csrfResponse = await agent.get('/api/csrf-token');
  const csrfToken = csrfResponse.body.csrfToken;
  
  // Login to get session cookies
  const loginResponse = await agent
    .post('/api/auth/tenant/login')
    .set('X-CSRF-Token', csrfToken)
    .send({
      email: testEmail,  // Use same email variable
      password: 'TestPassword123!'
    });
  
  if (loginResponse.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
  }

  return { organizationId, userId, agent, csrfToken };
};

/**
 * Create test department
 */
export const createTestDepartment = async (organizationId, userId) => {
  const result = await pool.query(
    `INSERT INTO hris.department (
      organization_id, department_code, department_name,
      created_at, created_by
    ) VALUES ($1, $2, $3, NOW(), $4)
    RETURNING id`,
    [organizationId, `DEPT-${Date.now().toString().slice(-4)}`, 'Test Department', userId]
  );
  return result.rows[0].id;
};

/**
 * Create test location
 */
export const createTestLocation = async (organizationId, userId) => {
  const result = await pool.query(
    `INSERT INTO hris.location (
      organization_id, location_code, location_name, 
      location_type, created_at, created_by
    ) VALUES ($1, $2, $3, $4, NOW(), $5)
    RETURNING id`,
    [
      organizationId,
      `LOC-${Date.now().toString().slice(-4)}`,
      'Test Location',
      'branch',
      userId
    ]
  );
  return result.rows[0].id;
};

/**
 * Create test employee in Nexus
 */
export const createTestEmployee = async (organizationId, userId, departmentId, locationId) => {
  const employeeNumber = `EMP${Date.now().toString().slice(-4)}`;
  const result = await pool.query(
    `INSERT INTO hris.employee (
      organization_id, employee_number, first_name, last_name, email,
      department_id, location_id, job_title, employment_type,
      employment_status, hire_date, created_at, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)
    RETURNING id`,
    [
      organizationId,
      employeeNumber,
      'Test',
      'Employee',
      `test.employee.${Date.now()}@example.com`,
      departmentId,
      locationId,
      'Test Worker',
      'full_time',
      'active',
      new Date(),
      userId
    ]
  );
  return result.rows[0].id;
};

/**
 * Create test worker in ScheduleHub
 * Note: Workers are stored in hris.employee table, not scheduling.workers
 * This function creates an employee record for testing
 */
export const createTestWorker = async (organizationId, userId, employeeId, departmentId, locationId) => {
  // Workers are already created in hris.employee during setup
  // Just return the employeeId since that's what the tests expect
  return employeeId;
};

/**
 * Create test role
 */
export const createTestRole = async (organizationId, userId, departmentId) => {
  const roleCode = `ROLE-${Date.now().toString().slice(-4)}`;
  const result = await pool.query(
    `INSERT INTO scheduling.roles (
      organization_id, role_name, role_code, description, hourly_rate, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id`,
    [
      organizationId,
      'Test Role',
      roleCode,
      'Test role description',
      20.00,
      true
    ]
  );
  return result.rows[0].id;
};

/**
 * Create test station
 */
export const createTestStation = async (organizationId, userId, locationId) => {
  const stationCode = `STN-${Date.now().toString().slice(-4)}`;
  const result = await pool.query(
    `INSERT INTO scheduling.stations (
      organization_id, station_name, station_code, location_id, capacity, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id`,
    [
      organizationId,
      'Test Station',
      stationCode,
      locationId,
      10,
      true
    ]
  );
  return result.rows[0].id;
};

/**
 * Create test schedule
 */
export const createTestSchedule = async (organizationId, userId, departmentId) => {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  const result = await pool.query(
    `INSERT INTO scheduling.schedules (
      organization_id, schedule_name, start_date, end_date,
      status, created_at, created_by, updated_at, updated_by
    ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW(), $7)
    RETURNING id`,
    [
      organizationId,
      'Test Schedule',
      startDate,
      endDate,
      'draft',
      userId,
      userId
    ]
  );
  return result.rows[0].id;
};

/**
 * Clean up test data
 */
export const cleanupTestData = async (organizationId) => {
  if (!organizationId) return;

  // Delete in reverse dependency order
  await pool.query('DELETE FROM scheduling.shift_swap_requests WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM scheduling.shift_swap_offers WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM scheduling.time_off_requests WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM scheduling.worker_availability WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM scheduling.shifts WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM scheduling.schedules WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM scheduling.station_role_requirements WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM scheduling.stations WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM scheduling.worker_roles WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM scheduling.roles WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM hris.employee WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM hris.location WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM hris.department WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
};
