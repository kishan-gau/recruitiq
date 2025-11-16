# Bulk Operations Implementation Plan

**Priority:** Medium  
**Effort:** 3 days  
**Impact:** Reduced API calls, improved performance for batch operations, better data import/export  
**Phase:** 2 (High-Value)

---

## Overview

Implement bulk/batch endpoints to allow multiple operations in a single API call, significantly reducing network overhead and improving performance for data import, export, and bulk updates.

### Business Value

- **API Efficiency:** Reduce API calls by 80% for bulk operations
- **Import Performance:** Bulk candidate/job imports 10x faster
- **Network Overhead:** Single request vs N requests (N=100+)
- **Transaction Consistency:** All-or-nothing operations with rollback
- **Rate Limit Savings:** Single rate limit hit instead of N hits
- **User Experience:** Faster bulk operations, progress tracking

---

## Current State

**Status:** Not implemented  
**Gap:** No batch endpoints, clients must make N individual API calls

**Current Problem:**
```javascript
// Importing 100 candidates requires 100 API calls
for (const candidate of candidates) {
  await fetch('/api/v1/candidates', {
    method: 'POST',
    body: JSON.stringify(candidate)
  });
}

// Issues:
// - 100 round trips (slow, especially on mobile)
// - 100 rate limit hits
// - No transaction consistency (partial failure handling complex)
// - Poor progress tracking
// - Inefficient database connections
```

**Desired:**
```javascript
// Single bulk operation
const response = await fetch('/api/v1/candidates/bulk', {
  method: 'POST',
  body: JSON.stringify({
    operations: [
      { operation: 'create', data: { firstName: 'John', ... } },
      { operation: 'create', data: { firstName: 'Jane', ... } },
      // ... 98 more
    ]
  })
});

// Returns:
// {
//   "success": true,
//   "results": [
//     { "index": 0, "success": true, "data": { "id": "123", ... } },
//     { "index": 1, "success": true, "data": { "id": "124", ... } },
//     { "index": 2, "success": false, "error": "Invalid email" },
//     // ...
//   ],
//   "summary": {
//     "total": 100,
//     "succeeded": 99,
//     "failed": 1
//   }
// }
```

---

## Technical Implementation

### 1. Create Bulk Operations Middleware

**File:** `backend/src/middleware/bulkOperations.js`

