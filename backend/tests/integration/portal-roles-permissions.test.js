/**
 * Portal Roles & Permissions Management Integration Tests
 * 
 * Tests role and permission management endpoints for platform administrators.
 * 
 * Coverage:
 * - Role CRUD operations
 * - Permission management
 * - Role-permission associations
 * - User role assignments
 * - Permission checks
 * - Platform user authorization
 * 
 * Run with: npm test -- backend/tests/integration/portal-roles-permissions.test.js
 */
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import pool from '../../src/config/database.js';
import config from '../../src/config/index.js';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// Use TEST_BACKEND_URL from env, or construct from config.port
const API_URL = process.env.TEST_BACKEND_URL || `http://localhost:${config.port}`;

// Test variables for authentication
let platformAdminAgent, viewOnlyAgent;
let platformAdminCsrfToken, viewOnlyCsrfToken;

/**
 * Wait for server to be ready by polling health endpoint
 */
async function waitForServer(timeout = 45000) {
  const startTime = Date.now();
  let lastError = null;
  
  console.log(`⏳ Waiting for server at ${API_URL}/health (timeout: ${timeout}ms)`);
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        console.log(`✅ Server health check passed after ${Date.now() - startTime}ms`);
        return true;
      }
      lastError = `Health check returned ${response.status}`;
    } catch (error) {
      lastError = error.message;
      // Server not ready yet, continue polling
    }
    
    // Wait 1 second before next attempt
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.error(`❌ Server health check timeout after ${timeout}ms. Last error: ${lastError}`);
  return false;
}

