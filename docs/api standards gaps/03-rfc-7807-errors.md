# RFC 7807 Problem Details Implementation Plan

**Priority:** Medium  
**Effort:** 1 day  
**Impact:** Standardized error handling, better client error parsing, API consistency  
**Phase:** 1 (Quick Win)

---

## Overview

Migrate from custom error response format to RFC 7807 Problem Details for HTTP APIs, providing a standardized, machine-readable error format that improves client error handling and debugging.

### Business Value

- **Developer Experience:** Standardized error format easier for client developers to parse
- **Debugging:** More context in error responses reduces support tickets
- **API Maturity:** Industry-standard error handling improves API reputation
- **Multi-Client Support:** Mobile, web, and third-party integrations benefit from consistent errors
- **Error Analytics:** Easier to aggregate and analyze error patterns

---

## Current State

**Status:** Custom error format  
**Gap:** Using custom `{ success, error, errorCode }` format instead of RFC 7807

**Current Implementation:**
```javascript
// backend/src/middleware/errorHandler.js
{
  "success": false,
  "error": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**RFC 7807 Standard:**
```json
{
  "type": "https://api.recruitiq.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "The request contains invalid data",
  "instance": "/api/v1/jobs",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "INVALID_FORMAT"
    }
  ]
}
```

---

## Technical Implementation

### 1. Create RFC 7807 Error Classes

**File:** `backend/src/utils/ProblemDetails.js`

```javascript
/**
 * RFC 7807 Problem Details for HTTP APIs
 * https://tools.ietf.org/html/rfc7807
 */

const PROBLEM_BASE_URL = process.env.API_BASE_URL || 'https://api.recruitiq.com';

/**
 * Base class for RFC 7807 problems
 */
