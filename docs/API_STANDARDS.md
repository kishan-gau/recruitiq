# API Standards

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.1  
**Last Updated:** November 19, 2025

---

## Table of Contents

1. [API Principles](#api-principles)
2. [API Contracts](#api-contracts)
3. [Product-Based Routing](#product-based-routing)
4. [Authentication & Authorization](#authentication--authorization)
5. [Request Handling](#request-handling)
6. [Response Format](#response-format)
7. [HTTP Status Codes](#http-status-codes)
8. [Error Handling](#error-handling)
9. [Controller Standards](#controller-standards)
10. [Data Transformation](#data-transformation)
11. [Pagination](#pagination)
12. [Filtering & Sorting](#filtering--sorting)
13. [File Upload Handling](#file-upload-handling)
14. [Versioning](#versioning)
15. [Rate Limiting](#rate-limiting)
16. [Security Headers](#security-headers)
17. [API Testing](#api-testing)
18. [Documentation](#documentation)

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

## API Contracts

### Contract Principles (MANDATORY)

API Contracts define the "agreement" between frontend and backend about data structure, validation rules, and behavior.

**Core Principles:**

1. **Backward Compatibility** - Never break existing clients without versioning
2. **Explicit Contracts** - Document all guarantees and requirements
3. **Fail Fast** - Validate contracts at API boundaries
4. **Version Breaking Changes** - Use API versioning for incompatible changes
5. **Type Safety** - Use TypeScript types to enforce contracts
6. **Contract Testing** - Automated tests verify contract compliance

### Request Contract Definition

Every endpoint MUST document its request contract with:

```typescript
/**
 * Request contract for creating a job
 */
interface CreateJobRequest {
  // Required fields - must be present, validated
  title: string;           // Required, 3-200 chars, trimmed
  description: string;     // Required, min 10 chars, trimmed
  workspaceId: string;     // Required, UUID v4 format
  
  // Optional fields - with defaults or nullable
  department?: string;     // Optional, max 100 chars, defaults to null
  location?: string;       // Optional, max 200 chars, defaults to null
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'temporary'; // Defaults to 'full-time'
  
  // Numeric constraints
  salaryMin?: number;      // Optional, >= 0, integer
  salaryMax?: number;      // Optional, >= salaryMin, integer
  
  // Array fields
  skills?: string[];       // Optional, each string max 50 chars, max 100 items
  requirements?: string[]; // Optional, each string max 500 chars, max 50 items
}
```

**Validation Rules Documentation:**

```javascript
// ✅ CORRECT: Explicit validation rules in Joi schema
static createSchema = Joi.object({
  title: Joi.string()
    .required()
    .trim()
    .min(3)
    .max(200)
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 3 characters',
      'string.max': 'Title cannot exceed 200 characters'
    }),
  
  description: Joi.string()
    .required()
    .trim()
    .min(10)
    .messages({
      'string.min': 'Description must be at least 10 characters'
    }),
  
  workspaceId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Workspace ID must be a valid UUID'
    }),
  
  employmentType: Joi.string()
    .valid('full-time', 'part-time', 'contract', 'temporary')
    .default('full-time'),
  
  salaryMin: Joi.number()
    .integer()
    .min(0)
    .optional()
    .allow(null),
  
  salaryMax: Joi.number()
    .integer()
    .min(Joi.ref('salaryMin'))
    .optional()
    .allow(null)
    .messages({
      'number.min': 'Maximum salary must be greater than or equal to minimum salary'
    }),
  
  skills: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(100)
    .unique()
    .optional(),
  
  requirements: Joi.array()
    .items(Joi.string().trim().max(500))
    .max(50)
    .optional()
}).options({ 
  stripUnknown: true,  // Remove fields not in schema
  abortEarly: false    // Return all validation errors
});
```

### Response Contract Definition

Every endpoint MUST guarantee its response structure:

```typescript
/**
 * Response contract for job retrieval
 */
interface JobResponse {
  success: true;
  job: {
    // Fields that are ALWAYS present (guaranteed)
    id: string;                    // Always present, UUID v4
    title: string;                 // Always present, never empty
    description: string;           // Always present
    status: JobStatus;             // Always present, enum
    workspaceId: string;           // Always present, UUID v4
    organizationId: string;        // Always present, UUID v4
    employmentType: EmploymentType; // Always present, defaults to 'full-time'
    createdAt: string;             // Always present, ISO 8601 timestamp
    updatedAt: string;             // Always present, ISO 8601 timestamp
    createdBy: string;             // Always present, UUID v4
    
    // Fields that may be null (present but nullable)
    department: string | null;     // Present, may be null
    location: string | null;       // Present, may be null
    salaryMin: number | null;      // Present, may be null
    salaryMax: number | null;      // Present, may be null
    updatedBy: string | null;      // Present, may be null if never updated
    
    // Fields that may be omitted (conditional presence)
    skills?: string[];             // Omitted in list views, present in detail views
    requirements?: string[];       // Omitted in list views, present in detail views
    applicationCount?: number;     // Omitted unless specifically requested
  };
}

/**
 * List response contract
 */
interface JobListResponse {
  success: true;
  jobs: Array<{
    // Minimal fields for list views
    id: string;
    title: string;
    status: JobStatus;
    location: string | null;
    employmentType: EmploymentType;
    createdAt: string;
    // Note: skills and requirements omitted for performance
  }>;
  pagination: {
    page: number;        // Always >= 1
    limit: number;       // Always >= 1, <= 100
    total: number;       // Always >= 0
    totalPages: number;  // Always >= 0
    hasNext: boolean;    // Always present
    hasPrev: boolean;    // Always present
  };
}
```

### Null vs Undefined vs Omitted

**CRITICAL:** Be explicit about field presence:

```typescript
// ❌ WRONG: Ambiguous
interface JobResponse {
  department: string;  // Is this always present? Can it be null?
}

// ✅ CORRECT: Explicit contract
interface JobResponse {
  // Field is ALWAYS present, never null
  id: string;
  
  // Field is ALWAYS present, but MAY be null
  department: string | null;
  
  // Field MAY be omitted entirely
  skills?: string[];
  
  // Field MAY be omitted OR null when present
  metadata?: Record<string, any> | null;
}
```

**Rules:**
- **Always present, never null** → `field: Type`
- **Always present, may be null** → `field: Type | null`
- **May be omitted** → `field?: Type`
- **May be omitted or null** → `field?: Type | null`

### Breaking vs Non-Breaking Changes

#### ❌ Breaking Changes (Require Version Bump)

These changes **break existing clients** and require a new API version:

```javascript
// 1. Removing a field from response
// Before: { success: true, job: { id, title, department } }
// After:  { success: true, job: { id, title } }  // ❌ BREAKING!

// 2. Changing field type
// Before: { salaryMin: 50000 }  // number
// After:  { salaryMin: "50000" }  // ❌ BREAKING! Now string

// 3. Renaming a field
// Before: { employmentType: 'full-time' }
// After:  { employment_type: 'full-time' }  // ❌ BREAKING!

// 4. Making optional field required
// Before: { title: string, department?: string }
// After:  { title: string, department: string }  // ❌ BREAKING!

// 5. Removing enum values
// Before: status: 'draft' | 'open' | 'closed'
// After:  status: 'open' | 'closed'  // ❌ BREAKING! 'draft' removed

// 6. Changing response structure
// Before: { success: true, job: {...} }
// After:  { success: true, data: {...} }  // ❌ BREAKING!

// 7. Changing error codes
// Before: { errorCode: 'NOT_FOUND' }
// After:  { errorCode: 'RESOURCE_NOT_FOUND' }  // ❌ BREAKING!

// 8. Changing validation rules (stricter)
// Before: title: min 3 chars
// After:  title: min 10 chars  // ❌ BREAKING! Rejects previously valid data
```

#### ✅ Non-Breaking Changes (Safe to Deploy)

These changes are **backward compatible**:

```javascript
// 1. Adding new optional request fields
// Before: { title: string }
// After:  { title: string, tags?: string[] }  // ✅ Safe

// 2. Adding new response fields
// Before: { id, title }
// After:  { id, title, createdBy }  // ✅ Safe - clients ignore unknown fields

// 3. Adding new enum values (with client fallback)
// Before: status: 'draft' | 'open'
// After:  status: 'draft' | 'open' | 'archived'  // ✅ Safe if clients handle unknown

// 4. Deprecating fields (with warning period)
// { title: string, oldField: string }  // Mark as deprecated, remove in v2
// ✅ Safe during deprecation period

// 5. Adding new error codes
// Existing: 'NOT_FOUND', 'VALIDATION_ERROR'
// New:      'NOT_FOUND', 'VALIDATION_ERROR', 'DUPLICATE_ENTRY'  // ✅ Safe

// 6. Improving error messages
// Before: { error: 'Invalid input' }
// After:  { error: 'Invalid input: title must be at least 3 characters' }  // ✅ Safe

// 7. Making validation rules less strict
// Before: title: min 10 chars
// After:  title: min 3 chars  // ✅ Safe - accepts more data

// 8. Changing internal implementation (same contract)
// Database query optimization, caching, etc.  // ✅ Safe
```

### Contract Testing

**JSON Schema Validation:**

```javascript
// contracts/jobResponse.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["success", "job"],
  "properties": {
    "success": { "type": "boolean", "const": true },
    "job": {
      "type": "object",
      "required": ["id", "title", "description", "status", "createdAt"],
      "properties": {
        "id": { "type": "string", "format": "uuid" },
        "title": { "type": "string", "minLength": 3, "maxLength": 200 },
        "description": { "type": "string", "minLength": 10 },
        "status": { 
          "type": "string", 
          "enum": ["draft", "open", "closed", "archived"] 
        },
        "department": { "type": ["string", "null"] },
        "createdAt": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

**Contract Test Example:**

```javascript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import request from 'supertest';
import jobResponseSchema from './contracts/jobResponse.schema.json';

describe('GET /api/jobs/:id - Contract Tests', () => {
  const ajv = new Ajv({ strict: true });
  addFormats(ajv);
  const validate = ajv.compile(jobResponseSchema);

  it('should match response contract', async () => {
    const response = await request(app)
      .get('/api/jobs/123e4567-e89b-12d3-a456-426614174000')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const valid = validate(response.body);
    
    if (!valid) {
      console.error('Contract validation errors:', validate.errors);
    }
    
    expect(valid).toBe(true);
  });

  it('should have all required fields', async () => {
    const response = await request(app).get('/api/jobs/123');
    
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('job');
    expect(response.body.job).toHaveProperty('id');
    expect(response.body.job).toHaveProperty('title');
    expect(response.body.job).toHaveProperty('createdAt');
  });

  it('should have correct field types', async () => {
    const response = await request(app).get('/api/jobs/123');
    
    expect(typeof response.body.success).toBe('boolean');
    expect(typeof response.body.job.id).toBe('string');
    expect(typeof response.body.job.title).toBe('string');
    expect(Array.isArray(response.body.job.skills)).toBe(true);
  });

  it('should handle nullable fields correctly', async () => {
    const response = await request(app).get('/api/jobs/123');
    
    // Department can be null or string, but must be present
    expect(response.body.job).toHaveProperty('department');
    expect(
      response.body.job.department === null || 
      typeof response.body.job.department === 'string'
    ).toBe(true);
  });
});
```

### Deprecation Workflow

**How to safely deprecate fields or endpoints:**

```javascript
// Step 1: Mark as deprecated in documentation and add warning header
app.get('/api/v1/jobs/:id', (req, res) => {
  // Add deprecation header
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', 'Wed, 31 Dec 2025 23:59:59 GMT');
  res.setHeader('Link', '</api/v2/jobs/:id>; rel="successor-version"');
  
  // Return data with deprecated field
  return res.json({
    success: true,
    job: {
      id: job.id,
      title: job.title,
      oldField: job.oldField  // Mark in docs: DEPRECATED - Use newField instead
    }
  });
});

// Step 2: Add migration period (both old and new fields)
{
  oldField: job.oldField,  // DEPRECATED - Remove in v2
  newField: job.newField   // Use this instead
}

// Step 3: After migration period, remove in new version
// v2 removes oldField entirely
```

**Deprecation Notice Example:**

```typescript
/**
 * @deprecated Use `employeeId` instead. Will be removed in API v2 (2026-03-01)
 */
interface JobResponse {
  /**
   * @deprecated Use employeeId instead
   */
  userId?: string;
  
  employeeId: string;  // Use this
}
```

### Contract Documentation Template

**Every new endpoint MUST document its contract:**

```typescript
/**
 * POST /api/products/nexus/employees
 * 
 * Creates a new employee record
 * 
 * @auth Required - JWT token with 'employee:create' permission
 * @rateLimit 100 requests per 15 minutes
 * 
 * REQUEST CONTRACT:
 * @body {
 *   firstName: string (required, 2-100 chars)
 *   lastName: string (required, 2-100 chars)
 *   email: string (required, valid email, unique)
 *   workspaceId: string (required, UUID v4)
 *   departmentId?: string (optional, UUID v4)
 *   hireDate: string (required, YYYY-MM-DD format, not future)
 *   employmentType: 'full-time' | 'part-time' | 'contract' (required)
 * }
 * 
 * RESPONSE CONTRACT:
 * @status 201 Created
 * @returns {
 *   success: true
 *   employee: {
 *     id: string (UUID v4)
 *     firstName: string
 *     lastName: string
 *     email: string
 *     workspaceId: string
 *     departmentId: string | null
 *     hireDate: string (YYYY-MM-DD)
 *     employmentType: string
 *     status: 'active' (always 'active' on creation)
 *     createdAt: string (ISO 8601)
 *     updatedAt: string (ISO 8601)
 *   }
 * }
 * 
 * ERROR RESPONSES:
 * @status 400 Bad Request - Validation errors
 * @status 401 Unauthorized - Missing or invalid token
 * @status 403 Forbidden - Missing permission
 * @status 409 Conflict - Email already exists
 * @status 422 Unprocessable Entity - Invalid data format
 * 
 * BREAKING CHANGES:
 * - v1.0.0: Initial release
 * - v1.1.0: Added optional departmentId field (non-breaking)
 * - v2.0.0 (planned 2026-03): Will require departmentId (breaking)
 */
```


---

## Authentication & Authorization

### ⚠️ CRITICAL: Cookie-Based Authentication (MANDATORY)

**Bearer tokens are FULLY DEPRECATED.** All authentication MUST use httpOnly cookies as per security standards.

**Cookie-Based Authentication:**
- ✅ `tenant_access_token` cookie for tenant users
- ✅ `platform_access_token` cookie for platform users
- ✅ httpOnly flag prevents XSS attacks
- ✅ Secure flag for production
- ✅ SameSite protection against CSRF

**❌ DEPRECATED: Bearer Token Authentication (DO NOT USE)**
- Bearer tokens expose tokens to JavaScript
- No XSS protection
- Manual token management required
- **Status**: Fully deprecated as of November 2025
- **Migration**: Update all code to use cookie-based authentication

### Authentication Middleware (MANDATORY)

**ALL protected routes MUST use the authenticate middleware:**

```javascript
import { authenticate } from '../middleware/auth.js';

// ✅ CORRECT: Protected route with authentication
router.get('/api/jobs', authenticate, listJobs);
router.post('/api/jobs', authenticate, createJob);
router.put('/api/jobs/:id', authenticate, updateJob);

// ❌ WRONG: No authentication on protected endpoint
router.post('/api/jobs', createJob);  // Anyone can create jobs!
```

### Authentication Implementation

The authenticate middleware validates JWT tokens and attaches user to request:

```javascript
// middleware/auth.js
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';

export async function authenticate(req, res, next) {
  try {
    // 1. Extract token from httpOnly cookie (SECURITY: Cookie-based auth)
    const token = req.cookies.tenant_access_token;
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // 2. Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Check token blacklist (for logout)
    const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // 4. Attach user to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      organizationId: decoded.organizationId,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    // 5. Log authentication event
    logger.info('User authenticated', {
      userId: req.user.id,
      ip: req.ip,
      path: req.path
    });

    next();
  } catch (error) {
    // Log security event
    logger.logSecurityEvent('authentication_failed', {
      ip: req.ip,
      path: req.path,
      error: error.message
    });

    next(new UnauthorizedError('Authentication failed'));
  }
}
```

### Accessing Authenticated User in Controllers

```javascript
// ✅ CORRECT: Access user from req.user
export async function createJob(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    
    const job = await JobService.create(
      req.body,
      organizationId,  // From authenticated user
      userId           // From authenticated user
    );
    
    return res.status(201).json({
      success: true,
      job
    });
  } catch (error) {
    next(error);
  }
}

// ❌ WRONG: Taking organizationId from request body (security risk!)
export async function createJob(req, res, next) {
  const { organizationId } = req.body;  // ❌ User could fake this!
  const job = await JobService.create(req.body, organizationId);
}
```

### Role-Based Access Control (RBAC)

**Use requireRole middleware for role checks:**

```javascript
import { authenticate, requireRole } from '../middleware/auth.js';

// Only admins and owners can access
router.post('/api/admin/users', 
  authenticate, 
  requireRole('admin', 'owner'),
  createUser
);

// Only recruiters and admins can create jobs
router.post('/api/jobs',
  authenticate,
  requireRole('recruiter', 'admin'),
  createJob
);
```

**requireRole middleware implementation:**

```javascript
// middleware/auth.js

/**
 * Middleware to check user roles
 * @param {Array<string>} allowedRoles - Roles that can access the endpoint
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'UNAUTHORIZED'
      });
    }

    const { role } = req.user;

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(role)) {
      logger.logSecurityEvent('forbidden_access', {
        userId: req.user.id,
        userRole: role,
        requiredRoles: allowedRoles,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied',
        errorCode: 'FORBIDDEN'
      });
    }

    next();
  };
}
```

### Permission-Based Access Control

**Check specific permissions for fine-grained control:**

```javascript
import { authenticate, requirePermission } from '../middleware/auth.js';

// Requires specific permission
router.delete('/api/jobs/:id',
  authenticate,
  requirePermission('job:delete'),
  deleteJob
);

router.post('/api/admin/organizations',
  authenticate,
  requirePermission('organization:create'),
  createOrganization
);
```

**requirePermission middleware:**

```javascript
/**
 * Middleware to check user permissions
 * @param {string} permission - Required permission (format: 'resource:action')
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'UNAUTHORIZED'
      });
    }

    const { permissions = [] } = req.user;

    // Check if user has the specific permission
    if (!permissions.includes(permission)) {
      logger.logSecurityEvent('forbidden_access', {
        userId: req.user.id,
        requiredPermission: permission,
        userPermissions: permissions,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: `Missing required permission: ${permission}`,
        errorCode: 'FORBIDDEN'
      });
    }

    next();
  };
}
```

### Authorization in Service Layer

**Sometimes authorization logic belongs in services:**

```javascript
// ✅ CORRECT: Check ownership in service
class JobService {
  async update(jobId, data, organizationId, userId) {
    // Get existing job
    const job = await this.repository.findById(jobId, organizationId);
    
    if (!job) {
      throw new NotFoundError('Job not found');
    }
    
    // Check if user is owner or admin
    const user = await userRepository.findById(userId, organizationId);
    
    if (job.createdBy !== userId && user.role !== 'admin') {
      throw new ForbiddenError('Only the job creator or admin can update this job');
    }
    
    // Proceed with update
    return await this.repository.update(jobId, data, organizationId, userId);
  }
}
```

### JWT Token Generation

**Generate tokens with proper claims:**

```javascript
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/index.js';

/**
 * Generates JWT access token
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      permissions: user.permissions || []
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,      // e.g., '15m', '24h'
      issuer: 'recruitiq-api',
      audience: 'recruitiq-client'
    }
  );
}

/**
 * Generates refresh token
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      type: 'refresh'
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: '7d',  // Longer expiration for refresh tokens
      issuer: 'recruitiq-api'
    }
  );
}
```

### Token Refresh Pattern

```javascript
// POST /api/auth/refresh
export async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }
    
    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklist.isBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }
    
    // Get user
    const user = await userRepository.findById(decoded.id);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Generate new access token
    const accessToken = generateToken(user);
    
    // Optionally rotate refresh token
    const newRefreshToken = generateRefreshToken(user);
    
    // Blacklist old refresh token
    await tokenBlacklist.add(refreshToken);
    
    return res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
}
```

### Common Authentication Patterns

**Pattern 1: Public + Protected Routes**

```javascript
// Public routes (no authentication)
router.get('/api/jobs/public', listPublicJobs);
router.get('/api/jobs/public/:id', getPublicJob);

// Protected routes (authentication required)
router.get('/api/jobs', authenticate, listJobs);
router.post('/api/jobs', authenticate, createJob);
```

**Pattern 2: Optional Authentication**

```javascript
/**
 * Middleware for optional authentication
 * Attaches user if token is valid, but doesn't fail if missing
 */
export async function optionalAuth(req, res, next) {
  const token = req.cookies.tenant_access_token;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token invalid, but that's okay for optional auth
      req.user = null;
    }
  }
  
  next();
}

// Usage: Show more data if user is authenticated
router.get('/api/jobs/:id', optionalAuth, getJob);

export async function getJob(req, res, next) {
  const job = await JobService.getById(req.params.id);
  
  // Show salary only to authenticated users
  if (req.user) {
    return res.json({ success: true, job });
  } else {
    const { salaryMin, salaryMax, ...publicJob } = job;
    return res.json({ success: true, job: publicJob });
  }
}
```

**Pattern 3: Cascading Permissions**

```javascript
// Check multiple conditions
router.delete('/api/jobs/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const { organizationId, id: userId, role } = req.user;
      const jobId = req.params.id;
      
      // Get job
      const job = await JobService.getById(jobId, organizationId);
      
      // Allow if: admin, owner, or creator
      if (role === 'admin' || 
          role === 'owner' || 
          job.createdBy === userId) {
        return next();  // Authorized
      }
      
      return res.status(403).json({
        success: false,
        error: 'Only admins, owners, or job creators can delete jobs',
        errorCode: 'FORBIDDEN'
      });
    } catch (error) {
      next(error);
    }
  },
  deleteJob
);
```

### Authentication Testing

**Test authentication in integration tests:**

```javascript
describe('POST /api/jobs - Authentication', () => {
  it('should return 401 without token', async () => {
    const response = await request(app)
      .post('/api/jobs')
      .send({ title: 'Test Job' })
      .expect(401);
    
    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toBe('UNAUTHORIZED');
  });
  
  it('should return 401 with invalid token', async () => {
    const response = await request(app)
      .post('/api/jobs')
      .set('Cookie', 'tenant_access_token=invalid-token')
      .send({ title: 'Test Job' })
      .expect(401);
  });
  
  it('should succeed with valid token', async () => {
    // Login to get auth cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'password' });
    
    const authCookie = loginRes.headers['set-cookie'];
    
    const response = await request(app)
      .post('/api/jobs')
      .set('Cookie', authCookie)
      .send({ title: 'Test Job', description: 'Description', workspaceId })
      .expect(201);
    
    expect(response.body.success).toBe(true);
  });
  
  it('should return 403 for insufficient role', async () => {
    // Login as viewer
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: viewerUser.email, password: 'password' });
    
    const authCookie = loginRes.headers['set-cookie'];
    
    const response = await request(app)
      .post('/api/admin/users')
      .set('Cookie', authCookie)
      .send({ email: 'newuser@example.com' })
      .expect(403);
    
    expect(response.body.errorCode).toBe('FORBIDDEN');
  });
});
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
