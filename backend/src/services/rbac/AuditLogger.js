/**
 * RBAC Audit Logger
 * 
 * Logs security-critical RBAC events for compliance and security monitoring.
 * All permission checks, role changes, and access attempts are logged.
 * 
 * Part of: Centralized RBAC System
 * Version: 1.0.0
 * Created: November 30, 2025
 */

import logger from '../../utils/logger.js';
import { query } from '../../config/database.js';

/**
 * RBAC-specific security event types
 */
export const RBAC_EVENTS = {
  // Permission checks
  PERMISSION_CHECK_SUCCESS: 'rbac_permission_check_success',
  PERMISSION_CHECK_FAILED: 'rbac_permission_check_failed',
  PERMISSION_CHECK_ERROR: 'rbac_permission_check_error',
  
  // Role operations
  ROLE_ASSIGNED: 'rbac_role_assigned',
  ROLE_REVOKED: 'rbac_role_revoked',
  ROLE_CREATED: 'rbac_role_created',
  ROLE_UPDATED: 'rbac_role_updated',
  ROLE_DELETED: 'rbac_role_deleted',
  
  // Permission operations
  PERMISSION_CREATED: 'rbac_permission_created',
  PERMISSION_UPDATED: 'rbac_permission_updated',
  PERMISSION_DELETED: 'rbac_permission_deleted',
  PERMISSION_GRANTED: 'rbac_permission_granted',
  PERMISSION_REVOKED: 'rbac_permission_revoked',
  
  // Access attempts
  UNAUTHORIZED_ACCESS_ATTEMPT: 'rbac_unauthorized_access',
  FORBIDDEN_ACCESS_ATTEMPT: 'rbac_forbidden_access',
  PRIVILEGE_ESCALATION_ATTEMPT: 'rbac_privilege_escalation',
  
  // Admin operations
  RBAC_ADMIN_ACTION: 'rbac_admin_action',
  BULK_PERMISSION_CHANGE: 'rbac_bulk_permission_change',
  EMERGENCY_ACCESS_GRANTED: 'rbac_emergency_access',
  
  // Suspicious activity
  REPEATED_PERMISSION_FAILURES: 'rbac_repeated_failures',
  UNUSUAL_PERMISSION_PATTERN: 'rbac_unusual_pattern',
  CROSS_TENANT_ACCESS_ATTEMPT: 'rbac_cross_tenant_attempt'
};

/**
 * Severity levels for RBAC events
 */
export const RBAC_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

class AuditLogger {
  /**
   * Logs a permission check (success or failure)
   * 
   * @param {Object} params - Audit parameters
   * @param {string} params.userId - User attempting access
   * @param {string} params.organizationId - Organization context
   * @param {string} params.permission - Permission being checked
   * @param {boolean} params.granted - Whether permission was granted
   * @param {string} params.resource - Resource being accessed
   * @param {string} params.action - Action being performed
   * @param {Object} params.context - Additional context
   */
  async logPermissionCheck({ 
    userId, 
    organizationId, 
    permission, 
    granted, 
    resource, 
    action,
    context = {} 
  }) {
    const eventType = granted 
      ? RBAC_EVENTS.PERMISSION_CHECK_SUCCESS 
      : RBAC_EVENTS.PERMISSION_CHECK_FAILED;
    
    const severity = granted 
      ? RBAC_SEVERITY.INFO 
      : RBAC_SEVERITY.WARNING;

    const details = {
      permission,
      resource,
      action,
      granted,
      userAgent: context.userAgent,
      ip: context.ip,
      endpoint: context.endpoint,
      method: context.method,
      timestamp: new Date().toISOString()
    };

    // Log to application logger
    logger.logSecurityEvent(eventType, {
      userId,
      organizationId,
      severity,
      ...details
    });

    // Log to database for persistent audit trail
    await this.persistSecurityEvent({
      eventType,
      severity,
      tenantId: organizationId,
      userId,
      userEmail: context.userEmail,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      resource,
      action,
      outcome: granted ? 'success' : 'denied',
      details
    });
  }