export class ProblemDetails extends Error {
  constructor({
    type,
    title,
    status,
    detail,
    instance = null,
    ...extensions
  }) {
    super(detail || title);
    
    this.name = 'ProblemDetails';
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
    this.instance = instance;
    
    // Additional extension members
    Object.assign(this, extensions);
    
    // Maintain stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts to RFC 7807 JSON format
   */
  toJSON() {
    const problem = {
      type: this.type,
      title: this.title,
      status: this.status
    };

    if (this.detail) problem.detail = this.detail;
    if (this.instance) problem.instance = this.instance;

    // Add extension members
    const extensions = { ...this };
    delete extensions.name;
    delete extensions.message;
    delete extensions.stack;
    delete extensions.type;
    delete extensions.title;
    delete extensions.status;
    delete extensions.detail;
    delete extensions.instance;

    return { ...problem, ...extensions };
  }
}

/**
 * Validation Error (400)
 */
export class ValidationProblem extends ProblemDetails {
  constructor(detail, errors = [], instance = null) {
    super({
      type: `${PROBLEM_BASE_URL}/problems/validation-error`,
      title: 'Validation Failed',
      status: 400,
      detail: detail || 'The request contains invalid data',
      instance,
      errors: errors.map(err => ({
        field: err.field || err.path?.[0],
        message: err.message,
        code: err.type?.toUpperCase() || 'INVALID'
      }))
    });
  }
}

/**
 * Authentication Required (401)
 */
export class AuthenticationProblem extends ProblemDetails {
  constructor(detail = null, instance = null) {
    super({
      type: `${PROBLEM_BASE_URL}/problems/authentication-required`,
      title: 'Authentication Required',
      status: 401,
      detail: detail || 'Valid authentication credentials are required',
      instance
    });
  }
}

/**
 * Forbidden (403)
 */
export class ForbiddenProblem extends ProblemDetails {
  constructor(detail = null, requiredPermission = null, instance = null) {
    super({
      type: `${PROBLEM_BASE_URL}/problems/forbidden`,
      title: 'Forbidden',
      status: 403,
      detail: detail || 'You do not have permission to access this resource',
      instance,
      ...(requiredPermission && { requiredPermission })
    });
  }
}

/**
 * Not Found (404)
 */
export class NotFoundProblem extends ProblemDetails {
  constructor(resourceType, resourceId = null, instance = null) {
    super({
      type: `${PROBLEM_BASE_URL}/problems/not-found`,
      title: 'Resource Not Found',
      status: 404,
      detail: `The requested ${resourceType} was not found`,
      instance,
      resourceType,
      ...(resourceId && { resourceId })
    });
  }
}

/**
 * Conflict (409)
 */
export class ConflictProblem extends ProblemDetails {
  constructor(detail, conflictReason = null, instance = null) {
    super({
      type: `${PROBLEM_BASE_URL}/problems/conflict`,
      title: 'Conflict',
      status: 409,
      detail,
      instance,
      ...(conflictReason && { conflictReason })
    });
  }
}

/**
 * Precondition Failed (412) - for If-Match failures
 */
export class PreconditionFailedProblem extends ProblemDetails {
  constructor(detail = null, currentETag = null, providedETag = null, instance = null) {
    super({
      type: `${PROBLEM_BASE_URL}/problems/precondition-failed`,
      title: 'Precondition Failed',
      status: 412,
      detail: detail || 'The resource has been modified by another user',
      instance,
      ...(currentETag && { currentETag }),
      ...(providedETag && { providedETag })
    });
  }
}

/**
 * Unprocessable Entity (422)
 */
export class UnprocessableEntityProblem extends ProblemDetails {
  constructor(detail, errors = [], instance = null) {
    super({
      type: `${PROBLEM_BASE_URL}/problems/unprocessable-entity`,
      title: 'Unprocessable Entity',
      status: 422,
      detail,
      instance,
      errors
    });
  }
}

/**
 * Rate Limit Exceeded (429)
 */
export class RateLimitProblem extends ProblemDetails {
  constructor(retryAfter, limit, instance = null) {
    super({
      type: `${PROBLEM_BASE_URL}/problems/rate-limit-exceeded`,
      title: 'Rate Limit Exceeded',
      status: 429,
      detail: `Too many requests. Please retry after ${retryAfter} seconds`,
      instance,
      retryAfter,
      limit
    });
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalServerProblem extends ProblemDetails {
  constructor(detail = null, traceId = null, instance = null) {
    super({
      type: `${PROBLEM_BASE_URL}/problems/internal-error`,
      title: 'Internal Server Error',
      status: 500,
      detail: detail || 'An unexpected error occurred',
      instance,
      ...(traceId && { traceId })
    });
  }
}

/**
 * Service Unavailable (503)
 */
export class ServiceUnavailableProblem extends ProblemDetails {
  constructor(service, retryAfter = null, instance = null) {
    super({
      type: `${PROBLEM_BASE_URL}/problems/service-unavailable`,
      title: 'Service Unavailable',
      status: 503,
      detail: `The ${service} service is temporarily unavailable`,
      instance,
      service,
      ...(retryAfter && { retryAfter })
    });
  }
}
```

### 2. Update Error Handler Middleware

**File:** `backend/src/middleware/errorHandler.js`

```javascript
import logger from '../utils/logger.js';
import {
  ProblemDetails,
  ValidationProblem,
  AuthenticationProblem,
  ForbiddenProblem,
  NotFoundProblem,
  ConflictProblem,
  PreconditionFailedProblem,
  RateLimitProblem,
  InternalServerProblem
} from '../utils/ProblemDetails.js';

// Import legacy error classes for migration
import { 
  ValidationError, 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError,
  ConflictError 
} from '../utils/errors.js';

/**
 * RFC 7807 Error Handler Middleware
 */
export function problemDetailsErrorHandler(err, req, res, next) {
  const instance = req.originalUrl || req.url;
  const traceId = req.id || res.getHeader('X-Request-ID');

  // Log error with context
  logger.error('API Error', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: instance,
    method: req.method,
    userId: req.user?.id,
    organizationId: req.user?.organizationId,
    traceId,
    statusCode: err.status || 500
  });

  // Already RFC 7807 format
  if (err instanceof ProblemDetails) {
    return res
      .status(err.status)
      .type('application/problem+json')
      .json(err.toJSON());
  }

  // Migrate legacy errors to RFC 7807
  let problem;

  if (err instanceof ValidationError) {
    problem = new ValidationProblem(
      err.message,
      err.details || [],
      instance
    );
  } else if (err instanceof UnauthorizedError || err.name === 'UnauthorizedError') {
    problem = new AuthenticationProblem(err.message, instance);
  } else if (err instanceof ForbiddenError) {
    problem = new ForbiddenProblem(err.message, err.requiredPermission, instance);
  } else if (err instanceof NotFoundError) {
    problem = new NotFoundProblem(
      err.resourceType || 'resource',
      err.resourceId,
      instance
    );
  } else if (err instanceof ConflictError) {
    problem = new ConflictProblem(err.message, err.conflictReason, instance);
  } else if (err.statusCode === 429) {
    // Rate limit error
    problem = new RateLimitProblem(
      err.retryAfter || 60,
      err.limit || 100,
      instance
    );
  } else {
    // Default to internal server error
    problem = new InternalServerProblem(
      process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
      traceId,
      instance
    );
  }

  // Send RFC 7807 response
  res
    .status(problem.status)
    .type('application/problem+json')
    .json(problem.toJSON());
}

export default problemDetailsErrorHandler;
```

### 3. Update Service Layer

**File:** `backend/src/services/jobs/JobService.js`

```javascript
import {
  ValidationProblem,
  NotFoundProblem,
  ConflictProblem
} from '../../utils/ProblemDetails.js';

class JobService {
  async create(data, organizationId, userId) {
    try {
      // Validate with Joi
      const validated = await this.constructor.createSchema.validateAsync(data, {
        abortEarly: false
      });
      
      // Business logic...
      const job = await this.repository.create(validated, organizationId, userId);
      
      return job;
    } catch (error) {
      // Convert Joi validation errors to RFC 7807
      if (error.isJoi) {
        throw new ValidationProblem(
          'Job validation failed',
          error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type
          }))
        );
      }
      
