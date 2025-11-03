/**
 * JobController - HTTP request handler for jobs (Thin Controller)
 * Delegates business logic to JobService
 * Only handles HTTP concerns: request/response, status codes, error handling
 */

import { JobService } from '../services/jobs/JobService.js';
import logger from '../utils/logger.js';

const jobService = new JobService();

/**
 * Create a new job
 * POST /api/jobs
 */
export async function createJob(req, res, next) {
  try {
    const job = await jobService.create(req.body, req.user);
    
    res.status(201).json({
      success: true,
      data: job,
      message: 'Job created successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get job by ID
 * GET /api/jobs/:id
 */
export async function getJob(req, res, next) {
  try {
    const { id } = req.params;
    const { includeStats } = req.query;
    
    const job = await jobService.getById(
      id,
      req.user,
      includeStats === 'true'
    );
    
    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get job by slug (public access)
 * GET /api/public/jobs/:slug
 */
export async function getJobBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    
    const job = await jobService.getBySlug(slug);
    
    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update job
 * PATCH /api/jobs/:id
 */
export async function updateJob(req, res, next) {
  try {
    const { id } = req.params;
    
    const job = await jobService.update(id, req.body, req.user);
    
    res.status(200).json({
      success: true,
      data: job,
      message: 'Job updated successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete job (soft delete)
 * DELETE /api/jobs/:id
 */
export async function deleteJob(req, res, next) {
  try {
    const { id } = req.params;
    
    await jobService.delete(id, req.user);
    
    res.status(200).json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Search/list jobs with filters
 * GET /api/jobs
 */
export async function listJobs(req, res, next) {
  try {
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
      req.user
    );
    
    res.status(200).json({
      success: true,
      data: result.jobs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get job statistics
 * GET /api/jobs/statistics
 */
export async function getJobStatistics(req, res, next) {
  try {
    const stats = await jobService.getStatistics(req.user);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Publish or unpublish a job
 * PUT /api/jobs/:id/publish
 */
export async function toggleJobPublish(req, res, next) {
  try {
    const { id } = req.params;
    const { publish } = req.body;
    
    if (typeof publish !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: publish field must be boolean'
      });
    }
    
    const job = await jobService.togglePublish(id, publish, req.user);
    
    res.status(200).json({
      success: true,
      data: job,
      message: `Job ${publish ? 'published' : 'unpublished'} successfully`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Close a job
 * PUT /api/jobs/:id/close
 */
export async function closeJob(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const job = await jobService.closeJob(id, req.user, reason);
    
    res.status(200).json({
      success: true,
      data: job,
      message: 'Job closed successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get published jobs (public endpoint for career page)
 * GET /api/public/jobs
 */
export async function getPublishedJobs(req, res, next) {
  try {
    const { organization_id, location, department, employment_type, limit } = req.query;
    
    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: 'organization_id is required'
      });
    }
    
    const jobs = await jobService.getPublishedJobs(organization_id, {
      location,
      department,
      employment_type,
      limit: limit ? parseInt(limit, 10) : 50
    });
    
    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get jobs by hiring manager
 * GET /api/jobs/hiring-manager/:hiringManagerId
 */
export async function getJobsByHiringManager(req, res, next) {
  try {
    const { hiringManagerId } = req.params;
    
    const jobs = await jobService.getByHiringManager(hiringManagerId, req.user);
    
    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Check if organization can create more jobs
 * GET /api/jobs/limit-check
 */
export async function checkJobLimit(req, res, next) {
  try {
    const limitInfo = await jobService.checkJobLimit(req.user.organization_id);
    
    res.status(200).json({
      success: true,
      data: limitInfo
    });
  } catch (error) {
    next(error);
  }
}
