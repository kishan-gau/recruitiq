# Conditional Requests Implementation Plan

**Priority:** Medium  
**Effort:** 2 days  
**Impact:** Prevents lost updates, optimistic locking, efficient conditional operations  
**Phase:** 2 (High-Value)

---

## Overview

Implement HTTP conditional requests using `If-Match`, `If-None-Match`, `If-Modified-Since`, and `If-Unmodified-Since` headers to enable optimistic locking, prevent lost updates, and support efficient conditional operations.

### Business Value

- **Data Integrity:** Prevents lost updates when multiple users edit same resource
- **Optimistic Locking:** No need for database locks, better scalability
- **Bandwidth Savings:** Conditional GET returns 304 Not Modified when unchanged
- **User Experience:** Detect conflicts before overwriting data
- **Compliance:** Standard HTTP mechanism for concurrent edits

---

## Current State

**Status:** Partially implemented (ETag only)  
**Gap:** ETags exist but conditional requests not validated

**Current Problem:**
```javascript
// User A loads job at 10:00 AM
GET /api/v1/jobs/123
Response: { id: 123, title: "Developer", etag: "abc123" }

// User B loads same job at 10:01 AM
GET /api/v1/jobs/123
Response: { id: 123, title: "Developer", etag: "abc123" }

// User B updates job at 10:02 AM
PUT /api/v1/jobs/123
{ title: "Senior Developer" }
Response: 200 OK, etag: "def456"

// User A updates job at 10:03 AM (OVERWRITES User B's changes!)
PUT /api/v1/jobs/123
{ title: "Junior Developer" }
Response: 200 OK, etag: "ghi789"

// User B's changes LOST!
```

**Desired with If-Match:**
```javascript
// User A tries to update with old ETag
PUT /api/v1/jobs/123
If-Match: "abc123"
{ title: "Junior Developer" }

// Server detects conflict
Response: 412 Precondition Failed
{
  "success": false,
  "error": "Resource has been modified by another user",
  "errorCode": "PRECONDITION_FAILED",
  "currentEtag": "def456"
}

// User A can now reload and retry
```

---

## Technical Implementation

### 1. Create Conditional Request Middleware

**File:** `backend/src/middleware/conditionalRequests.js`

