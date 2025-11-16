# Partial Responses Implementation Plan

**Priority:** Medium  
**Effort:** 2 days  
**Impact:** Reduced bandwidth, faster mobile performance, flexible client queries  
**Phase:** 2 (High-Value)

---

## Overview

Implement field selection (sparse fieldsets) to allow clients to request only the fields they need, reducing payload size and improving performance especially for mobile clients and large list responses.

### Business Value

- **Mobile Performance:** 50-70% smaller payloads for mobile apps
- **Bandwidth Savings:** Significant reduction for list endpoints (jobs, candidates)
- **Faster Responses:** Reduced JSON serialization time
- **Flexible Clients:** Different views can request different fields
- **Developer Experience:** Easier to optimize specific use cases

---

## Current State

**Status:** Not implemented  
**Gap:** API always returns all fields, even when client needs only a few

**Current Problem:**
```javascript
// Mobile app only needs id and title for job list
GET /api/v1/jobs

// But receives full objects with 30+ fields
{
  "success": true,
  "jobs": [
    {
      "id": "123",
      "title": "Senior Developer",
      "description": "Very long description...",  // Not needed
      "requirements": [...],  // Not needed
      "skills": [...],  // Not needed
      "salaryMin": 100000,  // Not needed
      // ... 20 more fields
    }
  ]
}
```

**Desired:**
```javascript
// Request only needed fields
GET /api/v1/jobs?fields=id,title,status

{
  "success": true,
  "jobs": [
    {
      "id": "123",
      "title": "Senior Developer",
      "status": "open"
    }
  ]
}
```

---

## Technical Implementation

### 1. Create Field Selection Middleware

**File:** `backend/src/middleware/fieldSelection.js`

