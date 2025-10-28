import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

// Validation schemas
const createCandidateSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(20).allow(null, ''),
  location: Joi.string().max(200).allow(null, ''),
  currentJobTitle: Joi.string().max(200).allow(null, ''),
  currentCompany: Joi.string().max(200).allow(null, ''),
  linkedinUrl: Joi.string().uri().allow(null, ''),
  portfolioUrl: Joi.string().uri().allow(null, ''),
  resumeUrl: Joi.string().uri().allow(null, ''),
  skills: Joi.array().items(Joi.string()).default([]),
  experience: Joi.string().allow(null, ''),
  education: Joi.string().allow(null, ''),
  source: Joi.string().valid('referral', 'linkedin', 'job_board', 'career_page', 'agency', 'direct', 'other').default('direct'),
  sourceDetails: Joi.string().max(500).allow(null, ''),
  notes: Joi.string().allow(null, ''),
  tags: Joi.array().items(Joi.string()).default([])
});

const updateCandidateSchema = Joi.object({
  firstName: Joi.string().min(1).max(100),
  lastName: Joi.string().min(1).max(100),
  email: Joi.string().email(),
  phone: Joi.string().max(20).allow(null, ''),
  location: Joi.string().max(200).allow(null, ''),
  currentJobTitle: Joi.string().max(200).allow(null, ''),
  currentCompany: Joi.string().max(200).allow(null, ''),
  linkedinUrl: Joi.string().uri().allow(null, ''),
  portfolioUrl: Joi.string().uri().allow(null, ''),
  resumeUrl: Joi.string().uri().allow(null, ''),
  skills: Joi.array().items(Joi.string()),
  experience: Joi.string().allow(null, ''),
  education: Joi.string().allow(null, ''),
  source: Joi.string().valid('referral', 'linkedin', 'job_board', 'career_page', 'agency', 'direct', 'other'),
  sourceDetails: Joi.string().max(500).allow(null, ''),
  notes: Joi.string().allow(null, ''),
  tags: Joi.array().items(Joi.string())
}).min(1);

/**
 * List all candidates for the organization
 * GET /api/candidates
 */
