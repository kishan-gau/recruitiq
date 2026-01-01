import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

/**
 * Currency Approval Service
 * Handles approval workflows for currency operations
 */
class ApprovalService {
  /**
   * Create an approval request
   * @param {Object} requestData - Approval request data
   * @returns {Object} Created approval request
   */
  async createApprovalRequest(requestData) {
    const {
      organizationId,
      requestType,
      referenceType,
      referenceId,
      requestData: data,
      reason,
      priority = 'normal',
      createdBy
    } = requestData;

    // Check if approval is required based on rules
    const rules = await this.getApplicableRules(organizationId, requestType, data);
    
    if (rules.length === 0) {
      logger.info('No approval rules apply, skipping approval', { requestType, data });
      return { requiresApproval: false };
    }

    // Get the highest priority rule
    const applicableRule = rules[0];
    const requiredApprovals = applicableRule.required_approvals;
    const expirationHours = applicableRule.expiration_hours;

    const sqlQuery = `
      INSERT INTO payroll.currency_approval_request (
        organization_id, request_type, reference_type, reference_id,
        request_data, reason, priority, required_approvals,
        expires_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id, organization_id, request_type, status, priority,
        required_approvals, current_approvals, expires_at, created_at
    `;

    const expiresAt = expirationHours 
      ? new Date(Date.now() + expirationHours * 3600 * 1000)
      : null;

    try {
      const result = await query(sqlQuery, [
        organizationId,
        requestType,
        referenceType,
        referenceId,
        JSON.stringify(data),
        reason,
        priority,
        requiredApprovals,
        expiresAt,
        createdBy
      ], organizationId, { operation: 'INSERT', table: 'currency_approval_request' });

      const approvalRequest = result.rows[0];

      // Create notifications for approvers
      await this.createApprovalNotifications(approvalRequest.id, applicableRule);

      logger.info('Approval request created', {
        id: approvalRequest.id,
        requestType,
        requiredApprovals
      });

      return {
        requiresApproval: true,
        approvalRequest
      };
    } catch (error) {
      logger.error('Error creating approval request', { error, requestData });
      throw error;
    }
  }

  /**
   * Get applicable approval rules for a request
   * @param {string} organizationId - Organization ID
   * @param {string} requestType - Type of request
   * @param {Object} requestData - Request data for rule matching
   * @returns {Array} Array of applicable rules
   */
  async getApplicableRules(organizationId, requestType, requestData) {
    const sqlQuery = `
      SELECT 
        id, name, rule_type, conditions, required_approvals,
        approver_role, approver_user_ids, expiration_hours, priority
      FROM payroll.currency_approval_rule
      WHERE organization_id = $1
        AND enabled = true
      ORDER BY priority DESC, id ASC
    `;

    try {
      const result = await query(sqlQuery, [organizationId], organizationId, { operation: 'SELECT', table: 'currency_approval_rule' });
      const rules = result.rows;

      // Filter rules that match the request
      const applicableRules = rules.filter(rule => {
        return this.ruleMatches(rule, requestType, requestData);
      });

      return applicableRules;
    } catch (error) {
      logger.error('Error getting applicable rules', { error, organizationId, requestType });
      throw error;
    }
  }

  /**
   * Check if a rule matches the request
   * @param {Object} rule - Approval rule
   * @param {string} requestType - Request type
   * @param {Object} requestData - Request data
   * @returns {boolean} True if rule matches
   */
  ruleMatches(rule, requestType, requestData) {
    const conditions = rule.conditions;

    switch (rule.rule_type) {
      case 'conversion_threshold':
        if (requestType !== 'conversion') return false;
        const amount = requestData.amount || 0;
        const threshold = conditions.threshold_amount || Infinity;
        const currencies = conditions.currencies || [];
        
        const matchesAmount = amount >= threshold;
        const matchesCurrency = currencies.length === 0 || 
          currencies.includes(requestData.from_currency) ||
          currencies.includes(requestData.to_currency);
        
        return matchesAmount && matchesCurrency;

      case 'rate_variance':
        if (requestType !== 'rate_change') return false;
        const oldRate = requestData.old_rate || 0;
        const newRate = requestData.new_rate || 0;
        if (oldRate === 0) return false;
        
        const variance = Math.abs((newRate - oldRate) / oldRate) * 100;
        const varianceThreshold = conditions.variance_percentage || Infinity;
        
        return variance >= varianceThreshold;

      case 'bulk_operation':
        return requestType === 'bulk_rate_import';

      case 'configuration_change':
        return requestType === 'configuration_change';

      default:
        return false;
    }
  }

