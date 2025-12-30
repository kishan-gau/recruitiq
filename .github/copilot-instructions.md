# GitHub Copilot Instructions for RecruitIQ

## Project Overview

RecruitIQ is a **multi-product SaaS platform** with a monorepo structure using pnpm workspaces. The system features:
- **1 shared backend** (Node.js/Express with PostgreSQL) serving multiple products via a dynamic product loading system
- **1 unified web app** (`apps/web`) - Single React frontend containing all product modules:
  - **RecruitIQ** - Recruitment management (`/recruitment` routes)
  - **Nexus** - HRIS/workspace management (`/hris` routes)
  - **PayLinQ** - Payroll management (`/payroll` routes)
  - **ScheduleHub** - Scheduling and time tracking (`/scheduling` routes)
- **Multi-tenant architecture** with organization-level data isolation enforced at the database layer

**Note:** Individual apps (apps/nexus, apps/paylinq, apps/portal, apps/recruitiq) are **legacy/deprecated**. All new development should use the unified `apps/web` application.

## Critical Architecture Patterns

### 1. Backend Layer Structure (MANDATORY)

All backend code MUST follow this strict 4-layer architecture:

```
Routes → Controllers → Services → Repositories → Database
```

**NEVER skip layers.** Each layer has ONE responsibility:

- **Routes** (`backend/src/routes/`, `backend/src/products/*/routes/`): Define endpoints, apply middleware only
- **Controllers** (`backend/src/controllers/`, `backend/src/products/*/controllers/`): Parse req/res, call services, return HTTP responses
- **Services** (`backend/src/services/`, `backend/src/products/*/services/`): Business logic, validation (using Joi schemas), orchestration
- **Repositories** (`backend/src/repositories/`, `backend/src/products/*/repositories/`): Data access with MANDATORY `organizationId` filtering

### 2. Dynamic Product Loading System

Products are dynamically loaded at runtime via `backend/src/products/core/ProductManager.js`:

```javascript
// Each product exports this structure (backend/src/products/{product}/index.js)
export default {
  config: { name, version, description, features, slug },
  routes: router,           // Express router mounted at /api/products/{slug}
  middleware: [],          // Product-specific middleware
  hooks: { onLoad, onUnload, onStartup, onShutdown }
};
```

**Available Products:**
- `paylinq` - Payroll management with multi-currency support (slug: `paylinq`)
- `nexus` - HRIS/workspace management (slug: `nexus`)
- `schedulehub` - Scheduling and time tracking (slug: `schedulehub`)
- `recruitiq` - Recruitment management (slug: `recruitiq`)

**⚠️ CRITICAL: Product API Paths**

All product routes MUST be accessed via `/api/products/{slug}`:

```javascript
// ✅ CORRECT: Product API paths
GET /api/products/nexus/locations           // Nexus locations
GET /api/products/paylinq/worker-types      // PayLinQ worker types
GET /api/products/schedulehub/stations      // ScheduleHub stations

// ❌ WRONG: Missing /products prefix (will return 404!)
GET /api/nexus/locations                    // Missing /products
GET /api/paylinq/worker-types               // Missing /products
```

**Frontend API Services:**
```typescript
// ✅ CORRECT: Include /products in API base path
const API_BASE = '/api/products/nexus/locations';
const API_BASE = '/api/products/paylinq/worker-types';

// ❌ WRONG: Direct product path
const API_BASE = '/api/nexus/locations';    // 404 error!
```

**Core Platform Routes (no /products prefix):**
- `/api/auth/*` - Authentication
- `/api/organizations` - Organization management
- `/api/admin/products` - Product metadata management

### 3. Multi-Tenant Data Isolation (CRITICAL SECURITY)

**EVERY database query MUST include `organization_id` filter:**

```javascript
// ❌ WRONG - Security vulnerability!
const result = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);

// ✅ CORRECT - Enforces tenant isolation
const result = await query(
  'SELECT * FROM jobs WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
  [jobId, organizationId],
  organizationId,
  { operation: 'SELECT', table: 'jobs' }
);
```

**ALWAYS use the custom `query()` wrapper from `backend/src/config/database.js`, NEVER `pool.query()` directly.**

### 4. Service Pattern with Dependency Injection

**MANDATORY:** All services MUST export the class (not singleton instances) and support constructor injection:

```javascript
// ✅ CORRECT - Testable with DI
class JobService {
  constructor(repository = null) {
    this.repository = repository || new JobRepository();
  }
  
  static createSchema = Joi.object({...});  // Static Joi schemas
  
  async create(data, organizationId, userId) {
    // 1. VALIDATE FIRST (fail fast)
    const validated = await JobService.createSchema.validateAsync(data);
    // 2. Business logic
    // 3. Call repository
  }
}
export default JobService;  // Export class, not instance

// ❌ WRONG - Anti-pattern, not testable
export default new JobService();
```

### 5. ES Modules Configuration

**CRITICAL:** This project uses ES modules exclusively:

