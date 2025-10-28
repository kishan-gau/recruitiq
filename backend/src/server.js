import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import logger from './utils/logger.js';
import { healthCheck as dbHealthCheck, closePool } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import organizationRoutes from './routes/organizations.js';
import userRoutes from './routes/users.js';
import workspaceRoutes from './routes/workspaces.js';
import jobRoutes from './routes/jobs.js';
import candidateRoutes from './routes/candidates.js';
import applicationRoutes from './routes/applications.js';
import interviewRoutes from './routes/interviews.js';
import flowTemplateRoutes from './routes/flowTemplates.js';
import publicRoutes from './routes/public.js';
import communicationRoutes from './routes/communications.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authenticate } from './middleware/auth.js';

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

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: config.env === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", config.frontend.url],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false,
  hsts: config.env === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  } : false,
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS
app.use(cors({
  origin: config.frontend.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ============================================================================
// BODY PARSING
// ============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// LOGGING
// ============================================================================

app.use(requestLogger);

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

// Public routes (no auth)
apiRouter.use('/auth', authRoutes);
apiRouter.use('/public', publicRoutes);

// Protected routes (require authentication)
// Note: Some routes handle their own public endpoints internally (jobs, applications)
apiRouter.use('/organizations', authenticate, organizationRoutes);
apiRouter.use('/users', authenticate, userRoutes);
apiRouter.use('/workspaces', authenticate, workspaceRoutes);
apiRouter.use('/jobs', jobRoutes);  // Has public endpoints - handles auth internally
apiRouter.use('/candidates', authenticate, candidateRoutes);
apiRouter.use('/applications', applicationRoutes);  // Has public endpoints - handles auth internally
apiRouter.use('/interviews', authenticate, interviewRoutes);
apiRouter.use('/flow-templates', authenticate, flowTemplateRoutes);
apiRouter.use('/communications', communicationRoutes);

app.use('/api', apiRouter);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path,
  });
});

// Global error handler
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`🚀 RecruitIQ API Server started`);
  logger.info(`📍 Environment: ${config.env}`);
  logger.info(`🌐 Server running on: ${config.appUrl}`);
  logger.info(`📊 Health check: ${config.appUrl}/health`);
  logger.info(`🔐 CORS enabled for: ${config.frontend.allowedOrigins.join(', ')}`);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = async (signal) => {
  logger.info(`\n${signal} received, shutting down gracefully...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await closePool();
      logger.info('Database connections closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
  
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
