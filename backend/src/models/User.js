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
        name, first_name, last_name, role, permissions
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, organization_id, email, name, first_name, last_name,
                role, permissions, mfa_enabled,
                created_at, updated_at
    `;

    const values = [
      id,
      organizationId,
      email.toLowerCase(),
      hashedPassword,
      fullName,
      firstName,
      lastName,
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
      LEFT JOIN permissions p ON rp.permission_id = p.id OR p.id = ANY(u.additional_permissions)
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
      const user = result.rows[0];
      // Parse JSON array to regular array if needed
      if (typeof user.permissions === 'string') {
        user.permissions = JSON.parse(user.permissions);
      }
      // Set role to role_name or legacy_role for backward compatibility
      user.role = user.role_name || user.legacy_role;
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
      LEFT JOIN permissions p ON rp.permission_id = p.id OR p.id = ANY(u.additional_permissions)
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
      const user = result.rows[0];
      // Parse JSON array to regular array if needed
      if (typeof user.permissions === 'string') {
        user.permissions = JSON.parse(user.permissions);
      }
      // Set role to role_name or legacy_role for backward compatibility
      user.role = user.role_name || user.legacy_role;
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

  /**
   * Check if organization can add more users (license limit check)
   */
  static async checkUserLimit(organizationId) {
    const query = `
      SELECT 
        o.max_users,
        o.tier,
        COUNT(u.id) FILTER (WHERE u.is_active = true AND u.deleted_at IS NULL) as active_user_count
      FROM organizations o
      LEFT JOIN users u ON u.organization_id = o.id
      WHERE o.id = $1
      GROUP BY o.id, o.max_users, o.tier
    `;

    const result = await db.query(query, [organizationId]);
    
    if (result.rows.length === 0) {
      return { canAddUser: false, limit: 0, current: 0, tier: 'unknown' };
    }

    const { max_users, active_user_count, tier } = result.rows[0];
    const current = parseInt(active_user_count) || 0;

    // null or -1 means unlimited
    if (max_users === null || max_users === -1) {
      return { 
        canAddUser: true, 
        limit: null, 
        current,
        tier,
        unlimited: true 
      };
    }

    const limit = parseInt(max_users);
    const canAddUser = current < limit;

    return { 
      canAddUser, 
      limit, 
      current,
      tier,
      unlimited: false 
    };
  }

  /**
   * Update user active status (enable/disable)
   */
  static async updateStatus(id, isActive, organizationId) {
    // If enabling user, check license limit
    if (isActive) {
      const { canAddUser, limit, current } = await this.checkUserLimit(organizationId);
      if (!canAddUser) {
        throw new Error(`Cannot enable user. Organization has reached the maximum of ${limit} enabled users (currently ${current} enabled).`);
      }
    }

    const query = `
      UPDATE users 
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id, email, name, is_active
    `;

    const result = await db.query(query, [isActive, id]);
    return result.rows[0];
  }
}

export default User;