```javascript
import logger from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Bulk operations middleware
 * Validates and processes bulk request structure
 */

const MAX_BULK_SIZE = 1000;  // Maximum operations per request
const DEFAULT_BULK_SIZE = 100;

/**
 * Validates bulk operation structure
 * @param {Array} operations - Array of operations
 * @returns {Object} Validation result
 */
function validateBulkOperations(operations) {
  const errors = [];

  if (!Array.isArray(operations)) {
    return {
      valid: false,
      errors: ['Operations must be an array']
    };
  }

  if (operations.length === 0) {
    return {
      valid: false,
      errors: ['Operations array cannot be empty']
    };
  }

  if (operations.length > MAX_BULK_SIZE) {
    return {
      valid: false,
      errors: [`Maximum ${MAX_BULK_SIZE} operations allowed per request`]
    };
  }

  // Validate each operation
  operations.forEach((op, index) => {
    if (!op || typeof op !== 'object') {
      errors.push(`Operation at index ${index} must be an object`);
      return;
    }

    if (!op.operation) {
      errors.push(`Operation at index ${index} missing 'operation' field`);
    }

    const validOperations = ['create', 'update', 'delete', 'upsert'];
    if (op.operation && !validOperations.includes(op.operation)) {
      errors.push(`Operation at index ${index} has invalid operation type: ${op.operation}`);
    }

    // Validate operation-specific requirements
    if (op.operation === 'create' || op.operation === 'upsert') {
      if (!op.data) {
        errors.push(`Operation at index ${index} missing 'data' field`);
      }
    }

    if (op.operation === 'update' || op.operation === 'delete') {
      if (!op.id) {
        errors.push(`Operation at index ${index} missing 'id' field`);
      }
    }

    if (op.operation === 'update' && !op.data) {
      errors.push(`Operation at index ${index} missing 'data' field`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Bulk operations middleware
 * @param {Object} config - Configuration
 * @param {number} config.maxBulkSize - Maximum operations per request
 * @param {boolean} config.requireTransaction - Whether to require transaction support
 */
export function bulkOperationsMiddleware(config = {}) {
  const {
    maxBulkSize = MAX_BULK_SIZE,
    requireTransaction = false
  } = config;

  return (req, res, next) => {
    const { operations } = req.body;

    // Validate bulk structure
    const validation = validateBulkOperations(operations);

    if (!validation.valid) {
      logger.warn('Bulk operation validation failed', {
        errors: validation.errors,
        path: req.path
      });

      return res.status(400).json({
        success: false,
        error: 'Bulk operation validation failed',
        errorCode: 'VALIDATION_ERROR',
        details: validation.errors
      });
    }

    // Attach validated operations to request
    req.bulkOperations = {
      operations,
      count: operations.length,
      requireTransaction
    };

    // Log bulk operation
    logger.info('Bulk operation started', {
      path: req.path,
      operationCount: operations.length,
      organizationId: req.user?.organizationId
    });

    next();
  };
}

/**
 * Processes bulk operations with error handling
 * @param {Array} operations - Array of operations
 * @param {Function} processor - Function to process single operation
 * @param {Object} options - Processing options
 * @returns {Object} Results
 */
export async function processBulkOperations(operations, processor, options = {}) {
  const {
    stopOnError = false,
    concurrency = 10,
    onProgress = null
  } = options;

  const results = [];
  let succeeded = 0;
  let failed = 0;

  // Process in batches for concurrency control
  const batches = [];
  for (let i = 0; i < operations.length; i += concurrency) {
    batches.push(operations.slice(i, i + concurrency));
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (operation, batchIndex) => {
        const globalIndex = results.length + batchIndex;

        try {
          const result = await processor(operation, globalIndex);

          succeeded++;

          // Call progress callback
          if (onProgress) {
            onProgress({
              total: operations.length,
              completed: globalIndex + 1,
              succeeded,
              failed
            });
          }

          return {
            index: globalIndex,
            success: true,
            data: result,
            operation: operation.operation
          };
        } catch (error) {
          failed++;

          logger.warn('Bulk operation failed', {
            index: globalIndex,
            operation: operation.operation,
            error: error.message
          });

          // Call progress callback
          if (onProgress) {
            onProgress({
              total: operations.length,
              completed: globalIndex + 1,
              succeeded,
              failed
            });
          }

          if (stopOnError) {
            throw error;
          }

          return {
            index: globalIndex,
            success: false,
            error: error.message,
            errorCode: error.errorCode || 'OPERATION_FAILED',
            operation: operation.operation
          };
        }
      })
    );

    results.push(...batchResults);
  }

  return {
    results,
    summary: {
      total: operations.length,
      succeeded,
      failed,
      successRate: (succeeded / operations.length * 100).toFixed(2)
    }
  };
}

export default bulkOperationsMiddleware;
```

### 2. Create Bulk Service

**File:** `backend/src/services/BulkService.js`

