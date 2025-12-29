# Code Quality Fix Guide

**Quick reference for fixing common standards violations**

---

## 🔴 Critical: Replace pool.query() with custom query() wrapper

### Why?
- **Security Risk:** Bypasses tenant isolation
- **Missing:** Security logging and audit trail
- **Standard:** BACKEND_STANDARDS.md requires custom wrapper

### How to Fix

**❌ WRONG:**
```javascript
const result = await pool.query(
  'SELECT * FROM jobs WHERE id = $1',
  [jobId]
);
```

**✅ CORRECT:**
```javascript
import { query } from '../../../config/database.js';

const result = await query(
  'SELECT * FROM jobs WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
  [jobId, organizationId],
  organizationId,
  { operation: 'SELECT', table: 'jobs' }
);
```

### Key Changes:
1. Import `query` from `config/database.js`
2. Add `organization_id` filter (ALWAYS!)
3. Add `deleted_at IS NULL` check (soft deletes)
4. Pass `organizationId` as 3rd parameter
5. Add metadata object as 4th parameter

### Find Violations:
```bash
npm run audit:pool-query
```

---

## 🟡 High Priority: Replace console.log with logger

### Why?
- **Missing:** Structured logging with context
- **Missing:** Log levels and filtering
- **Missing:** Log aggregation support
- **Standard:** BACKEND_STANDARDS.md requires logger

### How to Fix

**❌ WRONG:**
```javascript
console.log('User created:', user);
console.error('Error:', error);
```

**✅ CORRECT:**
```javascript
import logger from '../utils/logger.js';

logger.info('User created', {
  userId: user.id,
  organizationId: user.organizationId,
  email: user.email,
  timestamp: new Date().toISOString()
});

logger.error('User creation failed', {
  error: error.message,
  stack: error.stack,
  organizationId,
  userId: req.user?.id
});
```

### Mapping:
```javascript
console.log()   → logger.info()
console.error() → logger.error()
console.warn()  → logger.warn()
console.debug() → logger.debug()
```

### Security Note:
**NEVER log sensitive data!**

```javascript
// ❌ WRONG - Logs password!
logger.info('Login attempt', { email, password });

// ✅ CORRECT - Redacts sensitive fields
logger.info('Login attempt', { 
  email, 
  passwordProvided: !!password // Just boolean
});
```

### Find Violations:
```bash
npm run audit:console-log
```

---

## 🟡 High Priority: Fix Singleton Service Exports

### Why?
- **Testability:** Cannot inject mock dependencies
- **Testing:** Hard to unit test
- **Standard:** BACKEND_STANDARDS.md requires DI pattern

### How to Fix

**❌ WRONG:**
```javascript
class ProductService {
  async create(data) {
    const repo = new ProductRepository();
    return repo.create(data);
  }
}

export default new ProductService(); // ❌ Singleton!
```

**✅ CORRECT:**
```javascript
class ProductService {
  constructor(repository = null) {
    this.repository = repository || new ProductRepository();
  }

  async create(data, organizationId, userId) {
    // Validate first
    const validated = await ProductService.createSchema.validateAsync(data);
    
    // Use injected repository
    return this.repository.create({
      ...validated,
      organizationId,
      createdBy: userId
    });
  }
}

export default ProductService; // ✅ Export class
```

### Update Controllers/Routes:
```javascript
// ❌ WRONG - Import singleton
import productService from '../services/ProductService.js';
const result = await productService.create(data);

// ✅ CORRECT - Instantiate class
import ProductService from '../services/ProductService.js';
const productService = new ProductService();
const result = await productService.create(data, orgId, userId);
```

### Testing Benefits:
```javascript
// Now you can inject mocks!
import { describe, it, expect, jest } from '@jest/globals';
import ProductService from '../services/ProductService.js';

describe('ProductService', () => {
  it('should create product', async () => {
    // Create mock repository
    const mockRepo = {
      create: jest.fn().mockResolvedValue({ id: '123', name: 'Test' })
    };
    
    // Inject mock
    const service = new ProductService(mockRepo);
    
    // Test
    const result = await service.create(data, orgId, userId);
    
    expect(mockRepo.create).toHaveBeenCalled();
    expect(result.id).toBe('123');
  });
});
```

