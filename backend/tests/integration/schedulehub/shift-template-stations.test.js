import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import createApp from '../../../src/app.js';
import config from '../../../src/config/index.js';
import logger from '../../../src/utils/logger.js';
import pool from '../../../src/config/database.js';

describe('Shift Template Stations - Integration Tests', () => {
  let app;
  let authCookie;
  let testOrgId;
  let testUserId;
  let testTemplateId;
  const testStationIds = [];

  beforeAll(async () => {
    // Create simple database health check function
    const dbHealthCheck = async () => {
      const result = await pool.query('SELECT 1');
      return result.rows[0];
    };

    // Initialize Express app for testing with required dependencies
    app = createApp({ config, logger, dbHealthCheck, dynamicProductRouter: null });
    
    // Create test organization with unique slug
    const uniqueSuffix = Date.now();
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name, slug)
      VALUES (gen_random_uuid(), $1, $2)
      RETURNING id
    `, [`Test Org Shift Templates ${uniqueSuffix}`, `test-org-shift-templates-${uniqueSuffix}`]);
    testOrgId = orgResult.rows[0].id;

    // Create test user
    const userResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, organization_id, product_roles)
      VALUES (gen_random_uuid(), 'test-shift-template@example.com', '$2b$10$dummyhash', $1, '{"schedulehub": "admin"}')
      RETURNING id
    `, [testOrgId]);
    testUserId = userResult.rows[0].id;

    // Set up RBAC permissions for test user to access shift template endpoints
    // 1. Create or get role ID
    const roleResult = await pool.query(`
      INSERT INTO public.roles (name, organization_id, description, display_name, role_type)
      VALUES ('Shift Template Manager', $1, 'Manage shift templates', 'Shift Template Manager', 'tenant')
      ON CONFLICT (name, organization_id) DO UPDATE SET id = EXCLUDED.id
      RETURNING id
    `, [testOrgId]);
    const roleId = roleResult.rows[0].id;

    // 2. Create or get permission ID
    const permResult = await pool.query(`
      INSERT INTO public.permissions (name, product, category, description, display_name)
      VALUES ('scheduling:shift_templates:manage', 'schedulehub', 'shift_templates', 'Manage shift templates', 'Manage Shift Templates')
      ON CONFLICT (product, name) DO NOTHING
      RETURNING id
    `, []);
    
    // If the permission already existed, DO NOTHING doesn't return anything, so fetch the existing ID
    let permissionId;
    if (permResult.rows.length === 0) {
      const existingPerm = await pool.query(`
        SELECT id FROM public.permissions WHERE product = $1 AND name = $2
      `, ['schedulehub', 'scheduling:shift_templates:manage']);
      permissionId = existingPerm.rows[0].id;
    } else {
      permissionId = permResult.rows[0].id;
    }

    // 3. Link role to permission
    await pool.query(`
      INSERT INTO public.role_permissions (role_id, permission_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [roleId, permissionId]);

    // 4. Assign role to test user
    await pool.query(`
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [testUserId, roleId]);

    // Create test stations
    for (let i = 1; i <= 3; i++) {
      const stationResult = await pool.query(`
        INSERT INTO scheduling.stations (id, station_code, station_name, description, organization_id)
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
        RETURNING id
      `, [`STATION_${i}`, `Test Station ${i}`, `Station ${i} for testing`, testOrgId]);
      testStationIds.push(stationResult.rows[0].id);
    }

    // Create test shift template
    const templateResult = await pool.query(`
      INSERT INTO scheduling.shift_templates (
        id, template_name, description, start_time, end_time, 
        duration_minutes, organization_id, created_by
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      'Test Template for Stations',
      'Template for testing station assignments',
      '09:00:00',
      '17:00:00',
      480,
      testOrgId,
      testUserId
    ]);
    testTemplateId = templateResult.rows[0].id;

    // Login to get auth cookie (following testing standards)
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test-shift-template@example.com',
        password: 'test-password'
      });

    if (loginResponse.headers['set-cookie']) {
      authCookie = loginResponse.headers['set-cookie'];
    } else {
      // Fallback: Generate signed JWT token if login endpoint not available
      // This follows testing standards for when login is unavailable
      const token = jwt.sign(
        {
          id: testUserId,
          organizationId: testOrgId,
          type: 'tenant'
        },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
      );
      authCookie = [`tenant_access_token=${token}; HttpOnly; Secure`];
    }
  });

  afterAll(async () => {
    // Clean up test data in correct order (respecting foreign keys)
    await pool.query('DELETE FROM scheduling.shift_template_stations WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.shift_templates WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.stations WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
    
    // CRITICAL: Close database connection to allow test exit (per TESTING_STANDARDS.md)
    await pool.end();
    
    // Close database connection
    await pool.end();
  });

  describe('PATCH /api/products/schedulehub/shift-templates/:id - Station Assignment', () => {
    it('should assign stations to shift template', async () => {
      const updateData = {
        stationIds: [testStationIds[0], testStationIds[1]]
      };

      const response = await request(app)
        .patch(`/api/products/schedulehub/shift-templates/${testTemplateId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      // Verify response
      expect(response.body.success).toBe(true);
      expect(response.body.shiftTemplate).toBeDefined();
      expect(response.body.shiftTemplate.id).toBe(testTemplateId);

      // Verify stations were assigned in junction table
      const junctionResult = await pool.query(`
        SELECT station_id FROM scheduling.shift_template_stations 
        WHERE shift_template_id = $1 AND organization_id = $2 AND deleted_at IS NULL
        ORDER BY station_id
      `, [testTemplateId, testOrgId]);

      expect(junctionResult.rows).toHaveLength(2);
      const assignedStationIds = junctionResult.rows.map(row => row.station_id);
      expect(assignedStationIds).toContain(testStationIds[0]);
      expect(assignedStationIds).toContain(testStationIds[1]);
    });

    it('should update station assignments', async () => {
      // First assign initial stations
      await pool.query(`
        INSERT INTO scheduling.shift_template_stations (shift_template_id, station_id, organization_id, created_by)
        VALUES ($1, $2, $3, $4), ($1, $5, $3, $4)
      `, [testTemplateId, testStationIds[0], testOrgId, testUserId, testStationIds[1]]);

      // Update to different stations
      const updateData = {
        stationIds: [testStationIds[1], testStationIds[2]] // Keep station 2, remove station 1, add station 3
      };

      const response = await request(app)
        .patch(`/api/products/schedulehub/shift-templates/${testTemplateId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      // Verify response
      expect(response.body.success).toBe(true);

      // Verify old assignments are removed and new ones added
      const junctionResult = await pool.query(`
        SELECT station_id FROM scheduling.shift_template_stations 
        WHERE shift_template_id = $1 AND organization_id = $2 AND deleted_at IS NULL
        ORDER BY station_id
      `, [testTemplateId, testOrgId]);

      expect(junctionResult.rows).toHaveLength(2);
      const assignedStationIds = junctionResult.rows.map(row => row.station_id);
      expect(assignedStationIds).not.toContain(testStationIds[0]); // Removed
      expect(assignedStationIds).toContain(testStationIds[1]);     // Kept
      expect(assignedStationIds).toContain(testStationIds[2]);     // Added
    });

    it('should clear all station assignments when empty array provided', async () => {
      // First assign stations
      await pool.query(`
        INSERT INTO scheduling.shift_template_stations (shift_template_id, station_id, organization_id, created_by)
        VALUES ($1, $2, $3, $4), ($1, $5, $3, $4)
        ON CONFLICT DO NOTHING
      `, [testTemplateId, testStationIds[0], testOrgId, testUserId, testStationIds[1]]);

      // Clear all assignments
      const updateData = {
        stationIds: []
      };

      const response = await request(app)
        .patch(`/api/products/schedulehub/shift-templates/${testTemplateId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      // Verify response
      expect(response.body.success).toBe(true);

      // Verify no stations are assigned
      const junctionResult = await pool.query(`
        SELECT station_id FROM scheduling.shift_template_stations 
        WHERE shift_template_id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `, [testTemplateId, testOrgId]);

      expect(junctionResult.rows).toHaveLength(0);
    });

    it('should work when stationIds is not provided', async () => {
      const updateData = {
        templateName: 'Updated Name Only'
      };

      const response = await request(app)
        .patch(`/api/products/schedulehub/shift-templates/${testTemplateId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.shiftTemplate.templateName).toBe('Updated Name Only');
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .patch(`/api/products/schedulehub/shift-templates/${fakeId}`)
        .set('Cookie', authCookie)
        .send({ stationIds: [testStationIds[0]] })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid station IDs', async () => {
      const updateData = {
        stationIds: ['invalid-uuid']
      };

      const response = await request(app)
        .patch(`/api/products/schedulehub/shift-templates/${testTemplateId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/products/schedulehub/shift-templates/:id - With Stations', () => {
    it('should return template with assigned stations', async () => {
      // Assign stations to template
      await pool.query(`
        INSERT INTO scheduling.shift_template_stations (shift_template_id, station_id, organization_id, created_by)
        VALUES ($1, $2, $3, $4), ($1, $5, $3, $4)
        ON CONFLICT DO NOTHING
      `, [testTemplateId, testStationIds[0], testOrgId, testUserId, testStationIds[1]]);

      const response = await request(app)
        .get(`/api/products/schedulehub/shift-templates/${testTemplateId}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.shiftTemplate).toBeDefined();
      expect(response.body.shiftTemplate.stations).toBeInstanceOf(Array);
      expect(response.body.shiftTemplate.stations).toHaveLength(2);
      
      // Verify station details are included
      const stationIds = response.body.shiftTemplate.stations.map(s => s.id);
      expect(stationIds).toContain(testStationIds[0]);
      expect(stationIds).toContain(testStationIds[1]);
    });
  });
});