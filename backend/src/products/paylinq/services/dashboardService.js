/**
 * Paylinq Dashboard Service
 * 
 * Business logic for dashboard data aggregation
 * 
 * @module products/paylinq/services/dashboardService
 */

import DashboardRepository from '../repositories/dashboardRepository.js';
import logger from '../../../utils/logger.js';

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
   * Calculate percentage trend between current and previous values
   * @param {number} currentValue - Current period value
   * @param {number} previousValue - Previous period value
   * @returns {number} Percentage change (positive or negative)
   */
  calculatePercentageTrend(currentValue, previousValue) {
    if (!previousValue || previousValue === 0) {
      return currentValue > 0 ? 100 : 0;
    }
    
    const change = currentValue - previousValue;
    const percentageChange = (change / previousValue) * 100;
    
    // Round to 2 decimal places
    return Math.round(percentageChange * 100) / 100;
  }

  /**
   * Calculate workers trend based on historical data
   * @param {number} currentWorkers - Current active workers count
   * @param {number} previousWorkers - Previous period workers count
   * @returns {number} Percentage change in workers
   */
  calculateWorkersTrend(currentWorkers, previousWorkers) {
    return this.calculatePercentageTrend(currentWorkers, previousWorkers);
  }

  /**
   * Calculate cost trend based on historical data
   * @param {number} currentCost - Current period total cost
   * @param {number} previousCost - Previous period total cost
   * @returns {number} Percentage change in cost
   */
  calculateCostTrend(currentCost, previousCost) {
    return this.calculatePercentageTrend(currentCost, previousCost);
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

      // Calculate previous period dates for trend comparison
      const previousEndDate = new Date(startDate);
      const previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - period);

      // Get all dashboard metrics in parallel
      const [
        payrollStats,
        employeeStats,
        timesheetStats,
        upcomingPayrolls,
        recentActivity,
        previousPayrollStats,
        previousEmployeeStats,
        pendingApprovals
      ] = await Promise.all([
        this.repository.getPayrollMetrics(organizationId, startDate, endDate),
        this.repository.getEmployeeMetrics(organizationId),
        this.repository.getTimesheetMetrics(organizationId, startDate, endDate),
        this.repository.getUpcomingPayrolls(organizationId, 5),
        this.repository.getRecentActivity(organizationId, 10),
        this.repository.getPayrollMetrics(organizationId, previousStartDate, previousEndDate),
        this.repository.getHistoricalEmployeeMetrics(organizationId, previousStartDate, previousEndDate),
        this.repository.getPendingApprovals(organizationId)
      ]);

      // Calculate trends
      const workersTrend = this.calculateWorkersTrend(
        employeeStats.activeEmployees,
        previousEmployeeStats.activeEmployees
      );
      const costTrend = this.calculateCostTrend(
        payrollStats.totalGrossPay,
        previousPayrollStats.totalGrossPay
      );

      // Calculate pending approvals count from timesheets
      const pendingTimesheetApprovals = timesheetStats.submittedTimesheets || 0;

      // Transform data to match frontend expectations
      return {
        summary: {
          totalWorkers: employeeStats.totalEmployees,
          activeWorkers: employeeStats.activeEmployees,
          workersTrend,
          pendingApprovals: pendingTimesheetApprovals + pendingApprovals.length,
          daysUntilPayroll: this.calculateDaysUntilNextPayroll(upcomingPayrolls),
          monthlyCost: payrollStats.totalGrossPay,
          costTrend
        },
        payroll: payrollStats,
        employees: employeeStats,
        timesheets: timesheetStats,
        upcomingPayrolls,
        recentActivity,
        pendingApprovals
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