```javascript
import logger from '../utils/logger.js';

/**
 * Field selection middleware
 * Implements sparse fieldsets per JSON:API spec
 */

/**
 * Parses fields query parameter
 * @param {string} fieldsParam - Comma-separated field list
 * @returns {Set<string>} Set of requested fields
 */
function parseFields(fieldsParam) {
  if (!fieldsParam) return null;

  return new Set(
    fieldsParam
      .split(',')
      .map(field => field.trim())
      .filter(field => field.length > 0)
  );
}

/**
 * Validates requested fields against allowed fields
 * @param {Set<string>} requestedFields
 * @param {Set<string>} allowedFields
 * @returns {Object} { valid: Set, invalid: Set }
 */
function validateFields(requestedFields, allowedFields) {
  if (!requestedFields) {
    return { valid: allowedFields, invalid: new Set() };
  }

  const valid = new Set();
  const invalid = new Set();

  requestedFields.forEach(field => {
    if (allowedFields.has(field)) {
      valid.add(field);
    } else {
      invalid.add(field);
    }
  });

  return { valid, invalid };
}

/**
 * Projects object to include only selected fields
 * @param {Object} obj - Source object
 * @param {Set<string>} fields - Fields to include
 * @returns {Object} Projected object
 */
function projectFields(obj, fields) {
  if (!obj || !fields) return obj;

  const result = {};

  fields.forEach(field => {
    // Handle nested fields (e.g., "user.name")
    if (field.includes('.')) {
      const parts = field.split('.');
      let source = obj;
      let target = result;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (source[part] === undefined) return;

        if (!target[part]) target[part] = {};
        target = target[part];
        source = source[part];
      }

      const lastPart = parts[parts.length - 1];
      if (source[lastPart] !== undefined) {
        target[lastPart] = source[lastPart];
      }
    } else {
      // Simple field
      if (obj[field] !== undefined) {
        result[field] = obj[field];
      }
    }
  });

  return result;
}

/**
 * Field selection middleware
 * @param {Object} config - Configuration
 * @param {Array<string>} config.allowedFields - Fields that can be requested
 * @param {Array<string>} config.defaultFields - Fields returned when none specified
 * @param {Array<string>} config.alwaysInclude - Fields always included
 */
export function fieldSelectionMiddleware(config = {}) {
  const {
    allowedFields = [],
    defaultFields = null,
    alwaysInclude = ['id']
  } = config;

  const allowedFieldsSet = new Set(allowedFields);
  const alwaysIncludeSet = new Set(alwaysInclude);
  const defaultFieldsSet = defaultFields ? new Set(defaultFields) : null;

  return (req, res, next) => {
    // Parse fields parameter
    const fieldsParam = req.query.fields;
    const requestedFields = parseFields(fieldsParam);

    // Validate fields
    const { valid, invalid } = validateFields(requestedFields, allowedFieldsSet);

    // Warn about invalid fields
    if (invalid.size > 0) {
      logger.warn('Invalid fields requested', {
        invalid: Array.from(invalid),
        path: req.path
      });
    }

    // Determine final field set
    let finalFields = valid;
    if (!requestedFields && defaultFieldsSet) {
      finalFields = defaultFieldsSet;
    }

    // Always include certain fields
    alwaysIncludeSet.forEach(field => finalFields.add(field));

    // Attach to request for controller/service use
    req.fieldSelection = {
      requested: requestedFields,
      allowed: allowedFieldsSet,
      selected: finalFields,
      hasSelection: requestedFields !== null
    };

    // Intercept response to apply field selection
    const originalJson = res.json;

    res.json = function(body) {
      if (req.fieldSelection.hasSelection && body) {
        // Apply field selection to response body
        if (Array.isArray(body)) {
          // Array of objects
          body = body.map(item => projectFields(item, req.fieldSelection.selected));
        } else if (typeof body === 'object') {
          // Check for common response patterns
          if (body.success && body.job) {
            body.job = projectFields(body.job, req.fieldSelection.selected);
          } else if (body.success && body.jobs) {
            body.jobs = body.jobs.map(job => projectFields(job, req.fieldSelection.selected));
          } else if (body.success && body.candidate) {
            body.candidate = projectFields(body.candidate, req.fieldSelection.selected);
          } else if (body.success && body.candidates) {
            body.candidates = body.candidates.map(c => projectFields(c, req.fieldSelection.selected));
          } else {
            // Generic object
            body = projectFields(body, req.fieldSelection.selected);
          }
        }
      }

      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Helper to apply field selection in service layer
 * @param {Object|Array} data - Data to filter
 * @param {Set<string>} fields - Fields to include
 * @returns {Object|Array} Filtered data
 */
export function selectFields(data, fields) {
  if (!fields || fields.size === 0) return data;

  if (Array.isArray(data)) {
    return data.map(item => projectFields(item, fields));
  }

  return projectFields(data, fields);
}

/**
 * Pre-defined field configurations for common resources
 */
export const fieldConfigs = {
  job: {
    allowedFields: [
      'id', 'title', 'description', 'status', 'department', 'location',
      'employmentType', 'salaryMin', 'salaryMax', 'skills', 'requirements',
      'isPublished', 'publishedAt', 'closedAt', 'applicationCount',
      'createdAt', 'updatedAt', 'createdBy', 'workspace.id', 'workspace.name'
    ],
    defaultFields: [
      'id', 'title', 'description', 'status', 'location', 'employmentType',
      'salaryMin', 'salaryMax', 'isPublished', 'createdAt'
    ],
    alwaysInclude: ['id']
  },

  jobSummary: {
    allowedFields: [
      'id', 'title', 'status', 'location', 'employmentType',
      'salaryMin', 'salaryMax', 'applicationCount', 'createdAt'
    ],
    defaultFields: [
      'id', 'title', 'status', 'location', 'createdAt'
    ],
    alwaysInclude: ['id']
  },

  candidate: {
    allowedFields: [
      'id', 'firstName', 'lastName', 'email', 'phone', 'status',
      'source', 'tags', 'resumeUrl', 'linkedinUrl', 'githubUrl',
      'yearsExperience', 'skills', 'desiredSalary', 'availability',
      'createdAt', 'updatedAt'
    ],
    defaultFields: [
      'id', 'firstName', 'lastName', 'email', 'status', 'createdAt'
    ],
    alwaysInclude: ['id']
  },

  user: {
    allowedFields: [
      'id', 'name', 'email', 'role', 'department', 'isActive',
      'createdAt', 'lastLoginAt'
    ],
    defaultFields: [
      'id', 'name', 'email', 'role', 'isActive'
    ],
    alwaysInclude: ['id']
  }
};

export default fieldSelectionMiddleware;
```

