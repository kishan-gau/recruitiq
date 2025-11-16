# Idempotency Keys Implementation Plan

**Priority:** Critical (especially for PayLinQ)  
**Effort:** 3 days  
**Impact:** Prevents duplicate financial transactions, ensures data integrity  
**Phase:** 2 (High-Value)

---

## Overview

Implement idempotency keys for POST and PATCH operations to prevent duplicate requests from creating duplicate resources, which is critical for financial transactions in PayLinQ and prevents data corruption from network retries.

### Business Value

- **Financial Safety:** Prevent duplicate payments, payroll runs, invoices (could save $100K+ annually)
- **Data Integrity:** Eliminate duplicate records from network retries
- **User Trust:** Users can safely retry operations without fear of duplicates
- **Compliance:** Required for PCI-DSS and financial regulations
- **Support Costs:** Reduce tickets related to duplicate transactions by 80%

---

## Current State

**Status:** Not implemented  
**Gap:** Duplicate POST requests create duplicate resources

**Current Risk:**
```javascript
// User submits payment
POST /api/v1/payroll/payments
{
  "amount": 5000,
  "employeeId": "123"
}

// Network timeout, user retries
POST /api/v1/payroll/payments (same data)
// Result: Employee paid twice! 💸
```

---

## Technical Implementation

### 1. Create Idempotency Middleware

**File:** `backend/src/middleware/idempotency.js`

```javascript
import crypto from 'crypto';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import { ConflictProblem } from '../utils/ProblemDetails.js';

const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours in seconds

/**
 * Idempotency middleware using Redis
 * Implements idempotency keys per RFC draft-ietf-httpapi-idempotency-key-header
 */

/**
 * Generates idempotency key from request
 * @param {Object} req - Express request
 * @returns {string} Idempotency key
 */
function getIdempotencyKey(req) {
  // Priority 1: Client-provided key
  const clientKey = req.get('Idempotency-Key');
  if (clientKey) {
    return `idem:${req.user.organizationId}:${clientKey}`;
  }

  // Priority 2: Generate from request fingerprint
  const fingerprint = JSON.stringify({
    method: req.method,
    path: req.path,
    body: req.body,
    userId: req.user.id
  });

  const hash = crypto.createHash('sha256').update(fingerprint).digest('hex');
  return `idem:${req.user.organizationId}:auto:${hash}`;
}

/**
 * Stores response in Redis for idempotency
 */
async function storeIdempotentResponse(key, statusCode, body) {
  const data = JSON.stringify({
    statusCode,
    body,
    timestamp: new Date().toISOString()
  });

  await redis.setex(key, IDEMPOTENCY_TTL, data);
}

/**
 * Retrieves cached idempotent response
 */
async function getIdempotentResponse(key) {
  const data = await redis.get(key);
  
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch (error) {
    logger.error('Failed to parse idempotent response', { key, error: error.message });
    return null;
  }
}

/**
 * Idempotency middleware
 * @param {Object} options - Configuration options
 */
export function idempotencyMiddleware(options = {}) {
  const {
    methods = ['POST', 'PATCH'],
    requireKey = false,  // If true, require Idempotency-Key header
    conflictWindow = 5000  // 5 second window for detecting concurrent requests
  } = options;

  return async (req, res, next) => {
    // Only apply to specified methods
    if (!methods.includes(req.method)) {
      return next();
    }

    // Generate idempotency key
    const idempotencyKey = getIdempotencyKey(req);
    
    // Check if key is required but missing
    if (requireKey && !req.get('Idempotency-Key')) {
      return res.status(400)
        .type('application/problem+json')
        .json({
          type: 'https://api.recruitiq.com/problems/missing-idempotency-key',
          title: 'Idempotency Key Required',
          status: 400,
          detail: 'This endpoint requires an Idempotency-Key header',
          instance: req.originalUrl
        });
    }

    try {
      // Check if request already processed
      const cached = await getIdempotentResponse(idempotencyKey);
      
      if (cached) {
        logger.info('Returning cached idempotent response', {
          key: idempotencyKey,
          originalTimestamp: cached.timestamp,
          path: req.path
        });

        // Return cached response
        return res
          .status(cached.statusCode)
          .set('Idempotent-Replayed', 'true')
          .set('Original-Request-Time', cached.timestamp)
          .json(cached.body);
      }

      // Check for concurrent request (within conflict window)
      const lockKey = `${idempotencyKey}:lock`;
      const lockAcquired = await redis.set(
        lockKey,
        req.user.id,
        'PX', conflictWindow,
        'NX'
      );

      if (!lockAcquired) {
        // Another request with same idempotency key is in progress
        logger.warn('Concurrent idempotent request detected', {
          key: idempotencyKey,
          userId: req.user.id,
          path: req.path
        });

        throw new ConflictProblem(
          'A request with this idempotency key is currently being processed',
          'concurrent_request',
          req.originalUrl
        );
      }

      // Intercept response to cache it
      const originalJson = res.json;
      const originalStatus = res.status;
      let statusCode = 200;

      res.status = function(code) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      res.json = async function(body) {
        // Only cache successful responses (2xx)
        if (statusCode >= 200 && statusCode < 300) {
          try {
            await storeIdempotentResponse(idempotencyKey, statusCode, body);
            
            // Set idempotency headers
            res.set('Idempotency-Key', req.get('Idempotency-Key') || 'auto-generated');
            res.set('Idempotent-Replayed', 'false');
          } catch (error) {
            logger.error('Failed to store idempotent response', {
              error: error.message,
              key: idempotencyKey
            });
          }
        }

        // Release lock
        await redis.del(lockKey);

        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware specifically for financial operations (stricter)
 */
export function financialIdempotency() {
  return idempotencyMiddleware({
    methods: ['POST', 'PATCH'],
    requireKey: true,  // MUST have idempotency key
    conflictWindow: 10000  // 10 second window
  });
}

/**
 * Helper to generate idempotency key for client
 */
export function generateIdempotencyKey() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Manually invalidate idempotency key (admin only)
 */
export async function invalidateIdempotencyKey(key, organizationId) {
  const fullKey = `idem:${organizationId}:${key}`;
  await redis.del(fullKey);
  
  logger.info('Idempotency key invalidated', { key: fullKey });
}

export default idempotencyMiddleware;
```

