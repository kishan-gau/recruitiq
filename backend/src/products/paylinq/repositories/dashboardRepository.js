/**
 * Paylinq Dashboard Repository
 * 
 * Database queries for dashboard metrics and statistics
 * 
 * @module products/paylinq/repositories/dashboardRepository
 */

import db from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class DashboardRepository {
  constructor(database = null) {
    this.db = database || db;
  }

  /**
   * Get payroll metrics for dashboard
 * @param {string} organizationId 
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Promise<Object>}
 */
  async getPayrollMetrics(organizationId, startDate, endDate) {
  try {
    const query = `
      SELECT 
        COUNT(DISTINCT pr.id) as total_payroll_runs,
        COUNT(DISTINCT CASE WHEN pr.status = 'completed' THEN pr.id END) as completed_runs,
        COUNT(DISTINCT CASE WHEN pr.status = 'processing' THEN pr.id END) as processing_runs,
        COUNT(DISTINCT pc.id) as total_paychecks,
        COALESCE(SUM(pc.gross_pay), 0) as total_gross_pay,
        COALESCE(SUM(pc.net_pay), 0) as total_net_pay,
        COALESCE(SUM(
          COALESCE(pc.federal_tax, 0) + 
          COALESCE(pc.state_tax, 0) + 
          COALESCE(pc.local_tax, 0) + 
          COALESCE(pc.social_security, 0) + 
          COALESCE(pc.medicare, 0) + 
          COALESCE(pc.wage_tax, 0) + 
          COALESCE(pc.aov_tax, 0) + 
          COALESCE(pc.aww_tax, 0)
        ), 0) as total_taxes,
        COALESCE(SUM(
          COALESCE(pc.pre_tax_deductions, 0) + 
          COALESCE(pc.post_tax_deductions, 0) + 
          COALESCE(pc.other_deductions, 0)
        ), 0) as total_deductions
      FROM payroll.payroll_run pr
      LEFT JOIN payroll.paycheck pc ON pr.id = pc.payroll_run_id
      WHERE pr.organization_id = $1
        AND pr.created_at BETWEEN $2 AND $3
        AND pr.deleted_at IS NULL
    `;

    const result = await this.db.query(query, [organizationId, startDate, endDate]);
    
    return {
      totalPayrollRuns: parseInt(result.rows[0].total_payroll_runs) || 0,
      completedRuns: parseInt(result.rows[0].completed_runs) || 0,
      processingRuns: parseInt(result.rows[0].processing_runs) || 0,
      totalPaychecks: parseInt(result.rows[0].total_paychecks) || 0,
      totalGrossPay: parseFloat(result.rows[0].total_gross_pay) || 0,
      totalNetPay: parseFloat(result.rows[0].total_net_pay) || 0,
      totalTaxes: parseFloat(result.rows[0].total_taxes) || 0,
      totalDeductions: parseFloat(result.rows[0].total_deductions) || 0
    };
  } catch (error) {
    logger.error('Error fetching payroll metrics', {
      error: error.message,
      organizationId
    });
    throw error;
  }
}

/**
 * Get employee metrics for dashboard
 * @param {string} organizationId 
 * @returns {Promise<Object>}
 */
  async getEmployeeMetrics(organizationId) {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN e.employment_status = 'active' THEN 1 END) as active_employees,
        COUNT(CASE WHEN e.employment_status = 'inactive' THEN 1 END) as inactive_employees,
        COUNT(DISTINCT wt.id) as worker_types_count
      FROM hris.employee e
      LEFT JOIN hris.worker_type wt ON e.worker_type_id = wt.id AND wt.organization_id = e.organization_id AND wt.deleted_at IS NULL
      WHERE e.organization_id = $1
        AND e.deleted_at IS NULL
    `;

    const result = await this.db.query(query, [organizationId]);
    
    // Get worker type breakdown
    const workerTypeQuery = `
      SELECT 
        wt.name as type_name,
        COUNT(e.id) as count
      FROM hris.worker_type wt
      LEFT JOIN hris.employee e ON e.worker_type_id = wt.id 
        AND e.organization_id = $1 
        AND e.deleted_at IS NULL
      WHERE wt.organization_id = $1
        AND wt.deleted_at IS NULL
      GROUP BY wt.name
      ORDER BY count DESC
    `;

    const workerTypeResult = await this.db.query(workerTypeQuery, [organizationId]);

    return {
      totalEmployees: parseInt(result.rows[0].total_employees) || 0,
      activeEmployees: parseInt(result.rows[0].active_employees) || 0,
      inactiveEmployees: parseInt(result.rows[0].inactive_employees) || 0,
      workerTypesCount: parseInt(result.rows[0].worker_types_count) || 0,
      workerTypeBreakdown: workerTypeResult.rows
    };
  } catch (error) {
    logger.error('Error fetching employee metrics', {
      error: error.message,
      organizationId
    });
    throw error;
  }
}

/**
 * Get timesheet metrics for dashboard
 * @param {string} organizationId 
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Promise<Object>}
 */
  async getTimesheetMetrics(organizationId, startDate, endDate) {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_timesheets,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_timesheets,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_timesheets,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_timesheets,
        COALESCE(SUM(
          COALESCE(regular_hours, 0) + 
          COALESCE(overtime_hours, 0) + 
          COALESCE(pto_hours, 0) + 
          COALESCE(sick_hours, 0)
        ), 0) as total_hours_logged
      FROM payroll.timesheet
      WHERE organization_id = $1
        AND period_start >= $2
        AND period_end <= $3
        AND deleted_at IS NULL
    `;

    const result = await this.db.query(query, [organizationId, startDate, endDate]);
    
    return {
      totalTimesheets: parseInt(result.rows[0].total_timesheets) || 0,
      submittedTimesheets: parseInt(result.rows[0].submitted_timesheets) || 0,
      approvedTimesheets: parseInt(result.rows[0].approved_timesheets) || 0,
      rejectedTimesheets: parseInt(result.rows[0].rejected_timesheets) || 0,
      totalHoursLogged: parseFloat(result.rows[0].total_hours_logged) || 0
    };
  } catch (error) {
    logger.error('Error fetching timesheet metrics', {
      error: error.message,
      organizationId
    });
    throw error;
  }
}

