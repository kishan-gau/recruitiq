/**
 * User Account Repository
 * 
 * Data access layer for hris.user_account table
 * Manages employee user accounts across Nexus, Paylinq, and other products
 * 
 * @module repositories/userAccountRepository
 */

import { query } from '../config/database.ts';
import logger from '../utils/logger.ts';

class UserAccountRepository {
  /**
   * Create a new user account
   * @param {Object} data - User account data
   * @param {string} data.organizationId - Organization UUID
   * @param {string} data.email - User email
   * @param {string} data.passwordHash - Hashed password
   * @param {string} [data.accountStatus='pending_activation'] - Account status
   * @param {boolean} [data.isActive=true] - Is account active
   * @param {Object} [data.preferences={}] - User preferences
   * @param {string} createdBy - User ID creating this account
   * @returns {Promise<Object>} Created user account
   */
  async create(data, createdBy) {
    const result = await query(
      `INSERT INTO hris.user_account 
       (organization_id, email, password_hash, account_status, is_active, preferences, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.organizationId,
        data.email.toLowerCase(),
        data.passwordHash,
        data.accountStatus || 'pending_activation',
        data.isActive !== undefined ? data.isActive : true,
        JSON.stringify(data.preferences || {}),
        createdBy
      ],
      data.organizationId,
      { operation: 'INSERT', table: 'hris.user_account', userId: createdBy }
    );
    
    return result.rows[0];
  }

  /**
   * Find user account by ID
   * @param {string} id - User account UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} User account or null
   */
  async findById(id, organizationId) {
    const result = await query(
      `SELECT * FROM hris.user_account
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [id, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.user_account' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find user account by email
   * @param {string} email - Email address
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} User account or null
   */
  async findByEmail(email, organizationId) {
    const result = await query(
      `SELECT * FROM hris.user_account
       WHERE email = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [email.toLowerCase(), organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.user_account' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find user account linked to employee
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} User account or null
   */
  async findByEmployeeId(employeeId, organizationId) {
    const result = await query(
      `SELECT ua.* 
       FROM hris.user_account ua
       INNER JOIN hris.employee e ON e.user_account_id = ua.id
       WHERE e.id = $1 AND e.organization_id = $2 
         AND ua.deleted_at IS NULL AND e.deleted_at IS NULL`,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.user_account' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Update user account
   * @param {string} id - User account UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} updatedBy - User ID performing update
   * @returns {Promise<Object|null>} Updated user account or null
   */
  async update(id, updates, organizationId, updatedBy) {
    const allowedFields = [
      'email', 'password_hash', 'account_status', 'is_active',
      'failed_login_attempts', 'last_login_at', 'password_changed_at',
      'password_reset_token', 'password_reset_expires_at',
      'mfa_enabled', 'mfa_secret', 'preferences'
    ];
    
    const setClauses = [];
    const params = [];
    let paramCount = 0;
    
    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        paramCount++;
        setClauses.push(`${key} = $${paramCount}`);
        
        // Handle JSONB fields
        if (key === 'preferences' && typeof value === 'object') {
          params.push(JSON.stringify(value));
        } else if (key === 'email') {
          params.push(value.toLowerCase());
        } else {
          params.push(value);
        }
      }
    });
    
    if (setClauses.length === 0) {
      // No valid fields to update, fetch and return existing
      return this.findById(id, organizationId);
    }
    
    // Add updated_by and updated_at
    paramCount++;
    setClauses.push(`updated_by = $${paramCount}`);
    params.push(updatedBy);
    
    setClauses.push(`updated_at = NOW()`);
    
    // Add WHERE clause parameters
    paramCount++;
    params.push(id);
    paramCount++;
    params.push(organizationId);
    
    const result = await query(
      `UPDATE hris.user_account 
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount - 1} 
         AND organization_id = $${paramCount} 
         AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'hris.user_account', userId: updatedBy }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Deactivate user account (soft delete)
   * @param {string} id - User account UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} deletedBy - User ID performing deletion
   * @returns {Promise<Object|null>} Deactivated user account or null
   */
  async deactivate(id, organizationId, deletedBy) {
    const result = await query(
      `UPDATE hris.user_account 
       SET is_active = false,
           account_status = 'inactive',
           deleted_at = NOW(),
           deleted_by = $1,
           updated_at = NOW()
       WHERE id = $2 
         AND organization_id = $3 
         AND deleted_at IS NULL
       RETURNING *`,
      [deletedBy, id, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'hris.user_account', userId: deletedBy }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Reactivate user account
   * @param {string} id - User account UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} updatedBy - User ID performing reactivation
   * @returns {Promise<Object|null>} Reactivated user account or null
   */
  async reactivate(id, organizationId, updatedBy) {
    const result = await query(
      `UPDATE hris.user_account 
       SET is_active = true,
           account_status = 'active',
           deleted_at = NULL,
           deleted_by = NULL,
           updated_by = $1,
           updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [updatedBy, id, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'hris.user_account', userId: updatedBy }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Check if email exists in organization
   * @param {string} email - Email address
   * @param {string} organizationId - Organization UUID
   * @param {string} [excludeId] - User account ID to exclude from check
   * @returns {Promise<boolean>} True if email exists
   */
  async emailExists(email, organizationId, excludeId = null) {
    let queryText = `
      SELECT COUNT(*) as count
      FROM hris.user_account
      WHERE email = $1 AND organization_id = $2 AND deleted_at IS NULL
    `;
    const params = [email.toLowerCase(), organizationId];
    
    if (excludeId) {
      queryText += ` AND id != $3`;
      params.push(excludeId);
    }
    
    const result = await query(
      queryText,
      params,
      organizationId,
      { operation: 'SELECT', table: 'hris.user_account' }
    );
    
    return parseInt(result.rows[0].count, 10) > 0;
  }

  /**
   * Get all user accounts for organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} User accounts
   */
  async findAll(organizationId, filters = {}) {
    let whereClause = 'WHERE ua.organization_id = $1 AND ua.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (filters.accountStatus) {
      paramCount++;
      whereClause += ` AND ua.account_status = $${paramCount}`;
      params.push(filters.accountStatus);
    }
    
    if (filters.isActive !== undefined) {
      paramCount++;
      whereClause += ` AND ua.is_active = $${paramCount}`;
      params.push(filters.isActive);
    }
    
    if (filters.search) {
      paramCount++;
      whereClause += ` AND ua.email ILIKE $${paramCount}`;
      params.push(`%${filters.search}%`);
    }
    
    const orderBy = filters.orderBy || 'created_at';
    const orderDir = filters.orderDir === 'asc' ? 'ASC' : 'DESC';
    
    const result = await query(
      `SELECT ua.*, 
              e.id as employee_id,
              e.employee_number,
              e.first_name,
              e.last_name
       FROM hris.user_account ua
       LEFT JOIN hris.employee e ON e.user_account_id = ua.id AND e.deleted_at IS NULL
       ${whereClause}
       ORDER BY ua.${orderBy} ${orderDir}`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'hris.user_account' }
    );
    
    return result.rows;
  }
}

export default new UserAccountRepository();
