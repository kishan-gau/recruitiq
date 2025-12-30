/**
 * Admin Dashboard Routes
 * Platform administration dashboard metrics and analytics
 * 
 * @module routes/admin/dashboard
 */

import express, { Router } from 'express';
import { requirePlatformPermission } from '../../middleware/auth.ts';
import pool from '../../config/database.ts';
import logger from '../../utils/logger.ts';

const router: Router = express.Router();

/**
 * GET /api/admin/dashboard
 * Get dashboard metrics and overview
 */
router.get('/', requirePlatformPermission('portal.view'), async (req, res) => {
  try {
    // Get VPS statistics
    const vpsStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'provisioning') as provisioning,
        COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance
      FROM vps_instances
      WHERE status != 'decommissioned'
    `);

    // Get customer/organization statistics
    const customerStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT id) as total_customers,
        COUNT(DISTINCT id) FILTER (WHERE subscription_status = 'active') as active_customers,
        COUNT(DISTINCT id) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_this_month
      FROM organizations
      WHERE deleted_at IS NULL
    `);

    // Get user statistics
    const userStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT u.id) FILTER (WHERE u.last_login_at > NOW() - INTERVAL '7 days') as active_last_7_days,
        COUNT(DISTINCT u.id) FILTER (WHERE u.created_at > NOW() - INTERVAL '30 days') as new_this_month
      FROM hris.user_account u
      WHERE u.deleted_at IS NULL
    `);

    // Get license statistics
    const licenseStats = await pool.query(`
      SELECT 
        COUNT(*) as total_licenses,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'expired') as expired,
        COUNT(*) FILTER (WHERE expires_at < NOW() + INTERVAL '30 days' AND status = 'active') as expiring_soon
      FROM licenses
    `);

    // Get recent security events (last 24 hours)
    const securityEvents = await pool.query(`
      SELECT 
        event_type,
        COUNT(*) as count
      FROM security_events
      WHERE timestamp > NOW() - INTERVAL '24 hours'
        AND event_type IN ('login_failed', 'unauthorized_access', 'mfa_failed', 'token_revoked')
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get deployment statistics
    const deploymentStats = await pool.query(`
      SELECT 
        COUNT(*) as total_deployments,
        COUNT(*) FILTER (WHERE status = 'provisioning') as pending,
        COUNT(*) FILTER (WHERE status = 'provisioning') as in_progress,
        COUNT(*) FILTER (WHERE status = 'active') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
      FROM instance_deployments
      WHERE 1=1
    `);

    // Calculate system health score (simplified)
    const vpsData = vpsStats.rows[0];
    const licenseData = licenseStats.rows[0];
    const deploymentData = deploymentStats.rows[0];
    
    const vpsHealth = vpsData.total > 0 ? (parseInt(vpsData.active) / parseInt(vpsData.total)) * 100 : 100;
    const licenseHealth = licenseData.total_licenses > 0 ? (parseInt(licenseData.active) / parseInt(licenseData.total_licenses)) * 100 : 100;
    const deploymentHealth = deploymentData.total_deployments > 0 
      ? ((parseInt(deploymentData.completed) / parseInt(deploymentData.total_deployments)) * 100) 
      : 100;
    
    const systemHealth = Math.round((vpsHealth + licenseHealth + deploymentHealth) / 3);

    // Get upcoming license renewals
    const upcomingRenewals = await pool.query(`
      SELECT 
        l.id,
        l.license_key,
        l.expires_at,
        c.name as organization_name,
        c.instance_url,
        l.tier as tier_name
      FROM licenses l
      JOIN customers c ON l.customer_id = c.id
      WHERE l.status = 'active'
        AND l.expires_at < NOW() + INTERVAL '60 days'
      ORDER BY l.expires_at ASC
      LIMIT 10
    `);

    const metrics = {
      vps: {
        total: parseInt(vpsStats.rows[0].total),
        active: parseInt(vpsStats.rows[0].active),
        provisioning: parseInt(vpsStats.rows[0].provisioning),
        maintenance: parseInt(vpsStats.rows[0].maintenance),
      },
      customers: {
        total: parseInt(customerStats.rows[0].total_customers),
        active: parseInt(customerStats.rows[0].active_customers),
        newThisMonth: parseInt(customerStats.rows[0].new_this_month),
      },
      users: {
        total: parseInt(userStats.rows[0].total_users),
        activeLast7Days: parseInt(userStats.rows[0].active_last_7_days),
        newThisMonth: parseInt(userStats.rows[0].new_this_month),
      },
      licenses: {
        total: parseInt(licenseStats.rows[0].total_licenses),
        active: parseInt(licenseStats.rows[0].active),
        expired: parseInt(licenseStats.rows[0].expired),
        expiringSoon: parseInt(licenseStats.rows[0].expiring_soon),
      },
      deployments: {
        total: parseInt(deploymentStats.rows[0].total_deployments),
        pending: parseInt(deploymentStats.rows[0].pending),
        inProgress: parseInt(deploymentStats.rows[0].in_progress),
        completed: parseInt(deploymentStats.rows[0].completed),
        failed: parseInt(deploymentStats.rows[0].failed),
        last24h: parseInt(deploymentStats.rows[0].last_24h),
      },
      security: {
        eventsLast24h: securityEvents.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        eventsByType: securityEvents.rows.map(row => ({
          type: row.event_type,
          count: parseInt(row.count),
        })),
      },
      systemHealth,
    };

    res.json({
      success: true,
      metrics,
      upcomingRenewals: upcomingRenewals.rows,
    });
  } catch (error) {
    logger.error('Failed to fetch dashboard metrics', { 
      error: error.message, 
      stack: error.stack 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/dashboard/analytics
 * Get detailed analytics for a specific time period
 */
router.get('/analytics', requirePlatformPermission('portal.view'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Parse period (e.g., '7d', '30d', '90d')
    const days = parseInt(period.replace('d', ''));
    
    if (isNaN(days) || days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Use format like "7d", "30d", "90d"',
      });
    }

    // Get time-series data for the period
    const deploymentTrend = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM instance_deployments
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const userGrowth = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM hris.user_account
      WHERE created_at > NOW() - INTERVAL '${days} days'
        AND deleted_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const licenseActivity = await pool.query(`
      SELECT 
        DATE(issued_at) as date,
        COUNT(*) as new_licenses,
        COUNT(*) FILTER (WHERE status = 'active') as activated
      FROM licenses
      WHERE issued_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(issued_at)
      ORDER BY date ASC
    `);

    res.json({
      success: true,
      analytics: {
        period: `${days}d`,
        deploymentTrend: deploymentTrend.rows,
        userGrowth: userGrowth.rows,
        licenseActivity: licenseActivity.rows,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch analytics', { 
      error: error.message,
      period: req.query.period,
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
    });
  }
});

export default router;
