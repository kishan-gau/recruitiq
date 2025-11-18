import express from 'express';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import { validateConfiguration } from './config/validator.js';
import logger from './utils/logger.js';
import { healthCheck as dbHealthCheck, closePool } from './config/database.js';
import { closeCentralPool } from './config/centralDatabase.js';

// Import security middleware
import { enhancedHelmetMiddleware, additionalSecurityHeaders } from './middleware/securityHeaders.js';
import { enhancedCorsMiddleware, corsErrorHandler, handlePreflight, logCorsRequests } from './middleware/cors.js';
import { 
  globalLimiter, 
  authLimiter, 
  apiLimiter,
  addRateLimitHeaders,
  rateLimitManager 
} from './middleware/rateLimit.js';
import { csrfMiddleware, getCsrfToken, csrfErrorHandler } from './middleware/csrf.js';

// Import routes
import authRoutes from './routes/auth/authRoutes.js'; // New authentication system
import mfaRoutes from './routes/mfa.routes.js';
import organizationRoutes from './routes/organizations.js';
import userRoutes from './routes/users.js';
import platformUserRoutes from './routes/platformUsers.js';
import workspaceRoutes from './routes/workspaces.js';
import jobRoutes from './routes/jobs.js';
import candidateRoutes from './routes/candidates.js';
import applicationRoutes from './routes/applications.js';
import interviewRoutes from './routes/interviews.js';
import flowTemplateRoutes from './routes/flowTemplates.js';
import publicRoutes from './routes/public.js';
import communicationRoutes from './routes/communications.js';
import portalRoutes from './routes/portal.js';
import userManagementRoutes from './routes/userManagement.js';
import rolesPermissionsRoutes from './routes/rolesPermissions.js';
import securityRoutes from './routes/security.js';
import provisioningRoutes from './routes/provisioning.js';
import emailSettingsRoutes from './routes/emailSettings.js';

// Import Feature Management routes
import adminFeaturesRoutes from './routes/adminFeatures.js';
import featuresRoutes from './routes/features.js';

// Import License Manager module routes
import licenseAdminRoutes from './modules/license/routes/admin.js';
import licenseValidationRoutes from './modules/license/routes/validation.js';
import licenseTelemetryRoutes from './modules/license/routes/telemetry.js';
import licenseTierRoutes from './modules/license/routes/tiers.js';

// Import Product Management routes (Core Platform)
import productManagementRoutes from './products/nexus/routes/productManagementRoutes.js';

// Import Product System Management routes (Admin)
import systemRoutes from './products/nexus/routes/systemRoutes.js';

// Import Product Manager (Dynamic Product Loading System)
import productManager from './products/core/ProductManager.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import requestIdMiddleware from './middleware/requestId.js';
import { authenticate } from './middleware/auth.js';
import { secureRequest, blockFilePathInjection } from './middleware/requestSecurity.js';
import { timezoneMiddleware, timezoneHeaderMiddleware } from './middleware/timezone.js';

const app = express();

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

// Validate configuration at startup
logger.info('Validating configuration...');
try {
  validateConfiguration();
} catch (error) {
  logger.error('Configuration validation failed. Exiting...', error);
  process.exit(1);
}