      throw error;
    }
  }

  async getById(id, organizationId) {
    const job = await this.repository.findById(id, organizationId);
    
    if (!job) {
      throw new NotFoundProblem('job', id);
    }
    
    return job;
  }

  async update(id, data, organizationId, userId, ifMatchETags = null) {
    const currentJob = await this.getById(id, organizationId);
    
    // Validate If-Match for optimistic locking
    if (ifMatchETags && ifMatchETags.length > 0) {
      const currentETag = generateETag(currentJob);
      
      if (!etagMatches(currentETag, ifMatchETags)) {
        throw new PreconditionFailedProblem(
          'The job has been modified by another user',
          currentETag,
          ifMatchETags[0]
        );
      }
    }

    // Validate update data
    try {
      const validated = await this.constructor.updateSchema.validateAsync(data, {
        abortEarly: false
      });
      
      // Update logic...
      return updated;
    } catch (error) {
      if (error.isJoi) {
        throw new ValidationProblem(
          'Job update validation failed',
          error.details
        );
      }
      throw error;
    }
  }
}
```

### 4. Update Server Configuration

**File:** `backend/src/server.js`

```javascript
import problemDetailsErrorHandler from './middleware/errorHandler.js';

// ... existing middleware ...

// Routes
app.use('/api/v1', routes);

// Error handler (MUST be last)
app.use(problemDetailsErrorHandler);

