import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * TenantUser Model
 * Manages tenant users (product application users)
 * References hris.user_account table
 * Separate from platform users (PlatformUser)
 */
class TenantUser {
  /**
   * Create a new tenant user
   */
  static async create(userData) {
    const {
      organizationId,
      employeeId = null,
      email,
      password,
      enabledProducts = ['nexus'], // nexus, paylinq, schedulehub, recruitiq
      productRoles = {}, // { "nexus": "admin", "paylinq": "payroll_manager" }
      preferences = {}
    } = userData;

    const hashedPassword = await bcrypt.hash(password, 12);
    const id = uuidv4();

    const query = `
      INSERT INTO hris.user_account (
        id, organization_id, employee_id, email, password_hash,
        enabled_products, product_roles, preferences, email_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
      RETURNING id, organization_id, employee_id, email, enabled_products, 
                product_roles, preferences, account_status, is_active, 
                email_verified, created_at
    `;

    const values = [
      id,
      organizationId,
      employeeId,
      email.toLowerCase(),
      hashedPassword,
      JSON.stringify(enabledProducts),
      JSON.stringify(productRoles),
      JSON.stringify(preferences)
    ];

    const result = await db.query(query, values);
    const user = result.rows[0];
    
    // Parse JSON fields
    if (typeof user.enabled_products === 'string') {
      user.enabled_products = JSON.parse(user.enabled_products);
    }
    if (typeof user.product_roles === 'string') {
      user.product_roles = JSON.parse(user.product_roles);
    }
    if (typeof user.preferences === 'string') {
      user.preferences = JSON.parse(user.preferences);
    }
    
    return user;
  }

  /**
   * Find tenant user by email and organization
   */
  static async findByEmail(email, organizationId) {
    const query = `
      SELECT 
        ua.id, ua.organization_id, ua.employee_id, ua.email, ua.password_hash,
        ua.enabled_products, ua.product_roles, ua.preferences,
        ua.account_status, ua.is_active, ua.email_verified,
        ua.failed_login_attempts, ua.locked_until,
        ua.last_login_at, ua.last_login_ip,
        ua.mfa_enabled, ua.mfa_secret, ua.mfa_backup_codes, 
        ua.mfa_backup_codes_used, ua.mfa_enabled_at,
        ua.password_changed_at, ua.created_at, ua.updated_at,
        o.name as organization_name,
        o.tier as organization_tier,
        e.first_name, e.last_name, e.employee_number
      FROM hris.user_account ua
      LEFT JOIN organizations o ON ua.organization_id = o.id
      LEFT JOIN hris.employee e ON ua.employee_id = e.id
      WHERE ua.email = $1 
        AND ua.organization_id = $2 
        AND ua.deleted_at IS NULL
    `;
    
    const result = await db.query(query, [email.toLowerCase(), organizationId]);
    
    if (result.rows[0]) {
      const user = result.rows[0];
      // Parse JSON fields
      if (typeof user.enabled_products === 'string') {
        user.enabled_products = JSON.parse(user.enabled_products);
      }
      if (typeof user.product_roles === 'string') {
        user.product_roles = JSON.parse(user.product_roles);
      }
      if (typeof user.preferences === 'string') {
        user.preferences = JSON.parse(user.preferences);
      }
      if (typeof user.mfa_backup_codes === 'string') {
        user.mfa_backup_codes = JSON.parse(user.mfa_backup_codes);
      }
    }
    
    return result.rows[0];
  }

  /**
   * Find tenant user by email only (without organization constraint)
   * Used for single-tenant deployments or email-based organization lookup
   */
  static async findByEmailOnly(email) {
    const query = `
      SELECT 
        ua.id, ua.organization_id, ua.employee_id, ua.email, ua.password_hash,
        ua.enabled_products, ua.product_roles, ua.preferences,
        ua.account_status, ua.is_active, ua.email_verified,
        ua.failed_login_attempts, ua.locked_until,
        ua.last_login_at, ua.last_login_ip,
        ua.mfa_enabled, ua.mfa_secret, ua.mfa_backup_codes, 
        ua.mfa_backup_codes_used, ua.mfa_enabled_at,
        ua.password_changed_at, ua.created_at, ua.updated_at,
        o.name as organization_name,
        o.tier as organization_tier,
        e.first_name, e.last_name, e.employee_number
      FROM hris.user_account ua
      LEFT JOIN organizations o ON ua.organization_id = o.id
      LEFT JOIN hris.employee e ON ua.employee_id = e.id
      WHERE ua.email = $1 
        AND ua.deleted_at IS NULL
      ORDER BY ua.created_at DESC
      LIMIT 1
    `;
    
    const result = await db.query(query, [email.toLowerCase()]);
    
    if (result.rows[0]) {
      const user = result.rows[0];
      // Parse JSON fields
      if (typeof user.enabled_products === 'string') {
        user.enabled_products = JSON.parse(user.enabled_products);
      }
      if (typeof user.product_roles === 'string') {
        user.product_roles = JSON.parse(user.product_roles);
      }
      if (typeof user.preferences === 'string') {
        user.preferences = JSON.parse(user.preferences);
      }
      if (typeof user.mfa_backup_codes === 'string') {
        user.mfa_backup_codes = JSON.parse(user.mfa_backup_codes);
      }
    }
    
    return result.rows[0];
  }

