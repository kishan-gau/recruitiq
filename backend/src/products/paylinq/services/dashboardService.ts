/**
 * Paylinq Dashboard Service
 * 
 * Business logic for dashboard data aggregation
 * 
 * @module products/paylinq/services/dashboardService
 */

import DashboardRepository from '../repositories/dashboardRepository.ts';
import logger from '../../../utils/logger.ts';

class DashboardService {
  /**
   * @param {DashboardRepository} repository - Optional repository instance for testing
   */
  constructor(repository = null) {
    this.repository = repository || new DashboardRepository();
  }

  /**
   * Calculate days until next payroll run
   * @param {Array} upcomingPayrolls 
   * @returns {number}
   */
  calculateDaysUntilNextPayroll(upcomingPayrolls) {
  if (!upcomingPayrolls || upcomingPayrolls.length === 0) {
    return 0;
  }
  
  const nextPayroll = upcomingPayrolls[0];
  if (!nextPayroll || !nextPayroll.payment_date) {
    return 0;
  }
  
  const today = new Date();
  const paymentDate = new Date(nextPayroll.payment_date);
  const diffTime = paymentDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

  /**
   * Get dashboard overview with key metrics
   * @param {string} organizationId 
   * @param {number} period - Days to look back
   * @returns {Promise<Object>}
   */
  async getDashboardOverview(organizationId, period = 30) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Get all dashboard metrics in parallel
    const [
      payrollStats,
      employeeStats,
      timesheetStats,
      upcomingPayrolls,
      recentActivity
    ] = await Promise.all([
      this.repository.getPayrollMetrics(organizationId, startDate, endDate),
      this.repository.getEmployeeMetrics(organizationId),
      this.repository.getTimesheetMetrics(organizationId, startDate, endDate),
      this.repository.getUpcomingPayrolls(organizationId, 5),
      this.repository.getRecentActivity(organizationId, 10)
    ]);

    // Transform data to match frontend expectations
    return {
      summary: {
        totalWorkers: employeeStats.totalEmployees,
        activeWorkers: employeeStats.activeEmployees,
        workersTrend: 0, // TODO: Calculate trend
        pendingApprovals: timesheetStats.pendingApproval || 0,
        daysUntilPayroll: this.calculateDaysUntilNextPayroll(upcomingPayrolls),
        monthlyCost: payrollStats.totalGrossPay,
        costTrend: 0 // TODO: Calculate trend
      },
      payroll: payrollStats,
      employees: employeeStats,
      timesheets: timesheetStats,
      upcomingPayrolls,
      recentActivity,
      pendingApprovals: []  // TODO: Get actual pending approvals
    };
  } catch (error) {
    logger.error('Error getting dashboard overview', {
      error: error.message,
      organizationId
    });
    throw error;
  }
}

  /**
   * Get detailed payroll statistics
   * @param {string} organizationId 
   * @param {string} startDate 
   * @param {string} endDate 
   * @returns {Promise<Object>}
   */
  async getPayrollStats(organizationId, startDate, endDate) {
  try {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // First of month
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await this.repository.getPayrollMetrics(organizationId, start, end);
    return stats;
  } catch (error) {
    logger.error('Error getting payroll stats', {
      error: error.message,
      organizationId
    });
    throw error;
  }
}

  /**
   * Get employee statistics
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async getEmployeeStats(organizationId) {
    try {
      const stats = await this.repository.getEmployeeMetrics(organizationId);
      return stats;
  } catch (error) {
    logger.error('Error getting employee stats', {
      error: error.message,
      organizationId
    });
    throw error;
  }
}

  /**
   * Get recent activity
   * @param {string} organizationId 
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  async getRecentActivity(organizationId, limit = 10) {
    try {
      const activities = await this.repository.getRecentActivity(organizationId, limit);
      return activities;
  } catch (error) {
    logger.error('Error getting recent activity', {
      error: error.message,
      organizationId
    });
    throw error;
  }
}

}

export default DashboardService;
