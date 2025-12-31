import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import { futureDate } from '../validators/dateValidators.js';

// Validation schemas
const scheduleInterviewSchema = Joi.object({
  applicationId: Joi.string().uuid().required(),
  title: Joi.string().min(1).max(200).required(),
  type: Joi.string().valid('phone', 'video', 'onsite', 'technical', 'behavioral', 'panel').required(),
  scheduledAt: futureDate.required(),
  duration: Joi.number().integer().min(15).max(480).default(60), // minutes
  location: Joi.string().max(500).allow(null, ''),
  meetingLink: Joi.string().uri().allow(null, ''),
  interviewerIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  notes: Joi.string().allow(null, '')
});

const updateInterviewSchema = Joi.object({
  type: Joi.string().valid('phone', 'video', 'onsite', 'technical', 'behavioral', 'panel'),
  scheduledAt: futureDate.optional(),
  duration: Joi.number().integer().min(15).max(480),
  location: Joi.string().max(500).allow(null, ''),
  meetingLink: Joi.string().uri().allow(null, ''),
  status: Joi.string().valid('scheduled', 'completed', 'cancelled', 'no_show'),
  interviewerIds: Joi.array().items(Joi.string().uuid()),
  notes: Joi.string().allow(null, '')
}).min(1);

const submitFeedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  feedback: Joi.string().required(),
  recommendation: Joi.string().valid('strong_yes', 'yes', 'maybe', 'no', 'strong_no').required(),
  strengths: Joi.string().allow(null, ''),
  weaknesses: Joi.string().allow(null, ''),
  technicalSkills: Joi.object().pattern(Joi.string(), Joi.number().min(1).max(5)).allow(null),
  cultureFit: Joi.number().integer().min(1).max(5).allow(null)
});

/**
 * List interviews
 * GET /api/interviews
 */
