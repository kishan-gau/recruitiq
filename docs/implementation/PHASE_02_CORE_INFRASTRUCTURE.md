# Phase 2: Core Infrastructure Setup

**Duration:** 1 week  
**Dependencies:** Phase 1  
**Team:** Architecture Team  
**Status:** Not Started

---

## 📋 Overview

Create the foundational infrastructure for multi-product architecture. This includes the directory structure, core product module, enhanced database query wrapper, and product loader infrastructure.

---

## 🎯 Objectives

1. Create products/ directory structure
2. Implement core product module (auth, users, organizations, billing)
3. Enhance custom query wrapper for multi-schema support
4. Set up product loader infrastructure
5. Create shared utilities for cross-product features

---

## 📊 Deliverables

### 1. Products Directory Structure

```
backend/src/products/
├── core/                           # Shared foundation (required)
│   ├── auth/
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   └── mfaController.js
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── tokenService.js
│   │   │   └── mfaService.js
│   │   ├── routes/
│   │   │   └── auth.js
│   │   └── middleware/
│   │       └── authenticate.js
│   ├── users/
│   │   ├── controllers/
│   │   │   └── userController.js
│   │   ├── services/
│   │   │   └── userService.js
│   │   ├── repositories/
│   │   │   └── userRepository.js
│   │   └── routes/
│   │       └── users.js
│   ├── organizations/
│   │   ├── controllers/
│   │   │   └── organizationController.js
│   │   ├── services/
│   │   │   └── organizationService.js
│   │   ├── repositories/
│   │   │   └── organizationRepository.js
│   │   └── routes/
│   │       └── organizations.js
│   ├── billing/
│   │   ├── controllers/
│   │   │   └── billingController.js
│   │   ├── services/
│   │   │   └── billingService.js
│   │   └── routes/
│   │       └── billing.js
│   ├── config/
│   │   └── core.config.js          # Core product configuration
│   └── index.js                     # Core product entry point
│
├── recruitiq/                       # To be created in Phase 4
├── payroll/                         # To be created in Phase 8
└── hris/                            # To be created in Phase 11
```

### 2. Enhanced Query Wrapper

**File:** `backend/src/shared/database/query.js`

Enhance the existing custom query wrapper to support multi-schema operations:

```javascript
import pool from '../../config/database.js';
import logger from '../utils/logger.js';

/**
 * Enhanced query wrapper with multi-schema support
 * 
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @param {string} organizationId - Organization ID for tenant isolation
 * @param {Object} options - Query options
 * @param {string} options.operation - SQL operation (SELECT, INSERT, UPDATE, DELETE)
 * @param {string} options.table - Table name
 * @param {string} options.schema - Schema name (optional)
 * @param {string} options.userId - User ID for audit trail
 * @param {Object} options.client - Transaction client (optional)
 * @returns {Promise<Object>} Query result
 */
export async function query(text, params = [], organizationId = null, options = {}) {
  const startTime = Date.now();
  const client = options.client || pool;
  
  try {
    // 1. Validate organization_id for tenant-scoped queries
    if (organizationId && !text.toLowerCase().includes('organization_id')) {
      logger.warn('Query missing organization_id filter', {
        query: text,
        organizationId,
        table: options.table,
        schema: options.schema
      });
      
      if (process.env.STRICT_TENANT_ISOLATION === 'true') {
        throw new Error('Query must filter by organization_id');
      }
    }
    
    // 2. Validate schema-qualified table names for cross-schema queries
    if (options.schema) {
      const schemaPattern = new RegExp(`${options.schema}\\.`, 'i');
      if (!schemaPattern.test(text)) {
        logger.warn('Query missing schema qualification', {
          query: text,
          expectedSchema: options.schema,
          table: options.table
        });
      }
    }
    
    // 3. SQL injection detection
    detectSQLInjection(text, params);
    
    // 4. Execute query
    const result = await client.query(text, params);
    
    // 5. Log query performance
    const duration = Date.now() - startTime;
    
    if (duration > 1000) { // Slow query threshold
      logger.warn('Slow query detected', {
        duration,
        query: text.substring(0, 200), // Log first 200 chars
        table: options.table,
        schema: options.schema,
        operation: options.operation
      });
    }
    
    // 6. Log for audit trail
    logger.logDatabaseOperation({
      operation: options.operation,
      table: options.table,
      schema: options.schema,
      organizationId,
      userId: options.userId,
      duration,
      rowCount: result.rowCount
    });
    
    return result;
    
  } catch (error) {
    // Log error
    logger.error('Database query failed', {
      error: error.message,
      query: text.substring(0, 200),
      organizationId,
      table: options.table,
      schema: options.schema
    });
    
    throw new DatabaseError('Database operation failed', {
      originalError: error.message,
      table: options.table
    });
  }
}

/**
 * Detects potential SQL injection attempts
 */
function detectSQLInjection(query, params) {
  const suspiciousPatterns = [
    /;\s*(DROP|DELETE|TRUNCATE|ALTER)/i,
    /UNION\s+SELECT/i,
    /--/,
    /\/\*/,
    /xp_/i,
    /sp_/i
  ];
  
  const queryString = `${query} ${params.join(' ')}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(queryString)) {
      logger.logSecurityEvent('sql_injection_attempt', {
        query: query.substring(0, 200),
        params: params.length,
        pattern: pattern.toString()
      });
      
      throw new SecurityError('Suspicious SQL pattern detected');
    }
  }
}