  /**
   * Logs a role assignment or revocation
   * 
   * @param {Object} params - Audit parameters
   */
  async logRoleChange({ 
    userId, 
    targetUserId,
    organizationId, 
    roleId,
    roleName,
    operation, // 'assigned' | 'revoked'
    performedBy,
    context = {} 
  }) {
    const eventType = operation === 'assigned' 
      ? RBAC_EVENTS.ROLE_ASSIGNED 
      : RBAC_EVENTS.ROLE_REVOKED;

    const details = {
      roleId,
      roleName,
      operation,
      targetUserId,
      targetUserEmail: context.targetUserEmail,
      performedBy,
      performedByEmail: context.performedByEmail,
      reason: context.reason,
      timestamp: new Date().toISOString()
    };

    logger.logSecurityEvent(eventType, {
      userId: performedBy,
      organizationId,
      severity: RBAC_SEVERITY.INFO,
      ...details
    });

    await this.persistSecurityEvent({
      eventType,
      severity: RBAC_SEVERITY.INFO,
      tenantId: organizationId,
      userId: performedBy,
      userEmail: context.performedByEmail,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      resource: 'role',
      action: operation,
      outcome: 'success',
      details
    });
  }

  /**
   * Logs an unauthorized access attempt
   * 
   * @param {Object} params - Audit parameters
   */
  async logUnauthorizedAccess({ 
    userId, 
    organizationId, 
    permission, 
    resource, 
    action,
    reason,
    context = {} 
  }) {
    const details = {
      permission,
      resource,
      action,
      reason,
      userAgent: context.userAgent,
      ip: context.ip,
      endpoint: context.endpoint,
      method: context.method,
      attemptedAt: new Date().toISOString()
    };

    logger.logSecurityEvent(RBAC_EVENTS.UNAUTHORIZED_ACCESS_ATTEMPT, {
      userId,
      organizationId,
      severity: RBAC_SEVERITY.WARNING,
      ...details
    });

    await this.persistSecurityEvent({
      eventType: RBAC_EVENTS.UNAUTHORIZED_ACCESS_ATTEMPT,
      severity: RBAC_SEVERITY.WARNING,
      tenantId: organizationId,
      userId,
      userEmail: context.userEmail,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      resource,
      action,
      outcome: 'denied',
      details
    });

    // Check for repeated failures (potential attack)
    await this.checkRepeatedFailures(userId, organizationId, context.ip);
  }

  /**
   * Logs a privilege escalation attempt
   * 
   * @param {Object} params - Audit parameters
   */
  async logPrivilegeEscalation({ 
    userId, 
    organizationId, 
    attemptedRole,
    currentRole,
    reason,
    context = {} 
  }) {
    const details = {
      attemptedRole,
      currentRole,
      reason,
      userAgent: context.userAgent,
      ip: context.ip,
      endpoint: context.endpoint,
      timestamp: new Date().toISOString()
    };

    logger.logSecurityEvent(RBAC_EVENTS.PRIVILEGE_ESCALATION_ATTEMPT, {
      userId,
      organizationId,
      severity: RBAC_SEVERITY.CRITICAL,
      ...details
    });

    await this.persistSecurityEvent({
      eventType: RBAC_EVENTS.PRIVILEGE_ESCALATION_ATTEMPT,
      severity: RBAC_SEVERITY.CRITICAL,
      tenantId: organizationId,
      userId,
      userEmail: context.userEmail,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      resource: 'role',
      action: 'escalate',
      outcome: 'blocked',
      details
    });

    // Alert security team immediately
    await this.alertSecurityTeam({
      eventType: RBAC_EVENTS.PRIVILEGE_ESCALATION_ATTEMPT,
      severity: RBAC_SEVERITY.CRITICAL,
      userId,
      organizationId,
      details
    });
  }

  /**
   * Logs a bulk permission change
   * 
   * @param {Object} params - Audit parameters
   */
  async logBulkPermissionChange({ 
    userId, 
    organizationId, 
    affectedUsers,
    permissions,
    operation,
    reason,
    context = {} 
  }) {
    const details = {
      affectedUserCount: affectedUsers.length,
      affectedUsers,
      permissions,
      operation,
      reason,
      performedBy: userId,
      performedByEmail: context.userEmail,
      timestamp: new Date().toISOString()
    };

    logger.logSecurityEvent(RBAC_EVENTS.BULK_PERMISSION_CHANGE, {
      userId,
      organizationId,
      severity: RBAC_SEVERITY.WARNING,
      ...details
    });

    await this.persistSecurityEvent({
      eventType: RBAC_EVENTS.BULK_PERMISSION_CHANGE,
      severity: RBAC_SEVERITY.WARNING,
      tenantId: organizationId,
      userId,
      userEmail: context.userEmail,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      resource: 'permissions',
      action: 'bulk_update',
      outcome: 'success',
      details
    });
  }