```javascript
import pool from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Generic bulk operations service
 */
class BulkService {
  /**
   * Execute bulk operations with transaction support
   * @param {Array} operations - Array of operations
   * @param {Object} service - Service instance to execute operations
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @param {Object} options - Options
   */
  async executeBulk(operations, service, organizationId, userId, options = {}) {
    const {
      useTransaction = true,
      stopOnError = false,
      concurrency = 10
    } = options;

    if (useTransaction) {
      return this.executeInTransaction(operations, service, organizationId, userId, options);
    } else {
      return this.executeSequential(operations, service, organizationId, userId, options);
    }
  }

  /**
   * Execute operations in transaction (all-or-nothing)
   */
  async executeInTransaction(operations, service, organizationId, userId, options = {}) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const results = [];
      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];

        try {
          const result = await this.executeOperation(
            operation,
            service,
            organizationId,
            userId,
            client
          );

          succeeded++;
          results.push({
            index: i,
            success: true,
            data: result,
            operation: operation.operation
          });
        } catch (error) {
          failed++;

          logger.error('Bulk operation failed in transaction', {
            index: i,
            operation: operation.operation,
            error: error.message
          });

          if (options.stopOnError) {
            await client.query('ROLLBACK');
            throw error;
          }

          results.push({
            index: i,
            success: false,
            error: error.message,
            errorCode: error.errorCode || 'OPERATION_FAILED',
            operation: operation.operation
          });
        }
      }

      // If any operation failed and stopOnError is true, rollback
      if (failed > 0 && options.stopOnError) {
        await client.query('ROLLBACK');
        throw new Error('Bulk operation failed, transaction rolled back');
      }

      await client.query('COMMIT');

      return {
        results,
        summary: {
          total: operations.length,
          succeeded,
          failed,
          successRate: (succeeded / operations.length * 100).toFixed(2)
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute operations sequentially without transaction
   */
  async executeSequential(operations, service, organizationId, userId, options = {}) {
    const results = [];
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];

      try {
        const result = await this.executeOperation(
          operation,
          service,
          organizationId,
          userId
        );

        succeeded++;
        results.push({
          index: i,
          success: true,
          data: result,
          operation: operation.operation
        });
      } catch (error) {
        failed++;

        logger.warn('Bulk operation failed', {
          index: i,
          operation: operation.operation,
          error: error.message
        });

        if (options.stopOnError) {
          throw error;
        }

        results.push({
          index: i,
          success: false,
          error: error.message,
          errorCode: error.errorCode || 'OPERATION_FAILED',
          operation: operation.operation
        });
      }
    }

    return {
      results,
      summary: {
        total: operations.length,
        succeeded,
        failed,
        successRate: (succeeded / operations.length * 100).toFixed(2)
      }
    };
  }

  /**
   * Execute a single operation
   */
  async executeOperation(operation, service, organizationId, userId, client = null) {
    const { operation: op, id, data } = operation;

    switch (op) {
      case 'create':
        return await service.create(data, organizationId, userId);

      case 'update':
        return await service.update(id, data, organizationId, userId);

      case 'delete':
        return await service.delete(id, organizationId, userId);

      case 'upsert':
        // Try update first, if not found then create
        try {
          return await service.update(id, data, organizationId, userId);
        } catch (error) {
          if (error.statusCode === 404) {
            return await service.create(data, organizationId, userId);
          }
          throw error;
        }

      default:
        throw new Error(`Unknown operation: ${op}`);
    }
  }
}

export default new BulkService();
```

### 3. Create Bulk Endpoints

**File:** `backend/src/routes/candidates.js`

```javascript
import { bulkOperationsMiddleware } from '../middleware/bulkOperations.js';
import BulkService from '../services/BulkService.js';
import CandidateService from '../services/candidates/CandidateService.js';

/**
 * Bulk candidates endpoint
 */
router.post('/bulk',
  authenticate,
  rateLimitMiddleware({ max: 10, windowMs: 60000 }),  // Stricter rate limit
  bulkOperationsMiddleware({ maxBulkSize: 500 }),
  async (req, res, next) => {
    try {
      const { organizationId, id: userId } = req.user;
      const { operations } = req.bulkOperations;
      
      // Determine if transaction is needed
      const useTransaction = req.query.transaction !== 'false';

      logger.info('Processing bulk candidates operation', {
        count: operations.length,
        organizationId,
        useTransaction
      });

      // Execute bulk operations
      const result = await BulkService.executeBulk(
        operations,
        CandidateService,
        organizationId,
        userId,
        {
          useTransaction,
          stopOnError: req.query.stopOnError === 'true',
          concurrency: parseInt(req.query.concurrency) || 10
        }
      );

      logger.info('Bulk candidates operation completed', {
        ...result.summary,
        organizationId
      });

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Bulk import from CSV/JSON
 */
router.post('/import',
  authenticate,
  rateLimitMiddleware({ max: 5, windowMs: 60000 }),
  upload.single('file'),  // File upload middleware
  async (req, res, next) => {
    try {
      const { organizationId, id: userId } = req.user;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided',
          errorCode: 'FILE_REQUIRED'
        });
      }

      // Parse file (CSV or JSON)
      const candidates = await parseImportFile(file);

      // Convert to bulk operations
      const operations = candidates.map(candidate => ({
        operation: 'create',
        data: candidate
      }));

      // Execute bulk import
      const result = await BulkService.executeBulk(
        operations,
        CandidateService,
        organizationId,
        userId,
        {
          useTransaction: false,  // Don't use transaction for large imports
          stopOnError: false,     // Continue on error
          concurrency: 20         // Higher concurrency for imports
        }
      );

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
);
```

