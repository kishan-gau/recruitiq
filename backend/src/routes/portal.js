/**
 * Portal API Routes
 * 
 * API endpoints for the admin portal to access centralized logs and monitoring data.
 * These routes are ONLY for platform administrators to view data from cloud instances.
 * 
 * Access: Requires 'platform_admin' role
 * Security: Tenant isolation enforced, audit logging enabled
 */

import express from 'express';
import { authenticatePlatform, requirePlatformPermission } from '../middleware/auth.js';
import { queryCentralDb } from '../config/centralDatabase.js';
import platformDb from '../shared/database/licenseManagerDb.js';
import logger from '../utils/logger.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ============================================================================
// DEPLOYMENT CALLBACKS (No authentication required - uses service token)
// ============================================================================

/**
 * POST /api/portal/deployments/callback
 * Receive deployment status callbacks from Deployment Service
 */
router.post('/deployments/callback', async (req, res) => {
  try {
    // Verify deployment service token
    const authHeader = req.headers.authorization;
    const serviceHeader = req.headers['x-service'];
    
    if (!authHeader?.startsWith('Bearer ') || serviceHeader !== 'deployment-service') {
      return res.status(401).json({
        success: false,
        error: 'Invalid service authentication'
      });
    }

    const token = authHeader.substring(7);
    const secret = process.env.DEPLOYMENT_SERVICE_SECRET || 'deployment-service-secret';
    
    try {
      jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid service token'
      });
    }

    const {
      deploymentId,
      status,
      vpsId,
      tenantId,
      organizationId,
      organizationSlug,
      endpoints,
      containers,
      credentials,
      resources,
      health,
      error,
      startedAt,
      completedAt,
      failedAt,
      duration,
      logs
    } = req.body;

    logger.info('Deployment callback received', {
      deploymentId,
      status,
      organizationSlug
    });

    // Update deployment record in database
    if (status === 'completed') {
      // Update by deployment ID first, then by organization ID as fallback
      let updateResult = await platformDb.query(
        `UPDATE instance_deployments 
         SET status = 'active', 
             access_url = $1,
             status_message = 'Deployment completed successfully',
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [endpoints?.web, deploymentId]
      );
      
      // If no rows updated by ID, try by organization_id
      if (updateResult.rowCount === 0 && organizationId) {
        await platformDb.query(
          `UPDATE instance_deployments 
           SET status = 'active', 
               access_url = $1,
               status_message = 'Deployment completed successfully',
               completed_at = NOW(),
               updated_at = NOW()
           WHERE organization_id = $2 AND status != 'active'`,
          [endpoints?.web, organizationId]
        );
      }

      // Update license status to active
      if (req.body.licenseId) {
        await platformDb.query(
          `UPDATE licenses SET status = 'active', activated_at = NOW() WHERE id = $1`,
          [req.body.licenseId]
        );
      }

      // TODO: Send welcome email to admin
      logger.info('Deployment completed', {
        deploymentId,
        organizationSlug,
        url: endpoints?.web,
        adminEmail: credentials?.adminEmail
      });

    } else if (status === 'failed') {
      // Update by deployment ID first, then by organization ID as fallback
      let failedResult = await platformDb.query(
        `UPDATE instance_deployments 
         SET status = 'failed', 
             error_message = $1,
             status_message = 'Deployment failed',
             updated_at = NOW()
         WHERE id = $2`,
        [error, deploymentId]
      );
      
      // If no rows updated by ID, try by organization_id
      if (failedResult.rowCount === 0 && organizationId) {
        await platformDb.query(
          `UPDATE instance_deployments 
           SET status = 'failed', 
               error_message = $1,
               status_message = 'Deployment failed',
               updated_at = NOW()
           WHERE organization_id = $2 AND status NOT IN ('active', 'failed')`,
          [error, organizationId]
        );
      }

      logger.error('Deployment failed', {
        deploymentId,
        organizationSlug,
        error
      });
    }

    // Log security event
    logger.logSecurityEvent('deployment_callback', {
      severity: status === 'failed' ? 'warning' : 'info',
      deploymentId,
      status,
      organizationSlug
    }, req);

    res.json({
      success: true,
      message: 'Callback processed'
    });

  } catch (error) {
    logger.error('Deployment callback error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/portal/tenant-logs
 * Receive logs from tenant instances
 */
router.post('/tenant-logs', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers.authorization?.substring(7);
    const tenantId = req.headers['x-tenant-id'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Missing API key'
      });
    }

    // TODO: Validate API key against stored tenant keys
    // For now, just log the received logs

    const { organizationSlug, logs } = req.body;

    logger.info('Received tenant logs', {
      tenantId,
      organizationSlug,
      count: logs?.length || 0
    });

    // Store logs in central database
    if (logs && logs.length > 0) {
      for (const log of logs) {
        await queryCentralDb(
          `INSERT INTO system_logs (tenant_id, level, message, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [tenantId, log.level, log.message, log.timestamp, JSON.stringify(log.context || {})]
        ).catch(err => {
          // Don't fail if central DB is not available
          logger.warn('Failed to store tenant log', { error: err.message });
        });
      }
    }

    res.json({
      success: true,
      received: logs?.length || 0
    });

  } catch (error) {
    logger.error('Tenant logs error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/portal/tenant-events
 * Receive events from tenant instances
 */
router.post('/tenant-events', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers.authorization?.substring(7);
    const tenantId = req.headers['x-tenant-id'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Missing API key'
      });
    }

    const { organizationSlug, eventType, eventData, timestamp } = req.body;

    logger.info('Received tenant event', {
      tenantId,
      organizationSlug,
      eventType
    });

    // Handle specific event types
    if (eventType === 'health_check') {
      // Update tenant health status
      await platformDb.query(
        `UPDATE instance_deployments 
         SET last_health_check = NOW(), 
             health_status = $1
         WHERE organization_id = $2`,
        [eventData?.isHealthy ? 'healthy' : 'unhealthy', tenantId]
      ).catch(() => {});
    }

    res.json({
      success: true,
      eventType
    });

  } catch (error) {
    logger.error('Tenant event error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/portal/licenses/validate
 * Validate a license key (called by tenant instances)
 */
router.post('/licenses/validate', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const { licenseKey, organizationId, feature, action } = req.body;

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        valid: false,
        reason: 'Missing license key'
      });
    }

    // Query license from database
    const licenseResult = await platformDb.query(
      `SELECT l.*, 
              tp.max_users, tp.max_workspaces, tp.max_jobs, tp.max_candidates, tp.features
       FROM licenses l
       LEFT JOIN tier_presets tp ON l.tier = tp.tier_name AND tp.is_active = true
       WHERE l.license_key = $1 AND l.deleted_at IS NULL
       ORDER BY tp.version DESC
       LIMIT 1`,
      [licenseKey]
    );

    if (licenseResult.rows.length === 0) {
      return res.json({
        success: true,
        valid: false,
        reason: 'License not found'
      });
    }

    const license = licenseResult.rows[0];

    // Check if license is active
    if (license.status !== 'active') {
      return res.json({
        success: true,
        valid: false,
        reason: `License is ${license.status}`
      });
    }

    // Check expiration
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return res.json({
        success: true,
        valid: false,
        reason: 'License has expired'
      });
    }

    // Check feature access if specified
    const features = license.features || [];
    if (feature && !features.includes(feature) && !features.includes('all')) {
      return res.json({
        success: true,
        valid: false,
        reason: `Feature '${feature}' not included in license`
      });
    }

    // License is valid
    res.json({
      success: true,
      valid: true,
      tier: license.tier,
      features: features,
      limits: {
        maxUsers: license.max_users,
        maxWorkspaces: license.max_workspaces,
        maxJobs: license.max_jobs,
        maxCandidates: license.max_candidates
      },
      expiresAt: license.expires_at
    });

  } catch (error) {
    logger.error('License validation error', { error: error.message });
    res.status(500).json({
      success: false,
      valid: false,
      reason: 'Validation service error'
    });
  }
});