  /**
   * Persists security event to database
   * 
   * @private
   */
  async persistSecurityEvent(event) {
    try {
      await query(
        `INSERT INTO security_events (
          event_type, severity, tenant_id, instance_id,
          user_id, user_email, ip_address, user_agent,
          resource, action, outcome, details, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          event.eventType,
          event.severity,
          event.tenantId,
          process.env.INSTANCE_ID || 'default',
          event.userId,
          event.userEmail,
          event.ipAddress,
          event.userAgent,
          event.resource,
          event.action,
          event.outcome,
          JSON.stringify(event.details),
          JSON.stringify({ source: 'rbac-system', version: '1.0.0' })
        ],
        event.tenantId,
        {
          operation: 'INSERT',
          table: 'security_events'
        }
      );
    } catch (error) {
      logger.error('Failed to persist security event', {
        error: error.message,
        eventType: event.eventType
      });
      // Don't throw - logging should not break the application
    }
  }

  /**
   * Checks for repeated permission failures (potential attack)
   * 
   * @private
   */
  async checkRepeatedFailures(userId, organizationId, ipAddress) {
    try {
      const result = await query(
        `SELECT COUNT(*) as failure_count
         FROM security_events
         WHERE user_id = $1
           AND tenant_id = $2
           AND event_type = $3
           AND timestamp > NOW() - INTERVAL '15 minutes'`,
        [userId, organizationId, RBAC_EVENTS.PERMISSION_CHECK_FAILED],
        organizationId,
        {
          operation: 'SELECT',
          table: 'security_events'
        }
      );

      const failureCount = parseInt(result.rows[0]?.failure_count || 0);

      if (failureCount >= 5) {
        await this.persistSecurityEvent({
          eventType: RBAC_EVENTS.REPEATED_PERMISSION_FAILURES,
          severity: RBAC_SEVERITY.CRITICAL,
          tenantId: organizationId,
          userId,
          ipAddress,
          resource: 'rbac',
          action: 'check',
          outcome: 'blocked',
          details: {
            failureCount,
            timeWindow: '15 minutes',
            reason: 'Potential brute force or unauthorized access attempt'
          }
        });

        await this.alertSecurityTeam({
          eventType: RBAC_EVENTS.REPEATED_PERMISSION_FAILURES,
          severity: RBAC_SEVERITY.CRITICAL,
          userId,
          organizationId,
          details: { failureCount, ipAddress }
        });
      }
    } catch (error) {
      logger.error('Failed to check repeated failures', {
        error: error.message,
        userId,
        organizationId
      });
    }
  }

  /**
   * Alerts security team about critical events
   * 
   * @private
   */
  async alertSecurityTeam(event) {
    try {
      await query(
        `INSERT INTO security_alerts (
          event_type, severity, tenant_id, user_id,
          details, alerted_at, acknowledged
        ) VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
        [
          event.eventType,
          event.severity,
          event.organizationId,
          event.userId,
          JSON.stringify(event.details)
        ],
        event.organizationId,
        {
          operation: 'INSERT',
          table: 'security_alerts'
        }
      );

      // TODO: Send real-time alert via email/SMS/Slack
      logger.warn('SECURITY ALERT', {
        eventType: event.eventType,
        severity: event.severity,
        userId: event.userId,
        organizationId: event.organizationId
      });
    } catch (error) {
      logger.error('Failed to create security alert', {
        error: error.message,
        eventType: event.eventType
      });
    }
  }

  /**
   * Retrieves audit log for a user
   * 
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Audit log entries
   */
  async getUserAuditLog(userId, organizationId, options = {}) {
    const limit = Math.min(options.limit || 100, 1000);
    const offset = options.offset || 0;

    const result = await query(
      `SELECT 
        event_type, severity, timestamp, resource, action, outcome, details
       FROM security_events
       WHERE user_id = $1
         AND tenant_id = $2
         AND event_type LIKE 'rbac_%'
       ORDER BY timestamp DESC
       LIMIT $3 OFFSET $4`,
      [userId, organizationId, limit, offset],
      organizationId,
      {
        operation: 'SELECT',
        table: 'security_events'
      }
    );

    return result.rows;
  }

  /**
   * Retrieves audit log for an organization
   * 
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Audit log entries
   */
  async getOrganizationAuditLog(organizationId, options = {}) {
    const limit = Math.min(options.limit || 100, 1000);
    const offset = options.offset || 0;
    const eventType = options.eventType || 'rbac_%';

    const result = await query(
      `SELECT 
        event_type, severity, timestamp, user_id, user_email,
        resource, action, outcome, details
       FROM security_events
       WHERE tenant_id = $1
         AND event_type LIKE $2
       ORDER BY timestamp DESC
       LIMIT $3 OFFSET $4`,
      [organizationId, eventType, limit, offset],
      organizationId,
      {
        operation: 'SELECT',
        table: 'security_events'
      }
    );

    return result.rows;
  }
}

// Export singleton instance
export default new AuditLogger();
