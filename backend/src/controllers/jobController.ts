/**
 * JobController - HTTP request handler for jobs (Thin Controller)
 * Delegates business logic to JobService
 * Only handles HTTP concerns: request/response, status codes, error handling
 * 
 * Phase 5 Standards:
 * - Uses response helper methods (res.sendSuccess, res.sendCreated, res.sendDeleted)
 * - Extracts user context from req.user (set by auth middleware)
 * - Returns resource-specific keys (job, jobs - not generic 'data')
 * - Passes all errors to next(error) for error middleware
 */

import { JobService } from '../services/jobs/JobService.js';
import logger from '../utils/logger.js';

const jobService = new JobService();

/**
 * Create a new job
 * 
 * @route POST /api/jobs
 * @access Private (requires authentication)
 * @param {Object} req - Express request with validated body in req.validatedBody
 * @param {Object} res - Express response with helper methods
 * @param {Function} next - Express next middleware
 * @returns {Object} Created job with 201 status
 */
export async function createJob(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    
    const job = await jobService.create(req.validatedBody, organizationId, userId);
    
    return res.sendCreated('job', job);
  } catch (_error) {
    next(error);
  }
}

/**
 * Get job by ID
 * 
 * @route GET /api/jobs/:id
 * @access Private (requires authentication)
 * @param {string} id - Job ID (UUID)
 * @param {boolean} includeStats - Optional flag to include application statistics
 * @returns {Object} Job object with 200 status
 */
export async function getJob(req, res, next) {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { includeStats } = req.query;
    
    const job = await jobService.getById(
      id,
      organizationId,
      includeStats === 'true'
    );
    
    return res.sendSuccess({ resource: 'job', data: job }, 200);
  } catch (_error) {
    next(error);
  }
}

/**
 * Get job by slug (public access - no authentication required)
 * 
 * @route GET /api/public/jobs/:slug
 * @access Public
 * @param {string} slug - Job slug for URL-friendly access
 * @returns {Object} Job object with 200 status
 */
export async function getJobBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    
    const job = await jobService.getBySlug(slug);
    
    return res.sendSuccess({ resource: 'job', data: job }, 200);
  } catch (_error) {
    next(error);
  }
}

/**
 * Update job
 * 
 * @route PATCH /api/jobs/:id
 * @access Private (requires authentication)
 * @param {string} id - Job ID (UUID)
 * @param {Object} req.validatedBody - Validated update data
 * @returns {Object} Updated job with 200 status
 */
export async function updateJob(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    const { id } = req.params;
    
    const job = await jobService.update(id, req.validatedBody, organizationId, userId);
    
    return res.sendSuccess({ resource: 'job', data: job }, 200);
  } catch (_error) {
    next(error);
  }
}

/**
 * Delete job (soft delete)
 * 
 * @route DELETE /api/jobs/:id
 * @access Private (requires admin role)
 * @param {string} id - Job ID (UUID)
 * @returns {Object} Success message with 200 status
 */
export async function deleteJob(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    const { id } = req.params;
    
    await jobService.delete(id, organizationId, userId);
    
    return res.sendDeleted('Job deleted successfully');
  } catch (_error) {
    next(error);
  }
}

/**
 * Search/list jobs with filters and pagination
 * 
 * @route GET /api/jobs
 * @access Private (requires authentication)
 * @query {string} search - Search term (optional)
 * @query {string} status - Filter by status (optional)
 * @query {string} department - Filter by department (optional)
 * @query {string} employment_type - Filter by employment type (optional)
 * @query {string} location - Filter by location (optional)
 * @query {string} hiring_manager_id - Filter by hiring manager (optional)
 * @query {boolean} is_published - Filter by publish status (optional)
 * @query {number} page - Page number (1-indexed, default 1)
 * @query {number} limit - Items per page (default 20, max 100)
 * @query {string} sortBy - Sort field (default created_at)
 * @query {string} sortOrder - Sort direction ASC|DESC (default DESC)
 * @returns {Object} Jobs array with pagination info
 */
export async function listJobs(req, res, next) {
  try {
    const { organizationId } = req.user;
    const {
      search,
      status,
      department,
      employment_type,
      location,
      hiring_manager_id,
      is_published,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const result = await jobService.search(
      {
        search,
        status,
        department,
        employment_type,
        location,
        hiring_manager_id,
        is_published: is_published === 'true' ? true : is_published === 'false' ? false : null,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sortBy,
        sortOrder: sortOrder.toUpperCase()
      },
      organizationId
    );
    
    return res.sendSuccess({
      resource: 'jobs',
      data: result.jobs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.page < result.totalPages,
        hasPrev: result.page > 1
      }
    }, 200);
  } catch (_error) {
    next(error);
  }
}

/**
 * Get job statistics
 * 
 * @route GET /api/jobs/statistics
 * @access Private (requires authentication)
 * @returns {Object} Job statistics including counts and trends
 */
export async function getJobStatistics(req, res, next) {
  try {
    const { organizationId } = req.user;
    
    const stats = await jobService.getStatistics(organizationId);
    
    return res.sendSuccess({
      resource: 'statistics',
      data: stats
    }, 200);
  } catch (_error) {
    next(error);
  }
}

