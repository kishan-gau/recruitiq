const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');

/**
 * VpsProvisionRequest Model
 * Manages VPS provisioning requests and approval workflow
 */
class VpsProvisionRequest {
  /**
   * Create a new VPS provision request
   * @param {Object} requestData - Request data
   * @returns {Promise<Object>} Created request
   */
  static async create(requestData) {
    const {
      requesterId,
      requesterEmail,
      requesterName,
      organizationId = null,
      instanceId = null,
      customerId,
      customerName,
      productName,
      vpsName,
      hostname = null,
      domain = null,
      region = 'ams0',
      operatingSystem = 'ubuntu-22.04',
      licenseKey = null,
      licenseTier = null,
      adminEmail,
      priority = 'normal',
      estimatedMonthlyCost = null,
      estimatedSetupCost = null,
      currency = 'EUR',
      businessJustification = null,
      projectCode = null,
      costCenter = null,
      tags = [],
      customConfig = {},
      notes = null,
    } = requestData;

    const id = uuidv4();

    // Generate request number
    const requestNumberResult = await db.query(
      'SELECT deployment.generate_request_number() AS request_number'
    );
    const requestNumber = requestNumberResult.rows[0].request_number;

    const query = `
      INSERT INTO deployment.vps_provision_requests (
        id, request_number, requester_id, requester_email, requester_name,
        organization_id, instance_id, customer_id, customer_name,
        product_name, vps_name, hostname, domain, region, operating_system,
        license_key, license_tier, admin_email, priority,
        estimated_monthly_cost, estimated_setup_cost, currency,
        business_justification, project_code, cost_center,
        tags, custom_config, notes, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28, 'pending'
      )
      RETURNING *
    `;

    const values = [
      id,
      requestNumber,
      requesterId,
      requesterEmail,
      requesterName,
      organizationId,
      instanceId,
      customerId,
      customerName,
      productName,
      vpsName,
      hostname,
      domain,
      region,
      operatingSystem,
      licenseKey,
      licenseTier,
      adminEmail,
      priority,
      estimatedMonthlyCost,
      estimatedSetupCost,
      currency,
      businessJustification,
      projectCode,
      costCenter,
      JSON.stringify(tags),
      JSON.stringify(customConfig),
      notes,
    ];

    const result = await db.query(query, values);

    // Log audit entry
    await this.logAudit({
      requestId: id,
      action: 'created',
      actorId: requesterId,
      actorEmail: requesterEmail,
      actorName: requesterName,
      metadata: { requestNumber },
    });

    return result.rows[0];
  }

