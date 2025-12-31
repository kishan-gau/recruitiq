/**
 * ReportsService
 * Business logic layer for reporting and analytics
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class ReportsService {
  
  logger: any;

constructor() {
    this.logger = logger;
  }

  /**
   * Get headcount report
   */
  async getHeadcountReport(organizationId, options = {}) {
    try {
      this.logger.info('Generating headcount report', { organizationId, options });

      const {
        departmentId,
        locationId,
        employmentType,
        groupBy = 'department' // department, location, employment_type
      } = options;

      let sql = `
        SELECT 
          COUNT(DISTINCT e.id) as total_employees,
          COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') as active_employees,
          COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'inactive') as inactive_employees,
          COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'terminated') as terminated_employees,
          COUNT(DISTINCT e.id) FILTER (WHERE e.gender = 'male') as male_count,
          COUNT(DISTINCT e.id) FILTER (WHERE e.gender = 'female') as female_count,
          COUNT(DISTINCT e.id) FILTER (WHERE e.gender NOT IN ('male', 'female') OR e.gender IS NULL) as other_gender_count
      `;

      if (groupBy === 'department') {
        sql += `,
          d.id as group_id,
          d.department_name as group_name,
          'department' as group_type
        FROM hris.employee e
        LEFT JOIN hris.department d ON e.department_id = d.id AND d.deleted_at IS NULL
        `;
      } else if (groupBy === 'location') {
        sql += `,
          l.id as group_id,
          l.location_name as group_name,
          'location' as group_type
        FROM hris.employee e
        LEFT JOIN hris.location l ON e.location_id = l.id AND l.deleted_at IS NULL
        `;
      } else if (groupBy === 'employment_type') {
        sql += `,
          e.employment_type as group_id,
          e.employment_type as group_name,
          'employment_type' as group_type
        FROM hris.employee e
        `;
      } else {
        sql += `
        FROM hris.employee e
        `;
      }

      sql += `
        WHERE e.organization_id = $1 
          AND e.deleted_at IS NULL
      `;

      const params = [organizationId];
      let paramIndex = 2;

      if (departmentId) {
        sql += ` AND e.department_id = $${paramIndex}`;
        params.push(departmentId);
        paramIndex++;
      }

      if (locationId) {
        sql += ` AND e.location_id = $${paramIndex}`;
        params.push(locationId);
        paramIndex++;
      }

      if (employmentType) {
        sql += ` AND e.employment_type = $${paramIndex}`;
        params.push(employmentType);
        paramIndex++;
      }

      if (groupBy !== 'none') {
        sql += ` GROUP BY `;
        if (groupBy === 'department') {
          sql += `d.id, d.department_name`;
        } else if (groupBy === 'location') {
          sql += `l.id, l.location_name`;
        } else if (groupBy === 'employment_type') {
          sql += `e.employment_type`;
        }
      }

      const result = await query(sql, params, organizationId, {
        operation: 'report',
        table: 'hris.employee'
      });

      return {
        report_type: 'headcount',
        generated_at: new Date().toISOString(),
        filters: { departmentId, locationId, employmentType },
        group_by: groupBy,
        data: result.rows
      };
    } catch (_error) {
      this.logger.error('Error generating headcount report', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get turnover report
   */
  async getTurnoverReport(organizationId, startDate, endDate) {
    try {
      this.logger.info('Generating turnover report', { 
        organizationId, 
        startDate, 
        endDate 
      });

      const sql = `
        WITH period_employees AS (
          SELECT COUNT(DISTINCT id) as employee_count
          FROM hris.employee
          WHERE organization_id = $1
            AND hire_date <= $3
            AND (termination_date IS NULL OR termination_date >= $2)
            AND deleted_at IS NULL
        ),
        terminations AS (
          SELECT 
            COUNT(*) as termination_count,
            COUNT(*) FILTER (WHERE termination_type = 'voluntary') as voluntary_count,
            COUNT(*) FILTER (WHERE termination_type = 'involuntary') as involuntary_count,
            d.id as department_id,
            d.department_name
          FROM hris.employee e
          LEFT JOIN hris.department d ON e.department_id = d.id AND d.deleted_at IS NULL
          WHERE e.organization_id = $1
            AND e.termination_date BETWEEN $2 AND $3
            AND e.deleted_at IS NULL
          GROUP BY d.id, d.department_name
        ),
        new_hires AS (
          SELECT COUNT(*) as hire_count
          FROM hris.employee
          WHERE organization_id = $1
            AND hire_date BETWEEN $2 AND $3
            AND deleted_at IS NULL
        )
        SELECT 
          pe.employee_count,
          COALESCE(SUM(t.termination_count), 0) as total_terminations,
          COALESCE(SUM(t.voluntary_count), 0) as voluntary_terminations,
          COALESCE(SUM(t.involuntary_count), 0) as involuntary_terminations,
          nh.hire_count as new_hires,
          CASE 
            WHEN pe.employee_count > 0 
            THEN ROUND((COALESCE(SUM(t.termination_count), 0)::numeric / pe.employee_count * 100), 2)
            ELSE 0 
          END as turnover_rate,
          json_agg(json_build_object(
            'department_id', t.department_id,
            'department_name', t.department_name,
            'terminations', t.termination_count,
            'voluntary', t.voluntary_count,
            'involuntary', t.involuntary_count
          )) FILTER (WHERE t.department_id IS NOT NULL) as by_department
        FROM period_employees pe
        CROSS JOIN new_hires nh
        LEFT JOIN terminations t ON true
        GROUP BY pe.employee_count, nh.hire_count
      `;

      const result = await query(sql, [organizationId, startDate, endDate], organizationId, {
        operation: 'report',
        table: 'hris.employee'
      });

      return {
        report_type: 'turnover',
        generated_at: new Date().toISOString(),
        period: { start_date: startDate, end_date: endDate },
        data: result.rows[0] || {
          employee_count: 0,
          total_terminations: 0,
          voluntary_terminations: 0,
          involuntary_terminations: 0,
          new_hires: 0,
          turnover_rate: 0,
          by_department: []
        }
      };
    } catch (_error) {
      this.logger.error('Error generating turnover report', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get time-off report
   */
  async getTimeOffReport(organizationId, startDate, endDate) {
    try {
      this.logger.info('Generating time-off report', { 
        organizationId, 
        startDate, 
        endDate 
      });

      const sql = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_requests,
          SUM(days) FILTER (WHERE status = 'approved') as total_days_taken,
          AVG(days) FILTER (WHERE status = 'approved') as avg_days_per_request,
          json_agg(DISTINCT jsonb_build_object(
            'leave_type', leave_type,
            'count', (SELECT COUNT(*) FROM hris.time_off_request 
                     WHERE organization_id = $1 
                       AND leave_type = tor.leave_type
                       AND start_date >= $2 AND end_date <= $3
                       AND deleted_at IS NULL),
            'total_days', (SELECT SUM(days) FROM hris.time_off_request 
                          WHERE organization_id = $1 
                            AND leave_type = tor.leave_type
                            AND status = 'approved'
                            AND start_date >= $2 AND end_date <= $3
                            AND deleted_at IS NULL)
          )) as by_leave_type
        FROM hris.time_off_request tor
        WHERE tor.organization_id = $1
          AND tor.start_date >= $2 
          AND tor.end_date <= $3
          AND tor.deleted_at IS NULL
      `;

      const result = await query(sql, [organizationId, startDate, endDate], organizationId, {
        operation: 'report',
        table: 'hris.time_off_request'
      });

      return {
        report_type: 'time_off',
        generated_at: new Date().toISOString(),
        period: { start_date: startDate, end_date: endDate },
        data: result.rows[0] || {
          total_requests: 0,
          pending_requests: 0,
          approved_requests: 0,
          rejected_requests: 0,
          cancelled_requests: 0,
          total_days_taken: 0,
          avg_days_per_request: 0,
          by_leave_type: []
        }
      };
    } catch (_error) {
      this.logger.error('Error generating time-off report', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get attendance report
   */
  async getAttendanceReport(organizationId, startDate, endDate) {
    try {
      this.logger.info('Generating attendance report', { 
        organizationId, 
        startDate, 
        endDate 
      });

      const sql = `
        SELECT 
          COUNT(DISTINCT employee_id) as total_employees,
          COUNT(*) as total_records,
          COUNT(*) FILTER (WHERE status = 'present') as present_count,
          COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
          COUNT(*) FILTER (WHERE status = 'late') as late_count,
          COUNT(*) FILTER (WHERE status = 'half_day') as half_day_count,
          SUM(hours_worked) as total_hours,
          AVG(hours_worked) FILTER (WHERE hours_worked > 0) as avg_hours_per_day,
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'present')::numeric / 
            NULLIF(COUNT(*), 0) * 100), 
            2
          ) as attendance_rate,
          json_agg(DISTINCT jsonb_build_object(
            'employee_id', e.id,
            'employee_name', e.first_name || ' ' || e.last_name,
            'present_days', (SELECT COUNT(*) FROM hris.attendance_record 
                            WHERE employee_id = a.employee_id 
                              AND status = 'present'
                              AND date BETWEEN $2 AND $3
                              AND deleted_at IS NULL),
            'absent_days', (SELECT COUNT(*) FROM hris.attendance_record 
                           WHERE employee_id = a.employee_id 
                             AND status = 'absent'
                             AND date BETWEEN $2 AND $3
                             AND deleted_at IS NULL),
            'late_days', (SELECT COUNT(*) FROM hris.attendance_record 
                         WHERE employee_id = a.employee_id 
                           AND status = 'late'
                           AND date BETWEEN $2 AND $3
                           AND deleted_at IS NULL),
            'total_hours', (SELECT SUM(hours_worked) FROM hris.attendance_record 
                           WHERE employee_id = a.employee_id 
                             AND date BETWEEN $2 AND $3
                             AND deleted_at IS NULL)
          )) as by_employee
        FROM hris.attendance_record a
        INNER JOIN hris.employee e ON a.employee_id = e.id AND e.deleted_at IS NULL
        WHERE a.organization_id = $1
          AND a.date BETWEEN $2 AND $3
          AND a.deleted_at IS NULL
      `;

      const result = await query(sql, [organizationId, startDate, endDate], organizationId, {
        operation: 'report',
        table: 'hris.attendance'
      });

      return {
        report_type: 'attendance',
        generated_at: new Date().toISOString(),
        period: { start_date: startDate, end_date: endDate },
        data: result.rows[0] || {
          total_employees: 0,
          total_records: 0,
          present_count: 0,
          absent_count: 0,
          late_count: 0,
          half_day_count: 0,
          total_hours: 0,
          avg_hours_per_day: 0,
          attendance_rate: 0,
          by_employee: []
        }
      };
    } catch (_error) {
      this.logger.error('Error generating attendance report', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get performance report
   */
  async getPerformanceReport(organizationId, startDate, endDate) {
    try {
      this.logger.info('Generating performance report', { 
        organizationId, 
        startDate, 
        endDate 
      });

      const sql = `
        SELECT 
          COUNT(*) as total_reviews,
          COUNT(DISTINCT employee_id) as employees_reviewed,
          AVG(overall_rating) as avg_rating,
          COUNT(*) FILTER (WHERE overall_rating >= 4) as excellent_count,
          COUNT(*) FILTER (WHERE overall_rating >= 3 AND overall_rating < 4) as good_count,
          COUNT(*) FILTER (WHERE overall_rating >= 2 AND overall_rating < 3) as satisfactory_count,
          COUNT(*) FILTER (WHERE overall_rating < 2) as needs_improvement_count,
          json_agg(DISTINCT jsonb_build_object(
            'review_period', review_period,
            'count', (SELECT COUNT(*) FROM hris.performance_review 
                     WHERE organization_id = $1 
                       AND review_period = pr.review_period
                       AND review_date BETWEEN $2 AND $3
                       AND deleted_at IS NULL),
            'avg_rating', (SELECT AVG(overall_rating) FROM hris.performance_review 
                          WHERE organization_id = $1 
                            AND review_period = pr.review_period
                            AND review_date BETWEEN $2 AND $3
                            AND deleted_at IS NULL)
          )) as by_period,
          json_agg(DISTINCT jsonb_build_object(
            'department_id', d.id,
            'department_name', d.department_name,
            'reviews', (SELECT COUNT(*) FROM hris.performance_review pr2
                       INNER JOIN hris.employee e2 ON pr2.employee_id = e2.id
                       WHERE pr2.organization_id = $1 
                         AND e2.department_id = d.id
                         AND pr2.review_date BETWEEN $2 AND $3
                         AND pr2.deleted_at IS NULL),
            'avg_rating', (SELECT AVG(pr2.overall_rating) FROM hris.performance_review pr2
                          INNER JOIN hris.employee e2 ON pr2.employee_id = e2.id
                          WHERE pr2.organization_id = $1 
                            AND e2.department_id = d.id
                            AND pr2.review_date BETWEEN $2 AND $3
                            AND pr2.deleted_at IS NULL)
          )) FILTER (WHERE d.id IS NOT NULL) as by_department
        FROM hris.performance_review pr
        INNER JOIN hris.employee e ON pr.employee_id = e.id AND e.deleted_at IS NULL
        LEFT JOIN hris.department d ON e.department_id = d.id AND d.deleted_at IS NULL
        WHERE pr.organization_id = $1
          AND pr.review_date BETWEEN $2 AND $3
          AND pr.deleted_at IS NULL
      `;

      const result = await query(sql, [organizationId, startDate, endDate], organizationId, {
        operation: 'report',
        table: 'hris.performance_review'
      });

      return {
        report_type: 'performance',
        generated_at: new Date().toISOString(),
        period: { start_date: startDate, end_date: endDate },
        data: result.rows[0] || {
          total_reviews: 0,
          employees_reviewed: 0,
          avg_rating: 0,
          excellent_count: 0,
          good_count: 0,
          satisfactory_count: 0,
          needs_improvement_count: 0,
          by_period: [],
          by_department: []
        }
      };
    } catch (_error) {
      this.logger.error('Error generating performance report', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get benefits enrollment report
   */
  async getBenefitsReport(organizationId) {
    try {
      this.logger.info('Generating benefits report', { organizationId });

      const sql = `
        SELECT 
          COUNT(DISTINCT bp.id) as total_plans,
          COUNT(DISTINCT bp.id) FILTER (WHERE bp.is_active = true) as active_plans,
          COUNT(DISTINCT be.id) as total_enrollments,
          COUNT(DISTINCT be.id) FILTER (WHERE be.status = 'active') as active_enrollments,
          COUNT(DISTINCT be.id) FILTER (WHERE be.status = 'pending') as pending_enrollments,
          COUNT(DISTINCT be.id) FILTER (WHERE be.status = 'terminated') as terminated_enrollments,
          COUNT(DISTINCT be.employee_id) as enrolled_employees,
          json_agg(DISTINCT jsonb_build_object(
            'plan_id', bp.id,
            'plan_name', bp.plan_name,
            'plan_type', bp.plan_type,
            'enrollments', (SELECT COUNT(*) FROM hris.benefits_enrollment 
                           WHERE plan_id = bp.id 
                             AND organization_id = $1
                             AND deleted_at IS NULL),
            'active_enrollments', (SELECT COUNT(*) FROM hris.benefits_enrollment 
                                  WHERE plan_id = bp.id 
                                    AND organization_id = $1
                                    AND status = 'active'
                                    AND deleted_at IS NULL),
            'total_cost', (SELECT SUM(employee_contribution + employer_contribution) 
                          FROM hris.benefits_enrollment 
                          WHERE plan_id = bp.id 
                            AND organization_id = $1
                            AND status = 'active'
                            AND deleted_at IS NULL)
          )) as by_plan
        FROM hris.benefits_plan bp
        LEFT JOIN hris.benefits_enrollment be ON bp.id = be.plan_id AND be.deleted_at IS NULL
        WHERE bp.organization_id = $1
          AND bp.deleted_at IS NULL
      `;

      const result = await query(sql, [organizationId], organizationId, {
        operation: 'report',
        table: 'hris.benefits_plan'
      });

      return {
        report_type: 'benefits',
        generated_at: new Date().toISOString(),
        data: result.rows[0] || {
          total_plans: 0,
          active_plans: 0,
          total_enrollments: 0,
          active_enrollments: 0,
          pending_enrollments: 0,
          terminated_enrollments: 0,
          enrolled_employees: 0,
          by_plan: []
        }
      };
    } catch (_error) {
      this.logger.error('Error generating benefits report', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get dashboard summary report
   */
  async getDashboardReport(organizationId) {
    try {
      this.logger.info('Generating dashboard report', { organizationId });

      // Get current counts
      const employeeSql = `
        SELECT 
          COUNT(*) as total_employees,
          COUNT(*) FILTER (WHERE status = 'active') as active_employees,
          COUNT(*) FILTER (WHERE hire_date >= CURRENT_DATE - INTERVAL '30 days') as new_hires_30d
        FROM hris.employee
        WHERE organization_id = $1 AND deleted_at IS NULL
      `;

      const timeOffSql = `
        SELECT COUNT(*) as pending_requests
        FROM hris.time_off_request
        WHERE organization_id = $1 
          AND status = 'pending' 
          AND deleted_at IS NULL
      `;

      const attendanceSql = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'present') as present_today,
          COUNT(*) FILTER (WHERE status = 'absent') as absent_today
        FROM hris.attendance
        WHERE organization_id = $1 
          AND date = CURRENT_DATE
          AND deleted_at IS NULL
      `;

      const documentSql = `
        SELECT COUNT(*) as expiring_documents
        FROM hris.employee_document
        WHERE organization_id = $1
          AND expiry_date IS NOT NULL
          AND expiry_date > CURRENT_DATE
          AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
          AND deleted_at IS NULL
      `;

      const [employees, timeOff, attendance, documents] = await Promise.all([
        query(employeeSql, [organizationId], organizationId),
        query(timeOffSql, [organizationId], organizationId),
        query(attendanceSql, [organizationId], organizationId),
        query(documentSql, [organizationId], organizationId)
      ]);

      return {
        report_type: 'dashboard',
        generated_at: new Date().toISOString(),
        data: {
          employees: employees.rows[0],
          time_off: timeOff.rows[0],
          attendance: attendance.rows[0],
          documents: documents.rows[0]
        }
      };
    } catch (_error) {
      this.logger.error('Error generating dashboard report', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }
}

export default ReportsService;
