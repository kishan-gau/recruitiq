import Joi from 'joi';
import db from '../config/database.js';
import logger from '../utils/logger.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

// Helper function to convert arrays to JSON strings
function arrayToString(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return value || '';
}

/**
 * Check if organization can create more jobs (license limit check)
 */
async function checkJobLimit(organizationId) {
  const query = `
    SELECT 
      o.max_jobs,
      o.tier,
      COUNT(j.id) FILTER (WHERE j.deleted_at IS NULL) as job_count
    FROM organizations o
    LEFT JOIN jobs j ON j.organization_id = o.id
    WHERE o.id = $1
    GROUP BY o.id, o.max_jobs, o.tier
  `;

  const result = await db.query(query, [organizationId]);
  
  if (result.rows.length === 0) {
    return { canCreate: false, limit: 0, current: 0, tier: 'unknown' };
  }

  const { max_jobs, job_count, tier } = result.rows[0];
  const current = parseInt(job_count) || 0;

  // null or -1 means unlimited
  if (max_jobs === null || max_jobs === -1) {
    return { 
      canCreate: true, 
      limit: null, 
      current,
      tier,
      unlimited: true 
    };
  }

  const limit = parseInt(max_jobs);
  const canCreate = current < limit;

  return { 
    canCreate, 
    limit, 
    current,
    tier,
    unlimited: false 
  };
}

// Validation schemas
const createJobSchema = Joi.object({
  workspaceId: Joi.string().uuid().required(),
  title: Joi.string().min(2).max(255).required(),
  department: Joi.string().max(100).allow(''),
  location: Joi.string().max(255).allow(''),
  employmentType: Joi.string().valid('full-time', 'part-time', 'contract', 'temporary', 'internship').required(),
  experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'lead', 'executive').allow(''),
  salaryMin: Joi.number().integer().min(0).allow(null),
  salaryMax: Joi.number().integer().min(0).allow(null),
  salaryCurrency: Joi.string().length(3).default('USD'),
  description: Joi.string().required(),
  requirements: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).allow(''),
  benefits: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).allow(''),
  isRemote: Joi.boolean().default(false),
  isPublic: Joi.boolean().default(false),
  flowTemplateId: Joi.string().uuid().required()
});

const updateJobSchema = Joi.object({
  title: Joi.string().min(2).max(255),
  department: Joi.string().max(100).allow(''),
  location: Joi.string().max(255).allow(''),
  employmentType: Joi.string().valid('full-time', 'part-time', 'contract', 'temporary', 'internship'),
  experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'lead', 'executive').allow(''),
  salaryMin: Joi.number().integer().min(0).allow(null),
  salaryMax: Joi.number().integer().min(0).allow(null),
  salaryCurrency: Joi.string().length(3),
  description: Joi.string(),
  requirements: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).allow(''),
  benefits: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).allow(''),
  isRemote: Joi.boolean(),
  isPublic: Joi.boolean(),
  status: Joi.string().valid('draft', 'open', 'closed', 'archived'),
  flowTemplateId: Joi.string().uuid().allow(null)
}).min(1);

/**
 * List all jobs
 */
