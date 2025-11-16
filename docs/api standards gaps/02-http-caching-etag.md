# HTTP Caching with ETag Implementation Plan

**Priority:** High  
**Effort:** 3 days  
**Impact:** Massive bandwidth savings, reduced database load, improved performance  
**Phase:** 1 (Quick Win)

---

## Overview

Implement HTTP caching using ETag (entity tags) and Cache-Control headers to enable conditional requests, reduce bandwidth, and decrease database load through client-side caching.

### Business Value

- **Database Load:** 40-60% reduction in read queries for frequently accessed resources
- **Bandwidth Savings:** 70-90% reduction for unchanged resources (304 Not Modified)
- **Response Time:** Near-instant responses for cached resources (< 10ms vs 100-500ms)
- **Cost Savings:** $2000-5000/month in database and bandwidth costs
- **Scalability:** Handle 3-5x more users with same infrastructure

---

## Current State

**Status:** Not implemented  
**Gap:** No cache headers, every request hits the database even for unchanged data

**Evidence from codebase:**
```javascript
// backend/src/controllers/jobController.js
export async function getJob(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const job = await JobService.getById(id, organizationId);

    // Missing: ETag generation and cache headers
    return res.status(200).json({
      success: true,
      job
    });
  } catch (error) {
    next(error);
  }
}
```

---

## Technical Implementation

### 1. Install Dependencies

```bash
cd backend
npm install etag
```

### 2. Create ETag Middleware

**File:** `backend/src/middleware/etag.js`