```javascript
import logger from '../utils/logger.js';
import { PreconditionFailedError, NotModifiedError } from '../utils/errors.js';

/**
 * Conditional request middleware
 * Implements RFC 7232 (Conditional Requests)
 */

/**
 * Parses ETag header value
 * @param {string} etag - ETag header value
 * @returns {string} Normalized ETag (without W/ prefix and quotes)
 */
function parseETag(etag) {
  if (!etag) return null;
  
  // Remove weak indicator and quotes
  return etag.replace(/^W\//, '').replace(/^"|"$/g, '');
}

/**
 * Parses multiple ETags from If-Match or If-None-Match
 * @param {string} header - Header value
 * @returns {Set<string>} Set of normalized ETags
 */
function parseETagList(header) {
  if (!header) return new Set();
  
  if (header === '*') {
    return new Set(['*']);
  }
  
  // Split by comma, parse each ETag
  return new Set(
    header
      .split(',')
      .map(etag => parseETag(etag.trim()))
      .filter(Boolean)
  );
}

/**
 * Parses HTTP date
 * @param {string} dateStr - HTTP date string
 * @returns {Date|null}
 */
function parseHTTPDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    return new Date(dateStr);
  } catch (error) {
    return null;
  }
}

/**
 * Checks if ETags match
 * @param {string} currentETag - Current resource ETag
 * @param {Set<string>} requestETags - ETags from request header
 * @returns {boolean}
 */
function etagsMatch(currentETag, requestETags) {
  if (!currentETag || requestETags.size === 0) return false;
  
  if (requestETags.has('*')) return true;
  
  return requestETags.has(currentETag);
}

/**
 * Checks if resource has been modified since given date
 * @param {Date} lastModified - Resource last modified date
 * @param {Date} sinceDate - Date from If-Modified-Since header
 * @returns {boolean}
 */
function isModifiedSince(lastModified, sinceDate) {
  if (!lastModified || !sinceDate) return true;
  
  return lastModified > sinceDate;
}

/**
 * Conditional request middleware
 * @param {Object} options - Configuration
 * @param {Function} options.getResourceETag - Function to get current resource ETag
 * @param {Function} options.getResourceLastModified - Function to get last modified date
 */
export function conditionalRequestMiddleware(options = {}) {
  const {
    getResourceETag = null,
    getResourceLastModified = null,
    enableConditionalGet = true,
    enableConditionalModify = true
  } = options;

  return async (req, res, next) => {
    try {
      // Parse conditional headers
      const ifMatch = parseETagList(req.get('If-Match'));
      const ifNoneMatch = parseETagList(req.get('If-None-Match'));
      const ifModifiedSince = parseHTTPDate(req.get('If-Modified-Since'));
      const ifUnmodifiedSince = parseHTTPDate(req.get('If-Unmodified-Since'));

      const method = req.method;
      const isGet = method === 'GET' || method === 'HEAD';
      const isModify = method === 'PUT' || method === 'PATCH' || method === 'DELETE';

      // Store in request for controller access
      req.conditionalRequest = {
        ifMatch,
        ifNoneMatch,
        ifModifiedSince,
        ifUnmodifiedSince,
        hasConditions: ifMatch.size > 0 || ifNoneMatch.size > 0 || 
                       ifModifiedSince !== null || ifUnmodifiedSince !== null
      };

      // For GET/HEAD: Handle If-None-Match and If-Modified-Since
      if (isGet && enableConditionalGet) {
        // If-None-Match takes precedence over If-Modified-Since
        if (ifNoneMatch.size > 0) {
          // Intercept response to check ETag
          const originalJson = res.json;
          res.json = function(body) {
            const currentETag = res.get('ETag');
            
            if (currentETag && etagsMatch(parseETag(currentETag), ifNoneMatch)) {
              // Resource not modified
              return res.status(304).end();
            }
            
            return originalJson.call(this, body);
          };
        } else if (ifModifiedSince) {
          // Check If-Modified-Since
          const originalJson = res.json;
          res.json = function(body) {
            const lastModified = res.get('Last-Modified');
            
            if (lastModified) {
              const lastModifiedDate = parseHTTPDate(lastModified);
              
              if (!isModifiedSince(lastModifiedDate, ifModifiedSince)) {
                // Resource not modified
                return res.status(304).end();
              }
            }
            
            return originalJson.call(this, body);
          };
        }
      }

      // For PUT/PATCH/DELETE: Handle If-Match and If-Unmodified-Since
      if (isModify && enableConditionalModify) {
        // If-Match: Requires ETag to match (optimistic locking)
        if (ifMatch.size > 0) {
          // Need to get current resource ETag
          if (!getResourceETag) {
            logger.warn('If-Match header present but getResourceETag not configured', {
              path: req.path
            });
            return next();
          }

          // Get current ETag from database
          const currentETag = await getResourceETag(req);
          
          if (!currentETag) {
            // Resource doesn't exist
            return next(new NotFoundError('Resource not found'));
          }

          if (!etagsMatch(currentETag, ifMatch)) {
            // ETag mismatch - resource has been modified
            logger.warn('If-Match precondition failed', {
              path: req.path,
              requestedETags: Array.from(ifMatch),
              currentETag
            });

            return res.status(412).json({
              success: false,
              error: 'Resource has been modified by another user',
              errorCode: 'PRECONDITION_FAILED',
              currentETag,
              details: {
                message: 'The resource has been modified since you last retrieved it. Please reload and retry.',
                action: 'reload'
              }
            });
          }
        }

        // If-Unmodified-Since: Requires resource not modified since given date
        if (ifUnmodifiedSince) {
          if (!getResourceLastModified) {
            logger.warn('If-Unmodified-Since header present but getResourceLastModified not configured');
            return next();
          }

          const lastModified = await getResourceLastModified(req);
          
          if (isModifiedSince(lastModified, ifUnmodifiedSince)) {
            // Resource has been modified
            logger.warn('If-Unmodified-Since precondition failed', {
              path: req.path,
              ifUnmodifiedSince,
              lastModified
            });

            return res.status(412).json({
              success: false,
              error: 'Resource has been modified',
              errorCode: 'PRECONDITION_FAILED',
              lastModified: lastModified?.toISOString()
            });
          }
        }

        // If-None-Match: For PUT, prevents overwriting if resource exists
        // (rarely used, but part of spec)
        if (ifNoneMatch.has('*') && method === 'PUT') {
          const currentETag = await getResourceETag(req);
          
          if (currentETag) {
            // Resource exists, return 412
            return res.status(412).json({
              success: false,
              error: 'Resource already exists',
              errorCode: 'PRECONDITION_FAILED'
            });
          }
        }
      }

      next();
    } catch (error) {
      logger.error('Conditional request middleware error', {
        error: error.message,
        path: req.path
      });
      next(error);
    }
  };
}

/**
 * Helper to get ETag for a resource from database
 * @param {string} resourceType - Type of resource (job, candidate, etc.)
 * @param {string} resourceId - Resource ID
 * @param {string} organizationId - Organization ID
 * @returns {Function} Function to get ETag
 */
export function createETagGetter(resourceType, repository) {
  return async (req) => {
    const { id } = req.params;
    const { organizationId } = req.user;

    try {
      const resource = await repository.findById(id, organizationId);
      
      if (!resource) return null;

      // Generate ETag from updated_at timestamp
      const etag = `"${resource.updatedAt.getTime()}"`;
      return etag.replace(/^"|"$/g, '');
    } catch (error) {
      logger.error('Failed to get resource ETag', {
        resourceType,
        resourceId: id,
        error: error.message
      });
      return null;
    }
  };
}

/**
 * Helper to get last modified date for a resource
 */
export function createLastModifiedGetter(repository) {
  return async (req) => {
    const { id } = req.params;
    const { organizationId } = req.user;

    try {
      const resource = await repository.findById(id, organizationId);
      return resource ? resource.updatedAt : null;
    } catch (error) {
      logger.error('Failed to get resource last modified', {
        error: error.message
      });
      return null;
    }
  };
}

export default conditionalRequestMiddleware;
```

