# Phase 5: Product Loader & Access Control

**Duration:** 2 days  
**Dependencies:** Phase 2, Phase 4  
**Team:** Backend Team (2 developers)  
**Status:** Not Started

---

## 📋 Overview

This phase implements the core product loader system and subscription-based access control middleware. The product loader dynamically loads products based on configuration, while the access control middleware enforces subscription checks for every API request to product-specific endpoints.

This is a critical foundation phase that enables the multi-product architecture.

---

## 🎯 Objectives

1. Implement complete product loader with validation and registration
2. Create subscription-based access control middleware
3. Implement product access checking from database
4. Add feature-level access control
5. Create usage limit checking mechanism
6. Add comprehensive logging and monitoring

---

## 📊 Deliverables

### 1. Product Loader System

**File:** `backend/src/shared/productLoader.js`

```javascript
/**
 * Product Loader
 * Dynamically loads and registers product modules
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductLoader {
  constructor() {
    this.products = new Map();
    this.loadedProducts = new Set();
  }

  /**
   * Load all products from products directory
   */
  async loadAllProducts() {
    const productsDir = path.join(__dirname, '../products');
    const productDirs = fs.readdirSync(productsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    logger.info(`📦 Found ${productDirs.length} products to load`);

    for (const productDir of productDirs) {
      await this.loadProduct(productDir, productsDir);
    }

    logger.info(`✅ Loaded ${this.products.size} products successfully`);
    return this.products;
  }

  /**
   * Load a single product
   */
  async loadProduct(productDir, productsDir = null) {
    try {
      const baseDir = productsDir || path.join(__dirname, '../products');
      const configPath = path.join(baseDir, productDir, 'config', 'product.config.js');
      
      if (!fs.existsSync(configPath)) {
        logger.warn(`No product config found for ${productDir}`);
        return;
      }

      const configUrl = `file://${configPath}`;
      const { default: config } = await import(configUrl);
      
      // Validate product config
      this.validateProductConfig(config);
      
      // Load routes if they exist
      const routesPath = path.join(baseDir, productDir, 'routes', 'index.js');
      let routes = null;
      
      if (fs.existsSync(routesPath)) {
        const routesUrl = `file://${routesPath}`;
        const routesModule = await import(routesUrl);
        routes = routesModule.default || routesModule;
      }
      
      this.products.set(config.id, {
        ...config,
        path: path.join(baseDir, productDir),
        routes: routes,
        loaded: true,
        loadedAt: new Date()
      });
      
      this.loadedProducts.add(config.id);
      
      logger.info(`📦 Registered product: ${config.name} (${config.id})`);
    } catch (error) {
      logger.error(`Failed to load product ${productDir}:`, error);
      throw error;
    }
  }

  /**
   * Validate product configuration
   */
  validateProductConfig(config) {
    const required = ['id', 'name', 'version', 'routes', 'database'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Product config missing required field: ${field}`);
      }
    }

    if (!config.routes.prefix) {
      throw new Error(`Product ${config.id} missing routes.prefix`);
    }

    if (!config.database.schema) {
      throw new Error(`Product ${config.id} missing database.schema`);
    }
  }

  /**
   * Get product by ID
   */
  getProduct(productId) {
    return this.products.get(productId);
  }

  /**
   * Get all registered products
   */
  getAllProducts() {
    return this.products;
  }

  /**
   * Check if product is loaded
   */
  isProductLoaded(productId) {
    return this.loadedProducts.has(productId);
  }

  /**
   * Get products enabled for a specific organization
   */
  async getEnabledProducts(organizationId, db) {
    try {
      const result = await db.query(
        `SELECT 
          ps.product_id,
          ps.status,
          ps.tier,
          ps.features,
          ps.limits,
          ps.expires_at,
          ps.trial_ends_at
        FROM core.product_subscriptions ps
        WHERE ps.organization_id = $1 
          AND ps.status = 'active'
          AND (ps.expires_at IS NULL OR ps.expires_at > NOW())
        ORDER BY ps.product_id`,
        [organizationId]
      );

      return result.rows.map(row => ({
        productId: row.product_id,
        status: row.status,
        tier: row.tier,
        features: row.features || [],
        limits: row.limits || {},
        expiresAt: row.expires_at,
        trialEndsAt: row.trial_ends_at,
      }));
    } catch (error) {
      logger.error('Failed to get enabled products:', error);
      return [];
    }
  }

  /**
   * Check if organization has access to a product
   */
  async hasProductAccess(organizationId, productId, db) {
    try {
      // Core product is always accessible
      if (productId === 'core') {
        return true;
      }

      const result = await db.query(
        `SELECT 1 
        FROM core.product_subscriptions 
        WHERE organization_id = $1 
          AND product_id = $2 
          AND status = 'active'
          AND (expires_at IS NULL OR expires_at > NOW())`,
        [organizationId, productId]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Failed to check product access:', error);
      return false;
    }
  }

  /**
   * Check feature access for organization
   */
  async hasFeatureAccess(organizationId, productId, feature, db) {
    try {
      const result = await db.query(
        `SELECT features, tier
        FROM core.product_subscriptions 
        WHERE organization_id = $1 
          AND product_id = $2 
          AND status = 'active'`,
        [organizationId, productId]
      );

      if (result.rowCount === 0) return false;

      const { features, tier } = result.rows[0];
      
      // Check if feature is in enabled features list
      if (Array.isArray(features)) {
        return features.includes(feature) || features.includes('all');
      }

      // Fall back to tier-based features
      const product = this.products.get(productId);
      if (product && product.tiers && product.tiers[tier]) {
        const tierFeatures = product.tiers[tier].features;
        return tierFeatures === 'all' || tierFeatures.includes(feature);
      }

      return false;
    } catch (error) {
      logger.error('Failed to check feature access:', error);
      return false;
    }
  }

  /**
   * Check if organization is within usage limits
   */
  async checkUsageLimit(organizationId, productId, metric, db) {
    try {
      const result = await db.query(
        `SELECT limits FROM core.product_subscriptions 
        WHERE organization_id = $1 AND product_id = $2 AND status = 'active'`,
        [organizationId, productId]
      );

      if (result.rowCount === 0) {
        return { allowed: false, reason: 'not_subscribed' };
      }

      const limits = result.rows[0].limits || {};
      const limit = limits[metric];

      // If no limit set or -1 (unlimited), allow
      if (!limit || limit === -1) {
        return { allowed: true };
      }

      // Get current usage
      const usageResult = await db.query(
        `SELECT value FROM core.product_usage 
        WHERE organization_id = $1 AND product_id = $2 AND metric = $3
        ORDER BY recorded_at DESC LIMIT 1`,
        [organizationId, productId, metric]
      );

      const currentUsage = usageResult.rowCount > 0 ? usageResult.rows[0].value : 0;

      if (currentUsage >= limit) {
        return {
          allowed: false,
          reason: 'limit_exceeded',
          current: currentUsage,
          limit: limit,
        };
      }

      return {
        allowed: true,
        current: currentUsage,
        limit: limit,
      };
    } catch (error) {
      logger.error('Failed to check usage limit:', error);
      return { allowed: false, reason: 'error' };
    }
  }

  /**
   * Record product usage metric
   */
  async recordUsage(organizationId, productId, metric, value, db) {
    try {
      await db.query(
        `INSERT INTO core.product_usage 
        (organization_id, product_id, metric, value, recorded_at)
        VALUES ($1, $2, $3, $4, NOW())`,
        [organizationId, productId, metric, value]
      );
    } catch (error) {
      logger.error('Failed to record usage:', error);
    }
  }
}

export default new ProductLoader();
```

### 2. Product Access Middleware

**File:** `backend/src/shared/middleware/productAccess.js`

```javascript
/**
 * Product Access Middleware
 * Enforces subscription-based access control
 */
import productLoader from '../productLoader.js';
import logger from '../utils/logger.js';

/**
 * Middleware to check if organization has access to a product
 */
export function productAccessMiddleware(productId) {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organization_id;
      
      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Check if organization has active subscription
      const hasAccess = await productLoader.hasProductAccess(
        organizationId,
        productId,
        req.db
      );

      if (!hasAccess) {
        logger.warn(`Access denied: org ${organizationId} to product ${productId}`);
        
        return res.status(403).json({
          success: false,
          error: `Access denied. Your organization does not have an active subscription to ${productId}.`,
          code: 'PRODUCT_ACCESS_DENIED',
          productId: productId
        });
      }

      // Attach product info to request
      req.product = {
        id: productId,
        info: productLoader.getProduct(productId)
      };

      next();
    } catch (error) {
      logger.error('Product access check failed:', error);
      next(error);
    }
  };
}

/**
 * Middleware to check feature access
 */
export function featureAccessMiddleware(productId, featureName) {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organization_id;
      
      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const hasAccess = await productLoader.hasFeatureAccess(
        organizationId,
        productId,
        featureName,
        req.db
      );

      if (!hasAccess) {
        logger.warn(`Feature access denied: org ${organizationId}, feature ${featureName}`);
        
        return res.status(403).json({
          success: false,
          error: `This feature requires a higher subscription tier.`,
          code: 'FEATURE_ACCESS_DENIED',
          feature: featureName
        });
      }

      next();
    } catch (error) {
      logger.error('Feature access check failed:', error);
      next(error);
    }
  };
}

/**
 * Middleware to check usage limits
 */
export function usageLimitMiddleware(productId, metric) {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organization_id;
      
      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const limitCheck = await productLoader.checkUsageLimit(
        organizationId,
        productId,
        metric,
        req.db
      );

      if (!limitCheck.allowed) {
        logger.warn(`Usage limit exceeded: org ${organizationId}, metric ${metric}`);
        
        return res.status(429).json({
          success: false,
          error: `Usage limit exceeded for ${metric}.`,
          code: 'USAGE_LIMIT_EXCEEDED',
          metric: metric,
          current: limitCheck.current,
          limit: limitCheck.limit
        });
      }

      next();
    } catch (error) {
      logger.error('Usage limit check failed:', error);
      next(error);
    }
  };
}
```

---

## 🔍 Detailed Tasks

### Task 5.1: Implement Product Loader Core (1 day)

**Assignee:** Senior Backend Developer

**Actions:**
1. ✅ Create `backend/src/shared/productLoader.js`
2. ✅ Implement `loadAllProducts()` method
3. ✅ Implement `loadProduct()` method with validation
4. ✅ Implement `validateProductConfig()` method
5. ✅ Implement getter methods (getProduct, getAllProducts, isProductLoaded)
6. ✅ Add comprehensive error handling
7. ✅ Add logging for all operations

**Standards:** Follow BACKEND_STANDARDS.md

### Task 5.2: Implement Subscription Checking (0.5 days)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Implement `getEnabledProducts()` method
2. ✅ Implement `hasProductAccess()` method
3. ✅ Query core.product_subscriptions table
4. ✅ Handle expired subscriptions
5. ✅ Handle trial periods
6. ✅ Add caching for subscription checks (optional optimization)

**Standards:** Follow DATABASE_STANDARDS.md query wrapper

### Task 5.3: Implement Feature Access Control (0.5 days)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Implement `hasFeatureAccess()` method
2. ✅ Check against subscription features array
3. ✅ Fall back to tier-based features
4. ✅ Handle 'all' features case
5. ✅ Add logging for feature access checks

**Standards:** Follow BACKEND_STANDARDS.md

### Task 5.4: Implement Usage Limit Checking (0.5 days)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Implement `checkUsageLimit()` method
2. ✅ Query core.product_usage table
3. ✅ Compare current usage vs limits
4. ✅ Handle unlimited (-1) limits
5. ✅ Implement `recordUsage()` method
6. ✅ Add usage tracking for key metrics

**Standards:** Follow DATABASE_STANDARDS.md

### Task 5.5: Create Access Control Middleware (0.5 days)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Create `backend/src/shared/middleware/productAccess.js`
2. ✅ Implement `productAccessMiddleware()`
3. ✅ Implement `featureAccessMiddleware()`
4. ✅ Implement `usageLimitMiddleware()`
5. ✅ Add proper error responses (401, 403, 429)
6. ✅ Attach product info to request object

**Standards:** Follow BACKEND_STANDARDS.md, API_STANDARDS.md

### Task 5.6: Write Comprehensive Tests (0.5 days)

**Assignee:** QA + Backend Developer

**Actions:**
1. ✅ Unit tests for ProductLoader class
2. ✅ Unit tests for middleware functions
3. ✅ Mock database queries
4. ✅ Test subscription scenarios (active, expired, trial)
5. ✅ Test feature access scenarios
6. ✅ Test usage limit scenarios
7. ✅ Achieve 90%+ coverage for this module

**Standards:** Follow TESTING_STANDARDS.md

---

## 📋 Standards Compliance Checklist

- [ ] Code follows BACKEND_STANDARDS.md patterns
- [ ] Database queries use custom query wrapper (DATABASE_STANDARDS.md)
- [ ] Security requirements from SECURITY_STANDARDS.md are met
- [ ] Tests written per TESTING_STANDARDS.md (90%+ coverage for critical module)
- [ ] Documentation follows DOCUMENTATION_STANDARDS.md
- [ ] API responses follow API_STANDARDS.md format
- [ ] Logging follows standard patterns

---

## 🎯 Success Criteria

Phase 5 is complete when:

1. ✅ Product loader can load and register all products
2. ✅ Product configuration validation works correctly
3. ✅ Subscription checking queries database correctly
4. ✅ Feature access control works for all tiers
5. ✅ Usage limit checking functions properly
6. ✅ All middleware functions enforce access control
7. ✅ All unit tests pass with 90%+ coverage
8. ✅ Integration tests verify end-to-end flow
9. ✅ Code review approved by 2+ engineers
10. ✅ No security vulnerabilities identified

---

## 📤 Outputs

### Code Created
- [ ] `backend/src/shared/productLoader.js`
- [ ] `backend/src/shared/middleware/productAccess.js`

### Tests Created
- [ ] `tests/unit/productLoader.test.js` (90%+ coverage)
- [ ] `tests/unit/middleware/productAccess.test.js` (90%+ coverage)
- [ ] `tests/integration/productAccess.test.js`

### Documentation Created
- [ ] JSDoc comments for all public methods
- [ ] README section on product loading
- [ ] API documentation for access control

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database performance with subscription checks | High | Add caching layer; index product_subscriptions table |
| Product loader fails to load valid products | High | Comprehensive validation; detailed error messages |
| Access control bypassed | Critical | Security review; penetration testing |
| Usage limit calculation incorrect | Medium | Thorough testing; manual verification |
| Expired subscriptions not detected | High | Test with various expiry scenarios |

---

## 🔗 Related Phases

- **Previous:** [Phase 4: RecruitIQ Product Restructuring](./PHASE_04_RECRUITIQ_RESTRUCTURING.md)
- **Next:** [Phase 6: Server.js Dynamic Routing](./PHASE_06_DYNAMIC_ROUTING.md)
- **Related:** [Phase 2: Core Infrastructure](./PHASE_02_CORE_INFRASTRUCTURE.md)

---

## ⏭️ Next Phase

**[Phase 6: Server.js Dynamic Routing](./PHASE_06_DYNAMIC_ROUTING.md)**

Upon completion of Phase 5, proceed to Phase 6 to integrate the product loader into server.js and implement dynamic route mounting based on loaded products.

---

**Phase Owner:** Backend Team Lead  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start
