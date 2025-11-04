# Phase 6: Server.js Dynamic Routing

**Duration:** 1 day  
**Dependencies:** Phase 5  
**Team:** Backend Lead + 1 Developer  
**Status:** Not Started

---

## 📋 Overview

This phase integrates the product loader into the main server.js file and implements dynamic route mounting. The server will automatically discover and mount routes for all loaded products, applying appropriate middleware for authentication and access control.

---

## 🎯 Objectives

1. Refactor server.js to use product loader
2. Implement dynamic route mounting for all products
3. Apply access control middleware per product
4. Maintain backward compatibility during transition
5. Add health check endpoint with product status
6. Implement graceful startup and shutdown

---

## 📊 Deliverables

### 1. Updated Server.js

**File:** `backend/src/server.js`

```javascript
/**
 * RecruitIQ Platform Server
 * Multi-product SaaS application with dynamic product loading
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import path from 'path';

// Core imports
import logger from './shared/utils/logger.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { authMiddleware } from './shared/middleware/auth.js';
import { databaseMiddleware } from './shared/middleware/database.js';
import { productAccessMiddleware } from './shared/middleware/productAccess.js';
import productLoader from './shared/productLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;

// ======================
// Global Middleware
// ======================

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Database connection middleware
app.use(databaseMiddleware);

// ======================
// Health Check & Status
// ======================

app.get('/health', async (req, res) => {
  const products = Array.from(productLoader.getAllProducts().keys());
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    loadedProducts: products,
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.get('/api/status', async (req, res) => {
  const products = Array.from(productLoader.getAllProducts().entries()).map(([id, product]) => ({
    id,
    name: product.name,
    version: product.version,
    loaded: product.loaded,
    routePrefix: product.routes?.prefix
  }));
  
  res.json({
    success: true,
    data: {
      server: 'online',
      products
    }
  });
});

// ======================
// Load Products
// ======================

async function loadProducts() {
  try {
    logger.info('🚀 Starting product loading...');
    
    await productLoader.loadAllProducts();
    
    const products = productLoader.getAllProducts();
    logger.info(`✅ Loaded ${products.size} products successfully`);
    
    return products;
  } catch (error) {
    logger.error('❌ Failed to load products:', error);
    throw error;
  }
}

// ======================
// Mount Product Routes
// ======================

async function mountProductRoutes(products) {
  try {
    logger.info('🔌 Mounting product routes...');
    
    for (const [productId, product] of products) {
      if (!product.routes) {
        logger.warn(`⚠️ Product ${productId} has no routes to mount`);
        continue;
      }
      
      const routePrefix = product.routes.prefix;
      logger.info(`📍 Mounting ${productId} routes at ${routePrefix}`);
      
      // Core product doesn't need subscription check
      if (productId === 'core') {
        app.use(routePrefix, authMiddleware, product.routes);
      } else {
        // Other products require subscription check
        app.use(
          routePrefix,
          authMiddleware,
          productAccessMiddleware(productId),
          product.routes
        );
      }
      
      logger.info(`✅ Mounted ${productId} routes successfully`);
    }
    
    logger.info('✅ All product routes mounted');
  } catch (error) {
    logger.error('❌ Failed to mount product routes:', error);
    throw error;
  }
}

// ======================
// 404 Handler
// ======================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// ======================
// Error Handler
// ======================

app.use(errorHandler);

// ======================
// Server Startup
// ======================

async function startServer() {
  try {
    // Load all products
    const products = await loadProducts();
    
    // Mount routes for loaded products
    await mountProductRoutes(products);
    
    // Start listening
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📦 Products loaded: ${Array.from(products.keys()).join(', ')}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`✅ Server ready to accept requests`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ======================
// Graceful Shutdown
// ======================

function gracefulShutdown(server) {
  logger.info('🛑 Received shutdown signal, closing server gracefully...');
  
  server.close(() => {
    logger.info('✅ Server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// ======================
// Start Application
// ======================

startServer();

export default app;
```

### 2. Product Routes Index

**File:** `backend/src/products/recruitiq/routes/index.js`

```javascript
/**
 * RecruitIQ Routes Index
 * Exports all routes for the RecruitIQ product
 */
import express from 'express';
import jobRoutes from './jobs.js';
import candidateRoutes from './candidates.js';
import applicationRoutes from './applications.js';
import interviewRoutes from './interviews.js';
import workspaceRoutes from './workspaces.js';

const router = express.Router();

// Mount sub-routes
router.use('/jobs', jobRoutes);
router.use('/candidates', candidateRoutes);
router.use('/applications', applicationRoutes);
router.use('/interviews', interviewRoutes);
router.use('/workspaces', workspaceRoutes);

export default router;
```

---

## 🔍 Detailed Tasks

### Task 6.1: Refactor Server.js Structure (0.25 days)

**Assignee:** Backend Lead

**Actions:**
1. ✅ Backup current server.js
2. ✅ Reorganize into sections (middleware, routes, startup)
3. ✅ Remove hardcoded route imports
4. ✅ Add comprehensive comments
5. ✅ Implement modular structure

