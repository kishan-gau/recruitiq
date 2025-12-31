/**
 * Security Dashboard Routes
 * 
 * Provides API endpoints for security monitoring dashboard.
 */

import express from 'express';
import securityMonitor from '../services/securityMonitor.js';
import { getSecurityMetrics, getSecurityMonitoringHealth } from '../middleware/securityMonitoring.js';
import { authenticatePlatform, requirePlatformRole } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import encryption from '../services/encryption.js';
import tlsConfig from '../utils/tlsConfig.js';

const router = express.Router();

// All dashboard routes require admin role
router.use(authenticatePlatform);
router.use(requirePlatformRole(['admin', 'security_admin', 'platform_admin']));

/**
 * GET /api/security/dashboard
 * Get security dashboard overview
 */
router.get('/dashboard', (req, res) => {
  try {
    const metrics = getSecurityMetrics();
    const health = getSecurityMonitoringHealth();
    
    const dashboard = {
      overview: {
        totalEvents: metrics.totalEvents,
        alertsSent: metrics.alertsSent,
        activeThreats: metrics.activeThreats,
        status: health.status,
      },
      recentEvents: {
        eventsByType: metrics.eventsByType,
        lastAlert: metrics.lastAlert,
      },
      systemHealth: {
        monitoring: health,
        encryption: encryption.validateEncryptionConfig(),
        tls: tlsConfig.validateTLSConfig(),
      },
      timestamp: new Date(),
    };
    
    res.json(dashboard);
  } catch (_error) {
    logger.error('Failed to get security dashboard', {
      error: error.message,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
});

/**
 * GET /api/security/metrics
 * Get detailed security metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = getSecurityMetrics();
    
    res.json({
      metrics,
      timestamp: new Date(),
    });
  } catch (_error) {
    logger.error('Failed to get security metrics', {
      error: error.message,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

/**
 * GET /api/security/events
 * Get recent security events
 * 
 * Query params:
 * - type: Filter by event type
 * - severity: Filter by severity
 * - limit: Number of events to return (default: 100)
 */
router.get('/events', (req, res) => {
  try {
    const { type, severity, limit = 100 } = req.query;
    
    // In production, this would query from a database or log aggregation service
    // For now, return metrics by type
    const metrics = getSecurityMetrics();
    
    const events = {
      eventsByType: metrics.eventsByType,
      totalEvents: metrics.totalEvents,
      filters: { type, severity, limit },
      timestamp: new Date(),
    };
    
    res.json(events);
  } catch (_error) {
    logger.error('Failed to get security events', {
      error: error.message,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to retrieve events' });
  }
});

/**
 * GET /api/security/alerts
 * Get recent security alerts
 * 
 * Query params:
 * - severity: Filter by severity
 * - limit: Number of alerts to return (default: 50)
 */
router.get('/alerts', (req, res) => {
  try {
    const { severity, limit = 50 } = req.query;
    
    const metrics = getSecurityMetrics();
    
    const alerts = {
      totalAlerts: metrics.alertsSent,
      lastAlert: metrics.lastAlert,
      filters: { severity, limit },
      timestamp: new Date(),
    };
    
    res.json(alerts);
  } catch (_error) {
    logger.error('Failed to get security alerts', {
      error: error.message,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

/**
 * GET /api/security/threats
 * Get active threats
 */
router.get('/threats', (req, res) => {
  try {
    const metrics = getSecurityMetrics();
    
    const threats = {
      active: metrics.activeThreats,
      failedLogins: metrics.activeThreats?.failedLogins || 0,
      rateLimitViolations: metrics.activeThreats?.rateLimitViolations || 0,
      timestamp: new Date(),
    };
    
    res.json(threats);
  } catch (_error) {
    logger.error('Failed to get active threats', {
      error: error.message,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to retrieve threats' });
  }
});

/**
 * GET /api/security/health
 * Get security system health
 */
router.get('/health', (req, res) => {
  try {
    const monitoringHealth = getSecurityMonitoringHealth();
    const encryptionHealth = encryption.validateEncryptionConfig();
    const tlsHealth = tlsConfig.validateTLSConfig();
    
    const overallHealth = {
      status:
        monitoringHealth.status === 'healthy' &&
        encryptionHealth.valid &&
        tlsHealth.valid
          ? 'healthy'
          : 'degraded',
      components: {
        monitoring: monitoringHealth,
        encryption: encryptionHealth,
        tls: tlsHealth,
      },
      timestamp: new Date(),
    };
    
    res.json(overallHealth);
  } catch (_error) {
    logger.error('Failed to get security health', {
      error: error.message,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to retrieve health status' });
  }
});

/**
 * GET /api/security/config
 * Get security configuration
 */
router.get('/config', (req, res) => {
  try {
    const health = getSecurityMonitoringHealth();
    
    const configInfo = {
      monitoring: health.config,
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 256,
      },
      tls: tlsConfig.getTLSConfig(),
      timestamp: new Date(),
    };
    
    res.json(configInfo);
  } catch (_error) {
    logger.error('Failed to get security config', {
      error: error.message,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
});

/**
 * POST /api/security/test-alert
 * Test alert system (admin only)
 */
router.post('/test-alert', (req, res) => {
  try {
    const { type = 'test', severity = 'info' } = req.body;
    
    securityMonitor.trackEvent(type, {
      test: true,
      userId: req.user.id,
      username: req.user.email || req.user.username,
      timestamp: new Date(),
      message: 'This is a test alert',
    });
    
    logger.info('Test alert generated', {
      type,
      severity,
      userId: req.user.id,
    });
    
    res.json({
      success: true,
      message: 'Test alert generated',
      type,
      severity,
    });
  } catch (_error) {
    logger.error('Failed to generate test alert', {
      error: error.message,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to generate test alert' });
  }
});

/**
 * GET /api/security/statistics
 * Get security statistics
 */
router.get('/statistics', (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    const metrics = getSecurityMetrics();
    
    // In production, calculate statistics based on period
    const statistics = {
      period,
      totalEvents: metrics.totalEvents,
      eventsByType: metrics.eventsByType,
      alertsSent: metrics.alertsSent,
      activeThreats: metrics.activeThreats,
      trends: {
        // Placeholder for trend analysis
        increasing: [],
        decreasing: [],
        stable: [],
      },
      timestamp: new Date(),
    };
    
    res.json(statistics);
  } catch (_error) {
    logger.error('Failed to get security statistics', {
      error: error.message,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

export default router;
