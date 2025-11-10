/**
 * Product Loader
 * Dynamic system for discovering and loading product modules at runtime
 * Supports npm packages, local modules, and remote plugins
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../utils/logger.js';
import { productService } from '../nexus/services/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductLoader {
  constructor() {
    this.loadedProducts = new Map();
    this.productRoutes = new Map();
    this.productMiddleware = new Map();
    this.productModules = new Map();
  }

  /**
   * Initialize and load all active products
   */
  async initialize() {
    try {
      logger.info('🚀 Initializing Product Loader...');
      
      // Get all active products from database
      const products = await productService.getActiveProducts();
      logger.info(`📦 Found ${products.length} active products`);

      // Load each product
      for (const product of products) {
        try {
          await this.loadProduct(product);
        } catch (error) {
          logger.error(`Failed to load product ${product.name}:`, error);
          // Continue loading other products even if one fails
        }
      }

      logger.info(`✅ Product Loader initialized. Loaded ${this.loadedProducts.size} products.`);
      return Array.from(this.loadedProducts.values());
    } catch (error) {
      logger.error('Failed to initialize Product Loader:', error);
      throw error;
    }
  }

  /**
   * Load a single product module
   */
  async loadProduct(product) {
    try {
      logger.info(`📦 Loading product: ${product.name} (${product.slug})`);

      // Check if already loaded
      if (this.loadedProducts.has(product.slug)) {
        logger.warn(`Product ${product.slug} is already loaded`);
        return this.loadedProducts.get(product.slug);
      }

      // Determine product module path
      const modulePath = await this.resolveProductModule(product);
      if (!modulePath) {
        logger.info(`  ⊘ No backend module found for ${product.name} - skipping (frontend-only product)`);
        return null;
      }

      // Load the product module
      const productModule = await this.importProductModule(modulePath, product);
      
      // Validate product module structure
      this.validateProductModule(productModule, product);

      // Store loaded product info
      const loadedProduct = {
        product,
        module: productModule,
        modulePath,
        routes: productModule.routes || null,
        middleware: productModule.middleware || [],
        config: productModule.config || {},
        loadedAt: new Date()
      };

      this.loadedProducts.set(product.slug, loadedProduct);
      
      if (productModule.routes) {
        this.productRoutes.set(product.slug, productModule.routes);
      }
      
      if (productModule.middleware && productModule.middleware.length > 0) {
        this.productMiddleware.set(product.slug, productModule.middleware);
      }

      logger.info(`✅ Successfully loaded product: ${product.name}`);
      return loadedProduct;
    } catch (error) {
      logger.error(`Failed to load product ${product.name}:`, error);
      throw error;
    }
  }

  /**
   * Resolve product module path
   * Checks: npm package, local path, core products
   */
  async resolveProductModule(product) {
    try {
      // 1. Try npm package (for add-on products)
      if (product.npmPackage) {
        try {
          const npmPath = await this.resolveNpmPackage(product.npmPackage);
          if (npmPath) {
            logger.info(`  ✓ Resolved npm package: ${product.npmPackage}`);
            return npmPath;
          }
        } catch (error) {
          logger.warn(`  ✗ npm package not found: ${product.npmPackage}`);
        }
      }

      // 2. Try local path (for core products and development)
      const localPath = this.resolveLocalPath(product);
      if (localPath) {
        logger.info(`  ✓ Resolved local path: ${localPath}`);
        return localPath;
      }

      // 3. No resolution found - return null instead of throwing
      // This allows frontend-only products (like RecruitIQ, Portal) to exist without backend modules
      logger.info(`  ⊘ No module resolution found for ${product.name}`);
      return null;
    } catch (error) {
      logger.error(`Failed to resolve product module for ${product.name}:`, error);
      // Return null instead of throwing to allow graceful degradation
      return null;
    }
  }

  /**
   * Resolve npm package path
   */
  async resolveNpmPackage(packageName) {
    try {
      // Try to resolve using node's module resolution
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      
      try {
        const packagePath = require.resolve(packageName);
        return packagePath;
      } catch (error) {
        // Package not installed
        return null;
      }
    } catch (error) {
      logger.error(`Error resolving npm package ${packageName}:`, error);
      return null;
    }
  }

  /**
   * Resolve local product path
   */
  resolveLocalPath(product) {
    // Common locations to check
    const possiblePaths = [
      // Standard location: backend/src/products/{slug}/routes/index.js
      path.join(__dirname, '..', product.slug, 'routes', 'index.js'),
      
      // Alternative: backend/src/products/{slug}/index.js
      path.join(__dirname, '..', product.slug, 'index.js'),
      
      // Development: direct path if specified
      product.basePath ? path.join(process.cwd(), 'src', 'products', product.slug, 'routes', 'index.js') : null
    ].filter(Boolean);

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }

    return null;
  }

  /**
   * Import product module dynamically
   */
  async importProductModule(modulePath, product) {
    try {
      // Convert to file URL for ES module import
      const fileUrl = `file:///${modulePath.replace(/\\/g, '/')}`;
      
      // Dynamic import
      const module = await import(fileUrl);
      
      // Handle both default and named exports
      return module.default || module;
    } catch (error) {
      logger.error(`Failed to import module for ${product.name}:`, error);
      throw error;
    }
  }

  /**
   * Validate product module structure
   */
  validateProductModule(productModule, product) {
    if (!productModule) {
      throw new Error(`Product module is empty for ${product.name}`);
    }

    // Routes are optional but should be an Express Router if present
    if (productModule.routes && typeof productModule.routes !== 'function') {
      logger.warn(`Product ${product.name} routes is not a function/router`);
    }

    // Middleware should be an array if present
    if (productModule.middleware && !Array.isArray(productModule.middleware)) {
      throw new Error(`Product ${product.name} middleware must be an array`);
    }

    return true;
  }

  /**
   * Get loaded product by slug
   */
  getProduct(slug) {
    return this.loadedProducts.get(slug);
  }

  /**
   * Get all loaded products
   */
  getAllProducts() {
    return Array.from(this.loadedProducts.values());
  }

  /**
   * Get product routes by slug
   */
  getProductRoutes(slug) {
    return this.productRoutes.get(slug);
  }

  /**
   * Get all product routes
   */
  getAllRoutes() {
    return Array.from(this.productRoutes.entries()).map(([slug, routes]) => ({
      slug,
      routes,
      product: this.loadedProducts.get(slug)?.product
    }));
  }

  /**
   * Get product middleware by slug
   */
  getProductMiddleware(slug) {
    return this.productMiddleware.get(slug) || [];
  }

  /**
   * Reload a product (hot reload for development)
   */
  async reloadProduct(slug) {
    try {
      logger.info(`🔄 Reloading product: ${slug}`);

      // Get product info
      const loadedProduct = this.loadedProducts.get(slug);
      if (!loadedProduct) {
        throw new Error(`Product ${slug} is not loaded`);
      }

      // Remove from cache
      this.unloadProduct(slug);

      // Reload
      const product = loadedProduct.product;
      await this.loadProduct(product);

      logger.info(`✅ Successfully reloaded product: ${slug}`);
      return this.loadedProducts.get(slug);
    } catch (error) {
      logger.error(`Failed to reload product ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Unload a product
   */
  unloadProduct(slug) {
    this.loadedProducts.delete(slug);
    this.productRoutes.delete(slug);
    this.productMiddleware.delete(slug);
    logger.info(`🗑️  Unloaded product: ${slug}`);
  }

  /**
   * Check if product is loaded
   */
  isLoaded(slug) {
    return this.loadedProducts.has(slug);
  }

  /**
   * Get loader statistics
   */
  getStats() {
    return {
      totalProducts: this.loadedProducts.size,
      productsWithRoutes: this.productRoutes.size,
      productsWithMiddleware: this.productMiddleware.size,
      products: Array.from(this.loadedProducts.keys())
    };
  }
}

// Singleton instance
const productLoader = new ProductLoader();

export default productLoader;
