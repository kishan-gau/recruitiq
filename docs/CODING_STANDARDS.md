# RecruitIQ Coding Standards & Best Practices

**Version:** 1.0  
**Date:** November 3, 2025  
**Status:** Mandatory for all engineers  

## Purpose

This document establishes the coding standards, architectural patterns, and best practices for the RecruitIQ project. **Every engineer must follow these standards** to ensure code quality, maintainability, and consistency across the codebase.

> **⚠️ CRITICAL:** All code reviews must verify compliance with these standards. Non-compliant code will be rejected.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Standards](#backend-standards)
3. [Frontend Standards](#frontend-standards)
4. [Testing Standards](#testing-standards)
5. [Security Standards](#security-standards)
6. [Database Standards](#database-standards)
7. [API Standards](#api-standards)
8. [Git & Version Control](#git--version-control)
9. [Documentation Standards](#documentation-standards)
10. [Performance Standards](#performance-standards)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│              (React + Vite + TailwindCSS)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTPS / REST API
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                      API Gateway Layer                       │
│         (Express.js + Authentication + Rate Limiting)        │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│  Routes   │  │Middleware │  │Controllers│
│  Layer    │  │  Layer    │  │  Layer    │
└─────┬─────┘  └───────────┘  └─────┬─────┘
      │                              │
      │         ┌────────────────────┘
      │         │
      ▼         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│           (Business Logic + Validation)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                          │
│          (Data Access + Tenant Isolation)                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                             │
│              (PostgreSQL + Redis Cache)                      │
└─────────────────────────────────────────────────────────────┘
```

### Core Architectural Principles

#### 1. Separation of Concerns (MANDATORY)

**Each layer has a SINGLE responsibility:**

```javascript
// ❌ BAD: Controller doing business logic
export async function createJob(req, res) {
  const { title, description } = req.body;
  
  // Business logic in controller - WRONG!
  if (!title || title.length < 5) {
    return res.status(400).json({ error: 'Invalid title' });
  }
  
  const result = await pool.query('INSERT INTO jobs...');
  res.json(result);
}

// ✅ GOOD: Controller delegates to service
export async function createJob(req, res) {
  try {
    const job = await JobService.create(
      req.body,
      req.user.organizationId,
      req.user.id
    );
    
    return res.status(201).json({
      success: true,
      job
    });
  } catch (error) {
    next(error);
  }
}
```

#### 2. Dependency Injection

**Always inject dependencies, never import directly in business logic:**

```javascript
// ❌ BAD: Hard-coded dependencies
class JobService {
  static async create(data) {
    const repo = new JobRepository(); // Hard-coded!
    return repo.create(data);
  }
}

// ✅ GOOD: Dependency injection
class JobService {
  constructor(repository = new JobRepository()) {
    this.repository = repository;
  }
  
  async create(data, organizationId, userId) {
    // Validate with Joi
    const validated = await this.constructor.createSchema.validateAsync(data);
    
    // Use injected repository
    return this.repository.create({
      ...validated,
      organizationId,
      createdBy: userId
    });
  }
}
```

#### 3. Fail Fast Principle

**Validate inputs at the earliest possible point:**

```javascript
// ✅ GOOD: Validate in service layer FIRST
static async create(data, organizationId, userId) {
  // 1. Validate input IMMEDIATELY
  const validated = await this.createSchema.validateAsync(data);
  
  // 2. Check business rules
  if (!organizationId) {
    throw new ValidationError('organizationId is required');
  }
  
  // 3. Proceed with business logic
  return this.repository.create({
    ...validated,
    organizationId,
    createdBy: userId
  });
}
```

#### 4. Immutability

**Never mutate input parameters:**

```javascript
// ❌ BAD: Mutating input
function updateCandidate(candidate) {
  candidate.updatedAt = new Date(); // Mutation!
  return candidate;
}

// ✅ GOOD: Return new object
function updateCandidate(candidate) {
  return {
    ...candidate,
    updatedAt: new Date()
  };
}
```

---

## Backend Standards

See [BACKEND_STANDARDS.md](./docs/BACKEND_STANDARDS.md) for complete backend development guidelines.

### Quick Reference

**Layer Responsibilities:**
- **Routes:** Request routing only
- **Controllers:** HTTP handling only
- **Services:** Business logic + validation
- **Repositories:** Data access + tenant isolation
- **Middleware:** Cross-cutting concerns (auth, logging, etc.)

**File Naming:**
- Services: `JobService.js` (PascalCase + Service suffix)
- Repositories: `JobRepository.js` (PascalCase + Repository suffix)
- Controllers: `jobController.refactored.js` (camelCase + Controller suffix)
- Routes: `jobs.js` (plural, lowercase)

---

## Frontend Standards

See [FRONTEND_STANDARDS.md](./docs/FRONTEND_STANDARDS.md) for complete frontend development guidelines.

### Quick Reference

**Component Structure:**
- Use functional components with hooks
- One component per file
- Co-locate styles with components

**State Management:**
- Local state: `useState`
- Complex state: `useReducer`
- Global state: Context API or state management library

---

## Testing Standards

See [TESTING_STANDARDS.md](./docs/TESTING_STANDARDS.md) for complete testing guidelines.

### Quick Reference

**Test Coverage Requirements:**
- **Unit Tests:** 80% minimum coverage
- **Integration Tests:** All API endpoints
- **E2E Tests:** Critical user journeys

**Test Structure:**
```javascript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = { ... };
      
      // Act
      const result = await service.method(input);
      
      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

---

## Security Standards

See [SECURITY_STANDARDS.md](./docs/SECURITY_STANDARDS.md) for complete security guidelines.

### Critical Security Rules

1. **NEVER trust user input** - Always validate and sanitize
2. **ALWAYS use parameterized queries** - Prevent SQL injection
3. **ALWAYS filter by organizationId** - Enforce tenant isolation
4. **NEVER expose sensitive data** - Redact in logs and responses
5. **ALWAYS use HTTPS** - No exceptions in production

---

## Database Standards

See [DATABASE_STANDARDS.md](./docs/DATABASE_STANDARDS.md) for complete database guidelines.

### Critical Database Rules

1. **ALWAYS use the custom query wrapper** from `src/config/database.js`
2. **NEVER use `pool.query()` directly** - Use `query()` wrapper
3. **ALWAYS include organizationId** in WHERE clauses for tenant data
4. **ALWAYS use transactions** for multi-step operations
5. **NEVER store sensitive data unencrypted**

---

## API Standards

See [API_STANDARDS.md](./docs/API_STANDARDS.md) for complete API guidelines.

### API Response Format (MANDATORY)

**Success Response:**
```javascript
{
  "success": true,
  "job": { ... }  // Resource-specific key (NOT "data")
}
```

**Error Response:**
```javascript
{
  "success": false,
  "error": "User-friendly message",
  "errorCode": "VALIDATION_ERROR",
  "errorId": "ERR-1762192388616-dxusli475"
}
```

---

## Git & Version Control

See [GIT_STANDARDS.md](./docs/GIT_STANDARDS.md) for complete git guidelines.

### Commit Message Format (MANDATORY)

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Example:**
```
feat(jobs): Add bulk update endpoint

- Implement JobService.bulkUpdate method
- Add validation for bulk operations
- Include transaction support

Closes #123
```

---

## Documentation Standards

See [DOCUMENTATION_STANDARDS.md](./docs/DOCUMENTATION_STANDARDS.md) for complete documentation guidelines.

### Code Documentation (MANDATORY)

**JSDoc for all public methods:**
```javascript
/**
 * Creates a new job posting
 * 
 * @param {Object} data - Job data
 * @param {string} data.title - Job title (required)
 * @param {string} data.description - Job description (required)
 * @param {string} organizationId - Organization UUID
 * @param {string} userId - User UUID who created the job
 * @returns {Promise<Object>} Created job object
 * @throws {ValidationError} If data is invalid
 * @throws {NotFoundError} If workspace not found
 */
static async create(data, organizationId, userId) {
  // Implementation
}
```

---

## Performance Standards

See [PERFORMANCE_STANDARDS.md](./docs/PERFORMANCE_STANDARDS.md) for complete performance guidelines.

### Performance Requirements

- **API Response Time:** < 200ms (p95)
- **Database Query Time:** < 50ms (p95)
- **Page Load Time:** < 2s (p95)
- **Lighthouse Score:** > 90

---

## Code Review Checklist

Before submitting code for review, verify:

### Architecture
- [ ] Code follows layer separation (Routes → Controllers → Services → Repositories)
- [ ] No business logic in controllers
- [ ] No HTTP handling in services
- [ ] Dependencies are injected, not hard-coded

### Security
- [ ] User input is validated with Joi schemas
- [ ] SQL queries use parameterized statements
- [ ] Tenant isolation enforced (organizationId filtering)
- [ ] Sensitive data is not logged

### Testing
- [ ] Unit tests cover all new code (80% minimum)
- [ ] Integration tests cover new endpoints
- [ ] All tests pass locally
- [ ] Test names clearly describe what they test

### Code Quality
- [ ] No console.log statements (use logger)
- [ ] Error handling is comprehensive
- [ ] Code is DRY (Don't Repeat Yourself)
- [ ] Functions are small and focused (< 50 lines)
- [ ] Variables have descriptive names

### Documentation
- [ ] JSDoc comments for public methods
- [ ] README updated if needed
- [ ] API documentation updated if needed
- [ ] Complex logic has inline comments

### Git
- [ ] Commit messages follow format
- [ ] Branch name is descriptive
- [ ] No merge conflicts
- [ ] No debug code or commented-out code

---

## Enforcement

### Automated Checks

The following are enforced automatically:

1. **Linting:** ESLint must pass
2. **Formatting:** Prettier must pass
3. **Tests:** All tests must pass
4. **Coverage:** Minimum 80% coverage required
5. **Build:** Production build must succeed

### Code Review Requirements

1. **All code must be reviewed** by at least one senior engineer
2. **All automated checks must pass** before review
3. **All review comments must be addressed** before merge
4. **Standards violations are blocking** - code will be rejected

### Consequences of Non-Compliance

1. **First offense:** Code rejected, standards training required
2. **Second offense:** Formal warning
3. **Third offense:** Escalation to engineering manager

---

## Getting Help

### Questions About Standards

1. **Read the detailed standard docs** in `/docs/`
2. **Check existing code examples** that follow standards
3. **Ask in #engineering-standards** Slack channel
4. **Schedule office hours** with senior engineers

### Proposing Changes

Standards should evolve. To propose changes:

1. **Create an RFC** (Request for Comments) document
2. **Discuss in engineering meeting**
3. **Get consensus from senior engineers**
4. **Update standards documentation**
5. **Communicate changes to all engineers**

---

## References

- [Phase 1: Service Testing Complete](./backend/docs/PHASE1_SERVICE_TESTING_COMPLETE.md)
- [Phase 2: Controller Migration Complete](./backend/docs/PHASE2_CONTROLLER_MIGRATION_COMPLETE.md)
- [Architecture Decision Records](./docs/ADR/)
- [API Documentation](./docs/API.md)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-03 | Initial standards document | GitHub Copilot |

---

**Last Updated:** November 3, 2025  
**Next Review:** December 3, 2025  
**Owner:** Engineering Team