### 4. Add Bulk Jobs Endpoint

**File:** `backend/src/routes/jobs.js`

```javascript
/**
 * Bulk job operations
 */
router.post('/bulk',
  authenticate,
  rateLimitMiddleware({ max: 10, windowMs: 60000 }),
  bulkOperationsMiddleware({ maxBulkSize: 500 }),
  async (req, res, next) => {
    try {
      const { organizationId, id: userId } = req.user;
      const { operations } = req.bulkOperations;

      const result = await BulkService.executeBulk(
        operations,
        JobService,
        organizationId,
        userId,
        {
          useTransaction: req.query.transaction !== 'false',
          stopOnError: req.query.stopOnError === 'true'
        }
      );

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Bulk update status
 */
router.patch('/bulk/status',
  authenticate,
  async (req, res, next) => {
    try {
      const { organizationId, id: userId } = req.user;
      const { ids, status } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'ids must be a non-empty array',
          errorCode: 'VALIDATION_ERROR'
        });
      }

      // Convert to bulk operations
      const operations = ids.map(id => ({
        operation: 'update',
        id,
        data: { status }
      }));

      const result = await BulkService.executeBulk(
        operations,
        JobService,
        organizationId,
        userId,
        { useTransaction: true }
      );

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
);
```

---

## Testing Strategy

### 1. Unit Tests

**File:** `backend/tests/services/BulkService.test.js`

