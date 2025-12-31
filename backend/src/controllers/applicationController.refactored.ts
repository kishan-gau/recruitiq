/**
 * ApplicationController - HTTP request handler for applications (Thin Controller)
 * Delegates business logic to ApplicationService
 * Only handles HTTP concerns: request/response, status codes, error handling
 */

import { ApplicationService } from '../services/applications/ApplicationService.js';
import logger from '../utils/logger.js';

const applicationService = new ApplicationService();

/**
 * Create a new application
 * POST /api/applications
 */
export async function createApplication(req, res, next) {
  try {
    const application = await applicationService.create(req.body, req.user);
    
    res.status(201).json({
      success: true,
      data: application,
      message: 'Application submitted successfully'
    });
  } catch (_error) {
    next(error);
  }
}

/**
 * Get application by ID
 * GET /api/applications/:id
 */
export async function getApplication(req, res, next) {
  try {
    const { id } = req.params;
    const { includeDetails } = req.query;
    
    const application = await applicationService.getById(
      id,
      req.user,
      includeDetails === 'true'
    );
    
    res.status(200).json({
      success: true,
      application: application
    });
  } catch (_error) {
    next(error);
  }
}

/**
 * Update application
 * PATCH /api/applications/:id
 */
export async function updateApplication(req, res, next) {
  try {
    const { id } = req.params;
    
    const application = await applicationService.update(id, req.body, req.user);
    
    res.status(200).json({
      success: true,
      data: application,
      message: 'Application updated successfully'
    });
  } catch (_error) {
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
    
    await applicationService.delete(id, req.user);
    
    res.status(200).json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (_error) {
    next(error);
  }
}

/**
 * Search/list applications with filters
 * GET /api/applications
 */
export async function listApplications(req, res, next) {
  try {
    const {
      search,
      status,
      jobId,
      candidateId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'applied_at',
      sortOrder = 'DESC'
    } = req.query;

    const result = await applicationService.search(
      {
        search,
        status,
        jobId,
        candidateId,
        dateFrom,
        dateTo,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sortBy,
        sortOrder: sortOrder.toUpperCase()
      },
      req.user
    );
    
    res.status(200).json({
      success: true,
      applications: result.applications,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (_error) {
    next(error);
  }
}

/**
 * Get applications for a specific job
 * GET /api/jobs/:jobId/applications
 */
export async function getJobApplications(req, res, next) {
  try {
    const { jobId } = req.params;
    const {
      status,
      page = 1,
      limit = 50,
      sortBy = 'applied_at',
      sortOrder = 'DESC'
    } = req.query;

    const result = await applicationService.getByJob(
      jobId,
      req.user,
      {
        status,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sortBy,
        sortOrder: sortOrder.toUpperCase()
      }
    );
    
    res.status(200).json({
      success: true,
      data: result.applications,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (_error) {
    next(error);
  }
}

/**
 * Get applications for a specific candidate
 * GET /api/candidates/:candidateId/applications
 */
export async function getCandidateApplications(req, res, next) {
  try {
    const { candidateId } = req.params;
    
    const applications = await applicationService.getByCandidate(candidateId, req.user);
    
    res.status(200).json({
      success: true,
      data: applications
    });
  } catch (_error) {
    next(error);
  }
}

/**
 * Get application statistics
 * GET /api/applications/statistics
 */
export async function getApplicationStatistics(req, res, next) {
  try {
    const { jobId } = req.query;
    
    const stats = await applicationService.getStatistics(req.user, jobId);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (_error) {
    next(error);
  }
}

/**
 * Change application status
 * PUT /api/applications/:id/status
 */
export async function changeApplicationStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const application = await applicationService.changeStatus(
      id,
      status,
      req.user,
      notes
    );
    
    res.status(200).json({
      success: true,
      data: application,
      message: 'Application status updated successfully'
    });
  } catch (_error) {
    next(error);
  }
}

/**
 * Get recent applications
 * GET /api/applications/recent
 */
export async function getRecentApplications(req, res, next) {
  try {
    const { limit = 10 } = req.query;
    
    const applications = await applicationService.getRecent(
      req.user,
      parseInt(limit, 10)
    );
    
    res.status(200).json({
      success: true,
      data: applications
    });
  } catch (_error) {
    next(error);
  }
}

/**
 * Track application by tracking code (public endpoint)
 * GET /api/applications/track/:trackingCode
 */
export async function trackApplication(req, res, next) {
  try {
    const { trackingCode } = req.params;
    
    // For now, return a simple response
    // This would need to be implemented in ApplicationService
    res.status(200).json({
      success: true,
      data: {
        trackingCode,
        message: 'Application tracking feature coming soon'
      }
    });
  } catch (_error) {
    next(error);
  }
}
