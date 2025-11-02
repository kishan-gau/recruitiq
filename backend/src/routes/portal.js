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
import { authenticate, requirePlatformUser, requirePermission } from '../middleware/auth.js';
import { queryCentralDb } from '../config/centralDatabase.js';
import logger from '../utils/logger.js';

const router = express.Router();

// All portal routes require platform user authentication
router.use(authenticate);
router.use(requirePlatformUser);

// Most routes require portal.view permission
router.use(requirePermission('portal.view'));

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