### 2. Apply to Routes

**File:** `backend/src/routes/jobs.js`

```javascript
import { fieldSelectionMiddleware, fieldConfigs } from '../middleware/fieldSelection.js';

// List endpoint with field selection
router.get('/',
  authenticate,
  fieldSelectionMiddleware(fieldConfigs.job),  // Enable field selection
  etagMiddleware(etagConfigs.jobs),
  jobController.listJobs
);

// Detail endpoint with field selection
router.get('/:id',
  authenticate,
  fieldSelectionMiddleware(fieldConfigs.job),
  etagMiddleware(etagConfigs.jobs),
  jobController.getJob
);

// Summary endpoint (pre-configured minimal fields)
router.get('/summary',
  authenticate,
  fieldSelectionMiddleware(fieldConfigs.jobSummary),
  jobController.listJobs
);
```

### 3. Optimize Database Queries

**File:** `backend/src/repositories/JobRepository.js`

```javascript
class JobRepository {
  /**
   * Find all jobs with field selection
   * @param {Object} filters
   * @param {Object} pagination
   * @param {string} organizationId
   * @param {Set<string>} fields - Selected fields (optional)
   */
  async findAll(filters, pagination, organizationId, fields = null) {
    // Determine which columns to SELECT
    const columns = this.buildSelectColumns(fields);

    const text = `
      SELECT ${columns}
      FROM jobs j
      LEFT JOIN workspaces w ON j.workspace_id = w.id
      WHERE j.organization_id = $1
        AND j.deleted_at IS NULL
      ORDER BY j.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(
      text,
      [organizationId, pagination.limit, pagination.offset],
      organizationId,
      { operation: 'SELECT', table: 'jobs' }
    );

    return {
      jobs: result.rows,
      total: await this.count(filters, organizationId)
    };
  }

  /**
   * Builds SELECT column list based on requested fields
   * @param {Set<string>} fields - Requested fields
   * @returns {string} SQL column list
   */
  buildSelectColumns(fields) {
    if (!fields || fields.size === 0) {
      // Return all columns
      return 'j.*, w.name as workspace_name';
    }

    // Map API field names to database columns
    const fieldToColumn = {
      'id': 'j.id',
      'title': 'j.title',
      'description': 'j.description',
      'status': 'j.status',
      'department': 'j.department',
      'location': 'j.location',
      'employmentType': 'j.employment_type',
      'salaryMin': 'j.salary_min',
      'salaryMax': 'j.salary_max',
      'skills': 'j.skills',
      'requirements': 'j.requirements',
      'isPublished': 'j.is_published',
      'publishedAt': 'j.published_at',
      'closedAt': 'j.closed_at',
      'applicationCount': 'j.application_count',
      'createdAt': 'j.created_at',
      'updatedAt': 'j.updated_at',
      'workspace.name': 'w.name as workspace_name'
    };

    const columns = [];
    
    // Always include id
    columns.push('j.id');

    // Add requested columns
    fields.forEach(field => {
      const column = fieldToColumn[field];
      if (column && !columns.includes(column)) {
        columns.push(column);
      }
    });

    return columns.join(', ');
  }

  /**
   * Count total jobs (for pagination)
   */
  async count(filters, organizationId) {
    const result = await query(
      'SELECT COUNT(*) as total FROM jobs WHERE organization_id = $1 AND deleted_at IS NULL',
      [organizationId],
      organizationId
    );
    return parseInt(result.rows[0].total);
  }
}
```

### 4. Update Service Layer

**File:** `backend/src/services/jobs/JobService.js`

```javascript
class JobService {
  /**
   * List jobs with optional field selection
   */
  async list(filters, organizationId, selectedFields = null) {
    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
    const offset = (page - 1) * limit;

    // Pass selected fields to repository for optimized query
    const { jobs, total } = await this.repository.findAll(
      filters,
      { limit, offset },
      organizationId,
      selectedFields
    );

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }
}
```

### 5. Update Controller

**File:** `backend/src/controllers/jobController.js`

```javascript
export async function listJobs(req, res, next) {
  try {
    const { organizationId } = req.user;
    
    // Get selected fields from middleware
    const selectedFields = req.fieldSelection?.selected || null;
    
    const result = await JobService.list(
      req.query, 
      organizationId,
      selectedFields  // Pass to service
    );
    
    return res.status(200).json({
      success: true,
      jobs: result.jobs,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
}
```

---

## Testing Strategy

### 1. Unit Tests

**File:** `backend/tests/middleware/fieldSelection.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { fieldSelectionMiddleware, selectFields } from '../../src/middleware/fieldSelection.js';

describe('Field Selection Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    
    app.use((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });
  });

  describe('GET with fields parameter', () => {
    it('should return only requested fields', async () => {
      app.get('/test',
        fieldSelectionMiddleware({
          allowedFields: ['id', 'name', 'email', 'age'],
          alwaysInclude: ['id']
        }),
        (req, res) => {
          res.json({
            id: '123',
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            password: 'secret'  // Should be filtered out
          });
        }
      );

      const response = await request(app)
        .get('/test?fields=id,name')
        .expect(200);

      expect(response.body).toEqual({
        id: '123',
        name: 'John Doe'
      });
      expect(response.body.email).toBeUndefined();
      expect(response.body.age).toBeUndefined();
      expect(response.body.password).toBeUndefined();
    });

    it('should always include specified fields', async () => {
      app.get('/test',
        fieldSelectionMiddleware({
          allowedFields: ['id', 'name', 'email'],
          alwaysInclude: ['id']
        }),
        (req, res) => {
          res.json({ id: '123', name: 'John', email: 'john@example.com' });
        }
      );

      const response = await request(app)
        .get('/test?fields=name')
        .expect(200);

      // 'id' should be included even though not requested
      expect(response.body).toEqual({
        id: '123',
        name: 'John'
      });
    });

    it('should handle nested fields', async () => {
      app.get('/test',
        fieldSelectionMiddleware({
          allowedFields: ['id', 'user.name', 'user.email'],
          alwaysInclude: ['id']
        }),
        (req, res) => {
          res.json({
            id: '123',
            user: {
              name: 'John',
              email: 'john@example.com',
              password: 'secret'
            }
          });
        }
      );

      const response = await request(app)
        .get('/test?fields=user.name')
        .expect(200);

      expect(response.body).toEqual({
        id: '123',
        user: { name: 'John' }
      });
    });

    it('should handle array responses', async () => {
      app.get('/test',
        fieldSelectionMiddleware({
          allowedFields: ['id', 'name', 'email'],
          alwaysInclude: ['id']
        }),
        (req, res) => {
          res.json([
            { id: '1', name: 'John', email: 'john@example.com' },
            { id: '2', name: 'Jane', email: 'jane@example.com' }
          ]);
        }
      );

      const response = await request(app)
        .get('/test?fields=id,name')
        .expect(200);

      expect(response.body).toEqual([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' }
      ]);
    });

    it('should return default fields when no fields specified', async () => {
      app.get('/test',
        fieldSelectionMiddleware({
          allowedFields: ['id', 'name', 'email', 'age'],
          defaultFields: ['id', 'name'],
          alwaysInclude: ['id']
        }),
        (req, res) => {
          res.json({ id: '123', name: 'John', email: 'john@example.com', age: 30 });
        }
      );

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({
        id: '123',
        name: 'John'
      });
    });
  });

  describe('selectFields helper', () => {
    it('should select fields from object', () => {
      const data = {
        id: '123',
        name: 'John',
        email: 'john@example.com',
        password: 'secret'
      };

      const fields = new Set(['id', 'name']);
      const result = selectFields(data, fields);

      expect(result).toEqual({
        id: '123',
        name: 'John'
      });
    });

    it('should select fields from array', () => {
      const data = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' }
      ];

      const fields = new Set(['id', 'name']);
      const result = selectFields(data, fields);

      expect(result).toEqual([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' }
      ]);
    });
  });
});
```

### 2. Integration Tests

**File:** `backend/tests/integration/field-selection.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';

