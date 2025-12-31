/**
 * ScheduleHub Time Off Controller
 * HTTP request handlers for time off request management
 */

import TimeOffService from '../services/timeOffService.js';
import logger from '../../../utils/logger.js';

class TimeOffController {
  constructor() {
    this.timeOffService = new TimeOffService();
  }

  /**
   * Create time off request
   * POST /api/schedulehub/time-off
   */
  createRequest = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      const result = await this.timeOffService.createRequest(
        req.body,
        organizationId,
        userId
      );

      res.status(201).json(result);
    } catch (_error) {
      logger.error('Error in createRequest controller:', error);
      next(error);
    }
  };

  /**
   * List time off requests with filters
   * GET /api/schedulehub/time-off
   */
  listRequests = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { status, startDate, endDate, pending } = req.query;

      // If pending query param is provided, use getPendingRequests
      if (pending === 'true') {
        const result = await this.timeOffService.getPendingRequests(organizationId);
        return res.json(result);
      }

      const result = await this.timeOffService.listRequests(
        organizationId,
        status,
        startDate,
        endDate
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in listRequests controller:', error);
      next(error);
    }
  };

  /**
   * Review time off request (approve/deny)
   * POST /api/schedulehub/time-off/:id/review
   */
  reviewRequest = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { id } = req.params;
      const { status, reviewNotes } = req.body;

      if (!status || !['approved', 'denied'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'status must be "approved" or "denied"'
        });
      }

      const result = await this.timeOffService.reviewRequest(
        id,
        organizationId,
        status,
        userId,
        reviewNotes
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in reviewRequest controller:', error);
      next(error);
    }
  };

  /**
   * Get worker's time off requests
   * GET /api/schedulehub/workers/:workerId/time-off
   */
  getWorkerRequests = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { workerId } = req.params;
      const { status, startDate, endDate } = req.query;

      const result = await this.timeOffService.getWorkerRequests(
        workerId,
        organizationId,
        status,
        startDate,
        endDate
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in getWorkerRequests controller:', error);
      next(error);
    }
  };

  /**
   * Get pending time off requests (for managers)
   * GET /api/schedulehub/time-off/pending
   */
  getPendingRequests = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;

      const result = await this.timeOffService.getPendingRequests(organizationId);

      res.json(result);
    } catch (_error) {
      logger.error('Error in getPendingRequests controller:', error);
      next(error);
    }
  };

  /**
   * Cancel time off request
   * POST /api/schedulehub/time-off/:id/cancel
   */
  cancelRequest = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const result = await this.timeOffService.cancelRequest(id, organizationId);

      res.json(result);
    } catch (_error) {
      logger.error('Error in cancelRequest controller:', error);
      next(error);
    }
  };

  /**
   * Get time off request by ID
   * GET /api/schedulehub/time-off/:id
   */
  getRequestById = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const result = await this.timeOffService.getRequestById(id, organizationId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (_error) {
      logger.error('Error in getRequestById controller:', error);
      next(error);
    }
  };
}

export default TimeOffController;
