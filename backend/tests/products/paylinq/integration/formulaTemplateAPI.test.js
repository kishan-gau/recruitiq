/**
 * Integration Tests: Formula Template API
 * Tests formula template management with real database and cookie-based authentication
 * 
 * Tests verify:
 * - Full HTTP request-response cycle
 * - Authentication/authorization
 * - Database interactions (no mocks)
 * - Request validation
 * - Error handling
 * - API Standards compliance (resource-specific keys)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
import bcrypt from 'bcrypt';

describe('Integration: Formula Template API', () => {
  let agent;
  let csrfToken;
  let organizationId;
  let userId;
  let testTemplateId;
  let customTemplateId;

  beforeAll(async () => {
    // Create test organization
    const timestamp = Date.now();
    const orgSlug = `test-org-formula-${timestamp}`;
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, slug, created_at) 
       VALUES ('Test Org - Formula Templates', $1, NOW()) 
       RETURNING id`,
      [orgSlug]
    );
    organizationId = orgResult.rows[0].id;

    // Create test user with hashed password
    const testEmail = `admin-${timestamp}@formulatest.com`;
    const passwordHash = await bcrypt.hash('TestPassword123!', 10);
    
    const userResult = await pool.query(
      `INSERT INTO hris.user_account (
        organization_id, email, password_hash, 
        enabled_products, is_active, email_verified, account_status, created_at
      ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, NOW())
      RETURNING id`,
      [
        organizationId,
        testEmail,
        passwordHash,
        JSON.stringify(['paylinq']),
        true,
        true,
        'active'
      ]
    );
    userId = userResult.rows[0].id;

    // Create authenticated agent with cookie-based auth
    agent = request.agent(app);
    
    // Get CSRF token
    const csrfResponse = await agent.get('/api/csrf-token');
    csrfToken = csrfResponse.body.csrfToken;
    
    // Login to get session cookies
    const loginResponse = await agent
      .post('/api/auth/tenant/login')
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: testEmail,
        password: 'TestPassword123!'
      });
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
    }

    // Create a global test template for testing
    const templateResult = await pool.query(
      `INSERT INTO payroll.formula_template (
        template_code, template_name, category, formula_expression, parameters,
        description, complexity_level, is_global, is_popular, is_recommended,
        usage_count, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, NOW(), $12)
      RETURNING id`,
      [
        `TEST_TEMPLATE_${timestamp}`,
        'Test Formula Template',
        'earnings',
        '{basePay} * {multiplier}',
        JSON.stringify([
          { name: 'basePay', type: 'fixed', min: 0, max: 100000, default: 5000, description: 'Base pay amount' },
          { name: 'multiplier', type: 'percentage', min: 0, max: 10, default: 1.5, description: 'Multiplier rate' }
        ]),
        'Test template for integration tests',
        'simple',
        true,
        false,
        true,  // Set is_recommended to true for recommended templates test
        0,
        userId
      ]
    );
    testTemplateId = templateResult.rows[0].id;

    // Create a custom (non-global) template for update/delete tests
    const customTemplateResult = await pool.query(
      `INSERT INTO payroll.formula_template (
        template_code, template_name, category, formula_expression, parameters,
        description, complexity_level, is_global, organization_id, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, NOW(), $10)
      RETURNING id`,
      [
        `CUSTOM_TEMPLATE_${timestamp}`,
        'Custom Test Template',
        'deductions',
        'gross_pay * {deductionRate}',
        JSON.stringify([
          { name: 'deductionRate', type: 'percentage', min: 0, max: 100, default: 10, description: 'Deduction rate' }
        ]),
        'Custom template for testing updates and deletes',
        'simple',
        false,  // Not global
        organizationId,
        userId
      ]
    );
    customTemplateId = customTemplateResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data in correct order (respect foreign keys)
    if (organizationId) {
      await pool.query(
        `DELETE FROM payroll.formula_template WHERE organization_id = $1 OR created_by = $2`,
        [organizationId, userId]
      );
      await pool.query(`DELETE FROM hris.user_account WHERE organization_id = $1`, [organizationId]);
      await pool.query(`DELETE FROM organizations WHERE id = $1`, [organizationId]);
    }
    
    // Close database connection
    await pool.end();
  });

  describe('GET /api/products/paylinq/formula-templates - List Templates', () => {
    it('should return all accessible templates', async () => {
      const response = await agent
        .get('/api/products/paylinq/formula-templates')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify structure of returned templates
      const template = response.body.data[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('template_name');
      expect(template).toHaveProperty('template_code');
      expect(template).toHaveProperty('category');
      expect(template).toHaveProperty('formula_expression');
    });

    it('should filter templates by category', async () => {
      const response = await agent
        .get('/api/products/paylinq/formula-templates?category=earnings')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(t => t.category === 'earnings')).toBe(true);
    });

    it('should filter templates by complexity level', async () => {
      const response = await agent
        .get('/api/products/paylinq/formula-templates?complexity=simple')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(t => t.complexity_level === 'simple')).toBe(true);
    });

    it('should search templates by text', async () => {
      const response = await agent
        .get('/api/products/paylinq/formula-templates?search=test')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by popular templates', async () => {
      const response = await agent
        .get('/api/products/paylinq/formula-templates?popular=true')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Popular templates may or may not exist
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/products/paylinq/formula-templates/:id - Get Template by ID', () => {
    it('should return template by ID', async () => {
      const response = await agent
        .get(`/api/products/paylinq/formula-templates/${testTemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testTemplateId);
      expect(response.body.data).toHaveProperty('template_name', 'Test Formula Template');
      expect(response.body.data).toHaveProperty('formula_expression', '{basePay} * {multiplier}');
      expect(response.body.data).toHaveProperty('parameters');
      expect(Array.isArray(response.body.data.parameters)).toBe(true);
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await agent
        .get(`/api/products/paylinq/formula-templates/${fakeId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await agent
        .get('/api/products/paylinq/formula-templates/invalid-uuid')
        .set('X-CSRF-Token', csrfToken)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/products/paylinq/formula-templates/code/:code - Get Template by Code', () => {
    it('should return template by code', async () => {
      const template = await pool.query(
        'SELECT template_code FROM payroll.formula_template WHERE id = $1',
        [testTemplateId]
      );
      const templateCode = template.rows[0].template_code;

      const response = await agent
        .get(`/api/products/paylinq/formula-templates/code/${templateCode}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testTemplateId);
      expect(response.body.data).toHaveProperty('template_code', templateCode);
    });

    it('should return 404 for non-existent template code', async () => {
      const response = await agent
        .get('/api/products/paylinq/formula-templates/code/NONEXISTENT_CODE')
        .set('X-CSRF-Token', csrfToken)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/products/paylinq/formula-templates - Create Custom Template', () => {
    it('should create a custom template with valid data', async () => {
      const timestamp = Date.now();
      const templateData = {
        template_code: `CUSTOM_TEMPLATE_${timestamp}`,
        template_name: 'Custom Test Template',
        category: 'deductions',
        formula_expression: 'gross_pay * {deductionRate}',
        parameters: [
          { name: 'deductionRate', type: 'percentage', min: 0, max: 100, default: 10, description: 'Deduction rate' }
        ],
        description: 'Custom template for testing',
        complexity_level: 'simple',
        tags: ['custom', 'test']
      };

      const response = await agent
        .post('/api/products/paylinq/formula-templates')
        .set('X-CSRF-Token', csrfToken)
        .send(templateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Template created successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('template_code', templateData.template_code);
      expect(response.body.data).toHaveProperty('template_name', templateData.template_name);
      expect(response.body.data).toHaveProperty('organization_id', organizationId);
      expect(response.body.data).toHaveProperty('created_by', userId);

      customTemplateId = response.body.data.id;
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        template_name: 'Incomplete Template'
        // Missing template_code, category, formula_expression, parameters
      };

      const response = await agent
        .post('/api/products/paylinq/formula-templates')
        .set('X-CSRF-Token', csrfToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for duplicate template code', async () => {
      const timestamp = Date.now();
      const templateData = {
        template_code: `DUPLICATE_CODE_${timestamp}`,
        template_name: 'First Template',
        category: 'earnings',
        formula_expression: 'base_salary * {rate}',
        parameters: [{ name: 'rate', type: 'percentage', min: 0, max: 100, default: 10 }]
      };

      // Create first template
      await agent
        .post('/api/products/paylinq/formula-templates')
        .set('X-CSRF-Token', csrfToken)
        .send(templateData)
        .expect(201);

      // Try to create duplicate
      const response = await agent
        .post('/api/products/paylinq/formula-templates')
        .set('X-CSRF-Token', csrfToken)
        .send(templateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should validate formula syntax', async () => {
      const timestamp = Date.now();
      const invalidFormulaData = {
        template_code: `INVALID_FORMULA_${timestamp}`,
        template_name: 'Invalid Formula Template',
        category: 'earnings',
        formula_expression: 'gross_pay +* {rate}', // Invalid syntax - bad operator
        parameters: [
          { name: 'amount', type: 'fixed' },
          { name: 'rate', type: 'fixed' }
        ]
      };

      const response = await agent
        .post('/api/products/paylinq/formula-templates')
        .set('X-CSRF-Token', csrfToken)
        .send(invalidFormulaData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should store formula AST for complex formulas', async () => {
      const timestamp = Date.now();
      const complexTemplateData = {
        template_code: `COMPLEX_TEMPLATE_${timestamp}`,
        template_name: 'Complex Formula Template',
        category: 'earnings',
        formula_expression: '(base_salary + {allowance}) * (1 + {bonusRate} / 100)',
        parameters: [
          { name: 'baseSalary', type: 'fixed' },
          { name: 'allowance', type: 'fixed' },
          { name: 'bonusRate', type: 'percentage' }
        ],
        complexity_level: 'advanced'
      };

      const response = await agent
        .post('/api/products/paylinq/formula-templates')
        .set('X-CSRF-Token', csrfToken)
        .send(complexTemplateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('formula_ast');
      expect(response.body.data.formula_ast).not.toBeNull();
    });
  });

  describe('PUT /api/products/paylinq/formula-templates/:id - Update Custom Template', () => {
    it('should update custom template', async () => {
      const updates = {
        template_name: 'Updated Custom Template',
        description: 'Updated description',
        tags: ['updated', 'test']
      };

      const response = await agent
        .put(`/api/products/paylinq/formula-templates/${customTemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(updates);
      
      if (response.status !== 200) {
        console.log('❌ Update template error:', JSON.stringify(response.body, null, 2));
      }
      
      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Template updated successfully');
      expect(response.body.data).toHaveProperty('template_name', 'Updated Custom Template');
      expect(response.body.data).toHaveProperty('description', 'Updated description');
    });

    it('should not allow updating global templates', async () => {
      const updates = {
        template_name: 'Attempted Update'
      };

      const response = await agent
        .put(`/api/products/paylinq/formula-templates/${testTemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(updates)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot modify global template');
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updates = { template_name: 'Update' };

      const response = await agent
        .put(`/api/products/paylinq/formula-templates/${fakeId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(updates)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should validate formula when updating formula_expression', async () => {
      const updates = {
        formula_expression: 'gross_pay ++ {rate}' // Invalid syntax (bad operator)
      };

      const response = await agent
        .put(`/api/products/paylinq/formula-templates/${customTemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should update formula_ast when formula_expression changes', async () => {
      const updates = {
        formula_expression: 'base_salary * {rate}',
        parameters: [{ name: 'rate', type: 'percentage', min: 0, max: 100, default: 10 }]
      };

      const response = await agent
        .put(`/api/products/paylinq/formula-templates/${customTemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('formula_expression', 'base_salary * {rate}');
      expect(response.body.data).toHaveProperty('formula_ast');
    });
  });

  describe('DELETE /api/products/paylinq/formula-templates/:id - Delete Custom Template', () => {
    it('should soft delete custom template', async () => {
      const response = await agent
        .delete(`/api/products/paylinq/formula-templates/${customTemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Template deleted successfully');

      // Verify template is soft deleted (not accessible via API)
      const getResponse = await agent
        .get(`/api/products/paylinq/formula-templates/${customTemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });

    it('should not allow deleting global templates', async () => {
      const response = await agent
        .delete(`/api/products/paylinq/formula-templates/${testTemplateId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot delete global template');
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await agent
        .delete(`/api/products/paylinq/formula-templates/${fakeId}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/products/paylinq/formula-templates/:id/apply - Apply Template', () => {
    it('should apply template with valid parameters', async () => {
      const parameters = {
        basePay: 5000,
        multiplier: 1.5
      };

      const response = await agent
        .post(`/api/products/paylinq/formula-templates/${testTemplateId}/apply`)
        .set('X-CSRF-Token', csrfToken)
        .send({ parameters });
      
      if (response.status !== 200) {
        console.log('❌ Apply template error:', JSON.stringify(response.body, null, 2));
      }
      
      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Template applied successfully');
      expect(response.body.data).toHaveProperty('formula', '5000 * 1.5');
      expect(response.body.data).toHaveProperty('parameters', parameters);
      expect(response.body.data).toHaveProperty('template_id', testTemplateId);
    });

    it('should increment usage_count after applying template', async () => {
      // Get current usage count
      const beforeQuery = await pool.query(
        'SELECT usage_count FROM payroll.formula_template WHERE id = $1',
        [testTemplateId]
      );
      const usageCountBefore = beforeQuery.rows[0].usage_count;

      // Apply template
      await agent
        .post(`/api/products/paylinq/formula-templates/${testTemplateId}/apply`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          parameters: { basePay: 3000, multiplier: 2 }
        })
        .expect(200);

      // Verify usage count increased
      const afterQuery = await pool.query(
        'SELECT usage_count FROM payroll.formula_template WHERE id = $1',
        [testTemplateId]
      );
      const usageCountAfter = afterQuery.rows[0].usage_count;

      expect(usageCountAfter).toBe(usageCountBefore + 1);
    });

    it('should return 400 for missing parameters', async () => {
      const response = await agent
        .post(`/api/products/paylinq/formula-templates/${testTemplateId}/apply`)
        .set('X-CSRF-Token', csrfToken)
        .send({ parameters: {} })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required parameter');
    });

    it('should validate percentage parameter ranges', async () => {
      // Create template with percentage parameter
      const timestamp = Date.now();
      const templateData = {
        template_code: `PERCENTAGE_TEMPLATE_${timestamp}`,
        template_name: 'Percentage Template',
        category: 'deductions',
        formula_expression: 'gross_pay * {rate}',
        parameters: [
          { name: 'rate', type: 'percentage', min: 0, max: 100 }
        ]
      };

      const createResponse = await agent
        .post('/api/products/paylinq/formula-templates')
        .set('X-CSRF-Token', csrfToken)
        .send(templateData)
        .expect(201);

      const percentageTemplateId = createResponse.body.data.id;

      // Try to apply with invalid percentage
      const response = await agent
        .post(`/api/products/paylinq/formula-templates/${percentageTemplateId}/apply`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          parameters: { rate: 150 } // Invalid: > 100
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be between');
    });

    it('should validate fixed parameter minimums', async () => {
      // Create template with fixed parameter with minimum
      const timestamp = Date.now();
      const templateData = {
        template_code: `MIN_TEMPLATE_${timestamp}`,
        template_name: 'Minimum Template',
        category: 'earnings',
        formula_expression: 'base_salary * {multiplier}',
        parameters: [
          { name: 'multiplier', type: 'fixed', min: 1.0 }
        ]
      };

      const createResponse = await agent
        .post('/api/products/paylinq/formula-templates')
        .set('X-CSRF-Token', csrfToken)
        .send(templateData)
        .expect(201);

      const minTemplateId = createResponse.body.data.id;

      // Try to apply with value below minimum
      const response = await agent
        .post(`/api/products/paylinq/formula-templates/${minTemplateId}/apply`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          parameters: { multiplier: 0.5 } // Invalid: < 1.0
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be at least');
    });

    it('should return 400 for missing parameters object', async () => {
      const response = await agent
        .post(`/api/products/paylinq/formula-templates/${testTemplateId}/apply`)
        .set('X-CSRF-Token', csrfToken)
        .send({}) // Missing parameters
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Parameters object is required');
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await agent
        .post(`/api/products/paylinq/formula-templates/${fakeId}/apply`)
        .set('X-CSRF-Token', csrfToken)
        .send({ parameters: { test: 1 } })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle multiple parameter occurrences in formula', async () => {
      // Create template with repeated parameters
      const timestamp = Date.now();
      const templateData = {
        template_code: `MULTI_PARAM_${timestamp}`,
        template_name: 'Multi Parameter Template',
        category: 'earnings',
        formula_expression: 'hourly_rate * {hours} + hourly_rate * {overtime}',
        parameters: [
          { name: 'hours', type: 'fixed' },
          { name: 'overtime', type: 'fixed' }
        ]
      };

      const createResponse = await agent
        .post('/api/products/paylinq/formula-templates')
        .set('X-CSRF-Token', csrfToken)
        .send(templateData)
        .expect(201);

      const multiTemplateId = createResponse.body.data.id;

      // Apply with parameters
      const response = await agent
        .post(`/api/products/paylinq/formula-templates/${multiTemplateId}/apply`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          parameters: { hours: 40, overtime: 10 }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.formula).toContain('hourly_rate');
    });
  });

  describe('GET /api/products/paylinq/formula-templates/popular - Get Popular Templates', () => {
    it('should return popular templates ordered by usage count', async () => {
      const response = await agent
        .get('/api/products/paylinq/formula-templates/popular')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify ordering by usage_count
      if (response.body.data.length > 1) {
        for (let i = 0; i < response.body.data.length - 1; i++) {
          expect(response.body.data[i].usage_count).toBeGreaterThanOrEqual(
            response.body.data[i + 1].usage_count
          );
        }
      }
    });

    it('should respect custom limit parameter', async () => {
      const response = await agent
        .get('/api/products/paylinq/formula-templates/popular?limit=5')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should default to limit of 10', async () => {
      const response = await agent
        .get('/api/products/paylinq/formula-templates/popular')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/products/paylinq/formula-templates/recommended/:category - Get Recommended Templates', () => {
    it('should return recommended templates for category', async () => {
      const response = await agent
        .get('/api/products/paylinq/formula-templates/recommended/earnings')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify all templates are from requested category
      if (response.body.data.length > 0) {
        expect(response.body.data.every(t => t.category === 'earnings')).toBe(true);
      }
    });

    it('should return empty array for category with no recommendations', async () => {
      const response = await agent
        .get('/api/products/paylinq/formula-templates/recommended/nonexistent')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });
  });

  describe('POST /api/products/paylinq/formula-templates/search/tags - Search by Tags', () => {
    it('should find templates by tags', async () => {
      // Create template with tags
      const timestamp = Date.now();
      const templateData = {
        template_code: `TAGGED_TEMPLATE_${timestamp}`,
        template_name: 'Tagged Template',
        category: 'earnings',
        formula_expression: 'hourly_rate * {hours}',
        parameters: [{ name: 'hours', type: 'fixed' }],
        tags: ['overtime', 'hourly']
      };

      await agent
        .post('/api/products/paylinq/formula-templates')
        .set('X-CSRF-Token', csrfToken)
        .send(templateData)
        .expect(201);

      // Search by tags
      const response = await agent
        .post('/api/products/paylinq/formula-templates/search/tags')
        .set('X-CSRF-Token', csrfToken)
        .send({ tags: ['overtime'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify matching template is found
      const foundTemplate = response.body.data.find(
        t => t.template_code === templateData.template_code
      );
      expect(foundTemplate).toBeDefined();
    });

    it('should return 400 for missing tags array', async () => {
      const response = await agent
        .post('/api/products/paylinq/formula-templates/search/tags')
        .set('X-CSRF-Token', csrfToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Tags array is required');
    });

    it('should return 400 for empty tags array', async () => {
      const response = await agent
        .post('/api/products/paylinq/formula-templates/search/tags')
        .set('X-CSRF-Token', csrfToken)
        .send({ tags: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prioritize templates by usage count', async () => {
      const response = await agent
        .post('/api/products/paylinq/formula-templates/search/tags')
        .set('X-CSRF-Token', csrfToken)
        .send({ tags: ['test'] })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify ordering by usage_count if multiple results
      if (response.body.data.length > 1) {
        for (let i = 0; i < response.body.data.length - 1; i++) {
          expect(response.body.data[i].usage_count).toBeGreaterThanOrEqual(
            response.body.data[i + 1].usage_count
          );
        }
      }
    });

    it('should support multiple tags search', async () => {
      const response = await agent
        .post('/api/products/paylinq/formula-templates/search/tags')
        .set('X-CSRF-Token', csrfToken)
        .send({ tags: ['test', 'custom'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // Create new agent without authentication
      const unauthAgent = request.agent(app);

      const response = await unauthAgent
        .get('/api/products/paylinq/formula-templates')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should enforce tenant isolation - cannot access other org templates', async () => {
      // Create second organization
      const timestamp = Date.now();
      const org2Slug = `test-org-2-${timestamp}`;
      const org2Result = await pool.query(
        `INSERT INTO organizations (name, slug, created_at) 
         VALUES ('Test Org 2', $1, NOW()) 
         RETURNING id`,
        [org2Slug]
      );
      const org2Id = org2Result.rows[0].id;

      // Create user in org2
      const email2 = `admin2-${timestamp}@formulatest.com`;
      const passwordHash = await bcrypt.hash('TestPassword123!', 10);
      
      const user2Result = await pool.query(
        `INSERT INTO hris.user_account (
          organization_id, email, password_hash, 
          enabled_products, is_active, email_verified, account_status, created_at
        ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, NOW())
        RETURNING id`,
        [org2Id, email2, passwordHash, JSON.stringify(['paylinq']), true, true, 'active']
      );
      const user2Id = user2Result.rows[0].id;

      // Create template for org1
      const org1TemplateData = {
        template_code: `ORG1_TEMPLATE_${timestamp}`,
        template_name: 'Org 1 Template',
        category: 'earnings',
        formula_expression: 'base_salary * {multiplier}',
        parameters: [{ name: 'multiplier', type: 'fixed' }]
      };

      const org1TemplateResponse = await agent
        .post('/api/products/paylinq/formula-templates')
        .set('X-CSRF-Token', csrfToken)
        .send(org1TemplateData)
        .expect(201);

      const org1TemplateId = org1TemplateResponse.body.data.id;

      // Login as org2 user
      const agent2 = request.agent(app);
      const csrf2Response = await agent2.get('/api/csrf-token');
      const csrf2Token = csrf2Response.body.csrfToken;
      
      await agent2
        .post('/api/auth/tenant/login')
        .set('X-CSRF-Token', csrf2Token)
        .send({ email: email2, password: 'TestPassword123!' })
        .expect(200);

      // Try to access org1's template from org2 user
      const accessResponse = await agent2
        .get(`/api/products/paylinq/formula-templates/${org1TemplateId}`)
        .set('X-CSRF-Token', csrf2Token)
        .expect(404);

      expect(accessResponse.body.success).toBe(false);

      // Cleanup org2
      await pool.query(`DELETE FROM hris.user_account WHERE organization_id = $1`, [org2Id]);
      await pool.query(`DELETE FROM organizations WHERE id = $1`, [org2Id]);
    });
  });
});