  /**
   * Find tenant user by ID
   */
  static async findById(id, organizationId) {
    const query = `
      SELECT 
        ua.id, ua.organization_id, ua.employee_id, ua.email, ua.password_hash,
        ua.enabled_products, ua.product_roles, ua.preferences,
        ua.account_status, ua.is_active, ua.email_verified,
        ua.failed_login_attempts, ua.locked_until,
        ua.last_login_at, ua.last_login_ip,
        ua.mfa_enabled, ua.mfa_secret, ua.mfa_backup_codes, 
        ua.mfa_backup_codes_used, ua.mfa_enabled_at,
        ua.password_changed_at, ua.created_at, ua.updated_at,
        o.name as organization_name,
        o.tier as organization_tier,
        e.first_name, e.last_name, e.employee_number
      FROM hris.user_account ua
      LEFT JOIN organizations o ON ua.organization_id = o.id
      LEFT JOIN hris.employee e ON ua.employee_id = e.id
      WHERE ua.id = $1 
        AND ua.organization_id = $2 
        AND ua.deleted_at IS NULL
    `;
    
    const result = await db.query(query, [id, organizationId]);
    
    if (result.rows[0]) {
      const user = result.rows[0];
      // Parse JSON fields
      if (typeof user.enabled_products === 'string') {
        user.enabled_products = JSON.parse(user.enabled_products);
      }
      if (typeof user.product_roles === 'string') {
        user.product_roles = JSON.parse(user.product_roles);
      }
      if (typeof user.preferences === 'string') {
        user.preferences = JSON.parse(user.preferences);
      }
      if (typeof user.mfa_backup_codes === 'string') {
        user.mfa_backup_codes = JSON.parse(user.mfa_backup_codes);
      }
    }
    
    return result.rows[0];
  }