```javascript
// ✅ CORRECT - ES modules with .js extensions
import { query } from '../../../config/database.js';  // Extension required!
import JobService from '../../services/JobService.js';

// ✅ CORRECT - Jest imports in tests
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ❌ WRONG - CommonJS syntax
const JobService = require('../services/JobService');  // Never use this!
```

**Test files must:**
- Import all Jest globals from `@jest/globals`
- Include `.js` extensions in all imports
- Use ES module mocking: `jest.mock('path/to/module.js', () => ({...}))`

## Development Workflows

### Running the Monorepo

```bash
# Install dependencies (uses pnpm workspaces)
pnpm install

# Run all apps in parallel
pnpm dev

# Run specific apps
pnpm dev:backend    # Backend API (port 3001)
pnpm dev:web        # Unified Web App (port 5177) - all product modules

# All development should use the unified web app (legacy apps have been removed)


# Build all apps
pnpm build
```

### Backend Testing

```bash
cd backend

# Run all tests with coverage
npm test

# Run specific test file
npm test -- workerTypeService.test.js

# Run tests in watch mode
npm test:watch

# Run integration tests only
npm test:integration

# Run security/validation tests
npm test:security
npm test:validation
```

**Test Coverage Requirements:**
- Overall: 80% minimum
- Services: 90% minimum  
- Repositories: 85% minimum
- Controllers: 75% minimum

### Pre-Implementation Test Verification (MANDATORY)

**Before writing ANY test for a service/repository/controller:**

1. **Read the actual source file** to verify method names and signatures
2. **NEVER assume** method names follow generic patterns (e.g., `create()`, `list()`, `getById()`)
3. **Use grep to extract all methods:**
   ```bash
   grep "async \w+\(" src/products/paylinq/services/AllowanceService.js
   ```
4. **Verify export pattern** - if service exports singleton, STOP and refactor to class export first
5. **Document verified method names** before writing tests

This prevents `TypeError: service.methodName is not a function` errors.

## Project-Specific Conventions

### 1. Naming Conventions

```
Backend (snake_case in DB, camelCase in JS):
- Services:     JobService.js (PascalCase + Service)
- Repositories: JobRepository.js (PascalCase + Repository)
- Controllers:  jobController.js (camelCase + Controller)
- Routes:       jobs.js (plural, lowercase)
- Database:     job_postings table, created_at column

Frontend (camelCase everywhere):
- Components:   JobCard.jsx (PascalCase)
- Utilities:    formatDate.js (camelCase)
- Contexts:     AuthContext.jsx (PascalCase + Context)
```

### 2. API Response Format (CRITICAL)

**ALWAYS use resource-specific keys, NEVER generic "data":**

```javascript
// ✅ CORRECT - Resource-specific key
res.json({ success: true, job: jobData });
res.json({ success: true, jobs: jobList, pagination: {...} });

// ❌ WRONG - Generic key
res.json({ success: true, data: jobData });
```

### 3. Soft Deletes & Audit Columns

All tables have these columns - ALWAYS use them:

```javascript
// Soft delete (never hard delete)
UPDATE jobs SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2

// Filter out deleted records
WHERE deleted_at IS NULL

// Audit trail
created_at, updated_at, deleted_at
created_by, updated_by, deleted_by
```

### 4. DTOs for Database Transformation

Use DTO functions to map between snake_case (DB) and camelCase (API):

```javascript
// backend/src/products/paylinq/dto/workerTypeDto.js
export const mapTemplateDbToApi = (dbTemplate) => ({
  id: dbTemplate.id,
  name: dbTemplate.name,
  defaultPayFrequency: dbTemplate.default_pay_frequency,  // snake_case → camelCase
  benefitsEligible: dbTemplate.benefits_eligible,
  // ...
});
```

### 5. Validation with Joi

All services MUST validate inputs using static Joi schemas:

```javascript
class JobService {
  static createSchema = Joi.object({
    title: Joi.string().required().min(3).max(200),
    status: Joi.string().valid('draft', 'open', 'closed'),
    organizationId: Joi.string().uuid().required(),
  });
  
  async create(data, organizationId, userId) {
    // ALWAYS validate FIRST (fail fast principle)
    const validated = await JobService.createSchema.validateAsync(data, {
      abortEarly: false,
      stripUnknown: true
    });
    // ... rest of logic
  }
}
```

## Integration Points

### 1. Frontend-Backend Communication

Frontends use `packages/api-client` for all API calls:

```javascript
// apps/paylinq/src/services/api.js
import { apiClient } from '@recruitiq/api-client';

// ✅ CORRECT: Use full product path
export const getWorkerTypes = () => 
  apiClient.get('/api/products/paylinq/worker-types');

// For TanStack Query services, always include /products prefix
const API_BASE = '/api/products/paylinq/worker-types';  // ✅ CORRECT
const API_BASE = '/api/paylinq/worker-types';           // ❌ WRONG - 404!
```

### 2. Shared Packages

```
packages/
  api-client/   - Axios-based API client with auth interceptors
  auth/         - Shared auth utilities and JWT handling
  types/        - TypeScript type definitions
  ui/           - Shared React components (buttons, forms, etc.)
  utils/        - Shared utility functions
```

