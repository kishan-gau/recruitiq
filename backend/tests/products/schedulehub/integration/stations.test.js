/**
 * Integration Tests: Stations API
 * Tests station management and role requirements with cookie-based authentication
 */

import { jest } from '@jest/globals';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import pool from '../../../../src/config/database.js';
import {
  createTestOrganization,
  createTestDepartment,
  createTestLocation,
  createTestRole,
  createTestStation,
  cleanupTestData
} from './setup.js';


// SKIPPED: Bearer token auth incomplete - migrating to cookie-based auth
// TODO: Re-enable once cookie auth is implemented for all apps

describe('Integration: Stations API', () => {
  let organizationId;
  let userId;
  let agent;
  let csrfToken;
  let locationId;
  let roleId;
  let stationId;

  beforeAll(async () => {
    const org = await createTestOrganization();
    organizationId = org.organizationId;
    userId = org.userId;
    agent = org.agent;
    csrfToken = org.csrfToken;

    const departmentId = await createTestDepartment(organizationId, userId);
    locationId = await createTestLocation(organizationId, userId);
    roleId = await createTestRole(organizationId, userId, departmentId);
  });

  afterAll(async () => {
    await cleanupTestData(organizationId);
    await pool.end();
  });

  describe('POST /api/schedulehub/stations', () => {
    it('should create a station', async () => {
      const response = await agent.post('/api/products/schedulehub/stations').set('X-CSRF-Token', csrfToken).send({
          name: 'Front Register 1',
          code: `FR1-${Date.now()}`,
          locationId,
          capacity: 2,
          floor: '1st Floor',
          zone: 'Checkout Area',
          requiresSupervision: false
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.name).toBe('Front Register 1');
      expect(response.body?.data?.capacity).toBe(2);

      stationId = response.body.data.id;
    });

    it('should validate unique station code', async () => {
      const code = `UNIQUE-${Date.now()}`;
      
      // Create first station
      await agent.post('/api/products/schedulehub/stations').set('X-CSRF-Token', csrfToken).send({
          name: 'Station 1',
          code,
          locationId
        });

      // Try to create duplicate
      const response = await agent.post('/api/products/schedulehub/stations').set('X-CSRF-Token', csrfToken).send({
          name: 'Station 2',
          code, // Duplicate
          locationId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    it('should set default capacity to 1', async () => {
      const response = await agent.post('/api/products/schedulehub/stations').set('X-CSRF-Token', csrfToken).send({
          name: 'Single Station',
          code: `SINGLE-${Date.now()}`,
          locationId
          // No capacity specified
        });

      expect(response.status).toBe(201);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.capacity).toBe(1);
    });

    it('should require name and code', async () => {
      const response = await agent.post('/api/products/schedulehub/stations').set('X-CSRF-Token', csrfToken).send({
          locationId
        });

      expect(response.status).toBe(400);
    });

    it('should validate capacity > 0', async () => {
      const response = await agent.post('/api/products/schedulehub/stations').set('X-CSRF-Token', csrfToken).send({
          name: 'Invalid Station',
          code: `INV-${Date.now()}`,
          locationId,
          capacity: 0
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/schedulehub/stations', () => {
    it('should list stations', async () => {
      const response = await agent.get('/api/products/schedulehub/stations')

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.length).toBeGreaterThan(0);
    });

    it('should filter by location', async () => {
      const response = await agent.get('/api/products/schedulehub/stations')        .query({ locationId });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(s => s.location_id === locationId)).toBe(true);
    });

    it('should filter active only by default', async () => {
      const response = await agent.get('/api/products/schedulehub/stations')

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(s => s.is_active === true)).toBe(true);
    });

    it('should include inactive when requested', async () => {
      // Create inactive station
      await pool.query(
        `INSERT INTO scheduling.stations (
          organization_id, station_name, station_code, location_id,
          is_active, created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW(), $7)`,
        [organizationId, 'Inactive Station', `INACT-${Date.now()}`,
         locationId, false, userId, userId]
      );

      const response = await agent.get('/api/products/schedulehub/stations')        .query({ includeInactive: true });

      expect(response.status).toBe(200);
      expect(response.body?.data?.some(s => s.is_active === false)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await agent.get('/api/products/schedulehub/stations')        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
    });

    it('should be ordered by name', async () => {
      const response = await agent.get('/api/products/schedulehub/stations')

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      const names = response.body.data.map(s => s.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe('GET /api/schedulehub/stations/:id', () => {
    it('should get station by id', async () => {
      const response = await agent.get(`/api/products/schedulehub/stations/${stationId}`)

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.id).toBe(stationId);
      expect(response.body.data).toHaveProperty('name');
    });

    it('should return 404 for non-existent station', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await agent.get(`/api/products/schedulehub/stations/${fakeId}`)

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/schedulehub/stations/:id', () => {
    it('should update station details', async () => {
      const response = await agent.patch(`/api/products/schedulehub/stations/${stationId}`).set('X-CSRF-Token', csrfToken).send({
          capacity: 3,
          floor: '2nd Floor',
          requiresSupervision: true
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.capacity).toBe(3);
      expect(response.body?.data?.floor).toBe('2nd Floor');
      expect(response.body?.data?.requires_supervision).toBe(true);
    });

    it('should update name and description', async () => {
      const response = await agent.patch(`/api/products/schedulehub/stations/${stationId}`).set('X-CSRF-Token', csrfToken).send({
          name: 'Front Register 1 - Updated',
          description: 'Primary checkout station'
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.name).toBe('Front Register 1 - Updated');
      expect(response.body?.data?.description).toBe('Primary checkout station');
    });

    it('should deactivate station', async () => {
      const tempStation = await createTestStation(organizationId, userId, locationId);

      const response = await agent.patch(`/api/products/schedulehub/stations/${tempStation}`).set('X-CSRF-Token', csrfToken).send({
          isActive: false
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.is_active).toBe(false);
    });

    it('should validate capacity > 0', async () => {
      const response = await agent.patch(`/api/products/schedulehub/stations/${stationId}`).set('X-CSRF-Token', csrfToken).send({
          capacity: -1
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/schedulehub/stations/:stationId/requirements', () => {
    it('should add role requirement', async () => {
      const response = await agent.post(`/api/products/schedulehub/stations/${stationId}/requirements`).set('X-CSRF-Token', csrfToken).send({
          roleId,
          minWorkers: 1,
          maxWorkers: 2,
          priority: 'required'
        });

      expect(response.status).toBe(201);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.role_id).toBe(roleId);
      expect(response.body?.data?.station_id).toBe(stationId);
      expect(response.body?.data?.min_workers).toBe(1);
      expect(response.body?.data?.max_workers).toBe(2);
    });

    it('should validate min <= max workers', async () => {
      const newDept = await createTestDepartment(organizationId, userId);
      const newRole = await createTestRole(organizationId, userId, newDept);

      const response = await agent.post(`/api/products/schedulehub/stations/${stationId}/requirements`).set('X-CSRF-Token', csrfToken).send({
          roleId: newRole,
          minWorkers: 5,
          maxWorkers: 2 // max < min
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('min_workers cannot be greater');
    });

    it('should validate priority enum', async () => {
      const newDept = await createTestDepartment(organizationId, userId);
      const newRole = await createTestRole(organizationId, userId, newDept);

      const response = await agent.post(`/api/products/schedulehub/stations/${stationId}/requirements`).set('X-CSRF-Token', csrfToken).send({
          roleId: newRole,
          minWorkers: 1,
          priority: 'invalid_priority'
        });

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate role requirement', async () => {
      const response = await agent.post(`/api/products/schedulehub/stations/${stationId}/requirements`).set('X-CSRF-Token', csrfToken).send({
          roleId,
          minWorkers: 1,
          priority: 'preferred'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    it('should default min/max workers to 1', async () => {
      const newDept = await createTestDepartment(organizationId, userId);
      const newRole = await createTestRole(organizationId, userId, newDept);

      const response = await agent.post(`/api/products/schedulehub/stations/${stationId}/requirements`).set('X-CSRF-Token', csrfToken).send({
          roleId: newRole,
          priority: 'optional'
          // No min/max specified
        });

      expect(response.status).toBe(201);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.min_workers).toBe(1);
      expect(response.body?.data?.max_workers).toBe(1);
    });
  });

  describe('GET /api/schedulehub/stations/:id/requirements', () => {
    it('should get station requirements', async () => {
      const response = await agent.get(`/api/products/schedulehub/stations/${stationId}/requirements`)

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.length).toBeGreaterThan(0);
    });

    it('should include role details', async () => {
      const response = await agent.get(`/api/products/schedulehub/stations/${stationId}/requirements`)

      expect(response.status).toBe(200);
      expect(response.body.data[0]).toHaveProperty('role_name');
      expect(response.body.data[0]).toHaveProperty('min_workers');
    });

    it('should be ordered by priority', async () => {
      const response = await agent.get(`/api/products/schedulehub/stations/${stationId}/requirements`)

      expect(response.status).toBe(200);
      
      // Verify priority order: required > preferred > optional
      expect(response.body?.data).toBeDefined();
      const priorities = response.body.data.map(r => r.priority);
      const priorityOrder = { required: 1, preferred: 2, optional: 3 };
      const expectedOrder = priorities.map(p => priorityOrder[p]);
      const sorted = [...expectedOrder].sort((a, b) => a - b);
      expect(expectedOrder).toEqual(sorted);
    });

    it('should return empty array for station with no requirements', async () => {
      const emptyStation = await createTestStation(organizationId, userId, locationId);

      const response = await agent.get(`/api/products/schedulehub/stations/${emptyStation}/requirements`)

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('PATCH /api/schedulehub/stations/:stationId/requirements/:roleId', () => {
    it('should update requirement', async () => {
      const response = await agent.patch(`/api/products/schedulehub/stations/${stationId}/requirements/${roleId}`).set('X-CSRF-Token', csrfToken).send({
          minWorkers: 2,
          maxWorkers: 3,
          priority: 'preferred'
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.min_workers).toBe(2);
      expect(response.body?.data?.max_workers).toBe(3);
      expect(response.body?.data?.priority).toBe('preferred');
    });

    it('should update only priority', async () => {
      const response = await agent.patch(`/api/products/schedulehub/stations/${stationId}/requirements/${roleId}`).set('X-CSRF-Token', csrfToken).send({
          priority: 'required'
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.priority).toBe('required');
    });

    it('should validate min <= max', async () => {
      const response = await agent.patch(`/api/products/schedulehub/stations/${stationId}/requirements/${roleId}`).set('X-CSRF-Token', csrfToken).send({
          minWorkers: 10,
          maxWorkers: 5
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent requirement', async () => {
      const fakeRoleId = '00000000-0000-0000-0000-000000000000';
      const response = await agent.patch(`/api/products/schedulehub/stations/${stationId}/requirements/${fakeRoleId}`).set('X-CSRF-Token', csrfToken).send({
          priority: 'optional'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/schedulehub/stations/:stationId/requirements/:roleId', () => {
    it('should remove role requirement', async () => {
      const response = await agent.delete(`/api/products/schedulehub/stations/${stationId}/requirements/${roleId}`).set('X-CSRF-Token', csrfToken)

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deletion
      const checkResult = await pool.query(
        'SELECT * FROM scheduling.station_role_requirements WHERE station_id = $1 AND role_id = $2',
        [stationId, roleId]
      );
      expect(checkResult.rows.length).toBe(0);
    });

    it('should return 404 for already removed requirement', async () => {
      const response = await agent.delete(`/api/products/schedulehub/stations/${stationId}/requirements/${roleId}`).set('X-CSRF-Token', csrfToken)

      expect(response.status).toBe(404);
    });
  });

  describe('Organization Isolation', () => {
    it('should not access stations from other organizations', async () => {
      const org2 = await createTestOrganization();

      const response = await agent.get(`/api/products/schedulehub/stations/${stationId}`)
        .set('Authorization', `Bearer ${org2.token}`);

      expect(response.status).toBe(404);

      await cleanupTestData(org2.organizationId);
    });
  });
});