/**
 * Database transaction helper with multi-schema support
 */
export async function withTransaction(callback, options = {}) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Set search_path if schema specified
    if (options.schema) {
      await client.query(`SET search_path TO ${options.schema}, public`);
    }
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    
    return result;
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction failed', {
      error: error.message,
      schema: options.schema
    });
    throw error;
  } finally {
    client.release();
  }
}

export class DatabaseError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'DatabaseError';
    this.details = details;
    this.statusCode = 500;
  }
}

export class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
    this.statusCode = 403;
  }
}
```

### 3. Product Loader Infrastructure

**File:** `backend/src/shared/productLoader.js`

Create the product loader system as specified in MULTI_PRODUCT_SAAS_ARCHITECTURE.md (lines 758-1036):

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';
import { query } from './database/query.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductLoader {
  constructor() {
    this.products = new Map();
    this.loadedProducts = new Set();
  }

  /**
   * Load all available products from the products directory
   */
  async loadProducts() {
    // Implementation from architecture document
    // ... (full implementation)
  }

  /**
   * Get products enabled for a specific organization
   */
  async getEnabledProducts(organizationId, db) {
    // Implementation from architecture document
    // ... (full implementation)
  }

  /**
   * Check if organization has access to a product
   */
  async hasProductAccess(organizationId, productId, db) {
    // Implementation from architecture document
    // ... (full implementation)
  }

  /**
   * Check feature access for organization
   */
  async hasFeatureAccess(organizationId, productId, feature, db) {
    // Implementation from architecture document
    // ... (full implementation)
  }

  /**
   * Check if organization is within usage limits
   */
  async checkUsageLimit(organizationId, productId, metric, db) {
    // Implementation from architecture document
    // ... (full implementation)
  }

  /**
   * Record product usage metric
   */
  async recordUsage(organizationId, productId, metric, value, db) {
    // Implementation from architecture document
    // ... (full implementation)
  }

  // ... (other methods from architecture document)
}

export default new ProductLoader();
```

### 4. Shared Middleware

**File:** `backend/src/shared/middleware/productAccess.js`

Implement product access control middleware as specified in architecture document (lines 1044-1207):

```javascript
import productLoader from '../productLoader.js';
import logger from '../utils/logger.js';

/**
 * Middleware to check if organization has access to requested product
 */
export const productAccessMiddleware = async (req, res, next) => {
  // Implementation from architecture document
  // ... (full implementation)
};

/**
 * Middleware to check specific feature access
 */
export const requireFeature = (productId, feature) => {
  // Implementation from architecture document
  // ... (full implementation)
};

/**
 * Middleware to check usage limits
 */
export const checkUsageLimit = (productId, metric) => {
  // Implementation from architecture document
  // ... (full implementation)
};

/**
 * Extract product ID from route path
 */
function extractProductFromRoute(path) {
  // Implementation from architecture document
  // ... (full implementation)
}
```

### 5. Core Product Configuration

**File:** `backend/src/products/core/config/core.config.js`

```javascript
export default {
  id: 'core',
  name: 'Core Services',
  version: '1.0.0',
  description: 'Shared authentication, user management, and billing services',
  standalone: false, // Core is required by all products
  
  dependencies: {
    required: [],
    optional: [],
    conflicts: []
  },
  
  database: {
    schema: 'core',
    migrations: './database/migrations',
    seeds: './database/seeds'
  },
  
  routes: {
    prefix: '/',
    version: 'v1'
  },
  
  features: [
    'authentication',
    'user_management',
    'organization_management',
    'billing',
    'subscription_management'
  ],
  
  permissions: [
    'core.admin',
    'core.users.manage',
    'core.organizations.manage',
    'core.billing.view',
    'core.billing.manage'
  ]
};
```

---

## 🔍 Detailed Tasks

### Task 2.1: Create Directory Structure (0.5 days)

**Assignee:** DevOps Lead

**Actions:**
1. ✅ Create products/ directory
2. ✅ Create core/ subdirectory with full structure
3. ✅ Create shared/ directory enhancements
4. ✅ Update .gitignore if needed
5. ✅ Create README files for each major directory

**Standards:** Follow DOCUMENTATION_STANDARDS.md for README files