// Trust proxy if behind reverse proxy (production)
if (config.security.trustProxy) {
  app.set('trust proxy', 1);
}

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// HTTPS redirect in production
if (config.security.requireHttps) {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// Enhanced Security Headers (Helmet)
app.use(enhancedHelmetMiddleware());

// Additional custom security headers
app.use(additionalSecurityHeaders());

// Enhanced CORS with whitelist validation
app.use(logCorsRequests());
app.use(enhancedCorsMiddleware());
app.use(handlePreflight());

// CORS error handler
app.use(corsErrorHandler);

// Add rate limit info to response headers
app.use(addRateLimitHeaders);

// Enhanced rate limiting with Redis support
// Apply global rate limiter to all API routes
app.use('/api/', globalLimiter);

// Stricter rate limiting for authentication endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// ============================================================================
// BODY PARSING & COOKIES
// ============================================================================

// Body parsing with security limits (reduced from 10mb to 1mb for security)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Parse cookies for SSO support and CSRF tokens
// Use signed cookies for CSRF protection
app.use(cookieParser(config.security.sessionSecret));

// ============================================================================
// INPUT VALIDATION & SANITIZATION
// ============================================================================

// Global input security: validate and sanitize all requests
// Protects against XSS, SQL injection, NoSQL injection, command injection
app.use('/api/', secureRequest({
  maxDepth: 5,
  stripXSS: true,
  blockDangerousPatterns: true,
}));

// Additional protection against file path injection
app.use('/api/', blockFilePathInjection());

// ============================================================================
// REQUEST TRACKING & LOGGING
// ============================================================================

// Add unique request ID to each request
app.use(requestIdMiddleware);

// Log all requests with enhanced context
app.use(requestLogger);

// Add timezone context to all requests (after auth middleware will be applied)
app.use(timezoneMiddleware);
app.use(timezoneHeaderMiddleware);

// ============================================================================
// HEALTH CHECK (No auth required)
// ============================================================================

app.get('/health', async (req, res) => {
  try {
    const dbHealth = await dbHealthCheck();
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env,
      version: '1.0.0',
      services: {
        database: dbHealth.status === 'healthy' ? 'ok' : 'degraded',
        api: 'ok',
      },
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        },
        cpu: process.cpuUsage(),
      }
    };
    
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: config.env === 'production' ? 'Service temporarily unavailable' : error.message,
    });
  }
});

// Liveness probe (simple check for orchestrators like Kubernetes)
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness probe (checks if app is ready to serve traffic)
app.get('/health/ready', async (req, res) => {
  try {
    const dbHealth = await dbHealthCheck();
    if (dbHealth.status === 'healthy') {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not_ready', reason: 'database_unavailable' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not_ready', reason: 'error' });
  }
});

