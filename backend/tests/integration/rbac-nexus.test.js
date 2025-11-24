/**
 * RBAC Integration Tests - Nexus Routes
 * Tests permission enforcement on Nexus product routes
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import pool from '../../src/config/database.js';
import { generateTestToken } from '../helpers/auth.js';

describe('RBAC Integration Tests - Nexus', () => {
  let testOrgId;
  let adminUserId;
  let regularUserId;
  let adminToken;
  let regularUserToken;
  let noPermissionToken;
  let testProductId;

  beforeAll(async () => {
    // Create test organization
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name, slug, status)
      VALUES (gen_random_uuid(), 'RBAC Nexus Test Org', 'rbac-nexus-test', 'active')
      RETURNING id
    `);
    testOrgId = orgResult.rows[0].id;

    // Create admin user
    const adminResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, organization_id, user_role)
      VALUES (gen_random_uuid(), 'nexus-admin@test.com', '$2b$10$dummyhash', $1, 'admin')
      RETURNING id
    `, [testOrgId]);
    adminUserId = adminResult.rows[0].id;

    // Create regular user
    const userResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, organization_id, user_role)
      VALUES (gen_random_uuid(), 'nexus-user@test.com', '$2b$10$dummyhash', $1, 'user')
      RETURNING id
    `, [testOrgId]);
    regularUserId = userResult.rows[0].id;

    // Create test product for testing
    const productResult = await pool.query(`
      INSERT INTO products (id, name, slug, type, status)
      VALUES (gen_random_uuid(), 'Test Product', 'test-product', 'core', 'active')
      RETURNING id
    `);
    testProductId = productResult.rows[0].id;

    // Generate tokens
    adminToken = generateTestToken({
      id: adminUserId,
      email: 'nexus-admin@test.com',
      organizationId: testOrgId,
      role: 'admin',
      permissions: [
        'nexus:products:view',
        'nexus:products:create',
        'nexus:products:edit',
        'nexus:products:delete',
        'nexus:products:manage',
        'nexus:features:view',
        'nexus:features:create',
        'nexus:features:edit',
        'nexus:features:delete',
        'nexus:config:view',
        'nexus:config:edit',
        'nexus:config:delete',
        'nexus:system:view',
        'nexus:system:manage',
        'nexus:admin'
      ]
    });

    regularUserToken = generateTestToken({
      id: regularUserId,
      email: 'nexus-user@test.com',
      organizationId: testOrgId,
      role: 'user',
      permissions: [
        'nexus:products:view',
        'nexus:features:view'
      ]
    });

    noPermissionToken = generateTestToken({
      id: regularUserId,
      email: 'nexus-user@test.com',
      organizationId: testOrgId,
      role: 'user',
      permissions: []
    });
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM products WHERE id = $1', [testProductId]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
    await pool.end();
  });

  describe('Product Routes', () => {
    it('should allow admin to view all products', async () => {
      const response = await request(app)
        .get('/api/products/nexus/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow regular user to view products', async () => {
      const response = await request(app)
        .get('/api/products/nexus/products')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny user without permission from viewing products', async () => {
      const response = await request(app)
        .get('/api/products/nexus/products')
        .set('Authorization', `Bearer ${noPermissionToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow admin to create product', async () => {
      const response = await request(app)
        .post('/api/products/nexus/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Test Product',
          slug: 'new-test-product',
          type: 'addon'
        });

      expect([201, 400, 422]).toContain(response.status);
    });

    it('should deny regular user from creating product', async () => {
      const response = await request(app)
        .post('/api/products/nexus/products')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'New Test Product',
          slug: 'new-test-product',
          type: 'addon'
        });

      expect(response.status).toBe(403);
    });

    it('should allow admin to update product', async () => {
      const response = await request(app)
        .patch(`/api/products/nexus/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Product Name'
        });

      expect([200, 400, 404]).toContain(response.status);
    });

    it('should deny regular user from updating product', async () => {
      const response = await request(app)
        .patch(`/api/products/nexus/products/${testProductId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Updated Product Name'
        });

      expect(response.status).toBe(403);
    });

    it('should allow admin to delete product', async () => {
      const response = await request(app)
        .delete(`/api/products/nexus/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should deny regular user from deleting product', async () => {
      const response = await request(app)
        .delete(`/api/products/nexus/products/${testProductId}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Product Feature Routes', () => {
    it('should allow admin to view features', async () => {
      const response = await request(app)
        .get(`/api/products/nexus/products/${testProductId}/features`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should allow regular user to view features', async () => {
      const response = await request(app)
        .get(`/api/products/nexus/products/${testProductId}/features`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should deny user without permission from viewing features', async () => {
      const response = await request(app)
        .get(`/api/products/nexus/products/${testProductId}/features`)
        .set('Authorization', `Bearer ${noPermissionToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow admin to create feature', async () => {
      const response = await request(app)
        .post(`/api/products/nexus/products/${testProductId}/features`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'test-feature',
          name: 'Test Feature',
          type: 'feature'
        });

      expect([201, 400, 422]).toContain(response.status);
    });

    it('should deny regular user from creating feature', async () => {
      const response = await request(app)
        .post(`/api/products/nexus/products/${testProductId}/features`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          key: 'test-feature',
          name: 'Test Feature'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Product Permission Routes', () => {
    it('should allow admin to view organization products', async () => {
      const response = await request(app)
        .get(`/api/products/nexus/organizations/${testOrgId}/products`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should allow regular user to view organization products', async () => {
      const response = await request(app)
        .get(`/api/products/nexus/organizations/${testOrgId}/products`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should allow admin to grant product access', async () => {
      const response = await request(app)
        .post(`/api/products/nexus/organizations/${testOrgId}/products/${testProductId}/grant`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          licenseType: 'standard',
          maxUsers: 10
        });

      expect([200, 201, 400, 422]).toContain(response.status);
    });

    it('should deny regular user from granting access', async () => {
      const response = await request(app)
        .post(`/api/products/nexus/organizations/${testOrgId}/products/${testProductId}/grant`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          licenseType: 'standard',
          maxUsers: 10
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Product Config Routes', () => {
    it('should allow admin to view configs', async () => {
      const response = await request(app)
        .get(`/api/products/nexus/organizations/${testOrgId}/products/${testProductId}/configs`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should deny user without permission from viewing configs', async () => {
      const response = await request(app)
        .get(`/api/products/nexus/organizations/${testOrgId}/products/${testProductId}/configs`)
        .set('Authorization', `Bearer ${noPermissionToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow admin to set config', async () => {
      const response = await request(app)
        .put(`/api/products/nexus/organizations/${testOrgId}/products/${testProductId}/configs/test-key`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          value: 'test-value'
        });

      expect([200, 201, 400, 422]).toContain(response.status);
    });

    it('should deny regular user from setting config', async () => {
      const response = await request(app)
        .put(`/api/products/nexus/organizations/${testOrgId}/products/${testProductId}/configs/test-key`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          value: 'test-value'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('System Routes', () => {
    it('should allow admin to view system status', async () => {
      const response = await request(app)
        .get('/api/system/products/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should deny regular user from viewing system status', async () => {
      const response = await request(app)
        .get('/api/system/products/status')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow admin to view system health', async () => {
      const response = await request(app)
        .get('/api/system/products/health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 503]).toContain(response.status);
    });

    it('should deny regular user from viewing system health', async () => {
      const response = await request(app)
        .get('/api/system/products/health')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/products/nexus/products');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/products/nexus/products')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});
