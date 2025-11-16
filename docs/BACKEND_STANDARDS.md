# Backend Development Standards

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.0  
**Last Updated:** November 3, 2025

---

## Table of Contents

1. [Layer Architecture](#layer-architecture)
2. [Service Layer Standards](#service-layer-standards)
3. [Repository Layer Standards](#repository-layer-standards)
4. [Controller Layer Standards](#controller-layer-standards)
5. [Middleware Standards](#middleware-standards)
6. [Error Handling](#error-handling)
7. [Validation](#validation)
8. [Logging](#logging)
9. [Common Patterns](#common-patterns)

---

## Layer Architecture

### Mandatory Layer Separation

Every backend feature MUST follow this architecture:

```
Route → Controller → Service → Repository → Database
```

**Each layer has ONE responsibility:**

| Layer | Responsibility | ✅ Can Do | ❌ Cannot Do |
|-------|---------------|-----------|-------------|
| **Route** | Request routing | Define endpoints, apply middleware | Business logic, data access |
| **Controller** | HTTP handling | Parse req/res, call services | Validation, database queries |
| **Service** | Business logic | Validate, orchestrate, transform | HTTP handling, direct SQL |
| **Repository** | Data access | CRUD operations, queries | Business rules, HTTP responses |

---

## Service Layer Standards

### Service Class Structure (MANDATORY)

```javascript
import Joi from 'joi';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Service for managing job postings
 */
class JobService {
  /**
   * Constructor with dependency injection
   * @param {JobRepository} repository - Job repository instance
   */
  constructor(repository = null) {
    this.repository = repository || new JobRepository();
  }

  /**
   * Joi validation schema for job creation
   * MUST be static getter
   */
  static get createSchema() {
    return Joi.object({
      title: Joi.string().required().trim().min(3).max(200),
      description: Joi.string().required().trim().min(10),
      workspaceId: Joi.string().uuid().required(),
      department: Joi.string().optional().trim().max(100),
      location: Joi.string().optional().trim().max(200),
      employmentType: Joi.string()
        .valid('full-time', 'part-time', 'contract', 'temporary')
        .default('full-time'),
      salaryMin: Joi.number().optional().min(0),
      salaryMax: Joi.number().optional().min(Joi.ref('salaryMin')),
      skills: Joi.array().items(Joi.string()).optional(),
      requirements: Joi.array().items(Joi.string()).optional()
    }).options({ stripUnknown: true });
  }

  /**
   * Joi validation schema for job updates
   */
  static get updateSchema() {
    return Joi.object({
      title: Joi.string().optional().trim().min(3).max(200),
      description: Joi.string().optional().trim().min(10),
      department: Joi.string().optional().trim().max(100),
      location: Joi.string().optional().trim().max(200),
      employmentType: Joi.string()
        .valid('full-time', 'part-time', 'contract', 'temporary')
        .optional(),
      salaryMin: Joi.number().optional().min(0),
      salaryMax: Joi.number().optional(),
      skills: Joi.array().items(Joi.string()).optional(),
      requirements: Joi.array().items(Joi.string()).optional(),
      isActive: Joi.boolean().optional()
    }).min(1).options({ stripUnknown: true });
  }

  /**
   * Creates a new job posting
   * 
   * @param {Object} data - Job data (validated against createSchema)
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID who created the job
   * @returns {Promise<Object>} Created job object
   * @throws {ValidationError} If data is invalid
   * @throws {NotFoundError} If workspace not found
   */
  async create(data, organizationId, userId) {
    try {
      // 1. ALWAYS validate first
      const validated = await this.constructor.createSchema.validateAsync(data);
      
      // 2. Verify workspace belongs to organization
      const workspace = await this.repository.findWorkspaceById(
        validated.workspaceId,
        organizationId
      );
      
      if (!workspace) {
        throw new NotFoundError('Workspace not found or access denied');
      }

      // 3. Apply business rules
      const jobData = {
        ...validated,
        organizationId,
        createdBy: userId,
        status: 'draft',
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 4. Delegate to repository
      const job = await this.repository.create(jobData);

      // 5. Log success
      logger.info('Job created successfully', {
        jobId: job.id,
        organizationId,
        userId
      });

      return job;
    } catch (error) {
      // 6. Log errors with context
      logger.error('Error creating job', {
        error: error.message,
        organizationId,
        userId,
        data: { ...data, workspaceId: data.workspaceId } // Safe logging
      });
      throw error;
    }
  }

  /**
   * Retrieves a job by ID
   * 
   * @param {string} jobId - Job UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Job object
   * @throws {NotFoundError} If job not found
   */
  async getById(jobId, organizationId) {
    const job = await this.repository.findById(jobId, organizationId);
    
    if (!job) {
      throw new NotFoundError('Job not found');
    }
    
    return job;
  }

  /**
   * Updates a job
   * 
   * @param {string} jobId - Job UUID
   * @param {Object} data - Update data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing update
   * @returns {Promise<Object>} Updated job object
   * @throws {ValidationError} If data is invalid
   * @throws {NotFoundError} If job not found
   */
  async update(jobId, data, organizationId, userId) {
    // 1. Validate update data
    const validated = await this.constructor.updateSchema.validateAsync(data);
    
    // 2. Verify job exists and belongs to organization
    const existingJob = await this.getById(jobId, organizationId);
    
    // 3. Apply business rules for updates
    const updateData = {
      ...validated,
      updatedBy: userId,
      updatedAt: new Date()
    };

    // 4. If changing salary, validate range
    if (updateData.salaryMax && existingJob.salaryMin) {
      if (updateData.salaryMax < existingJob.salaryMin) {
        throw new ValidationError('Salary max cannot be less than salary min');
      }
    }

    // 5. Update in repository
    const updated = await this.repository.update(jobId, updateData, organizationId);

    logger.info('Job updated successfully', { jobId, organizationId, userId });

    return updated;
  }

  /**
   * Deletes a job (soft delete)
   * 
   * @param {string} jobId - Job UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing delete
   * @returns {Promise<void>}
   * @throws {NotFoundError} If job not found
   */
  async delete(jobId, organizationId, userId) {
    // Verify job exists
    await this.getById(jobId, organizationId);
    
    // Soft delete
    await this.repository.softDelete(jobId, organizationId, userId);
    
    logger.info('Job deleted successfully', { jobId, organizationId, userId });
  }

  /**
   * Lists jobs with filtering and pagination
   * 
   * @param {Object} filters - Query filters
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} { jobs, pagination, filters }
   */
  async list(filters, organizationId) {
    // Validate pagination params
    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
    const offset = (page - 1) * limit;

    // Build safe filter object
    const safeFilters = {
      workspaceId: filters.workspaceId || null,
      status: filters.status || null,
      employmentType: filters.employmentType || null,
      search: filters.search || null,
      isPublished: filters.isPublished || null
    };

    // Get data from repository
    const { jobs, total } = await this.repository.findAll(
      safeFilters,
      { limit, offset },
      organizationId
    );

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: safeFilters
    };
  }
}

export default JobService;
```

### Service Standards Checklist

**EVERY service MUST have:**

- [ ] **Constructor with dependency injection**
- [ ] **Static Joi schemas** for create/update operations
- [ ] **JSDoc comments** for all public methods
- [ ] **Proper error handling** with try/catch and logging
- [ ] **Validation FIRST** before any business logic
- [ ] **organizationId parameter** for all operations
- [ ] **userId parameter** for audit trail
- [ ] **No direct database access** (use repository)
- [ ] **No HTTP handling** (no req/res objects)

---

## Repository Layer Standards

### Repository Class Structure (MANDATORY)

```javascript
import BaseRepository from './BaseRepository.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Repository for job data access
 * Extends BaseRepository for common CRUD operations
 */
class JobRepository extends BaseRepository {
  constructor() {
    super('jobs'); // Table name
  }

  /**
   * Creates a new job
   * MUST use custom query wrapper for tenant isolation
   * 
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} Created job
   */
  async create(jobData) {
    const text = `
      INSERT INTO jobs (
        id, title, description, workspace_id, organization_id,
        department, location, employment_type, salary_min, salary_max,
        skills, requirements, status, is_published, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      jobData.id || require('uuid').v4(),
      jobData.title,
      jobData.description,
      jobData.workspaceId,
      jobData.organizationId,
      jobData.department,
      jobData.location,
      jobData.employmentType,
      jobData.salaryMin,
      jobData.salaryMax,
      JSON.stringify(jobData.skills || []),
      JSON.stringify(jobData.requirements || []),
      jobData.status,
      jobData.isPublished,
      jobData.createdBy,
      jobData.createdAt,
      jobData.updatedAt
    ];

    // ✅ CRITICAL: Use custom query wrapper, NOT pool.query()
    const result = await query(
      text,
      values,
      jobData.organizationId,
      { operation: 'INSERT', table: 'jobs' }
    );

    return result.rows[0];
  }

  /**
   * Finds job by ID with tenant isolation
   * 
   * @param {string} id - Job UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Job or null
   */
  async findById(id, organizationId) {
    const text = `
      SELECT 
        j.*,
        w.name as workspace_name,
        u.name as created_by_name
      FROM jobs j
      LEFT JOIN workspaces w ON j.workspace_id = w.id
      LEFT JOIN users u ON j.created_by = u.id
      WHERE j.id = $1 
        AND j.organization_id = $2
        AND j.deleted_at IS NULL
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
   * Finds all jobs with filtering
   * MUST enforce tenant isolation
   * 
   * @param {Object} filters - Query filters
   * @param {Object} pagination - { limit, offset }
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} { jobs, total }
   */
  async findAll(filters, pagination, organizationId) {
    let text = `
      SELECT 
        j.*,
        w.name as workspace_name,
        u.name as created_by_name,
        COUNT(*) OVER() as total_count
      FROM jobs j
      LEFT JOIN workspaces w ON j.workspace_id = w.id
      LEFT JOIN users u ON j.created_by = u.id
      WHERE j.organization_id = $1
        AND j.deleted_at IS NULL
    `;

    const values = [organizationId];
    let paramCount = 1;

    // Add filters
    if (filters.workspaceId) {
      paramCount++;
      text += ` AND j.workspace_id = $${paramCount}`;
      values.push(filters.workspaceId);
    }

    if (filters.status) {
      paramCount++;
      text += ` AND j.status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.employmentType) {
      paramCount++;
      text += ` AND j.employment_type = $${paramCount}`;
      values.push(filters.employmentType);
    }

    if (filters.search) {
      paramCount++;
      text += ` AND (j.title ILIKE $${paramCount} OR j.description ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
    }

    if (filters.isPublished !== null) {
      paramCount++;
      text += ` AND j.is_published = $${paramCount}`;
      values.push(filters.isPublished);
    }

    // Add pagination
    text += ` ORDER BY j.created_at DESC`;
    text += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(pagination.limit, pagination.offset);

    const result = await query(
      text,
      values,
      organizationId,
      { operation: 'SELECT', table: 'jobs' }
    );

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    return {
      jobs: result.rows,
      total
    };
  }

  /**
   * Updates a job
   * 
   * @param {string} id - Job UUID
   * @param {Object} data - Update data
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Updated job
   */
  async update(id, data, organizationId) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    // Build dynamic UPDATE query
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

    paramCount++;
    values.push(id);
    const idParam = paramCount;

    paramCount++;
    values.push(organizationId);
    const orgParam = paramCount;

    const text = `
      UPDATE jobs
      SET ${fields.join(', ')}
      WHERE id = $${idParam}
        AND organization_id = $${orgParam}
        AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await query(
      text,
      values,
      organizationId,
      { operation: 'UPDATE', table: 'jobs' }
    );

    return result.rows[0];
  }

  /**
   * Soft deletes a job
   * 
   * @param {string} id - Job UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing delete
   * @returns {Promise<void>}
   */
  async softDelete(id, organizationId, userId) {
    const text = `
      UPDATE jobs
      SET 
        deleted_at = NOW(),
        deleted_by = $1
      WHERE id = $2
        AND organization_id = $3
        AND deleted_at IS NULL
    `;

    await query(
      text,
      [userId, id, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'jobs' }
    );
  }

  /**
   * Helper to convert camelCase to snake_case
   * @private
   */
  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export default JobRepository;
```

### Repository Standards Checklist

**EVERY repository MUST:**

- [ ] **Extend BaseRepository** for common operations
- [ ] **Use custom query() wrapper** (NEVER pool.query())
- [ ] **Include organizationId** in ALL WHERE clauses
- [ ] **Use parameterized queries** (NEVER string concatenation)
- [ ] **Implement soft deletes** (deleted_at column)
- [ ] **Return consistent data structures**
- [ ] **Handle NULL cases** properly
- [ ] **Log errors** with context

### Critical Database Rules

```javascript
// ❌ WRONG - Direct pool.query()
const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);

// ✅ CORRECT - Custom query wrapper
const result = await query(
  'SELECT * FROM jobs WHERE id = $1 AND organization_id = $2',
  [id, organizationId],
  organizationId,
  { operation: 'SELECT', table: 'jobs' }
);

// ❌ WRONG - Missing organizationId filter
SELECT * FROM jobs WHERE id = $1

// ✅ CORRECT - Always filter by organization
SELECT * FROM jobs WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL

// ❌ WRONG - String concatenation (SQL injection risk!)
const query = `SELECT * FROM jobs WHERE title = '${title}'`;

// ✅ CORRECT - Parameterized query
const query = 'SELECT * FROM jobs WHERE title = $1';
const values = [title];
```

---

## Controller Layer Standards

### Controller Function Structure (MANDATORY)

```javascript
import JobService from '../services/jobs/JobService.js';
import { handleError } from '../utils/errorHandler.js';

/**
 * Retrieves a job by ID
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
export async function getJob(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    // Delegate to service
    const job = await JobService.getById(id, organizationId);

    // Return resource-specific key (NOT "data")
    return res.status(200).json({
      success: true,
      job  // ✅ Resource-specific key
    });
  } catch (error) {
    next(error);  // Let error handler middleware handle it
  }
}

/**
 * Creates a new job
 */
export async function createJob(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    
    const job = await JobService.create(req.body, organizationId, userId);
    
    return res.status(201).json({
      success: true,
      job
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Updates a job
 */
export async function updateJob(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId, id: userId } = req.user;
    
    const job = await JobService.update(id, req.body, organizationId, userId);
    
    return res.status(200).json({
      success: true,
      job
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes a job
 */
export async function deleteJob(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId, id: userId } = req.user;
    
    await JobService.delete(id, organizationId, userId);
    
    return res.status(200).json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lists jobs with filtering
 */
export async function listJobs(req, res, next) {
  try {
    const { organizationId } = req.user;
    
    const result = await JobService.list(req.query, organizationId);
    
    // Return with resource-specific key
    return res.status(200).json({
      success: true,
      jobs: result.jobs,  // ✅ Plural resource key
      pagination: result.pagination,
      filters: result.filters
    });
  } catch (error) {
    next(error);
  }
}
```

### Controller Standards Checklist

**EVERY controller function MUST:**

- [ ] **Use try/catch** and pass errors to next()
- [ ] **Extract params** from req (params, query, body, user)
- [ ] **Call service layer** - NO business logic
- [ ] **Return consistent format** with resource-specific keys
- [ ] **Use appropriate HTTP status codes**
- [ ] **Have JSDoc comments**
- [ ] **Export as named functions** (not default)

### Response Format Rules

```javascript
// ❌ WRONG - Generic "data" key
return res.json({
  success: true,
  data: job
});

// ✅ CORRECT - Resource-specific key
return res.json({
  success: true,
  job: job
});

// ✅ CORRECT - Plural for lists
return res.json({
  success: true,
  jobs: result.jobs,
  pagination: { ... }
});

// ✅ CORRECT - Error response
return res.status(400).json({
  success: false,
  error: 'Validation failed',
  errorCode: 'VALIDATION_ERROR'
});
```

---

## Middleware Standards

### Middleware Function Structure

```javascript
/**
 * Middleware to check feature access
 * 
 * @param {string} featureCode - Feature code to check
 * @returns {Function} Express middleware
 */
export function checkFeature(featureCode) {
  return async (req, res, next) => {
    try {
      const { organizationId } = req.user;
      
      // Business logic in middleware is OK for cross-cutting concerns
      const hasAccess = await FeatureService.check(featureCode, organizationId);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: `Feature '${featureCode}' not available in your plan`,
          errorCode: 'FEATURE_NOT_AVAILABLE'
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

### Middleware Standards Checklist

- [ ] **Always call next()** or send response
- [ ] **Use try/catch** for async middleware
- [ ] **Pass errors to next(error)**
- [ ] **Document what the middleware does**
- [ ] **Keep middleware focused** (single responsibility)

---

## Error Handling

### Custom Error Classes

```javascript
// src/utils/errors.js

export class ApplicationError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message) {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message) {
    super(message, 403, 'FORBIDDEN');
  }
}
```

### Error Handling Pattern

```javascript
// In services
async create(data, organizationId, userId) {
  try {
    // Validate
    const validated = await this.createSchema.validateAsync(data);
    
    // Business logic
    if (someCondition) {
      throw new ValidationError('Invalid condition', { field: 'value' });
    }
    
    return await this.repository.create(validated);
  } catch (error) {
    // Log with context
    logger.error('Error in create', {
      error: error.message,
      organizationId,
      userId
    });
    
    // Re-throw to let error handler middleware handle it
    throw error;
  }
}
```

---

## Validation

### Joi Schema Patterns

```javascript
// String validation
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

// Email validation
email: Joi.string()
  .email()
  .required()
  .lowercase()
  .trim(),

// UUID validation
id: Joi.string()
  .uuid()
  .required(),

// Enum validation
status: Joi.string()
  .valid('draft', 'published', 'archived')
  .default('draft'),

// Array validation
skills: Joi.array()
  .items(Joi.string().trim())
  .min(1)
  .max(50)
  .optional(),

// Number validation with reference
salaryMin: Joi.number().min(0).optional(),
salaryMax: Joi.number()
  .min(Joi.ref('salaryMin'))
  .optional()
  .messages({
    'number.ref': 'Maximum salary must be greater than minimum salary'
  }),

// Conditional validation
phone: Joi.when('contactMethod', {
  is: 'phone',
  then: Joi.string().required(),
  otherwise: Joi.string().optional()
}),

// Object validation
address: Joi.object({
  street: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().length(2).required(),
  zip: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required()
}).optional()
```

---

## Logging

### Logger Usage

```javascript
import logger from '../utils/logger.js';

// Info level
logger.info('Job created', {
  jobId: job.id,
  organizationId,
  userId
});

// Error level
logger.error('Database error', {
  error: error.message,
  stack: error.stack,
  operation: 'INSERT',
  table: 'jobs'
});

// Warning level
logger.warn('Deprecated API used', {
  endpoint: '/api/old-endpoint',
  userId
});

// Security events
logger.logSecurityEvent('unauthorized_access', {
  userId,
  resource: '/api/admin',
  ip: req.ip
});
```

### Logging Rules

- [ ] **NEVER log sensitive data** (passwords, tokens, credit cards)
- [ ] **ALWAYS log context** (IDs, operation, user)
- [ ] **Log before throwing errors**
- [ ] **Use appropriate log levels**
- [ ] **Include timestamps** (automatic)

---

## DTO (Data Transfer Object) Standards

### DTO Purpose and Responsibility

**DTOs transform data between database format (snake_case) and API format (camelCase).**

```
Database (snake_case) → DTO → API Response (camelCase)
API Request (camelCase) → DTO → Database (snake_case)
```

### File Organization (MANDATORY)

**✅ CORRECT:** One DTO file per database table/entity

```
src/products/paylinq/dto/
├── payComponentDto.js       → pay_components table
├── runComponentDto.js       → payroll_run_components table  
├── payrollRunDto.js         → payroll_runs table
├── payrollRunTypeDto.js     → payroll_run_types table
├── allowanceDto.js          → allowances table
└── deductionDto.js          → deductions table
```

**❌ WRONG:** Multiple entities in one DTO file

```
src/products/paylinq/dto/
└── componentDto.js          → ❌ Mixes PayComponent + RunComponent
```

**Why This Matters:**
- **Single Responsibility Principle** - Each DTO maps ONE database table
- **Maintainability** - Easier to find and update specific mappings
- **Testing** - Clear which service needs which DTO
- **Explicit Dependencies** - Import names match entities exactly
- **Clean Architecture** - Proper separation of concerns

### DTO File Structure (MANDATORY)

Every DTO file MUST export these functions:

```javascript
/**
 * Pay Component DTO
 * Maps pay_components table between DB and API formats
 * 
 * @module products/paylinq/dto/payComponentDto
 */

/**
 * Map single component from database to API format
 * @param {Object} dbComponent - Component record from database (snake_case)
 * @returns {Object} Component in API format (camelCase)
 */
export function mapComponentDbToApi(dbComponent) {
  if (!dbComponent) return null;

  return {
    id: dbComponent.id,
    organizationId: dbComponent.organization_id,
    componentCode: dbComponent.component_code,
    componentName: dbComponent.component_name,
    componentType: dbComponent.component_type,
    description: dbComponent.description || null,
    calculationMetadata: dbComponent.calculation_metadata || {},
    isActive: dbComponent.is_active,
    isTaxable: dbComponent.is_taxable,
    displayOrder: dbComponent.display_order,
    createdBy: dbComponent.created_by,
    createdAt: dbComponent.created_at,
    updatedBy: dbComponent.updated_by,
    updatedAt: dbComponent.updated_at
  };
}

/**
 * Map array of components from database to API format
 * @param {Array} dbComponents - Array of component records
 * @returns {Array} Array of components in API format
 */
export function mapComponentsDbToApi(dbComponents) {
  if (!Array.isArray(dbComponents)) return [];
  return dbComponents.map(mapComponentDbToApi);
}

/**
 * Map component from API format to database format
 * @param {Object} apiData - Component data from API (camelCase)
 * @returns {Object} Component in database format (snake_case)
 */
export function mapComponentApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // Only include fields present in API data
  if (apiData.componentCode !== undefined) {
    dbData.component_code = apiData.componentCode;
  }
  if (apiData.componentName !== undefined) {
    dbData.component_name = apiData.componentName;
  }
  if (apiData.componentType !== undefined) {
    dbData.component_type = apiData.componentType;
  }
  if (apiData.description !== undefined) {
    dbData.description = apiData.description;
  }
  if (apiData.calculationMetadata !== undefined) {
    dbData.calculation_metadata = apiData.calculationMetadata;
  }
  if (apiData.isActive !== undefined) {
    dbData.is_active = apiData.isActive;
  }
  if (apiData.isTaxable !== undefined) {
    dbData.is_taxable = apiData.isTaxable;
  }
  if (apiData.displayOrder !== undefined) {
    dbData.display_order = apiData.displayOrder;
  }

  return dbData;
}
```

### Required DTO Functions

Every DTO file MUST export at minimum:

| Function | Purpose | Return Type |
|----------|---------|-------------|
| `map[Entity]DbToApi(db)` | Single record: DB → API | Object |
| `map[Entity]sDbToApi(dbs)` | Multiple records: DB → API | Array |
| `map[Entity]ApiToDb(api)` | Single record: API → DB | Object |

**Optional helper functions:**
- `map[Entity]ToSummary()` - For dropdowns/lists
- `map[Entity]ToDetails()` - For detailed views
- `group[Entity]sByField()` - For grouping logic

### Service Integration (MANDATORY)

Services MUST use DTOs for all CRUD operations:

```javascript
import { mapComponentDbToApi, mapComponentsDbToApi, mapComponentApiToDb } 
  from '../dto/payComponentDto.js';

class PayComponentService {
  async create(data, organizationId, userId) {
    // Validate API data
    const { error, value } = this.constructor.createSchema.validate(data);
    if (error) throw new ValidationError(error.details[0].message);

    // Transform: API → DB
    const dbData = mapComponentApiToDb(value);

    // Create in database
    const created = await this.repository.create(dbData, organizationId, userId);

    // Transform: DB → API
    return mapComponentDbToApi(created);
  }

  async getById(id, organizationId) {
    const component = await this.repository.findById(id, organizationId);
    if (!component) throw new NotFoundError('Component not found');

    // Transform: DB → API
    return mapComponentDbToApi(component);
  }

  async list(organizationId, filters = {}) {
    const components = await this.repository.findAll(organizationId, filters);

    // Transform: DB[] → API[]
    return mapComponentsDbToApi(components);
  }

  async update(id, data, organizationId, userId) {
    const { error, value } = this.constructor.updateSchema.validate(data);
    if (error) throw new ValidationError(error.details[0].message);

    // Transform: API → DB
    const dbData = mapComponentApiToDb(value);

    const updated = await this.repository.update(id, dbData, organizationId, userId);
    if (!updated) throw new NotFoundError('Component not found');

    // Transform: DB → API
    return mapComponentDbToApi(updated);
  }
}
```

### Naming Conventions

| Entity Name | DTO File | DB Table | Service | Repository |
|-------------|----------|----------|---------|------------|
| PayComponent | payComponentDto.js | pay_components | PayComponentService | PayComponentRepository |
| RunComponent | runComponentDto.js | payroll_run_components | RunComponentService | RunComponentRepository |
| PayrollRun | payrollRunDto.js | payroll_runs | PayrollRunService | PayrollRunRepository |
| Allowance | allowanceDto.js | allowances | AllowanceService | AllowanceRepository |

**Pattern:** `[camelCaseEntity]Dto.js` maps `[snake_case_table]` table

### When NOT to Use DTOs

Some methods return calculated values, not database records:

```javascript
// ✅ Does NOT need DTO - returns number
async calculateTotal(componentId, employeeId, organizationId) {
  const component = await this.repository.findById(componentId, organizationId);
  return component.rate * component.hours; // Returns number, not DB record
}

// ✅ Does NOT need DTO - returns validation object
async validateComponent(code, organizationId) {
  const component = await this.repository.findByCode(code, organizationId);
  return { isValid: !!component, errors: [] }; // Returns plain object
}

// ❌ NEEDS DTO - returns database record
async getComponentByCode(code, organizationId) {
  const component = await this.repository.findByCode(code, organizationId);
  return mapComponentDbToApi(component); // ✓ Transforms DB → API
}
```

### Acceptance Criteria

- ✅ One DTO file per database table/entity
- ✅ DTO file named `[entity]Dto.js` matches table `[entity]s` or `[entity_name]s`
- ✅ All CRUD service methods use DTO transformations
- ✅ DTOs export minimum 3 functions: `DbToApi`, `sDbToApi`, `ApiToDb`
- ✅ Services import DTOs, not repositories
- ✅ API responses always in camelCase (via DTO transformation)
- ✅ Database writes always in snake_case (via DTO transformation)
- ✅ No mixed casing in API responses or DB writes

---

## Common Patterns

### Pattern: Pagination

```javascript
// In service
async list(filters, organizationId) {
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
  const offset = (page - 1) * limit;
  
  const { items, total } = await this.repository.findAll(
    filters,
    { limit, offset },
    organizationId
  );
  
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  };
}
```

### Pattern: Bulk Operations with Transactions

```javascript
// In service
async bulkUpdate(ids, updateData, organizationId, userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const results = [];
    for (const id of ids) {
      const result = await this.update(id, updateData, organizationId, userId);
      results.push(result);
    }
    
    await client.query('COMMIT');
    
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Bulk update failed', { error: error.message, ids });
    throw error;
  } finally {
    client.release();
  }
}
```

### Pattern: Soft Delete

```javascript
// In repository
async softDelete(id, organizationId, userId) {
  const text = `
    UPDATE ${this.tableName}
    SET 
      deleted_at = NOW(),
      deleted_by = $1
    WHERE id = $2
      AND organization_id = $3
      AND deleted_at IS NULL
  `;
  
  await query(text, [userId, id, organizationId], organizationId, {
    operation: 'DELETE',
    table: this.tableName
  });
}
```

---

**Next:** [Frontend Standards](./FRONTEND_STANDARDS.md)
