/**
 * Temporal Pattern API Standards Compliance Tests
 * 
 * Tests to ensure all temporal pattern API endpoints comply with API_STANDARDS.md:
 * - Resource-specific response keys (NOT "data")
 * - camelCase in JSON responses
 * - Proper HTTP status codes
 * - Standard error format
 * - Pagination structure
 * - Rate limiting headers
 */

import request from 'supertest';
import app from '../../../src/app.js';

describe('Temporal Pattern API Standards Compliance', () => {
  let authCookie;
  const organizationId = 'test-org-api-001';
  const employeeId = 'test-emp-api-001';

  beforeAll(async () => {
    // Mock authentication - adjust based on your auth mechanism
    // authCookie = await getAuthCookie();
  });

  describe('POST /api/paylinq/patterns/test - Response Format', () => {
    test('should use resource-specific key "testResults" not "data"', async () => {
      const payload = {
        pattern: {
          patternType: 'day_of_week',
          dayOfWeek: 'sunday',
          consecutiveCount: 3,
          lookbackPeriodDays: 90,
        },
        employeeIds: [employeeId],
      };

      const response = await request(app)
        .post('/api/paylinq/patterns/test')
        .set('Cookie', authCookie)
        .send(payload)
        .expect(200);

      // CRITICAL: Must use resource-specific key
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('testResults');
      expect(response.body).not.toHaveProperty('data');
      
      // Verify structure
      expect(response.body.testResults).toHaveProperty('totalTested');
      expect(response.body.testResults).toHaveProperty('qualifiedCount');
      expect(response.body.testResults).toHaveProperty('notQualifiedCount');
    });

    test('should use camelCase for all fields', async () => {
      const payload = {
        pattern: {
          patternType: 'day_of_week',
          dayOfWeek: 'sunday',
          consecutiveCount: 3,
          lookbackPeriodDays: 90,
        },
        employeeIds: [employeeId],
      };

      const response = await request(app)
        .post('/api/paylinq/patterns/test')
        .set('Cookie', authCookie)
        .send(payload)
        .expect(200);

      const results = response.body.testResults;
      
      // Check all keys are camelCase (not snake_case)
      expect(results).toHaveProperty('totalTested'); // NOT total_tested
      expect(results).toHaveProperty('qualifiedCount'); // NOT qualified_count
      expect(results).toHaveProperty('notQualifiedCount'); // NOT not_qualified_count
      expect(results).toHaveProperty('qualifiedWorkers'); // NOT qualified_workers
      expect(results).toHaveProperty('notQualifiedWorkers'); // NOT not_qualified_workers
      
      // Verify no snake_case keys
      expect(results).not.toHaveProperty('total_tested');
      expect(results).not.toHaveProperty('qualified_count');
    });

    test('should return 400 for invalid pattern with standard error format', async () => {
      const invalidPayload = {
        pattern: {
          patternType: 'invalid_type',
          consecutiveCount: 3,
        },
        employeeIds: [employeeId],
      };

      const response = await request(app)
        .post('/api/paylinq/patterns/test')
        .set('Cookie', authCookie)
        .send(invalidPayload)
        .expect(400);

      // Standard error format
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      
      // Optional but recommended: errorCode and details
      if (response.body.errorCode) {
        expect(typeof response.body.errorCode).toBe('string');
        expect(response.body.errorCode).toMatch(/^[A-Z_]+$/); // Machine-readable format
      }
    });

    test('should return 401 for unauthenticated request', async () => {
      const payload = {
        pattern: {
          patternType: 'day_of_week',
          dayOfWeek: 'sunday',
          consecutiveCount: 3,
        },
        employeeIds: [employeeId],
      };

      const response = await request(app)
        .post('/api/paylinq/patterns/test')
        .send(payload)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 for missing required fields', async () => {
      const invalidPayload = {
        pattern: {
          patternType: 'day_of_week',
          // Missing dayOfWeek
          consecutiveCount: 3,
        },
        employeeIds: [employeeId],
      };

      const response = await request(app)
        .post('/api/paylinq/patterns/test')
        .set('Cookie', authCookie)
        .send(invalidPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('dayOfWeek');
    });
  });

  describe('POST /api/paylinq/patterns/evaluate - Response Format', () => {
    test('should use resource-specific key "evaluation" not "data"', async () => {
      const payload = {
        pattern: {
          patternType: 'day_of_week',
          dayOfWeek: 'sunday',
          consecutiveCount: 3,
          lookbackPeriodDays: 90,
        },
        employeeId,
      };

      const response = await request(app)
        .post('/api/paylinq/patterns/evaluate')
        .set('Cookie', authCookie)
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('evaluation');
      expect(response.body).not.toHaveProperty('data');
      
      const evaluation = response.body.evaluation;
      expect(evaluation).toHaveProperty('qualified');
      expect(evaluation).toHaveProperty('patternType');
      expect(evaluation).toHaveProperty('metadata');
      expect(evaluation).toHaveProperty('executionTime');
      expect(evaluation).toHaveProperty('evaluatedAt');
    });

    test('should use camelCase in nested metadata', async () => {
      const payload = {
        pattern: {
          patternType: 'day_of_week',
          dayOfWeek: 'sunday',
          consecutiveCount: 3,
          lookbackPeriodDays: 90,
        },
        employeeId,
      };

      const response = await request(app)
        .post('/api/paylinq/patterns/evaluate')
        .set('Cookie', authCookie)
        .send(payload)
        .expect(200);

      const metadata = response.body.evaluation.metadata;
      
      // Metadata fields should be camelCase
      expect(metadata).toHaveProperty('dayOfWeek'); // NOT day_of_week
      expect(metadata).toHaveProperty('requiredConsecutive'); // NOT required_consecutive
      expect(metadata).toHaveProperty('actualMaxConsecutive'); // NOT actual_max_consecutive
      expect(metadata).toHaveProperty('totalMatchingDays'); // NOT total_matching_days
      expect(metadata).toHaveProperty('lookbackPeriodDays'); // NOT lookback_period_days
      
      // Verify no snake_case
      expect(metadata).not.toHaveProperty('day_of_week');
      expect(metadata).not.toHaveProperty('required_consecutive');
    });
  });

  describe('GET /api/paylinq/patterns/shift-types - Pagination', () => {
    test('should return proper pagination structure', async () => {
      const response = await request(app)
        .get('/api/paylinq/patterns/shift-types')
        .query({ page: 1, limit: 20 })
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('shiftTypes'); // Resource-specific key
      expect(response.body).not.toHaveProperty('data');
      
      // Pagination fields (all camelCase)
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body).toHaveProperty('hasNext');
      expect(response.body).toHaveProperty('hasPrev');
      
      // Verify no snake_case
      expect(response.body).not.toHaveProperty('total_pages');
      expect(response.body).not.toHaveProperty('has_next');
      expect(response.body).not.toHaveProperty('has_prev');
    });

    test('should handle pagination parameters correctly', async () => {
      const response = await request(app)
        .get('/api/paylinq/patterns/shift-types')
        .query({ page: 2, limit: 10 })
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(10);
      
      if (response.body.total > 10) {
        expect(response.body.hasPrev).toBe(true);
      }
    });
  });

  describe('GET /api/paylinq/patterns/validation-schema - Response Format', () => {
    test('should use resource-specific key "schema" not "data"', async () => {
      const response = await request(app)
        .get('/api/paylinq/patterns/validation-schema')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('schema');
      expect(response.body).not.toHaveProperty('data');
      
      const schema = response.body.schema;
      expect(schema).toHaveProperty('patternType');
      expect(schema).toHaveProperty('dayOfWeek');
      expect(schema).toHaveProperty('consecutiveCount');
    });
  });

  describe('HTTP Status Codes', () => {
    test('should return 200 for successful GET requests', async () => {
      await request(app)
        .get('/api/paylinq/patterns/validation-schema')
        .set('Cookie', authCookie)
        .expect(200);
    });

    test('should return 200 for successful POST requests (not 201)', async () => {
      // Pattern testing is a read operation, not creation
      const payload = {
        pattern: {
          patternType: 'day_of_week',
          dayOfWeek: 'sunday',
          consecutiveCount: 3,
        },
        employeeIds: [employeeId],
      };

      await request(app)
        .post('/api/paylinq/patterns/test')
        .set('Cookie', authCookie)
        .send(payload)
        .expect(200); // NOT 201
    });

    test('should return 400 for validation errors', async () => {
      const invalidPayload = {
        pattern: {}, // Invalid pattern
        employeeIds: [],
      };

      await request(app)
        .post('/api/paylinq/patterns/test')
        .set('Cookie', authCookie)
        .send(invalidPayload)
        .expect(400);
    });

    test('should return 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/api/paylinq/patterns/nonexistent')
        .set('Cookie', authCookie)
        .expect(404);
    });

    test('should return 500 for server errors with proper format', async () => {
      // This test would require mocking a service to throw an error
      // Implementation depends on your error handling middleware
    });
  });

  describe('Error Response Format', () => {
    test('should include success: false in error responses', async () => {
      const response = await request(app)
        .post('/api/paylinq/patterns/test')
        .set('Cookie', authCookie)
        .send({ invalid: 'payload' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should include descriptive error message', async () => {
      const response = await request(app)
        .post('/api/paylinq/patterns/test')
        .set('Cookie', authCookie)
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
    });

    test('should optionally include errorCode for machine processing', async () => {
      const response = await request(app)
        .post('/api/paylinq/patterns/test')
        .set('Cookie', authCookie)
        .send({ pattern: { patternType: 'invalid' }, employeeIds: [] })
        .expect(400);

      if (response.body.errorCode) {
        expect(response.body.errorCode).toMatch(/^[A-Z_]+$/);
      }
    });

    test('should optionally include details object for field-specific errors', async () => {
      const response = await request(app)
        .post('/api/paylinq/patterns/test')
        .set('Cookie', authCookie)
        .send({
          pattern: {
            patternType: 'day_of_week',
            consecutiveCount: -1, // Invalid
          },
          employeeIds: [],
        })
        .expect(400);

      // Details object is optional but helpful
      if (response.body.details) {
        expect(typeof response.body.details).toBe('object');
      }
    });
  });

  describe('Rate Limiting Headers', () => {
    test('should include rate limit headers (if implemented)', async () => {
      const response = await request(app)
        .get('/api/paylinq/patterns/validation-schema')
        .set('Cookie', authCookie)
        .expect(200);

      // Rate limiting headers (optional but recommended)
      // X-RateLimit-Limit: Maximum requests allowed
      // X-RateLimit-Remaining: Requests remaining
      // X-RateLimit-Reset: Time when limit resets
      
      // These are optional - only test if implemented
      if (response.headers['x-ratelimit-limit']) {
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
      }
    });
  });

  describe('Content-Type Headers', () => {
    test('should return application/json for all endpoints', async () => {
      const response = await request(app)
        .get('/api/paylinq/patterns/validation-schema')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Field Naming Consistency', () => {
    test('should never mix camelCase and snake_case in same response', async () => {
      const payload = {
        pattern: {
          patternType: 'day_of_week',
          dayOfWeek: 'sunday',
          consecutiveCount: 3,
          lookbackPeriodDays: 90,
        },
        employeeIds: [employeeId],
      };

      const response = await request(app)
        .post('/api/paylinq/patterns/test')
        .set('Cookie', authCookie)
        .send(payload)
        .expect(200);

      // Recursively check all keys are camelCase
      const checkCamelCase = (obj, path = '') => {
        for (const key in obj) {
          const fullPath = path ? `${path}.${key}` : key;
          
          // Check key is camelCase (allow special cases like 'id' or single word)
          if (key.includes('_')) {
            throw new Error(`Found snake_case key: ${fullPath}`);
          }
          
          // Recurse into nested objects
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            checkCamelCase(obj[key], fullPath);
          }
          
          // Check arrays of objects
          if (Array.isArray(obj[key])) {
            obj[key].forEach((item, idx) => {
              if (typeof item === 'object' && item !== null) {
                checkCamelCase(item, `${fullPath}[${idx}]`);
              }
            });
          }
        }
      };

      expect(() => checkCamelCase(response.body)).not.toThrow();
    });
  });
});