  /**
   * Approve an approval request
   * @param {number} requestId - Approval request ID
   * @param {string} userId - User approving
   * @param {string} comments - Optional comments
   * @returns {Object} Updated approval request
   */
  async approveRequest(requestId, userId, comments = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if user can approve
      const canApprove = await this.canUserApprove(requestId, userId, client);
      if (!canApprove) {
        throw new Error('User is not authorized to approve this request');
      }

      // Check if already approved by this user
      const alreadyApproved = await this.hasUserActed(requestId, userId, 'approved', client);
      if (alreadyApproved) {
        throw new Error('User has already approved this request');
      }

      // Insert approval action
      const actionQuery = `
        INSERT INTO payroll.currency_approval_action (
          approval_request_id, action, comments, created_by
        ) VALUES ($1, $2, $3, $4)
        RETURNING id, action, created_at
      `;

      await client.query(actionQuery, [requestId, 'approved', comments, userId]);

      // Get updated request
      const requestQuery = `
        SELECT 
          id, organization_id, request_type, reference_type, reference_id,
          request_data, status, required_approvals, current_approvals
        FROM payroll.currency_approval_request
        WHERE id = $1
      `;

      const requestResult = await client.query(requestQuery, [requestId]);
      const request = requestResult.rows[0];

      await client.query('COMMIT');

      // Send notifications if fully approved
      if (request.status === 'approved') {
        await this.sendApprovedNotification(request);
      }

      logger.info('Approval request approved', {
        requestId,
        userId,
        status: request.status,
        approvals: `${request.current_approvals}/${request.required_approvals}`
      });

      return request;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error approving request', { error, requestId, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject an approval request
   * @param {number} requestId - Approval request ID
   * @param {string} userId - User rejecting
   * @param {string} comments - Rejection reason
   * @returns {Object} Updated approval request
   */
  async rejectRequest(requestId, userId, comments) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if user can approve (same permissions for reject)
      const canReject = await this.canUserApprove(requestId, userId, client);
      if (!canReject) {
        throw new Error('User is not authorized to reject this request');
      }

      // Insert rejection action
      const actionQuery = `
        INSERT INTO payroll.currency_approval_action (
          approval_request_id, action, comments, created_by
        ) VALUES ($1, $2, $3, $4)
        RETURNING id
      `;

      await client.query(actionQuery, [requestId, 'rejected', comments, userId]);

      // Get updated request
      const requestQuery = `
        SELECT 
          id, organization_id, request_type, request_data, status, created_by
        FROM payroll.currency_approval_request
        WHERE id = $1
      `;

      const requestResult = await client.query(requestQuery, [requestId]);
      const request = requestResult.rows[0];

      await client.query('COMMIT');

      // Send rejection notification
      await this.sendRejectedNotification(request, comments);

      logger.info('Approval request rejected', { requestId, userId });

      return request;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error rejecting request', { error, requestId, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if user can approve a request
   * @param {number} requestId - Approval request ID
   * @param {string} userId - User ID
   * @param {Object} client - Database client
   * @returns {boolean} True if user can approve
   */
  async canUserApprove(requestId, userId, client) {
    // Get request and applicable rule
    const query = `
      SELECT 
        ar.organization_id,
        ar.request_type,
        ar.request_data,
        ar.created_by
      FROM payroll.currency_approval_request ar
      WHERE ar.id = $1
    `;

    const result = await client.query(query, [requestId]);
    if (result.rows.length === 0) {
      return false;
    }

    const request = result.rows[0];

    // User cannot approve their own request
    if (request.created_by === userId) {
      return false;
    }

    // Get applicable rules
    const rules = await this.getApplicableRules(
      request.organization_id,
      request.request_type,
      request.request_data
    );

    if (rules.length === 0) {
      return false;
    }

    const rule = rules[0];

    // Check if user is in approver list
    if (rule.approver_user_ids && rule.approver_user_ids.length > 0) {
      return rule.approver_user_ids.includes(userId);
    }

    // TODO: Check if user has the required role
    // This would require joining with role/permission tables
    // For now, return true if role-based (assume role check happens at API level)
    if (rule.approver_role) {
      return true; // Role check should be done in API middleware
    }

    return false;
  }

  /**
   * Check if user has already acted on a request
   * @param {number} requestId - Approval request ID
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @param {Object} client - Database client
   * @returns {boolean} True if user has acted
   */
  async hasUserActed(requestId, userId, action, client) {
    const query = `
      SELECT COUNT(*) as count
      FROM payroll.currency_approval_action
      WHERE approval_request_id = $1
        AND created_by = $2
        AND action = $3
    `;

    const result = await client.query(query, [requestId, userId, action]);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Get pending approval requests for organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Array} Pending approval requests
   */
  async getPendingApprovals(organizationId, options = {}) {
    const { requestType, priority, userId } = options;

    let queryText = `
      SELECT * FROM payroll.currency_approval_request
      WHERE organization_id = $1
        AND status = 'pending'
        AND deleted_at IS NULL
    `;

    const params = [organizationId];
    let paramCount = 1;

    if (requestType) {
      paramCount++;
      queryText += ` AND request_type = $${paramCount}`;
      params.push(requestType);
    }

    if (priority) {
      paramCount++;
      queryText += ` AND priority = $${paramCount}`;
      params.push(priority);
    }

    queryText += ' ORDER BY priority DESC, created_at ASC';

    try {
      const result = await query(queryText, params, organizationId, { operation: 'SELECT', table: 'currency_approval_request' });
      return result.rows;
    } catch (error) {
      logger.error('Error getting pending approvals', { error, organizationId });
      throw error;
    }
  }

  /**
   * Get approval history for a reference
   * @param {string} referenceType - Reference type
   * @param {number} referenceId - Reference ID
   * @returns {Array} Approval history
   */
  async getApprovalHistory(referenceType, referenceId) {
    const sqlQuery = `
      SELECT 
        ar.id as request_id,
        ar.request_type,
        ar.status,
        ar.priority,
        ar.required_approvals,
        ar.current_approvals,
        ar.created_at as requested_at,
        ar.updated_at,
        creator_emp.first_name || ' ' || creator_emp.last_name as requested_by,
        json_agg(
          json_build_object(
            'action', aa.action,
            'comments', aa.comments,
            'created_at', aa.created_at,
            'created_by', approver_emp.first_name || ' ' || approver_emp.last_name
          ) ORDER BY aa.created_at
        ) FILTER (WHERE aa.id IS NOT NULL) as actions
      FROM payroll.currency_approval_request ar
      LEFT JOIN payroll.currency_approval_action aa ON ar.id = aa.approval_request_id
      LEFT JOIN hris.user_account creator ON ar.created_by = creator.id
      LEFT JOIN hris.employee creator_emp ON creator.employee_id = creator_emp.id AND creator_emp.deleted_at IS NULL
      LEFT JOIN hris.user_account approver ON aa.created_by = approver.id
      LEFT JOIN hris.employee approver_emp ON approver.employee_id = approver_emp.id AND approver_emp.deleted_at IS NULL
      WHERE ar.reference_type = $1
        AND ar.reference_id = $2
      GROUP BY ar.id, creator_emp.first_name, creator_emp.last_name
      ORDER BY ar.created_at DESC
    `;

    try {
      const result = await query(sqlQuery, [referenceType, referenceId], null, { operation: 'SELECT', table: 'currency_approval_request' });
      return result.rows;
    } catch (error) {
      logger.error('Error getting approval history', { error, referenceType, referenceId });
      throw error;
    }
  }

  /**
   * Create notifications for approvers
   * @param {number} requestId - Approval request ID
   * @param {Object} rule - Approval rule
   */
  async createApprovalNotifications(requestId, rule) {
    // Get approver user IDs from rule
    const approverIds = rule.approver_user_ids || [];

    if (approverIds.length === 0) {
      logger.warn('No specific approvers defined for rule', { rule: rule.id });
      return;
    }

    const sqlQuery = `
      INSERT INTO payroll.currency_approval_notification (
        approval_request_id, recipient_user_id, notification_type,
        delivery_method, subject, message
      )
      SELECT 
        $1, 
        unnest($2::uuid[]),
        'approval_requested',
        'both',
        'Currency Approval Required',
        'A currency operation requires your approval.'
    `;

    try {
      await query(sqlQuery, [requestId, approverIds], null, { operation: 'INSERT', table: 'currency_approval_notification' });
      logger.info('Approval notifications created', { requestId, count: approverIds.length });
    } catch (error) {
      logger.error('Error creating notifications', { error, requestId });
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send approved notification
   * @param {Object} request - Approval request
   */
  async sendApprovedNotification(request) {
    const sqlQuery = `
      INSERT INTO payroll.currency_approval_notification (
        approval_request_id, recipient_user_id, notification_type,
        delivery_method, subject, message
      ) VALUES ($1, $2, 'approved', 'both', 'Approval Granted', 'Your currency request has been approved.')
    `;

    try {
      await query(sqlQuery, [request.id, request.created_by], null, { operation: 'INSERT', table: 'currency_approval_notification' });
    } catch (error) {
      logger.error('Error sending approved notification', { error, requestId: request.id });
    }
  }

  /**
   * Send rejected notification
   * @param {Object} request - Approval request
   * @param {string} comments - Rejection reason
   */
  async sendRejectedNotification(request, comments) {
    const sqlQuery = `
      INSERT INTO payroll.currency_approval_notification (
        approval_request_id, recipient_user_id, notification_type,
        delivery_method, subject, message
      ) VALUES ($1, $2, 'rejected', 'both', 'Approval Rejected', $3)
    `;

    const message = `Your currency request has been rejected. Reason: ${comments || 'No reason provided'}`;

    try {
      await query(sqlQuery, [request.id, request.created_by, message], null, { operation: 'INSERT', table: 'currency_approval_notification' });
    } catch (error) {
      logger.error('Error sending rejected notification', { error, requestId: request.id });
    }
  }

  /**
   * Expire old pending requests
   * @returns {number} Number of expired requests
   */
  async expireOldRequests() {
    try {
      const result = await query('SELECT payroll.expire_old_approval_requests()', [], null, { operation: 'SELECT', table: 'expire_old_approval_requests' });
      const expiredCount = result.rows[0].expire_old_approval_requests;
      
      if (expiredCount > 0) {
        logger.info('Expired old approval requests', { count: expiredCount });
      }
      
      return expiredCount;
    } catch (error) {
      logger.error('Error expiring old requests', { error });
      throw error;
    }
  }
}

export default ApprovalService;