### 2. Apply to Routes

**File:** `backend/src/products/paylinq/routes/payments.js`

```javascript
import express from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { financialIdempotency } from '../../../middleware/idempotency.js';
import * as paymentController from '../controllers/paymentController.js';

const router = express.Router();

// Critical financial operations REQUIRE idempotency key
router.post('/',
  authenticate,
  financialIdempotency(),  // Strict idempotency for payments
  paymentController.createPayment
);

router.post('/bulk',
  authenticate,
  financialIdempotency(),
  paymentController.createBulkPayments
);

router.patch('/:id/approve',
  authenticate,
  financialIdempotency(),  // Prevent double-approval
  paymentController.approvePayment
);

export default router;
```

**File:** `backend/src/routes/jobs.js`

```javascript
import { idempotencyMiddleware } from '../middleware/idempotency.js';

// Optional idempotency for regular operations
router.post('/',
  authenticate,
  idempotencyMiddleware({ requireKey: false }),  // Optional
  jobController.createJob
);

router.post('/bulk',
  authenticate,
  idempotencyMiddleware({ requireKey: true }),  // Required for bulk
  jobController.createBulkJobs
);
```

### 3. Client-Side Implementation

**File:** `packages/api-client/src/interceptors.js`

```javascript
import { v4 as uuidv4 } from 'uuid';

/**
 * Adds idempotency key to requests
 */
export function addIdempotencyKey(config) {
  // Only for POST/PATCH
  if (!['POST', 'PATCH'].includes(config.method?.toUpperCase())) {
    return config;
  }

  // Skip if already has key
  if (config.headers['Idempotency-Key']) {
    return config;
  }

  // Generate and add key
  const idempotencyKey = uuidv4();
  config.headers['Idempotency-Key'] = idempotencyKey;

  // Store for retry logic
  config.metadata = {
    ...config.metadata,
    idempotencyKey
  };

  return config;
}

/**
 * Retry interceptor that preserves idempotency key
 */
export function retryWithIdempotency(error) {
  const config = error.config;

  // Only retry safe methods or those with idempotency key
  if (!config || (!config.metadata?.idempotencyKey && config.method !== 'GET')) {
    return Promise.reject(error);
  }

  // Retry network errors
  if (!error.response && config.metadata?.retryCount < 3) {
    config.metadata.retryCount = (config.metadata.retryCount || 0) + 1;

    console.log(`Retrying request with idempotency key: ${config.metadata.idempotencyKey}`);

    return new Promise(resolve => {
      setTimeout(() => resolve(axios(config)), 1000 * config.metadata.retryCount);
    });
  }

  return Promise.reject(error);
}
```

### 4. Database Schema for Tracking

**Migration:** `backend/src/database/migrations/20251115_add_idempotency_tracking.sql`

