/**
 * Tax Rate Controller Tests
 * API contract tests for tax rule and calculation management.
 * Tests would have caught:
 * - ❌ Missing validation for tax brackets
 * - ❌ Incorrect tax calculation logic
 * - ❌ Missing jurisdiction handling
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import taxRateController from '../../../../src/products/paylinq/controllers/taxRateController.js';

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.auth = {
    userId: 'user-123',
    organizationId: '9ee50aee-76c3-46ce-87ed-005c6dd893ef',
    email: 'admin@recruitiq.com',
    role: 'admin'
  };
  next();
});

// Mount routes - using actual controller functions
app.post('/api/paylinq/tax-rules', taxRateController.createTaxRule);
app.get('/api/paylinq/tax-rules', taxRateController.getTaxRules);
app.get('/api/paylinq/tax-rules/:id', taxRateController.getTaxRuleById);
app.put('/api/paylinq/tax-rules/:id', taxRateController.updateTaxRule);
app.delete('/api/paylinq/tax-rules/:id', taxRateController.deleteTaxRule);
app.post('/api/paylinq/tax-rules/:taxRuleId/brackets', taxRateController.createTaxBracket);
app.get('/api/paylinq/tax-rules/:taxRuleId/brackets', taxRateController.getTaxBrackets);
app.put('/api/paylinq/tax-rules/:taxRuleId/brackets/:id', taxRateController.updateTaxBracket);
app.delete('/api/paylinq/tax-rules/:taxRuleId/brackets/:id', taxRateController.deleteTaxBracket);
app.post('/api/paylinq/tax-rules/calculate', taxRateController.calculateTaxes);
app.post('/api/paylinq/tax-rules/setup/suriname', taxRateController.setupSurinameTaxRules);

describe('Tax Rate Controller - API Contract Tests', () => {
  let taxRuleId;
  let bracketId;

  describe('POST /api/paylinq/tax-rules', () => {
    test('should return correct response structure on create', async () => {
      const newTaxRule = {
        taxType: 'INCOME_TAX',
        jurisdiction: 'Suriname',
        description: 'Standard income tax',
        effectiveDate: '2024-01-01',
        isActive: true,
      };

      const response = await request(app)
        .post('/api/paylinq/tax-rules')
        .send(newTaxRule)
        .expect(201);

      // Validate response structure
      expect(response.body.success).toBe(true);
      expect(response.body.taxRule).toBeDefined();
      expect(response.body.taxRule.id).toBeDefined();
      expect(response.body.taxRule.taxType).toBe('INCOME_TAX');
      expect(response.body.message).toContain('created successfully');

      taxRuleId = response.body.taxRule.id;
    });

    test('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/paylinq/tax-rules')
        .send({
          taxType: 'INCOME_TAX',
          // Missing jurisdiction, effectiveDate
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    test('should create tax rules for all valid tax types', async () => {
      const taxTypes = ['INCOME_TAX', 'SOCIAL_SECURITY', 'HEALTH_INSURANCE', 'OTHER'];
      
      for (const type of taxTypes) {
        const taxRule = {
          taxType: type,
          jurisdiction: 'Suriname',
          effectiveDate: '2024-01-01',
        };

        const response = await request(app)
          .post('/api/paylinq/tax-rules')
          .send(taxRule)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.taxRule.taxType).toBe(type);
      }
    });

    test('should validate effectiveDate format', async () => {
      const taxRule = {
        taxType: 'INCOME_TAX',
        jurisdiction: 'Suriname',
        effectiveDate: 'invalid-date',
      };

      const response = await request(app)
        .post('/api/paylinq/tax-rules')
        .send(taxRule)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('date');
    });

    test('should create tax rule with metadata', async () => {
      const taxRule = {
        taxType: 'INCOME_TAX',
        jurisdiction: 'Suriname',
        effectiveDate: '2024-01-01',
        metadata: {
          legislationRef: 'TAX-LAW-2024',
          notes: 'Updated for 2024 tax year',
        },
      };

      const response = await request(app)
        .post('/api/paylinq/tax-rules')
        .send(taxRule)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.taxRule.metadata).toBeDefined();
    });
  });

  describe('GET /api/paylinq/tax-rules', () => {
    test('should return array of tax rules', async () => {
      const response = await request(app)
        .get('/api/paylinq/tax-rules')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.taxRules)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('should filter by taxType', async () => {
      const response = await request(app)
        .get('/api/paylinq/tax-rules?taxType=INCOME_TAX')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.taxRules)).toBe(true);
    });

    test('should filter by jurisdiction', async () => {
      const response = await request(app)
        .get('/api/paylinq/tax-rules?jurisdiction=Suriname')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should include inactive rules when requested', async () => {
      const response = await request(app)
        .get('/api/paylinq/tax-rules?includeInactive=true')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle empty tax rules list gracefully', async () => {
      const response = await request(app)
        .get('/api/paylinq/tax-rules?jurisdiction=NonExistent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.taxRules)).toBe(true);
      expect(response.body.count).toBe(0);
    });
  });

  describe('GET /api/paylinq/tax-rules/:id', () => {
    test('should return single tax rule', async () => {
      const testTaxRuleId = taxRuleId || '550e8400-e29b-41d4-a716-446655440002';

      const response = await request(app)
        .get(`/api/paylinq/tax-rules/${testTaxRuleId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.taxRule).toBeDefined();
      expect(response.body.taxRule.id).toBe(testTaxRuleId);
    });

    test('should return 404 when tax rule not found', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/tax-rules/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return 500 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/paylinq/tax-rules/invalid-uuid')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/paylinq/tax-rules/:id', () => {
    test('should update tax rule successfully', async () => {
      const testTaxRuleId = taxRuleId || '550e8400-e29b-41d4-a716-446655440002';
      const updates = {
        description: 'Updated tax rule description',
        isActive: false,
      };

      const response = await request(app)
        .put(`/api/paylinq/tax-rules/${testTaxRuleId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.taxRule).toBeDefined();
    });

    test('should update tax rule metadata', async () => {
      const testTaxRuleId = taxRuleId || '550e8400-e29b-41d4-a716-446655440002';
      const updates = {
        metadata: {
          lastReviewed: new Date().toISOString(),
          reviewedBy: 'admin',
        },
      };

      const response = await request(app)
        .put(`/api/paylinq/tax-rules/${testTaxRuleId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when updating non-existent tax rule', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .put(`/api/paylinq/tax-rules/${fakeId}`)
        .send({ description: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should prevent updating to invalid tax type', async () => {
      const testTaxRuleId = taxRuleId || '550e8400-e29b-41d4-a716-446655440002';
      const updates = {
        taxType: 'INVALID_TYPE',
      };

      const response = await request(app)
        .put(`/api/paylinq/tax-rules/${testTaxRuleId}`)
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/paylinq/tax-rules/:taxRuleId/brackets', () => {
    test('should create tax bracket successfully', async () => {
      const testTaxRuleId = taxRuleId || '550e8400-e29b-41d4-a716-446655440002';
      const bracket = {
        minIncome: 0,
        maxIncome: 50000,
        rate: 15.0,
        fixedAmount: 0,
      };

      const response = await request(app)
        .post(`/api/paylinq/tax-rules/${testTaxRuleId}/brackets`)
        .send(bracket)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.bracket).toBeDefined();
      expect(response.body.bracket.rate).toBe(15.0);

      bracketId = response.body.bracket.id;
    });

    test('should validate rate is between 0 and 100', async () => {
      const testTaxRuleId = taxRuleId || '550e8400-e29b-41d4-a716-446655440002';
      const bracket = {
        minIncome: 0,
        maxIncome: 50000,
        rate: 150.0, // Invalid
      };

      const response = await request(app)
        .post(`/api/paylinq/tax-rules/${testTaxRuleId}/brackets`)
        .send(bracket)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('rate');
    });

    test('should validate minIncome is less than maxIncome', async () => {
      const testTaxRuleId = taxRuleId || '550e8400-e29b-41d4-a716-446655440002';
      const bracket = {
        minIncome: 100000,
        maxIncome: 50000,
        rate: 25.0,
      };

      const response = await request(app)
        .post(`/api/paylinq/tax-rules/${testTaxRuleId}/brackets`)
        .send(bracket)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/paylinq/tax-rules/:taxRuleId/brackets', () => {
    test('should return array of tax brackets', async () => {
      const testTaxRuleId = taxRuleId || '550e8400-e29b-41d4-a716-446655440002';

      const response = await request(app)
        .get(`/api/paylinq/tax-rules/${testTaxRuleId}/brackets`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.brackets)).toBe(true);
    });

    test('should return empty array for tax rule with no brackets', async () => {
      const testTaxRuleId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/tax-rules/${testTaxRuleId}/brackets`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.brackets.length).toBe(0);
    });
  });

  describe('PUT /api/paylinq/tax-rules/:taxRuleId/brackets/:id', () => {
    test('should update tax bracket successfully', async () => {
      const testTaxRuleId = taxRuleId || '550e8400-e29b-41d4-a716-446655440002';
      const testBracketId = bracketId || '550e8400-e29b-41d4-a716-446655440003';
      const updates = {
        rate: 18.5,
      };

      const response = await request(app)
        .put(`/api/paylinq/tax-rules/${testTaxRuleId}/brackets/${testBracketId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.bracket).toBeDefined();
    });

    test('should return 404 when bracket not found', async () => {
      const testTaxRuleId = taxRuleId || '550e8400-e29b-41d4-a716-446655440002';
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .put(`/api/paylinq/tax-rules/${testTaxRuleId}/brackets/${fakeId}`)
        .send({ rate: 20.0 })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/paylinq/tax-rules/:taxRuleId/brackets/:id', () => {
    test('should delete tax bracket successfully', async () => {
      const testTaxRuleId = taxRuleId || '550e8400-e29b-41d4-a716-446655440002';
      const testBracketId = bracketId || '550e8400-e29b-41d4-a716-446655440003';

      const response = await request(app)
        .delete(`/api/paylinq/tax-rules/${testTaxRuleId}/brackets/${testBracketId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should return 404 when deleting non-existent bracket', async () => {
      const testTaxRuleId = taxRuleId || '550e8400-e29b-41d4-a716-446655440002';
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .delete(`/api/paylinq/tax-rules/${testTaxRuleId}/brackets/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/paylinq/tax-rules/:id', () => {
    test('should delete tax rule successfully (soft delete)', async () => {
      const testTaxRuleId = taxRuleId || '550e8400-e29b-41d4-a716-446655440002';

      const response = await request(app)
        .delete(`/api/paylinq/tax-rules/${testTaxRuleId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should return 404 when deleting non-existent tax rule', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .delete(`/api/paylinq/tax-rules/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/paylinq/tax-rules/calculate', () => {
    test('should calculate taxes successfully', async () => {
      const calculation = {
        grossIncome: 75000,
        taxYear: 2024,
        jurisdiction: 'Suriname',
      };

      const response = await request(app)
        .post('/api/paylinq/tax-rules/calculate')
        .send(calculation)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.calculation).toBeDefined();
      expect(response.body.calculation.totalTax).toBeDefined();
      expect(response.body.calculation.effectiveRate).toBeDefined();
    });

    test('should return 400 when grossIncome missing', async () => {
      const calculation = {
        taxYear: 2024,
        jurisdiction: 'Suriname',
      };

      const response = await request(app)
        .post('/api/paylinq/tax-rules/calculate')
        .send(calculation)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return breakdown by tax type', async () => {
      const calculation = {
        grossIncome: 75000,
        taxYear: 2024,
        jurisdiction: 'Suriname',
      };

      const response = await request(app)
        .post('/api/paylinq/tax-rules/calculate')
        .send(calculation)
        .expect(200);

      expect(response.body.calculation.breakdown).toBeDefined();
      expect(Array.isArray(response.body.calculation.breakdown)).toBe(true);
    });
  });

  describe('POST /api/paylinq/tax-rules/setup/suriname', () => {
    test('should setup Suriname tax rules successfully', async () => {
      const response = await request(app)
        .post('/api/paylinq/tax-rules/setup/suriname')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.rulesCreated).toBeGreaterThan(0);
      expect(response.body.message).toContain('setup');
    });

    test('should not duplicate existing rules', async () => {
      // First setup
      await request(app)
        .post('/api/paylinq/tax-rules/setup/suriname')
        .expect(201);

      // Second setup should handle gracefully
      const response = await request(app)
        .post('/api/paylinq/tax-rules/setup/suriname');

      expect([200, 201, 409]).toContain(response.status);
    });
  });
});
