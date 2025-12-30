/**
 * Compliance DTO - Maps database compliance records to API response format
 * Handles snake_case to camelCase conversion
 */

/**
 * Map a single compliance rule from database format to API format
 * @param {Object} rule - Database compliance rule record (snake_case)
 * @returns {Object} API-formatted compliance rule (camelCase)
 */
function mapComplianceRuleToDto(rule) {
  if (!rule) return null;

  return {
    id: rule.id,
    organizationId: rule.organization_id,
    ruleName: rule.rule_name,
    ruleType: rule.rule_type,
    description: rule.description,
    threshold: rule.threshold,
    isActive: rule.is_active,
    effectiveDate: rule.effective_date,
    createdAt: rule.created_at,
    updatedAt: rule.updated_at,
    createdBy: rule.created_by,
    updatedBy: rule.updated_by
  };
}

/**
 * Map an array of compliance rules from database format to API format
 * @param {Array} rules - Array of database compliance rule records
 * @returns {Array} Array of API-formatted compliance rules
 */
function mapComplianceRulesToDto(rules) {
  if (!Array.isArray(rules)) return [];
  return rules.map(mapComplianceRuleToDto);
}

/**
 * Map a single compliance violation from database format to API format
 * @param {Object} violation - Database compliance violation record (snake_case)
 * @returns {Object} API-formatted compliance violation (camelCase)
 */
function mapComplianceViolationToDto(violation) {
  if (!violation) return null;

  return {
    id: violation.id,
    organizationId: violation.organization_id,
    ruleId: violation.rule_id,
    employeeId: violation.employee_id,
    violationType: violation.violation_type,
    severity: violation.severity,
    description: violation.description,
    detectedDate: violation.detected_date,
    resolvedDate: violation.resolved_date,
    status: violation.status,
    resolutionNotes: violation.resolution_notes,
    createdAt: violation.created_at,
    updatedAt: violation.updated_at
  };
}

/**
 * Map an array of compliance violations from database format to API format
 * @param {Array} violations - Array of database compliance violation records
 * @returns {Array} Array of API-formatted compliance violations
 */
function mapComplianceViolationsToDto(violations) {
  if (!Array.isArray(violations)) return [];
  return violations.map(mapComplianceViolationToDto);
}

/**
 * Map a single audit log from database format to API format
 * @param {Object} log - Database audit log record (snake_case)
 * @returns {Object} API-formatted audit log (camelCase)
 */
function mapAuditLogToDto(log) {
  if (!log) return null;

  return {
    id: log.id,
    organizationId: log.organization_id,
    entityType: log.entity_type,
    entityId: log.entity_id,
    action: log.action,
    performedBy: log.performed_by,
    changes: log.changes,
    createdAt: log.created_at
  };
}

/**
 * Map an array of audit logs from database format to API format
 * @param {Array} logs - Array of database audit log records
 * @returns {Array} Array of API-formatted audit logs
 */
function mapAuditLogsToDto(logs) {
  if (!Array.isArray(logs)) return [];
  return logs.map(mapAuditLogToDto);
}

export {
  mapComplianceRuleToDto,
  mapComplianceRulesToDto,
  mapComplianceViolationToDto,
  mapComplianceViolationsToDto,
  mapAuditLogToDto,
  mapAuditLogsToDto
};
