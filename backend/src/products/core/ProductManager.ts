/**
 * Product Manager
 * Orchestrates product loading, route registration, and lifecycle management
 */

import logger from '../../utils/logger.ts';
import productLoader from './ProductLoader.ts';
import routeRegistry from './RouteRegistry.ts';

class ProductManager {
  constructor() {
    this.initialized = false;
    this.initializationError = null;
  }

  /**
   * Initialize the product management system
   * Loads products and registers routes
   */
  async initialize(app) {
    try {
      if (this.initialized) {
        logger.warn('Product Manager already initialized');
        return;
      }

      logger.info('🎯 Initializing Product Manager...');
      logger.info('════════════════════════════════════════════════════════════');

      // Step 1: Load all products
      logger.info('Step 1/3: Loading products...');
      const products = await productLoader.initialize();
      logger.info(`✓ Loaded ${products.length} products\n`);

      // Step 2: Register routes
      logger.info('Step 2/3: Registering routes...');
      const router = await routeRegistry.initialize(app);
      logger.info(`✓ Registered routes for ${routeRegistry.getStats().totalRegistered} products\n`);

      // Step 3: Validation
      logger.info('Step 3/3: Validating configuration...');
      const validation = routeRegistry.validateRoutes();
      if (!validation.valid) {
        logger.warn('Route validation found issues:', validation.issues);
      } else {
        logger.info('✓ All routes validated successfully\n');
      }

      this.initialized = true;

      // Print summary
      this.printSummary();

      logger.info('════════════════════════════════════════════════════════════');
      logger.info('✅ Product Manager initialized successfully\n');

      return router;
    } catch (error) {
      this.initializationError = error;
      logger.error('❌ Failed to initialize Product Manager:', error);
      throw error;
    }
  }

  /**
   * Print initialization summary
   */
  printSummary() {
    logger.info('📊 PRODUCT MANAGER SUMMARY');
    logger.info('────────────────────────────────────────────────────────────');

    // Products summary
    const productsStats = productLoader.getStats();
    logger.info('Products:');
    logger.info(`  • Total loaded: ${productsStats.totalProducts}`);
    logger.info(`  • With routes: ${productsStats.productsWithRoutes}`);
    logger.info(`  • With middleware: ${productsStats.productsWithMiddleware}`);

    // Routes summary
    const routesStats = routeRegistry.getStats();
    logger.info('\nRoutes:');
    logger.info(`  • Total registered: ${routesStats.totalRegistered}`);
    
    // List each product's routes
    if (routesStats.routes.length > 0) {
      logger.info('\nRegistered Endpoints:');
      routesStats.routes.forEach(route => {
        const middlewareInfo = route.middlewareCount > 0 ? ` [${route.middlewareCount} middleware]` : '';
        logger.info(`  • ${route.basePath} → ${route.product} (${route.status})${middlewareInfo}`);
      });
    }

    logger.info('');
  }

  /**
   * Get initialized router for Express app
   */
  getRouter() {
    if (!this.initialized) {
      throw new Error('Product Manager not initialized. Call initialize() first.');
    }
    return routeRegistry.getRouter();
  }

  /**
   * Load a new product at runtime
   */
  async loadProduct(product) {
    try {
      logger.info(`Loading new product: ${product.name}`);

      // Load product
      const loadedProduct = await productLoader.loadProduct(product);

      // Register routes
      await routeRegistry.registerProductRoutes(loadedProduct);

      logger.info(`✅ Successfully loaded and registered product: ${product.name}`);
      return loadedProduct;
    } catch (error) {
      logger.error(`Failed to load product ${product.name}:`, error);
      throw error;
    }
  }

  /**
   * Unload a product
   */
  unloadProduct(slug) {
    try {
      logger.info(`Unloading product: ${slug}`);

      // Unregister routes
      routeRegistry.unregisterProductRoutes(slug);

      // Unload product
      productLoader.unloadProduct(slug);

      logger.info(`✅ Product unloaded: ${slug}`);
      logger.warn('⚠️  Note: Full removal requires server restart');
      
      return true;
    } catch (error) {
      logger.error(`Failed to unload product ${slug}:`, error);
      return false;
    }
  }

  /**
   * Reload a product (hot reload)
   */
  async reloadProduct(slug) {
    try {
      logger.info(`Reloading product: ${slug}`);

      // Reload routes
      await routeRegistry.reloadProductRoutes(slug);

      logger.info(`✅ Product reloaded: ${slug}`);
      logger.warn('⚠️  Note: Full reload requires server restart');
      
      return true;
    } catch (error) {
      logger.error(`Failed to reload product ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Get product information
   */
  getProduct(slug) {
    return productLoader.getProduct(slug);
  }

  /**
   * Get all loaded products
   */
  getAllProducts() {
    return productLoader.getAllProducts();
  }

  /**
   * Get route information
   */
  getRoutes() {
    return routeRegistry.listRoutes();
  }

  /**
   * Get complete system status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      initializationError: this.initializationError?.message || null,
      products: productLoader.getStats(),
      routes: routeRegistry.getStats(),
      timestamp: new Date()
    };
  }

  /**
   * Health check
   */
  healthCheck() {
    const status = this.getStatus();
    
    return {
      healthy: this.initialized && !this.initializationError,
      status: this.initialized ? 'running' : 'not-initialized',
      products: {
        loaded: status.products.totalProducts,
        withRoutes: status.products.productsWithRoutes
      },
      routes: {
        registered: status.routes.totalRegistered
      },
      timestamp: status.timestamp
    };
  }

  /**
   * Check if system is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Reset (for testing)
   */
  reset() {
    this.initialized = false;
    this.initializationError = null;
    logger.info('Product Manager reset');
  }
}

// Singleton instance
const productManager = new ProductManager();

export default productManager;