### 3. Authentication Flow

```javascript
// JWT tokens stored in cookies (httpOnly, secure, sameSite)
// Access tokens: 15 minutes (industry standard)
// Refresh tokens: 7 days with automatic rotation

// Backend middleware: authenticate (backend/src/middleware/auth.js)
// Frontend context: AuthProvider (apps/*/src/contexts/AuthContext.jsx)
```

## Standards Documentation (MANDATORY READING)

**ALL code MUST comply 100% with these standards:**

- **[CODING_STANDARDS.md](../CODING_STANDARDS.md)** - Start here! Overview of all standards
- **[BACKEND_STANDARDS.md](../docs/BACKEND_STANDARDS.md)** - Layer architecture, services, repositories, controllers
- **[FRONTEND_STANDARDS.md](../docs/FRONTEND_STANDARDS.md)** - React components, hooks, state management
- **[TESTING_STANDARDS.md](../docs/TESTING_STANDARDS.md)** - Unit/integration/E2E testing patterns ⭐ **CRITICAL FOR TEST CREATION**
- **[DATABASE_STANDARDS.md](../docs/DATABASE_STANDARDS.md)** - Query patterns, migrations, indexing
- **[API_STANDARDS.md](../docs/API_STANDARDS.md)** - REST conventions, response format, error handling
- **[SECURITY_STANDARDS.md](../docs/SECURITY_STANDARDS.md)** - Authentication, authorization, tenant isolation
- **[GIT_STANDARDS.md](../docs/GIT_STANDARDS.md)** - Commit messages, branching, PR process

**Before writing ANY code:**
1. Read the relevant standards document
2. Follow the exact patterns shown in examples
3. Verify compliance before submitting

## Common Pitfalls to Avoid

1. **❌ Using `pool.query()` directly** → Use custom `query()` wrapper from `backend/src/config/database.js`
2. **❌ Missing `organizationId` filter** → EVERY query must filter by org (security critical!)
3. **❌ Exporting singleton services** → Export classes for testability (DI pattern)
4. **❌ Missing `.js` extensions in imports** → Required for ES modules
5. **❌ Using generic "data" key in API responses** → Use resource-specific keys (e.g., "job", "jobs")
6. **❌ Skipping validation** → ALWAYS validate with Joi schemas at service layer
7. **❌ Hard deletes** → Use soft deletes (`deleted_at` column)
8. **❌ Business logic in controllers** → Move to services
9. **❌ HTTP handling in services** → Services return data, controllers handle req/res
10. **❌ Assuming method names without verification** → Read source code first before writing tests
11. **❌ Wrong product API paths** → Use `/api/products/{slug}/*` not `/api/{slug}/*` (will 404!)

## Key Files Reference

**Backend Architecture:**
- `backend/src/server.js` - Main Express app setup
- `backend/src/config/database.js` - Custom query wrapper (use this!)
- `backend/src/products/core/ProductManager.js` - Dynamic product loading
- `backend/src/middleware/auth.js` - Authentication middleware
- `backend/jest.config.js` - ES modules test configuration

**Example Implementations:**
- `backend/src/products/paylinq/services/workerTypeService.js` - Service with DI
- `backend/tests/products/paylinq/services/workerTypeService.test.js` - Test patterns
- `backend/src/repositories/BaseRepository.js` - Repository base class
- `apps/portal/src/main.jsx` - Frontend app entry point with React Query

**Product Structure Example:**
```
backend/src/products/paylinq/
  ├── index.js              # Product module export
  ├── routes/               # Product routes
  ├── controllers/          # HTTP handlers
  ├── services/             # Business logic
  ├── repositories/         # Data access
  ├── dto/                  # Data transformation
  ├── middleware/           # Product-specific middleware
  └── utils/                # Utilities
```

## When Working On...

**New Service/Repository:**
1. Verify export pattern (class, not singleton)
2. Add constructor with DI support
3. Create static Joi schemas for validation
4. ALWAYS include organizationId parameter
5. Write tests with 90%+ coverage

**New API Endpoint:**
1. Define route in `routes/` or `products/*/routes/`
2. Create controller in `controllers/` (HTTP only)
3. Implement service (business logic + validation)
4. Create repository (data access)
5. Use resource-specific response keys
6. Write integration tests

**New Test File:**
1. Verify actual method names in source first (grep)
2. Import Jest globals from `@jest/globals`
3. Mock dependencies using ES module syntax
4. Test with injected mock repositories/database
5. Follow AAA pattern (Arrange, Act, Assert)
6. Aim for 90%+ coverage for services

**Frontend Component:**
1. Use functional components with hooks
2. Follow hook order: useContext, useState, useReducer, useRef, useMemo, useCallback, useEffect
3. Use TailwindCSS for styling
4. Import from shared packages: `@recruitiq/ui`, `@recruitiq/utils`
5. Use AuthContext for authentication
6. Use React Query for API calls

---

**Remember:** When in doubt, check the standards documentation! These standards are mandatory and enforced in code reviews.
