import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection.js';

/**
 * VpsProvisionApprover Model
 * Manages users authorized to approve VPS provisioning requests
 */
class VpsProvisionApprover {
  /**
   * Create a new approver
   * @param {Object} approverData - Approver data
   * @returns {Promise<Object>} Created approver
   */
  static async create(approverData) {
    const {
      userId,
      email,
      name,
      role,
      canApproveAll = false,
      maxMonthlyCost = null,
      allowedProducts = null,
      allowedRegions = null,
      isActive = true,
    } = approverData;

    const id = uuidv4();

    const query = `
      INSERT INTO deployment.vps_provision_approvers (
        id, user_id, email, name, role,
        can_approve_all, max_monthly_cost,
        allowed_products, allowed_regions, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      RETURNING *
    `;

    const values = [
      id,
      userId,
      email,
      name,
      role,
      canApproveAll,
      maxMonthlyCost,
      allowedProducts,
      allowedRegions,
      isActive,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get approver by ID
   * @param {string} id - Approver ID
   * @returns {Promise<Object|null>} Approver or null
   */
  static async findById(id) {
    const query = `
      SELECT * FROM deployment.vps_provision_approvers
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get approver by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Approver or null
   */
  static async findByUserId(userId) {
    const query = `
      SELECT * FROM deployment.vps_provision_approvers
      WHERE user_id = $1
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Get approver by email
   * @param {string} email - Email
   * @returns {Promise<Object|null>} Approver or null
   */
  static async findByEmail(email) {
    const query = `
      SELECT * FROM deployment.vps_provision_approvers
      WHERE email = $1
    `;
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * List all approvers
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of approvers
   */
  static async list(filters = {}) {
    const { isActive = null, role = null } = filters;

    let query = 'SELECT * FROM deployment.vps_provision_approvers WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (isActive !== null) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      values.push(isActive);
    }

    if (role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      values.push(role);
    }

    query += ' ORDER BY name ASC';

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Update approver
   * @param {string} id - Approver ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated approver
   */
  static async update(id, updates) {
    const allowedFields = [
      'name',
      'role',
      'can_approve_all',
      'max_monthly_cost',
      'allowed_products',
      'allowed_regions',
      'is_active',
    ];

    const updateFields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(updates).forEach((field) => {
      if (allowedFields.includes(field)) {
        paramCount++;
        updateFields.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    paramCount++;
    values.push(id);

    const query = `
      UPDATE deployment.vps_provision_approvers
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete approver
   * @param {string} id - Approver ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const query = `
      DELETE FROM deployment.vps_provision_approvers
      WHERE id = $1
      RETURNING id
    `;
    const result = await db.query(query, [id]);
    return result.rows.length > 0;
  }

  /**
   * Deactivate approver
   * @param {string} id - Approver ID
   * @returns {Promise<Object>} Updated approver
   */
  static async deactivate(id) {
    return this.update(id, { is_active: false });
  }

  /**
   * Activate approver
   * @param {string} id - Approver ID
   * @returns {Promise<Object>} Updated approver
   */
  static async activate(id) {
    return this.update(id, { is_active: true });
  }

  /**
   * Check if user can approve a request
   * @param {string} userId - User ID
   * @param {Object} request - VPS provision request
   * @returns {Promise<Object>} Approval eligibility result
   */
  static async canApprove(userId, request) {
    const approver = await this.findByUserId(userId);

    if (!approver) {
      return {
        canApprove: false,
        reason: 'User is not an authorized approver',
      };
    }

    if (!approver.is_active) {
      return {
        canApprove: false,
        reason: 'Approver account is inactive',
      };
    }

    // Check if they can approve all requests
    if (approver.can_approve_all) {
      return {
        canApprove: true,
        approver,
      };
    }

    // Check cost limit
    if (
      approver.max_monthly_cost !== null &&
      request.estimated_monthly_cost > approver.max_monthly_cost
    ) {
      return {
        canApprove: false,
        reason: `Request cost (${request.estimated_monthly_cost}) exceeds approver limit (${approver.max_monthly_cost})`,
      };
    }

    // Check product restrictions
    if (
      approver.allowed_products &&
      approver.allowed_products.length > 0 &&
      !approver.allowed_products.includes(request.product_name)
    ) {
      return {
        canApprove: false,
        reason: `Product ${request.product_name} not in approver's allowed products`,
      };
    }

    // Check region restrictions
    if (
      approver.allowed_regions &&
      approver.allowed_regions.length > 0 &&
      !approver.allowed_regions.includes(request.region)
    ) {
      return {
        canApprove: false,
        reason: `Region ${request.region} not in approver's allowed regions`,
      };
    }

    return {
      canApprove: true,
      approver,
    };
  }

  /**
   * Get approver statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Approval statistics
   */
  static async getStatistics(userId) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE approved_by_id = $1) as total_approved,
        COUNT(*) FILTER (WHERE rejected_by_id = $1) as total_rejected,
        COUNT(*) FILTER (WHERE approved_by_id = $1 AND status = 'completed') as successful_deployments,
        COUNT(*) FILTER (WHERE approved_by_id = $1 AND status = 'failed') as failed_deployments,
        SUM(estimated_monthly_cost) FILTER (WHERE approved_by_id = $1) as total_approved_cost
      FROM deployment.vps_provision_requests
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  }
}

export default VpsProvisionApprover;