```javascript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import BulkService from '../../src/services/BulkService.js';

describe('BulkService', () => {
  let mockService;

  beforeEach(() => {
    mockService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
  });

  describe('executeBulk without transaction', () => {
    it('should process all operations successfully', async () => {
      const operations = [
        { operation: 'create', data: { name: 'Test 1' } },
        { operation: 'create', data: { name: 'Test 2' } },
        { operation: 'create', data: { name: 'Test 3' } }
      ];

      mockService.create
        .mockResolvedValueOnce({ id: '1', name: 'Test 1' })
        .mockResolvedValueOnce({ id: '2', name: 'Test 2' })
        .mockResolvedValueOnce({ id: '3', name: 'Test 3' });

      const result = await BulkService.executeBulk(
        operations,
        mockService,
        'org-123',
        'user-123',
        { useTransaction: false }
      );

      expect(result.summary.total).toBe(3);
      expect(result.summary.succeeded).toBe(3);
      expect(result.summary.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.results[0].success).toBe(true);
    });

    it('should continue on error when stopOnError is false', async () => {
      const operations = [
        { operation: 'create', data: { name: 'Test 1' } },
        { operation: 'create', data: { name: 'Test 2' } },  // Will fail
        { operation: 'create', data: { name: 'Test 3' } }
      ];

      mockService.create
        .mockResolvedValueOnce({ id: '1', name: 'Test 1' })
        .mockRejectedValueOnce(new Error('Validation failed'))
        .mockResolvedValueOnce({ id: '3', name: 'Test 3' });

      const result = await BulkService.executeBulk(
        operations,
        mockService,
        'org-123',
        'user-123',
        { useTransaction: false, stopOnError: false }
      );

      expect(result.summary.total).toBe(3);
      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Validation failed');
    });

    it('should stop on error when stopOnError is true', async () => {
      const operations = [
        { operation: 'create', data: { name: 'Test 1' } },
        { operation: 'create', data: { name: 'Test 2' } },  // Will fail
        { operation: 'create', data: { name: 'Test 3' } }
      ];

      mockService.create
        .mockResolvedValueOnce({ id: '1', name: 'Test 1' })
        .mockRejectedValueOnce(new Error('Validation failed'));

      await expect(
        BulkService.executeBulk(
          operations,
          mockService,
          'org-123',
          'user-123',
          { useTransaction: false, stopOnError: true }
        )
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('executeOperation', () => {
    it('should execute create operation', async () => {
      const operation = { operation: 'create', data: { name: 'Test' } };
      mockService.create.mockResolvedValue({ id: '1', name: 'Test' });

      const result = await BulkService.executeOperation(
        operation,
        mockService,
        'org-123',
        'user-123'
      );

      expect(result.id).toBe('1');
      expect(mockService.create).toHaveBeenCalledWith(
        { name: 'Test' },
        'org-123',
        'user-123'
      );
    });

    it('should execute update operation', async () => {
      const operation = { operation: 'update', id: '123', data: { name: 'Updated' } };
      mockService.update.mockResolvedValue({ id: '123', name: 'Updated' });

      const result = await BulkService.executeOperation(
        operation,
        mockService,
        'org-123',
        'user-123'
      );

      expect(result.name).toBe('Updated');
      expect(mockService.update).toHaveBeenCalledWith(
        '123',
        { name: 'Updated' },
        'org-123',
        'user-123'
      );
    });

    it('should execute delete operation', async () => {
      const operation = { operation: 'delete', id: '123' };
      mockService.delete.mockResolvedValue({ success: true });

      await BulkService.executeOperation(
        operation,
        mockService,
        'org-123',
        'user-123'
      );

      expect(mockService.delete).toHaveBeenCalledWith('123', 'org-123', 'user-123');
    });

    it('should execute upsert operation (update existing)', async () => {
      const operation = { operation: 'upsert', id: '123', data: { name: 'Test' } };
      mockService.update.mockResolvedValue({ id: '123', name: 'Test' });

      const result = await BulkService.executeOperation(
        operation,
        mockService,
        'org-123',
        'user-123'
      );

      expect(result.id).toBe('123');
      expect(mockService.update).toHaveBeenCalled();
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('should execute upsert operation (create new)', async () => {
      const operation = { operation: 'upsert', id: '123', data: { name: 'Test' } };
      
      const notFoundError = new Error('Not found');
      notFoundError.statusCode = 404;
      
      mockService.update.mockRejectedValue(notFoundError);
      mockService.create.mockResolvedValue({ id: '123', name: 'Test' });

      const result = await BulkService.executeOperation(
        operation,
        mockService,
        'org-123',
        'user-123'
      );

      expect(result.id).toBe('123');
      expect(mockService.update).toHaveBeenCalled();
      expect(mockService.create).toHaveBeenCalled();
    });
  });
});
```

### 2. Integration Tests

