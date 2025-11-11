/**
 * API Standards Compliance Tests for Pay Components
 * 
 * These tests verify that pay component endpoints follow documented API standards:
 * - Resource-specific keys (payComponent/payComponents) NOT generic "data"
 * - Proper HTTP status codes
 * - Consistent response structure
 * - camelCase field naming
 * 
 * Reference: docs/API_STANDARDS.md
 */

import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';

describe('Pay Component API Standards Compliance', () => {
  let authToken;
  let organizationId;
  let userId;
  let testComponentId;

  beforeAll(async () => {
    // Create test organization
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
      ['API Standards Test Org', 'api-standards-test-org']
    );
    organizationId = orgResult.rows[0].id;

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, organization_id, legacy_role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['api-standards@test.com', 'dummy_hash', 'API Standards Test User', organizationId, 'admin']
    );
    userId = userResult.rows[0].id;

    authToken = `Bearer test-token-${userId}`;
  });

  afterAll(async () => {
    // Cleanup test data
    if (organizationId) {
      await pool.query(`DELETE FROM payroll.pay_component WHERE organization_id = $1`, [organizationId]);
      await pool.query(`DELETE FROM users WHERE organization_id = $1`, [organizationId]);
      await pool.query(`DELETE FROM organizations WHERE id = $1`, [organizationId]);
    }
  });

  describe('POST /api/paylinq/pay-components - Create', () => {
    it('should return resource-specific key "payComponent" NOT generic "data"', async () => {
      const payload = {
        name: 'API Standards Test',
        code: 'API_STANDARDS_TEST',
        type: 'earning',
        category: 'regular',
        calculationType: 'fixed',
        defaultValue: 1000,
        isRecurring: true,
        isTaxable: true
      };

      const response = await request(app)
        .post('/api/paylinq/pay-components')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload)
        .expect(201);

      // ✅ CORRECT: Resource-specific key
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('payComponent');
      expect(response.body).toHaveProperty('message');
      
      // ❌ WRONG: Generic "data" key
      expect(response.body).not.toHaveProperty('data');

      // Verify response contains all expected fields in camelCase
      const { payComponent } = response.body;
      expect(payComponent).toHaveProperty('id');
      expect(payComponent).toHaveProperty('name', 'API Standards Test');
      expect(payComponent).toHaveProperty('code', 'API_STANDARDS_TEST');
      expect(payComponent).toHaveProperty('type', 'earning');
      expect(payComponent).toHaveProperty('calculationType', 'fixed'); // camelCase
      expect(payComponent).toHaveProperty('defaultValue', 1000);
      expect(payComponent).toHaveProperty('isRecurring', true); // camelCase
      expect(payComponent).toHaveProperty('isTaxable', true); // camelCase

      // ❌ Should NOT have snake_case fields
      expect(payComponent).not.toHaveProperty('calculation_type');
      expect(payComponent).not.toHaveProperty('default_value');
      expect(payComponent).not.toHaveProperty('is_recurring');

      testComponentId = payComponent.id;
    });

    it('should return 201 Created status code', async () => {
      const payload = {
        name: 'Status Code Test',
        code: 'STATUS_CODE_TEST',
        type: 'earning',
        category: 'bonus',
        calculationType: 'fixed',
        defaultValue: 500
      };

      const response = await request(app)
        .post('/api/paylinq/pay-components')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(201);
      
      // Cleanup
      if (response.body.payComponent?.id) {
        await request(app)
          .delete(`/api/paylinq/pay-components/${response.body.payComponent.id}`)
          .set('Authorization', `Bearer ${authToken}`);
      }
    });
  });

  describe('GET /api/paylinq/pay-components - List', () => {
    it('should return resource-specific key "payComponents" (plural) NOT generic "data"', async () => {
      const response = await request(app)
        .get('/api/paylinq/pay-components')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // ✅ CORRECT: Resource-specific plural key
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('payComponents');
      expect(Array.isArray(response.body.payComponents)).toBe(true);
      
      // ❌ WRONG: Generic "data" key
      expect(response.body).not.toHaveProperty('data');

      // Verify each item in array has camelCase fields
      if (response.body.payComponents.length > 0) {
        const component = response.body.payComponents[0];
        expect(component).toHaveProperty('id');
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('code');
        
        // Should be camelCase
        if (component.calculationType !== undefined) {
          expect(component).toHaveProperty('calculationType');
          expect(component).not.toHaveProperty('calculation_type');
        }
      }
    });
  });

  describe('GET /api/paylinq/pay-components/:id - Get Single', () => {
    it('should return resource-specific key "payComponent" (singular) NOT generic "data"', async () => {
      // First create a component to fetch
      const createResponse = await request(app)
        .post('/api/paylinq/pay-components')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Get Test',
          code: 'GET_TEST',
          type: 'earning',
          category: 'regular',
          calculationType: 'fixed',
          defaultValue: 100
        });

      const componentId = createResponse.body.payComponent.id;

      // Now fetch it
      const response = await request(app)
        .get(`/api/paylinq/pay-components/${componentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // ✅ CORRECT: Resource-specific singular key
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('payComponent');
      
      // ❌ WRONG: Generic "data" key
      expect(response.body).not.toHaveProperty('data');

      // Verify all fields present with correct names
      const { payComponent } = response.body;
      expect(payComponent.id).toBe(componentId);
      expect(payComponent.name).toBe('Get Test');
      expect(payComponent.code).toBe('GET_TEST');

      // Cleanup
      await request(app)
        .delete(`/api/paylinq/pay-components/${componentId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });
  });

  describe('PUT /api/paylinq/pay-components/:id - Update', () => {
    it('should return resource-specific key "payComponent" NOT generic "data"', async () => {
      // First create a component to update
      const createResponse = await request(app)
        .post('/api/paylinq/pay-components')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Update Test',
          code: 'UPDATE_TEST',
          type: 'earning',
          category: 'regular',
          calculationType: 'fixed',
          defaultValue: 100
        });

      const componentId = createResponse.body.payComponent.id;

      // Now update it
      const response = await request(app)
        .put(`/api/paylinq/pay-components/${componentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Test',
          defaultValue: 200
        })
        .expect(200);

      // ✅ CORRECT: Resource-specific key
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('payComponent');
      expect(response.body).toHaveProperty('message');
      
      // ❌ WRONG: Generic "data" key
      expect(response.body).not.toHaveProperty('data');

      // Verify update worked
      expect(response.body.payComponent.name).toBe('Updated Test');
      expect(response.body.payComponent.defaultValue).toBe(200);

      // Cleanup
      await request(app)
        .delete(`/api/paylinq/pay-components/${componentId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });
  });

  describe('Error Responses', () => {
    it('should return consistent error structure with success: false', async () => {
      const response = await request(app)
        .get('/api/paylinq/pay-components/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      
      // Should NOT have resource key on errors
      expect(response.body).not.toHaveProperty('payComponent');
      expect(response.body).not.toHaveProperty('data');
    });

    it('should return 400 with validation error structure', async () => {
      const response = await request(app)
        .post('/api/paylinq/pay-components')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          name: 'Invalid'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/validation|required/i);
    });
  });

  describe('Field Naming Standards', () => {
    it('should use camelCase in JSON responses, never snake_case', async () => {
      const createResponse = await request(app)
        .post('/api/paylinq/pay-components')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Naming Test',
          code: 'NAMING_TEST',
          type: 'earning',
          category: 'regular',
          calculationType: 'fixed',
          defaultValue: 100,
          isRecurring: true,
          isTaxable: false
        });

      const { payComponent } = createResponse.body;

      // ✅ CORRECT: camelCase fields
      expect(payComponent).toHaveProperty('calculationType');
      expect(payComponent).toHaveProperty('defaultValue');
      expect(payComponent).toHaveProperty('isRecurring');
      expect(payComponent).toHaveProperty('isTaxable');
      expect(payComponent).toHaveProperty('createdAt');
      expect(payComponent).toHaveProperty('updatedAt');

      // ❌ WRONG: snake_case fields should NOT exist
      expect(payComponent).not.toHaveProperty('calculation_type');
      expect(payComponent).not.toHaveProperty('default_value');
      expect(payComponent).not.toHaveProperty('is_recurring');
      expect(payComponent).not.toHaveProperty('is_taxable');
      expect(payComponent).not.toHaveProperty('created_at');
      expect(payComponent).not.toHaveProperty('updated_at');

      // Cleanup
      await request(app)
        .delete(`/api/paylinq/pay-components/${payComponent.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });
  });
});