**Standards:** Follow BACKEND_STANDARDS.md

### Task 6.2: Integrate Product Loader (0.25 days)

**Assignee:** Backend Lead

**Actions:**
1. ✅ Import productLoader
2. ✅ Create `loadProducts()` function
3. ✅ Handle product loading errors
4. ✅ Add logging for product loading
5. ✅ Verify all products load correctly

**Standards:** Follow BACKEND_STANDARDS.md

### Task 6.3: Implement Dynamic Route Mounting (0.25 days)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Create `mountProductRoutes()` function
2. ✅ Iterate through loaded products
3. ✅ Apply authentication middleware
4. ✅ Apply product access middleware (except core)
5. ✅ Mount routes at product-specific prefix
6. ✅ Add logging for each mounted route

**Standards:** Follow BACKEND_STANDARDS.md, API_STANDARDS.md

### Task 6.4: Add Health Check & Status Endpoints (0.25 days)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Create `/health` endpoint
2. ✅ Create `/api/status` endpoint
3. ✅ Return list of loaded products
4. ✅ Include server uptime and version
5. ✅ Add product metadata to status response

**Standards:** Follow API_STANDARDS.md

### Task 6.5: Create Product Route Index Files (0.25 days)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Create `backend/src/products/recruitiq/routes/index.js`
2. ✅ Import and mount all RecruitIQ sub-routes
3. ✅ Export combined router
4. ✅ Update product config to reference index
5. ✅ Test route mounting works

**Standards:** Follow BACKEND_STANDARDS.md

### Task 6.6: Implement Graceful Shutdown (0.25 days)

**Assignee:** Backend Lead

**Actions:**
1. ✅ Add SIGTERM handler
2. ✅ Add SIGINT handler
3. ✅ Close server connections gracefully
4. ✅ Add timeout for forced shutdown
5. ✅ Add logging for shutdown process

**Standards:** Follow BACKEND_STANDARDS.md

### Task 6.7: Test Server Startup & Routes (0.5 days)

**Assignee:** QA + Backend Team

**Actions:**
1. ✅ Start server and verify products load
2. ✅ Test all RecruitIQ endpoints still work
3. ✅ Test health check endpoint
4. ✅ Test status endpoint
5. ✅ Test 404 handler
6. ✅ Test error handler
7. ✅ Verify middleware applied correctly

**Standards:** Follow TESTING_STANDARDS.md

---

## 📋 Standards Compliance Checklist

- [ ] Code follows BACKEND_STANDARDS.md patterns
- [ ] Security middleware properly applied (SECURITY_STANDARDS.md)
- [ ] All routes tested per TESTING_STANDARDS.md
- [ ] Documentation follows DOCUMENTATION_STANDARDS.md
- [ ] API endpoints follow API_STANDARDS.md format
- [ ] Error handling follows standard patterns
- [ ] Logging comprehensive and structured

---

## 🎯 Success Criteria

Phase 6 is complete when:

1. ✅ Server starts successfully with product loader
2. ✅ All products loaded and registered
3. ✅ All product routes mounted correctly
4. ✅ Access control middleware applied to product routes
5. ✅ Health check endpoint returns product status
6. ✅ All existing endpoints still work (no regression)
7. ✅ Graceful shutdown works properly
8. ✅ All tests pass
9. ✅ Code review approved by 2+ engineers
10. ✅ No breaking changes to existing functionality

---

## 📤 Outputs

### Code Updated
- [ ] `backend/src/server.js` (refactored)
- [ ] `backend/src/products/recruitiq/routes/index.js` (new)

### Tests Created
- [ ] `tests/integration/server.test.js`
- [ ] `tests/integration/healthCheck.test.js`
- [ ] `tests/integration/productRouting.test.js`

### Documentation Updated
- [ ] Server architecture documentation
- [ ] Product mounting process
- [ ] API documentation for health/status endpoints

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Server fails to start | Critical | Comprehensive error handling; fallback mechanism |
| Route conflicts between products | High | Clear route prefix naming; validation in product loader |
| Middleware not applied correctly | High | Integration tests verify middleware chain |
| Performance degradation | Medium | Benchmark startup time; optimize product loading |
| Missing routes after refactor | High | Comprehensive endpoint testing |

---

## 🔗 Related Phases

- **Previous:** [Phase 5: Product Loader & Access Control](./PHASE_05_PRODUCT_LOADER.md)
- **Next:** [Phase 7: Integration Bus Infrastructure](./PHASE_07_INTEGRATION_BUS.md)
- **Related:** [Phase 4: RecruitIQ Product Restructuring](./PHASE_04_RECRUITIQ_RESTRUCTURING.md)

---

## ⏭️ Next Phase

**[Phase 7: Integration Bus Infrastructure](./PHASE_07_INTEGRATION_BUS.md)**

Upon completion of Phase 6, proceed to Phase 7 to implement the integration bus for cross-product communication and data synchronization.

---

**Phase Owner:** Backend Team Lead  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start
