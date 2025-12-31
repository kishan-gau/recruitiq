/**
 * Route Registry
 * Dynamically registers and manages Express routes from loaded products
 */

import express from 'express';
import logger from '../../utils/logger.js';
import productLoader from './ProductLoader.js';

class RouteRegistry {
  constructor() {
    this.mainRouter = express.Router();
    this.registeredRoutes = new Map();
    this.routeMetadata = new Map();
  }

  /**
   * Initialize and register all product routes
   */
  async initialize(app) {
    try {
      logger.info('🛣️  Initializing Route Registry...');

      // Get all loaded products
      const products = productLoader.getAllProducts();
      
      if (products.length === 0) {
        logger.warn('No products loaded, skipping route registration');
        return this.mainRouter;
      }

      // Register routes for each product
      for (const loadedProduct of products) {
        try {
          await this.registerProductRoutes(loadedProduct);
        } catch (_error) {
          logger.error(`Failed to register routes for ${loadedProduct.product.name}:`, error);
          // Continue with other products
        }
      }

      logger.info(`✅ Route Registry initialized. Registered ${this.registeredRoutes.size} product routes.`);
      return this.mainRouter;
    } catch (_error) {
      logger.error('Failed to initialize Route Registry:', error);
      throw error;
    }
  }

  /**
   * Register routes for a single product
   */
  async registerProductRoutes(loadedProduct) {
    try {
      const { product, routes, middleware } = loadedProduct;
      
      if (!routes) {
        logger.info(`  ⊘ Product ${product.name} has no routes to register`);
        return;
      }

      logger.info(`  📍 Registering routes for: ${product.name}`);

      // Get base path for the product
      const basePath = this.getProductBasePath(product);
      logger.info(`     Base path: ${basePath}`);

      // Create product-specific router
      const productRouter = express.Router();

      // Apply product middleware if any
      if (middleware && middleware.length > 0) {
        logger.info(`     Applying ${middleware.length} middleware(s)`);
        middleware.forEach(mw => {
          if (typeof mw === 'function') {
            productRouter.use(mw);
          }
        });
      }

      // Mount product routes
      productRouter.use('/', routes);

      // Mount product router on main router
      this.mainRouter.use(basePath, productRouter);

      // Store registration info
      const routeInfo = {
        product,
        basePath,
        router: productRouter,
        routes,
        middleware,
        registeredAt: new Date()
      };

      this.registeredRoutes.set(product.slug, routeInfo);
      this.routeMetadata.set(basePath, {
        slug: product.slug,
        name: product.name,
        version: product.version
      });

      logger.info(`  ✅ Registered routes for ${product.name} at ${basePath}`);
    } catch (_error) {
      logger.error(`Failed to register routes for ${loadedProduct.product.name}:`, error);
      throw error;
    }
  }

  /**
   * Get base path for product routes
   */
  getProductBasePath(product) {
    // Use product's basePath if specified, otherwise derive from slug
    if (product.basePath) {
      // Ensure it starts with /
      return product.basePath.startsWith('/') ? product.basePath : `/${product.basePath}`;
    }

    // Default: /{slug} (will be mounted under /api/products in server.js)
    return `/${product.slug}`;
  }

  /**
   * Unregister product routes
   */
  unregisterProductRoutes(slug) {
    try {
      const routeInfo = this.registeredRoutes.get(slug);
      if (!routeInfo) {
        logger.warn(`No routes registered for product: ${slug}`);
        return false;
      }

      // Note: Express doesn't support removing routes dynamically
      // We mark it as unregistered but can't remove from router
      // Full removal requires server restart
      this.registeredRoutes.delete(slug);
      this.routeMetadata.delete(routeInfo.basePath);

      logger.info(`🗑️  Unregistered routes for: ${slug}`);
      logger.warn('⚠️  Note: Routes still active until server restart');
      
      return true;
    } catch (_error) {
      logger.error(`Failed to unregister routes for ${slug}:`, error);
      return false;
    }
  }

  /**
   * Get router for mounting on Express app
   */
  getRouter() {
    return this.mainRouter;
  }

  /**
   * Get route info for a product
   */
  getRouteInfo(slug) {
    return this.registeredRoutes.get(slug);
  }

  /**
   * Get all registered routes
   */
  getAllRoutes() {
    return Array.from(this.registeredRoutes.entries()).map(([slug, info]) => ({
      slug,
      name: info.product.name,
      basePath: info.basePath,
      hasMiddleware: info.middleware && info.middleware.length > 0,
      registeredAt: info.registeredAt
    }));
  }

  /**
   * Get route metadata by path
   */
  getRouteMetadata(path) {
    // Check exact match
    if (this.routeMetadata.has(path)) {
      return this.routeMetadata.get(path);
    }

    // Check prefix match
    for (const [basePath, metadata] of this.routeMetadata.entries()) {
      if (path.startsWith(basePath)) {
        return metadata;
      }
    }

    return null;
  }

  /**
   * List all registered route paths
   */
  listRoutes() {
    const routes = [];
    
    for (const [slug, info] of this.registeredRoutes.entries()) {
      routes.push({
        product: info.product.name,
        slug: slug,
        basePath: info.basePath,
        status: info.product.status,
        version: info.product.version,
        middlewareCount: info.middleware ? info.middleware.length : 0
      });
    }

    return routes;
  }

  /**
   * Check if routes are registered for a product
   */
  hasRoutes(slug) {
    return this.registeredRoutes.has(slug);
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      totalRegistered: this.registeredRoutes.size,
      totalPaths: this.routeMetadata.size,
      routes: this.listRoutes()
    };
  }

  /**
   * Hot reload routes for a product (requires server restart for full effect)
   */
  async reloadProductRoutes(slug) {
    try {
      logger.info(`🔄 Reloading routes for: ${slug}`);

      // Unregister existing routes
      this.unregisterProductRoutes(slug);

      // Reload product
      await productLoader.reloadProduct(slug);

      // Get reloaded product
      const loadedProduct = productLoader.getProduct(slug);
      if (!loadedProduct) {
        throw new Error(`Failed to reload product: ${slug}`);
      }

      // Register new routes
      await this.registerProductRoutes(loadedProduct);

      logger.info(`✅ Successfully reloaded routes for: ${slug}`);
      logger.warn('⚠️  Note: Full reload requires server restart');
      
      return true;
    } catch (_error) {
      logger.error(`Failed to reload routes for ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Validate route registration
   */
  validateRoutes() {
    const issues = [];

    for (const [slug, info] of this.registeredRoutes.entries()) {
      // Check if product still loaded
      if (!productLoader.isLoaded(slug)) {
        issues.push({
          slug,
          issue: 'Product not loaded but routes registered'
        });
      }

      // Check if routes are valid
      if (!info.routes || typeof info.routes !== 'function') {
        issues.push({
          slug,
          issue: 'Invalid routes (not a router function)'
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// Singleton instance
const routeRegistry = new RouteRegistry();

export default routeRegistry;
