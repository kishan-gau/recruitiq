import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

// Validation schemas
const createApplicationSchema = Joi.object({
  jobId: Joi.string().uuid().required(),
  candidateId: Joi.string().uuid(),
  // For new candidates applying via career portal
  firstName: Joi.string().min(1).max(100).when('candidateId', { is: Joi.exist(), then: Joi.forbidden() }),
  lastName: Joi.string().min(1).max(100).when('candidateId', { is: Joi.exist(), then: Joi.forbidden() }),
  email: Joi.string().email().when('candidateId', { is: Joi.exist(), then: Joi.forbidden() }),
  phone: Joi.string().max(20).allow(null, ''),
  location: Joi.string().max(200).allow(null, ''),
  linkedinUrl: Joi.string().uri().allow(null, ''),
  portfolioUrl: Joi.string().uri().allow(null, ''),
  resumeUrl: Joi.string().uri().allow(null, ''),
  coverLetter: Joi.string().allow(null, ''),
  source: Joi.string().valid('referral', 'linkedin', 'job_board', 'career_page', 'agency', 'direct', 'other').default('career_page')
});

const updateApplicationSchema = Joi.object({
  status: Joi.string().valid('active', 'rejected', 'withdrawn', 'hired'),
  stage: Joi.string().valid('applied', 'screening', 'phone_screen', 'assessment', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'),
  currentStage: Joi.number().integer().min(1),
  notes: Joi.string().allow(null, ''),
  rejectionReason: Joi.string().allow(null, '')
}).min(1);

/**
 * List applications with filtering
 * GET /api/applications
 */
export async function listApplications(req, res, next) {
  try {
    const { jobId, candidateId, workspaceId, status, search, limit = 50, offset = 0 } = req.query;
    const { organization_id } = req.user;

    let query = `
      SELECT 
        a.*,
        c.first_name as candidate_first_name,
        c.last_name as candidate_last_name,
        c.email as candidate_email,
        c.phone as candidate_phone,
        c.current_job_title as candidate_job_title,
        j.title as job_title,
        j.department as job_department,
        j.workspace_id,
        w.name as workspace_name
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      JOIN jobs j ON a.job_id = j.id
      JOIN workspaces w ON j.workspace_id = w.id
      WHERE j.organization_id = $1 AND a.deleted_at IS NULL
    `;
    const params = [organization_id];
    let paramIndex = 2;

    // Job filter
    if (jobId) {
      query += ` AND a.job_id = $${paramIndex}`;
      params.push(jobId);
      paramIndex++;
    }

    // Candidate filter
    if (candidateId) {
      query += ` AND a.candidate_id = $${paramIndex}`;
      params.push(candidateId);
      paramIndex++;
    }

    // Workspace filter
    if (workspaceId) {
      query += ` AND j.workspace_id = $${paramIndex}`;
      params.push(workspaceId);
      paramIndex++;
    }

    // Status filter
    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Search filter
    if (search) {
      query += ` AND (
        c.first_name ILIKE $${paramIndex} OR 
        c.last_name ILIKE $${paramIndex} OR 
        c.email ILIKE $${paramIndex} OR
        j.title ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT a.id) as total
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      JOIN jobs j ON a.job_id = j.id
      WHERE j.organization_id = $1 AND a.deleted_at IS NULL
    `;
    const countParams = [organization_id];
    let countParamIndex = 2;

    if (jobId) {
      countQuery += ` AND a.job_id = $${countParamIndex}`;
      countParams.push(jobId);
      countParamIndex++;
    }

    if (candidateId) {
      countQuery += ` AND a.candidate_id = $${countParamIndex}`;
      countParams.push(candidateId);
      countParamIndex++;
    }

    if (workspaceId) {
      countQuery += ` AND j.workspace_id = $${countParamIndex}`;
      countParams.push(workspaceId);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND a.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (
        c.first_name ILIKE $${countParamIndex} OR 
        c.last_name ILIKE $${countParamIndex} OR 
        c.email ILIKE $${countParamIndex} OR
        j.title ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      applications: result.rows.map(row => ({
        id: row.id,
        jobId: row.job_id,
        jobTitle: row.job_title,
        jobDepartment: row.job_department,
        workspaceId: row.workspace_id,
        workspaceName: row.workspace_name,
        candidateId: row.candidate_id,
        candidateFirstName: row.candidate_first_name,
        candidateLastName: row.candidate_last_name,
        candidateEmail: row.candidate_email,
        candidatePhone: row.candidate_phone,
        candidateJobTitle: row.candidate_job_title,
        status: row.status,
        currentStage: row.current_stage,
        coverLetter: row.cover_letter,
        trackingCode: row.tracking_code,
        appliedAt: row.created_at,
        updatedAt: row.updated_at
      })),
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single application details
 * GET /api/applications/:id
 */
export async function getApplication(req, res, next) {
  try {
    const { id } = req.params;
    const { organization_id } = req.user;

    const result = await db.query(
      `SELECT 
        a.*,
        c.first_name as candidate_first_name,
        c.last_name as candidate_last_name,
        c.email as candidate_email,
        c.phone as candidate_phone,
        c.location as candidate_location,
        c.current_job_title as candidate_job_title,
        c.current_company as candidate_company,
        c.linkedin_url as candidate_linkedin,
        c.portfolio_url as candidate_portfolio,
        c.resume_url as candidate_resume,
        c.skills as candidate_skills,
        c.experience as candidate_experience,
        c.education as candidate_education,
        j.title as job_title,
        j.department as job_department,
        j.location as job_location,
        j.employment_type as job_employment_type,
        w.name as workspace_name
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      JOIN jobs j ON a.job_id = j.id
      JOIN workspaces w ON j.workspace_id = w.id
      WHERE a.id = $1 AND j.organization_id = $2 AND a.deleted_at IS NULL`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Application not found');
    }

    const row = result.rows[0];

    res.json({
      application: {
        id: row.id,
        jobId: row.job_id,
        jobTitle: row.job_title,
        jobDepartment: row.job_department,
        jobLocation: row.job_location,
        jobEmploymentType: row.job_employment_type,
        workspaceName: row.workspace_name,
        candidateId: row.candidate_id,
        candidate: {
          firstName: row.candidate_first_name,
          lastName: row.candidate_last_name,
          email: row.candidate_email,
          phone: row.candidate_phone,
          location: row.candidate_location,
          currentJobTitle: row.candidate_job_title,
          currentCompany: row.candidate_company,
          linkedinUrl: row.candidate_linkedin,
          portfolioUrl: row.candidate_portfolio,
          resumeUrl: row.candidate_resume,
          skills: row.candidate_skills,
          experience: row.candidate_experience,
          education: row.candidate_education
        },
        status: row.status,
        currentStage: row.current_stage,
        coverLetter: row.cover_letter,
        notes: row.notes,
        rejectionReason: row.rejection_reason,
        trackingCode: row.tracking_code,
        appliedAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new application
 * POST /api/applications
 */
export async function createApplication(req, res, next) {
  try {
    // Validate request body
    const { error, value } = createApplicationSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if job exists and is open
    const jobResult = await db.query(
      `SELECT j.*, w.id as workspace_id, o.id as organization_id 
       FROM jobs j
       JOIN workspaces w ON j.workspace_id = w.id
       JOIN organizations o ON w.organization_id = o.id
       WHERE j.id = $1 AND j.status = 'open' AND j.deleted_at IS NULL`,
      [value.jobId]
    );

    if (jobResult.rows.length === 0) {
      throw new NotFoundError('Job not found or not accepting applications');
    }

    const job = jobResult.rows[0];
    let candidateId = value.candidateId;

    // If candidateId not provided, create new candidate
    if (!candidateId) {
      if (!value.firstName || !value.lastName || !value.email) {
        throw new ValidationError('First name, last name, and email are required for new candidates');
      }

      // Check if candidate already exists
      const existingCandidate = await db.query(
        'SELECT id FROM candidates WHERE email = $1 AND organization_id = $2 AND deleted_at IS NULL',
        [value.email, job.organization_id]
      );

      if (existingCandidate.rows.length > 0) {
        candidateId = existingCandidate.rows[0].id;
      } else {
        // Create new candidate
        candidateId = uuidv4();
        await db.query(
          `INSERT INTO candidates (
            id, organization_id, first_name, last_name, email, phone, location,
            linkedin_url, portfolio_url, resume_url, source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            candidateId,
            job.organization_id,
            value.firstName,
            value.lastName,
            value.email,
            value.phone || null,
            value.location || null,
            value.linkedinUrl || null,
            value.portfolioUrl || null,
            value.resumeUrl || null,
            value.source
          ]
        );
        logger.info(`New candidate created via application: ${value.email}`);
      }
    } else {
      // Verify candidate exists and belongs to same organization
      const candidateCheck = await db.query(
        'SELECT id FROM candidates WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
        [candidateId, job.organization_id]
      );

      if (candidateCheck.rows.length === 0) {
        throw new NotFoundError('Candidate not found');
      }
    }

    // Check if application already exists
    const existingApplication = await db.query(
      'SELECT id FROM applications WHERE job_id = $1 AND candidate_id = $2 AND deleted_at IS NULL',
      [value.jobId, candidateId]
    );

    if (existingApplication.rows.length > 0) {
      throw new ValidationError('Candidate has already applied to this job');
    }

    const applicationId = uuidv4();
    const trackingCode = `APP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const result = await db.query(
      `INSERT INTO applications (
        id, organization_id, workspace_id, job_id, candidate_id, status, current_stage, stage, cover_letter, tracking_code
      ) VALUES ($1, $2, $3, $4, $5, 'active', 'applied', 'applied', $6, $7)
      RETURNING *`,
      [applicationId, job.organization_id, job.workspace_id, value.jobId, candidateId, value.coverLetter || null, trackingCode]
    );

    const application = result.rows[0];

    logger.info(`Application created: ${trackingCode} for job ${value.jobId}`);

    res.status(201).json({
      message: 'Application submitted successfully',
      application: {
        id: application.id,
        jobId: application.job_id,
        candidateId: application.candidate_id,
        status: application.status,
        currentStage: application.current_stage,
        trackingCode: application.tracking_code,
        appliedAt: application.created_at
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update application status/stage
 * PUT /api/applications/:id
 */
export async function updateApplication(req, res, next) {
  try {
    const { id } = req.params;
    const { organization_id, email: userEmail, role } = req.user;

    // Only recruiters, admins, and owners can update applications
    if (!['owner', 'admin', 'recruiter'].includes(role)) {
      throw new ForbiddenError('Only recruiters, admins, and owners can update applications');
    }

    // Validate request body
    const { error, value } = updateApplicationSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if application exists and belongs to organization
    const applicationCheck = await db.query(
      `SELECT a.id FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN workspaces w ON j.workspace_id = w.id
       WHERE a.id = $1 AND w.organization_id = $2 AND a.deleted_at IS NULL`,
      [id, organization_id]
    );

    if (applicationCheck.rows.length === 0) {
      throw new NotFoundError('Application not found');
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (value.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(value.status);
      paramIndex++;
    }

    if (value.currentStage !== undefined) {
      updates.push(`current_stage = $${paramIndex}`);
      params.push(value.currentStage);
      paramIndex++;
    }

    if (value.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(value.notes);
      paramIndex++;
    }

    if (value.rejectionReason !== undefined) {
      updates.push(`rejection_reason = $${paramIndex}`);
      params.push(value.rejectionReason);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    // sql-injection-safe: Dynamic SET clause uses parameterized placeholders ($1, $2, etc.)
    // User input goes into params array, not directly into SQL string
    const query = `
      UPDATE applications 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, params);
    const application = result.rows[0];

    logger.info(`Application updated: ${application.tracking_code} by ${userEmail}`);

    res.json({
      message: 'Application updated successfully',
      application: {
        id: application.id,
        jobId: application.job_id,
        candidateId: application.candidate_id,
        status: application.status,
        currentStage: application.current_stage,
        notes: application.notes,
        rejectionReason: application.rejection_reason,
        trackingCode: application.tracking_code,
        updatedAt: application.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get application by tracking code (public)
 * GET /api/applications/track/:trackingCode
 */
export async function trackApplication(req, res, next) {
  try {
    const { trackingCode } = req.params;

    const result = await db.query(
      `SELECT 
        a.id,
        a.status,
        a.current_stage,
        a.tracking_code,
        a.created_at,
        a.updated_at,
        j.title as job_title,
        j.department as job_department,
        o.name as company_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN workspaces w ON j.workspace_id = w.id
      JOIN organizations o ON w.organization_id = o.id
      WHERE a.tracking_code = $1 AND a.deleted_at IS NULL`,
      [trackingCode]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Application not found');
    }

    const row = result.rows[0];

    res.json({
      application: {
        trackingCode: row.tracking_code,
        jobTitle: row.job_title,
        jobDepartment: row.job_department,
        companyName: row.company_name,
        status: row.status,
        currentStage: row.current_stage,
        appliedAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete application (soft delete)
 * DELETE /api/applications/:id
 */
export async function deleteApplication(req, res, next) {
  try {
    const { id } = req.params;
    const { organization_id, email: userEmail, role } = req.user;

    // Only admins and owners can delete applications
    if (!['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only admins and owners can delete applications');
    }

    // Check if application exists and belongs to organization
    const applicationCheck = await db.query(
      `SELECT a.tracking_code FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN workspaces w ON j.workspace_id = w.id
       WHERE a.id = $1 AND w.organization_id = $2 AND a.deleted_at IS NULL`,
      [id, organization_id]
    );

    if (applicationCheck.rows.length === 0) {
      throw new NotFoundError('Application not found');
    }

    // Soft delete
    await db.query(
      'UPDATE applications SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    logger.info(`Application deleted: ${applicationCheck.rows[0].tracking_code} by ${userEmail}`);

    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    next(error);
  }
}