export async function listJobs(req, res, next) {
  try {
    const organizationId = req.user.organization_id;
    const { workspaceId, status, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT j.*, 
             w.name as workspace_name,
             u.name as creator_name,
             COUNT(DISTINCT a.id) as application_count
      FROM jobs j
      LEFT JOIN workspaces w ON j.workspace_id = w.id
      LEFT JOIN users u ON j.created_by = u.id
      LEFT JOIN applications a ON j.id = a.job_id
      WHERE j.organization_id = $1 AND j.deleted_at IS NULL
    `;

    const values = [organizationId];
    let paramCount = 1;

    if (workspaceId) {
      paramCount++;
      query += ` AND j.workspace_id = $${paramCount}`;
      values.push(workspaceId);
    }

    if (status) {
      paramCount++;
      query += ` AND j.status = $${paramCount}`;
      values.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND (j.title ILIKE $${paramCount} OR j.department ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }

    query += ` GROUP BY j.id, w.name, u.name ORDER BY j.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    res.json({
      jobs: result.rows.map(j => ({
        id: j.id,
        title: j.title,
        department: j.department,
        location: j.location,
        employmentType: j.employment_type,
        status: j.status,
        isRemote: j.is_remote,
        isPublic: j.is_public,
        workspaceName: j.workspace_name,
        createdBy: j.creator_name,
        applicationCount: parseInt(j.application_count),
        createdAt: j.created_at
      })),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get job by ID
 */
export async function getJob(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const query = `
      SELECT j.*, 
             w.name as workspace_name,
             u.name as creator_name,
             COUNT(DISTINCT a.id) as application_count
      FROM jobs j
      LEFT JOIN workspaces w ON j.workspace_id = w.id
      LEFT JOIN users u ON j.created_by = u.id
      LEFT JOIN applications a ON j.id = a.job_id
      WHERE j.id = $1 AND j.organization_id = $2 AND j.deleted_at IS NULL
      GROUP BY j.id, w.name, u.name
    `;

    const result = await db.query(query, [id, organizationId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Job not found');
    }

    const job = result.rows[0];

    res.json({
      job: {
        id: job.id,
        workspaceId: job.workspace_id,
        workspaceName: job.workspace_name,
        title: job.title,
        department: job.department,
        location: job.location,
        employmentType: job.employment_type,
        experienceLevel: job.experience_level,
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        salaryCurrency: job.salary_currency,
        description: job.description,
        requirements: job.requirements,
        benefits: job.benefits,
        isRemote: job.is_remote,
        isPublic: job.is_public,
        status: job.status,
        createdBy: job.creator_name,
        applicationCount: parseInt(job.application_count),
        createdAt: job.created_at,
        updatedAt: job.updated_at
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get public job listing (no authentication required)
 */
export async function getPublicJob(req, res, next) {
  try {
    const { id } = req.params;

    const query = `
      SELECT j.id, j.title, j.department, j.location, j.employment_type,
             j.experience_level, j.salary_min, j.salary_max, j.salary_currency,
             j.description, j.requirements, j.benefits, j.is_remote,
             j.created_at, o.name as organization_name
      FROM jobs j
      JOIN organizations o ON j.organization_id = o.id
      WHERE j.id = $1 AND j.is_public = true AND j.status = 'open' AND j.deleted_at IS NULL
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Job not found or not available');
    }

    const job = result.rows[0];

    res.json({
      job: {
        id: job.id,
        title: job.title,
        department: job.department,
        location: job.location,
        employmentType: job.employment_type,
        experienceLevel: job.experience_level,
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        salaryCurrency: job.salary_currency,
        description: job.description,
        requirements: job.requirements,
        benefits: job.benefits,
        isRemote: job.is_remote,
        organizationName: job.organization_name,
        postedAt: job.created_at
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * List public jobs (no authentication required)
 */
export async function listPublicJobs(req, res, next) {
  try {
    const { search, location, employmentType, isRemote, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT j.id, j.title, j.department, j.location, j.employment_type,
             j.experience_level, j.is_remote, j.created_at,
             o.name as organization_name
      FROM jobs j
      JOIN organizations o ON j.organization_id = o.id
      WHERE j.is_public = true AND j.status = 'open' AND j.deleted_at IS NULL
    `;

    const values = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (j.title ILIKE $${paramCount} OR j.department ILIKE $${paramCount} OR j.description ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }

    if (location) {
      paramCount++;
      query += ` AND j.location ILIKE $${paramCount}`;
      values.push(`%${location}%`);
    }

    if (employmentType) {
      paramCount++;
      query += ` AND j.employment_type = $${paramCount}`;
      values.push(employmentType);
    }

    if (isRemote === 'true') {
      query += ` AND j.is_remote = true`;
    }

    query += ` ORDER BY j.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    res.json({
      jobs: result.rows.map(j => ({
        id: j.id,
        title: j.title,
        department: j.department,
        location: j.location,
        employmentType: j.employment_type,
        experienceLevel: j.experience_level,
        isRemote: j.is_remote,
        organizationName: j.organization_name,
        postedAt: j.created_at
      })),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Create job
 */
export async function createJob(req, res, next) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    // Only owner, admin, and recruiter can create jobs
    if (!['owner', 'admin', 'recruiter'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners, admins, and recruiters can create jobs');
    }

    // Validate input
    const { error, value } = createJobSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check license job limit
    const limitCheck = await checkJobLimit(organizationId);
    if (!limitCheck.canCreate) {
      return res.status(403).json({
        success: false,
        message: `Job limit reached. Your organization has reached the maximum of ${limitCheck.limit} jobs.`,
        current: limitCheck.current,
        limit: limitCheck.limit,
        tier: req.user.tier || 'starter',
        upgradeSuggestion: 'Please upgrade your plan to create more job postings.'
      });
    }

    // Verify workspace belongs to organization
    const workspaceCheck = await db.query(
      'SELECT id FROM workspaces WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [value.workspaceId, organizationId]
    );

    if (workspaceCheck.rows.length === 0) {
      throw new NotFoundError('Workspace not found');
    }

    const id = uuidv4();

    const query = `
      INSERT INTO jobs (
        id, organization_id, workspace_id, title, department, location,
        employment_type, experience_level, salary_min, salary_max, salary_currency,
        description, requirements, benefits, is_remote, is_public,
        status, flow_template_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id, title, status, created_at
    `;

    const result = await db.query(query, [
      id,
      organizationId,
      value.workspaceId,
      value.title,
      value.department || '',
      value.location || '',
      value.employmentType,
      value.experienceLevel || null,
      value.salaryMin || null,
      value.salaryMax || null,
      value.salaryCurrency,
      value.description,
      arrayToString(value.requirements),
      arrayToString(value.benefits),
      value.isRemote,
      value.isPublic,
      'draft',
      value.flowTemplateId,
      userId
    ]);

    const job = result.rows[0];

    logger.info(`Job created: ${job.title} by ${req.user.email}`);

    res.status(201).json({
      message: 'Job created successfully',
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        createdAt: job.created_at
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Update job
 */
export async function updateJob(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Only owner, admin, recruiter can update jobs
    if (!['owner', 'admin', 'recruiter'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners, admins, and recruiters can update jobs');
    }

    // Validate input
    const { error, value } = updateJobSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check job exists
    const jobCheck = await db.query(
      'SELECT id FROM jobs WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, organizationId]
    );

    if (jobCheck.rows.length === 0) {
      throw new NotFoundError('Job not found');
    }

    const updates = [];
    const values = [];
    let paramCount = 0;

    Object.keys(value).forEach(key => {
      paramCount++;
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updates.push(`${dbKey} = $${paramCount}`);
      values.push(value[key]);
    });

    if (updates.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    values.push(id, organizationId);

    // sql-injection-safe: Dynamic SET clause uses parameterized placeholders ($1, $2, etc.)
    // User input goes into values array, not directly into SQL string
    const query = `
      UPDATE jobs
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2} AND deleted_at IS NULL
      RETURNING id, title, department, location, employment_type, experience_level,
                salary_min, salary_max, salary_currency, description, requirements,
                benefits, is_remote, is_public, status, flow_template_id,
                created_at, updated_at
    `;

    console.log('[updateJob] Query:', query);
    console.log('[updateJob] Values:', values);

    const result = await db.query(query, values);

    const updatedJob = result.rows[0];

    logger.info(`Job updated: ${updatedJob?.title || 'Unknown'} by ${req.user.email}`);

    // Transform snake_case to camelCase for frontend
    res.json({
      message: 'Job updated successfully',
      job: {
        id: updatedJob.id,
        title: updatedJob.title,
        department: updatedJob.department,
        location: updatedJob.location,
        employmentType: updatedJob.employment_type,
        experienceLevel: updatedJob.experience_level,
        salaryMin: updatedJob.salary_min,
        salaryMax: updatedJob.salary_max,
        salaryCurrency: updatedJob.salary_currency,
        description: updatedJob.description,
        requirements: updatedJob.requirements,
        benefits: updatedJob.benefits,
        isRemote: updatedJob.is_remote,
        isPublic: updatedJob.is_public,
        status: updatedJob.status,
        flowTemplateId: updatedJob.flow_template_id,
        createdAt: updatedJob.created_at,
        updatedAt: updatedJob.updated_at
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Delete job
 */
export async function deleteJob(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Only owner, admin can delete jobs
    if (!['owner', 'admin'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners and admins can delete jobs');
    }

    const query = `
      UPDATE jobs
      SET deleted_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING title
    `;

    const result = await db.query(query, [id, organizationId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Job not found');
    }

    logger.info(`Job deleted: ${result.rows[0].title} by ${req.user.email}`);

    res.json({
      message: 'Job deleted successfully'
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Generate a URL-safe slug from job title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

/**
 * Generate a unique public slug for a job
 */
async function generateUniqueSlug(title, jobId = null) {
  let slug = generateSlug(title);
  let attempt = 0;
  
  while (attempt < 10) {
    const suffix = attempt > 0 ? `-${attempt}` : '';
    const testSlug = `${slug}${suffix}`;
    
    // Check if slug exists (excluding current job)
    const query = jobId
      ? 'SELECT id FROM jobs WHERE public_slug = $1 AND id != $2'
      : 'SELECT id FROM jobs WHERE public_slug = $1';
    
    const params = jobId ? [testSlug, jobId] : [testSlug];
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return testSlug;
    }
    
    attempt++;
  }
  
  // Fallback: append random string
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${slug}-${randomStr}`;
}

/**
 * Publish/unpublish job to public portal
 * PUT /api/jobs/:id/publish
 */
export async function publishJob(req, res, next) {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;
    const organizationId = req.user.organization_id;
    
    if (typeof isPublic !== 'boolean') {
      throw new ValidationError('isPublic must be a boolean');
    }
    
    // Get current job
    const jobResult = await db.query(
      'SELECT id, title, public_slug FROM jobs WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, organizationId]
    );
    
    if (jobResult.rows.length === 0) {
      throw new NotFoundError('Job not found');
    }
    
    const job = jobResult.rows[0];
    
    // Generate slug if publishing and doesn't have one
    let publicSlug = job.public_slug;
    if (isPublic && !publicSlug) {
      publicSlug = await generateUniqueSlug(job.title, id);
    }
    
    // Update job
    const updateResult = await db.query(`
      UPDATE jobs
      SET 
        is_public = $1,
        public_slug = $2,
        posted_at = CASE 
          WHEN $1 = true AND posted_at IS NULL THEN NOW() 
          ELSE posted_at 
        END,
        updated_at = NOW()
      WHERE id = $3 AND organization_id = $4
      RETURNING id, title, is_public, public_slug, posted_at
    `, [isPublic, publicSlug, id, organizationId]);
    
    const updatedJob = updateResult.rows[0];
    
    logger.info(`Job ${isPublic ? 'published' : 'unpublished'}: ${updatedJob.title} by ${req.user.email}`);
    
    res.json({
      message: `Job ${isPublic ? 'published' : 'unpublished'} successfully`,
      job: {
        id: updatedJob.id,
        title: updatedJob.title,
        isPublic: updatedJob.is_public,
        publicSlug: updatedJob.public_slug,
        publicUrl: updatedJob.public_slug ? `/apply/${updatedJob.public_slug}` : null,
        postedAt: updatedJob.posted_at
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * Update public portal settings for a job
 * PUT /api/jobs/:id/portal-settings
 */
export async function updatePortalSettings(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    const settingsSchema = Joi.object({
      companyName: Joi.string().max(255).allow(''),
      companyLogo: Joi.string().uri().max(500).allow(''),
      salaryPublic: Joi.boolean(),
      customFields: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        type: Joi.string().valid('text', 'textarea', 'select', 'checkbox', 'radio', 'file').required(),
        label: Joi.string().required(),
        required: Joi.boolean().default(false),
        options: Joi.array().items(Joi.string()),
        placeholder: Joi.string().allow(''),
        helpText: Joi.string().allow('')
      }))
    });
    
    const { error, value } = settingsSchema.validate(req.body);
    
    if (error) {
      throw new ValidationError(error.details[0].message);
    }
    
    // Verify job exists and belongs to organization
    const jobResult = await db.query(
      'SELECT id, title, public_portal_settings FROM jobs WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, organizationId]
    );
    
    if (jobResult.rows.length === 0) {
      throw new NotFoundError('Job not found');
    }
    
    const currentSettings = jobResult.rows[0].public_portal_settings || {};
    const newSettings = { ...currentSettings, ...value };
    
    // Update settings
    await db.query(`
      UPDATE jobs
      SET 
        public_portal_settings = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(newSettings), id]);
    
    logger.info(`Portal settings updated for job: ${jobResult.rows[0].title} by ${req.user.email}`);
    
    res.json({
      message: 'Portal settings updated successfully',
      settings: newSettings
    });
    
  } catch (error) {
    next(error);
  }
}
