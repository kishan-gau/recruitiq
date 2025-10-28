import Joi from 'joi';
import db from '../config/database.js';
import logger from '../utils/logger.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

// Validation schemas
const createWorkspaceSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(1000).allow(''),
  settings: Joi.object().default({})
});

const updateWorkspaceSchema = Joi.object({
  name: Joi.string().min(2).max(255),
  description: Joi.string().max(1000).allow(''),
  settings: Joi.object()
});

/**
 * List all workspaces
 */
export async function listWorkspaces(req, res, next) {
  try {
    const organizationId = req.user.organization_id;

    const query = `
      SELECT w.*, 
             COUNT(DISTINCT wm.user_id) as member_count,
             COUNT(DISTINCT j.id) as job_count
      FROM workspaces w
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
      LEFT JOIN jobs j ON w.id = j.workspace_id AND j.deleted_at IS NULL
      WHERE w.organization_id = $1 AND w.deleted_at IS NULL
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `;

    const result = await db.query(query, [organizationId]);

    res.json({
      workspaces: result.rows.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        memberCount: parseInt(w.member_count),
        jobCount: parseInt(w.job_count),
        createdAt: w.created_at
      }))
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get workspace by ID
 */
export async function getWorkspace(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const query = `
      SELECT w.*, 
             u.name as creator_name,
             COUNT(DISTINCT wm.user_id) as member_count
      FROM workspaces w
      LEFT JOIN users u ON w.created_by = u.id
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE w.id = $1 AND w.organization_id = $2 AND w.deleted_at IS NULL
      GROUP BY w.id, u.name
    `;

    const result = await db.query(query, [id, organizationId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Workspace not found');
    }

    const workspace = result.rows[0];

    res.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        settings: workspace.settings,
        createdBy: workspace.creator_name,
        memberCount: parseInt(workspace.member_count),
        createdAt: workspace.created_at
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Create workspace
 */
export async function createWorkspace(req, res, next) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    // Only owner, admin, and recruiter can create workspaces
    if (!['owner', 'admin', 'recruiter'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners, admins, and recruiters can create workspaces');
    }

    // Validate input
    const { error, value } = createWorkspaceSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { name, description, settings } = value;
    const id = uuidv4();

    const query = `
      INSERT INTO workspaces (id, organization_id, name, description, settings, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, description, settings, created_at
    `;

    const result = await db.query(query, [
      id,
      organizationId,
      name,
      description || '',
      JSON.stringify(settings),
      userId
    ]);

    const workspace = result.rows[0];

    // Add creator as member
    await db.query(
      'INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES ($1, $2, $3, $4)',
      [uuidv4(), id, userId, 'admin']
    );

    logger.info(`Workspace created: ${workspace.name} by ${req.user.email}`);

    res.status(201).json({
      message: 'Workspace created successfully',
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        createdAt: workspace.created_at
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Update workspace
 */
export async function updateWorkspace(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Check if user has permission
    if (!['owner', 'admin'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners and admins can update workspaces');
    }

    // Validate input
    const { error, value } = updateWorkspaceSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const updates = [];
    const values = [];
    let paramCount = 0;

    Object.keys(value).forEach(key => {
      paramCount++;
      const dbKey = key === 'settings' ? key : key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updates.push(`${dbKey} = $${paramCount}`);
      values.push(key === 'settings' ? JSON.stringify(value[key]) : value[key]);
    });

    if (updates.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    values.push(id, organizationId);

    // sql-injection-safe: Dynamic SET clause uses parameterized placeholders ($1, $2, etc.)
    // User input goes into values array, not directly into SQL string
    const query = `
      UPDATE workspaces
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2} AND deleted_at IS NULL
      RETURNING id, name, description, settings
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      throw new NotFoundError('Workspace not found');
    }

    logger.info(`Workspace updated: ${result.rows[0].name}`);

    res.json({
      message: 'Workspace updated successfully',
      workspace: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Delete workspace
 */
export async function deleteWorkspace(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Only owner and admin can delete workspaces
    if (!['owner', 'admin'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners and admins can delete workspaces');
    }

    const query = `
      UPDATE workspaces
      SET deleted_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING name
    `;

    const result = await db.query(query, [id, organizationId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Workspace not found');
    }

    logger.info(`Workspace deleted: ${result.rows[0].name} by ${req.user.email}`);

    res.json({
      message: 'Workspace deleted successfully'
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get workspace members
 */
export async function getWorkspaceMembers(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Verify workspace exists and belongs to organization
    const workspaceCheck = await db.query(
      'SELECT id FROM workspaces WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, organizationId]
    );

    if (workspaceCheck.rows.length === 0) {
      throw new NotFoundError('Workspace not found');
    }

    const query = `
      SELECT u.id, u.email, u.name, u.avatar_url, wm.role, wm.joined_at
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = $1 AND u.deleted_at IS NULL
      ORDER BY wm.joined_at ASC
    `;

    const result = await db.query(query, [id]);

    res.json({
      members: result.rows.map(m => ({
        id: m.id,
        email: m.email,
        name: m.name,
        avatarUrl: m.avatar_url,
        role: m.role,
        joinedAt: m.joined_at
      }))
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Add member to workspace
 */
export async function addWorkspaceMember(req, res, next) {
  try {
    const { id } = req.params;
    const { userId, role = 'member' } = req.body;
    const organizationId = req.user.organization_id;

    // Only owner, admin can add members
    if (!['owner', 'admin', 'recruiter'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners, admins, and recruiters can add workspace members');
    }

    // Validate role
    if (!['admin', 'member'].includes(role)) {
      throw new ValidationError('Invalid role. Must be admin or member');
    }

    // Verify workspace exists
    const workspaceCheck = await db.query(
      'SELECT id FROM workspaces WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, organizationId]
    );

    if (workspaceCheck.rows.length === 0) {
      throw new NotFoundError('Workspace not found');
    }

    // Verify user exists in organization
    const userCheck = await db.query(
      'SELECT id, email, name FROM users WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [userId, organizationId]
    );

    if (userCheck.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = userCheck.rows[0];

    // Check if already a member
    const memberCheck = await db.query(
      'SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (memberCheck.rows.length > 0) {
      throw new ValidationError('User is already a member of this workspace');
    }

    // Add member
    await db.query(
      'INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES ($1, $2, $3, $4)',
      [uuidv4(), id, userId, role]
    );

    logger.info(`User ${user.email} added to workspace ${id} by ${req.user.email}`);

    res.status(201).json({
      message: 'Member added successfully',
      member: {
        id: user.id,
        email: user.email,
        name: user.name,
        role
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Remove member from workspace
 */
export async function removeWorkspaceMember(req, res, next) {
  try {
    const { id, userId } = req.params;
    const organizationId = req.user.organization_id;

    // Only owner, admin can remove members
    if (!['owner', 'admin'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners and admins can remove workspace members');
    }

    // Verify workspace exists
    const workspaceCheck = await db.query(
      'SELECT id FROM workspaces WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, organizationId]
    );

    if (workspaceCheck.rows.length === 0) {
      throw new NotFoundError('Workspace not found');
    }

    // Remove member
    const result = await db.query(
      'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 RETURNING user_id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Member not found in workspace');
    }

    logger.info(`User ${userId} removed from workspace ${id} by ${req.user.email}`);

    res.json({
      message: 'Member removed successfully'
    });

  } catch (error) {
    next(error);
  }
}
