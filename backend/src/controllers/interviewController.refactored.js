/**
 * InterviewController - HTTP request handler for interviews (Thin Controller)
 * Delegates business logic to InterviewService
 * Only handles HTTP concerns: request/response, status codes, error handling
 */

import { InterviewService } from '../services/interviews/InterviewService.js';
import logger from '../utils/logger.js';

const interviewService = new InterviewService();

/**
 * Create a new interview
 * POST /api/interviews
 */
export async function createInterview(req, res, next) {
  try {
    const interview = await interviewService.create(req.body, req.user);
    
    res.status(201).json({
      success: true,
      data: interview,
      message: 'Interview scheduled successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get interview by ID
 * GET /api/interviews/:id
 */
export async function getInterview(req, res, next) {
  try {
    const { id } = req.params;
    const { includeDetails } = req.query;
    
    const interview = await interviewService.getById(
      id,
      req.user,
      includeDetails === 'true'
    );
    
    res.status(200).json({
      success: true,
      data: interview
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update interview
 * PATCH /api/interviews/:id
 */
export async function updateInterview(req, res, next) {
  try {
    const { id } = req.params;
    
    const interview = await interviewService.update(id, req.body, req.user);
    
    res.status(200).json({
      success: true,
      data: interview,
      message: 'Interview updated successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete interview (soft delete)
 * DELETE /api/interviews/:id
 */
export async function deleteInterview(req, res, next) {
  try {
    const { id } = req.params;
    
    await interviewService.delete(id, req.user);
    
    res.status(200).json({
      success: true,
      message: 'Interview deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Search/list interviews with filters
 * GET /api/interviews
 */
export async function listInterviews(req, res, next) {
  try {
    const {
      search,
      status,
      interviewType,
      interviewerId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'scheduled_at',
      sortOrder = 'ASC'
    } = req.query;

    const result = await interviewService.search(
      {
        search,
        status,
        interviewType,
        interviewerId,
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
      data: result.interviews,
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
 * Get interviews for a specific application
 * GET /api/applications/:applicationId/interviews
 */
export async function getApplicationInterviews(req, res, next) {
  try {
    const { applicationId } = req.params;
    
    const interviews = await interviewService.getByApplication(applicationId, req.user);
    
    res.status(200).json({
      success: true,
      data: interviews
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get interviews for a specific interviewer
 * GET /api/interviewers/:interviewerId/interviews
 */
export async function getInterviewerInterviews(req, res, next) {
  try {
    const { interviewerId } = req.params;
    const {
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    const result = await interviewService.getByInterviewer(
      interviewerId,
      req.user,
      {
        status,
        dateFrom,
        dateTo,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      }
    );
    
    res.status(200).json({
      success: true,
      data: result.interviews,
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
 * Get upcoming interviews
 * GET /api/interviews/upcoming
 */
export async function getUpcomingInterviews(req, res, next) {
  try {
    const { limit = 10, interviewerId } = req.query;
    
    const interviews = await interviewService.getUpcoming(
      req.user,
      parseInt(limit, 10),
      interviewerId || null
    );
    
    res.status(200).json({
      success: true,
      data: interviews
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get interview statistics
 * GET /api/interviews/statistics
 */
export async function getInterviewStatistics(req, res, next) {
  try {
    const stats = await interviewService.getStatistics(req.user);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit interview feedback
 * POST /api/interviews/:id/feedback
 */
export async function submitInterviewFeedback(req, res, next) {
  try {
    const { id } = req.params;
    const { feedback, rating, decision } = req.body;
    
    if (!feedback || !rating || !decision) {
      return res.status(400).json({
        success: false,
        message: 'Feedback, rating, and decision are required'
      });
    }
    
    const interview = await interviewService.submitFeedback(
      id,
      { feedback, rating, decision },
      req.user
    );
    
    res.status(200).json({
      success: true,
      data: interview,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel interview
 * PUT /api/interviews/:id/cancel
 */
export async function cancelInterview(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const interview = await interviewService.cancel(id, req.user, reason);
    
    res.status(200).json({
      success: true,
      data: interview,
      message: 'Interview cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark interview as completed
 * PUT /api/interviews/:id/complete
 */
export async function completeInterview(req, res, next) {
  try {
    const { id } = req.params;
    
    const interview = await interviewService.complete(id, req.user);
    
    res.status(200).json({
      success: true,
      data: interview,
      message: 'Interview marked as completed'
    });
  } catch (error) {
    next(error);
  }
}