  /**
   * Get request by ID
   * @param {string} id - Request ID
   * @returns {Promise<Object|null>} Request or null
   */
  static async findById(id) {
    const query = `
      SELECT * FROM deployment.vps_provision_requests
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get request by request number
   * @param {string} requestNumber - Request number
   * @returns {Promise<Object|null>} Request or null
   */
  static async findByRequestNumber(requestNumber) {
    const query = `
      SELECT * FROM deployment.vps_provision_requests
      WHERE request_number = $1
    `;
    const result = await db.query(query, [requestNumber]);
    return result.rows[0] || null;
  }

  /**
   * List requests with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of requests
   */
  static async list(filters = {}) {
    const {
      status = null,
      requesterId = null,
      organizationId = null,
      priority = null,
      limit = 50,
      offset = 0,
    } = filters;

    let query = 'SELECT * FROM deployment.vps_provision_requests WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(status);
    }

    if (requesterId) {
      paramCount++;
      query += ` AND requester_id = $${paramCount}`;
      values.push(requesterId);
    }

    if (organizationId) {
      paramCount++;
      query += ` AND organization_id = $${paramCount}`;
      values.push(organizationId);
    }

    if (priority) {
      paramCount++;
      query += ` AND priority = $${paramCount}`;
      values.push(priority);
    }

    query += ' ORDER BY created_at DESC';

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Get pending requests
   * @returns {Promise<Array>} Pending requests
   */
  static async getPending() {
    const query = 'SELECT * FROM deployment.pending_requests';
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Approve a request
   * @param {string} id - Request ID
   * @param {Object} approverData - Approver information
   * @returns {Promise<Object>} Updated request
   */
  static async approve(id, approverData) {
    const { approverId, approverEmail, approverName } = approverData;

    const query = `
      UPDATE deployment.vps_provision_requests
      SET 
        status = 'approved',
        approved_by_id = $1,
        approved_by_email = $2,
        approved_by_name = $3,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND status = 'pending'
      RETURNING *
    `;

    const result = await db.query(query, [
      approverId,
      approverEmail,
      approverName,
      id,
    ]);

    if (result.rows.length === 0) {
      throw new Error('Request not found or not in pending status');
    }

    // Log audit entry
    await this.logAudit({
      requestId: id,
      action: 'approved',
      actorId: approverId,
      actorEmail: approverEmail,
      actorName: approverName,
    });

    return result.rows[0];
  }

  /**
   * Reject a request
   * @param {string} id - Request ID
   * @param {Object} rejectionData - Rejection information
   * @returns {Promise<Object>} Updated request
   */
  static async reject(id, rejectionData) {
    const { rejectorId, rejectorEmail, rejectorName, reason } = rejectionData;

    const query = `
      UPDATE deployment.vps_provision_requests
      SET 
        status = 'rejected',
        rejected_by_id = $1,
        rejected_by_email = $2,
        rejected_by_name = $3,
        rejected_at = CURRENT_TIMESTAMP,
        rejection_reason = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND status = 'pending'
      RETURNING *
    `;

    const result = await db.query(query, [
      rejectorId,
      rejectorEmail,
      rejectorName,
      reason,
      id,
    ]);

    if (result.rows.length === 0) {
      throw new Error('Request not found or not in pending status');
    }

    // Log audit entry
    await this.logAudit({
      requestId: id,
      action: 'rejected',
      actorId: rejectorId,
      actorEmail: rejectorEmail,
      actorName: rejectorName,
      metadata: { reason },
    });

    return result.rows[0];
  }

  /**
   * Update request status
   * @param {string} id - Request ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<Object>} Updated request
   */
  static async updateStatus(id, status, additionalData = {}) {
    const updates = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [status, id];
    let paramCount = 1;

    // Add additional fields if provided
    if (additionalData.deploymentJobId) {
      paramCount++;
      updates.push(`deployment_job_id = $${paramCount}`);
      values.splice(paramCount - 1, 0, additionalData.deploymentJobId);
    }

    if (additionalData.vpsIpAddress) {
      paramCount++;
      updates.push(`vps_ip_address = $${paramCount}`);
      values.splice(paramCount - 1, 0, additionalData.vpsIpAddress);
    }

    if (additionalData.transipVpsName) {
      paramCount++;
      updates.push(`transip_vps_name = $${paramCount}`);
      values.splice(paramCount - 1, 0, additionalData.transipVpsName);
    }

    if (status === 'provisioning') {
      paramCount++;
      updates.push(`vps_created_at = CURRENT_TIMESTAMP`);
    }

    if (status === 'completed') {
      paramCount++;
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    if (status === 'cancelled') {
      paramCount++;
      updates.push(`cancelled_at = CURRENT_TIMESTAMP`);
    }

    const query = `
      UPDATE deployment.vps_provision_requests
      SET ${updates.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Add comment to request
   * @param {Object} commentData - Comment data
   * @returns {Promise<Object>} Created comment
   */
  static async addComment(commentData) {
    const {
      requestId,
      userId,
      userEmail,
      userName,
      commentText,
      isInternal = false,
    } = commentData;

    const query = `
      INSERT INTO deployment.vps_provision_comments (
        id, request_id, user_id, user_email, user_name,
        comment_text, is_internal
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
      RETURNING *
    `;

    const values = [
      uuidv4(),
      requestId,
      userId,
      userEmail,
      userName,
      commentText,
      isInternal,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get comments for a request
   * @param {string} requestId - Request ID
   * @param {boolean} includeInternal - Include internal comments
   * @returns {Promise<Array>} Comments
   */
  static async getComments(requestId, includeInternal = true) {
    let query = `
      SELECT * FROM deployment.vps_provision_comments
      WHERE request_id = $1
    `;

    if (!includeInternal) {
      query += ' AND is_internal = false';
    }

    query += ' ORDER BY created_at ASC';

    const result = await db.query(query, [requestId]);
    return result.rows;
  }

  /**
   * Get audit log for a request
   * @param {string} requestId - Request ID
   * @returns {Promise<Array>} Audit log entries
   */
  static async getAuditLog(requestId) {
    const query = `
      SELECT * FROM deployment.vps_provision_audit_log
      WHERE request_id = $1
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [requestId]);
    return result.rows;
  }

  /**
   * Log an audit entry
   * @param {Object} auditData - Audit data
   * @returns {Promise<Object>} Created audit entry
   */
  static async logAudit(auditData) {
    const {
      requestId,
      action,
      actorId = null,
      actorEmail = null,
      actorName = null,
      oldStatus = null,
      newStatus = null,
      changes = {},
      ipAddress = null,
      userAgent = null,
      metadata = {},
    } = auditData;

    const query = `
      INSERT INTO deployment.vps_provision_audit_log (
        id, request_id, action, actor_id, actor_email, actor_name,
        old_status, new_status, changes, ip_address, user_agent, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
      RETURNING *
    `;

    const values = [
      uuidv4(),
      requestId,
      action,
      actorId,
      actorEmail,
      actorName,
      oldStatus,
      newStatus,
      JSON.stringify(changes),
      ipAddress,
      userAgent,
      JSON.stringify(metadata),
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get request statistics
   * @returns {Promise<Array>} Statistics by status
   */
  static async getStatistics() {
    const query = 'SELECT * FROM deployment.request_statistics';
    const result = await db.query(query);
    return result.rows;
  }
}

module.exports = VpsProvisionRequest;