describe('Field Selection Integration', () => {
  let authToken;

  beforeAll(async () => {
    authToken = await getTestAuthToken();
  });

  it('should support field selection on job list', async () => {
    const response = await request(app)
      .get('/api/v1/jobs?fields=id,title,status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.jobs).toBeInstanceOf(Array);

    if (response.body.jobs.length > 0) {
      const job = response.body.jobs[0];
      
      // Should have requested fields
      expect(job).toHaveProperty('id');
      expect(job).toHaveProperty('title');
      expect(job).toHaveProperty('status');

      // Should NOT have unrequested fields
      expect(job).not.toHaveProperty('description');
      expect(job).not.toHaveProperty('requirements');
      expect(job).not.toHaveProperty('salaryMin');
    }
  });

  it('should measure bandwidth savings', async () => {
    // Full response
    const fullResponse = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Partial response
    const partialResponse = await request(app)
      .get('/api/v1/jobs?fields=id,title,status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const fullSize = JSON.stringify(fullResponse.body).length;
    const partialSize = JSON.stringify(partialResponse.body).length;
    const savings = ((fullSize - partialSize) / fullSize * 100).toFixed(1);

    console.log(`Bandwidth savings: ${savings}%`);
    expect(partialSize).toBeLessThan(fullSize);
  });
});
```

---

## Client SDK Support

**File:** `packages/api-client/src/resources/jobs.js`

```javascript
class JobsResource {
  /**
   * List jobs with field selection
   * @param {Object} options
   * @param {Array<string>} options.fields - Fields to include
   */
  async list({ fields, page, limit, ...filters } = {}) {
    const params = {
      page,
      limit,
      ...filters
    };

    // Add field selection
    if (fields && fields.length > 0) {
      params.fields = fields.join(',');
    }

    return this.client.get('/jobs', { params });
  }

  /**
   * Pre-defined field sets for common use cases
   */
  static FIELD_SETS = {
    summary: ['id', 'title', 'status', 'location', 'createdAt'],
    card: ['id', 'title', 'description', 'status', 'location', 'employmentType', 'salaryMin', 'salaryMax'],
    full: null  // All fields
  };
}

// Usage
const jobs = await client.jobs.list({
  fields: JobsResource.FIELD_SETS.summary
});
```

---

## Rollout Plan

### Day 1: Infrastructure
- [x] Create field selection middleware
- [x] Add field configs for resources
- [x] Write comprehensive tests

### Day 2: Implementation
- [ ] Apply to jobs endpoint
- [ ] Apply to candidates endpoint
- [ ] Optimize database queries
- [ ] Update client SDK
- [ ] Deploy to staging

### Day 3: Production & Monitoring
- [ ] Deploy to production
- [ ] Monitor bandwidth savings
- [ ] Update API documentation
- [ ] Create field selection guide for developers

---

## Success Criteria

- ✅ 50-70% bandwidth reduction for mobile clients using field selection
- ✅ Database query time improved by 30% with SELECT optimization
- ✅ Zero breaking changes (defaults to all fields if not specified)
- ✅ Client SDK supports field selection
- ✅ Documentation includes field selection examples

---

## Documentation

Add to `docs/API_STANDARDS.md`:

````markdown
## Partial Responses (Field Selection)

Request only the fields you need to reduce payload size and improve performance.

### Basic Usage

```http
GET /api/v1/jobs?fields=id,title,status
```

### Nested Fields

```http
GET /api/v1/jobs?fields=id,title,workspace.name
```

### Default Fields

If no `fields` parameter is provided, a default set of fields is returned.

### Always Included

Certain fields (like `id`) are always included regardless of the `fields` parameter.

### Available Fields by Resource

**Jobs:**
- `id`, `title`, `description`, `status`, `department`, `location`
- `employmentType`, `salaryMin`, `salaryMax`, `skills`, `requirements`
- `isPublished`, `applicationCount`, `createdAt`, `updatedAt`
- `workspace.id`, `workspace.name`

**Candidates:**
- `id`, `firstName`, `lastName`, `email`, `phone`, `status`
- `source`, `tags`, `resumeUrl`, `yearsExperience`, `skills`
- `desiredSalary`, `availability`, `createdAt`, `updatedAt`
````

---

## References

- [JSON:API Sparse Fieldsets](https://jsonapi.org/format/#fetching-sparse-fieldsets)
- [GraphQL Field Selection](https://graphql.org/learn/queries/#fields)
- [Google APIs Partial Response](https://developers.google.com/drive/api/guides/performance#partial-response)