```sql
-- Optional: Track idempotency keys in database (backup to Redis)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(255) NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Request details
  http_method VARCHAR(10) NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  request_body JSONB,
  
  -- Response details
  response_status_code INTEGER,
  response_body JSONB,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
  
  CONSTRAINT uq_idempotency_key UNIQUE (organization_id, idempotency_key)
);

-- Index for lookups
CREATE INDEX idx_idempotency_keys_lookup 
ON idempotency_keys(organization_id, idempotency_key) 
WHERE expires_at > CURRENT_TIMESTAMP;

-- Index for cleanup
CREATE INDEX idx_idempotency_keys_expiry 
ON idempotency_keys(expires_at);

-- Auto-delete expired keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_keys 
  WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Run cleanup daily
-- (Configure with pg_cron or application cron job)
```

---

## Testing Strategy

### 1. Unit Tests

**File:** `backend/tests/middleware/idempotency.test.js`

```javascript
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import redis from '../../src/config/redis.js';
import { idempotencyMiddleware, generateIdempotencyKey } from '../../src/middleware/idempotency.js';

describe('Idempotency Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication
    app.use((req, res, next) => {
      req.user = { id: 'user-123', organizationId: 'org-123' };
      next();
    });
  });

  afterEach(async () => {
    // Clean up Redis
    await redis.flushdb();
  });

  describe('POST with idempotency key', () => {
    it('should process first request normally', async () => {
      app.post('/test', idempotencyMiddleware(), (req, res) => {
        res.status(201).json({ id: '123', data: 'created' });
      });

      const idempotencyKey = generateIdempotencyKey();

      const response = await request(app)
        .post('/test')
        .set('Idempotency-Key', idempotencyKey)
        .send({ data: 'test' })
        .expect(201);

      expect(response.body.id).toBe('123');
      expect(response.headers['idempotent-replayed']).toBe('false');
    });

    it('should return cached response for duplicate request', async () => {
      app.post('/test', idempotencyMiddleware(), (req, res) => {
        res.status(201).json({ id: '123', data: 'created' });
      });

      const idempotencyKey = generateIdempotencyKey();

      // First request
      await request(app)
        .post('/test')
        .set('Idempotency-Key', idempotencyKey)
        .send({ data: 'test' })
        .expect(201);

      // Duplicate request
      const response = await request(app)
        .post('/test')
        .set('Idempotency-Key', idempotencyKey)
        .send({ data: 'test' })
        .expect(201);

      expect(response.headers['idempotent-replayed']).toBe('true');
      expect(response.headers['original-request-time']).toBeDefined();
    });

    it('should reject concurrent requests with same key', async () => {
      app.post('/test', idempotencyMiddleware(), async (req, res) => {
        // Simulate slow operation
        await new Promise(resolve => setTimeout(resolve, 100));
        res.status(201).json({ id: '123' });
      });

      const idempotencyKey = generateIdempotencyKey();

      // Start two concurrent requests
      const [response1, response2] = await Promise.allSettled([
        request(app)
          .post('/test')
          .set('Idempotency-Key', idempotencyKey)
          .send({ data: 'test' }),
        request(app)
          .post('/test')
          .set('Idempotency-Key', idempotencyKey)
          .send({ data: 'test' })
      ]);

      // One should succeed, one should get 409 Conflict
      const statuses = [response1.value?.status, response2.value?.status].sort();
      expect(statuses).toEqual([201, 409]);
    });

    it('should require idempotency key when configured', async () => {
      app.post('/test', idempotencyMiddleware({ requireKey: true }), (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .post('/test')
        .send({ data: 'test' })
        .expect(400);
    });

    it('should not cache error responses', async () => {
      app.post('/test', idempotencyMiddleware(), (req, res) => {
        res.status(400).json({ error: 'Bad request' });
      });

      const idempotencyKey = generateIdempotencyKey();

      // First request (error)
      await request(app)
        .post('/test')
        .set('Idempotency-Key', idempotencyKey)
        .send({ data: 'test' })
        .expect(400);

      // Check that error response was not cached
      const cached = await redis.get(`idem:org-123:${idempotencyKey}`);
      expect(cached).toBeNull();
    });
  });

  describe('Auto-generated keys', () => {
    it('should generate key from request fingerprint', async () => {
      app.post('/test', idempotencyMiddleware(), (req, res) => {
        res.status(201).json({ id: '123' });
      });

      // Same request twice without idempotency key
      const requestData = { data: 'test', value: 123 };

      await request(app)
        .post('/test')
        .send(requestData)
        .expect(201);

      const response = await request(app)
        .post('/test')
        .send(requestData)
        .expect(201);

      // Should be cached (auto-generated key)
      expect(response.headers['idempotent-replayed']).toBe('true');
    });
  });
});
```

### 2. Integration Tests

