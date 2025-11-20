# API Standards

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.1  
**Last Updated:** November 19, 2025

---

## Table of Contents

1. [API Principles](#api-principles)
2. [Product-Based Routing](#product-based-routing)
3. [Response Format](#response-format)
4. [HTTP Status Codes](#http-status-codes)
5. [Error Handling](#error-handling)
6. [Pagination](#pagination)
7. [Filtering & Sorting](#filtering--sorting)
8. [Versioning](#versioning)
9. [Rate Limiting](#rate-limiting)
10. [Documentation](#documentation)

---

## API Principles

### REST Principles (MANDATORY)

1. **Use nouns, not verbs** in URLs
2. **Use HTTP methods** for actions (GET, POST, PUT, DELETE)
3. **Use plural resource names** (e.g., `/jobs`, not `/job`)
4. **Nest resources** for relationships (e.g., `/jobs/:id/applications`)
5. **Return appropriate status codes** for all responses
6. **Be consistent** with naming and structure
7. **Version your API** to support backward compatibility

### URL Structure

```
// ✅ CORRECT: RESTful URLs
GET    /api/v1/jobs                  // List all jobs
GET    /api/v1/jobs/:id              // Get specific job
POST   /api/v1/jobs                  // Create new job
PUT    /api/v1/jobs/:id              // Update entire job
PATCH  /api/v1/jobs/:id              // Partial update
DELETE /api/v1/jobs/:id              // Delete job

GET    /api/v1/jobs/:id/applications // Get applications for job
POST   /api/v1/jobs/:id/applications // Apply to job

// ❌ WRONG: Non-RESTful URLs
GET    /api/v1/getJobs               // Don't use verbs
POST   /api/v1/job/create            // Use HTTP methods
GET    /api/v1/job/:id               // Use plural names
POST   /api/v1/jobs/:id/apply        // Nest resources properly
```

---

## Product-Based Routing

### ⚠️ CRITICAL: Dynamic Product System

RecruitIQ uses a **dynamic product loading system** where product modules (PayLinQ, Nexus, ScheduleHub, etc.) are loaded at runtime and mounted under a unified API structure.

**ALL product API routes MUST use the `/api/products/{product-slug}` prefix.**

### Product Route Structure (MANDATORY)

```javascript
// ✅ CORRECT: Product-based routing
GET    /api/products/nexus/locations           // Nexus HRIS locations
GET    /api/products/paylinq/worker-types      // PayLinQ worker types
GET    /api/products/schedulehub/stations      // ScheduleHub stations
POST   /api/products/nexus/employees           // Create employee in Nexus
PATCH  /api/products/paylinq/payroll-runs/:id  // Update payroll run

// ❌ WRONG: Direct product paths (will return 404!)
GET    /api/nexus/locations                    // Missing /products prefix
GET    /api/paylinq/worker-types               // Missing /products prefix
POST   /api/schedulehub/stations               // Missing /products prefix
```

### Frontend API Client Configuration

**MANDATORY:** All frontend applications MUST use the centralized `@recruitiq/api-client` package with product-specific clients (NexusClient, PayLinQClient, ScheduleHubClient).

**✅ CORRECT: Use Centralized API Clients**

```typescript
// apps/nexus/src/services/locations.service.ts
import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const locationsService = {
  async listLocations(filters?: any) {
    const response = await nexusClient.listLocations(filters);
    return response.data;
  },
  
  async getLocation(id: string) {
    const response = await nexusClient.getLocation(id);
    return response.data;
  },
  
  async createLocation(data: any) {
    const response = await nexusClient.createLocation(data);
    return response.data;
  }
};
```

**❌ WRONG: Direct apiClient Calls**

```typescript
// ❌ DON'T DO THIS: Direct API calls without product client
import { apiClient } from './api';

export const locationsService = {
  async listLocations() {
    // Missing type safety, manual path construction
    const response = await apiClient.get('/api/products/nexus/locations');
    return response.data;
  }
};
```

### Available Product Clients

| Product | Client Class | Package Import | Use Case |
|---------|-------------|----------------|----------|
| Nexus (HRIS) | `NexusClient` | `@recruitiq/api-client` | Employee management, attendance, benefits |
| PayLinQ (Payroll) | `PayLinQClient` | `@recruitiq/api-client` | Payroll runs, compensation, tax |
| ScheduleHub | `ScheduleHubClient` | `@recruitiq/api-client` | Scheduling, shifts, stations |
| RecruitIQ | `RecruitIQClient` | `@recruitiq/api-client` | Job postings, candidates, applications |

### Product Client Methods (Type-Safe)

**NexusClient** (112 methods across 9 services):
- Locations: `listLocations()`, `getLocation()`, `createLocation()`, `updateLocation()`, `deleteLocation()`
- Departments: `listDepartments()`, `getDepartment()`, `createDepartment()`, etc.
- Employees: `listEmployees()`, `getEmployee()`, `createEmployee()`, `terminateEmployee()`, etc.
- Time-Off: `listTimeOffRequests()`, `approveTimeOffRequest()`, `rejectTimeOffRequest()`, etc.
- Attendance: `listAttendanceRecords()`, `getAttendanceStatistics()`, etc.
- Benefits: `listBenefitPlans()`, `enrollEmployee()`, `checkEligibility()`, etc.
- Contracts: `listContracts()`, `generateFromContractTemplate()`, etc.
- Documents: `uploadFile()`, `downloadDocument()`, `requestSignature()`, etc.
- Performance: `listPerformanceReviews()`, `createGoal()`, `updateGoalProgress()`, etc.

**Benefits of Centralized Clients:**
1. ✅ **Type Safety** - Full TypeScript support with proper return types
2. ✅ **Maintainability** - Update paths in one place
3. ✅ **Consistency** - All services follow same pattern
4. ✅ **Error Handling** - Centralized interceptors and logging
5. ✅ **Testing** - Easy to mock entire client
6. ✅ **Documentation** - Self-documenting API surface

### Legacy Pattern (Deprecated)

**⚠️ DEPRECATED:** Direct path construction is no longer recommended:

```typescript
// ❌ OLD PATTERN: Manual path construction
const API_BASE = '/api/products/nexus/locations';  // Deprecated
const response = await apiClient.get(API_BASE);     // Use NexusClient instead
```

### Product Routing Architecture

The dynamic product system works as follows:

1. **Product Module Structure** (`backend/src/products/{product}/index.js`):
```javascript
export default {
  config: {
    name: 'Nexus',
    slug: 'nexus',  // Used in URL path
    version: '1.0.0'
  },
  routes: router,      // Product's Express router
  middleware: [],      // Product-specific middleware
  hooks: { onLoad, onUnload, onStartup, onShutdown }
};
```

2. **Route Registration** (`backend/src/products/core/RouteRegistry.js`):
   - Routes are mounted at `/{product.slug}` (e.g., `/nexus`)
   - RouteRegistry returns a main router with all product routes

3. **Server Mounting** (`backend/src/server.js`):
   - Product router is mounted at `/api/products`
   - Final path: `/api/products/{slug}/{resource}`

### Product Slug Reference

| Product | Slug | Base Path | Example Endpoint |
|---------|------|-----------|------------------|
| Nexus (HRIS) | `nexus` | `/api/products/nexus` | `/api/products/nexus/employees` |
| PayLinQ (Payroll) | `paylinq` | `/api/products/paylinq` | `/api/products/paylinq/payroll-runs` |
| ScheduleHub | `schedulehub` | `/api/products/schedulehub` | `/api/products/schedulehub/shifts` |
| RecruitIQ | `recruitiq` | `/api/products/recruitiq` | `/api/products/recruitiq/jobs` |

### Core Platform Routes (Not Product-Based)

Some routes are **NOT** product-specific and exist at the root API level:

```javascript
// ✅ Core platform routes (no /products prefix)
POST   /api/auth/login                    // Authentication
GET    /api/auth/me                       // Current user
POST   /api/auth/logout                   // Logout
GET    /api/organizations                 // Organization management
GET    /api/admin/products                // Product metadata management
GET    /api/system/products/status        // Product system admin
```

**Rule:** Use `/api/products/{slug}` for product application endpoints. Use `/api/{resource}` for core platform services (auth, organizations, admin).

### Troubleshooting 404 Errors

If you encounter 404 errors when calling product APIs:

1. **Check the API path** - Must include `/api/products/{slug}`
2. **Verify product slug** - Check `backend/src/products/{product}/index.js` config
3. **Confirm product is loaded** - Check server logs for product initialization
4. **Check ProductManager** - Verify `dynamicProductRouter` is initialized
5. **Test endpoint directly** - Use curl/Postman to verify backend route exists

```bash
# Verify product endpoints are accessible
curl http://localhost:3001/api/products/nexus/locations
curl http://localhost:3001/api/products/paylinq/worker-types

# Check product system status (admin only)
curl http://localhost:3001/api/system/products/status
```

---

## Response Format

### ⚠️ CRITICAL: Resource-Specific Keys

**ALWAYS use the resource name as the key, NOT generic "data"**

```javascript
// ✅ CORRECT: Resource-specific key
{
  "success": true,
  "job": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Senior Software Engineer",
    "status": "open"
  }
}

// ✅ CORRECT: Plural for lists
{
  "success": true,
  "jobs": [
    { "id": "...", "title": "..." },
    { "id": "...", "title": "..." }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}

// ❌ WRONG: Generic "data" key
{
  "success": true,
  "data": {  // ❌ Don't use generic "data"
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Senior Software Engineer"
  }
}
```

### Standard Success Response

```javascript
// Single resource
{
  "success": true,
  "job": {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "status": "string",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp"
  }
}

// List of resources
{
  "success": true,
  "jobs": [
    { /* job object */ },
    { /* job object */ }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}

// Create/Update response
{
  "success": true,
  "job": { /* created/updated object */ },
  "message": "Job created successfully"
}

// Delete response
{
  "success": true,
  "message": "Job deleted successfully"
}

// Bulk operation response
{
  "success": true,
  "results": {
    "created": 5,
    "updated": 3,
    "failed": 1,
    "errors": [
      {
        "index": 7,
        "error": "Invalid email format"
      }
    ]
  }
}
```

### Field Naming

```javascript
// ✅ CORRECT: camelCase in JSON responses
{
  "success": true,
  "job": {
    "id": "uuid",
    "title": "string",
    "employmentType": "full_time",    // camelCase
    "salaryMin": 80000,               // camelCase
    "salaryMax": 120000,              // camelCase
    "createdAt": "2025-01-03T10:30:00Z",
    "updatedAt": "2025-01-03T10:30:00Z"
  }
}

// ❌ WRONG: snake_case in JSON responses
{
  "success": true,
  "job": {
    "id": "uuid",
    "employment_type": "full_time",   // ❌ Wrong casing for JSON
    "salary_min": 80000,              // ❌ Wrong casing for JSON
    "created_at": "2025-01-03T10:30:00Z"
  }
}
```

---

## HTTP Status Codes

### Standard Status Codes (MANDATORY)

```javascript
// ✅ CORRECT: Use appropriate status codes

// 2xx Success
200 OK                    // Successful GET, PUT, PATCH
201 Created               // Successful POST
204 No Content            // Successful DELETE (no body)

// 4xx Client Errors
400 Bad Request           // Validation errors
401 Unauthorized          // Authentication required
403 Forbidden             // Authenticated but not authorized
404 Not Found             // Resource doesn't exist
409 Conflict              // Resource already exists or state conflict
422 Unprocessable Entity  // Validation failed
429 Too Many Requests     // Rate limit exceeded

// 5xx Server Errors
500 Internal Server Error // Unexpected server error
503 Service Unavailable   // Service temporarily down
```

### Status Code Usage

```javascript
// ✅ CORRECT: GET request
app.get('/api/jobs/:id', async (req, res) => {
  const job = await JobService.getById(req.params.id, req.user.organizationId);
  
  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found',
      errorCode: 'JOB_NOT_FOUND'
    });
  }
  
  return res.status(200).json({
    success: true,
    job
  });
});

// ✅ CORRECT: POST request
app.post('/api/jobs', async (req, res) => {
  const job = await JobService.create(
    req.body, 
    req.user.organizationId, 
    req.user.id
  );
  
  return res.status(201).json({
    success: true,
    job,
    message: 'Job created successfully'
  });
});

// ✅ CORRECT: DELETE request
app.delete('/api/jobs/:id', async (req, res) => {
  await JobService.delete(
    req.params.id, 
    req.user.organizationId, 
    req.user.id
  );
  
  return res.status(200).json({
    success: true,
    message: 'Job deleted successfully'
  });
});

// ✅ CORRECT: Validation error
app.post('/api/jobs', async (req, res) => {
  try {
    const job = await JobService.create(req.body, req.user.organizationId);
    return res.status(201).json({ success: true, job });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        errorCode: 'VALIDATION_ERROR',
        details: error.details
      });
    }
    throw error;
  }
});
```

---

## Error Handling

### Standard Error Response

```javascript
{
  "success": false,
  "error": "Human-readable error message",
  "errorCode": "MACHINE_READABLE_CODE",
  "details": {
    // Optional: Additional error details
    "field": "email",
    "constraint": "Email already exists"
  }
}

// Validation errors (400)
{
  "success": false,
  "error": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 12 characters"
    }
  ]
}

// Authentication error (401)
{
  "success": false,
  "error": "Authentication required",
  "errorCode": "UNAUTHORIZED"
}

// Authorization error (403)
{
  "success": false,
  "error": "Access denied",
  "errorCode": "FORBIDDEN"
}

// Not found error (404)
{
  "success": false,
  "error": "Job not found",
  "errorCode": "JOB_NOT_FOUND"
}

// Server error (500)
{
  "success": false,
  "error": "An unexpected error occurred",
  "errorCode": "INTERNAL_SERVER_ERROR"
}
```

### Error Codes

```javascript
// Define standard error codes
const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  
  // Resource Errors
  NOT_FOUND: 'NOT_FOUND',
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  CANDIDATE_NOT_FOUND: 'CANDIDATE_NOT_FOUND',
  
  // Conflict Errors
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_STATE: 'INVALID_STATE',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};
```

### Error Middleware

```javascript
/**
 * Global error handling middleware
 */
export function errorHandler(err, req, res, next) {
  // Log error
  logger.error('API Error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    organizationId: req.user?.organizationId
  });

  // ValidationError
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: err.message,
      errorCode: 'VALIDATION_ERROR',
      details: err.details
    });
  }

  // UnauthorizedError
  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      success: false,
      error: err.message,
      errorCode: 'UNAUTHORIZED'
    });
  }

  // ForbiddenError
  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      success: false,
      error: err.message,
      errorCode: 'FORBIDDEN'
    });
  }

  // NotFoundError
  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: err.message,
      errorCode: err.errorCode || 'NOT_FOUND'
    });
  }

  // ConflictError
  if (err instanceof ConflictError) {
    return res.status(409).json({
      success: false,
      error: err.message,
      errorCode: err.errorCode || 'CONFLICT'
    });
  }

  // RateLimitError
  if (err.statusCode === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      retryAfter: err.retryAfter
    });
  }

  // Default: Internal Server Error
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    errorCode: 'INTERNAL_SERVER_ERROR'
  });
}
```

---

## Pagination

### Pagination Standards

```javascript
// ✅ CORRECT: Offset-based pagination
GET /api/jobs?page=1&limit=20

// Query parameters
{
  page: 1,        // Page number (1-indexed)
  limit: 20       // Items per page
}

// Response
{
  "success": true,
  "jobs": [ /* array of jobs */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,         // Total number of items
    "totalPages": 8,      // Total number of pages
    "hasNext": true,      // Whether there are more pages
    "hasPrev": false      // Whether there are previous pages
  }
}

// Implementation
async function listJobs(filters, organizationId) {
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM jobs
    WHERE organization_id = $1
      AND deleted_at IS NULL
  `, [organizationId], organizationId);

  const total = parseInt(countResult.rows[0].total);

  // Get paginated results
  const result = await query(`
    SELECT *
    FROM jobs
    WHERE organization_id = $1
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, [organizationId, limit, offset], organizationId);

  return {
    jobs: result.rows,
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
```

### Cursor-Based Pagination (for high-volume data)

```javascript
// ✅ CORRECT: Cursor-based pagination
GET /api/jobs?cursor=2025-01-03T10:30:00Z_uuid&limit=20

// Response
{
  "success": true,
  "jobs": [ /* array of jobs */ ],
  "pagination": {
    "limit": 20,
    "nextCursor": "2025-01-02T15:20:00Z_uuid2",
    "hasNext": true
  }
}

// Implementation
async function listJobsCursor(cursor, limit, organizationId) {
  const decodedCursor = cursor ? decodeCursor(cursor) : null;
  
  const result = await query(`
    SELECT *
    FROM jobs
    WHERE organization_id = $1
      AND deleted_at IS NULL
      ${decodedCursor ? 'AND (created_at, id) < ($2, $3)' : ''}
    ORDER BY created_at DESC, id DESC
    LIMIT $${decodedCursor ? 4 : 2}
  `, decodedCursor 
    ? [organizationId, decodedCursor.timestamp, decodedCursor.id, limit + 1]
    : [organizationId, limit + 1],
    organizationId
  );

  const hasNext = result.rows.length > limit;
  const jobs = hasNext ? result.rows.slice(0, -1) : result.rows;
  
  const nextCursor = hasNext 
    ? encodeCursor(jobs[jobs.length - 1])
    : null;

  return {
    jobs,
    pagination: {
      limit,
      nextCursor,
      hasNext
    }
  };
}

function encodeCursor(job) {
  return `${job.created_at.toISOString()}_${job.id}`;
}

function decodeCursor(cursor) {
  const [timestamp, id] = cursor.split('_');
  return { timestamp: new Date(timestamp), id };
}
```

---

## Filtering & Sorting

### Filter Parameters

```javascript
// ✅ CORRECT: Query parameter filters
GET /api/jobs?status=open&location=New+York&minSalary=80000

// Implementation
async function buildFilters(queryParams, organizationId) {
  const conditions = ['organization_id = $1', 'deleted_at IS NULL'];
  const values = [organizationId];
  let paramCount = 1;

  // Status filter
  if (queryParams.status) {
    paramCount++;
    conditions.push(`status = $${paramCount}`);
    values.push(queryParams.status);
  }

  // Location filter
  if (queryParams.location) {
    paramCount++;
    conditions.push(`location ILIKE $${paramCount}`);
    values.push(`%${queryParams.location}%`);
  }

  // Salary filters
  if (queryParams.minSalary) {
    paramCount++;
    conditions.push(`salary_max >= $${paramCount}`);
    values.push(parseInt(queryParams.minSalary));
  }

  if (queryParams.maxSalary) {
    paramCount++;
    conditions.push(`salary_min <= $${paramCount}`);
    values.push(parseInt(queryParams.maxSalary));
  }

  // Date range filter
  if (queryParams.fromDate) {
    paramCount++;
    conditions.push(`created_at >= $${paramCount}`);
    values.push(new Date(queryParams.fromDate));
  }

  if (queryParams.toDate) {
    paramCount++;
    conditions.push(`created_at <= $${paramCount}`);
    values.push(new Date(queryParams.toDate));
  }

  // Search filter (multiple fields)
  if (queryParams.search) {
    paramCount++;
    conditions.push(`(
      title ILIKE $${paramCount} OR
      description ILIKE $${paramCount} OR
      department ILIKE $${paramCount}
    )`);
    values.push(`%${queryParams.search}%`);
  }

  return {
    where: `WHERE ${conditions.join(' AND ')}`,
    values
  };
}
```

### Sorting

```javascript
// ✅ CORRECT: Sort parameters
GET /api/jobs?sortBy=createdAt&sortOrder=desc

// Implementation
function buildSortClause(sortBy, sortOrder) {
  // Whitelist of allowed sort columns
  const allowedSortColumns = {
    'title': 'title',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'status': 'status',
    'salary': 'salary_max'
  };

  const sortColumn = allowedSortColumns[sortBy] || 'created_at';
  const order = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  return `ORDER BY ${sortColumn} ${order}`;
}

// Usage
const sortClause = buildSortClause(
  queryParams.sortBy, 
  queryParams.sortOrder
);

const query = `
  SELECT * FROM jobs
  WHERE organization_id = $1 AND deleted_at IS NULL
  ${sortClause}
  LIMIT $2 OFFSET $3
`;
```

---

## Versioning

### URL Versioning (Recommended)

```javascript
// ✅ CORRECT: Version in URL
GET /api/v1/jobs
GET /api/v2/jobs  // New version with breaking changes

// Route structure
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);

// v1/routes/jobs.js
import express from 'express';
const router = express.Router();

router.get('/jobs', listJobsV1);
router.get('/jobs/:id', getJobV1);

export default router;

// v2/routes/jobs.js
import express from 'express';
const router = express.Router();

router.get('/jobs', listJobsV2);  // New implementation
router.get('/jobs/:id', getJobV2);

export default router;
```

### Header Versioning (Alternative)

```javascript
// Request with version header
GET /api/jobs
Accept: application/vnd.recruitiq.v1+json

// Middleware to handle versioning
function versionMiddleware(req, res, next) {
  const acceptHeader = req.get('Accept') || '';
  const versionMatch = acceptHeader.match(/vnd\.recruitiq\.v(\d+)/);
  
  req.apiVersion = versionMatch ? parseInt(versionMatch[1]) : 1;
  next();
}

// Route handler
app.get('/api/jobs', versionMiddleware, (req, res) => {
  if (req.apiVersion === 2) {
    return listJobsV2(req, res);
  }
  return listJobsV1(req, res);
});
```

---

## Rate Limiting

### Rate Limit Configuration

```javascript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests',
    errorCode: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,     // Return rate limit info in headers
  legacyHeaders: false
});

// Stricter limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                    // Only 5 login attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many login attempts',
    errorCode: 'RATE_LIMIT_EXCEEDED'
  }
});

// Apply rate limiters
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Custom rate limiter based on user
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,                     // 3 new accounts per hour
  keyGenerator: (req) => {
    // Rate limit by IP or user
    return req.user?.id || req.ip;
  }
});
```

---

## Documentation

### OpenAPI/Swagger Documentation

```yaml
openapi: 3.0.0
info:
  title: RecruitIQ API
  version: 1.0.0
  description: RecruitIQ Recruitment Management System API

servers:
  - url: https://api.recruitiq.com/v1
    description: Production server
  - url: http://localhost:3001/api/v1
    description: Development server

paths:
  /jobs:
    get:
      summary: List all jobs
      tags:
        - Jobs
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: status
          in: query
          schema:
            type: string
            enum: [draft, open, closed, archived]
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  jobs:
                    type: array
                    items:
                      $ref: '#/components/schemas/Job'
                  pagination:
                    $ref: '#/components/schemas/Pagination'

    post:
      summary: Create a new job
      tags:
        - Jobs
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/JobInput'
      responses:
        '201':
          description: Job created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  job:
                    $ref: '#/components/schemas/Job'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Job:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        description:
          type: string
        status:
          type: string
          enum: [draft, open, closed, archived]
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer
        hasNext:
          type: boolean
        hasPrev:
          type: boolean
```

---

**Next:** [Frontend Standards](./FRONTEND_STANDARDS.md)
