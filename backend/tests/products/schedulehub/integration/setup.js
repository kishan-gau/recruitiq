/**
 * ScheduleHub Integration Test Setup
 * Provides test database setup and helper functions
 */

import pool from '../../../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

/**
 * Create test organization with user
 */
export const createTestOrganization = async () => {
  // Create organization
  const orgResult = await pool.query(
    `INSERT INTO organizations (name, created_at) 
     VALUES ('Test Org - ScheduleHub Integration', NOW()) 
     RETURNING id`
  );
  const organizationId = orgResult.rows[0].id;

  // Create test user (admin)
  const userResult = await pool.query(
    `INSERT INTO public.users (
      organization_id, email, password_hash, 
      first_name, last_name, role, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING id`,
    [
      organizationId,
      `admin-${Date.now()}@schedulehub.test`,
      'hash',
      'Admin',
      'User',
      'admin'
    ]
  );
  const userId = userResult.rows[0].id;

  // Generate JWT token
  const token = jwt.sign(
    { userId, organizationId, role: 'admin' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  return { organizationId, userId, token };
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
 */
export const createTestWorker = async (organizationId, userId, employeeId, departmentId, locationId) => {
  const result = await pool.query(
    `INSERT INTO scheduling.workers (
      organization_id, employee_id, status, hire_date,
      primary_department_id, primary_location_id,
      default_hourly_rate, max_hours_per_week, employment_type,
      created_at, created_by, updated_at, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, NOW(), $11)
    RETURNING id`,
    [
      organizationId,
      employeeId,
      'active',
      new Date(),
      departmentId,
      locationId,
      25.00,
      40,
      'full_time',
      userId,
      userId
    ]
  );
  return result.rows[0].id;
};

/**
 * Create test role
 */
export const createTestRole = async (organizationId, userId, departmentId) => {
  const roleCode = `ROLE-${Date.now().toString().slice(-4)}`;
  const result = await pool.query(
    `INSERT INTO scheduling.roles (
      organization_id, name, code, description, department_id,
      default_hourly_rate, created_at, created_by, updated_at, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $8)
    RETURNING id`,
    [
      organizationId,
      'Test Role',
      roleCode,
      'Test role description',
      departmentId,
      20.00,
      userId,
      userId
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
      organization_id, name, code, location_id, capacity,
      created_at, created_by, updated_at, updated_by
    ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW(), $7)
    RETURNING id`,
    [
      organizationId,
      'Test Station',
      stationCode,
      locationId,
      10,
      userId,
      userId
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
      organization_id, name, department_id, start_date, end_date,
      status, created_at, created_by, updated_at, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $8)
    RETURNING id`,
    [
      organizationId,
      'Test Schedule',
      departmentId,
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
  await pool.query('DELETE FROM scheduling.workers WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM hris.employee WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM hris.location WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM hris.department WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM public.users WHERE organization_id = $1', [organizationId]);
  await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
};
