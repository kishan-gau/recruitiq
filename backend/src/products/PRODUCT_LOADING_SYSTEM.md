# Dynamic Product Loading System

## Overview

The Dynamic Product Loading System enables the RecruitIQ backend to automatically discover, load, and mount product modules at runtime. This allows for a plugin-based architecture where products can be added, removed, or updated without modifying the core server code.

## Architecture

### Components

1. **ProductLoader** (`ProductLoader.js`)
   - Discovers and loads product modules from npm packages or local paths
   - Manages product lifecycle (load, unload, reload)
   - Validates product module structure
   - Maintains registry of loaded products

2. **RouteRegistry** (`RouteRegistry.js`)
   - Dynamically registers Express routes from loaded products
   - Manages route prefixes and middleware
   - Handles route metadata and lookup
   - Supports route validation

3. **ProductManager** (`ProductManager.js`)
   - Orchestrates ProductLoader and RouteRegistry
   - Provides unified API for product management
   - Handles initialization and lifecycle events
   - Exposes admin endpoints for monitoring

### Flow

```
Server Startup
    ↓
Initialize ProductManager
    ↓
ProductLoader.initialize()
    ├─ Get active products from database
    ├─ For each product:
    │   ├─ Resolve module path (npm or local)
    │   ├─ Dynamic import of product module
    │   ├─ Validate module structure
    │   └─ Store in registry
    └─ Return loaded products
    ↓
RouteRegistry.initialize()
    ├─ For each loaded product:
    │   ├─ Get base path from product config
    │   ├─ Apply product middleware
    │   ├─ Mount routes on product router
    │   └─ Register on main router
    └─ Return configured router
    ↓
Mount router on Express app
    ↓
Server Ready
```

## Product Module Structure

Each product must export a module with the following structure:

```javascript
// products/{slug}/index.js

export default {
  // Product configuration (required)
  config: {
    name: 'Product Name',
    version: '1.0.0',
    description: 'Product description',
    features: ['feature1', 'feature2']
  },

  // Express router with product routes (optional)
  routes: router,

  // Array of Express middleware functions (optional)
  middleware: [
    (req, res, next) => {
      // Product-specific middleware
      next();
    }
  ],

  // Lifecycle hooks (optional)
  hooks: {
    onLoad: async () => {
      // Called when product is loaded
    },
    onUnload: async () => {
      // Called when product is unloaded
    },
    onStartup: async () => {
      // Called on server startup
    },
    onShutdown: async () => {
      // Called on server shutdown
    }
  }
};
```

## Database Schema

Products are registered in the `products` table:

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  version VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  is_core BOOLEAN DEFAULT false,
  base_path VARCHAR(100),
  npm_package VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Key Fields

- **slug**: Unique identifier used for module loading
- **status**: Product status (`active`, `beta`, `deprecated`, `inactive`)
- **is_core**: Whether product is core (always loaded) or add-on
- **base_path**: URL prefix for product routes (e.g., `/api/nexus`)
- **npm_package**: NPM package name for add-on products

## Module Resolution

The ProductLoader resolves product modules in this order:

1. **NPM Package** (for add-ons)
   - Uses `npm_package` field from database
   - Resolves using Node's module resolution
   - Example: `@recruitiq/paylinq`

2. **Local Path** (for core products and development)
   - Checks standard locations:
     - `backend/src/products/{slug}/routes/index.js`
     - `backend/src/products/{slug}/index.js`
   - Falls back to custom paths if configured

3. **Remote URL** (future enhancement)
   - Load products from remote registries
   - Version management and updates

## Usage

### Initialization

The Product Manager is automatically initialized when the server starts:

```javascript
// server.js
import productManager from './products/core/ProductManager.js';

// After server starts
server.listen(PORT, async () => {
  await initializeProducts();
});

const initializeProducts = async () => {
  const router = await productManager.initialize(app);
  apiRouter.use('/products', authenticate, router);
};
```

### Loading a Product at Runtime

```javascript
import productManager from './products/core/ProductManager.js';

// Load new product
const product = await getProductFromDatabase('new-product');
await productManager.loadProduct(product);
```

### Reloading a Product (Hot Reload)

```javascript
// Reload product (useful for development)
await productManager.reloadProduct('nexus');

// Note: Full reload requires server restart
```

### Unloading a Product

```javascript
// Unload product
productManager.unloadProduct('old-product');

// Note: Routes remain active until server restart
```

## Admin API Endpoints

### GET /api/system/products/status
Get product system status and statistics.

**Authentication**: Super Admin or Admin