### Find Violations:
```bash
npm run audit:singleton-exports
```

---

## 📝 Add JSDoc Documentation

### Why?
- **Developer Experience:** Clear API documentation
- **Maintainability:** Understand code faster
- **Standard:** CODING_STANDARDS.md requires JSDoc

### Template:
```javascript
/**
 * Creates a new job posting
 * 
 * @param {Object} data - Job data from request body
 * @param {string} data.title - Job title (required, 3-200 chars)
 * @param {string} data.description - Job description (required, min 10 chars)
 * @param {string} data.workspaceId - UUID of workspace
 * @param {string} organizationId - Organization UUID (for tenant isolation)
 * @param {string} userId - User UUID performing the action (for audit trail)
 * @returns {Promise<Object>} Created job object with all fields
 * @throws {ValidationError} If data fails Joi validation
 * @throws {NotFoundError} If workspace not found
 * @throws {ForbiddenError} If user lacks permission
 * 
 * @example
 * const job = await jobService.create({
 *   title: 'Senior Developer',
 *   description: 'Looking for experienced dev',
 *   workspaceId: '123e4567-e89b-12d3-a456-426614174000'
 * }, orgId, userId);
 */
async create(data, organizationId, userId) {
  // Implementation
}
```

### Key Elements:
1. **Summary** - What the function does
2. **@param** - All parameters with types and descriptions
3. **@returns** - Return value type and description
4. **@throws** - Possible errors
5. **@example** - Usage example (optional but helpful)

---

## ✅ Run All Audits

### Check All Code Quality Issues:
```bash
npm run audit:code-quality
```

This runs:
- `audit:pool-query` - Security violations
- `audit:console-log` - Logging issues
- `audit:singleton-exports` - Architecture issues

### Run ESLint:
```bash
# Backend
cd backend && npm run lint

# Fix auto-fixable issues
cd backend && npm run lint -- --fix
```

---

## 📊 Check Progress

### Before Starting:
```bash
cd backend
npm run audit:code-quality
```

Note the number of violations for each category.

### After Fixing:
```bash
cd backend
npm run audit:code-quality
```

Compare the numbers - they should decrease!

### Goal:
- ✅ 0 pool.query violations
- ✅ 0 console.log violations (except test files)
- ✅ 0 singleton exports
- ✅ 0 ESLint errors

---

## 🎯 Priority Order

Fix issues in this order:

1. **CRITICAL:** pool.query → query wrapper (security)
2. **HIGH:** Singleton exports → class exports (testability)
3. **HIGH:** console.log → logger (operations)
4. **MEDIUM:** Add JSDoc comments (documentation)
5. **MEDIUM:** Add missing tests (quality)

---

## 💡 Tips

### Batch Fixes
Don't try to fix everything at once. Pick one category:
- Fix all pool.query in one product (e.g., PayLinQ)
- Fix all console.log in one layer (e.g., all services)
- Fix all singletons in one module (e.g., Nexus)

### Test After Each Fix
```bash
# Run affected tests
npm test -- --testPathPattern="products/paylinq"

# Run integration tests
npm run test:integration
```

### Use Git Bisect
If tests break after changes:
```bash
git bisect start
git bisect bad
git bisect good <last-working-commit>
```

### Search and Replace
For bulk changes:
```bash
# Find all pool.query usage
grep -r "pool.query" src --include="*.js"

# Find all console.log usage
grep -r "console.log" src --include="*.js"
```

---

## 📚 Reference Documents

- `docs/CODING_STANDARDS.md` - Overview
- `docs/BACKEND_STANDARDS.md` - Backend rules
- `docs/SECURITY_STANDARDS.md` - Security requirements
- `docs/TESTING_STANDARDS.md` - Testing guidelines
- `CODE_QUALITY_REPORT.md` - Current status and findings

---

## ❓ Questions?

Check the standards documentation first:
1. Read relevant standards doc in `/docs`
2. Check existing code examples that follow standards
3. Ask in #engineering-standards Slack channel
4. Review the CODE_QUALITY_REPORT.md for context

---

**Last Updated:** December 29, 2025  
**Status:** Living document - update as standards evolve
