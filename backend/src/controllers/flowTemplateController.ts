import Joi from 'joi';
import db from '../config/database.ts';
import logger from '../utils/logger.ts';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.ts';
import { v4 as uuidv4 } from 'uuid';

// Stage schema for validation
const stageSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().allow(''),
  order: Joi.number().integer().required(),
  color: Joi.string().allow(''),
  isInitial: Joi.boolean().default(false),
  isFinal: Joi.boolean().default(false)
});

// Validation schemas
const createFlowTemplateSchema = Joi.object({
  workspaceId: Joi.string().uuid().allow(null),
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().allow(''),
  category: Joi.string().max(100).allow(''),
  stages: Joi.array().items(stageSchema).min(1).required(),
  isDefault: Joi.boolean().default(false),
  isGlobal: Joi.boolean().default(false)
});

const updateFlowTemplateSchema = Joi.object({
  name: Joi.string().min(2).max(255),
  description: Joi.string().allow(''),
  category: Joi.string().max(100).allow(''),
  stages: Joi.array().items(stageSchema).min(1),
  isDefault: Joi.boolean(),
  isGlobal: Joi.boolean()
}).min(1);

/**
 * List all flow templates
 */
export async function listFlowTemplates(req, res, next) {
  try {
    const organizationId = req.user.organization_id;
    const { workspaceId, category, isGlobal } = req.query;

    let query = `
      SELECT ft.*,
             w.name as workspace_name,
             u.name as creator_name,
             COUNT(DISTINCT j.id) as jobs_using_count
      FROM flow_templates ft
      LEFT JOIN workspaces w ON ft.workspace_id = w.id
      LEFT JOIN users u ON ft.created_by = u.id
      LEFT JOIN jobs j ON j.flow_template_id = ft.id AND j.deleted_at IS NULL
      WHERE ft.organization_id = $1
    `;

    const values = [organizationId];
    let paramCount = 1;

    if (workspaceId) {
      paramCount++;
      query += ` AND (ft.workspace_id = $${paramCount} OR ft.is_global = true)`;
      values.push(workspaceId);
    }

    if (category) {
      paramCount++;
      query += ` AND ft.category = $${paramCount}`;
      values.push(category);
    }

    if (isGlobal !== undefined) {
      paramCount++;
      query += ` AND ft.is_global = $${paramCount}`;
      values.push(isGlobal === 'true');
    }

    query += ` GROUP BY ft.id, w.name, u.name ORDER BY ft.is_default DESC, ft.created_at DESC`;

    const result = await db.query(query, values);

    res.json({
      flowTemplates: result.rows.map(ft => ({
        id: ft.id,
        organizationId: ft.organization_id,
        workspaceId: ft.workspace_id,
        workspaceName: ft.workspace_name,
        name: ft.name,
        description: ft.description,
        category: ft.category,
        stages: ft.stages,
        isDefault: ft.is_default,
        isGlobal: ft.is_global,
        jobsUsingCount: parseInt(ft.jobs_using_count),
        createdBy: ft.creator_name,
        createdAt: ft.created_at,
        updatedAt: ft.updated_at
      }))
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get flow template by ID
 */
export async function getFlowTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const query = `
      SELECT ft.*,
             w.name as workspace_name,
             u.name as creator_name,
             COUNT(DISTINCT j.id) as jobs_using_count
      FROM flow_templates ft
      LEFT JOIN workspaces w ON ft.workspace_id = w.id
      LEFT JOIN users u ON ft.created_by = u.id
      LEFT JOIN jobs j ON j.flow_template_id = ft.id AND j.deleted_at IS NULL
      WHERE ft.id = $1 AND ft.organization_id = $2
      GROUP BY ft.id, w.name, u.name
    `;

    const result = await db.query(query, [id, organizationId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Flow template not found');
    }

    const ft = result.rows[0];

    res.json({
      flowTemplate: {
        id: ft.id,
        organizationId: ft.organization_id,
        workspaceId: ft.workspace_id,
        workspaceName: ft.workspace_name,
        name: ft.name,
        description: ft.description,
        category: ft.category,
        stages: ft.stages,
        isDefault: ft.is_default,
        isGlobal: ft.is_global,
        jobsUsingCount: parseInt(ft.jobs_using_count),
        createdBy: ft.creator_name,
        createdAt: ft.created_at,
        updatedAt: ft.updated_at
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Create flow template
 */
export async function createFlowTemplate(req, res, next) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    // Only owner, admin, and recruiter can create flow templates
    if (!['owner', 'admin', 'recruiter'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners, admins, and recruiters can create flow templates');
    }

    // Validate input
    const { error, value } = createFlowTemplateSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Verify workspace belongs to organization (if specified)
    if (value.workspaceId) {
      const workspaceCheck = await db.query(
        'SELECT id FROM workspaces WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
        [value.workspaceId, organizationId]
      );

      if (workspaceCheck.rows.length === 0) {
        throw new NotFoundError('Workspace not found');
      }
    }

    const id = uuidv4();

    const query = `
      INSERT INTO flow_templates (
        id, organization_id, workspace_id, name, description, category,
        stages, is_default, is_global, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, created_at
    `;

    const result = await db.query(query, [
      id,
      organizationId,
      value.workspaceId || null,
      value.name,
      value.description || '',
      value.category || null,
      JSON.stringify(value.stages),
      value.isDefault,
      value.isGlobal,
      userId
    ]);

    const flowTemplate = result.rows[0];

    logger.info(`Flow template created: ${flowTemplate.name} by ${req.user.email}`);

    res.status(201).json({
      message: 'Flow template created successfully',
      flowTemplate: {
        id: flowTemplate.id,
        name: flowTemplate.name,
        createdAt: flowTemplate.created_at
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Update flow template
 */
export async function updateFlowTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Only owner, admin, recruiter can update flow templates
    if (!['owner', 'admin', 'recruiter'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners, admins, and recruiters can update flow templates');
    }

    // Validate input
    const { error, value } = updateFlowTemplateSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check flow template exists
    const ftCheck = await db.query(
      'SELECT id, is_global FROM flow_templates WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (ftCheck.rows.length === 0) {
      throw new NotFoundError('Flow template not found');
    }

    const updates = [];
    const values = [];
    let paramCount = 0;

    Object.keys(value).forEach(key => {
      paramCount++;
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      if (key === 'stages') {
        updates.push(`${dbKey} = $${paramCount}`);
        values.push(JSON.stringify(value[key]));
      } else {
        updates.push(`${dbKey} = $${paramCount}`);
        values.push(value[key]);
      }
    });

    if (updates.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    values.push(id, organizationId);

    // sql-injection-safe: Dynamic SET clause uses parameterized placeholders ($1, $2, etc.)
    // User input goes into values array, not directly into SQL string
    const query = `
      UPDATE flow_templates
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
      RETURNING id, name
    `;

    const result = await db.query(query, values);

    logger.info(`Flow template updated: ${result.rows[0].name} by ${req.user.email}`);

    res.json({
      message: 'Flow template updated successfully',
      flowTemplate: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Delete flow template
 */
export async function deleteFlowTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Only owner, admin can delete flow templates
    if (!['owner', 'admin'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners and admins can delete flow templates');
    }

    // Check if template is in use
    const usageCheck = await db.query(
      'SELECT COUNT(*) as count FROM jobs WHERE flow_template_id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      throw new ValidationError('Cannot delete flow template that is in use by jobs');
    }

    const query = `
      DELETE FROM flow_templates
      WHERE id = $1 AND organization_id = $2
      RETURNING name
    `;

    const result = await db.query(query, [id, organizationId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Flow template not found');
    }

    logger.info(`Flow template deleted: ${result.rows[0].name} by ${req.user.email}`);

    res.json({
      message: 'Flow template deleted successfully'
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Clone flow template
 */
export async function cloneFlowTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    // Only owner, admin, recruiter can clone flow templates
    if (!['owner', 'admin', 'recruiter'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners, admins, and recruiters can clone flow templates');
    }

    // Get original template
    const originalQuery = `
      SELECT * FROM flow_templates
      WHERE id = $1 AND organization_id = $2
    `;

    const originalResult = await db.query(originalQuery, [id, organizationId]);

    if (originalResult.rows.length === 0) {
      throw new NotFoundError('Flow template not found');
    }

    const original = originalResult.rows[0];
    const newId = uuidv4();
    const newName = `${original.name} (Copy)`;

    const cloneQuery = `
      INSERT INTO flow_templates (
        id, organization_id, workspace_id, name, description, category,
        stages, is_default, is_global, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, created_at
    `;

    const result = await db.query(cloneQuery, [
      newId,
      organizationId,
      original.workspace_id,
      newName,
      original.description,
      original.category,
      original.stages,
      false, // Clones are not default
      false, // Clones are not global
      userId
    ]);

    const cloned = result.rows[0];

    logger.info(`Flow template cloned: ${cloned.name} from ${original.name} by ${req.user.email}`);

    res.status(201).json({
      message: 'Flow template cloned successfully',
      flowTemplate: {
        id: cloned.id,
        name: cloned.name,
        createdAt: cloned.created_at
      }
    });

  } catch (error) {
    next(error);
  }
}
