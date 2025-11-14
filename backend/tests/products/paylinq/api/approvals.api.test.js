/**
 * Approval Routes API Tests
 * 
 * Integration tests for approval workflow API endpoints.
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/app.js';
import db from '../../../../src/config/database.js';

describe('Approval Routes API', () => {
  let authToken;
  let organizationId;
  let testRequestId;

  beforeAll(async () => {
    // Setup test authentication
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.admin@paylinq.com',
        password: 'TestPassword123!'
      });

    authToken = loginResponse.body.token;
    organizationId = loginResponse.body.user.organizationId;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testRequestId) {
      await db.query(
        'DELETE FROM currency_approval_request WHERE request_id = $1',
        [testRequestId]
      );
    }
  });

  describe('POST /api/paylinq/approvals', () => {
    test('should create approval request successfully', async () => {
      const requestData = {
        requestType: 'conversion',
        referenceType: 'currency_conversion',
        referenceId: 'conv-test-123',
        requestData: {
          amount: 15000,
          from_currency: 'USD',
          to_currency: 'EUR',
          rate: 0.85
        },
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/paylinq/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('request_id');
      expect(response.body.data.request_type).toBe('conversion');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.priority).toBe('high');

      testRequestId = response.body.data.request_id;
    });

    test('should validate required fields', async () => {
      const invalidData = {
        requestType: 'conversion'
        // Missing referenceType and referenceId
      };

      const response = await request(app)
        .post('/api/paylinq/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should validate request type enum', async () => {
      const invalidData = {
        requestType: 'invalid_type',
        referenceType: 'test',
        referenceId: 'test-123',
        requestData: {}
      };

      const response = await request(app)
        .post('/api/paylinq/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('must be one of');
    });

    test('should require authentication', async () => {
      const requestData = {
        requestType: 'conversion',
        referenceType: 'test',
        referenceId: 'test-123',
        requestData: {}
      };

      await request(app)
        .post('/api/paylinq/approvals')
        .send(requestData)
        .expect(401);
    });
  });

  describe('GET /api/paylinq/approvals/pending', () => {
    test('should retrieve pending approvals', async () => {
      const response = await request(app)
        .get('/api/paylinq/approvals/pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const approval = response.body.data[0];
        expect(approval).toHaveProperty('request_id');
        expect(approval).toHaveProperty('request_type');
        expect(approval).toHaveProperty('status');
        expect(approval.status).toBe('pending');
      }
    });

    test('should filter by request type', async () => {
      const response = await request(app)
        .get('/api/paylinq/approvals/pending')
        .query({ requestType: 'conversion' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      response.body.data.forEach(approval => {
        expect(approval.request_type).toBe('conversion');
      });
    });

    test('should filter by priority', async () => {
      const response = await request(app)
        .get('/api/paylinq/approvals/pending')
        .query({ priority: 'high' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      response.body.data.forEach(approval => {
        expect(approval.priority).toBe('high');
      });
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/paylinq/approvals/pending')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/paylinq/approvals/:id', () => {
    test('should retrieve approval details with actions', async () => {
      // First create a request
      const createResponse = await request(app)
        .post('/api/paylinq/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          requestType: 'rate_change',
          referenceType: 'exchange_rate',
          referenceId: 'rate-test-456',
          requestData: {
            currency_pair: 'USD/EUR',
            old_rate: 0.85,
            new_rate: 0.87,
            variance_percent: 2.35
          }
        });

      const requestId = createResponse.body.data.request_id;

      const response = await request(app)
        .get(`/api/paylinq/approvals/${requestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.request_id).toBe(requestId);
      expect(response.body.data).toHaveProperty('actions');
      expect(Array.isArray(response.body.data.actions)).toBe(true);

      // Cleanup
      await db.query(
        'DELETE FROM currency_approval_request WHERE request_id = $1',
        [requestId]
      );
    });

    test('should return 404 for nonexistent request', async () => {
      const response = await request(app)
        .get('/api/paylinq/approvals/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should validate UUID format', async () => {
      await request(app)
        .get('/api/paylinq/approvals/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('POST /api/paylinq/approvals/:id/approve', () => {
    let pendingRequestId;

    beforeEach(async () => {
      // Create a request to approve
      const createResponse = await request(app)
        .post('/api/paylinq/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          requestType: 'bulk_rate_import',
          referenceType: 'rate_import_batch',
          referenceId: 'batch-test-789',
          requestData: {
            file_name: 'rates_nov2024.csv',
            row_count: 50
          }
        });

      pendingRequestId = createResponse.body.data.request_id;
    });

    afterEach(async () => {
      if (pendingRequestId) {
        await db.query(
          'DELETE FROM currency_approval_request WHERE request_id = $1',
          [pendingRequestId]
        );
      }
    });

    test('should approve request successfully', async () => {
      const response = await request(app)
        .post(`/api/paylinq/approvals/${pendingRequestId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          comments: 'Verified data - approved'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.current_approvals).toBeGreaterThan(0);
      expect(response.body.message).toContain('approved');
    });

    test('should accept approval without comments', async () => {
      const response = await request(app)
        .post(`/api/paylinq/approvals/${pendingRequestId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should prevent duplicate approval', async () => {
      // First approval
      await request(app)
        .post(`/api/paylinq/approvals/${pendingRequestId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ comments: 'First approval' })
        .expect(200);

      // Second approval by same user should fail
      const response = await request(app)
        .post(`/api/paylinq/approvals/${pendingRequestId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ comments: 'Second approval' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already approved');
    });

    test('should return 404 for nonexistent request', async () => {
      await request(app)
        .post('/api/paylinq/approvals/nonexistent-id/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ comments: 'Test' })
        .expect(404);
    });
  });

  describe('POST /api/paylinq/approvals/:id/reject', () => {
    let pendingRequestId;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/paylinq/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          requestType: 'configuration_change',
          referenceType: 'currency_config',
          referenceId: 'config-test-999',
          requestData: {
            change_type: 'add_currency',
            currency_code: 'JPY'
          }
        });

      pendingRequestId = createResponse.body.data.request_id;
    });

    afterEach(async () => {
      if (pendingRequestId) {
        await db.query(
          'DELETE FROM currency_approval_request WHERE request_id = $1',
          [pendingRequestId]
        );
      }
    });

    test('should reject request with comments', async () => {
      const response = await request(app)
        .post(`/api/paylinq/approvals/${pendingRequestId}/reject`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          comments: 'Insufficient documentation provided'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.message).toContain('rejected');
    });

    test('should require comments for rejection', async () => {
      const response = await request(app)
        .post(`/api/paylinq/approvals/${pendingRequestId}/reject`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Comments are required');
    });

    test('should reject empty comments', async () => {
      const response = await request(app)
        .post(`/api/paylinq/approvals/${pendingRequestId}/reject`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ comments: '   ' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/paylinq/approvals/history/:type/:id', () => {
    test('should retrieve approval history', async () => {
      const response = await request(app)
        .get('/api/paylinq/approvals/history/currency_conversion/conv-test-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      response.body.data.forEach(item => {
        expect(item).toHaveProperty('request_id');
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('requested_at');
        expect(item).toHaveProperty('actions');
      });
    });

    test('should validate reference type', async () => {
      await request(app)
        .get('/api/paylinq/approvals/history/invalid_type/test-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('POST /api/paylinq/approvals/expire', () => {
    test('should expire old requests (admin only)', async () => {
      const response = await request(app)
        .post('/api/paylinq/approvals/expire')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('expired');
      expect(typeof response.body.data.expired).toBe('number');
    });

    test('should reject non-admin users', async () => {
      // Login as regular user
      const userLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.user@paylinq.com',
          password: 'UserPassword123!'
        });

      const userToken = userLoginResponse.body.token;

      await request(app)
        .post('/api/paylinq/approvals/expire')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/paylinq/approvals/statistics', () => {
    test('should retrieve approval statistics', async () => {
      const response = await request(app)
        .get('/api/paylinq/approvals/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pending_count');
      expect(response.body.data).toHaveProperty('approved_today');
      expect(response.body.data).toHaveProperty('rejected_today');
      expect(typeof response.body.data.pending_count).toBe('number');
    });

    test('should filter statistics by date range', async () => {
      const startDate = '2024-11-01';
      const endDate = '2024-11-14';

      const response = await request(app)
        .get('/api/paylinq/approvals/statistics')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Authorization', () => {
    test('should enforce organization isolation', async () => {
      // Create request with org A
      const orgAResponse = await request(app)
        .post('/api/paylinq/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          requestType: 'conversion',
          referenceType: 'test',
          referenceId: 'org-isolation-test',
          requestData: {}
        });

      const requestId = orgAResponse.body.data.request_id;

      // Login as org B user
      const orgBLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.orgb@paylinq.com',
          password: 'OrgBPassword123!'
        });

      const orgBToken = orgBLoginResponse.body.token;

      // Try to access org A's request
      await request(app)
        .get(`/api/paylinq/approvals/${requestId}`)
        .set('Authorization', `Bearer ${orgBToken}`)
        .expect(404);

      // Cleanup
      await db.query(
        'DELETE FROM currency_approval_request WHERE request_id = $1',
        [requestId]
      );
    });
  });
});
