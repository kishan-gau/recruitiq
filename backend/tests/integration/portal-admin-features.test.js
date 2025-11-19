/**
 * Portal Admin Features Management Integration Tests
 * 
 * Tests feature catalog management, feature grants, rollout control, and analytics
 * for platform administrators.
 * 
 * Coverage:
 * - Feature CRUD operations (create, read, update, deprecate)
 * - Feature grant management (grant, revoke, sync)
 * - Feature rollout control (percentage-based, targeted)
 * - Usage analytics and adoption reports
 * - Tier-based feature synchronization
 * - Permission-based access control
 * 
 * Run with: npm test -- backend/tests/integration/portal-admin-features.test.js
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import pool from '../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';

describe('Portal Admin Features Management - Integration Tests', () => {
  let adminCookies;
  let viewOnlyCookies;
  let testProductId;
  let testOrganizationId;
  let testFeatureId;
  let testGrantId;

  beforeAll(async () => {
    // Create test product
    const productResult = await pool.query(
      `INSERT INTO products (name, slug, status)
       VALUES ('Test Product', 'test-product-features', 'active')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    testProductId = productResult.rows[0].id;

    // Create test organization
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, slug, tier, subscription_status)
       VALUES ('Feature Test Org', 'feature-test-org', 'professional', 'active')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    testOrganizationId = orgResult.rows[0].id;

    // Create platform admin user with features.manage permission
    await pool.query(
      `INSERT INTO hris.user_account (
        email, password_hash, user_type, organization_id,
        email_verified, account_status, is_active,
        platform_permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO UPDATE 
      SET platform_permissions = EXCLUDED.platform_permissions`,
      [
        'features-admin@recruitiq.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyMVLU0DXZ.i',
        'platform',
        null,
        true,
        'active',
        true,
        JSON.stringify(['portal.view', 'features.manage', 'features.view'])
      ]
    );

    // Create view-only user
    await pool.query(
      `INSERT INTO hris.user_account (
        email, password_hash, user_type, organization_id,
        email_verified, account_status, is_active,
        platform_permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO UPDATE 
      SET platform_permissions = EXCLUDED.platform_permissions`,
      [
        'features-viewer@recruitiq.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyMVLU0DXZ.i',
        'platform',
        null,
        true,
        'active',
        true,
        JSON.stringify(['portal.view', 'features.view'])
      ]
    );

    // Login admin user
    const adminLogin = await request(app)
      .post('/api/auth/platform/login')
      .send({
        email: 'features-admin@recruitiq.com',
        password: 'Admin123!'
      });
    adminCookies = adminLogin.headers['set-cookie'];

    // Login view-only user
    const viewerLogin = await request(app)
      .post('/api/auth/platform/login')
      .send({
        email: 'features-viewer@recruitiq.com',
        password: 'Admin123!'
      });
    viewOnlyCookies = viewerLogin.headers['set-cookie'];
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM organization_feature_grants WHERE organization_id = $1', [testOrganizationId]);
    await pool.query('DELETE FROM features WHERE product_id = $1', [testProductId]);
    await pool.query('DELETE FROM organizations WHERE slug = $1', ['feature-test-org']);
    await pool.query('DELETE FROM products WHERE slug = $1', ['test-product-features']);
    await pool.query(
      `DELETE FROM hris.user_account WHERE email IN ($1, $2)`,
      ['features-admin@recruitiq.com', 'features-viewer@recruitiq.com']
    );
    await pool.end();
  });

  // ============================================================================
  // FEATURE CATALOG MANAGEMENT
  // ============================================================================

  describe('POST /api/admin/features - Create Feature', () => {
    it('should create a new feature with admin permissions', async () => {
      const featureData = {
        productId: testProductId,
        featureKey: 'test_feature_api_access',
        featureName: 'API Access Test Feature',
        description: 'Test feature for API integration testing',
        category: 'integration',
        status: 'active',
        minTier: 'professional',
        isAddOn: false,
        pricing: { monthly: 0, yearly: 0 },
        hasUsageLimit: false,
        rolloutPercentage: 100
      };

      const response = await request(app)
        .post('/api/admin/features')
        .set('Cookie', adminCookies)
        .send(featureData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.feature).toBeDefined();
      expect(response.body.feature.featureKey).toBe('test_feature_api_access');
      expect(response.body.feature.featureName).toBe('API Access Test Feature');
      expect(response.body.feature.minTier).toBe('professional');

      testFeatureId = response.body.feature.id;
    });

    it('should reject feature creation with view-only permissions', async () => {
      const featureData = {
        productId: testProductId,
        featureKey: 'unauthorized_feature',
        featureName: 'Should Fail',
        status: 'active'
      };

      const response = await request(app)
        .post('/api/admin/features')
        .set('Cookie', viewOnlyCookies)
        .send(featureData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject feature creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/admin/features')
        .set('Cookie', adminCookies)
        .send({
          featureName: 'Incomplete Feature'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/validation/i);
    });

    it('should create add-on feature with pricing', async () => {
      const addonData = {
        productId: testProductId,
        featureKey: 'test_addon_premium_support',
        featureName: 'Premium Support Add-on',
        description: 'Premium customer support',
        category: 'support',
        status: 'active',
        minTier: 'starter',
        isAddOn: true,
        pricing: { monthly: 99, yearly: 990 },
        hasUsageLimit: false,
        rolloutPercentage: 100
      };

      const response = await request(app)
        .post('/api/admin/features')
        .set('Cookie', adminCookies)
        .send(addonData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.feature.isAddOn).toBe(true);
      expect(response.body.feature.pricing).toBeDefined();
      expect(response.body.feature.pricing.monthly).toBe(99);
    });

    it('should create feature with usage limits', async () => {
      const limitedFeature = {
        productId: testProductId,
        featureKey: 'test_limited_api_calls',
        featureName: 'Limited API Calls',
        description: 'API access with usage limits',
        category: 'integration',
        status: 'active',
        minTier: 'professional',
        isAddOn: false,
        hasUsageLimit: true,
        defaultUsageLimit: 10000,
        usageLimitUnit: 'calls',
        rolloutPercentage: 100
      };

      const response = await request(app)
        .post('/api/admin/features')
        .set('Cookie', adminCookies)
        .send(limitedFeature)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.feature.hasUsageLimit).toBe(true);
      expect(response.body.feature.defaultUsageLimit).toBe(10000);
      expect(response.body.feature.usageLimitUnit).toBe('calls');
    });
  });

  describe('GET /api/admin/features - List Features', () => {
    it('should list all features with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/features')
        .set('Cookie', adminCookies)
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.features).toBeDefined();
      expect(Array.isArray(response.body.features)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should filter features by product', async () => {
      const response = await request(app)
        .get('/api/admin/features')
        .set('Cookie', adminCookies)
        .query({ productId: testProductId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.features).toBeDefined();
      
      // All features should belong to test product
      if (response.body.features.length > 0) {
        response.body.features.forEach(feature => {
          expect(feature.productId).toBe(testProductId);
        });
      }
    });

    it('should filter features by status', async () => {
      const response = await request(app)
        .get('/api/admin/features')
        .set('Cookie', adminCookies)
        .query({ status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.features.length > 0) {
        response.body.features.forEach(feature => {
          expect(feature.status).toBe('active');
        });
      }
    });

    it('should search features by name', async () => {
      const response = await request(app)
        .get('/api/admin/features')
        .set('Cookie', adminCookies)
        .query({ search: 'API Access' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.features).toBeDefined();
    });

    it('should allow view-only user to list features', async () => {
      const response = await request(app)
        .get('/api/admin/features')
        .set('Cookie', viewOnlyCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/features/:featureId - Get Feature Details', () => {
    it('should get feature by ID', async () => {
      const response = await request(app)
        .get(`/api/admin/features/${testFeatureId}`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.feature).toBeDefined();
      expect(response.body.feature.id).toBe(testFeatureId);
      expect(response.body.feature.featureKey).toBe('test_feature_api_access');
    });

    it('should return 404 for non-existent feature', async () => {
      const fakeId = uuidv4();
      
      const response = await request(app)
        .get(`/api/admin/features/${fakeId}`)
        .set('Cookie', adminCookies)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/admin/features/:featureId - Update Feature', () => {
    it('should update feature details', async () => {
      const updateData = {
        description: 'Updated description for API access',
        status: 'active'
      };

      const response = await request(app)
        .patch(`/api/admin/features/${testFeatureId}`)
        .set('Cookie', adminCookies)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.feature.description).toBe('Updated description for API access');
    });

    it('should reject update with view-only permissions', async () => {
      const response = await request(app)
        .patch(`/api/admin/features/${testFeatureId}`)
        .set('Cookie', viewOnlyCookies)
        .send({ description: 'Should fail' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when updating non-existent feature', async () => {
      const fakeId = uuidv4();

      const response = await request(app)
        .patch(`/api/admin/features/${fakeId}`)
        .set('Cookie', adminCookies)
        .send({ description: 'Should fail' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/admin/features/:featureId/rollout - Update Rollout', () => {
    it('should update feature rollout percentage', async () => {
      const response = await request(app)
        .patch(`/api/admin/features/${testFeatureId}/rollout`)
        .set('Cookie', adminCookies)
        .send({
          percentage: 50,
          targetOrganizations: []
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.feature).toBeDefined();
    });

    it('should update rollout with targeted organizations', async () => {
      const response = await request(app)
        .patch(`/api/admin/features/${testFeatureId}/rollout`)
        .set('Cookie', adminCookies)
        .send({
          percentage: 0,
          targetOrganizations: [testOrganizationId]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid rollout percentage', async () => {
      const response = await request(app)
        .patch(`/api/admin/features/${testFeatureId}/rollout`)
        .set('Cookie', adminCookies)
        .send({
          percentage: 150 // Invalid: > 100
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject rollout update without percentage', async () => {
      const response = await request(app)
        .patch(`/api/admin/features/${testFeatureId}/rollout`)
        .set('Cookie', adminCookies)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/percentage/i);
    });
  });

  describe('POST /api/admin/features/:featureId/deprecate - Deprecate Feature', () => {
    it('should deprecate a feature with message', async () => {
      // Create feature to deprecate
      const featureResult = await pool.query(
        `INSERT INTO features (product_id, feature_key, feature_name, status, min_tier)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [testProductId, 'test_to_deprecate', 'Feature to Deprecate', 'active', 'professional']
      );
      const deprecateFeatureId = featureResult.rows[0].id;

      const response = await request(app)
        .post(`/api/admin/features/${deprecateFeatureId}/deprecate`)
        .set('Cookie', adminCookies)
        .send({
          message: 'This feature is being replaced by a newer version'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.feature).toBeDefined();

      // Cleanup
      await pool.query('DELETE FROM features WHERE id = $1', [deprecateFeatureId]);
    });

    it('should reject deprecation without message', async () => {
      const response = await request(app)
        .post(`/api/admin/features/${testFeatureId}/deprecate`)
        .set('Cookie', adminCookies)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/message/i);
    });

    it('should reject deprecation with view-only permissions', async () => {
      const response = await request(app)
        .post(`/api/admin/features/${testFeatureId}/deprecate`)
        .set('Cookie', viewOnlyCookies)
        .send({ message: 'Should fail' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // FEATURE GRANT MANAGEMENT
  // ============================================================================

  describe('GET /api/admin/organizations/:organizationId/features - List Grants', () => {
    it('should list feature grants for organization', async () => {
      const response = await request(app)
        .get(`/api/admin/organizations/${testOrganizationId}/features`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.organizationId).toBe(testOrganizationId);
      expect(response.body.features).toBeDefined();
      expect(Array.isArray(response.body.features)).toBe(true);
    });

    it('should filter grants by product', async () => {
      const response = await request(app)
        .get(`/api/admin/organizations/${testOrganizationId}/features`)
        .set('Cookie', adminCookies)
        .query({ productId: testProductId })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/admin/organizations/:organizationId/features/grant - Grant Feature', () => {
    it('should grant feature manually to organization', async () => {
      const response = await request(app)
        .post(`/api/admin/organizations/${testOrganizationId}/features/grant`)
        .set('Cookie', adminCookies)
        .send({
          featureId: testFeatureId,
          grantedVia: 'manual_grant',
          reason: 'Testing manual grant'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.grant).toBeDefined();
      expect(response.body.grant.featureId).toBe(testFeatureId);
      expect(response.body.grant.organizationId).toBe(testOrganizationId);

      testGrantId = response.body.grant.id;
    });

    it('should grant trial feature with expiration', async () => {
      const response = await request(app)
        .post(`/api/admin/organizations/${testOrganizationId}/features/grant`)
        .set('Cookie', adminCookies)
        .send({
          featureId: testFeatureId,
          grantedVia: 'trial',
          trialDays: 14
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.grant).toBeDefined();
    });

    it('should reject grant without featureId', async () => {
      const response = await request(app)
        .post(`/api/admin/organizations/${testOrganizationId}/features/grant`)
        .set('Cookie', adminCookies)
        .send({
          grantedVia: 'manual_grant'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/feature|required/i);
    });

    it('should reject grant with view-only permissions', async () => {
      const response = await request(app)
        .post(`/api/admin/organizations/${testOrganizationId}/features/grant`)
        .set('Cookie', viewOnlyCookies)
        .send({
          featureId: testFeatureId,
          grantedVia: 'manual_grant'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/organizations/:organizationId/features/:grantId - Revoke Grant', () => {
    it('should revoke a feature grant', async () => {
      const response = await request(app)
        .delete(`/api/admin/organizations/${testOrganizationId}/features/${testGrantId}`)
        .set('Cookie', adminCookies)
        .send({
          reason: 'Testing revocation'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/revoked/i);
    });

    it('should return 404 when revoking non-existent grant', async () => {
      const fakeId = uuidv4();

      const response = await request(app)
        .delete(`/api/admin/organizations/${testOrganizationId}/features/${fakeId}`)
        .set('Cookie', adminCookies)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject revocation with view-only permissions', async () => {
      const response = await request(app)
        .delete(`/api/admin/organizations/${testOrganizationId}/features/${testGrantId}`)
        .set('Cookie', viewOnlyCookies)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/organizations/:organizationId/features/sync-tier - Sync Tier Features', () => {
    it('should sync features based on tier', async () => {
      const response = await request(app)
        .post(`/api/admin/organizations/${testOrganizationId}/features/sync-tier`)
        .set('Cookie', adminCookies)
        .send({
          productId: testProductId,
          tier: 'professional'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.changes).toBeDefined();
      expect(response.body.changes.added).toBeDefined();
      expect(response.body.changes.removed).toBeDefined();
    });

    it('should reject sync without required fields', async () => {
      const response = await request(app)
        .post(`/api/admin/organizations/${testOrganizationId}/features/sync-tier`)
        .set('Cookie', adminCookies)
        .send({
          productId: testProductId
          // Missing tier
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/tier|required/i);
    });
  });

  describe('POST /api/admin/organizations/:organizationId/features/preview-tier-change - Preview Tier Change', () => {
    it('should preview tier change impact', async () => {
      const response = await request(app)
        .post(`/api/admin/organizations/${testOrganizationId}/features/preview-tier-change`)
        .set('Cookie', adminCookies)
        .send({
          productId: testProductId,
          currentTier: 'starter',
          targetTier: 'professional'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.preview).toBeDefined();
    });

    it('should reject preview without required fields', async () => {
      const response = await request(app)
        .post(`/api/admin/organizations/${testOrganizationId}/features/preview-tier-change`)
        .set('Cookie', adminCookies)
        .send({
          productId: testProductId,
          currentTier: 'starter'
          // Missing targetTier
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should allow view-only user to preview', async () => {
      const response = await request(app)
        .post(`/api/admin/organizations/${testOrganizationId}/features/preview-tier-change`)
        .set('Cookie', viewOnlyCookies)
        .send({
          productId: testProductId,
          currentTier: 'starter',
          targetTier: 'professional'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================================
  // ANALYTICS & REPORTING
  // ============================================================================

  describe('GET /api/admin/features/:featureId/analytics - Get Feature Analytics', () => {
    it('should get analytics for feature', async () => {
      const response = await request(app)
        .get(`/api/admin/features/${testFeatureId}/analytics`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.feature).toBeDefined();
      expect(response.body.analytics).toBeDefined();
      expect(response.body.analytics.period).toBeDefined();
      expect(response.body.analytics.summary).toBeDefined();
    });

    it('should filter analytics by period', async () => {
      const response = await request(app)
        .get(`/api/admin/features/${testFeatureId}/analytics`)
        .set('Cookie', adminCookies)
        .query({ period: '7d' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analytics.period).toBe('7d');
    });

    it('should return 404 for non-existent feature', async () => {
      const fakeId = uuidv4();

      const response = await request(app)
        .get(`/api/admin/features/${fakeId}/analytics`)
        .set('Cookie', adminCookies)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/features/adoption-report - Get Adoption Report', () => {
    it('should get adoption report for all features', async () => {
      const response = await request(app)
        .get('/api/admin/features/adoption-report')
        .set('Cookie', adminCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.features).toBeDefined();
      expect(Array.isArray(response.body.report.features)).toBe(true);
    });

    it('should filter adoption report by product', async () => {
      const response = await request(app)
        .get('/api/admin/features/adoption-report')
        .set('Cookie', adminCookies)
        .query({ productId: testProductId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report.productId).toBe(testProductId);
    });

    it('should include adoption metrics', async () => {
      const response = await request(app)
        .get('/api/admin/features/adoption-report')
        .set('Cookie', adminCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.report.features.length > 0) {
        const feature = response.body.report.features[0];
        expect(feature).toHaveProperty('organizationsUsing');
        expect(feature).toHaveProperty('totalOrganizations');
        expect(feature).toHaveProperty('adoptionRate');
      }
    });
  });

  // ============================================================================
  // AUTHENTICATION & AUTHORIZATION
  // ============================================================================

  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/features')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject tenant user from admin features', async () => {
      // Create tenant user
      await pool.query(
        `INSERT INTO hris.user_account (
          email, password_hash, user_type, organization_id,
          email_verified, account_status, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE SET user_type = EXCLUDED.user_type`,
        [
          'tenant-features@test.com',
          '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyMVLU0DXZ.i',
          'tenant',
          testOrganizationId,
          true,
          'active',
          true
        ]
      );

      const tenantLogin = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: 'tenant-features@test.com',
          password: 'Admin123!'
        });

      if (tenantLogin.status === 200) {
        const tenantCookies = tenantLogin.headers['set-cookie'];

        const response = await request(app)
          .get('/api/admin/features')
          .set('Cookie', tenantCookies)
          .expect(403);

        expect(response.body.success).toBe(false);
      }

      await pool.query('DELETE FROM hris.user_account WHERE email = $1', ['tenant-features@test.com']);
    });
  });
});