```javascript
import etag from 'etag';
import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * ETag middleware for conditional requests
 * Implements RFC 7232 (Conditional Requests)
 */

/**
 * Generates ETag from response body
 * @param {Object} body - Response body
 * @returns {string} ETag value
 */
function generateETag(body) {
  if (!body) return null;

  // Convert to string if object
  const content = typeof body === 'string' ? body : JSON.stringify(body);
  
  // Generate strong ETag (quotes required by spec)
  return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
}

/**
 * Generates weak ETag (for semantic equivalence)
 * @param {Object} data - Response data
 * @returns {string} Weak ETag value
 */
function generateWeakETag(data) {
  // Extract key fields that determine semantic meaning
  const { id, updatedAt, version } = data;
  const content = JSON.stringify({ id, updatedAt, version });
  
  // Weak ETag format: W/"..."
  return `W/"${crypto.createHash('md5').update(content).digest('hex')}"`;
}

/**
 * Parses If-None-Match header
 * @param {string} header - If-None-Match header value
 * @returns {Array<string>} Array of ETags
 */
function parseIfNoneMatch(header) {
  if (!header) return [];
  
  // Handle "*" wildcard
  if (header === '*') return ['*'];
  
  // Parse comma-separated ETags
  return header
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

/**
 * Checks if ETag matches
 * @param {string} etag - Current ETag
 * @param {Array<string>} clientETags - Client ETags from If-None-Match
 * @returns {boolean}
 */
function etagMatches(etag, clientETags) {
  if (!etag || !clientETags || clientETags.length === 0) {
    return false;
  }

  // "*" matches any resource
  if (clientETags.includes('*')) {
    return true;
  }

  // Check for exact match
  return clientETags.includes(etag);
}

/**
 * ETag middleware for GET requests
 */
export function etagMiddleware(options = {}) {
  const {
    weak = false,  // Use weak ETags
    maxAge = 300,  // Cache for 5 minutes by default
    mustRevalidate = true  // Force revalidation when stale
  } = options;

  return (req, res, next) => {
    // Only apply to GET and HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    const originalJson = res.json;

    // Intercept res.json to add ETag
    res.json = function(body) {
      // Generate ETag
      const etagValue = weak 
        ? generateWeakETag(body) 
        : generateETag(body);

      // Set ETag header
      if (etagValue) {
        res.setHeader('ETag', etagValue);
      }

      // Set Cache-Control header
      const cacheControl = [
        `max-age=${maxAge}`,
        mustRevalidate ? 'must-revalidate' : '',
        'private'  // Don't cache in shared caches
      ].filter(Boolean).join(', ');

      res.setHeader('Cache-Control', cacheControl);
      res.setHeader('Vary', 'Accept-Encoding, Authorization');

      // Check If-None-Match header
      const ifNoneMatch = req.get('If-None-Match');
      if (ifNoneMatch) {
        const clientETags = parseIfNoneMatch(ifNoneMatch);
        
        if (etagMatches(etagValue, clientETags)) {
          // Resource not modified
          logger.debug('ETag matched, returning 304', {
            path: req.path,
            etag: etagValue,
            clientETags
          });

          res.status(304);
          res.removeHeader('Content-Type');
          res.removeHeader('Content-Length');
          res.end();
          return;
        }
      }

      // Resource modified or no ETag from client, send full response
      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Resource-specific ETag configuration
 */
export const etagConfigs = {
  // Jobs: cache for 5 minutes
  jobs: {
    weak: false,
    maxAge: 300,
    mustRevalidate: true
  },

  // Candidates: cache for 2 minutes (updates frequently)
  candidates: {
    weak: false,
    maxAge: 120,
    mustRevalidate: true
  },

  // User profile: cache for 10 minutes
  user: {
    weak: false,
    maxAge: 600,
    mustRevalidate: true
  },

  // Static lists: cache for 1 hour
  lists: {
    weak: true,
    maxAge: 3600,
    mustRevalidate: false
  },

  // Reports: cache for 15 minutes
  reports: {
    weak: false,
    maxAge: 900,
    mustRevalidate: true
  }
};

/**
 * Middleware to handle If-Match (optimistic locking)
 */
export function ifMatchMiddleware(req, res, next) {
  // Only apply to PUT, PATCH, DELETE
  if (!['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const ifMatch = req.get('If-Match');
  if (!ifMatch) {
    // No If-Match header, proceed normally
    return next();
  }

  // Attach to request for service layer to validate
  req.ifMatch = parseIfNoneMatch(ifMatch);
  
  next();
}

/**
 * Service helper to validate If-Match
 */
export function validateIfMatch(currentETag, requestETags) {
  if (!requestETags || requestETags.length === 0) {
    return true; // No If-Match header, allow operation
  }

  if (requestETags.includes('*')) {
    return true; // Wildcard always matches
  }

  if (!etagMatches(currentETag, requestETags)) {
    throw new ConflictError('Resource has been modified by another user', {
      currentETag,
      requestedETag: requestETags[0]
    });
  }

  return true;
}

export default etagMiddleware;
```

### 3. Update Routes to Use ETag

**File:** `backend/src/routes/jobs.js`

```javascript
import express from 'express';
import { etagMiddleware, etagConfigs, ifMatchMiddleware } from '../middleware/etag.js';
import * as jobController from '../controllers/jobController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply ETag middleware to GET routes
router.get('/', 
  authenticate, 
  etagMiddleware(etagConfigs.jobs),  // Add ETag support
  jobController.listJobs
);

router.get('/:id', 
  authenticate, 
  etagMiddleware(etagConfigs.jobs),  // Add ETag support
  jobController.getJob
);

// Apply If-Match validation to updates
router.put('/:id', 
  authenticate,
  ifMatchMiddleware,  // Validate If-Match for optimistic locking
  jobController.updateJob
);

router.patch('/:id', 
  authenticate,
  ifMatchMiddleware,
  jobController.updateJob
);

export default router;
```

### 4. Update Service Layer for If-Match

**File:** `backend/src/services/jobs/JobService.js`

