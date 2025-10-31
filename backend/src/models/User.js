import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class User {
  /**
   * Create a new user
   */
  static async create(userData) {
    const {
      organizationId,
      email,
      password,
      firstName,
      lastName,
      role = 'member',
      permissions = []
    } = userData;

    const hashedPassword = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const fullName = `${firstName} ${lastName}`;

    const query = `
      INSERT INTO users (
        id, organization_id, email, password_hash, 
        name, role, permissions
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, organization_id, email, name, 
                role, permissions, mfa_enabled,
                created_at, updated_at
    `;

    const values = [
      id,
      organizationId,
      email.toLowerCase(),
      hashedPassword,
      fullName,
      role,
      JSON.stringify(permissions)
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const query = `
      SELECT 
        u.id,
        u.organization_id,
        u.email,
        u.password_hash,
        u.email_verified,
        u.name,
        u.avatar_url,
        u.phone,
        u.timezone,
        u.user_type,
        u.role_id,
        u.legacy_role,
        u.additional_permissions,
        u.last_login_at,
        u.last_login_ip,
        u.failed_login_attempts,
        u.locked_until,
        u.mfa_enabled,
        u.mfa_secret,
        u.created_at,
        u.updated_at,
        u.deleted_at,
        r.name as role_name,
        r.level as role_level,
        r.role_type,
        COALESCE(
          json_agg(
            DISTINCT p.name
          ) FILTER (WHERE p.name IS NOT NULL),
          '[]'
        ) as permissions,
        o.name as organization_name,
        o.tier as organization_tier
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.email = $1 AND u.deleted_at IS NULL
      GROUP BY u.id, u.organization_id, u.email, u.password_hash, u.email_verified,
               u.name, u.avatar_url, u.phone, u.timezone, u.user_type, u.role_id,
               u.legacy_role, u.additional_permissions, u.last_login_at, u.last_login_ip,
               u.failed_login_attempts, u.locked_until, u.mfa_enabled, u.mfa_secret,
               u.created_at, u.updated_at, u.deleted_at,
               r.name, r.level, r.role_type, o.name, o.tier
    `;
    
    const result = await db.query(query, [email.toLowerCase()]);
    if (result.rows[0]) {
      // Merge role permissions with additional user-specific permissions
      const user = result.rows[0];
      const rolePermissions = user.permissions || [];
      const additionalPermissions = user.additional_permissions || [];
      user.permissions = [...new Set([...rolePermissions, ...additionalPermissions])];
      // Set role to role_name for backward compatibility
      user.role = user.role_name;
    }
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id, organizationId) {
    const query = `
      SELECT 
        u.id,
        u.organization_id,
        u.email,
        u.password_hash,
        u.email_verified,
        u.name,
        u.avatar_url,
        u.phone,
        u.timezone,
        u.user_type,
        u.role_id,
        u.legacy_role,
        u.additional_permissions,
        u.last_login_at,
        u.last_login_ip,
        u.failed_login_attempts,
        u.locked_until,
        u.mfa_enabled,
        u.mfa_secret,
        u.created_at,
        u.updated_at,
        u.deleted_at,
        r.name as role_name,
        r.level as role_level,
        r.role_type,
        COALESCE(
          json_agg(
            DISTINCT p.name
          ) FILTER (WHERE p.name IS NOT NULL),
          '[]'
        ) as permissions,
        o.name as organization_name,
        o.tier as organization_tier
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
      GROUP BY u.id, u.organization_id, u.email, u.password_hash, u.email_verified,
               u.name, u.avatar_url, u.phone, u.timezone, u.user_type, u.role_id,
               u.legacy_role, u.additional_permissions, u.last_login_at, u.last_login_ip,
               u.failed_login_attempts, u.locked_until, u.mfa_enabled, u.mfa_secret,
               u.created_at, u.updated_at, u.deleted_at,
               r.name, r.level, r.role_type, o.name, o.tier
    `;
    
    const result = await db.query(query, [id]);
    if (result.rows[0]) {
      // Merge role permissions with additional user-specific permissions
      const user = result.rows[0];
      const rolePermissions = user.permissions || [];
      const additionalPermissions = user.additional_permissions || [];
      user.permissions = [...new Set([...rolePermissions, ...additionalPermissions])];
      // Set role to role_name for backward compatibility
      user.role = user.role_name;
    }
    return result.rows[0];
  }

  /**
   * Update user
   */
  static async update(id, updates, organizationId) {
    const allowedFields = ['name', 'phone', 'avatar_url', 'timezone'];
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
    // sql-injection-safe: Dynamic SET clause uses parameterized placeholders ($1, $2, etc.)
    // User input goes into values array, not directly into SQL string
    const query = `
      UPDATE users 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCounter} AND deleted_at IS NULL
      RETURNING id, organization_id, email, name, 
                role, permissions, phone, avatar_url, timezone
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id) {
    const query = `
      UPDATE users 
      SET last_login_at = NOW()
      WHERE id = $1
    `;
    await db.query(query, [id]);
  }

  /**
   * Verify password
   */
  static async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }

  /**
   * Soft delete user
   */
  static async delete(id, organizationId) {
    const query = `
      UPDATE users 
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
      UPDATE users 
      SET failed_login_attempts = failed_login_attempts + 1
      WHERE email = $1
      RETURNING failed_login_attempts
    `;
    const result = await db.query(query, [email.toLowerCase()]);
    return result.rows[0]?.failed_login_attempts || 0;
  }

  /**
   * Reset failed login attempts
   */
  static async resetFailedLogins(email) {
    const query = `
      UPDATE users 
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
    return user.failed_login_attempts >= 5;
  }

  /**
   * Find all users in organization
   */
  static async findAll(organizationId, options = {}) {
    const { role, search, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT id, organization_id, email, name, role, permissions,
             phone, avatar_url, timezone, last_login_at, created_at
      FROM users
      WHERE organization_id = $1 AND deleted_at IS NULL
    `;
    
    const values = [organizationId];
    let paramCount = 1;

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
    return result.rows;
  }

  /**
   * Update user role and permissions
   */
  static async updateRole(id, role, permissions = []) {
    const query = `
      UPDATE users 
      SET role = $1, permissions = $2, updated_at = NOW()
      WHERE id = $3 AND deleted_at IS NULL
      RETURNING id, email, name, role, permissions
    `;

    const result = await db.query(query, [role, JSON.stringify(permissions), id]);
    return result.rows[0];
  }
}

export default User;
