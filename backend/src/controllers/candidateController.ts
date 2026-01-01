/**
 * CandidateController - HTTP request handler for candidates (Thin Controller)
 * Delegates business logic to CandidateService
 * Only handles HTTP concerns: request/response, status codes, error handling
 * Phase 5 Refactored: Uses response helpers, proper user context, resource-specific keys
 */

import { Request, Response, NextFunction } from 'express';
import { CandidateService } from '../services/candidates/CandidateService.js';
import logger from '../utils/logger.js';

const candidateService = new CandidateService();

/**
 * Create a new candidate
 * POST /api/candidates
 */
export async function createCandidate(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    const { organizationId, id: userId } = req.user!;
    const candidate = await candidateService.create(
      req.validatedBody,
      organizationId,
      userId
    );
    return res.sendCreated('candidate', candidate);
  } catch (error) {
    next(error);
  }
}

/**
 * Get candidate by ID
 * GET /api/candidates/:id
 */
export async function getCandidate(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    const { organizationId, id: userId } = req.user!;
    const { id } = req.params;
    const { includeApplications } = req.query;
    
    const candidate = await candidateService.getById(
      id,
      organizationId,
      userId,
      includeApplications === 'true'
    );
    
    return res.sendSuccess({
      resource: 'candidate',
      data: candidate
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update candidate
 * PATCH /api/candidates/:id
 */
export async function updateCandidate(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    const { id } = req.params;
    
    const candidate = await candidateService.update(
      id,
      req.validatedBody,
      organizationId,
      userId
    );
    
    return res.sendSuccess({
      resource: 'candidate',
      data: candidate
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete candidate (soft delete)
 * DELETE /api/candidates/:id
 */
export async function deleteCandidate(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    const { id } = req.params;
    
    await candidateService.delete(id, organizationId, userId);
    
    return res.sendDeleted('Candidate deleted successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Search/list candidates with filters
 * GET /api/candidates
 */
export async function listCandidates(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    const {
      search,
      status,
      source,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    // Parse tags if it's a string
    let parsedTags = tags;
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const result = await candidateService.search(
      {
        search,
        status,
        source,
        tags: parsedTags,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sortBy,
        sortOrder: sortOrder.toUpperCase()
      },
      organizationId,
      userId
    );
    
    return res.sendSuccess({
      resource: 'candidates',
      data: result.candidates,
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
 * Get candidate statistics
 * GET /api/candidates/statistics
 */
export async function getCandidateStatistics(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    
    const stats = await candidateService.getStatistics(organizationId, userId);
    
    return res.sendSuccess({
      resource: 'statistics',
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update candidate tags
 * PUT /api/candidates/:id/tags
 */
export async function updateCandidateTags(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    const { id } = req.params;
    const { tags } = req.validatedBody;
    
    const candidate = await candidateService.updateTags(id, tags, organizationId, userId);
    
    return res.sendSuccess({
      resource: 'candidate',
      data: candidate
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Check if organization can create more candidates
 * GET /api/candidates/limit-check
 */
export async function checkCandidateLimit(req, res, next) {
  try {
    const { organizationId } = req.user;
    
    const limitInfo = await candidateService.checkCandidateLimit(organizationId);
    
    return res.sendSuccess({
      resource: 'limitInfo',
      data: limitInfo
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Bulk import candidates
 * POST /api/candidates/bulk-import
 */
export async function bulkImportCandidates(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    const { candidates } = req.validatedBody;
    
    const results = await candidateService.bulkImport(candidates, organizationId, userId);
    
    return res.sendSuccess({
      resource: 'results',
      data: results
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get candidate's applications
 * GET /api/candidates/:id/applications
 */
export async function getCandidateApplications(req, res, next) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // Use ApplicationService to get applications by candidate
    const { ApplicationService } = await import('../services/applications/ApplicationService');
    const applicationService = new ApplicationService();
    
    const result = await applicationService.getByCandidate(
      id,
      req.user,
      {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    );
    
    res.status(200).json({
      success: true,
      data: result.applications,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
}