### Task 2.2: Extract Core Services (2 days)

**Assignee:** Backend Team

**Actions:**
1. ✅ Move auth controllers to products/core/auth/controllers/
2. ✅ Move auth services to products/core/auth/services/
3. ✅ Move user management to products/core/users/
4. ✅ Move organization management to products/core/organizations/
5. ✅ Update all import paths
6. ✅ Test that existing functionality works

**Standards:** Follow BACKEND_STANDARDS.md for service/controller structure

### Task 2.3: Enhance Query Wrapper (1 day)

**Assignee:** Database Team

**Actions:**
1. ✅ Add multi-schema support to query wrapper
2. ✅ Add schema validation
3. ✅ Enhance logging for schema operations
4. ✅ Add transaction helper with schema support
5. ✅ Write unit tests for new functionality
6. ✅ Update documentation

**Standards:** Follow DATABASE_STANDARDS.md for query patterns

### Task 2.4: Implement Product Loader (2 days)

**Assignee:** Architecture Team

**Actions:**
1. ✅ Create productLoader.js
2. ✅ Implement product loading logic
3. ✅ Implement product validation
4. ✅ Implement organization access checking
5. ✅ Implement feature access control
6. ✅ Implement usage tracking
7. ✅ Write comprehensive unit tests (90%+ coverage)

**Standards:** Follow BACKEND_STANDARDS.md and TESTING_STANDARDS.md

### Task 2.5: Implement Product Middleware (1 day)

**Assignee:** Backend Team

**Actions:**
1. ✅ Create productAccess.js middleware
2. ✅ Implement product access checking
3. ✅ Implement feature access checking
4. ✅ Implement usage limit checking
5. ✅ Write unit tests
6. ✅ Write integration tests

**Standards:** Follow SECURITY_STANDARDS.md for access control

### Task 2.6: Create Core Product Module (1 day)

**Assignee:** Architecture Team

**Actions:**
1. ✅ Create core.config.js
2. ✅ Create core product index.js
3. ✅ Register core routes
4. ✅ Test core product loading
5. ✅ Document core product structure

**Standards:** Follow DOCUMENTATION_STANDARDS.md

### Task 2.7: Testing & Validation (1 day)

**Assignee:** QA Team

**Actions:**
1. ✅ Test query wrapper enhancements
2. ✅ Test product loader functionality
3. ✅ Test product middleware
4. ✅ Test core product loading
5. ✅ Verify 80%+ test coverage
6. ✅ Run integration tests

**Standards:** Follow TESTING_STANDARDS.md

---

## 📋 Standards Compliance Checklist

- [ ] All code follows BACKEND_STANDARDS.md layer architecture
- [ ] Database operations use enhanced query wrapper per DATABASE_STANDARDS.md
- [ ] All functions have JSDoc comments per DOCUMENTATION_STANDARDS.md
- [ ] Security checks implemented per SECURITY_STANDARDS.md
- [ ] Unit tests written with 90%+ coverage per TESTING_STANDARDS.md
- [ ] All imports use ES6 modules
- [ ] Error handling follows standard patterns
- [ ] Logging follows standard format

---

## 🎯 Success Criteria

Phase 2 is complete when:

1. ✅ Products directory structure exists
2. ✅ Core product module is functional
3. ✅ Query wrapper supports multi-schema operations
4. ✅ Product loader can load and validate products
5. ✅ Product access middleware works correctly
6. ✅ All tests pass with 80%+ coverage
7. ✅ Documentation is complete
8. ✅ Code review approved by 2+ engineers

---

## 📤 Outputs

### Code Created
- [ ] `backend/src/products/core/` (complete structure)
- [ ] `backend/src/shared/database/query.js` (enhanced)
- [ ] `backend/src/shared/productLoader.js`
- [ ] `backend/src/shared/middleware/productAccess.js`
- [ ] `backend/src/shared/middleware/featureAccess.js`
- [ ] `backend/src/shared/middleware/tenantIsolation.js`

### Tests Created
- [ ] Unit tests for product loader (90%+ coverage)
- [ ] Unit tests for middleware (90%+ coverage)
- [ ] Integration tests for core product
- [ ] Integration tests for query wrapper

### Documentation Created
- [ ] Product loader API documentation
- [ ] Middleware usage guide
- [ ] Core product documentation
- [ ] Migration guide for developers

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing auth | High | Comprehensive regression testing |
| Query wrapper issues | High | Extensive unit testing, gradual rollout |
| Product loader bugs | Medium | Thorough testing, error handling |

---

## ⏭️ Next Phase

**[Phase 3: Database Schema Refactoring](./PHASE_03_DATABASE_SCHEMA.md)**

Upon completion of Phase 2, proceed to Phase 3 to refactor the database schema for multi-product architecture.

---

**Phase Owner:** Architecture Team Lead  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start