// All other portal routes require platform user authentication
router.use(authenticatePlatform);

// Most routes require portal.view permission
router.use(requirePlatformPermission('portal.view'));

// ============================================================================
// SYSTEM LOGS
// ============================================================================

/**
 * GET /api/portal/logs
 * Query system logs with filtering
 * 
 * Query params:
 * - tenantId: Filter by tenant ID
 * - instanceId: Filter by instance ID
 * - level: Filter by log level (info, warn, error, debug)
 * - startDate: Start date (ISO 8601)
 * - endDate: End date (ISO 8601)
 * - search: Search in message field
 * - limit: Max results (default: 100, max: 1000)
 * - offset: Pagination offset (default: 0)
 */
router.get('/logs', async (req, res) => {
  try {
    const {
      tenantId,
      instanceId,
      level,
      startDate,
      endDate,
      search,
      limit = 100,
      offset = 0,
    } = req.query;

    // Build query
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      values.push(tenantId);
    }

    if (instanceId) {
      conditions.push(`instance_id = $${paramIndex++}`);
      values.push(instanceId);
    }

    if (level) {
      conditions.push(`level = $${paramIndex++}`);
      values.push(level);
    }

    if (startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(endDate);
    }

    if (search) {
      conditions.push(`message ILIKE $${paramIndex++}`);
      values.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM system_logs ${whereClause}`;
    const countResult = await queryCentralDb(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Get logs
    const logsQuery = `
      SELECT 
        id, timestamp, level, message, tenant_id, instance_id,
        request_id, user_id, ip_address, endpoint, method,
        error_stack, error_code, metadata
      FROM system_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const limitValue = Math.min(parseInt(limit, 10), 1000);
    const offsetValue = parseInt(offset, 10);

    const logsResult = await queryCentralDb(logsQuery, [...values, limitValue, offsetValue]);

    // Audit log
    logger.logSecurityEvent('portal_logs_accessed', {
      severity: 'info',
      adminId: req.user.id,
      filters: { tenantId, instanceId, level, startDate, endDate, search },
      resultCount: logsResult.rows.length,
    }, req);

    res.json({
      success: true,
      data: {
        logs: logsResult.rows,
        pagination: {
          total: totalCount,
          limit: limitValue,
          offset: offsetValue,
          hasMore: offsetValue + limitValue < totalCount,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch portal logs', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs',
    });
  }
});

/**
 * GET /api/portal/logs/security
 * Query security events with filtering
 */
router.get('/logs/security', async (req, res) => {
  try {
    const {
      tenantId,
      instanceId,
      eventType,
      severity,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = req.query;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      values.push(tenantId);
    }

    if (instanceId) {
      conditions.push(`instance_id = $${paramIndex++}`);
      values.push(instanceId);
    }

    if (eventType) {
      conditions.push(`event_type = $${paramIndex++}`);
      values.push(eventType);
    }

    if (severity) {
      conditions.push(`severity = $${paramIndex++}`);
      values.push(severity);
    }

    if (startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM security_events ${whereClause}`;
    const countResult = await queryCentralDb(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Get events
    const eventsQuery = `
      SELECT *
      FROM security_events
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const limitValue = Math.min(parseInt(limit, 10), 1000);
    const offsetValue = parseInt(offset, 10);

    const eventsResult = await queryCentralDb(eventsQuery, [...values, limitValue, offsetValue]);

    // Audit log
    logger.logSecurityEvent('portal_security_events_accessed', {
      severity: 'info',
      adminId: req.user.id,
      filters: { tenantId, instanceId, eventType, severity },
      resultCount: eventsResult.rows.length,
    }, req);

    res.json({
      success: true,
      data: {
        events: eventsResult.rows,
        pagination: {
          total: totalCount,
          limit: limitValue,
          offset: offsetValue,
          hasMore: offsetValue + limitValue < totalCount,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch security events', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security events',
    });
  }
});

/**
 * GET /api/portal/logs/search
 * Full-text search across logs
 */
router.get('/logs/search', async (req, res) => {
  try {
    const { q, tenantId, limit = 50 } = req.query;

    if (!q || q.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 3 characters',
      });
    }

    const searchTerm = `%${q}%`;
    const values = [searchTerm];
    let whereClause = 'message ILIKE $1 OR error_stack ILIKE $1';

    if (tenantId) {
      whereClause += ' AND tenant_id = $2';
      values.push(tenantId);
    }

    const query = `
      SELECT 
        id, timestamp, level, message, tenant_id, instance_id,
        request_id, user_id, endpoint
      FROM system_logs
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${values.length + 1}
    `;

    const result = await queryCentralDb(query, [...values, Math.min(parseInt(limit, 10), 500)]);

    // Audit log
    logger.logSecurityEvent('portal_logs_searched', {
      severity: 'info',
      adminId: req.user.id,
      searchQuery: q,
      tenantId,
      resultCount: result.rows.length,
    }, req);

    res.json({
      success: true,
      data: {
        results: result.rows,
        query: q,
      },
    });
  } catch (error) {
    logger.error('Failed to search logs', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to search logs',
    });
  }
});

/**
 * GET /api/portal/logs/download
 * Download logs as CSV
 */
router.get('/logs/download', async (req, res) => {
  try {
    const { tenantId, startDate, endDate } = req.query;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      values.push(tenantId);
    }

    if (startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        timestamp, level, message, tenant_id, instance_id,
        user_id, ip_address, endpoint, method
      FROM system_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT 10000
    `;

    const result = await queryCentralDb(query, values);

    // Convert to CSV
    const headers = ['timestamp', 'level', 'message', 'tenant_id', 'instance_id', 'user_id', 'ip_address', 'endpoint', 'method'];
    const csv = [
      headers.join(','),
      ...result.rows.map(row =>
        headers.map(h => {
          const value = row[h] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ].join('\n');

    // Audit log
    logger.logSecurityEvent('portal_logs_downloaded', {
      severity: 'warning',
      adminId: req.user.id,
      filters: { tenantId, startDate, endDate },
      recordCount: result.rows.length,
    }, req);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="logs-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Failed to download logs', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to download logs',
    });
  }
});

// ============================================================================
// STATISTICS & AGGREGATIONS
// ============================================================================

/**
 * GET /api/portal/stats
 * Get platform-wide statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Get unique tenants and instances
    const tenantsQuery = 'SELECT COUNT(DISTINCT tenant_id) as count FROM system_logs';
    const instancesQuery = 'SELECT COUNT(DISTINCT instance_id) as count FROM system_logs';
    
    // Get log counts by level (last 24h)
    const logCountsQuery = `
      SELECT level, COUNT(*) as count
      FROM system_logs
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY level
    `;
    
    // Get security event counts (last 24h)
    const securityCountsQuery = `
      SELECT severity, COUNT(*) as count
      FROM security_events
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY severity
    `;

    const [tenants, instances, logCounts, securityCounts] = await Promise.all([
      queryCentralDb(tenantsQuery),
      queryCentralDb(instancesQuery),
      queryCentralDb(logCountsQuery),
      queryCentralDb(securityCountsQuery),
    ]);

    res.json({
      success: true,
      data: {
        tenants: parseInt(tenants.rows[0].count, 10),
        instances: parseInt(instances.rows[0].count, 10),
        logsByLevel: logCounts.rows.reduce((acc, row) => {
          acc[row.level] = parseInt(row.count, 10);
          return acc;
        }, {}),
        securityBySeverity: securityCounts.rows.reduce((acc, row) => {
          acc[row.severity] = parseInt(row.count, 10);
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch portal stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

export default router;
