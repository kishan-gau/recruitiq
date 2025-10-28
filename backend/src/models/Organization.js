import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class Organization {
  /**
   * Create a new organization
   */
  static async create(orgData) {
    const {
      name,
      tier = 'starter',
      licenseKey = null,
      subscriptionStatus = 'trialing'
    } = orgData;

    const id = uuidv4();
    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const query = `
      INSERT INTO organizations (
        id, name, slug, tier, license_key, subscription_status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, slug, tier, license_key, subscription_status,
                created_at, updated_at
    `;

    const values = [
      id,
      name,
      slug,
      tier,
      licenseKey,
      subscriptionStatus
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find organization by ID
   */
  static async findById(id) {
    const query = `
      SELECT id, name, slug, tier, license_key, subscription_status,
             max_users, max_workspaces, max_jobs, max_candidates,
             created_at, updated_at
      FROM organizations
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update organization
   */
  static async update(id, updates) {
    const allowedFields = [
      'name', 'tier', 'license_key', 'subscription_status',
      'subscription_id', 'max_users', 'max_workspaces', 'max_jobs', 'max_candidates',
      'settings', 'branding'
    ];
    
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
      UPDATE organizations 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCounter} AND deleted_at IS NULL
      RETURNING id, name, tier, subscription_status
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Check if organization name is available
   */
  static async isNameAvailable(name, excludeId = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM organizations
      WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL
    `;
    
    const values = [name];

    if (excludeId) {
      query += ' AND id != $2';
      values.push(excludeId);
    }

    const result = await db.query(query, values);
    return result.rows[0].count === '0';
  }

  /**
   * Get organization usage statistics
   */
  static async getUsageStats(id) {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE organization_id = $1 AND deleted_at IS NULL) as user_count,
        (SELECT COUNT(*) FROM workspaces WHERE organization_id = $1 AND deleted_at IS NULL) as workspace_count,
        (SELECT COUNT(*) FROM jobs WHERE organization_id = $1 AND deleted_at IS NULL) as job_count,
        (SELECT COUNT(*) FROM jobs WHERE organization_id = $1 AND status = 'open' AND deleted_at IS NULL) as active_job_count,
        (SELECT COUNT(*) FROM candidates WHERE organization_id = $1 AND deleted_at IS NULL) as candidate_count,
        (SELECT COUNT(*) FROM applications WHERE organization_id = $1) as application_count
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

export default Organization;