/**
 * Get upcoming payroll runs
 * @param {string} organizationId 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
  async getUpcomingPayrolls(organizationId, limit = 5) {
  try {
    const query = `
      SELECT 
        id,
        run_number,
        pay_period_start,
        pay_period_end,
        payment_date,
        status,
        created_at
      FROM payroll.payroll_run
      WHERE organization_id = $1
        AND status IN ('draft', 'processing', 'calculated')
        AND deleted_at IS NULL
      ORDER BY payment_date ASC
      LIMIT $2
    `;

    const result = await this.db.query(query, [organizationId, limit]);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching upcoming payrolls', {
      error: error.message,
      organizationId
    });
    throw error;
  }
}

/**
 * Get recent activity feed
 * @param {string} organizationId 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
  async getRecentActivity(organizationId, limit = 10) {
  try {
    // Combine multiple activity sources
    const query = `
      SELECT * FROM (
        -- Payroll runs
        SELECT 
          'payroll_run' as activity_type,
          pr.id as entity_id,
          pr.run_number as title,
          'Payroll run ' || pr.status as description,
          pr.updated_at as activity_date
        FROM payroll.payroll_run pr
        WHERE pr.organization_id = $1 AND pr.deleted_at IS NULL
        
        UNION ALL
        
        -- Timesheets
        SELECT 
          'timesheet' as activity_type,
          t.id as entity_id,
          'Timesheet #' || t.id as title,
          'Timesheet ' || t.status as description,
          t.updated_at as activity_date
        FROM payroll.timesheet t
        WHERE t.organization_id = $1 AND t.deleted_at IS NULL
        
        UNION ALL
        
        -- Employees
        SELECT 
          'employee' as activity_type,
          e.id as entity_id,
          'Employee #' || e.employee_number as title,
          'Employee ' || e.employment_status as description,
          e.updated_at as activity_date
        FROM hris.employee e
        WHERE e.organization_id = $1 AND e.deleted_at IS NULL
      ) activities
      ORDER BY activity_date DESC
      LIMIT $2
    `;

    const result = await this.db.query(query, [organizationId, limit]);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching recent activity', {
      error: error.message,
      organizationId
    });
    throw error;
  }
}

/**
 * Get historical employee count for trend calculation
 * @param {string} organizationId 
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Promise<Object>}
 */
  async getHistoricalEmployeeMetrics(organizationId, startDate, endDate) {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN e.employment_status = 'active' THEN 1 END) as active_employees
      FROM hris.employee e
      WHERE e.organization_id = $1
        AND e.created_at < $3
        AND (e.deleted_at IS NULL OR e.deleted_at >= $2)
    `;

    const result = await this.db.query(query, [organizationId, startDate, endDate]);
    
    return {
      totalEmployees: parseInt(result.rows[0].total_employees) || 0,
      activeEmployees: parseInt(result.rows[0].active_employees) || 0
    };
  } catch (error) {
    logger.error('Error fetching historical employee metrics', {
      error: error.message,
      organizationId
    });
    throw error;
  }
}

/**
 * Get pending approvals count
 * @param {string} organizationId 
 * @returns {Promise<Array>}
 */
  async getPendingApprovals(organizationId) {
  try {
    // Check if currency_approval_request table exists in payroll schema
    const query = `
      SELECT 
        id,
        request_type,
        reference_type,
        reference_id,
        priority,
        required_approvals,
        current_approvals,
        expires_at,
        created_at
      FROM payroll.currency_approval_request
      WHERE organization_id = $1
        AND status = 'pending'
        AND deleted_at IS NULL
      ORDER BY priority DESC, created_at ASC
      LIMIT 50
    `;

    const result = await this.db.query(query, [organizationId]);
    return result.rows;
  } catch (error) {
    // If table doesn't exist or query fails, return empty array
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      logger.warn('Currency approval request table not found, returning empty approvals', {
        organizationId
      });
      return [];
    }
    logger.error('Error fetching pending approvals', {
      error: error.message,
      organizationId
    });
    throw error;
  }
}

}

export default DashboardRepository;
