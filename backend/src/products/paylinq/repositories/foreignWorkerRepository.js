/**
 * Foreign Worker Compliance Repository
 * Data access layer for work permits, visas, and tax residency
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class ForeignWorkerRepository {
  // ==================== WORK PERMITS ====================

  /**
   * Create a work permit record
   */
  async createWorkPermit(permitData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.work_permit (
        organization_id, employee_id, permit_number, permit_type,
        issuing_country, issuing_authority, issue_date, expiry_date,
        renewal_date, status, restrictions, sponsor, notes, document_url,
        alert_days_before_expiry, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        organizationId,
        permitData.employee_id,
        permitData.permit_number,
        permitData.permit_type,
        permitData.issuing_country,
        permitData.issuing_authority,
        permitData.issue_date,
        permitData.expiry_date,
        permitData.renewal_date,
        permitData.status || 'active',
        permitData.restrictions,
        permitData.sponsor,
        permitData.notes,
        permitData.document_url,
        permitData.alert_days_before_expiry || 90,
        userId,
      ],
      organizationId,
      { operation: 'INSERT', table: 'work_permit' }
    );

    return result.rows[0];
  }

  /**
   * Find work permits by employee ID
   */
  async findWorkPermitsByEmployee(employeeId, organizationId, filters = {}) {
    const conditions = ['employee_id = $1', 'organization_id = $2', 'deleted_at IS NULL'];
    const params = [employeeId, organizationId];
    let paramIndex = 3;

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`status = $${paramIndex++}`);
    }

    if (filters.permitType) {
      params.push(filters.permitType);
      conditions.push(`permit_type = $${paramIndex++}`);
    }

    const whereClause = conditions.join(' AND ');

    const result = await query(
      `SELECT * FROM payroll.work_permit
       WHERE ${whereClause}
       ORDER BY expiry_date DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'work_permit' }
    );

    return result.rows;
  }

  /**
   * Find work permit by ID
   */
  async findWorkPermitById(permitId, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.work_permit
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [permitId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'work_permit' }
    );

    return result.rows[0];
  }

  /**
   * Update work permit
   */
  async updateWorkPermit(permitId, updates, organizationId, userId) {
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      params.push(value);
      setClauses.push(`${key} = $${paramIndex++}`);
    });

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(userId, permitId, organizationId);
    setClauses.push(`updated_by = $${paramIndex++}`);
    setClauses.push('updated_at = NOW()');

    const result = await query(
      `UPDATE payroll.work_permit
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'work_permit' }
    );

    return result.rows[0];
  }

  /**
   * Get expiring work permits (within specified days)
   */
  async findExpiringWorkPermits(organizationId, daysAhead = 90) {
    const result = await query(
      `SELECT wp.*, ua.first_name, ua.last_name, ua.email
       FROM payroll.work_permit wp
       JOIN hris.user_account ua ON wp.employee_id = ua.id
       WHERE wp.organization_id = $1
         AND wp.deleted_at IS NULL
         AND wp.status = 'active'
         AND wp.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $2
         AND wp.expiry_date >= CURRENT_DATE
       ORDER BY wp.expiry_date ASC`,
      [organizationId, daysAhead],
      organizationId,
      { operation: 'SELECT', table: 'work_permit' }
    );

    return result.rows;
  }

  /**
   * Get expired work permits
   */
  async findExpiredWorkPermits(organizationId) {
    const result = await query(
      `SELECT wp.*, ua.first_name, ua.last_name, ua.email
       FROM payroll.work_permit wp
       JOIN hris.user_account ua ON wp.employee_id = ua.id
       WHERE wp.organization_id = $1
         AND wp.deleted_at IS NULL
         AND wp.status = 'active'
         AND wp.expiry_date < CURRENT_DATE
       ORDER BY wp.expiry_date DESC`,
      [organizationId],
      organizationId,
      { operation: 'SELECT', table: 'work_permit' }
    );

    return result.rows;
  }

  // ==================== VISA STATUS ====================

  /**
   * Create a visa status record
   */
  async createVisaStatus(visaData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.visa_status (
        organization_id, employee_id, visa_number, visa_type,
        issuing_country, destination_country, issue_date, expiry_date,
        entry_date, status, max_stay_days, entries_allowed, notes,
        document_url, alert_days_before_expiry, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        organizationId,
        visaData.employee_id,
        visaData.visa_number,
        visaData.visa_type,
        visaData.issuing_country,
        visaData.destination_country,
        visaData.issue_date,
        visaData.expiry_date,
        visaData.entry_date,
        visaData.status || 'active',
        visaData.max_stay_days,
        visaData.entries_allowed,
        visaData.notes,
        visaData.document_url,
        visaData.alert_days_before_expiry || 60,
        userId,
      ],
      organizationId,
      { operation: 'INSERT', table: 'visa_status' }
    );

    return result.rows[0];
  }

  /**
   * Find visa statuses by employee ID
   */
  async findVisaStatusesByEmployee(employeeId, organizationId, filters = {}) {
    const conditions = ['employee_id = $1', 'organization_id = $2', 'deleted_at IS NULL'];
    const params = [employeeId, organizationId];
    let paramIndex = 3;

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`status = $${paramIndex++}`);
    }

    if (filters.visaType) {
      params.push(filters.visaType);
      conditions.push(`visa_type = $${paramIndex++}`);
    }

    const whereClause = conditions.join(' AND ');

    const result = await query(
      `SELECT * FROM payroll.visa_status
       WHERE ${whereClause}
       ORDER BY expiry_date DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'visa_status' }
    );

    return result.rows;
  }

  /**
   * Find visa status by ID
   */
  async findVisaStatusById(visaId, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.visa_status
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [visaId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'visa_status' }
    );

    return result.rows[0];
  }

  /**
   * Update visa status
   */
  async updateVisaStatus(visaId, updates, organizationId, userId) {
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      params.push(value);
      setClauses.push(`${key} = $${paramIndex++}`);
    });

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(userId, visaId, organizationId);
    setClauses.push(`updated_by = $${paramIndex++}`);
    setClauses.push('updated_at = NOW()');

    const result = await query(
      `UPDATE payroll.visa_status
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'visa_status' }
    );

    return result.rows[0];
  }

  /**
   * Get expiring visas (within specified days)
   */
  async findExpiringVisas(organizationId, daysAhead = 60) {
    const result = await query(
      `SELECT vs.*, ua.first_name, ua.last_name, ua.email
       FROM payroll.visa_status vs
       JOIN hris.user_account ua ON vs.employee_id = ua.id
       WHERE vs.organization_id = $1
         AND vs.deleted_at IS NULL
         AND vs.status = 'active'
         AND vs.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $2
         AND vs.expiry_date >= CURRENT_DATE
       ORDER BY vs.expiry_date ASC`,
      [organizationId, daysAhead],
      organizationId,
      { operation: 'SELECT', table: 'visa_status' }
    );

    return result.rows;
  }

  // ==================== TAX RESIDENCY ====================

  /**
   * Create a tax residency record
   */
  async createTaxResidency(residencyData, organizationId, userId) {
    // Set all other current residencies for this employee to non-current
    if (residencyData.is_current) {
      await query(
        `UPDATE payroll.tax_residency
         SET is_current = false, updated_at = NOW(), updated_by = $1
         WHERE employee_id = $2 AND organization_id = $3 AND is_current = true AND deleted_at IS NULL`,
        [userId, residencyData.employee_id, organizationId],
        organizationId,
        { operation: 'UPDATE', table: 'tax_residency' }
      );
    }

    const result = await query(
      `INSERT INTO payroll.tax_residency (
        organization_id, employee_id, country, tax_identification_number,
        residency_type, effective_from, effective_to, is_current,
        treaty_country, treaty_article, withholding_rate, days_in_country,
        permanent_establishment, center_of_vital_interests, notes,
        certificate_url, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        organizationId,
        residencyData.employee_id,
        residencyData.country,
        residencyData.tax_identification_number,
        residencyData.residency_type,
        residencyData.effective_from,
        residencyData.effective_to,
        residencyData.is_current !== undefined ? residencyData.is_current : true,
        residencyData.treaty_country,
        residencyData.treaty_article,
        residencyData.withholding_rate,
        residencyData.days_in_country,
        residencyData.permanent_establishment,
        residencyData.center_of_vital_interests,
        residencyData.notes,
        residencyData.certificate_url,
        userId,
      ],
      organizationId,
      { operation: 'INSERT', table: 'tax_residency' }
    );

    return result.rows[0];
  }

  /**
   * Find tax residencies by employee ID
   */
  async findTaxResidenciesByEmployee(employeeId, organizationId, currentOnly = false) {
    const conditions = ['employee_id = $1', 'organization_id = $2', 'deleted_at IS NULL'];
    const params = [employeeId, organizationId];

    if (currentOnly) {
      conditions.push('is_current = true');
    }

    const whereClause = conditions.join(' AND ');

    const result = await query(
      `SELECT * FROM payroll.tax_residency
       WHERE ${whereClause}
       ORDER BY effective_from DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'tax_residency' }
    );

    return result.rows;
  }

  /**
   * Find current tax residency for employee
   */
  async findCurrentTaxResidency(employeeId, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.tax_residency
       WHERE employee_id = $1 AND organization_id = $2 AND is_current = true AND deleted_at IS NULL
       LIMIT 1`,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'tax_residency' }
    );

    return result.rows[0];
  }

  /**
   * Update tax residency
   */
  async updateTaxResidency(residencyId, updates, organizationId, userId) {
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      params.push(value);
      setClauses.push(`${key} = $${paramIndex++}`);
    });

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(userId, residencyId, organizationId);
    setClauses.push(`updated_by = $${paramIndex++}`);
    setClauses.push('updated_at = NOW()');

    const result = await query(
      `UPDATE payroll.tax_residency
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'tax_residency' }
    );

    return result.rows[0];
  }

  // ==================== COMPLIANCE AUDIT LOG ====================

  /**
   * Create compliance audit log entry
   */
  async createComplianceAuditLog(logData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.compliance_audit_log (
        organization_id, employee_id, event_type, event_category, severity,
        description, event_data, work_permit_id, visa_status_id,
        tax_residency_id, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        organizationId,
        logData.employee_id,
        logData.event_type,
        logData.event_category,
        logData.severity || 'info',
        logData.description,
        logData.event_data ? JSON.stringify(logData.event_data) : null,
        logData.work_permit_id,
        logData.visa_status_id,
        logData.tax_residency_id,
        logData.status || 'open',
        userId,
      ],
      organizationId,
      { operation: 'INSERT', table: 'compliance_audit_log' }
    );

    return result.rows[0];
  }

  /**
   * Find compliance audit logs
   */
  async findComplianceAuditLogs(organizationId, filters = {}) {
    const conditions = ['organization_id = $1'];
    const params = [organizationId];
    let paramIndex = 2;

    if (filters.employeeId) {
      params.push(filters.employeeId);
      conditions.push(`employee_id = $${paramIndex++}`);
    }

    if (filters.eventCategory) {
      params.push(filters.eventCategory);
      conditions.push(`event_category = $${paramIndex++}`);
    }

    if (filters.severity) {
      params.push(filters.severity);
      conditions.push(`severity = $${paramIndex++}`);
    }

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`status = $${paramIndex++}`);
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters.limit || 100;

    const result = await query(
      `SELECT * FROM payroll.compliance_audit_log
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${limit}`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'compliance_audit_log' }
    );

    return result.rows;
  }

  /**
   * Get compliance summary for organization
   */
  async getComplianceSummary(organizationId) {
    const result = await query(
      `SELECT * FROM payroll.compliance_summary
       WHERE organization_id = $1`,
      [organizationId],
      organizationId,
      { operation: 'SELECT', table: 'compliance_summary' }
    );

    return result.rows[0];
  }
}

export default ForeignWorkerRepository;