**File:** `backend/tests/integration/idempotency-payments.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import pool from '../../src/config/database.js';
import redis from '../../src/config/redis.js';
import { generateIdempotencyKey } from '../../src/middleware/idempotency.js';

describe('Payment Idempotency Integration', () => {
  let authToken;
  let testEmployeeId;

  beforeAll(async () => {
    // Setup test data
    authToken = await getTestAuthToken();
    testEmployeeId = await createTestEmployee();
  });

  afterAll(async () => {
    await cleanupTestData();
    await redis.flushdb();
    await pool.end();
  });

  it('should prevent duplicate payment creation', async () => {
    const idempotencyKey = generateIdempotencyKey();
    const paymentData = {
      employeeId: testEmployeeId,
      amount: 5000.00,
      currency: 'USD',
      description: 'Salary payment'
    };

    // First payment request
    const response1 = await request(app)
      .post('/api/products/paylinq/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(paymentData)
      .expect(201);

    const paymentId = response1.body.payment.id;

    // Duplicate request (network retry)
    const response2 = await request(app)
      .post('/api/products/paylinq/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(paymentData)
      .expect(201);

    // Should return same payment ID
    expect(response2.body.payment.id).toBe(paymentId);
    expect(response2.headers['idempotent-replayed']).toBe('true');

    // Verify only one payment exists in database
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM payments WHERE employee_id = $1',
      [testEmployeeId]
    );
    expect(parseInt(result.rows[0].count)).toBe(1);
  });

  it('should allow different payments with different keys', async () => {
    const key1 = generateIdempotencyKey();
    const key2 = generateIdempotencyKey();

    const paymentData = {
      employeeId: testEmployeeId,
      amount: 1000.00,
      currency: 'USD'
    };

    // First payment
    const response1 = await request(app)
      .post('/api/products/paylinq/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', key1)
      .send(paymentData)
      .expect(201);

    // Second payment (different key)
    const response2 = await request(app)
      .post('/api/products/paylinq/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', key2)
      .send(paymentData)
      .expect(201);

    // Should be different payments
    expect(response1.body.payment.id).not.toBe(response2.body.payment.id);
  });
});
```

---

## Rollout Plan

### Stage 1: Infrastructure (Day 1)
- [x] Create idempotency middleware
- [x] Add Redis configuration
- [x] Write comprehensive tests
- [x] Create database schema (optional backup)

### Stage 2: PayLinQ Critical Endpoints (Day 2)
- [ ] Apply to `/payments` endpoint (REQUIRED key)
- [ ] Apply to `/payroll-runs` endpoint
- [ ] Apply to `/approvals` endpoint
- [ ] Deploy to staging
- [ ] Test duplicate scenarios thoroughly

### Stage 3: Other Critical Endpoints (Day 2-3)
- [ ] Apply to job creation endpoints
- [ ] Apply to application submissions
- [ ] Apply to interview scheduling
- [ ] Deploy to staging

### Stage 4: Production (Day 3)
- [ ] Deploy to production during low-traffic window
- [ ] Monitor Redis memory usage
- [ ] Monitor idempotency hit rate
- [ ] Document for API consumers

---

## Monitoring

### Key Metrics

```javascript
{
  "idempotency_hits": "count(requests where Idempotent-Replayed=true)",
  "idempotency_hit_rate": "hits / total_requests",
  "concurrent_conflicts": "count(409 responses with concurrent_request)",
  "redis_memory_idempotency": "sum(memory for idem:* keys)",
  "avg_key_ttl": "avg(ttl for idem:* keys)"
}
```

### Success Indicators
- Zero duplicate financial transactions
- < 0.1% concurrent conflicts
- Idempotency hit rate 5-10% (indicates retries are working)
- Redis memory < 100MB for idempotency keys

---

## Documentation

Add to client SDK documentation:

```javascript
// Automatic idempotency (recommended)
const payment = await paylinqClient.payments.create({
  employeeId: '123',
  amount: 5000
});
// SDK automatically adds Idempotency-Key header

// Manual idempotency key
import { v4 as uuidv4 } from 'uuid';
const idempotencyKey = uuidv4();

const payment = await paylinqClient.payments.create({
  employeeId: '123',
  amount: 5000
}, {
  headers: { 'Idempotency-Key': idempotencyKey }
});

// Retry with same key is safe
await paylinqClient.payments.create(sameData, {
  headers: { 'Idempotency-Key': idempotencyKey }
});
// Returns cached response, no duplicate payment
```

---

## References

- [IETF HTTP Idempotency Key Header Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [Stripe Idempotency](https://stripe.com/docs/api/idempotent_requests)
- [PayPal Idempotency](https://developer.paypal.com/docs/api/reference/api-idempotency/)
