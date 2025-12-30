/**
 * Compliance Repository
 * Data access layer for compliance-related operations
 */

import pool from '../../../config/database.js';

class ComplianceRepository {
  constructor() {
    this.db = pool;
  }

  /**
   * Create compliance rule
   */
  async createComplianceRule(ruleData, organizationId, userId) {
    const query = `
      INSERT INTO compliance_rules (
        organization_id, rule_name, rule_type, description, 
        is_active, effective_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      organizationId,
      ruleData.ruleName,
      ruleData.ruleType,
      ruleData.description,
      ruleData.isActive !== false,
      ruleData.effectiveDate,
      userId
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find compliance rules by type
   */
  async findComplianceRulesByType(organizationId, ruleType, options = {}) {
    let query = `
      SELECT * FROM compliance_rules
      WHERE organization_id = $1 AND rule_type = $2
    `;
    const values = [organizationId, ruleType];
    
    if (options.isActive !== undefined) {
      query += ` AND is_active = $${values.length + 1}`;
      values.push(options.isActive);
    }
    
    query += ' ORDER BY effective_date DESC';
    
    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Update compliance rule
   */
  async updateComplianceRule(ruleId, updates) {
    const query = `
      UPDATE compliance_rules
      SET rule_name = COALESCE($1, rule_name),
          description = COALESCE($2, description),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    
    const values = [
      updates.ruleName,
      updates.description,
      updates.isActive,
      ruleId
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Create compliance check
   */
  async createComplianceCheck(checkData) {
    const query = `
      INSERT INTO compliance_checks (
        rule_id, status, issues, check_date, checked_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      checkData.ruleId,
      checkData.status,
      JSON.stringify(checkData.issues || []),
      checkData.checkDate || new Date(),
      checkData.checkedBy
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find compliance checks
   */
  async findComplianceChecks(options = {}) {
    let query = 'SELECT * FROM compliance_checks WHERE 1=1';
    const values = [];
    
    if (options.ruleId) {
      values.push(options.ruleId);
      query += ` AND rule_id = $${values.length}`;
    }
    
    if (options.status) {
      values.push(options.status);
      query += ` AND status = $${values.length}`;
    }
    
    query += ' ORDER BY check_date DESC';
    
    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Create compliance violation
   */
  async createComplianceViolation(violationData) {
    const query = `
      INSERT INTO compliance_violations (
        employee_id, violation_type, severity, description, 
        status, detected_date
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      violationData.employeeId,
      violationData.violationType,
      violationData.severity,
      violationData.description,
      violationData.status || 'open',
      violationData.detectedDate || new Date()
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find compliance violations
   */
  async findComplianceViolations(options = {}) {
    let query = 'SELECT * FROM compliance_violations WHERE 1=1';
    const values = [];
    
    if (options.employeeId) {
      values.push(options.employeeId);
      query += ` AND employee_id = $${values.length}`;
    }
    
    if (options.status) {
      values.push(options.status);
      query += ` AND status = $${values.length}`;
    }
    
    if (options.severity) {
      values.push(options.severity);
      query += ` AND severity = $${values.length}`;
    }
    
    query += ' ORDER BY detected_date DESC';
    
    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Update compliance violation
   */
  async updateComplianceViolation(violationId, updates) {
    const query = `
      UPDATE compliance_violations
      SET status = COALESCE($1, status),
          resolution_notes = COALESCE($2, resolution_notes),
          resolved_date = COALESCE($3, resolved_date),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    
    const values = [
      updates.status,
      updates.resolutionNotes,
      updates.resolvedDate,
      violationId
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get open violation count
   */
  async getOpenViolationCount(options = {}) {
    let query = 'SELECT COUNT(*) FROM compliance_violations WHERE status = $1';
    const values = ['open'];
    
    if (options.employeeId) {
      values.push(options.employeeId);
      query += ` AND employee_id = $${values.length}`;
    }
    
    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Create audit log
   */
  async createAuditLog(logData) {
    const query = `
      INSERT INTO compliance_audit_logs (
        entity_type, entity_id, action, performed_by, details
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      logData.entityType,
      logData.entityId,
      logData.action,
      logData.performedBy,
      JSON.stringify(logData.details || {})
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find audit logs
   */
  async findAuditLogs(options = {}) {
    let query = 'SELECT * FROM compliance_audit_logs WHERE 1=1';
    const values = [];
    
    if (options.entityType && options.entityId) {
      values.push(options.entityType, options.entityId);
      query += ` AND entity_type = $${values.length - 1} AND entity_id = $${values.length}`;
    }
    
    if (options.action) {
      values.push(options.action);
      query += ` AND action = $${values.length}`;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Get compliance requirements for jurisdiction
   */
  async getComplianceRequirements(jurisdictionId) {
    const query = `
      SELECT * FROM compliance_requirements
      WHERE jurisdiction_id = $1
      AND is_active = true
      ORDER BY requirement_type, created_at DESC
    `;
    
    const result = await this.db.query(query, [jurisdictionId]);
    return result.rows;
  }

  /**
   * Log compliance check
   */
  async logComplianceCheck(checkData) {
    const query = `
      INSERT INTO compliance_checks (
        payroll_run_id,
        check_type,
        status,
        issues,
        checked_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    
    const values = [
      checkData.payroll_run_id,
      checkData.check_type,
      checkData.status,
      JSON.stringify(checkData.issues || [])
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get compliance history
   */
  async getComplianceHistory(organizationId, startDate, endDate) {
    const query = `
      SELECT * FROM compliance_checks
      WHERE organization_id = $1
      AND checked_at BETWEEN $2 AND $3
      ORDER BY checked_at DESC
    `;
    
    const result = await this.db.query(query, [organizationId, startDate, endDate]);
    return result.rows;
  }
}

export default ComplianceRepository;