// 404 handler
app.use((req, res) => {
  const problem = new NotFoundProblem('endpoint', null, req.originalUrl);
  res
    .status(404)
    .type('application/problem+json')
    .json(problem.toJSON());
});
```

### 5. Create Problem Documentation

**File:** `backend/public/problems/index.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>RecruitIQ API Problem Types</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #333; }
    .problem { border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 4px; }
    .problem h2 { margin-top: 0; color: #0066cc; }
    pre { background: #f5f5f5; padding: 15px; overflow-x: auto; border-radius: 4px; }
    code { color: #d63384; }
  </style>
</head>
<body>
  <h1>RecruitIQ API Problem Types (RFC 7807)</h1>
  
  <div class="problem">
    <h2>Validation Error</h2>
    <p><strong>Type:</strong> <code>https://api.recruitiq.com/problems/validation-error</code></p>
    <p><strong>Status:</strong> 400 Bad Request</p>
    <p><strong>Description:</strong> The request contains invalid or missing data.</p>
    <pre><code>{
  "type": "https://api.recruitiq.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "The request contains invalid data",
  "instance": "/api/v1/jobs",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "INVALID_FORMAT"
    }
  ]
}</code></pre>
  </div>

  <div class="problem">
    <h2>Authentication Required</h2>
    <p><strong>Type:</strong> <code>https://api.recruitiq.com/problems/authentication-required</code></p>
    <p><strong>Status:</strong> 401 Unauthorized</p>
    <p><strong>Description:</strong> Valid authentication credentials are required.</p>
    <pre><code>{
  "type": "https://api.recruitiq.com/problems/authentication-required",
  "title": "Authentication Required",
  "status": 401,
  "detail": "Valid authentication credentials are required",
  "instance": "/api/v1/jobs"
}</code></pre>
  </div>

  <!-- Add other problem types... -->

</body>
</html>
```

---

## Testing Strategy

### 1. Unit Tests

**File:** `backend/tests/utils/ProblemDetails.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';
import {
  ValidationProblem,
  NotFoundProblem,
  ConflictProblem,
  RateLimitProblem
} from '../../src/utils/ProblemDetails.js';

describe('RFC 7807 Problem Details', () => {
  describe('ValidationProblem', () => {
    it('should create validation problem with errors', () => {
      const problem = new ValidationProblem(
        'Invalid job data',
        [
          { field: 'email', message: 'Invalid email', type: 'string.email' },
          { field: 'age', message: 'Must be >= 18', type: 'number.min' }
        ],
        '/api/v1/jobs'
      );

      const json = problem.toJSON();

      expect(json.type).toContain('/problems/validation-error');
      expect(json.title).toBe('Validation Failed');
      expect(json.status).toBe(400);
      expect(json.detail).toBe('Invalid job data');
      expect(json.instance).toBe('/api/v1/jobs');
      expect(json.errors).toHaveLength(2);
      expect(json.errors[0].field).toBe('email');
    });
  });

  describe('NotFoundProblem', () => {
    it('should create not found problem with resource info', () => {
      const problem = new NotFoundProblem('job', '123', '/api/v1/jobs/123');
      const json = problem.toJSON();

      expect(json.status).toBe(404);
      expect(json.resourceType).toBe('job');
      expect(json.resourceId).toBe('123');
    });
  });

  describe('RateLimitProblem', () => {
    it('should create rate limit problem with retry info', () => {
      const problem = new RateLimitProblem(60, 100, '/api/v1/jobs');
      const json = problem.toJSON();

      expect(json.status).toBe(429);
      expect(json.retryAfter).toBe(60);
      expect(json.limit).toBe(100);
    });
  });
});
```

### 2. Integration Tests

**File:** `backend/tests/integration/rfc7807.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';

describe('RFC 7807 Error Responses', () => {
  it('should return RFC 7807 format for validation errors', async () => {
    const response = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ title: 'AB' })  // Too short
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toHaveProperty('type');
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('status', 400);
    expect(response.body).toHaveProperty('detail');
    expect(response.body).toHaveProperty('instance');
    expect(response.body).toHaveProperty('errors');
    expect(response.body.type).toContain('/problems/validation-error');
  });

  it('should return RFC 7807 format for not found', async () => {
    const response = await request(app)
      .get('/api/v1/jobs/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(404)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body.type).toContain('/problems/not-found');
    expect(response.body.status).toBe(404);
    expect(response.body.resourceType).toBe('job');
  });

  it('should include trace ID in server errors', async () => {
    // Trigger server error
    const response = await request(app)
      .get('/api/v1/trigger-error')  // Test endpoint that throws
      .set('Authorization', `Bearer ${testToken}`)
      .expect(500);

    expect(response.body.traceId).toBeDefined();
    expect(response.body.type).toContain('/problems/internal-error');
  });
});
```

---

## Migration Strategy

### Phase 1: Parallel Support (Week 1)
- Deploy RFC 7807 handler alongside legacy format
- Add `Accept` header detection to return appropriate format
- Monitor client usage

### Phase 2: Deprecation Notice (Week 2-4)
- Add deprecation warning header to legacy format
- Update documentation to recommend RFC 7807
- Notify client developers

### Phase 3: Migration (Month 2)
- Default to RFC 7807 for all new clients
- Support legacy format only with explicit header

### Phase 4: Full Cutover (Month 3)
- Remove legacy error format support
- All errors return RFC 7807

---

## Success Criteria

- ✅ All error responses follow RFC 7807 format
- ✅ Content-Type is `application/problem+json`
- ✅ Problem type URLs are resolvable with documentation
- ✅ All existing tests updated to expect new format
- ✅ Zero breaking changes for clients using proper error parsing
- ✅ Client developers report easier error handling

---

## References

- [RFC 7807: Problem Details for HTTP APIs](https://tools.ietf.org/html/rfc7807)
- [RFC 7807 Examples](https://github.com/zalando/problem)
- [Spring Boot Problem Library](https://github.com/zalando/problem-spring-web)
