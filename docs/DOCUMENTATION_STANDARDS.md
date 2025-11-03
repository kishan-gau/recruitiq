# Documentation Standards

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.0  
**Last Updated:** November 3, 2025

---

## Table of Contents

1. [JSDoc Standards](#jsdoc-standards)
2. [README Guidelines](#readme-guidelines)
3. [API Documentation](#api-documentation)
4. [Inline Comments](#inline-comments)
5. [Architecture Decision Records](#architecture-decision-records)

---

## JSDoc Standards

### Function Documentation

```javascript
/**
 * Creates a new job posting
 * 
 * @param {Object} data - Job data
 * @param {string} data.title - Job title (required, 5-255 chars)
 * @param {string} data.description - Job description (optional)
 * @param {string} data.status - Job status (default: 'draft')
 * @param {string} organizationId - Organization UUID
 * @param {string} userId - User UUID creating the job
 * 
 * @returns {Promise<Object>} Created job object
 * @throws {ValidationError} If data validation fails
 * @throws {UnauthorizedError} If user lacks permission
 * 
 * @example
 * const job = await createJob(
 *   {
 *     title: 'Senior Engineer',
 *     description: 'Looking for...',
 *     status: 'open'
 *   },
 *   'org-uuid',
 *   'user-uuid'
 * );
 */
async function createJob(data, organizationId, userId) {
  // Implementation
}

/**
 * Finds a job by ID with tenant isolation
 * 
 * @param {string} jobId - Job UUID
 * @param {string} organizationId - Organization UUID for tenant isolation
 * 
 * @returns {Promise<Object|null>} Job object or null if not found
 * 
 * @example
 * const job = await findById('job-uuid', 'org-uuid');
 * if (!job) {
 *   throw new NotFoundError('Job not found');
 * }
 */
async function findById(jobId, organizationId) {
  // Implementation
}
```

### Class Documentation

```javascript
/**
 * Service for managing job postings
 * 
 * Handles business logic for job CRUD operations, including
 * validation, authorization, and tenant isolation.
 * 
 * @class JobService
 * 
 * @example
 * const jobService = new JobService();
 * const job = await jobService.create(data, orgId, userId);
 */
class JobService {
  /**
   * Creates a new JobService instance
   * 
   * @param {JobRepository} [repository=null] - Repository instance (for testing)
   */
  constructor(repository = null) {
    this.repository = repository || new JobRepository();
  }

  /**
   * Joi validation schema for job creation
   * 
   * @static
   * @returns {Joi.ObjectSchema} Validation schema
   */
  static get createSchema() {
    return Joi.object({
      title: Joi.string().min(5).max(255).required(),
      description: Joi.string().max(10000).optional(),
      status: Joi.string().valid('draft', 'open', 'closed').default('draft')
    });
  }

  /**
   * Creates a new job posting
   * 
   * @param {Object} data - Job data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID creating the job
   * @returns {Promise<Object>} Created job
   * @throws {ValidationError} If validation fails
   */
  async create(data, organizationId, userId) {
    // Implementation
  }
}
```

### Type Definitions

```javascript
/**
 * @typedef {Object} Job
 * @property {string} id - Job UUID
 * @property {string} organizationId - Organization UUID
 * @property {string} title - Job title
 * @property {string} [description] - Job description
 * @property {('draft'|'open'|'closed'|'archived')} status - Job status
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {string} createdBy - User UUID who created the job
 * @property {string} [updatedBy] - User UUID who last updated the job
 * @property {Date} [deletedAt] - Soft delete timestamp
 */

/**
 * @typedef {Object} PaginationParams
 * @property {number} page - Page number (1-indexed)
 * @property {number} limit - Items per page
 */

/**
 * @typedef {Object} PaginationResult
 * @property {number} page - Current page
 * @property {number} limit - Items per page
 * @property {number} total - Total number of items
 * @property {number} totalPages - Total number of pages
 * @property {boolean} hasNext - Whether there are more pages
 * @property {boolean} hasPrev - Whether there are previous pages
 */

/**
 * Lists jobs with pagination
 * 
 * @param {PaginationParams} params - Pagination parameters
 * @param {string} organizationId - Organization UUID
 * @returns {Promise<{jobs: Job[], pagination: PaginationResult}>}
 */
async function listJobs(params, organizationId) {
  // Implementation
}
```

### Module Documentation

```javascript
/**
 * @module services/JobService
 * @description Job management service handling business logic
 * 
 * This service manages all job-related operations including:
 * - Creating new job postings
 * - Updating existing jobs
 * - Soft deleting jobs
 * - Searching and filtering jobs
 * 
 * All operations enforce tenant isolation and require organization_id.
 * 
 * @requires ../repositories/JobRepository
 * @requires ../utils/validation
 * @requires ../utils/errors
 */

import JobRepository from '../repositories/JobRepository.js';
import { validate } from '../utils/validation.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
```

---

## README Guidelines

### Project README Template

```markdown
# RecruitIQ

> Recruitment management system for modern hiring teams

## Overview

Brief description of what the project does and its main features.

## Features

- 🎯 Feature 1: Description
- 🔒 Feature 2: Description
- ⚡ Feature 3: Description
- 📊 Feature 4: Description

## Tech Stack

**Backend:**
- Node.js 18+
- Express.js
- PostgreSQL 15+
- JWT Authentication

**Frontend:**
- React 18+
- TailwindCSS
- Vite
- React Router

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 15 or higher
- npm or yarn

## Installation

### Backend Setup

```bash
# Clone repository
git clone https://github.com/yourorg/recruitiq.git

# Navigate to backend
cd recruitiq/backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your settings

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### Frontend Setup

```bash
# Navigate to frontend
cd recruitiq/portal

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run dev
```

## Configuration

### Environment Variables

**Backend (.env):**
```
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recruitiq
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_min_32_chars
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:3001/api
```

## Usage

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- JobService.test.js
```

### Building for Production

```bash
# Backend
npm run build

# Frontend
npm run build
```

## API Documentation

API documentation is available at `/api-docs` when running the development server.

See [API Documentation](./docs/API_STANDARDS.md) for detailed endpoint information.

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   ├── tests/
│   └── package.json
├── portal/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   └── utils/
│   └── package.json
└── docs/
```

## Contributing

Please read [CODING_STANDARDS.md](./CODING_STANDARDS.md) before contributing.

### Development Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes following coding standards
3. Write tests for new functionality
4. Ensure all tests pass: `npm test`
5. Commit with conventional commit format: `feat(scope): description`
6. Push and create a Pull Request

## License

MIT License - see [LICENSE](./LICENSE) file for details

## Support

For support, email support@recruitiq.com or open an issue.

## Authors

- **Your Team** - *Initial work*

## Acknowledgments

- List any acknowledgments
```

### Module README Template

```markdown
# Jobs Module

Job management functionality for RecruitIQ.

## Overview

This module handles all job-related operations including creation, updating, searching, and deletion of job postings.

## Components

### Service Layer (`JobService.js`)
- Handles business logic
- Performs validation
- Manages authorization

### Repository Layer (`JobRepository.js`)
- Data access layer
- Database queries with tenant isolation
- CRUD operations

### Controller Layer (`jobController.js`)
- HTTP request handling
- Response formatting
- Delegates to service layer

## Usage

```javascript
import JobService from './services/JobService.js';

const jobService = new JobService();

// Create job
const job = await jobService.create(
  {
    title: 'Senior Engineer',
    description: 'We are looking for...',
    status: 'open'
  },
  organizationId,
  userId
);

// Get job
const job = await jobService.getById(jobId, organizationId);

// List jobs
const result = await jobService.list(
  { page: 1, limit: 20 },
  organizationId
);
```

## API Endpoints

```
GET    /api/jobs           - List all jobs
GET    /api/jobs/:id       - Get specific job
POST   /api/jobs           - Create new job
PUT    /api/jobs/:id       - Update job
DELETE /api/jobs/:id       - Delete job (soft delete)
```

## Database Schema

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by UUID NOT NULL,
  updated_by UUID,
  deleted_at TIMESTAMP
);
```

## Tests

Run tests:
```bash
npm test -- JobService.test.js
```

## Future Enhancements

- [ ] Add job templates
- [ ] Add bulk job import
- [ ] Add advanced search filters
```

---

## API Documentation

### Endpoint Documentation Format

```javascript
/**
 * @api {get} /api/jobs List Jobs
 * @apiName ListJobs
 * @apiGroup Jobs
 * @apiVersion 1.0.0
 * 
 * @apiDescription Retrieves a paginated list of jobs for the authenticated user's organization
 * 
 * @apiHeader {String} Authorization Bearer token (JWT)
 * 
 * @apiParam (Query) {Number} [page=1] Page number (1-indexed)
 * @apiParam (Query) {Number} [limit=20] Items per page (max 100)
 * @apiParam (Query) {String} [status] Filter by status (draft|open|closed|archived)
 * @apiParam (Query) {String} [search] Search in title, description, department
 * @apiParam (Query) {String} [sortBy=createdAt] Sort field
 * @apiParam (Query) {String} [sortOrder=desc] Sort order (asc|desc)
 * 
 * @apiSuccess {Boolean} success Success indicator
 * @apiSuccess {Object[]} jobs Array of job objects
 * @apiSuccess {String} jobs.id Job UUID
 * @apiSuccess {String} jobs.title Job title
 * @apiSuccess {String} jobs.description Job description
 * @apiSuccess {String} jobs.status Job status
 * @apiSuccess {Date} jobs.createdAt Creation timestamp
 * @apiSuccess {Object} pagination Pagination information
 * @apiSuccess {Number} pagination.page Current page
 * @apiSuccess {Number} pagination.limit Items per page
 * @apiSuccess {Number} pagination.total Total items
 * @apiSuccess {Number} pagination.totalPages Total pages
 * @apiSuccess {Boolean} pagination.hasNext Has next page
 * @apiSuccess {Boolean} pagination.hasPrev Has previous page
 * 
 * @apiSuccessExample {json} Success Response:
 *   HTTP/1.1 200 OK
 *   {
 *     "success": true,
 *     "jobs": [
 *       {
 *         "id": "123e4567-e89b-12d3-a456-426614174000",
 *         "title": "Senior Software Engineer",
 *         "description": "We are looking for...",
 *         "status": "open",
 *         "createdAt": "2025-01-03T10:30:00Z"
 *       }
 *     ],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 20,
 *       "total": 45,
 *       "totalPages": 3,
 *       "hasNext": true,
 *       "hasPrev": false
 *     }
 *   }
 * 
 * @apiError (401) Unauthorized Authentication required
 * @apiError (500) InternalServerError Server error
 * 
 * @apiErrorExample {json} Error Response:
 *   HTTP/1.1 401 Unauthorized
 *   {
 *     "success": false,
 *     "error": "Authentication required",
 *     "errorCode": "UNAUTHORIZED"
 *   }
 */
export async function listJobs(req, res, next) {
  // Implementation
}
```

---

## Inline Comments

### When to Add Comments

```javascript
// ✅ GOOD: Explain WHY, not WHAT
// Calculate expiry with 24-hour buffer to account for timezone differences
const expiryDate = new Date(Date.now() + 25 * 60 * 60 * 1000);

// Use custom query wrapper to enforce tenant isolation and log queries
const result = await query(sql, params, organizationId, { operation: 'SELECT' });

// ✅ GOOD: Document complex logic
// Convert nested application data into flat structure for CSV export
// while preserving relationships through ID references
const flattenedData = applications.map(app => ({
  applicationId: app.id,
  jobTitle: app.job.title,
  candidateName: `${app.candidate.firstName} ${app.candidate.lastName}`,
  // ... more fields
}));

// ✅ GOOD: Explain non-obvious decisions
// Using ILIKE instead of LIKE for case-insensitive search
// Note: ILIKE is PostgreSQL-specific
const query = 'SELECT * FROM jobs WHERE title ILIKE $1';

// ❌ BAD: Stating the obvious
// Set status to open
job.status = 'open';

// ❌ BAD: Commented-out code
// const oldFunction = () => { ... };  // Remove instead!

// ❌ BAD: TODO without context
// TODO: fix this
```

### Comment Format

```javascript
// Single-line comment with space after //

/*
 * Multi-line comment
 * with proper formatting
 */

/**
 * JSDoc comment for functions, classes, types
 */
```

### Special Comments

```javascript
// TODO: Add pagination support (ticket #123)
// FIXME: Memory leak in event listener cleanup
// HACK: Workaround for PostgreSQL UUID generation bug
// NOTE: This function is called by external webhook
// WARNING: Changing this will break backward compatibility
```

---

## Architecture Decision Records

### ADR Template

```markdown
# ADR 001: Use Custom Query Wrapper for Database Access

## Status
Accepted

## Context
We need a standardized way to:
- Enforce tenant isolation across all database queries
- Monitor query performance
- Detect potential SQL injection attempts
- Log all database operations for auditing

Direct use of `pool.query()` throughout the codebase makes it difficult to enforce these requirements consistently.

## Decision
We will create a custom query wrapper that all database access must use instead of `pool.query()` directly.

The wrapper will:
1. Validate that queries include `organization_id` filtering
2. Monitor query execution time
3. Detect suspicious SQL patterns
4. Log all operations with context
5. Standardize error handling

## Consequences

### Positive
- Enforces tenant isolation automatically
- Centralized logging and monitoring
- Easier to add security checks
- Consistent error handling
- Better debugging capabilities

### Negative
- Additional abstraction layer
- Slight performance overhead
- Need to refactor existing code
- Must train team on new pattern

### Neutral
- Requires updating all database access code
- Need to maintain wrapper alongside PostgreSQL updates

## Implementation
See `src/database/query.js` for implementation.

## Alternatives Considered
1. **ORM (e.g., Sequelize, TypeORM)** - Too heavyweight, less control
2. **Query Builder (e.g., Knex)** - Still requires manual tenant filtering
3. **Database-level Row-Level Security** - PostgreSQL-specific, harder to debug

## References
- [BACKEND_STANDARDS.md](./BACKEND_STANDARDS.md#custom-query-wrapper)
- [DATABASE_STANDARDS.md](./DATABASE_STANDARDS.md#custom-query-wrapper)
- Original discussion: Issue #42
```

### ADR File Naming

```
docs/adr/
  001-custom-query-wrapper.md
  002-jwt-authentication.md
  003-soft-delete-pattern.md
  004-api-versioning-strategy.md
```

---

**Next:** [Performance Standards](./PERFORMANCE_STANDARDS.md)
