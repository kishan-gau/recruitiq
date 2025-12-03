import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * PlatformUser Model
 * Manages platform administrators (Portal app users)
 * Separate from tenant users (TenantUser)
 */
class PlatformUser {
  /**
   * Create a new platform user
   */
  static async create(userData) {
    const {
      email,
      password,
      name,
      firstName,
      lastName,
      role = 'viewer', // super_admin, admin, support, viewer
      permissions = [],
      phone,
      timezone = 'UTC'
    } = userData;

    const hashedPassword = await bcrypt.hash(password, 12);
    const id = uuidv4();

    const query = `
      INSERT INTO platform_users (
        id, email, password_hash, name, first_name, last_name, 
        role, permissions, phone, timezone, email_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
      RETURNING id, email, name, first_name, last_name, role, permissions, 
                phone, timezone, email_verified, is_active, created_at
    `;

    const values = [
      id,
      email.toLowerCase(),
      hashedPassword,
      name,
      firstName || null,
      lastName || null,
      role,
      JSON.stringify(permissions),
      phone || null,
      timezone
    ];

    const result = await db.query(query, values);
    const user = result.rows[0];
    
    // Parse permissions JSON
    if (typeof user.permissions === 'string') {
      user.permissions = JSON.parse(user.permissions);
    }
    
    return user;
  }

  /**
   * Find platform user by email
   * RBAC: Loads permissions from role_permissions table
   */
  static async findByEmail(email) {
    const query = `
      SELECT 
        pu.id, pu.email, pu.password_hash, pu.name, pu.first_name, pu.last_name,
        pu.avatar_url, pu.phone, pu.timezone,
        pu.last_login_at, pu.last_login_ip, pu.failed_login_attempts, pu.locked_until,
        pu.mfa_enabled, pu.mfa_secret, pu.mfa_backup_codes, pu.mfa_backup_codes_used,
        pu.email_verified, pu.is_active, pu.created_at, pu.updated_at,
        -- RBAC: Load role name from roles table
        r.name as role,
        -- RBAC: Aggregate permissions from role_permissions
        COALESCE(
          json_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
          '[]'::json
        ) as permissions
      FROM platform_users pu
      LEFT JOIN user_roles ur ON pu.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE pu.email = $1 AND pu.deleted_at IS NULL
      GROUP BY pu.id, pu.email, pu.password_hash, pu.name, pu.first_name, pu.last_name,
               pu.avatar_url, pu.phone, pu.timezone,
               pu.last_login_at, pu.last_login_ip, pu.failed_login_attempts, pu.locked_until,
               pu.mfa_enabled, pu.mfa_secret, pu.mfa_backup_codes, pu.mfa_backup_codes_used,
               pu.email_verified, pu.is_active, pu.created_at, pu.updated_at, r.name
    `;
    
    const result = await db.query(query, [email.toLowerCase()]);
    
    if (result.rows[0]) {
      const user = result.rows[0];
      // Parse JSON fields
      if (typeof user.permissions === 'string') {
        user.permissions = JSON.parse(user.permissions);
      }
      if (typeof user.mfa_backup_codes === 'string') {
        user.mfa_backup_codes = JSON.parse(user.mfa_backup_codes);
      }
    }
    
    return result.rows[0];
  }

