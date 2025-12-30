import { query } from '../../../config/database.ts';

/**
 * RoleAuditLog Model
 * Tracks all RBAC-related changes for audit trail
 * Based on: docs/rbac/02-BACKEND-IMPLEMENTATION.md
 */
class RoleAuditLog {
  /**
   * Log an RBAC action
   * @param {Object} data - Audit log data
   * @param {string} data.organizationId - Organization UUID
   * @param {string} data.entityType - Type of entity ('role', 'permission', 'role_permission', 'user_role')
   * @param {string} data.entityId - Entity UUID
   * @param {string} data.action - Action performed ('create', 'update', 'delete', 'assign', 'revoke', etc.)
   * @param {Object} data.changes - Before/after values or change details
   * @param {string} data.performedBy - User UUID performing the action
   * @param {string} data.ipAddress - IP address (optional)
   * @param {string} data.userAgent - User agent string (optional)
   * @returns {Promise<Object>} Created audit log entry
   */
  static async log(data) {
    const result = await query(
      `
      INSERT INTO role_audit_log (
        organization_id,
        entity_type,
        entity_id,
        action,
        changes,
        performed_by,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        data.organizationId || null,
        data.entityType,
        data.entityId,
        data.action,
        JSON.stringify(data.changes),
        data.performedBy || null,
        data.ipAddress || null,
        data.userAgent || null
      ]
    );

    return result.rows[0];
  }

  /**
   * Get audit logs for an organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @param {string} filters.entityType - Filter by entity type
   * @param {string} filters.entityId - Filter by entity ID
   * @param {string} filters.action - Filter by action
   * @param {string} filters.performedBy - Filter by user
   * @param {Date} filters.startDate - Filter by start date
   * @param {Date} filters.endDate - Filter by end date
   * @param {number} filters.limit - Limit results (default 100)
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Array>} Array of audit log entries
   */
  static async findByOrganization(organizationId, filters = {}) {
    let sql = `
      SELECT 
        al.*,
        u.email as performed_by_email
      FROM role_audit_log al
      LEFT JOIN hris.user_account u ON al.performed_by = u.id
      WHERE al.organization_id = $1
    `;
    
    const values = [organizationId];
    let paramCount = 1;

    if (filters.entityType) {
      paramCount++;
      sql += ` AND al.entity_type = $${paramCount}`;
      values.push(filters.entityType);
    }

    if (filters.entityId) {
      paramCount++;
      sql += ` AND al.entity_id = $${paramCount}`;
      values.push(filters.entityId);
    }

    if (filters.action) {
      paramCount++;
      sql += ` AND al.action = $${paramCount}`;
      values.push(filters.action);
    }

    if (filters.performedBy) {
      paramCount++;
      sql += ` AND al.performed_by = $${paramCount}`;
      values.push(filters.performedBy);
    }

    if (filters.startDate) {
      paramCount++;
      sql += ` AND al.created_at >= $${paramCount}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      sql += ` AND al.created_at <= $${paramCount}`;
      values.push(filters.endDate);
    }

    sql += ` ORDER BY al.created_at DESC`;

    const limit = filters.limit || 100;
    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    values.push(limit);

    if (filters.offset) {
      paramCount++;
      sql += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await query(sql, values, organizationId, {
      operation: 'SELECT',
      table: 'role_audit_log'
    });

    return result.rows;
  }

  /**
   * Get audit logs for a specific entity
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of audit log entries
   */
  static async findByEntity(entityType, entityId, organizationId) {
    const result = await query(
      `
      SELECT 
        al.*,
        u.email as performed_by_email
      FROM role_audit_log al
      LEFT JOIN hris.user_account u ON al.performed_by = u.id
      WHERE al.entity_type = $1
        AND al.entity_id = $2
        AND (al.organization_id = $3 OR al.organization_id IS NULL)
      ORDER BY al.created_at DESC
      `,
      [entityType, entityId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'role_audit_log' }
    );

    return result.rows;
  }

  /**
   * Get audit logs for a specific user's actions
   * @param {string} userId - User UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of audit log entries
   */
  static async findByUser(userId, organizationId, filters = {}) {
    let sql = `
      SELECT al.*
      FROM role_audit_log al
      WHERE al.performed_by = $1
        AND (al.organization_id = $2 OR al.organization_id IS NULL)
    `;
    
    const values = [userId, organizationId];
    let paramCount = 2;

    if (filters.startDate) {
      paramCount++;
      sql += ` AND al.created_at >= $${paramCount}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      sql += ` AND al.created_at <= $${paramCount}`;
      values.push(filters.endDate);
    }

    sql += ` ORDER BY al.created_at DESC`;

    const limit = filters.limit || 100;
    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    values.push(limit);

    const result = await query(sql, values, organizationId, {
      operation: 'SELECT',
      table: 'role_audit_log'
    });

    return result.rows;
  }

  /**
   * Get count of audit logs by action type
   * @param {string} organizationId - Organization UUID
   * @param {Date} startDate - Start date (optional)
   * @param {Date} endDate - End date (optional)
   * @returns {Promise<Array>} Array of {action, count}
   */
  static async getActionCounts(organizationId, startDate = null, endDate = null) {
    let sql = `
      SELECT 
        action,
        COUNT(*) as count
      FROM role_audit_log
      WHERE organization_id = $1
    `;
    
    const values = [organizationId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      sql += ` AND created_at >= $${paramCount}`;
      values.push(startDate);
    }

    if (endDate) {
      paramCount++;
      sql += ` AND created_at <= $${paramCount}`;
      values.push(endDate);
    }

    sql += `
      GROUP BY action
      ORDER BY count DESC
    `;

    const result = await query(sql, values, organizationId, {
      operation: 'SELECT',
      table: 'role_audit_log'
    });

    return result.rows;
  }
}

export default RoleAuditLog;