**Response**:
```json
{
  "initialized": true,
  "products": {
    "totalProducts": 5,
    "productsWithRoutes": 4,
    "productsWithMiddleware": 2
  },
  "routes": {
    "totalRegistered": 4
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/system/products/health
Health check for product system.

**Authentication**: Super Admin or Admin

**Response**:
```json
{
  "healthy": true,
  "status": "running",
  "products": {
    "loaded": 5,
    "withRoutes": 4
  },
  "routes": {
    "registered": 4
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/system/products/list
List all loaded products.

**Authentication**: Super Admin or Admin

**Response**:
```json
{
  "count": 5,
  "products": [
    {
      "slug": "nexus",
      "name": "Nexus",
      "version": "1.0.0",
      "status": "active",
      "isCore": true,
      "hasRoutes": true,
      "middlewareCount": 1,
      "loadedAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

### GET /api/system/products/routes
List all registered routes.

**Authentication**: Super Admin or Admin

**Response**:
```json
{
  "count": 4,
  "routes": [
    {
      "product": "Nexus",
      "slug": "nexus",
      "basePath": "/api/nexus",
      "status": "active",
      "version": "1.0.0",
      "middlewareCount": 1
    }
  ]
}
```

### GET /api/system/products/:slug
Get details for a specific product.

**Authentication**: Super Admin or Admin

**Response**:
```json
{
  "slug": "nexus",
  "name": "Nexus",
  "version": "1.0.0",
  "description": "Core HRIS Management System",
  "status": "active",
  "isCore": true,
  "basePath": "/api/nexus",
  "npmPackage": null,
  "modulePath": "C:\\RecruitIQ\\backend\\src\\products\\nexus\\index.js",
  "hasRoutes": true,
  "middleware": 1,
  "config": {
    "name": "Nexus",
    "version": "1.0.0"
  },
  "loadedAt": "2024-01-15T10:00:00.000Z"
}
```

### POST /api/system/products/:slug/reload
Reload a specific product (hot reload).

**Authentication**: Super Admin only

**Response**:
```json
{
  "success": true,
  "message": "Product nexus reloaded successfully",
  "warning": "Full reload requires server restart"
}
```

### POST /api/system/products/:slug/unload
Unload a specific product.

**Authentication**: Super Admin only

**Response**:
```json
{
  "success": true,
  "message": "Product nexus unloaded successfully",
  "warning": "Full removal requires server restart"
}
```

## Development Workflow

### Creating a New Product

1. **Add to Database**
   ```sql
   INSERT INTO products (name, slug, description, version, status, is_core, base_path)
   VALUES ('MyProduct', 'myproduct', 'My awesome product', '1.0.0', 'active', false, '/api/myproduct');
   ```

2. **Create Product Module**
   ```
   backend/src/products/myproduct/
   ├── index.js           # Product module entry point
   ├── routes/
   │   └── index.js       # Express routes
   ├── controllers/
   │   └── ...            # Controllers
   ├── services/
   │   └── ...            # Business logic
   └── models/
       └── ...            # Data models
   ```

3. **Export Product Module**
   ```javascript
   // products/myproduct/index.js
   import routes from './routes/index.js';

   export default {
     config: {
       name: 'MyProduct',
       version: '1.0.0'
     },
     routes
   };
   ```

4. **Restart Server**
   - Product will be automatically discovered and loaded
   - Routes will be mounted at `/api/myproduct`

### Testing Hot Reload

```bash
# Make changes to product code

# Reload product via API
curl -X POST http://localhost:3000/api/system/products/myproduct/reload \
  -H "Authorization: Bearer YOUR_TOKEN"

# Or reload programmatically
await productManager.reloadProduct('myproduct');
```

## Best Practices

### Product Module Design

1. **Keep modules self-contained**: Each product should manage its own routes, services, and models
2. **Use middleware for common logic**: Apply product-specific middleware in the product module
3. **Follow naming conventions**: Use consistent slugs, base paths, and module structure
4. **Version your products**: Update version field when making changes
5. **Handle initialization errors**: Products should gracefully handle loading failures

### Route Organization

1. **Use consistent base paths**: Follow pattern `/api/{slug}`
2. **Apply authentication in router**: Don't rely on global auth for product routes
3. **Document your endpoints**: Include API documentation in product README
4. **Use route prefixes wisely**: Group related endpoints under common prefixes

### Performance Considerations

1. **Lazy load when possible**: Only load products when needed
2. **Cache module imports**: ProductLoader caches loaded modules
3. **Minimize middleware overhead**: Use middleware judiciously
4. **Monitor product metrics**: Track load times and route performance

## Limitations

### Current Limitations

1. **Route Removal**: Express doesn't support dynamic route removal - requires server restart
2. **Module Caching**: Node.js caches imports - hot reload has limitations
3. **Database Dependency**: Products must be registered in database to be discovered
4. **Synchronous Loading**: Products loaded sequentially during initialization

### Future Enhancements

1. **Async Product Loading**: Load non-critical products asynchronously
2. **Remote Plugin Registry**: Load products from remote URLs
3. **Version Management**: Support multiple versions of same product
4. **Dependency Management**: Handle inter-product dependencies
5. **Plugin Marketplace**: Browse and install products via web UI

## Troubleshooting

### Product Not Loading

**Issue**: Product shows in database but doesn't load

**Solutions**:
- Check product status is `active`
- Verify module path exists
- Check module exports correct structure
- Review server logs for import errors

### Routes Not Working

**Issue**: Product loaded but routes return 404

**Solutions**:
- Verify `base_path` in database matches route prefix
- Check route registration in logs
- Test routes with correct base path
- Verify authentication middleware

### Hot Reload Not Working

**Issue**: Changes not reflected after reload

**Solutions**:
- Note: Full reload requires server restart
- Check if module is cached by Node.js
- Try unload then load instead of reload
- Restart server for guaranteed fresh load

### Module Import Errors

**Issue**: `Cannot find module` or import errors

**Solutions**:
- Check file paths use .js extension for ES modules
- Verify all imports use correct relative paths
- Check module exports default or named exports correctly
- Review syntax for ES6 import/export

## Examples

See `backend/src/products/nexus/index.js` for a complete product module example.

## Support

For issues or questions about the product loading system:
- Review server logs during startup
- Check `/api/system/products/status` endpoint
- Use `/api/system/products/health` for health check
- Contact platform team for assistance