### 2. Apply to Routes

**File:** `backend/src/routes/jobs.js`

```javascript
import { conditionalRequestMiddleware, createETagGetter, createLastModifiedGetter } from '../middleware/conditionalRequests.js';
import JobRepository from '../repositories/JobRepository.js';

const jobRepository = new JobRepository();

// GET endpoint with conditional support
router.get('/:id',
  authenticate,
  conditionalRequestMiddleware({
    getResourceETag: createETagGetter('job', jobRepository),
    getResourceLastModified: createLastModifiedGetter(jobRepository),
    enableConditionalGet: true
  }),
  etagMiddleware(etagConfigs.jobs),
  jobController.getJob
);

// PUT endpoint with If-Match support (optimistic locking)
router.put('/:id',
  authenticate,
  conditionalRequestMiddleware({
    getResourceETag: createETagGetter('job', jobRepository),
    enableConditionalModify: true
  }),
  etagMiddleware(etagConfigs.jobs),
  jobController.updateJob
);

// DELETE endpoint with If-Match support
router.delete('/:id',
  authenticate,
  conditionalRequestMiddleware({
    getResourceETag: createETagGetter('job', jobRepository),
    enableConditionalModify: true
  }),
  jobController.deleteJob
);
```

### 3. Update Repository for Efficient ETag Queries

**File:** `backend/src/repositories/JobRepository.js`

