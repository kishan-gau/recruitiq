import Joi from 'joi';
import pool from '../config/database.js';
import db from '../config/database.js';
import logger from '../utils/logger.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Generate a unique tracking code for applications
 */
function generateTrackingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'TRACK-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a unique tracking code that doesn't exist in the database
 */
async function generateUniqueTrackingCode() {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const code = generateTrackingCode();
    
    // Check if code already exists
    const existingResult = await db.query(
      'SELECT id FROM applications WHERE tracking_code = $1',
      [code]
    );
    
    if (existingResult.rows.length === 0) {
      return code;
    }
    
    attempts++;
  }
  
  // Fallback: use UUID-based code
  return `TRACK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Validation schemas
const submitApplicationSchema = Joi.object({
  // Candidate Information
  firstName: Joi.string().min(1).max(255).required(),
  lastName: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(50).allow(''),
  location: Joi.string().max(255).allow(''),
  
  // Professional Information
  currentJobTitle: Joi.string().max(255).allow(''),
  currentCompany: Joi.string().max(255).allow(''),
  linkedinUrl: Joi.string().uri().max(500).allow(''),
  portfolioUrl: Joi.string().uri().max(500).allow(''),
  
  // Application Documents (base64 encoded)
  resume: Joi.object({
    filename: Joi.string().required(),
    contentType: Joi.string().required(),
    data: Joi.string().required(), // base64 encoded file
    size: Joi.number().max(10 * 1024 * 1024) // 10MB max
  }).allow(null),
  
  // Application Content
  coverLetter: Joi.string().allow(''),
  
  // Custom Form Responses
  customResponses: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean(), Joi.array())
  ).default({})
});

/**
 * Get public job details
 * GET /api/public/jobs/:identifier
 * Identifier can be UUID or public slug
 */
export async function getPublicJob(req, res, next) {
  try {
    const { identifier } = req.params;
    
    // Try to find by UUID first, then by slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    const query = `
      SELECT 
        j.id, j.title, j.department, j.location, j.employment_type,
        j.experience_level, j.remote_policy, j.is_remote,
        j.description, j.requirements, j.responsibilities, j.benefits,
        j.salary_min, j.salary_max, j.salary_currency,
        j.public_slug, j.public_portal_settings, j.view_count,
        j.posted_at, j.closes_at, j.created_at,
        o.name as organization_name,
        o.slug as organization_slug,
        ft.id as flow_template_id,
        ft.name as flow_template_name
      FROM jobs j
      LEFT JOIN organizations o ON j.organization_id = o.id
      LEFT JOIN flow_templates ft ON j.flow_template_id = ft.id
      WHERE j.is_public = true 
        AND j.status = 'open'
        AND j.deleted_at IS NULL
        AND ${isUuid ? 'j.id = $1' : 'j.public_slug = $1'}
    `;
    
    const result = await db.query(query, [identifier]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Job not found or not publicly available');
    }
    
    const job = result.rows[0];
    
    // Increment view count
    await db.query(
      'UPDATE jobs SET view_count = view_count + 1 WHERE id = $1',
      [job.id]
    );
    
    // Parse settings
    const settings = job.public_portal_settings || {};
    
    res.json({
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      employmentType: job.employment_type,
      experienceLevel: job.experience_level,
      remotePolicy: job.remote_policy,
      isRemote: job.is_remote,
      description: job.description,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      benefits: job.benefits,
      salary: settings.salaryPublic ? {
        min: job.salary_min,
        max: job.salary_max,
        currency: job.salary_currency
      } : null,
      companyName: settings.companyName || job.organization_name,
      companyLogo: settings.companyLogo || null,
      customFields: settings.customFields || [],
      postedAt: job.posted_at,
      closesAt: job.closes_at,
      viewCount: job.view_count + 1,
      organizationSlug: job.organization_slug,
      publicSlug: job.public_slug
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * List all public jobs for an organization
 * GET /api/public/careers/:organizationId
 */
export async function listPublicJobs(req, res, next) {
  try {
    const { organizationId } = req.params;
    const { department, location, employmentType, search } = req.query;
    
    // Check if organizationId is slug or UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId);
    
    let query = `
      SELECT 
        j.id, j.title, j.department, j.location, j.employment_type,
        j.experience_level, j.is_remote, j.public_slug,
        j.salary_min, j.salary_max, j.salary_currency,
        j.public_portal_settings, j.view_count, j.application_count,
        j.posted_at, j.created_at,
        o.name as organization_name,
        o.slug as organization_slug
      FROM jobs j
      LEFT JOIN organizations o ON j.organization_id = o.id
      WHERE j.is_public = true 
        AND j.status = 'open'
        AND j.deleted_at IS NULL
        AND ${isUuid ? 'j.organization_id = $1' : 'o.slug = $1'}
    `;
    
    const values = [organizationId];
    let paramCount = 1;
    
    if (department) {
      paramCount++;
      query += ` AND j.department = $${paramCount}`;
      values.push(department);
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
    
    if (search) {
      paramCount++;
      query += ` AND (j.title ILIKE $${paramCount} OR j.description ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }
    
    query += ` ORDER BY j.posted_at DESC, j.created_at DESC`;
    
    const result = await db.query(query, values);
    
    // Get organization details
    const orgQuery = `
      SELECT id, name, slug, tier, branding
      FROM organizations
      WHERE ${isUuid ? 'id = $1' : 'slug = $1'}
        AND deleted_at IS NULL
    `;
    
    const orgResult = await db.query(orgQuery, [organizationId]);
    
    if (orgResult.rows.length === 0) {
      throw new NotFoundError('Organization not found');
    }
    
    const organization = orgResult.rows[0];
    
    res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        branding: organization.branding || {}
      },
      jobs: result.rows.map(job => {
        const settings = job.public_portal_settings || {};
        return {
          id: job.id,
          title: job.title,
          department: job.department,
          location: job.location,
          employmentType: job.employment_type,
          experienceLevel: job.experience_level,
          isRemote: job.is_remote,
          publicSlug: job.public_slug,
          salary: settings.salaryPublic ? {
            min: job.salary_min,
            max: job.salary_max,
            currency: job.salary_currency
          } : null,
          companyName: settings.companyName || organization.name,
          viewCount: job.view_count,
          applicationCount: job.application_count,
          postedAt: job.posted_at
        };
      })
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * Submit a job application
 * POST /api/public/jobs/:jobId/apply
 */