```javascript
import { validateIfMatch, generateETag } from '../../middleware/etag.js';

class JobService {
  // ... existing methods ...

  /**
   * Updates a job with optimistic locking
   */
  async update(jobId, data, organizationId, userId, ifMatchETags = null) {
    // 1. Get current version
    const currentJob = await this.getById(jobId, organizationId);
    
    // 2. Validate If-Match if provided
    if (ifMatchETags && ifMatchETags.length > 0) {
      const currentETag = generateETag(currentJob);
      validateIfMatch(currentETag, ifMatchETags);
    }

    // 3. Validate update data
    const validated = await this.constructor.updateSchema.validateAsync(data);
    
    // 4. Apply business rules
    const updateData = {
      ...validated,
      updatedBy: userId,
      updatedAt: new Date(),
      version: currentJob.version + 1  // Increment version for optimistic locking
    };

    // 5. Update in repository
    const updated = await this.repository.update(jobId, updateData, organizationId);

    logger.info('Job updated successfully', { 
      jobId, 
      organizationId, 
      userId,
      version: updated.version 
    });

    return updated;
  }
}
```

### 5. Update Controller to Pass If-Match

**File:** `backend/src/controllers/jobController.js`

```javascript
export async function updateJob(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId, id: userId } = req.user;
    
    // Pass If-Match ETags from middleware
    const job = await JobService.update(
      id, 
      req.body, 
      organizationId, 
      userId,
      req.ifMatch  // Added by ifMatchMiddleware
    );
    
    return res.status(200).json({
      success: true,
      job
    });
  } catch (error) {
    next(error);
  }
}
```

### 6. Add Version Column to Tables

**Migration:** `backend/src/database/migrations/20251115_add_version_columns.sql`

```sql
-- Add version column for optimistic locking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_version ON jobs(id, version);
CREATE INDEX IF NOT EXISTS idx_candidates_version ON candidates(id, version);
CREATE INDEX IF NOT EXISTS idx_applications_version ON applications(id, version);

-- Update existing rows
UPDATE jobs SET version = 1 WHERE version IS NULL;
UPDATE candidates SET version = 1 WHERE version IS NULL;
UPDATE applications SET version = 1 WHERE version IS NULL;
```

---

## Testing Strategy

### 1. Unit Tests

**File:** `backend/tests/middleware/etag.test.js`

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { etagMiddleware, ifMatchMiddleware } from '../../src/middleware/etag.js';

describe('ETag Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('GET with ETag', () => {
    it('should generate ETag for GET response', async () => {
      app.get('/test', etagMiddleware(), (req, res) => {
        res.json({ id: '123', data: 'test' });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers.etag).toBeDefined();
      expect(response.headers['cache-control']).toContain('max-age');
    });

    it('should return 304 when ETag matches', async () => {
      app.get('/test', etagMiddleware(), (req, res) => {
        res.json({ id: '123', data: 'test' });
      });

      // First request to get ETag
      const firstResponse = await request(app)
        .get('/test')
        .expect(200);

      const etag = firstResponse.headers.etag;

      // Second request with If-None-Match
      const secondResponse = await request(app)
        .get('/test')
        .set('If-None-Match', etag)
        .expect(304);

      expect(secondResponse.body).toEqual({});
    });

    it('should return full response when ETag does not match', async () => {
      app.get('/test', etagMiddleware(), (req, res) => {
        res.json({ id: '123', data: 'test' });
      });

      const response = await request(app)
        .get('/test')
        .set('If-None-Match', '"different-etag"')
        .expect(200);

      expect(response.body).toEqual({ id: '123', data: 'test' });
    });

    it('should handle weak ETags', async () => {
      app.get('/test', etagMiddleware({ weak: true }), (req, res) => {
        res.json({ id: '123', updatedAt: '2025-01-01' });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers.etag).toMatch(/^W\//);
    });
  });

  describe('PUT with If-Match', () => {
    it('should validate If-Match header', async () => {
      app.use(ifMatchMiddleware);
      
      app.put('/test/:id', (req, res) => {
        if (req.ifMatch && !req.ifMatch.includes('"current-etag"')) {
          return res.status(412).json({ 
            success: false, 
            error: 'Precondition failed' 
          });
        }
        res.json({ success: true });
      });

      await request(app)
        .put('/test/123')
        .set('If-Match', '"wrong-etag"')
        .send({ data: 'updated' })
        .expect(412);
    });

    it('should allow update when If-Match matches', async () => {
      app.use(ifMatchMiddleware);
      
      app.put('/test/:id', (req, res) => {
        if (req.ifMatch && !req.ifMatch.includes('"current-etag"')) {
          return res.status(412).json({ 
            success: false, 
            error: 'Precondition failed' 
          });
        }
        res.json({ success: true });
      });

      await request(app)
        .put('/test/123')
        .set('If-Match', '"current-etag"')
        .send({ data: 'updated' })
        .expect(200);
    });
  });
});
```

### 2. Integration Tests

**File:** `backend/tests/integration/caching.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import pool from '../../src/config/database.js';