```javascript
class JobRepository {
  /**
   * Get only ETag-relevant data (updated_at) for conditional requests
   * More efficient than loading entire resource
   */
  async getETagData(id, organizationId) {
    const text = `
      SELECT updated_at
      FROM jobs
      WHERE id = $1 
        AND organization_id = $2
        AND deleted_at IS NULL
    `;

    const result = await query(
      text,
      [id, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'jobs' }
    );

    return result.rows[0] || null;
  }

  /**
   * Update with version check (optimistic locking)
   * @param {string} id
   * @param {Object} data
   * @param {string} organizationId
   * @param {string} expectedETag - Expected ETag for optimistic locking
   */
  async updateWithVersionCheck(id, data, organizationId, expectedETag) {
    // Build update query
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        paramCount++;
        fields.push(`${this.toSnakeCase(key)} = $${paramCount}`);
        values.push(data[key]);
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at
    paramCount++;
    fields.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    paramCount++;
    values.push(id);
    const idParam = paramCount;

    paramCount++;
    values.push(organizationId);
    const orgParam = paramCount;

    // Add ETag check if provided
    let etagCheck = '';
    if (expectedETag) {
      paramCount++;
      values.push(new Date(parseInt(expectedETag)));
      etagCheck = `AND updated_at = $${paramCount}`;
    }

    const text = `
      UPDATE jobs
      SET ${fields.join(', ')}
      WHERE id = $${idParam}
        AND organization_id = $${orgParam}
        AND deleted_at IS NULL
        ${etagCheck}
      RETURNING *
    `;

    const result = await query(
      text,
      values,
      organizationId,
      { operation: 'UPDATE', table: 'jobs' }
    );

    if (result.rows.length === 0) {
      // Either not found or ETag mismatch
      const exists = await this.findById(id, organizationId);
      
      if (!exists) {
        throw new NotFoundError('Job not found');
      }
      
      throw new PreconditionFailedError('Resource has been modified');
    }

    return result.rows[0];
  }
}
```

### 4. Update Service Layer

**File:** `backend/src/services/jobs/JobService.js`

```javascript
class JobService {
  /**
   * Update job with optional optimistic locking
   */
  async update(id, data, organizationId, userId, expectedETag = null) {
    // Validate update data
    const validated = await this.constructor.updateSchema.validateAsync(data);
    
    const updateData = {
      ...validated,
      updatedBy: userId
    };

    try {
      // Use version-checked update if ETag provided
      const updated = expectedETag
        ? await this.repository.updateWithVersionCheck(id, updateData, organizationId, expectedETag)
        : await this.repository.update(id, updateData, organizationId);

      logger.info('Job updated successfully', { 
        jobId: id, 
        organizationId, 
        userId,
        optimisticLocking: !!expectedETag
      });

      return updated;
    } catch (error) {
      if (error instanceof PreconditionFailedError) {
        logger.warn('Optimistic locking conflict', {
          jobId: id,
          organizationId,
          userId
        });
      }
      
      throw error;
    }
  }
}
```

### 5. Update Controller

**File:** `backend/src/controllers/jobController.js`

```javascript
export async function updateJob(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId, id: userId } = req.user;
    
    // Get expected ETag from If-Match (if present)
    const ifMatch = req.conditionalRequest?.ifMatch;
    const expectedETag = ifMatch && ifMatch.size === 1 
      ? Array.from(ifMatch)[0] 
      : null;
    
    const job = await JobService.update(
      id, 
      req.body, 
      organizationId, 
      userId,
      expectedETag  // Pass for optimistic locking
    );
    
    // Set new ETag
    const newETag = `"${job.updatedAt.getTime()}"`;
    res.set('ETag', newETag);
    
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

## Testing Strategy

### 1. Unit Tests

**File:** `backend/tests/middleware/conditionalRequests.test.js`

```javascript
import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { conditionalRequestMiddleware, createETagGetter } from '../../src/middleware/conditionalRequests.js';