app.get('/', (req, res) => {
  res.json({
    name: config.appName,
    version: '1.0.0',
    environment: config.env,
    documentation: `${config.appUrl}/api/docs`,
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

const apiRouter = express.Router();

// Initialize Product Manager and load all active products
// This happens asynchronously after server starts
let dynamicProductRouter = null;

// Create a middleware that forwards to the dynamic router once it's loaded
const dynamicProductMiddleware = (req, res, next) => {
  if (dynamicProductRouter) {
    dynamicProductRouter(req, res, next);
  } else {
    res.status(503).json({
      error: 'Dynamic product system not yet initialized',
      message: 'Please wait for the system to complete initialization'
    });
  }
};

const initializeProducts = async () => {
  try {
    logger.info('🔧 Initializing Dynamic Product System...');
    dynamicProductRouter = await productManager.initialize(app);
    logger.info('✅ Dynamic Product System ready');
    logger.info('📍 Dynamic product routes available at /api/products');
  } catch (error) {
    logger.error('Failed to initialize Product Manager:', error);
    logger.warn('⚠️  Server will continue without dynamic product loading');
  }
};

// CSRF token endpoint (must be accessible without CSRF token)
apiRouter.get('/csrf-token', getCsrfToken);

// Apply CSRF protection to state-changing operations on apiRouter
// This protects against cross-site request forgery attacks
// Note: Bearer token authenticated requests skip CSRF (see csrf.js)
apiRouter.use(csrfMiddleware);

// Public routes (no auth)
apiRouter.use('/auth', authRoutes); // New separated authentication (platform/tenant)
apiRouter.use('/public', publicRoutes);

// MFA routes (partially public - some endpoints use temporary MFA token)
apiRouter.use('/auth/mfa', mfaRoutes);

// Protected routes (require authentication)
// Note: Some routes handle their own public endpoints internally (jobs, applications)
apiRouter.use('/organizations', authenticate, organizationRoutes);
apiRouter.use('/users', authenticate, userRoutes);
apiRouter.use('/platform-users', platformUserRoutes); // Platform admin management (auth + super_admin check in routes)
apiRouter.use('/workspaces', authenticate, workspaceRoutes);
apiRouter.use('/jobs', jobRoutes);  // Has public endpoints - handles auth internally
apiRouter.use('/candidates', authenticate, candidateRoutes);
apiRouter.use('/applications', applicationRoutes);  // Has public endpoints - handles auth internally
apiRouter.use('/interviews', authenticate, interviewRoutes);
apiRouter.use('/flow-templates', authenticate, flowTemplateRoutes);
apiRouter.use('/communications', communicationRoutes);

// Portal routes (platform admin only - auth handled in routes)
apiRouter.use('/portal', portalRoutes);
apiRouter.use('/portal', provisioningRoutes);  // Client & VPS provisioning
apiRouter.use('/portal', userManagementRoutes);  // User management
apiRouter.use('/portal', rolesPermissionsRoutes);  // Roles & permissions management
apiRouter.use('/security', securityRoutes);

// Email Settings routes (shared across all products)
apiRouter.use('/settings/email', emailSettingsRoutes);

// License Manager routes (uses separate auth middleware)
apiRouter.use('/admin', licenseAdminRoutes);  // License Manager admin panel
apiRouter.use('/validate', licenseValidationRoutes);  // License validation
apiRouter.use('/telemetry', licenseTelemetryRoutes);  // Usage telemetry
apiRouter.use('/tiers', licenseTierRoutes);  // Tier management

// Feature Management routes
apiRouter.use('/admin/features', adminFeaturesRoutes);  // Feature management admin panel (requires platform admin)
apiRouter.use('/features', authenticate, featuresRoutes);  // Tenant-facing feature access API

// Product Registry/Management routes (Core Platform - requires authentication)
// Admin APIs for managing product metadata, permissions, configs, features
apiRouter.use('/admin', authenticate, productManagementRoutes);  // Product CRUD, Permission, Config, Feature APIs

// Product System Management routes (Admin only - runtime control)
apiRouter.use('/system/products', systemRoutes);  // Dynamic product system admin (reload, unload, status)

// Dynamic Product Routes (loaded at runtime)
// Product application endpoints (PayLinQ, Nexus, etc.)
// Authentication is handled by individual product routes (e.g., PayLinQ uses authenticateTenant)
apiRouter.use('/products', dynamicProductMiddleware);  // Product application routes

app.use('/api', apiRouter);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler for undefined routes
app.use(notFoundHandler);

// CSRF error handler (must be before global error handler)
app.use(csrfErrorHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = config.port;
let server;

// Only start server if not in test mode
// This allows tests to import the app without starting the server
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, async () => {
    logger.info(`🚀 RecruitIQ API Server started`);
    logger.info(`📍 Environment: ${config.env}`);
    logger.info(`🌐 Server running on: ${config.appUrl}`);
    logger.info(`📊 Health check: ${config.appUrl}/health`);
    logger.info(`🔐 CORS enabled for: ${config.frontend.allowedOrigins.join(', ')}`);
    logger.info(`🎯 Feature Management: /api/features, /api/admin (feature management)`);
    logger.info('');
    
    // Initialize dynamic product loading after server starts
    await initializeProducts();
  });
} else {
  // In test mode, initialize products immediately without starting server
  logger.info('🧪 Test mode: Initializing products without starting server...');
  await initializeProducts();
  logger.info('🧪 Test mode: Product initialization complete');
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = async (signal) => {
  logger.info(`\n${signal} received, shutting down gracefully...`);
  
  // Close HTTP server if it's running (not in test mode)
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        await closePool();
        logger.info('Database connections closed');
        await closeCentralPool();
        logger.info('Central database connections closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  } else {
    // In test mode, just close database connections
    try {
      await closePool();
      logger.info('Database connections closed');
      await closeCentralPool();
      logger.info('Central database connections closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

export default app;
export { apiRouter }; // Export for test access