  /**
   * Find platform user by ID
   * RBAC: Loads permissions from role_permissions table
   */
  static async findById(id) {
    const query = `
      SELECT 
        pu.id, pu.email, pu.password_hash, pu.name, pu.first_name, pu.last_name,
        pu.avatar_url, pu.phone, pu.timezone, 
        pu.last_login_at, pu.last_login_ip, pu.failed_login_attempts, pu.locked_until,
        pu.mfa_enabled, pu.mfa_secret, pu.mfa_backup_codes, pu.mfa_backup_codes_used,
        pu.email_verified, pu.is_active, pu.created_at, pu.updated_at,
        -- RBAC: Load role name from roles table
        r.name as role,
        -- RBAC: Aggregate permissions from role_permissions
        COALESCE(
          json_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
          '[]'::json
        ) as permissions
      FROM platform_users pu
      LEFT JOIN user_roles ur ON pu.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE pu.id = $1 AND pu.deleted_at IS NULL
      GROUP BY pu.id, pu.email, pu.password_hash, pu.name, pu.first_name, pu.last_name,
               pu.avatar_url, pu.phone, pu.timezone, 
               pu.last_login_at, pu.last_login_ip, pu.failed_login_attempts, pu.locked_until,
               pu.mfa_enabled, pu.mfa_secret, pu.mfa_backup_codes, pu.mfa_backup_codes_used,
               pu.email_verified, pu.is_active, pu.created_at, pu.updated_at, r.name
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows[0]) {
      const user = result.rows[0];
      // Parse JSON fields
      if (typeof user.permissions === 'string') {
        user.permissions = JSON.parse(user.permissions);
      }
      if (typeof user.mfa_backup_codes === 'string') {
        user.mfa_backup_codes = JSON.parse(user.mfa_backup_codes);
      }
    }
    
    return result.rows[0];
  }

  /**
   * Update platform user
   */
  static async update(id, updates) {
    const allowedFields = ['name', 'first_name', 'last_name', 'phone', 'avatar_url', 'timezone'];
    const setClause = [];
    const values = [];
    let paramCounter = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramCounter}`);
        values.push(updates[key]);
        paramCounter++;
      }
    });

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `
      UPDATE platform_users 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCounter} AND deleted_at IS NULL
      RETURNING id, email, name, first_name, last_name, role, permissions, 
                phone, avatar_url, timezone
    `;

    const result = await db.query(query, values);
    
    if (result.rows[0] && typeof result.rows[0].permissions === 'string') {
      result.rows[0].permissions = JSON.parse(result.rows[0].permissions);
    }
    
    return result.rows[0];
  }

  /**
   * Update last login timestamp and IP
   */
  static async updateLastLogin(id, ipAddress) {
    const query = `
      UPDATE platform_users 
      SET last_login_at = NOW(),
          last_login_ip = $2,
          failed_login_attempts = 0,
          locked_until = NULL
      WHERE id = $1
    `;
    await db.query(query, [id, ipAddress]);
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
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const query = `
      UPDATE platform_users 
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
    `;
    
    await db.query(query, [hashedPassword, id]);
  }

  /**
   * Soft delete platform user
   */
  static async delete(id) {
    const query = `
      UPDATE platform_users 
      SET deleted_at = NOW()
      WHERE id = $1
    `;
    await db.query(query, [id]);
  }

  /**
   * Track failed login attempt
   */
  static async incrementFailedLogins(email) {
    const query = `
      UPDATE platform_users 
      SET failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE 
            WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
            ELSE locked_until
          END
      WHERE email = $1
      RETURNING failed_login_attempts, locked_until
    `;
    const result = await db.query(query, [email.toLowerCase()]);
    return result.rows[0];
  }

  /**
   * Reset failed login attempts
   */
  static async resetFailedLogins(email) {
    const query = `
      UPDATE platform_users 
      SET failed_login_attempts = 0,
          locked_until = NULL
      WHERE email = $1
    `;
    await db.query(query, [email.toLowerCase()]);
  }

  /**
   * Check if account is locked
   */
  static isAccountLocked(user) {
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return true;
    }
    return user.failed_login_attempts >= 5;
  }

  /**
   * Find all platform users
   */
  static async findAll(options = {}) {
    const { role, search, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT id, email, name, first_name, last_name, role, permissions,
             phone, avatar_url, timezone, last_login_at, is_active, created_at
      FROM platform_users
      WHERE deleted_at IS NULL
    `;
    
    const values = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      values.push(role);
    }

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await db.query(query, values);
    
    // Parse permissions for each user
    result.rows.forEach(user => {
      if (typeof user.permissions === 'string') {
        user.permissions = JSON.parse(user.permissions);
      }
    });
    
    return result.rows;
  }

  /**
   * Update platform user role and permissions
   */
  static async updateRole(id, role, permissions = []) {
    const validRoles = ['super_admin', 'admin', 'support', 'viewer'];
    
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
    
    const query = `
      UPDATE platform_users 
      SET role = $1, permissions = $2, updated_at = NOW()
      WHERE id = $3 AND deleted_at IS NULL
      RETURNING id, email, name, role, permissions
    `;

    const result = await db.query(query, [role, JSON.stringify(permissions), id]);
    
    if (result.rows[0] && typeof result.rows[0].permissions === 'string') {
      result.rows[0].permissions = JSON.parse(result.rows[0].permissions);
    }
    
    return result.rows[0];
  }

  /**
   * Update user active status (enable/disable)
   */
  static async updateStatus(id, isActive) {
    const query = `
      UPDATE platform_users 
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id, email, name, is_active
    `;

    const result = await db.query(query, [isActive, id]);
    return result.rows[0];
  }

  /**
   * Verify email
   */
  static async verifyEmail(id) {
    const query = `
      UPDATE platform_users 
      SET email_verified = true, 
          email_verification_token = NULL,
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, email, email_verified
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Check if user has permission
   */
  static hasPermission(user, permission) {
    // Super admin has all permissions
    if (user.role === 'super_admin') {
      return true;
    }
    
    // Check additional permissions array
    return user.permissions && user.permissions.includes(permission);
  }

  /**
   * Check if user has role
   */
  static hasRole(user, role) {
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  }
}

export default PlatformUser;