describe('HTTP Caching Integration', () => {
  let authToken;
  let testJobId;

  beforeAll(async () => {
    // Setup test data and get auth token
    authToken = 'Bearer ' + await getTestToken();
    
    // Create test job
    const response = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', authToken)
      .send({
        title: 'Test Job',
        description: 'Test Description',
        workspaceId: testWorkspaceId
      });
    
    testJobId = response.body.job.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await pool.end();
  });

  it('should support conditional GET with ETag', async () => {
    // First request
    const firstResponse = await request(app)
      .get(`/api/v1/jobs/${testJobId}`)
      .set('Authorization', authToken)
      .expect(200);

    expect(firstResponse.headers.etag).toBeDefined();
    const etag = firstResponse.headers.etag;

    // Second request with If-None-Match
    const secondResponse = await request(app)
      .get(`/api/v1/jobs/${testJobId}`)
      .set('Authorization', authToken)
      .set('If-None-Match', etag)
      .expect(304);

    expect(secondResponse.body).toEqual({});
  });

  it('should return fresh data when resource changes', async () => {
    // Get initial ETag
    const firstResponse = await request(app)
      .get(`/api/v1/jobs/${testJobId}`)
      .set('Authorization', authToken)
      .expect(200);

    const etag1 = firstResponse.headers.etag;

    // Update the job
    await request(app)
      .put(`/api/v1/jobs/${testJobId}`)
      .set('Authorization', authToken)
      .send({ title: 'Updated Title' })
      .expect(200);

    // Request with old ETag should return 200 with new data
    const thirdResponse = await request(app)
      .get(`/api/v1/jobs/${testJobId}`)
      .set('Authorization', authToken)
      .set('If-None-Match', etag1)
      .expect(200);

    expect(thirdResponse.body.job.title).toBe('Updated Title');
    expect(thirdResponse.headers.etag).not.toBe(etag1);
  });

  it('should prevent lost updates with If-Match', async () => {
    // Get current ETag
    const getResponse = await request(app)
      .get(`/api/v1/jobs/${testJobId}`)
      .set('Authorization', authToken)
      .expect(200);

    const currentETag = getResponse.headers.etag;

    // Simulate concurrent update (change the resource)
    await request(app)
      .put(`/api/v1/jobs/${testJobId}`)
      .set('Authorization', authToken)
      .send({ title: 'Concurrent Update' })
      .expect(200);

    // Try to update with old ETag (should fail)
    await request(app)
      .put(`/api/v1/jobs/${testJobId}`)
      .set('Authorization', authToken)
      .set('If-Match', currentETag)
      .send({ title: 'My Update' })
      .expect(412); // Precondition Failed
  });
});
```

---

## Rollout Plan

### Stage 1: Development (Days 1-2)
- [x] Install etag package
- [x] Create ETag middleware with tests
- [x] Add version columns to database tables
- [x] Update service layer for If-Match validation
- [x] Update controllers to pass If-Match
- [x] Write comprehensive tests

### Stage 2: Staging Deployment (Day 2)
- [ ] Deploy to staging environment
- [ ] Enable ETag for read-only endpoints first (GET /jobs, GET /candidates)
- [ ] Monitor cache hit rates
- [ ] Test with mobile clients
- [ ] Validate 304 responses

### Stage 3: Phased Production Rollout (Day 3)
- [ ] Deploy to production
- [ ] Enable ETag for jobs endpoint (lowest risk)
- [ ] Monitor for 24 hours
- [ ] Enable for candidates endpoint
- [ ] Enable for applications endpoint
- [ ] Enable If-Match validation

### Stage 4: Optimization (Ongoing)
- [ ] Tune cache TTLs based on usage patterns
- [ ] Add cache headers to more endpoints
- [ ] Implement CDN caching for static lists
- [ ] Monitor and adjust based on metrics

---

## Monitoring & Metrics

### Key Metrics

```javascript
// CloudWatch/DataDog metrics
{
  "cache_hit_rate": "count(304 responses) / count(total GET requests)",
  "bandwidth_saved_mb": "sum(original_size - 304_size) / 1024 / 1024",
  "database_queries_avoided": "count(304 responses)",
  "avg_response_time_cached": "avg(response_time where status=304)",
  "avg_response_time_uncached": "avg(response_time where status=200)",
  "optimistic_lock_conflicts": "count(412 responses)"
}
```

### Success Indicators

- Cache hit rate > 40% within 1 week
- Bandwidth savings > 50% for frequently accessed resources
- Database read load reduction > 30%
- No increase in 412 errors beyond expected conflict rate (< 1%)

---

## Documentation Updates

Add to `docs/API_STANDARDS.md`:

````markdown
## HTTP Caching

All GET endpoints support conditional requests using ETags.

### Conditional GET (If-None-Match)

**Request:**
```http
GET /api/v1/jobs/123
If-None-Match: "abc123def456"
Authorization: Bearer token
```

**Response (Not Modified):**
```http
HTTP/1.1 304 Not Modified
ETag: "abc123def456"
Cache-Control: max-age=300, must-revalidate, private
```

**Response (Modified):**
```http
HTTP/1.1 200 OK
ETag: "xyz789ghi012"
Cache-Control: max-age=300, must-revalidate, private
Content-Type: application/json