export async function listCandidates(req, res, next) {
  try {
    const { search, source, tags, limit = 50, offset = 0 } = req.query;
    const { organization_id } = req.user;

    let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT a.id) as application_count,
        MAX(a.created_at) as last_application_date
      FROM candidates c
      LEFT JOIN applications a ON c.id = a.candidate_id AND a.deleted_at IS NULL
      WHERE c.organization_id = $1 AND c.deleted_at IS NULL
    `;
    const params = [organization_id];
    let paramIndex = 2;

    // Search filter
    if (search) {
      query += ` AND (
        c.first_name ILIKE $${paramIndex} OR 
        c.last_name ILIKE $${paramIndex} OR 
        c.email ILIKE $${paramIndex} OR
        c.current_job_title ILIKE $${paramIndex} OR
        c.current_company ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Source filter
    if (source) {
      query += ` AND c.source = $${paramIndex}`;
      params.push(source);
      paramIndex++;
    }

    // Tags filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query += ` AND c.tags && $${paramIndex}`;
      params.push(tagArray);
      paramIndex++;
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM candidates c
      WHERE c.organization_id = $1 AND c.deleted_at IS NULL
    `;
    const countParams = [organization_id];
    let countParamIndex = 2;

    if (search) {
      countQuery += ` AND (
        c.first_name ILIKE $${countParamIndex} OR 
        c.last_name ILIKE $${countParamIndex} OR 
        c.email ILIKE $${countParamIndex} OR
        c.current_job_title ILIKE $${countParamIndex} OR
        c.current_company ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    if (source) {
      countQuery += ` AND c.source = $${countParamIndex}`;
      countParams.push(source);
      countParamIndex++;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      countQuery += ` AND c.tags && $${countParamIndex}`;
      countParams.push(tagArray);
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      candidates: result.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        location: row.location,
        currentJobTitle: row.current_job_title,
        currentCompany: row.current_company,
        linkedinUrl: row.linkedin_url,
        portfolioUrl: row.portfolio_url,
        resumeUrl: row.resume_url,
        skills: row.skills,
        source: row.source,
        sourceDetails: row.source_details,
        tags: row.tags,
        applicationCount: parseInt(row.application_count),
        lastApplicationDate: row.last_application_date,
        createdAt: row.created_at,
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
 * Get a single candidate by ID
 * GET /api/candidates/:id
 */
export async function getCandidate(req, res, next) {
  try {
    const { id } = req.params;
    const { organization_id } = req.user;

    const result = await db.query(
      `SELECT 
        c.*,
        COUNT(DISTINCT a.id) as application_count
      FROM candidates c
      LEFT JOIN applications a ON c.id = a.candidate_id AND a.deleted_at IS NULL
      WHERE c.id = $1 AND c.organization_id = $2 AND c.deleted_at IS NULL
      GROUP BY c.id`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Candidate not found');
    }

    const row = result.rows[0];

    res.json({
      candidate: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        location: row.location,
        currentJobTitle: row.current_job_title,
        currentCompany: row.current_company,
        linkedinUrl: row.linkedin_url,
        portfolioUrl: row.portfolio_url,
        resumeUrl: row.resume_url,
        skills: row.skills,
        experience: row.experience,
        education: row.education,
        source: row.source,
        sourceDetails: row.source_details,
        notes: row.notes,
        tags: row.tags,
        applicationCount: parseInt(row.application_count),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get candidate applications
 * GET /api/candidates/:id/applications
 */
export async function getCandidateApplications(req, res, next) {
  try {
    const { id } = req.params;
    const { organization_id } = req.user;

    // Verify candidate belongs to organization
    const candidateCheck = await db.query(
      'SELECT id FROM candidates WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, organization_id]
    );

    if (candidateCheck.rows.length === 0) {
      throw new NotFoundError('Candidate not found');
    }

    const result = await db.query(
      `SELECT 
        a.*,
        j.title as job_title,
        j.department as job_department,
        w.name as workspace_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN workspaces w ON j.workspace_id = w.id
      WHERE a.candidate_id = $1 AND a.deleted_at IS NULL
      ORDER BY a.created_at DESC`,
      [id]
    );

    res.json({
      applications: result.rows.map(row => ({
        id: row.id,
        jobId: row.job_id,
        jobTitle: row.job_title,
        jobDepartment: row.job_department,
        workspaceName: row.workspace_name,
        status: row.status,
        currentStage: row.current_stage,
        appliedAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new candidate
 * POST /api/candidates
 */
export async function createCandidate(req, res, next) {
  try {
    const { organization_id, email: userEmail, role } = req.user;

    // Only recruiters, admins, and owners can create candidates
    if (!['owner', 'admin', 'recruiter'].includes(role)) {
      throw new ForbiddenError('Only recruiters, admins, and owners can create candidates');
    }

    // Validate request body
    const { error, value } = createCandidateSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if candidate with same email already exists in organization
    const existingCandidate = await db.query(
      'SELECT id FROM candidates WHERE email = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [value.email, organization_id]
    );

    if (existingCandidate.rows.length > 0) {
      throw new ValidationError('A candidate with this email already exists');
    }

    const candidateId = uuidv4();

    const result = await db.query(
      `INSERT INTO candidates (
        id, organization_id, first_name, last_name, email, phone, location,
        current_job_title, current_company, linkedin_url, portfolio_url, resume_url,
        skills, experience, education, source, source_details, notes, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        candidateId,
        organization_id,
        value.firstName,
        value.lastName,
        value.email,
        value.phone || null,
        value.location || null,
        value.currentJobTitle || null,
        value.currentCompany || null,
        value.linkedinUrl || null,
        value.portfolioUrl || null,
        value.resumeUrl || null,
        value.skills || [],
        value.experience || null,
        value.education || null,
        value.source,
        value.sourceDetails || null,
        value.notes || null,
        value.tags || []
      ]
    );

    const candidate = result.rows[0];

    logger.info(`Candidate created: ${candidate.email} by ${userEmail}`);

    res.status(201).json({
      message: 'Candidate created successfully',
      candidate: {
        id: candidate.id,
        firstName: candidate.first_name,
        lastName: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        currentJobTitle: candidate.current_job_title,
        currentCompany: candidate.current_company,
        linkedinUrl: candidate.linkedin_url,
        portfolioUrl: candidate.portfolio_url,
        resumeUrl: candidate.resume_url,
        skills: candidate.skills,
        experience: candidate.experience,
        education: candidate.education,
        source: candidate.source,
        sourceDetails: candidate.source_details,
        notes: candidate.notes,
        tags: candidate.tags,
        createdAt: candidate.created_at
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update candidate information
 * PUT /api/candidates/:id
 */
export async function updateCandidate(req, res, next) {
  try {
    const { id } = req.params;
    const { organization_id, email: userEmail, role } = req.user;

    // Only recruiters, admins, and owners can update candidates
    if (!['owner', 'admin', 'recruiter'].includes(role)) {
      throw new ForbiddenError('Only recruiters, admins, and owners can update candidates');
    }

    // Validate request body
    const { error, value } = updateCandidateSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if candidate exists and belongs to organization
    const candidateCheck = await db.query(
      'SELECT id FROM candidates WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, organization_id]
    );

    if (candidateCheck.rows.length === 0) {
      throw new NotFoundError('Candidate not found');
    }

    // If email is being changed, check for duplicates
    if (value.email) {
      const emailCheck = await db.query(
        'SELECT id FROM candidates WHERE email = $1 AND organization_id = $2 AND id != $3 AND deleted_at IS NULL',
        [value.email, organization_id, id]
      );

      if (emailCheck.rows.length > 0) {
        throw new ValidationError('A candidate with this email already exists');
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      phone: 'phone',
      location: 'location',
      currentJobTitle: 'current_job_title',
      currentCompany: 'current_company',
      linkedinUrl: 'linkedin_url',
      portfolioUrl: 'portfolio_url',
      resumeUrl: 'resume_url',
      skills: 'skills',
      experience: 'experience',
      education: 'education',
      source: 'source',
      sourceDetails: 'source_details',
      notes: 'notes',
      tags: 'tags'
    };

    Object.keys(value).forEach(key => {
      if (fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${paramIndex}`);
        params.push(value[key]);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id, organization_id);

    // sql-injection-safe: Dynamic SET clause uses parameterized placeholders ($1, $2, etc.)
    // User input goes into params array, not directly into SQL string
    const query = `
      UPDATE candidates 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, params);
    const candidate = result.rows[0];

    logger.info(`Candidate updated: ${candidate.email} by ${userEmail}`);

    res.json({
      message: 'Candidate updated successfully',
      candidate: {
        id: candidate.id,
        firstName: candidate.first_name,
        lastName: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        currentJobTitle: candidate.current_job_title,
        currentCompany: candidate.current_company,
        linkedinUrl: candidate.linkedin_url,
        portfolioUrl: candidate.portfolio_url,
        resumeUrl: candidate.resume_url,
        skills: candidate.skills,
        experience: candidate.experience,
        education: candidate.education,
        source: candidate.source,
        sourceDetails: candidate.source_details,
        notes: candidate.notes,
        tags: candidate.tags,
        updatedAt: candidate.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a candidate (soft delete)
 * DELETE /api/candidates/:id
 */
export async function deleteCandidate(req, res, next) {
  try {
    const { id } = req.params;
    const { organization_id, email: userEmail, role } = req.user;

    // Only admins and owners can delete candidates
    if (!['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only admins and owners can delete candidates');
    }

    // Check if candidate exists and belongs to organization
    const candidateCheck = await db.query(
      'SELECT email FROM candidates WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, organization_id]
    );

    if (candidateCheck.rows.length === 0) {
      throw new NotFoundError('Candidate not found');
    }

    // Soft delete
    await db.query(
      'UPDATE candidates SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    logger.info(`Candidate deleted: ${candidateCheck.rows[0].email} by ${userEmail}`);

    res.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    next(error);
  }
}