  /**
   * Update tenant user
   */
  static async update(id, organizationId, updates) {
    const allowedFields = ['preferences'];
    const setClause = [];
    const values = [];
    let paramCounter = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'preferences' && typeof updates[key] === 'object') {
          setClause.push(`${key} = $${paramCounter}`);
          values.push(JSON.stringify(updates[key]));
        } else {
          setClause.push(`${key} = $${paramCounter}`);
          values.push(updates[key]);
        }
        paramCounter++;
      }
    });

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id, organizationId);
    const query = `
      UPDATE hris.user_account 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCounter} 
        AND organization_id = $${paramCounter + 1} 
        AND deleted_at IS NULL
      RETURNING id, organization_id, email, enabled_products, product_roles, preferences
    `;

    const result = await db.query(query, values);
    
    if (result.rows[0]) {
      const user = result.rows[0];
      if (typeof user.enabled_products === 'string') {
        user.enabled_products = JSON.parse(user.enabled_products);
      }
      if (typeof user.product_roles === 'string') {
        user.product_roles = JSON.parse(user.product_roles);
      }
      if (typeof user.preferences === 'string') {
        user.preferences = JSON.parse(user.preferences);
      }
    }
    
    return result.rows[0];
  }

  /**
   * Update last login timestamp and IP
   */
  static async updateLastLogin(id, organizationId, ipAddress) {
    const query = `
      UPDATE hris.user_account 
      SET last_login_at = NOW(),
          last_login_ip = $3,
          failed_login_attempts = 0,
          locked_until = NULL
      WHERE id = $1 AND organization_id = $2
    `;
    await db.query(query, [id, organizationId, ipAddress]);
  }

  /**
   * Verify password
   */
  static async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }

  /**
   * Update password
   */
  static async updatePassword(id, organizationId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const query = `
      UPDATE hris.user_account 
      SET password_hash = $1, 
          password_changed_at = NOW(),
          updated_at = NOW()
      WHERE id = $2 
        AND organization_id = $3 
        AND deleted_at IS NULL
    `;
    
    await db.query(query, [hashedPassword, id, organizationId]);
  }

  /**
   * Soft delete tenant user
   */
  static async delete(id, organizationId) {
    const query = `
      UPDATE hris.user_account 
      SET deleted_at = NOW()
      WHERE id = $1 AND organization_id = $2
    `;
    await db.query(query, [id, organizationId]);
  }

  /**
   * Track failed login attempt
   */
  static async incrementFailedLogins(email, organizationId) {
    const query = `
      UPDATE hris.user_account 
      SET failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE 
            WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
            ELSE locked_until
          END
      WHERE email = $1 AND organization_id = $2
      RETURNING failed_login_attempts, locked_until
    `;
    const result = await db.query(query, [email.toLowerCase(), organizationId]);
    return result.rows[0];
  }

  /**
   * Reset failed login attempts
   */
  static async resetFailedLogins(email, organizationId) {
    const query = `
      UPDATE hris.user_account 
      SET failed_login_attempts = 0,
          locked_until = NULL
      WHERE email = $1 AND organization_id = $2
    `;
    await db.query(query, [email.toLowerCase(), organizationId]);
  }

  /**
   * Check if account is locked
   */
  static isAccountLocked(user) {
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return true;
    }
    if (user.account_status === 'locked') {
      return true;
    }
    return user.failed_login_attempts >= 5;
  }

  /**
   * Find all tenant users in organization
   */
  static async findAll(organizationId: string, options: { product?: string; search?: string; limit?: number; offset?: number } = {}) {
    const { product, search, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT 
        ua.id, ua.organization_id, ua.employee_id, ua.email,
        ua.enabled_products, ua.product_roles, ua.account_status,
        ua.is_active, ua.last_login_at, ua.created_at,
        e.first_name, e.last_name, e.employee_number
      FROM hris.user_account ua
      LEFT JOIN hris.employee e ON ua.employee_id = e.id
      WHERE ua.organization_id = $1 AND ua.deleted_at IS NULL
    `;
    
    const values = [organizationId];
    let paramCount = 1;

    if (product) {
      paramCount++;
      query += ` AND enabled_products @> $${paramCount}::jsonb`;
      values.push(JSON.stringify([product]));
    }

    if (search) {
      paramCount++;
      query += ` AND (e.first_name ILIKE $${paramCount} OR e.last_name ILIKE $${paramCount} OR ua.email ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }

    query += ` ORDER BY ua.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await db.query(query, values);
    
    // Parse JSON fields for each user
    result.rows.forEach(user => {
      if (typeof user.enabled_products === 'string') {
        user.enabled_products = JSON.parse(user.enabled_products);
      }
      if (typeof user.product_roles === 'string') {
        user.product_roles = JSON.parse(user.product_roles);
      }
    });
    
    return result.rows;
  }

  /**
   * Update product access and roles
   */
  static async updateProductAccess(id, organizationId, enabledProducts, productRoles) {
    const query = `
      UPDATE hris.user_account 
      SET enabled_products = $1, 
          product_roles = $2, 
          updated_at = NOW()
      WHERE id = $3 
        AND organization_id = $4 
        AND deleted_at IS NULL
      RETURNING id, email, enabled_products, product_roles
    `;

    const result = await db.query(query, [
      JSON.stringify(enabledProducts),
      JSON.stringify(productRoles),
      id,
      organizationId
    ]);
    
    if (result.rows[0]) {
      const user = result.rows[0];
      if (typeof user.enabled_products === 'string') {
        user.enabled_products = JSON.parse(user.enabled_products);
      }
      if (typeof user.product_roles === 'string') {
        user.product_roles = JSON.parse(user.product_roles);
      }
    }
    
    return result.rows[0];
  }

  /**
   * Update user active status (enable/disable)
   */
  static async updateStatus(id, organizationId, isActive) {
    const query = `
      UPDATE hris.user_account 
      SET is_active = $1, 
          account_status = CASE WHEN $1 = true THEN 'active' ELSE 'inactive' END,
          updated_at = NOW()
      WHERE id = $2 
        AND organization_id = $3 
        AND deleted_at IS NULL
      RETURNING id, email, is_active, account_status
    `;

    const result = await db.query(query, [isActive, id, organizationId]);
    return result.rows[0];
  }

  /**
   * Verify email
   */
  static async verifyEmail(id, organizationId) {
    const query = `
      UPDATE hris.user_account 
      SET email_verified = true, 
          email_verification_token = NULL,
          updated_at = NOW()
      WHERE id = $1 
        AND organization_id = $2 
        AND deleted_at IS NULL
      RETURNING id, email, email_verified
    `;
    
    const result = await db.query(query, [id, organizationId]);
    return result.rows[0];
  }

  /**
   * Check if user has access to product
   */
  static hasProductAccess(user, product) {
    return user.enabled_products && user.enabled_products.includes(product);
  }

  /**
   * Get user's role for specific product
   */
  static getProductRole(user, product) {
    if (!user.product_roles) return null;
    return user.product_roles[product] || null;
  }

  /**
   * Check if user has specific role in a product
   */
  static hasProductRole(user, product, role) {
    const userRole = this.getProductRole(user, product);
    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    return userRole === role;
  }
}

export default TenantUser;