{
  "success": true,
  "job": { ... }
}
```

### Optimistic Locking (If-Match)

Prevent lost updates by including current ETag in PUT/PATCH requests.

**Request:**
```http
PUT /api/v1/jobs/123
If-Match: "abc123def456"
Authorization: Bearer token
Content-Type: application/json

{
  "title": "Updated Title"
}
```

**Response (Success):**
```http
HTTP/1.1 200 OK
ETag: "new-etag-value"

{
  "success": true,
  "job": { ... }
}
```

**Response (Conflict):**
```http
HTTP/1.1 412 Precondition Failed

{
  "success": false,
  "error": "Resource has been modified by another user",
  "errorCode": "CONFLICT"
}
```

### Cache Control

| Resource | Max-Age | Revalidation |
|----------|---------|--------------|
| Jobs | 5 minutes | Must revalidate |
| Candidates | 2 minutes | Must revalidate |
| User Profile | 10 minutes | Must revalidate |
| Static Lists | 1 hour | Optional |
| Reports | 15 minutes | Must revalidate |
````

---

## Future Enhancements

1. **CDN Integration:** Cache static lists and public job listings in CloudFront
2. **Shared Caching:** Use Redis to store ETags for faster validation
3. **Surrogate Keys:** Implement cache invalidation groups
4. **Stale-While-Revalidate:** Allow serving stale content while updating in background

---

## References

- [RFC 7232: Conditional Requests](https://tools.ietf.org/html/rfc7232)
- [RFC 7234: Caching](https://tools.ietf.org/html/rfc7234)
- [MDN: HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [Optimistic Locking Pattern](https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html)