describe('Conditional Requests Middleware', () => {
  let app;
  let mockRepository;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    mockRepository = {
      findById: jest.fn()
    };

    app.use((req, res, next) => {
      req.user = { id: 'user-123', organizationId: 'org-123' };
      next();
    });
  });

  describe('If-Match (optimistic locking)', () => {
    it('should allow update when ETag matches', async () => {
      // Mock resource with matching ETag
      mockRepository.findById.mockResolvedValue({
        id: '123',
        title: 'Test Job',
        updatedAt: new Date('2025-01-01T00:00:00Z')
      });

      app.put('/test/:id',
        conditionalRequestMiddleware({
          getResourceETag: createETagGetter('test', mockRepository),
          enableConditionalModify: true
        }),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const etag = new Date('2025-01-01T00:00:00Z').getTime().toString();

      const response = await request(app)
        .put('/test/123')
        .set('If-Match', `"${etag}"`)
        .send({ title: 'Updated' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 412 when ETag does not match', async () => {
      // Mock resource with different ETag
      mockRepository.findById.mockResolvedValue({
        id: '123',
        title: 'Test Job',
        updatedAt: new Date('2025-01-02T00:00:00Z')  // Different date
      });

      app.put('/test/:id',
        conditionalRequestMiddleware({
          getResourceETag: createETagGetter('test', mockRepository),
          enableConditionalModify: true
        }),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const oldEtag = new Date('2025-01-01T00:00:00Z').getTime().toString();

      const response = await request(app)
        .put('/test/123')
        .set('If-Match', `"${oldEtag}"`)
        .send({ title: 'Updated' })
        .expect(412);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('PRECONDITION_FAILED');
    });

    it('should support wildcard If-Match', async () => {
      mockRepository.findById.mockResolvedValue({
        id: '123',
        updatedAt: new Date()
      });

      app.put('/test/:id',
        conditionalRequestMiddleware({
          getResourceETag: createETagGetter('test', mockRepository),
          enableConditionalModify: true
        }),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app)
        .put('/test/123')
        .set('If-Match', '*')
        .send({ title: 'Updated' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('If-None-Match (conditional GET)', () => {
    it('should return 304 when ETag matches', async () => {
      app.get('/test/:id',
        conditionalRequestMiddleware({
          enableConditionalGet: true
        }),
        (req, res) => {
          const etag = '"abc123"';
          res.set('ETag', etag);
          res.json({ id: '123', title: 'Test' });
        }
      );

      await request(app)
        .get('/test/123')
        .set('If-None-Match', '"abc123"')
        .expect(304);
    });

    it('should return 200 when ETag does not match', async () => {
      app.get('/test/:id',
        conditionalRequestMiddleware({
          enableConditionalGet: true
        }),
        (req, res) => {
          const etag = '"def456"';
          res.set('ETag', etag);
          res.json({ id: '123', title: 'Test' });
        }
      );

      const response = await request(app)
        .get('/test/123')
        .set('If-None-Match', '"abc123"')
        .expect(200);

      expect(response.body.id).toBe('123');
    });
  });

  describe('If-Modified-Since', () => {
    it('should return 304 when not modified', async () => {
      app.get('/test/:id',
        conditionalRequestMiddleware({
          enableConditionalGet: true
        }),
        (req, res) => {
          res.set('Last-Modified', 'Wed, 01 Jan 2025 00:00:00 GMT');
          res.json({ id: '123' });
        }
      );

      await request(app)
        .get('/test/123')
        .set('If-Modified-Since', 'Wed, 01 Jan 2025 00:00:00 GMT')
        .expect(304);
    });

    it('should return 200 when modified', async () => {
      app.get('/test/:id',
        conditionalRequestMiddleware({
          enableConditionalGet: true
        }),
        (req, res) => {
          res.set('Last-Modified', 'Thu, 02 Jan 2025 00:00:00 GMT');
          res.json({ id: '123' });
        }
      );

      const response = await request(app)
        .get('/test/123')
        .set('If-Modified-Since', 'Wed, 01 Jan 2025 00:00:00 GMT')
        .expect(200);

      expect(response.body.id).toBe('123');
    });
  });
});
```

### 2. Integration Tests

**File:** `backend/tests/integration/conditional-requests.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';

describe('Conditional Requests Integration', () => {
  let authToken;
  let jobId;
  let initialETag;

  beforeAll(async () => {
    authToken = await getTestAuthToken();
    
    // Create test job
    const response = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Job',
        description: 'Test description',
        workspaceId: testWorkspaceId
      });
    
    jobId = response.body.job.id;
    initialETag = response.headers.etag;
  });

  it('should prevent lost updates with If-Match', async () => {
    // Get current state
    const getResponse = await request(app)
      .get(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const currentETag = getResponse.headers.etag;

    // Update 1: Should succeed
    await request(app)
      .put(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('If-Match', currentETag)
      .send({ title: 'Updated Title 1' })
      .expect(200);

    // Update 2: Should fail with old ETag (simulates concurrent edit)
    const conflictResponse = await request(app)
      .put(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('If-Match', currentETag)  // Old ETag
      .send({ title: 'Updated Title 2' })
      .expect(412);

    expect(conflictResponse.body.errorCode).toBe('PRECONDITION_FAILED');
    expect(conflictResponse.body.currentETag).toBeDefined();
  });

  it('should support conditional GET with If-None-Match', async () => {
    // Get resource with ETag
    const response1 = await request(app)
      .get(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const etag = response1.headers.etag;

    // Request again with If-None-Match
    await request(app)
      .get(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('If-None-Match', etag)
      .expect(304);  // Not Modified
  });

  it('should measure optimistic locking effectiveness', async () => {
    let conflicts = 0;
    let successes = 0;

    // Simulate 10 concurrent updates
    const updates = Array.from({ length: 10 }, async (_, i) => {
      const getResponse = await request(app)
        .get(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const etag = getResponse.headers.etag;

      const updateResponse = await request(app)
        .put(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('If-Match', etag)
        .send({ title: `Update ${i}` });

      if (updateResponse.status === 412) {
        conflicts++;
      } else if (updateResponse.status === 200) {
        successes++;
      }
    });

    await Promise.all(updates);

    console.log(`Successes: ${successes}, Conflicts: ${conflicts}`);
    expect(successes).toBeGreaterThan(0);
    expect(conflicts).toBeGreaterThan(0);
  });
});
```

---

## Client SDK Support

**File:** `packages/api-client/src/client.js`

```javascript
class APIClient {
  /**
   * Makes a conditional GET request
   */
  async getWithETag(url, etag) {
    const headers = {};
    
    if (etag) {
      headers['If-None-Match'] = etag;
    }

    try {
      const response = await this.axios.get(url, { headers });
      return {
        data: response.data,
        etag: response.headers.etag,
        modified: true
      };
    } catch (error) {
      if (error.response?.status === 304) {
        // Not modified
        return {
          data: null,
          etag: etag,
          modified: false
        };
      }
      throw error;
    }
  }

  /**
   * Makes a conditional PUT request with optimistic locking
   */
  async updateWithETag(url, data, etag) {
    const headers = {};
    
    if (etag) {
      headers['If-Match'] = etag;
    }

    try {
      const response = await this.axios.put(url, data, { headers });
      return {
        data: response.data,
        etag: response.headers.etag,
        success: true
      };
    } catch (error) {
      if (error.response?.status === 412) {
        // Precondition failed
        return {
          data: null,
          etag: error.response.data.currentETag,
          success: false,
          conflict: true,
          error: error.response.data
        };
      }
      throw error;
    }
  }
}

// Usage in frontend
const { data, etag } = await client.get('/jobs/123');

// Later, update with optimistic locking
const result = await client.updateWithETag(
  '/jobs/123',
  { title: 'Updated' },
  etag
);

if (result.conflict) {
  // Handle conflict - show user that resource was modified
  alert('This job was modified by another user. Please reload and retry.');
}
```

---

## Frontend Integration

**File:** `apps/portal/src/hooks/useOptimisticUpdate.js`

```javascript
import { useState } from 'react';
import { apiClient } from '@recruitiq/api-client';

/**
 * Hook for optimistic locking in forms
 */
export function useOptimisticUpdate(resourceUrl) {
  const [etag, setETag] = useState(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  /**
   * Load resource and capture ETag
   */
  const load = async () => {
    const response = await apiClient.get(resourceUrl);
    setETag(response.headers.etag);
    return response.data;
  };

  /**
   * Update with optimistic locking
   */
  const update = async (data) => {
    try {
      const result = await apiClient.updateWithETag(resourceUrl, data, etag);
      
      if (result.conflict) {
        // Conflict detected
        setHasConflict(true);
        setConflictData(result.error);
        return { success: false, conflict: true };
      }

      // Success - update ETag for next update
      setETag(result.etag);
      setHasConflict(false);
      return { success: true, data: result.data };
    } catch (error) {
      throw error;
    }
  };

  /**
   * Reload to resolve conflict
   */
  const reload = async () => {
    setHasConflict(false);
    return await load();
  };

  return {
    etag,
    hasConflict,
    conflictData,
    load,
    update,
    reload
  };
}

// Usage in component
function JobEditForm({ jobId }) {
  const { load, update, hasConflict, reload } = useOptimisticUpdate(`/api/v1/jobs/${jobId}`);
  const [job, setJob] = useState(null);

  useEffect(() => {
    load().then(setJob);
  }, []);

  const handleSubmit = async (formData) => {
    const result = await update(formData);
    
    if (result.conflict) {
      // Show conflict dialog
      const shouldReload = confirm('This job was modified by another user. Reload?');
      if (shouldReload) {
        const fresh = await reload();
        setJob(fresh);
      }
    } else {
      // Success
      alert('Job updated successfully');
    }
  };

  if (hasConflict) {
    return <ConflictDialog onReload={reload} />;
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## Rollout Plan

### Day 1: Infrastructure
- [x] Create conditional request middleware
- [x] Add optimistic locking support to repositories
- [x] Write comprehensive tests

### Day 2: Implementation & Deployment
- [ ] Apply to critical endpoints (jobs, candidates, payroll)
- [ ] Update client SDK
- [ ] Add frontend conflict handling
- [ ] Deploy to staging
- [ ] Monitor conflict rate
- [ ] Deploy to production

---

## Success Criteria

- ✅ Zero lost updates on concurrent edits
- ✅ 412 Precondition Failed returned when ETag mismatch
- ✅ 304 Not Modified returned for unchanged resources
- ✅ Client SDK supports optimistic locking
- ✅ Frontend shows conflict resolution UI
- ✅ Conflict rate < 5% of update requests

---

## Documentation

Add to `docs/API_STANDARDS.md`:

````markdown
## Conditional Requests (Optimistic Locking)

Prevent lost updates and support efficient caching with conditional requests.

### Optimistic Locking with If-Match

```http
# Get resource with ETag
GET /api/v1/jobs/123
Response Headers:
  ETag: "1704067200000"

# Update with optimistic locking
PUT /api/v1/jobs/123
If-Match: "1704067200000"
Content-Type: application/json

{
  "title": "Updated Title"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "job": { ... }
}
```

**Conflict Response (412 Precondition Failed):**
```json
{
  "success": false,
  "error": "Resource has been modified by another user",
  "errorCode": "PRECONDITION_FAILED",
  "currentETag": "1704067300000",
  "details": {
    "message": "Please reload and retry",
    "action": "reload"
  }
}
```

### Conditional GET with If-None-Match

```http
GET /api/v1/jobs/123
If-None-Match: "1704067200000"

# If resource unchanged:
Response: 304 Not Modified

# If resource changed:
Response: 200 OK
ETag: "1704067300000"
{ ... }
```

### Best Practices

1. **Always use If-Match for updates** on critical resources
2. **Handle 412 gracefully** - prompt user to reload
3. **Cache ETags** for efficient conditional GETs
4. **Use wildcard `*`** to ensure resource exists before creation
````

---

## References

- [RFC 7232 - Conditional Requests](https://datatracker.ietf.org/doc/html/rfc7232)
- [MDN: If-Match](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Match)
- [MDN: If-None-Match](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match)
- [Optimistic Locking Pattern](https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html)