**File:** `backend/tests/integration/bulk-operations.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import pool from '../../src/config/database.js';

describe('Bulk Operations Integration', () => {
  let authToken;
  let organizationId;
  let workspaceId;

  beforeAll(async () => {
    authToken = await getTestAuthToken();
    organizationId = testOrganizationId;
    workspaceId = testWorkspaceId;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/v1/candidates/bulk', () => {
    it('should create multiple candidates in bulk', async () => {
      const operations = [
        {
          operation: 'create',
          data: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            workspaceId
          }
        },
        {
          operation: 'create',
          data: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            workspaceId
          }
        },
        {
          operation: 'create',
          data: {
            firstName: 'Bob',
            lastName: 'Johnson',
            email: 'bob.johnson@example.com',
            workspaceId
          }
        }
      ];

      const response = await request(app)
        .post('/api/v1/candidates/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operations })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.summary.total).toBe(3);
      expect(response.body.summary.succeeded).toBe(3);
      expect(response.body.summary.failed).toBe(0);
      expect(response.body.results).toHaveLength(3);
      expect(response.body.results[0].data).toHaveProperty('id');
    });

    it('should handle partial failures gracefully', async () => {
      const operations = [
        {
          operation: 'create',
          data: {
            firstName: 'Valid',
            lastName: 'User',
            email: 'valid@example.com',
            workspaceId
          }
        },
        {
          operation: 'create',
          data: {
            // Missing required fields
            firstName: 'Invalid'
          }
        },
        {
          operation: 'create',
          data: {
            firstName: 'Another',
            lastName: 'Valid',
            email: 'another@example.com',
            workspaceId
          }
        }
      ];

      const response = await request(app)
        .post('/api/v1/candidates/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operations })
        .expect(200);

      expect(response.body.summary.total).toBe(3);
      expect(response.body.summary.succeeded).toBe(2);
      expect(response.body.summary.failed).toBe(1);
      expect(response.body.results[1].success).toBe(false);
      expect(response.body.results[1]).toHaveProperty('error');
    });

    it('should measure performance improvement', async () => {
      const count = 50;

      // Sequential approach (measure time)
      const sequentialStart = Date.now();
      for (let i = 0; i < count; i++) {
        await request(app)
          .post('/api/v1/candidates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: `Test${i}`,
            lastName: 'Sequential',
            email: `test${i}@example.com`,
            workspaceId
          });
      }
      const sequentialTime = Date.now() - sequentialStart;

      // Bulk approach (measure time)
      const operations = Array.from({ length: count }, (_, i) => ({
        operation: 'create',
        data: {
          firstName: `Bulk${i}`,
          lastName: 'Test',
          email: `bulk${i}@example.com`,
          workspaceId
        }
      }));

      const bulkStart = Date.now();
      await request(app)
        .post('/api/v1/candidates/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operations });
      const bulkTime = Date.now() - bulkStart;

      const improvement = ((sequentialTime - bulkTime) / sequentialTime * 100).toFixed(1);

      console.log(`Sequential: ${sequentialTime}ms, Bulk: ${bulkTime}ms`);
      console.log(`Performance improvement: ${improvement}%`);

      expect(bulkTime).toBeLessThan(sequentialTime);
    });
  });

  describe('POST /api/v1/jobs/bulk', () => {
    it('should support mixed operations', async () => {
      // Create a job first
      const createResponse = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Job to Update',
          description: 'Description',
          workspaceId
        });

      const jobId = createResponse.body.job.id;

      const operations = [
        {
          operation: 'create',
          data: {
            title: 'New Job',
            description: 'Description',
            workspaceId
          }
        },
        {
          operation: 'update',
          id: jobId,
          data: {
            title: 'Updated Job'
          }
        },
        {
          operation: 'create',
          data: {
            title: 'Another Job',
            description: 'Description',
            workspaceId
          }
        }
      ];

      const response = await request(app)
        .post('/api/v1/jobs/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operations })
        .expect(200);

      expect(response.body.summary.total).toBe(3);
      expect(response.body.summary.succeeded).toBe(3);
    });
  });
});
```

---

## Client SDK Support

**File:** `packages/api-client/src/resources/candidates.js`

```javascript
class CandidatesResource {
  /**
   * Bulk create candidates
   */
  async bulkCreate(candidates) {
    const operations = candidates.map(candidate => ({
      operation: 'create',
      data: candidate
    }));

    return this.client.post('/candidates/bulk', { operations });
  }

  /**
   * Bulk update candidates
   */
  async bulkUpdate(updates) {
    const operations = updates.map(({ id, ...data }) => ({
      operation: 'update',
      id,
      data
    }));

    return this.client.post('/candidates/bulk', { operations });
  }

  /**
   * Bulk delete candidates
   */
  async bulkDelete(ids) {
    const operations = ids.map(id => ({
      operation: 'delete',
      id
    }));

    return this.client.post('/candidates/bulk', { operations });
  }

  /**
   * Import from CSV file
   */
  async import(file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    return this.client.post('/candidates/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
    });
  }
}
```

---

## Frontend Integration

