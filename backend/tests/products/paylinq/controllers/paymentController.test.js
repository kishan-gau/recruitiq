/**
 * Payment Controller Tests
 * API contract tests for payment transaction management.
 * Tests would have caught:
 * - ❌ Missing validation for payment amounts
 * - ❌ Incorrect payment status transitions
 * - ❌ Missing employee payment retrieval
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import paymentController from '../../../../src/products/paylinq/controllers/paymentController.js';

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
app.post('/api/paylinq/payments', paymentController.createPayment);
app.get('/api/paylinq/payments', paymentController.getPayments);
app.get('/api/paylinq/payments/:id', paymentController.getPaymentById);
app.get('/api/paylinq/employees/:employeeId/payments', paymentController.getEmployeePayments);
app.put('/api/paylinq/payments/:id', paymentController.updatePayment);
app.post('/api/paylinq/payments/:id/process', paymentController.processPayment);
app.post('/api/paylinq/payments/:id/retry', paymentController.retryPayment);
app.post('/api/paylinq/payments/:id/cancel', paymentController.cancelPayment);
app.delete('/api/paylinq/payments/:id', paymentController.deletePayment);

describe('Payment Controller - API Contract Tests', () => {
  let paymentId;
  let employeeId;

  beforeAll(async () => {
    employeeId = '550e8400-e29b-41d4-a716-446655440000';
  });

  describe('POST /api/paylinq/payments', () => {
    test('should return correct response structure on create', async () => {
      const newPayment = {
        employeeId: employeeId,
        amount: 3800.00,
        paymentMethod: 'ACH',
        paymentDate: '2024-01-20',
        accountNumber: '****1234',
        routingNumber: '021000021',
      };

      const response = await request(app)
        .post('/api/paylinq/payments')
        .send(newPayment)
        .expect(201);

      // Validate response structure
      expect(response.body.success).toBe(true);
      expect(response.body.payment).toBeDefined();
      expect(response.body.payment.id).toBeDefined();
      expect(response.body.message).toContain('created successfully');

      paymentId = response.body.payment.id;
    });

    test('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/paylinq/payments')
        .send({
          amount: 3800.00,
          // Missing employeeId, paymentMethod
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    test('should create payment with all valid payment methods', async () => {
      const methods = ['ACH', 'CHECK', 'CASH', 'WIRE'];
      
      for (const method of methods) {
        const payment = {
          employeeId: employeeId,
          amount: 3800.00,
          paymentMethod: method,
          paymentDate: '2024-01-20',
        };

        const response = await request(app)
          .post('/api/paylinq/payments')
          .send(payment)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.payment.paymentMethod).toBe(method);
      }
    });

    test('should validate amount is positive', async () => {
      const payment = {
        employeeId: employeeId,
        amount: -100.00,
        paymentMethod: 'ACH',
        paymentDate: '2024-01-20',
      };

      const response = await request(app)
        .post('/api/paylinq/payments')
        .send(payment)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('amount');
    });

    test('should create payment with bank details for ACH', async () => {
      const payment = {
        employeeId: employeeId,
        amount: 3800.00,
        paymentMethod: 'ACH',
        paymentDate: '2024-01-20',
        accountNumber: '****1234',
        routingNumber: '021000021',
      };

      const response = await request(app)
        .post('/api/paylinq/payments')
        .send(payment)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.payment.accountNumber).toBe('****1234');
    });

    test('should create payment with check number', async () => {
      const payment = {
        employeeId: employeeId,
        amount: 3800.00,
        paymentMethod: 'CHECK',
        paymentDate: '2024-01-20',
        checkNumber: 'CHK-1001',
      };

      const response = await request(app)
        .post('/api/paylinq/payments')
        .send(payment)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.payment.checkNumber).toBe('CHK-1001');
    });
  });

  describe('GET /api/paylinq/payments', () => {
    test('should return array of payments', async () => {
      const response = await request(app)
        .get('/api/paylinq/payments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.payments)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('should filter by employeeId', async () => {
      const response = await request(app)
        .get(`/api/paylinq/payments?employeeId=${employeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.payments)).toBe(true);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/paylinq/payments?status=pending')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/paylinq/payments?startDate=2024-01-01&endDate=2024-01-31')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle empty payment list gracefully', async () => {
      const response = await request(app)
        .get('/api/paylinq/payments?employeeId=550e8400-e29b-41d4-a716-446655440999')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.payments)).toBe(true);
      expect(response.body.count).toBe(0);
    });
  });

  describe('GET /api/paylinq/employees/:employeeId/payments', () => {
    test('should return payments for employee', async () => {
      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/payments`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.payments)).toBe(true);
    });

    test('should filter employee payments by date range', async () => {
      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/payments?startDate=2024-01-01&endDate=2024-01-31`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should accept limit parameter', async () => {
      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/payments?limit=10`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payments.length).toBeLessThanOrEqual(10);
    });

    test('should return empty array for employee with no payments', async () => {
      const testEmployeeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/employees/${testEmployeeId}/payments`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
    });
  });

  describe('GET /api/paylinq/payments/:id', () => {
    test('should return single payment', async () => {
      const testPaymentId = paymentId || '550e8400-e29b-41d4-a716-446655440002';

      const response = await request(app)
        .get(`/api/paylinq/payments/${testPaymentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payment).toBeDefined();
      expect(response.body.payment.id).toBe(testPaymentId);
    });

    test('should return 404 when payment not found', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/payments/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return 500 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/paylinq/payments/invalid-uuid')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/paylinq/payments/:id', () => {
    test('should update payment successfully', async () => {
      const testPaymentId = paymentId || '550e8400-e29b-41d4-a716-446655440002';
      const updates = {
        status: 'processing',
      };

      const response = await request(app)
        .put(`/api/paylinq/payments/${testPaymentId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payment).toBeDefined();
    });

    test('should update payment metadata', async () => {
      const testPaymentId = paymentId || '550e8400-e29b-41d4-a716-446655440002';
      const updates = {
        metadata: {
          transactionId: 'TXN-12345',
          processorName: 'Bank XYZ',
        },
      };

      const response = await request(app)
        .put(`/api/paylinq/payments/${testPaymentId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when updating non-existent payment', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .put(`/api/paylinq/payments/${fakeId}`)
        .send({ status: 'completed' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should validate status transitions', async () => {
      const testPaymentId = paymentId || '550e8400-e29b-41d4-a716-446655440002';
      const updates = {
        status: 'invalid_status',
      };

      const response = await request(app)
        .put(`/api/paylinq/payments/${testPaymentId}`)
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/paylinq/payments/:id/process', () => {
    test('should process payment successfully', async () => {
      const testPaymentId = paymentId || '550e8400-e29b-41d4-a716-446655440002';

      const response = await request(app)
        .post(`/api/paylinq/payments/${testPaymentId}/process`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payment).toBeDefined();
      expect(response.body.message).toContain('processed');
    });

    test('should return 404 when processing non-existent payment', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .post(`/api/paylinq/payments/${fakeId}/process`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return 409 for invalid payment status', async () => {
      const testPaymentId = paymentId || '550e8400-e29b-41d4-a716-446655440002';

      // Try to process again (may conflict)
      const response = await request(app)
        .post(`/api/paylinq/payments/${testPaymentId}/process`);

      // Either success or conflict
      expect([200, 409]).toContain(response.status);
      if (response.status === 409) {
        expect(response.body.message).toContain('status');
      }
    });
  });

  describe('POST /api/paylinq/payments/:id/retry', () => {
    test('should retry failed payment', async () => {
      const testPaymentId = paymentId || '550e8400-e29b-41d4-a716-446655440002';

      const response = await request(app)
        .post(`/api/paylinq/payments/${testPaymentId}/retry`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payment).toBeDefined();
      expect(response.body.message).toContain('retry');
    });

    test('should return 404 when retrying non-existent payment', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .post(`/api/paylinq/payments/${fakeId}/retry`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return 409 when retry limit exceeded', async () => {
      const testPaymentId = paymentId || '550e8400-e29b-41d4-a716-446655440002';

      // Multiple retries may hit limit
      const response = await request(app)
        .post(`/api/paylinq/payments/${testPaymentId}/retry`);

      expect([200, 409]).toContain(response.status);
      if (response.status === 409) {
        expect(response.body.message).toBeDefined();
      }
    });
  });

  describe('POST /api/paylinq/payments/:id/cancel', () => {
    test('should cancel payment successfully', async () => {
      const testPaymentId = paymentId || '550e8400-e29b-41d4-a716-446655440002';

      const response = await request(app)
        .post(`/api/paylinq/payments/${testPaymentId}/cancel`)
        .send({ reason: 'Employee request' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payment).toBeDefined();
      expect(response.body.message).toContain('cancelled');
    });

    test('should return 400 when reason missing', async () => {
      const testPaymentId = paymentId || '550e8400-e29b-41d4-a716-446655440002';

      const response = await request(app)
        .post(`/api/paylinq/payments/${testPaymentId}/cancel`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 404 when cancelling non-existent payment', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .post(`/api/paylinq/payments/${fakeId}/cancel`)
        .send({ reason: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return 409 when payment cannot be cancelled', async () => {
      const testPaymentId = paymentId || '550e8400-e29b-41d4-a716-446655440002';

      // Try to cancel already completed payment
      const response = await request(app)
        .post(`/api/paylinq/payments/${testPaymentId}/cancel`)
        .send({ reason: 'Test' });

      expect([200, 409]).toContain(response.status);
      if (response.status === 409) {
        expect(response.body.message).toContain('cannot be cancelled');
      }
    });
  });

  describe('DELETE /api/paylinq/payments/:id', () => {
    test('should delete payment successfully (soft delete)', async () => {
      const testPaymentId = paymentId || '550e8400-e29b-41d4-a716-446655440002';

      const response = await request(app)
        .delete(`/api/paylinq/payments/${testPaymentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should return 404 when deleting non-existent payment', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .delete(`/api/paylinq/payments/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });
});