export async function submitApplication(req, res, next) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { jobId } = req.params;
    const { error, value } = submitApplicationSchema.validate(req.body);
    
    if (error) {
      throw new ValidationError(error.details[0].message);
    }
    
    // Get job details
    const jobResult = await client.query(`
      SELECT j.*, o.id as organization_id, w.id as workspace_id
      FROM jobs j
      LEFT JOIN organizations o ON j.organization_id = o.id
      LEFT JOIN workspaces w ON j.workspace_id = w.id
      WHERE j.id = $1 
        AND j.is_public = true 
        AND j.status = 'open'
        AND j.deleted_at IS NULL
    `, [jobId]);
    
    if (jobResult.rows.length === 0) {
      throw new NotFoundError('Job not found or not accepting applications');
    }
    
    const job = jobResult.rows[0];
    
    // Check if candidate already applied to this job
    const existingResult = await client.query(`
      SELECT a.id
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      WHERE a.job_id = $1 
        AND c.email = $2
        AND a.deleted_at IS NULL
    `, [jobId, value.email]);
    
    if (existingResult.rows.length > 0) {
      throw new ValidationError('You have already applied to this position');
    }
    
    // Generate unique tracking code
    const trackingCode = await generateUniqueTrackingCode();
    
    // Prepare application data
    const applicationData = {
      submittedAt: new Date().toISOString(),
      customResponses: value.customResponses,
      source: 'public-portal',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress
    };
    
    // Handle resume file (store as base64 in application_data for now)
    if (value.resume) {
      (applicationData as any).resume = {
        filename: value.resume.filename,
        contentType: value.resume.contentType,
        size: value.resume.size,
        data: value.resume.data, // base64 encoded
        uploadedAt: new Date().toISOString()
      };
    }
    
    // Create or find candidate
    let candidateId;
    const candidateResult = await client.query(
      'SELECT id FROM candidates WHERE email = $1 AND organization_id = $2',
      [value.email, job.organization_id]
    );
    
    if (candidateResult.rows.length > 0) {
      // Update existing candidate
      candidateId = candidateResult.rows[0].id;
      
      await client.query(`
        UPDATE candidates
        SET 
          first_name = $1,
          last_name = $2,
          name = $3,
          phone = COALESCE($4, phone),
          location = COALESCE($5, location),
          current_job_title = COALESCE($6, current_job_title),
          current_company = COALESCE($7, current_company),
          linkedin_url = COALESCE($8, linkedin_url),
          portfolio_url = COALESCE($9, portfolio_url),
          updated_at = NOW()
        WHERE id = $10
      `, [
        value.firstName,
        value.lastName,
        `${value.firstName} ${value.lastName}`,
        value.phone || null,
        value.location || null,
        value.currentJobTitle || null,
        value.currentCompany || null,
        value.linkedinUrl || null,
        value.portfolioUrl || null,
        candidateId
      ]);
      
    } else {
      // Create new candidate
      const newCandidateResult = await client.query(`
        INSERT INTO candidates (
          organization_id, first_name, last_name, name,
          email, phone, location,
          current_job_title, current_company,
          linkedin_url, portfolio_url,
          application_source, tracking_code, application_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        job.organization_id,
        value.firstName,
        value.lastName,
        `${value.firstName} ${value.lastName}`,
        value.email,
        value.phone || null,
        value.location || null,
        value.currentJobTitle || null,
        value.currentCompany || null,
        value.linkedinUrl || null,
        value.portfolioUrl || null,
        'public-portal',
        trackingCode,
        JSON.stringify(applicationData)
      ]);
      
      candidateId = newCandidateResult.rows[0].id;
    }
    
    // Get initial stage from flow template
    let initialStage = 'applied';
    if (job.flow_template_id) {
      const flowResult = await client.query(
        'SELECT stages FROM flow_templates WHERE id = $1',
        [job.flow_template_id]
      );
      
      if (flowResult.rows.length > 0 && flowResult.rows[0].stages && flowResult.rows[0].stages.length > 0) {
        initialStage = flowResult.rows[0].stages[0].name || 'applied';
      }
    }
    
    // Create application
    const applicationResult = await client.query(`
      INSERT INTO applications (
        job_id, candidate_id, organization_id, workspace_id,
        tracking_code, status, stage,
        current_stage, current_stage_name,
        cover_letter, applied_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING id, tracking_code, applied_at
    `, [
      jobId,
      candidateId,
      job.organization_id,
      job.workspace_id,
      trackingCode,
      'active',
      initialStage,
      0,
      initialStage,
      value.coverLetter || null
    ]);
    
    const application = applicationResult.rows[0];
    
    // Increment application count on job
    await client.query(
      'UPDATE jobs SET application_count = application_count + 1 WHERE id = $1',
      [jobId]
    );
    
    // Create welcome communication
    await client.query(`
      INSERT INTO communications (
        application_id, from_type, message_type,
        subject, message, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      application.id,
      'system',
      'status-update',
      'Application Received',
      `Thank you for applying to ${job.title}. We have received your application and will review it shortly. You can track your application status using the tracking code: ${trackingCode}`,
      true
    ]);
    
    await client.query('COMMIT');
    
    logger.info(`New application submitted: ${application.id} for job ${jobId}`);
    
    res.status(201).json({
      success: true,
      trackingCode: application.tracking_code,
      applicationId: application.id,
      appliedAt: application.applied_at,
      message: 'Application submitted successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

/**
 * Get application status by tracking code
 * GET /api/public/track/:trackingCode
 */
export async function getApplicationStatus(req, res, next) {
  try {
    const { trackingCode } = req.params;
    
    const query = `
      SELECT 
        a.id, a.tracking_code, a.status, a.stage,
        a.current_stage, a.current_stage_name, a.applied_at,
        c.first_name, c.last_name, c.email,
        j.id as job_id, j.title as job_title,
        j.department, j.location,
        o.name as company_name,
        ft.stages as flow_stages
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      JOIN jobs j ON a.job_id = j.id
      JOIN organizations o ON a.organization_id = o.id
      LEFT JOIN flow_templates ft ON j.flow_template_id = ft.id
      WHERE a.tracking_code = $1
        AND a.deleted_at IS NULL
    `;
    
    const result = await db.query(query, [trackingCode]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Application not found');
    }
    
    const app = result.rows[0];
    
    // Get communications
    const commsResult = await db.query(`
      SELECT 
        id, from_type, message_type, subject, message,
        attachments, created_at
      FROM communications
      WHERE application_id = $1
        AND is_public = true
      ORDER BY created_at DESC
    `, [app.id]);
    
    // Get interviews
    const interviewsResult = await db.query(`
      SELECT 
        i.id, i.title, i.type, i.status,
        i.scheduled_at, i.duration_minutes, i.location, i.meeting_link
      FROM interviews i
      WHERE i.application_id = $1
        AND i.deleted_at IS NULL
      ORDER BY i.scheduled_at ASC
    `, [app.id]);
    
    res.json({
      trackingCode: app.tracking_code,
      status: app.status,
      stage: app.stage,
      currentStage: app.current_stage,
      currentStageName: app.current_stage_name,
      appliedAt: app.applied_at,
      candidate: {
        firstName: app.first_name,
        lastName: app.last_name,
        email: app.email
      },
      job: {
        id: app.job_id,
        title: app.job_title,
        department: app.department,
        location: app.location
      },
      companyName: app.company_name,
      flowStages: app.flow_stages || [],
      communications: commsResult.rows.map(comm => ({
        id: comm.id,
        fromType: comm.from_type,
        messageType: comm.message_type,
        subject: comm.subject,
        message: comm.message,
        attachments: comm.attachments || [],
        createdAt: comm.created_at
      })),
      interviews: interviewsResult.rows.map(interview => ({
        id: interview.id,
        title: interview.title,
        type: interview.type,
        status: interview.status,
        scheduledAt: interview.scheduled_at,
        duration: interview.duration_minutes,
        location: interview.location,
        meetingLink: interview.meeting_link
      }))
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * Upload additional documents to application
 * POST /api/public/track/:trackingCode/documents
 */
export async function uploadDocument(req, res, next) {
  try {
    const { trackingCode } = req.params;
    const { filename, contentType, data, documentType } = req.body;
    
    if (!filename || !contentType || !data) {
      throw new ValidationError('Missing required fields: filename, contentType, data');
    }
    
    // Validate file size (10MB max)
    const sizeInBytes = Buffer.from(data, 'base64').length;
    if (sizeInBytes > 10 * 1024 * 1024) {
      throw new ValidationError('File size exceeds 10MB limit');
    }
    
    // Get application
    const appResult = await db.query(
      'SELECT id, candidate_id FROM applications WHERE tracking_code = $1 AND deleted_at IS NULL',
      [trackingCode]
    );
    
    if (appResult.rows.length === 0) {
      throw new NotFoundError('Application not found');
    }
    
    const application = appResult.rows[0];
    
    // Update candidate's application_data with new document
    const candidateResult = await db.query(
      'SELECT application_data FROM candidates WHERE id = $1',
      [application.candidate_id]
    );
    
    const applicationData = candidateResult.rows[0].application_data || {};
    
    if (!applicationData.additionalDocuments) {
      applicationData.additionalDocuments = [];
    }
    
    applicationData.additionalDocuments.push({
      filename,
      contentType,
      data,
      documentType: documentType || 'other',
      uploadedAt: new Date().toISOString()
    });
    
    await db.query(
      'UPDATE candidates SET application_data = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(applicationData), application.candidate_id]
    );
    
    // Create communication
    await db.query(`
      INSERT INTO communications (
        application_id, from_type, message_type,
        subject, message, is_public,
        attachments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      application.id,
      'candidate',
      'general',
      'Document Uploaded',
      `Candidate uploaded: ${filename}`,
      false, // Not visible to candidate
      JSON.stringify([{ filename, contentType, uploadedAt: new Date().toISOString() }])
    ]);
    
    logger.info(`Document uploaded for application ${application.id}: ${filename}`);
    
    res.json({
      success: true,
      message: 'Document uploaded successfully',
      filename
    });
    
  } catch (error) {
    next(error);
  }
}
