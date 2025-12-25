/**
 * Server Entry Point
 * 
 * Industry Standard: Factory pattern with lazy initialization
 * - Lazy module loading to avoid circular dependencies
 * - Configuration validation
 * - App creation from factory
 * - Server startup
 * - Graceful shutdown
 */

// ============================================================================
// LAZY DEPENDENCIES (Avoid Circular Dependencies)
// ============================================================================

let config, validateConfiguration, logger, dbHealthCheck, closePool, closeCentralPool, createApp, productManager;
let dependenciesInitialized = false;

/**
 * Initialize dependencies lazily to avoid circular dependencies
 * Industry Standard: Lazy initialization pattern
 */
async function initDependencies() {
  if (dependenciesInitialized) return;
  
  const [
    configModule,
    validatorModule,
    loggerModule,
    dbModule,
    centralDbModule,
    appModule,
    pmModule
  ] = await Promise.all([
    import('./config/index.js'),
    import('./config/validator.js'),
    import('./utils/logger.js'),
    import('./config/database.js'),
    import('./config/centralDatabase.js'),
    import('./app.js'),
    import('./products/core/ProductManager.js')
  ]);
  
  config = configModule.default;
  validateConfiguration = validatorModule.validateConfiguration;
  logger = loggerModule.default;
  dbHealthCheck = dbModule.healthCheck;
  closePool = dbModule.closePool;
  closeCentralPool = centralDbModule.closeCentralPool;
  createApp = appModule.default;
  productManager = pmModule.default;
  
  dependenciesInitialized = true;
}

// ============================================================================
// INITIALIZE PRODUCTS
// ============================================================================

/**
 * Initialize Dynamic Product System
 * Industry Standard: Product plugin architecture
 */
async function initializeProducts() {
  try {
    logger.info('🔧 Initializing Dynamic Product System...');
    const router = await productManager.initialize();
    logger.info('✅ Dynamic Product System ready');
    logger.info('📍 Dynamic product routes available at /api/products');
    return router;
  } catch (error) {
    logger.error('Failed to initialize Product Manager:', error);
    logger.warn('⚠️  Server will continue without dynamic product loading');
    return null;
  }
}

// ============================================================================
// APP FACTORY
// ============================================================================

/**
 * Factory function to create and initialize the Express app
 * Industry Standard: Factory pattern with dependency injection
 * 
 * @returns {Promise<Express.Application>} Initialized Express app
 */
export async function createAndInitializeApp() {
  // Initialize dependencies lazily
  await initDependencies();
  
  // Validate configuration
  logger.info('Validating configuration...');
  try {
    validateConfiguration();
  } catch (error) {
    logger.error('Configuration validation failed:', error);
    throw error;
  }

  // Initialize products
  const dynamicProductRouter = await initializeProducts();
  
  // Create app with all required dependencies
  const app = createApp({
    config,
    logger,
    dbHealthCheck,
    dynamicProductRouter
  });
  
  return app;
}

// ============================================================================
// SERVER STARTUP (Only when run directly)
// ============================================================================

let server = null;

/**
 * Start HTTP server
 * Industry Standard: Separate server startup from app creation
 */
async function startServer() {
  try {
    // Initialize dependencies first
    await initDependencies();
    
    // Create and initialize app
    const app = await createAndInitializeApp();
    
    // Start HTTP server
    const PORT = process.env.PORT || config.port || 3001;
    server = app.listen(PORT, async () => {
      logger.info('═══════════════════════════════════════════════════');
      logger.info(`✓ RecruitIQ API Server started`);
      logger.info(`✓ Environment: ${config.env || process.env.NODE_ENV}`);
      logger.info(`✓ Port: ${PORT}`);
      logger.info(`✓ API Base: http://localhost:${PORT}/api`);
      logger.info(`✓ Health Check: http://localhost:${PORT}/health`);
      logger.info('═══════════════════════════════════════════════════');
      
      // Database health check
      try {
        await dbHealthCheck();
        logger.info('✓ Database connection verified');
      } catch (error) {
        logger.error('✗ Database connection failed:', error);
      }
    });

    return { app, server };
  } catch (error) {
    if (logger) {
      logger.error('Failed to start server:', error);
    } else {
      console.error('Failed to start server:', error);
    }
    process.exit(1);
  }
}

// Only start server if this file is run directly (not imported for tests)
// Handle both direct execution and nodemon execution
const isMainModule = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` || 
                     process.argv[1]?.endsWith('src/server.js') ||
                     process.argv[1]?.endsWith('/server.js') ||
                     import.meta.url.endsWith('/src/server.js');

if (isMainModule && process.env.NODE_ENV !== 'test') {
  startServer().catch(error => {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  });
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Gracefully shutdown server and close connections
 * Industry Standard: Proper resource cleanup
 */
async function gracefulShutdown(signal) {
  // Only log if logger is initialized
  if (logger) {
    logger.info(`\n${signal} received, shutting down gracefully...`);
  } else {
    console.log(`\n${signal} received, shutting down gracefully...`);
  }
  
  // Close HTTP server if running
  if (server) {
    server.close(async () => {
      if (logger) logger.info('HTTP server closed');
      await cleanupResources();
    });
  } else {
    await cleanupResources();
  }
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    if (logger) {
      logger.error('Forced shutdown after timeout');
    } else {
      console.error('Forced shutdown after timeout');
    }
    process.exit(1);
  }, 10000);
}

/**
 * Cleanup resources (database connections, etc.)
 */
async function cleanupResources() {
  try {
    // Close database connections if initialized
    if (closePool) {
      await closePool();
      if (logger) logger.info('Database connections closed');
    }
    
    if (closeCentralPool) {
      await closeCentralPool();
      if (logger) logger.info('Central database connections closed');
    }
    
    process.exit(0);
  } catch (error) {
    if (logger) {
      logger.error('Error during shutdown:', error);
    } else {
      console.error('Error during shutdown:', error);
    }
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  if (logger) {
    logger.error('Uncaught Exception:', error);
  } else {
    console.error('Uncaught Exception:', error);
  }
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  if (logger) {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  } else {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  }
  gracefulShutdown('unhandledRejection');
});

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

/**
 * Default export for integration tests
 * Creates and initializes the app for testing without starting the server
 */
export default createAndInitializeApp();