export async function listInterviews(req, res, next) {
  try {
    const { applicationId, status, upcoming, limit = 50, offset = 0 } = req.query;
    const { organization_id, id: userId } = req.user;

    let query = `
      SELECT 
        i.*,
        a.tracking_code as application_tracking_code,
        c.first_name as candidate_first_name,
        c.last_name as candidate_last_name,
        c.email as candidate_email,
        j.title as job_title,
        j.department as job_department,
        w.name as workspace_name,
        ARRAY_AGG(DISTINCT u.id) as interviewer_ids,
        ARRAY_AGG(DISTINCT u.name) as interviewer_names
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN candidates c ON a.candidate_id = c.id
      JOIN jobs j ON a.job_id = j.id
      JOIN workspaces w ON j.workspace_id = w.id
      LEFT JOIN interview_interviewers ii ON i.id = ii.interview_id
      LEFT JOIN users u ON ii.user_id = u.id
      WHERE w.organization_id = $1 AND i.deleted_at IS NULL
    `;
    const params = [organization_id];
    let paramIndex = 2;

    // Application filter
    if (applicationId) {
      query += ` AND i.application_id = $${paramIndex}`;
      params.push(applicationId);
      paramIndex++;
    }

    // Status filter
    if (status) {
      query += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Upcoming filter (future interviews only)
    if (upcoming === 'true') {
      query += ` AND i.scheduled_at > CURRENT_TIMESTAMP AND i.status = 'scheduled'`;
    }

    query += ` GROUP BY i.id, a.tracking_code, c.first_name, c.last_name, c.email, j.title, j.department, w.name`;
    query += ` ORDER BY i.scheduled_at ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT i.id) as total
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN workspaces w ON j.workspace_id = w.id
      WHERE w.organization_id = $1 AND i.deleted_at IS NULL
    `;
    const countParams = [organization_id];
    let countParamIndex = 2;

    if (applicationId) {
      countQuery += ` AND i.application_id = $${countParamIndex}`;
      countParams.push(applicationId);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND i.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (upcoming === 'true') {
      countQuery += ` AND i.scheduled_at > CURRENT_TIMESTAMP AND i.status = 'scheduled'`;
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      interviews: result.rows.map(row => ({
        id: row.id,
        applicationId: row.application_id,
        applicationTrackingCode: row.application_tracking_code,
        candidateFirstName: row.candidate_first_name,
        candidateLastName: row.candidate_last_name,
        candidateEmail: row.candidate_email,
        jobTitle: row.job_title,
        jobDepartment: row.job_department,
        workspaceName: row.workspace_name,
        type: row.type,
        scheduledAt: row.scheduled_at,
        duration: row.duration,
        location: row.location,
        meetingLink: row.meeting_link,
        status: row.status,
        interviewerIds: row.interviewer_ids.filter(id => id !== null),
        interviewerNames: row.interviewer_names.filter(name => name !== null),
        createdAt: row.created_at
      })),
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (_error) {
    next(error);
  }
}

/**
 * Get interview details
 * GET /api/interviews/:id
 */
export async function getInterview(req, res, next) {
  try {
    const { id } = req.params;
    const { organization_id } = req.user;

    const result = await db.query(
      `SELECT 
        i.*,
        a.tracking_code as application_tracking_code,
        c.first_name as candidate_first_name,
        c.last_name as candidate_last_name,
        c.email as candidate_email,
        c.phone as candidate_phone,
        j.title as job_title,
        j.department as job_department,
        w.name as workspace_name
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN candidates c ON a.candidate_id = c.id
      JOIN jobs j ON a.job_id = j.id
      JOIN workspaces w ON j.workspace_id = w.id
      WHERE i.id = $1 AND w.organization_id = $2 AND i.deleted_at IS NULL`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Interview not found');
    }

    // Get interviewers
    const interviewersResult = await db.query(
      `SELECT u.id, u.name, u.email, ii.feedback, ii.rating, ii.recommendation
       FROM interview_interviewers ii
       JOIN users u ON ii.user_id = u.id
       WHERE ii.interview_id = $1`,
      [id]
    );

    const row = result.rows[0];

    res.json({
      interview: {
        id: row.id,
        applicationId: row.application_id,
        applicationTrackingCode: row.application_tracking_code,
        candidate: {
          firstName: row.candidate_first_name,
          lastName: row.candidate_last_name,
          email: row.candidate_email,
          phone: row.candidate_phone
        },
        jobTitle: row.job_title,
        jobDepartment: row.job_department,
        workspaceName: row.workspace_name,
        type: row.type,
        scheduledAt: row.scheduled_at,
        duration: row.duration,
        location: row.location,
        meetingLink: row.meeting_link,
        status: row.status,
        notes: row.notes,
        interviewers: interviewersResult.rows.map(interviewer => ({
          id: interviewer.id,
          name: interviewer.name,
          email: interviewer.email,
          feedback: interviewer.feedback,
          rating: interviewer.rating,
          recommendation: interviewer.recommendation
        })),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (_error) {
    next(error);
  }
}

/**
 * Schedule a new interview
 * POST /api/interviews
 */
export async function scheduleInterview(req, res, next) {
  try {
    const { organization_id, email: userEmail, role } = req.user;

    // Only recruiters, admins, and owners can schedule interviews
    if (!['owner', 'admin', 'recruiter'].includes(role)) {
      throw new ForbiddenError('Only recruiters, admins, and owners can schedule interviews');
    }

    // Validate request body
    const { error, value } = scheduleInterviewSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Verify application exists and belongs to organization
    const applicationCheck = await db.query(
      `SELECT a.id, a.organization_id, a.workspace_id FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN workspaces w ON j.workspace_id = w.id
       WHERE a.id = $1 AND w.organization_id = $2 AND a.deleted_at IS NULL`,
      [value.applicationId, organization_id]
    );

    if (applicationCheck.rows.length === 0) {
      throw new NotFoundError('Application not found');
    }

    const application = applicationCheck.rows[0];

    // Verify all interviewers exist and belong to organization
    const interviewersCheck = await db.query(
      `SELECT id FROM users WHERE id = ANY($1) AND organization_id = $2 AND deleted_at IS NULL`,
      [value.interviewerIds, organization_id]
    );

    if (interviewersCheck.rows.length !== value.interviewerIds.length) {
      throw new ValidationError('One or more interviewers not found');
    }

    const interviewId = uuidv4();

    // Create interview
    const result = await db.query(
      `INSERT INTO interviews (
        id, organization_id, workspace_id, application_id, title, type, scheduled_at, duration, location, meeting_link, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled', $11)
      RETURNING *`,
      [
        interviewId,
        application.organization_id,
        application.workspace_id,
        value.applicationId,
        value.title,
        value.type,
        value.scheduledAt,
        value.duration,
        value.location || null,
        value.meetingLink || null,
        value.notes || null
      ]
    );

    // Add interviewers
    const interviewerPromises = value.interviewerIds.map(interviewerId =>
      db.query(
        'INSERT INTO interview_interviewers (interview_id, user_id) VALUES ($1, $2)',
        [interviewId, interviewerId]
      )
    );
    await Promise.all(interviewerPromises);

    const interview = result.rows[0];

    logger.info(`Interview scheduled: ${interviewId} for application ${value.applicationId} by ${userEmail}`);

    res.status(201).json({
      message: 'Interview scheduled successfully',
      interview: {
        id: interview.id,
        applicationId: interview.application_id,
        type: interview.type,
        scheduledAt: interview.scheduled_at,
        duration: interview.duration,
        location: interview.location,
        meetingLink: interview.meeting_link,
        status: interview.status,
        interviewerIds: value.interviewerIds,
        createdAt: interview.created_at
      }
    });
  } catch (_error) {
    next(error);
  }
}

/**
 * Update interview
 * PUT /api/interviews/:id
 */
export async function updateInterview(req, res, next) {
  try {
    const { id } = req.params;
    const { organization_id, email: userEmail, role } = req.user;

    // Only recruiters, admins, and owners can update interviews
    if (!['owner', 'admin', 'recruiter'].includes(role)) {
      throw new ForbiddenError('Only recruiters, admins, and owners can update interviews');
    }

    // Validate request body
    const { error, value } = updateInterviewSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if interview exists and belongs to organization
    const interviewCheck = await db.query(
      `SELECT i.id FROM interviews i
       JOIN applications a ON i.application_id = a.id
       JOIN jobs j ON a.job_id = j.id
       JOIN workspaces w ON j.workspace_id = w.id
       WHERE i.id = $1 AND w.organization_id = $2 AND i.deleted_at IS NULL`,
      [id, organization_id]
    );

    if (interviewCheck.rows.length === 0) {
      throw new NotFoundError('Interview not found');
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    const fieldMap = {
      type: 'type',
      scheduledAt: 'scheduled_at',
      duration: 'duration',
      location: 'location',
      meetingLink: 'meeting_link',
      status: 'status',
      notes: 'notes'
    };

    Object.keys(value).forEach(key => {
      if (fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${paramIndex}`);
        params.push(value[key]);
        paramIndex++;
      }
    });

    // Handle interviewer updates separately
    if (value.interviewerIds) {
      // Verify all interviewers exist
      const interviewersCheck = await db.query(
        `SELECT id FROM users WHERE id = ANY($1) AND organization_id = $2 AND deleted_at IS NULL`,
        [value.interviewerIds, organization_id]
      );

      if (interviewersCheck.rows.length !== value.interviewerIds.length) {
        throw new ValidationError('One or more interviewers not found');
      }

      // Remove existing interviewers
      await db.query('DELETE FROM interview_interviewers WHERE interview_id = $1', [id]);

      // Add new interviewers
      const interviewerPromises = value.interviewerIds.map(interviewerId =>
        db.query(
          'INSERT INTO interview_interviewers (interview_id, user_id) VALUES ($1, $2)',
          [id, interviewerId]
        )
      );
      await Promise.all(interviewerPromises);
    }

    if (updates.length === 0 && !value.interviewerIds) {
      throw new ValidationError('No valid fields to update');
    }

    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      // sql-injection-safe: Dynamic SET clause uses parameterized placeholders ($1, $2, etc.)
      // User input goes into params array, not directly into SQL string
      const query = `
        UPDATE interviews 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await db.query(query, params);
      const interview = result.rows[0];

      logger.info(`Interview updated: ${id} by ${userEmail}`);

      res.json({
        message: 'Interview updated successfully',
        interview: {
          id: interview.id,
          applicationId: interview.application_id,
          type: interview.type,
          scheduledAt: interview.scheduled_at,
          duration: interview.duration,
          location: interview.location,
          meetingLink: interview.meeting_link,
          status: interview.status,
          updatedAt: interview.updated_at
        }
      });
    } else {
      res.json({ message: 'Interview updated successfully' });
    }
  } catch (_error) {
    next(error);
  }
}

/**
 * Submit interview feedback
 * POST /api/interviews/:id/feedback
 */
export async function submitFeedback(req, res, next) {
  try {
    const { id } = req.params;
    const { organization_id, id: userId, email: userEmail } = req.user;

    // Validate request body
    const { error, value } = submitFeedbackSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Verify interview exists and user is an interviewer
    const interviewCheck = await db.query(
      `SELECT ii.user_id FROM interviews i
       JOIN applications a ON i.application_id = a.id
       JOIN jobs j ON a.job_id = j.id
       JOIN workspaces w ON j.workspace_id = w.id
       JOIN interview_interviewers ii ON i.id = ii.interview_id
       WHERE i.id = $1 AND w.organization_id = $2 AND ii.user_id = $3 AND i.deleted_at IS NULL`,
      [id, organization_id, userId]
    );

    if (interviewCheck.rows.length === 0) {
      throw new ForbiddenError('You are not assigned as an interviewer for this interview');
    }

    // Update feedback
    await db.query(
      `UPDATE interview_interviewers 
       SET feedback = $1, rating = $2, recommendation = $3, 
           strengths = $4, weaknesses = $5, technical_skills = $6, culture_fit = $7,
           feedback_submitted_at = CURRENT_TIMESTAMP
       WHERE interview_id = $8 AND user_id = $9`,
      [
        value.feedback,
        value.rating,
        value.recommendation,
        value.strengths || null,
        value.weaknesses || null,
        value.technicalSkills ? JSON.stringify(value.technicalSkills) : null,
        value.cultureFit || null,
        id,
        userId
      ]
    );

    logger.info(`Interview feedback submitted for ${id} by ${userEmail}`);

    res.json({ message: 'Feedback submitted successfully' });
  } catch (_error) {
    next(error);
  }
}

/**
 * Cancel interview
 * DELETE /api/interviews/:id
 */
export async function cancelInterview(req, res, next) {
  try {
    const { id } = req.params;
    const { organization_id, email: userEmail, role } = req.user;

    // Only recruiters, admins, and owners can cancel interviews
    if (!['owner', 'admin', 'recruiter'].includes(role)) {
      throw new ForbiddenError('Only recruiters, admins, and owners can cancel interviews');
    }

    // Check if interview exists and belongs to organization
    const interviewCheck = await db.query(
      `SELECT i.id FROM interviews i
       JOIN applications a ON i.application_id = a.id
       JOIN jobs j ON a.job_id = j.id
       JOIN workspaces w ON j.workspace_id = w.id
       WHERE i.id = $1 AND w.organization_id = $2 AND i.deleted_at IS NULL`,
      [id, organization_id]
    );

    if (interviewCheck.rows.length === 0) {
      throw new NotFoundError('Interview not found');
    }

    // Soft delete
    await db.query(
      'UPDATE interviews SET deleted_at = CURRENT_TIMESTAMP, status = $1 WHERE id = $2',
      ['cancelled', id]
    );

    logger.info(`Interview cancelled: ${id} by ${userEmail}`);

    res.json({ message: 'Interview cancelled successfully' });
  } catch (_error) {
    next(error);
  }
}
