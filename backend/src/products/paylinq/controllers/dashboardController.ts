/**
 * Paylinq Dashboard Controller
 * 
 * Handles dashboard data aggregation and statistics
 * 
 * @module products/paylinq/controllers/dashboardController
 */

import DashboardService from '../services/dashboardService.js';
import logger from '../../../utils/logger.js';

const dashboardService = new DashboardService();

/**
 * Get dashboard overview statistics
 * @route GET /api/paylinq/dashboard
 */
async function getDashboardOverview(req, res) {
  try {
    const organizationId = req.user?.organization_id;
    const { period = '30' } = req.query; // Days to look back

    if (!organizationId) {
      logger.warn('Dashboard access without organization_id', {
        userId: req.user?.id,
        userType: req.user?.user_type,
        email: req.user?.email
      });
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required. Please ensure you are logged in with a tenant account.',
        details: {
          userType: req.user?.user_type,
          hasOrganization: !!organizationId
        }
      });
    }

    const dashboardData = await dashboardService.getDashboardOverview(
      organizationId,
      parseInt(period)
    );

    return res.json({
      success: true,
      data: dashboardData,
      message: 'Dashboard data retrieved successfully'
    });
  } catch (error) {
    logger.error('Error fetching dashboard overview', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch dashboard data'
    });
  }
}

/**
 * Get payroll statistics
 * @route GET /api/paylinq/dashboard/payroll-stats
 */
async function getPayrollStats(req, res) {
  try {
    const organizationId = req.user?.organization_id;
    const { startDate, endDate } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    const stats = await dashboardService.getPayrollStats(
      organizationId,
      startDate,
      endDate
    );

    return res.json({
      success: true,
      data: stats,
      message: 'Payroll statistics retrieved successfully'
    });
  } catch (error) {
    logger.error('Error fetching payroll statistics', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch payroll statistics'
    });
  }
}

/**
 * Get employee statistics
 * @route GET /api/paylinq/dashboard/employee-stats
 */
async function getEmployeeStats(req, res) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    const stats = await dashboardService.getEmployeeStats(organizationId);

    return res.json({
      success: true,
      data: stats,
      message: 'Employee statistics retrieved successfully'
    });
  } catch (error) {
    logger.error('Error fetching employee statistics', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch employee statistics'
    });
  }
}

/**
 * Get recent activity
 * @route GET /api/paylinq/dashboard/recent-activity
 */
async function getRecentActivity(req, res) {
  try {
    const organizationId = req.user?.organization_id;
    const { limit = 10 } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    const activities = await dashboardService.getRecentActivity(
      organizationId,
      parseInt(limit)
    );

    return res.json({
      success: true,
      data: activities,
      message: 'Recent activity retrieved successfully'
    });
  } catch (error) {
    logger.error('Error fetching recent activity', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch recent activity'
    });
  }
}

export default {
  getDashboardOverview,
  getPayrollStats,
  getEmployeeStats,
  getRecentActivity
};