/**
 * Publish or unpublish a job
 * 
 * @route PUT /api/jobs/:id/publish
 * @access Private (requires recruiter or admin role)
 * @param {string} id - Job ID (UUID)
 * @body {boolean} publish - Whether to publish (true) or unpublish (false)
 * @returns {Object} Updated job with new publish status
 */
export async function toggleJobPublish(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    const { id } = req.params;
    const { publish } = req.validatedBody;
    
    const job = await jobService.togglePublish(id, publish, organizationId, userId);
    
    return res.sendSuccess({
      resource: 'job',
      data: job,
      message: `Job ${publish ? 'published' : 'unpublished'} successfully`
    }, 200);
  } catch (_error) {
    next(error);
  }
}

/**
 * Close a job
 * 
 * @route PUT /api/jobs/:id/close
 * @access Private (requires recruiter or admin role)
 * @param {string} id - Job ID (UUID)
 * @body {string} reason - Reason for closing (optional)
 * @returns {Object} Updated job with closed status
 */
export async function closeJob(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    const { id } = req.params;
    const { reason } = req.validatedBody;
    
    const job = await jobService.closeJob(id, organizationId, userId, reason);
    
    return res.sendSuccess({
      resource: 'job',
      data: job,
      message: 'Job closed successfully'
    }, 200);
  } catch (_error) {
    next(error);
  }
}

/**
 * Get published jobs (public endpoint for career page)
 * 
 * @route GET /api/public/jobs
 * @access Public (no authentication required)
 * @query {string} organization_id - Organization ID (required)
 * @query {string} location - Filter by location (optional)
 * @query {string} department - Filter by department (optional)
 * @query {string} employment_type - Filter by employment type (optional)
 * @query {number} limit - Items to return (default 50, max 200)
 * @returns {Object} Published jobs array
 */
export async function getPublishedJobs(req, res, next) {
  try {
    const { organization_id, location, department, employment_type, limit } = req.query;
    
    if (!organization_id) {
      return res.sendError(
        'organization_id is required',
        400,
        'MISSING_ORGANIZATION_ID'
      );
    }
    
    const jobs = await jobService.getPublishedJobs(organization_id, {
      location,
      department,
      employment_type,
      limit: Math.min(limit ? parseInt(limit, 10) : 50, 200)
    });
    
    return res.sendSuccess({
      resource: 'jobs',
      data: jobs
    }, 200);
  } catch (_error) {
    next(error);
  }
}

/**
 * Get jobs by hiring manager
 * 
 * @route GET /api/jobs/hiring-manager/:hiringManagerId
 * @access Private (requires authentication)
 * @param {string} hiringManagerId - Hiring Manager ID (UUID)
 * @returns {Object} Jobs array managed by the hiring manager
 */
export async function getJobsByHiringManager(req, res, next) {
  try {
    const { organizationId } = req.user;
    const { hiringManagerId } = req.params;
    
    const jobs = await jobService.getByHiringManager(hiringManagerId, organizationId);
    
    return res.sendSuccess({
      resource: 'jobs',
      data: jobs
    }, 200);
  } catch (_error) {
    next(error);
  }
}

/**
 * Check if organization can create more jobs (based on plan limits)
 * 
 * @route GET /api/jobs/limit-check
 * @access Private (requires authentication)
 * @returns {Object} Job limit information for organization
 */
export async function checkJobLimit(req, res, next) {
  try {
    const { organizationId } = req.user;
    
    const limitInfo = await jobService.checkJobLimit(organizationId);
    
    return res.sendSuccess({
      resource: 'limit_info',
      data: limitInfo
    }, 200);
  } catch (_error) {
    next(error);
  }
}

/**
 * Get public job by ID (alias for getJobBySlug)
 * 
 * @route GET /api/jobs/public/:id
 * @access Public
 * @param {string} id - Job ID or slug
 * @returns {Object} Job object (delegates to getJobBySlug)
 */
export async function getPublicJob(req, res, next) {
  // Delegate to getJobBySlug - same functionality
  return getJobBySlug(req, res, next);
}

/**
 * List public jobs (alias for getPublishedJobs)
 * 
 * @route GET /api/jobs/public
 * @access Public
 * @returns {Object} Published jobs array (delegates to getPublishedJobs)
 */
export async function listPublicJobs(req, res, next) {
  // Delegate to getPublishedJobs - same functionality
  return getPublishedJobs(req, res, next);
}

/**
 * Publish/unpublish job (alias for toggleJobPublish)
 * 
 * @route PUT /api/jobs/:id/publish
 * @access Private (delegates to toggleJobPublish)
 * @returns {Object} Updated job (delegates to toggleJobPublish)
 */
export async function publishJob(req, res, next) {
  // Delegate to toggleJobPublish - same functionality
  return toggleJobPublish(req, res, next);
}

/**
 * Update portal settings for job
 * 
 * @route PUT /api/jobs/:id/portal-settings
 * @access Private (requires recruiter or admin role)
 * @param {string} id - Job ID (UUID)
 * @body {Object} portal_settings - Portal configuration settings
 * @returns {Object} Updated job with new portal settings
 */
export async function updatePortalSettings(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    const { id } = req.params;
    const { portal_settings } = req.validatedBody;
    
    const job = await jobService.update(
      id,
      { portal_settings },
      organizationId,
      userId
    );
    
    return res.sendSuccess({
      resource: 'job',
      data: job,
      message: 'Portal settings updated successfully'
    }, 200);
  } catch (_error) {
    next(error);
  }
}