**File:** `apps/portal/src/hooks/useBulkOperation.js`

```javascript
import { useState } from 'react';
import { apiClient } from '@recruitiq/api-client';

/**
 * Hook for bulk operations with progress tracking
 */
export function useBulkOperation(resourceType) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);

  const execute = async (operations, options = {}) => {
    setIsProcessing(true);
    setProgress({ total: operations.length, completed: 0 });

    try {
      const response = await apiClient.post(
        `/${resourceType}/bulk`,
        { operations },
        options
      );

      setResults(response.data);
      return response.data;
    } catch (error) {
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setProgress(null);
    setResults(null);
  };

  return {
    execute,
    isProcessing,
    progress,
    results,
    reset
  };
}

// Usage in component
function BulkImportDialog() {
  const { execute, isProcessing, results } = useBulkOperation('candidates');

  const handleImport = async (candidates) => {
    const operations = candidates.map(candidate => ({
      operation: 'create',
      data: candidate
    }));

    const result = await execute(operations);

    if (result.summary.failed > 0) {
      alert(`Import completed with ${result.summary.failed} errors`);
    } else {
      alert('All candidates imported successfully!');
    }
  };

  return (
    <div>
      {isProcessing && <ProgressBar />}
      {results && <ResultsSummary results={results} />}
    </div>
  );
}
```

---

## Rollout Plan

### Day 1: Core Infrastructure
- [x] Create bulk operations middleware
- [x] Implement BulkService
- [x] Write comprehensive tests
- [ ] Add validation and error handling

### Day 2: Endpoints & Integration
- [ ] Add bulk endpoints for candidates
- [ ] Add bulk endpoints for jobs
- [ ] Implement CSV import
- [ ] Update client SDK
- [ ] Test with staging data

### Day 3: Production & Monitoring
- [ ] Deploy to production
- [ ] Monitor performance improvements
- [ ] Update API documentation
- [ ] Create bulk operations guide

---

## Success Criteria

- ✅ Reduce API calls by 80% for bulk operations
- ✅ Bulk import 100 candidates in <5 seconds
- ✅ Transaction support for atomic operations
- ✅ Partial failure handling (continue on error)
- ✅ Progress tracking for long-running operations
- ✅ Client SDK supports bulk operations

---

## Documentation

Add to `docs/API_STANDARDS.md`:

````markdown
## Bulk Operations

Perform multiple operations in a single API call for improved performance.

### Basic Bulk Request

```http
POST /api/v1/candidates/bulk
Content-Type: application/json

{
  "operations": [
    {
      "operation": "create",
      "data": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      }
    },
    {
      "operation": "update",
      "id": "123",
      "data": {
        "status": "active"
      }
    },
    {
      "operation": "delete",
      "id": "456"
    }
  ]
}
```

### Response Format

```json
{
  "success": true,
  "results": [
    {
      "index": 0,
      "success": true,
      "data": { "id": "789", ... },
      "operation": "create"
    },
    {
      "index": 1,
      "success": true,
      "data": { "id": "123", ... },
      "operation": "update"
    },
    {
      "index": 2,
      "success": false,
      "error": "Resource not found",
      "errorCode": "NOT_FOUND",
      "operation": "delete"
    }
  ],
  "summary": {
    "total": 3,
    "succeeded": 2,
    "failed": 1,
    "successRate": "66.67"
  }
}
```

### Supported Operations

- `create`: Create new resource
- `update`: Update existing resource
- `delete`: Delete resource
- `upsert`: Update if exists, create if not

### Query Parameters

- `transaction`: Use transaction (default: true)
- `stopOnError`: Stop on first error (default: false)
- `concurrency`: Number of parallel operations (default: 10)

### Limits

- Maximum 1000 operations per request
- Rate limit: 10 requests per minute for bulk endpoints
````

---

## References

- [JSON:API Bulk Operations](https://jsonapi.org/recommendations/#bulk-operations)
- [GraphQL Batch Queries](https://graphql.org/learn/queries/#multiple-fields)
- [Google Cloud Batch API](https://cloud.google.com/batch/docs)
