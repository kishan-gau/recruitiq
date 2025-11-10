/**
 * CandidateController - HTTP request handler for candidates (Thin Controller)
 * Delegates business logic to CandidateService
 * Only handles HTTP concerns: request/response, status codes, error handling
 */

import { CandidateService } from '../services/candidates/CandidateService.js';
import { mapApiToDb, mapDbToApi } from '../utils/dtoMapper.js';
import logger from '../utils/logger.js';

const candidateService = new CandidateService();

/**
 * Create a new candidate
 * POST /api/candidates
 */
export async function createCandidate(req, res, next) {
  try {
    // Convert API camelCase to database snake_case
    const candidateData = mapApiToDb(req.body);
    const candidate = await candidateService.create(candidateData, req.user);
    
    res.status(201).json({
      success: true,
      data: candidate,
      message: 'Candidate created successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get candidate by ID
 * GET /api/candidates/:id
 */
export async function getCandidate(req, res, next) {
  try {
    const { id } = req.params;
    const { includeApplications } = req.query;
    
    const candidate = await candidateService.getById(
      id,
      req.user,
      includeApplications === 'true'
    );
    
    res.status(200).json({
      success: true,
      candidate: candidate
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
    const { id } = req.params;
    
    // Convert API camelCase to database snake_case
    const updateData = mapApiToDb(req.body);
    const candidate = await candidateService.update(id, updateData, req.user);
    
    res.status(200).json({
      success: true,
      data: candidate,
      message: 'Candidate updated successfully'
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
    const { id } = req.params;
    
    await candidateService.delete(id, req.user);
    
    res.status(200).json({
      success: true,
      message: 'Candidate deleted successfully'
    });
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
      req.user
    );
    
    res.status(200).json({
      success: true,
      candidates: result.candidates,
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
    const stats = await candidateService.getStatistics(req.user);
    
    res.status(200).json({
      success: true,
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
    const { id } = req.params;
    const { tags } = req.body;
    
    const candidate = await candidateService.updateTags(id, tags, req.user);
    
    res.status(200).json({
      success: true,
      data: candidate,
      message: 'Tags updated successfully'
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
    const limitInfo = await candidateService.checkCandidateLimit(req.user.organization_id);
    
    res.status(200).json({
      success: true,
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
    const { candidates } = req.body;
    
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: candidates array is required'
      });
    }
    
    const results = await candidateService.bulkImport(candidates, req.user);
    
    res.status(200).json({
      success: true,
      data: results,
      message: `Bulk import completed. Success: ${results.success.length}, Failed: ${results.failed.length}`
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
    const { ApplicationService } = await import('../services/applications/ApplicationService.js');
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
