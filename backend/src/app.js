/**
 * Express Application Factory
 * 
 * Industry Standard: Separate app creation from server startup
 * This allows tests to create app instances without triggering side effects
 * 
 * @module app
 */

import express from 'express';
import cookieParser from 'cookie-parser';

// Import security middleware
import { enhancedHelmetMiddleware, additionalSecurityHeaders } from './middleware/securityHeaders.js';
import { enhancedCorsMiddleware, corsErrorHandler, handlePreflight, logCorsRequests } from './middleware/cors.js';
import { 
  globalLimiter, 
  authLimiter, 
  addRateLimitHeaders 
} from './middleware/rateLimit.js';
import { csrfMiddleware, getCsrfToken, csrfErrorHandler } from './middleware/csrf.js';

// Import routes
import authRoutes from './routes/auth/authRoutes.js';
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
import adminFeaturesRoutes from './routes/adminFeatures.js';
import featuresRoutes from './routes/features.js';
import licenseAdminRoutes from './modules/license/routes/admin.js';
import licenseValidationRoutes from './modules/license/routes/validation.js';
import licenseTelemetryRoutes from './modules/license/routes/telemetry.js';
import licenseTierRoutes from './modules/license/routes/tiers.js';
import productManagementRoutes from './products/nexus/routes/productManagementRoutes.js';
import systemRoutes from './products/nexus/routes/systemRoutes.js';
import rbacRoutes from './modules/rbac/routes/index.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import requestIdMiddleware from './middleware/requestId.js';
import { authenticate } from './middleware/auth.js';
import { secureRequest, blockFilePathInjection } from './middleware/requestSecurity.js';
import { timezoneMiddleware, timezoneHeaderMiddleware } from './middleware/timezone.js';

/**
 * Creates and configures Express application
 * 
 * Industry Standard: Factory pattern for app creation
 * - Allows dependency injection
 * - Enables testing without side effects
 * - Supports multiple instances if needed
 * 
 * @param {Object} options - Configuration options
 * @param {Object} options.config - Application configuration
 * @param {Object} options.logger - Logger instance
 * @param {Function} options.dbHealthCheck - Database health check function
 * @param {Router} options.dynamicProductRouter - Optional pre-initialized product router
 * @returns {Express.Application} Configured Express app
 */
export function createApp(options = {}) {
  const {
    config,
    logger,
    dbHealthCheck,
    dynamicProductRouter = null
  } = options;

  // Validate required dependencies
  if (!config) {
    throw new Error('Config is required to create app');
  }
  if (!logger) {
    throw new Error('Logger is required to create app');
  }
  if (!dbHealthCheck) {
    throw new Error('dbHealthCheck is required to create app');
  }

  const app = express();

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

  // Enhanced rate limiting
  app.use('/api/', globalLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);

  // ============================================================================
  // BODY PARSING & COOKIES
  // ============================================================================

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser(config.security.sessionSecret));

  // ============================================================================
  // INPUT VALIDATION & SANITIZATION
  // ============================================================================

  app.use('/api/', secureRequest({
    maxDepth: 5,
    stripXSS: true,
    blockDangerousPatterns: true,
  }));

  app.use('/api/', blockFilePathInjection());

  // ============================================================================
  // REQUEST TRACKING & LOGGING
  // ============================================================================

  app.use(requestIdMiddleware);
  app.use(requestLogger);
  app.use(timezoneMiddleware);
  app.use(timezoneHeaderMiddleware);

  // ============================================================================
  // HEALTH CHECK
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

  app.get('/health/live', (req, res) => {
    res.status(200).json({ status: 'alive' });
  });

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

  // Dynamic product middleware - uses injected router or returns 503
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

  // CSRF token endpoint
  apiRouter.get('/csrf-token', getCsrfToken);

  // Apply CSRF protection
  apiRouter.use(csrfMiddleware);

  // Public routes
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/public', publicRoutes);
  apiRouter.use('/auth/mfa', mfaRoutes);

  // Protected routes
  apiRouter.use('/organizations', authenticate, organizationRoutes);
  apiRouter.use('/users', authenticate, userRoutes);
  apiRouter.use('/platform-users', platformUserRoutes);
  apiRouter.use('/workspaces', authenticate, workspaceRoutes);
  apiRouter.use('/jobs', jobRoutes);
  apiRouter.use('/candidates', authenticate, candidateRoutes);
  apiRouter.use('/applications', applicationRoutes);
  apiRouter.use('/interviews', authenticate, interviewRoutes);
  apiRouter.use('/flow-templates', authenticate, flowTemplateRoutes);
  apiRouter.use('/communications', communicationRoutes);
  apiRouter.use('/portal', portalRoutes);
  apiRouter.use('/portal', provisioningRoutes);
  apiRouter.use('/portal', userManagementRoutes);
  apiRouter.use('/portal', rolesPermissionsRoutes);
  apiRouter.use('/security', securityRoutes);
  apiRouter.use('/settings/email', emailSettingsRoutes);
  apiRouter.use('/admin', licenseAdminRoutes);
  apiRouter.use('/validate', licenseValidationRoutes);
  apiRouter.use('/telemetry', licenseTelemetryRoutes);
  apiRouter.use('/tiers', licenseTierRoutes);
  apiRouter.use('/admin/features', adminFeaturesRoutes);
  apiRouter.use('/features', authenticate, featuresRoutes);
  apiRouter.use('/admin', productManagementRoutes);
  apiRouter.use('/system/products', systemRoutes);

  // RBAC Routes
  apiRouter.use('/rbac', rbacRoutes);

  // Dynamic Product Routes
  apiRouter.use('/products', dynamicProductMiddleware);

  app.use('/api', apiRouter);

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  app.use(notFoundHandler);
  app.use(csrfErrorHandler);
  app.use(errorHandler);

  // Store apiRouter reference for test access
  app.apiRouter = apiRouter;
  app.dynamicProductMiddleware = dynamicProductMiddleware;

  return app;
}

export default createApp;