describe('Portal Roles & Permissions Management - Integration Tests', () => {
  let serverProcess;
  let testRoleId;
  let testPermissionId;
  
  // Increase timeout for spawned server tests
  jest.setTimeout(60000);
  
  beforeAll(async () => {
    console.log('🚀 Starting backend server in separate process...');
    
    // Spawn server process like E2E tests do
    const serverPath = join(__dirname, '../../src/server.js');
    
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: 'integration', // Use integration mode to actually start the server
        PORT: config.port.toString()
      },
      stdio: 'pipe' // Capture output
    });
    
    // Capture server logs for debugging
    serverProcess.stdout.on('data', (data) => {
      console.log('Server stdout:', data.toString());
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
    
    serverProcess.on('error', (error) => {
      console.error('Failed to start server process:', error);
    });
    
    // Wait for server with extended timeout for initialization
    const ready = await waitForServer(45000);
    
    if (!ready) {
      if (serverProcess) serverProcess.kill();
      throw new Error('Server failed to start within 45 seconds');
    }
    
    console.log(`✅ Backend server ready at ${API_URL}`);
    
    // Create agents with URL (spawned server pattern)
    platformAdminAgent = request.agent(API_URL);
    viewOnlyAgent = request.agent(API_URL);
    
    // Create platform admin with roles.manage permission
    await pool.query(
      `INSERT INTO platform_users (
        email, password_hash, name, role,
        email_verified, is_active, permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE 
      SET permissions = EXCLUDED.permissions`,
      [
        'roles-admin@recruitiq.com',
        '$2b$12$Bdji807hkSW5GAwouFnc3unDiqj29iWxeEfGQt6l0GwqedVZB7ciS',
        'Roles Admin',
        'admin',
        true,
        true,
        JSON.stringify(['portal.view', 'portal.manage', 'roles.manage', 'permissions.manage'])
      ]
    );
    // Create view-only platform user
    await pool.query(
      `INSERT INTO platform_users (
        email, password_hash, name, role,
        email_verified, is_active, permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE 
      SET permissions = EXCLUDED.permissions`,
      [
        'roles-viewer@recruitiq.com',
        '$2b$12$Bdji807hkSW5GAwouFnc3unDiqj29iWxeEfGQt6l0GwqedVZB7ciS',
        'Roles Viewer',
        'viewer',
        true,
        true,
        JSON.stringify(['portal.view'])
      ]
    );
    
    // ===== Platform Admin Authentication =====
    // Login admin user (agent maintains session cookies automatically)
    const adminLoginRes = await platformAdminAgent
      .post('/api/auth/platform/login')
      .send({
        email: 'roles-admin@recruitiq.com',
        password: 'Admin123!'
      });
    
    if (adminLoginRes.status !== 200) {
      throw new Error(`Admin login failed: ${adminLoginRes.status} - ${JSON.stringify(adminLoginRes.body)}`);
    }
    
    // Get CSRF token for admin
    const adminCsrfRes = await platformAdminAgent.get('/api/csrf-token');
    platformAdminCsrfToken = adminCsrfRes.body.csrfToken;
    
    if (!platformAdminCsrfToken) {
      throw new Error('Admin CSRF token is undefined!');
    }
    
    expect(adminLoginRes.body.user).toBeDefined();
    console.log('✅ Platform admin authenticated with supertest agent');
    
    // ===== View-Only User Authentication =====
    // Login view-only user
    const viewerLoginRes = await viewOnlyAgent
      .post('/api/auth/platform/login')
      .send({
        email: 'roles-viewer@recruitiq.com',
        password: 'Admin123!'
      });
    
    if (viewerLoginRes.status !== 200) {
      throw new Error(`Viewer login failed: ${viewerLoginRes.status} - ${JSON.stringify(viewerLoginRes.body)}`);
    }
    
    // Get CSRF token for viewer
    const viewerCsrfRes = await viewOnlyAgent.get('/api/csrf-token');
    viewOnlyCsrfToken = viewerCsrfRes.body.csrfToken;
    
    if (!viewOnlyCsrfToken) {
      throw new Error('Viewer CSRF token is undefined!');
    }
    
    expect(viewerLoginRes.body.user).toBeDefined();
    console.log('✅ View-only user authenticated with supertest agent');
  });
  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [testRoleId]);
    await pool.query('DELETE FROM roles WHERE id = $1', [testRoleId]);
    await pool.query('DELETE FROM permissions WHERE id = $1', [testPermissionId]);
    await pool.query(
      `DELETE FROM platform_users WHERE email IN ($1, $2)`,
      ['roles-admin@recruitiq.com', 'roles-viewer@recruitiq.com']
    );
    
    // Stop spawned server process
    if (serverProcess) {
      serverProcess.kill();
      // Wait for process to exit
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    await pool.end();
  });
  // ============================================================================
  // ROLES MANAGEMENT
  // ============================================================================
  describe('GET /api/portal/roles - List Roles', () => {
    it('should list all roles with user and permission counts', async () => {
      const response = await platformAdminClient.get('/api/portal/roles', {
        headers: { 'X-CSRF-Token': platformAdminCsrfToken }
      });
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.roles).toBeDefined();
      expect(Array.isArray(response.data.roles)).toBe(true);
      if (response.data.roles.length > 0) {
        const role = response.data.roles[0];
        expect(role).toHaveProperty('id');
        expect(role).toHaveProperty('name');
        expect(role).toHaveProperty('displayName');
        expect(role).toHaveProperty('userCount');
        expect(role).toHaveProperty('permissionCount');
        expect(role).toHaveProperty('permissions');
      }
    });
    it('should allow view-only user to list roles', async () => {
      const response = await platformAdminAgent
        .get('/api/portal/roles')
        .expect(200);
      expect(response.body.success).toBe(true);
    });
    it('should order roles by level and name', async () => {
      const response = await platformAdminClient.get('/api/portal/roles', {
        headers: { 'X-CSRF-Token': platformAdminCsrfToken }
      });
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      // Check ordering (higher level first)
      if (response.data.roles.length > 1) {
        const levels = response.data.roles.map(r => r.level);
        for (let i = 0; i < levels.length - 1; i++) {
          expect(levels[i]).toBeGreaterThanOrEqual(levels[i + 1]);
        }
      }
    });
  });
  describe('GET /api/portal/roles/:id - Get Role Details', () => {
    beforeAll(async () => {
      // Create test role
      const roleResult = await pool.query(
        `INSERT INTO roles (name, display_name, description, role_type, level)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['test_role_api', 'Test API Role', 'Role for API testing', 'platform', 5]
      );
      testRoleId = roleResult.rows[0].id;
    });
    it('should get role by ID with permissions', async () => {
      const response = await platformAdminAgent
        .get(`/api/portal/roles/${testRoleId}`)
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.role).toBeDefined();
      expect(response.body.role.id).toBe(testRoleId);
      expect(response.body.role.name).toBe('test_role_api');
      expect(response.body.role.displayName).toBe('Test API Role');
      expect(response.body.role.permissions).toBeDefined();
      expect(response.body.role.permissionIds).toBeDefined();
    });
    it('should return 404 for non-existent role', async () => {
      const fakeId = uuidv4();
      const response = await platformAdminAgent
        .get(`/api/portal/roles/${fakeId}`)
        .expect(404);
      expect(response.body.success).toBe(false);
    });
  });
  describe('POST /api/portal/roles - Create Role', () => {
    it('should create new role with admin permissions', async () => {
      const roleData = {
        name: 'test_custom_role',
        displayName: 'Test Custom Role',
        description: 'Custom role for testing',
        roleType: 'custom',
        level: 3
      };
      const response = await platformAdminAgent
        .post('/api/portal/roles')
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .send(roleData)
        .expect(201);
      expect(response.body.success).toBe(true);
      expect(response.body.role).toBeDefined();
      expect(response.body.role.name).toBe('test_custom_role');
      expect(response.body.role.displayName).toBe('Test Custom Role');
      // Cleanup
      await pool.query('DELETE FROM roles WHERE id = $1', [response.body.role.id]);
    });
    it('should reject role creation with view-only permissions', async () => {
      const roleData = {
        name: 'should_fail',
        displayName: 'Should Fail',
        roleType: 'custom'
      };
      const response = await platformAdminAgent
        .post('/api/portal/roles')
        .set('X-CSRF-Token', viewOnlyCsrfToken)
        .send(roleData)
        .expect(403);
      expect(response.body.success).toBe(false);
    });
    it('should reject duplicate role name', async () => {
      const roleData = {
        name: 'test_role_api', // Already exists
        displayName: 'Duplicate Role',
        roleType: 'custom'
      };
      const response = await platformAdminAgent
        .post('/api/portal/roles')
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .send(roleData)
        .expect(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/exists|duplicate/i);
    });
    it('should reject missing required fields', async () => {
      const roleData = {
        displayName: 'Missing Name'
        // Missing name field
      };
      const response = await platformAdminAgent
        .post('/api/portal/roles')
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .send(roleData)
        .expect(400);
      expect(response.body.success).toBe(false);
    });
  });
  describe('PATCH /api/portal/roles/:id - Update Role', () => {
    it('should update role details', async () => {
      const updateData = {
        displayName: 'Updated Test Role',
        description: 'Updated description',
        level: 6
      };
      const response = await platformAdminAgent
        .patch(`/api/portal/roles/${testRoleId}`)
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .send(updateData)
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.role.displayName).toBe('Updated Test Role');
      expect(response.body.role.description).toBe('Updated description');
    });
    it('should reject update with view-only permissions', async () => {
      const response = await platformAdminAgent
        .patch(`/api/portal/roles/${testRoleId}`)
        .set('X-CSRF-Token', viewOnlyCsrfToken)
        .send({ displayName: 'Should Fail' })
        .expect(403);
      expect(response.body.success).toBe(false);
    });
    it('should return 404 for non-existent role', async () => {
      const fakeId = uuidv4();
      const response = await platformAdminAgent
        .patch(`/api/portal/roles/${fakeId}`)
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .send({ displayName: 'Test' })
        .expect(404);
      expect(response.body.success).toBe(false);
    });
  });
  describe('DELETE /api/portal/roles/:id - Delete Role', () => {
    it('should soft delete role', async () => {
      // Create role to delete
      const roleResult = await pool.query(
        `INSERT INTO roles (name, display_name, role_type, level)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['role_to_delete', 'Role to Delete', 'platform', 3]
      );
      const deleteRoleId = roleResult.rows[0].id;
      const response = await platformAdminAgent
        .delete(`/api/portal/roles/${deleteRoleId}`)
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/deleted/i);
      // Verify soft delete
      const checkResult = await pool.query(
        'SELECT deleted_at FROM roles WHERE id = $1',
        [deleteRoleId]
      );
      expect(checkResult.rows[0].deleted_at).not.toBeNull();
      // Cleanup
      await pool.query('DELETE FROM roles WHERE id = $1', [deleteRoleId]);
    });
    it('should prevent deletion of system roles', async () => {
      // Assuming 'admin' is a system/platform role
      const systemRoleResult = await pool.query(
        "SELECT id FROM roles WHERE role_type = 'platform' LIMIT 1"
      );
      if (systemRoleResult.rows.length > 0) {
        const systemRoleId = systemRoleResult.rows[0].id;
        const response = await platformAdminAgent
          .delete(`/api/portal/roles/${systemRoleId}`)
          .set('X-CSRF-Token', platformAdminCsrfToken)
          .expect(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toMatch(/system|protected/i);
      }
    });
    it('should reject deletion with view-only permissions', async () => {
      const response = await platformAdminAgent
        .delete(`/api/portal/roles/${testRoleId}`)
        .set('X-CSRF-Token', viewOnlyCsrfToken)
        .expect(403);
      expect(response.body.success).toBe(false);
    });
  });
  // ============================================================================
  // PERMISSIONS MANAGEMENT
  // ============================================================================
  describe('GET /api/portal/permissions - List Permissions', () => {
    it('should list all permissions', async () => {
      const response = await platformAdminAgent
        .get('/api/portal/permissions')
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.permissions).toBeDefined();
      expect(Array.isArray(response.body.permissions)).toBe(true);
      if (response.body.permissions.length > 0) {
        const permission = response.body.permissions[0];
        expect(permission).toHaveProperty('id');
        expect(permission).toHaveProperty('name');
        expect(permission).toHaveProperty('displayName');
        expect(permission).toHaveProperty('category');
      }
    });
    it('should filter permissions by category', async () => {
      const response = await platformAdminAgent
        .get('/api/portal/permissions')
        .query({ category: 'portal' })
        .expect(200);
      expect(response.body.success).toBe(true);
      if (response.body.permissions.length > 0) {
        response.body.permissions.forEach(permission => {
          expect(permission.category).toBe('portal');
        });
      }
    });
    it('should group permissions by category', async () => {
      const response = await platformAdminAgent
        .get('/api/portal/permissions')
        .query({ grouped: true })
        .expect(200);
      expect(response.body.success).toBe(true);
      if (response.body.grouped) {
        expect(response.body.grouped).toBeInstanceOf(Object);
        // Should have categories as keys
      }
    });
  });
  describe('POST /api/portal/permissions - Create Permission', () => {
    it('should create new permission', async () => {
      const permissionData = {
        name: 'test.custom.permission',
        displayName: 'Test Custom Permission',
        description: 'Custom permission for testing',
        category: 'testing'
      };
      const response = await platformAdminAgent
        .post('/api/portal/permissions')
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .send(permissionData)
        .expect(201);
      expect(response.body.success).toBe(true);
      expect(response.body.permission).toBeDefined();
      expect(response.body.permission.name).toBe('test.custom.permission');
      testPermissionId = response.body.permission.id;
    });
    it('should reject duplicate permission name', async () => {
      const permissionData = {
        name: 'test.custom.permission', // Already exists
        displayName: 'Duplicate',
        category: 'testing'
      };
      const response = await platformAdminAgent
        .post('/api/portal/permissions')
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .send(permissionData)
        .expect(400);
      expect(response.body.success).toBe(false);
    });
    it('should reject creation with view-only permissions', async () => {
      const permissionData = {
        name: 'should.fail',
        displayName: 'Should Fail',
        category: 'testing'
      };
      const response = await platformAdminAgent
        .post('/api/portal/permissions')
        .set('X-CSRF-Token', viewOnlyCsrfToken)
        .send(permissionData)
        .expect(403);
      expect(response.body.success).toBe(false);
    });
  });
  // ============================================================================
  // ROLE-PERMISSION ASSOCIATIONS
  // ============================================================================
  describe('POST /api/portal/roles/:roleId/permissions - Assign Permissions to Role', () => {
    it('should assign permissions to role', async () => {
      const response = await platformAdminAgent
        .post(`/api/portal/roles/${testRoleId}/permissions`)
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .send({
          permissionIds: [testPermissionId]
        })
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/assigned/i);
    });
    it('should assign multiple permissions at once', async () => {
      // Get some existing permission IDs
      const permissionsResult = await pool.query(
        'SELECT id FROM permissions LIMIT 3'
      );
      const permissionIds = permissionsResult.rows.map(r => r.id);
      if (permissionIds.length > 0) {
        const response = await platformAdminAgent
          .post(`/api/portal/roles/${testRoleId}/permissions`)
          .set('X-CSRF-Token', platformAdminCsrfToken)
          .send({
            permissionIds
          })
          .expect(200);
        expect(response.body.success).toBe(true);
      }
    });
    it('should reject assignment with view-only permissions', async () => {
      const response = await platformAdminAgent
        .post(`/api/portal/roles/${testRoleId}/permissions`)
        .set('X-CSRF-Token', viewOnlyCsrfToken)
        .send({
          permissionIds: [testPermissionId]
        })
        .expect(403);
      expect(response.body.success).toBe(false);
    });
    it('should reject empty permission array', async () => {
      const response = await platformAdminAgent
        .post(`/api/portal/roles/${testRoleId}/permissions`)
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .send({
          permissionIds: []
        })
        .expect(400);
      expect(response.body.success).toBe(false);
    });
  });
  describe('DELETE /api/portal/roles/:roleId/permissions/:permissionId - Remove Permission from Role', () => {
    it('should remove permission from role', async () => {
      const response = await platformAdminAgent
        .delete(`/api/portal/roles/${testRoleId}/permissions/${testPermissionId}`)
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/removed/i);
    });
    it('should return 404 when removing non-existent association', async () => {
      const fakePermId = uuidv4();
      const response = await platformAdminAgent
        .delete(`/api/portal/roles/${testRoleId}/permissions/${fakePermId}`)
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .expect(404);
      expect(response.body.success).toBe(false);
    });
    it('should reject removal with view-only permissions', async () => {
      const response = await platformAdminAgent
        .delete(`/api/portal/roles/${testRoleId}/permissions/${testPermissionId}`)
        .set('X-CSRF-Token', viewOnlyCsrfToken)
        .expect(403);
      expect(response.body.success).toBe(false);
    });
  });
  // ============================================================================
  // USER ROLE ASSIGNMENTS
  // ============================================================================
  describe('POST /api/portal/users/:userId/role - Assign Role to User', () => {
    let testUserId;
    beforeAll(async () => {
      // Create test platform user
      const userResult = await pool.query(
        `INSERT INTO platform_users (
          email, password_hash, name, role,
          email_verified, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
        RETURNING id`,
        [
          'role-test-user@recruitiq.com',
          '$2b$12$Bdji807hkSW5GAwouFnc3unDiqj29iWxeEfGQt6l0GwqedVZB7ciS',
          'Role Test User',
          'viewer',
          true,
          true
        ]
      );
      testUserId = userResult.rows[0].id;
    });
    afterAll(async () => {
      await pool.query('DELETE FROM platform_users WHERE id = $1', [testUserId]);
    });
    it('should assign role to user', async () => {
      const response = await platformAdminAgent
        .post(`/api/portal/users/${testUserId}/role`)
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .send({
          roleId: testRoleId
        })
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/assigned/i);
    });
    it('should update user role', async () => {
      // Get another role
      const roleResult = await pool.query(
        'SELECT id FROM roles WHERE id != $1 LIMIT 1',
        [testRoleId]
      );
      if (roleResult.rows.length > 0) {
        const newRoleId = roleResult.rows[0].id;
        const response = await platformAdminAgent
          .post(`/api/portal/users/${testUserId}/role`)
          .set('X-CSRF-Token', platformAdminCsrfToken)
          .send({
            roleId: newRoleId
          })
          .expect(200);
        expect(response.body.success).toBe(true);
      }
    });
    it('should reject assignment with view-only permissions', async () => {
      const response = await platformAdminAgent
        .post(`/api/portal/users/${testUserId}/role`)
        .set('X-CSRF-Token', viewOnlyCsrfToken)
        .send({
          roleId: testRoleId
        })
        .expect(403);
      expect(response.body.success).toBe(false);
    });
    it('should return 404 for non-existent user', async () => {
      const fakeUserId = uuidv4();
      const response = await platformAdminAgent
        .post(`/api/portal/users/${fakeUserId}/role`)
        .set('X-CSRF-Token', platformAdminCsrfToken)
        .send({
          roleId: testRoleId
        })
        .expect(404);
      expect(response.body.success).toBe(false);
    });
  });
  // ============================================================================
  // AUTHENTICATION & AUTHORIZATION
  // ============================================================================
  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      // Use fresh agent without authentication
      const response = await request(API_URL)
        .get('/api/portal/roles')
        .expect(401);
      expect(response.body.success).toBe(false);
    });
    it('should reject tenant users from roles management', async () => {
      // Create test organization and tenant user
      const orgResult = await pool.query(
        `INSERT INTO organizations (name, slug, tier, subscription_status)
         VALUES ('Roles Test Org', 'roles-test-tenant', 'professional', 'active')
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`
      );
      const orgId = orgResult.rows[0].id;
      await pool.query(
        `INSERT INTO hris.user_account (
          email, password_hash, name, organization_id,
          email_verified, account_status, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (organization_id, email) DO UPDATE SET name = EXCLUDED.name`,
        [
          'tenant-roles-test@test.com',
          '$2b$12$Bdji807hkSW5GAwouFnc3unDiqj29iWxeEfGQt6l0GwqedVZB7ciS',
          'Tenant Test User',
          orgId,
          true,
          'active',
          true
        ]
      );
      const tenantLogin = await platformAdminAgent
        .post('/api/auth/login')
        .send({
          email: 'tenant-roles-test@test.com',
          password: 'Admin123!',
          organizationId: orgId
        });
      if (tenantLogin.status === 200) {
        const tenantCookies = tenantLogin.headers['set-cookie'];
        const response = await platformAdminAgent
          .get('/api/portal/roles')
          .expect(403);
        expect(response.body.success).toBe(false);
      }
      // Cleanup
      await pool.query('DELETE FROM hris.user_account WHERE email = $1', ['tenant-roles-test@test.com']);
      await pool.query('DELETE FROM organizations WHERE slug = $1', ['roles-test-tenant']);
    });
  });
});



