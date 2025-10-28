const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { shutdown } = require('./queue/deploymentQueue');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.server.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'deployment-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    dryRun: config.deployment.dryRun,
    billingGuard: config.deployment.billingGuard,
  });
});

// API routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(config.server.port, () => {
  console.log('='.repeat(60));
  console.log('🚀 RecruitIQ Deployment Service');
  console.log('='.repeat(60));
  console.log(`Environment: ${config.server.env}`);
  console.log(`Port: ${config.server.port}`);
  console.log(`TransIP API: ${config.transip.apiUrl}`);
  console.log(`Dry Run: ${config.deployment.dryRun ? '✓ ENABLED' : '✗ DISABLED'}`);
  console.log(`Billing Guard: ${config.deployment.billingGuard ? '✓ ENABLED' : '✗ DISABLED'}`);
  console.log(`Read Only: ${config.transip.readOnly ? '✓ ENABLED' : '✗ DISABLED'}`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await shutdown();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  server.close(async () => {
    await shutdown();
    process.exit(0);
  });
});

module.exports = app;
