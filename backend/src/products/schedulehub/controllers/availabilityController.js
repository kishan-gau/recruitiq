/**
 * ScheduleHub Availability Controller
 * HTTP request handlers for worker availability management
 */

import AvailabilityService from '../services/availabilityService.js';
import logger from '../../../utils/logger.js';

class AvailabilityController {
  constructor() {
    this.availabilityService = new AvailabilityService();
  }

  /**
   * Create availability entry
   * POST /api/schedulehub/availability
   */
  createAvailability = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      const result = await this.availabilityService.createAvailability(
        req.body,
        organizationId,
        userId
      );

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createAvailability controller:', error);
      next(error);
    }
  };

  /**
   * Update availability entry
   * PATCH /api/schedulehub/availability/:id
   */
  updateAvailability = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { id } = req.params;

      const result = await this.availabilityService.updateAvailability(
        id,
        req.body,
        organizationId,
        userId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in updateAvailability controller:', error);
      next(error);
    }
  };

  /**
   * Delete availability entry
   * DELETE /api/schedulehub/availability/:id
   */
  deleteAvailability = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const result = await this.availabilityService.deleteAvailability(
        id,
        organizationId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in deleteAvailability controller:', error);
      next(error);
    }
  };

  /**
   * Get worker availability
   * GET /api/schedulehub/workers/:workerId/availability
   */
  getWorkerAvailability = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { workerId } = req.params;
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        type: req.query.type,
        dayOfWeek: req.query.dayOfWeek ? parseInt(req.query.dayOfWeek) : undefined
      };

      const result = await this.availabilityService.getWorkerAvailability(
        workerId,
        organizationId,
        filters
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in getWorkerAvailability controller:', error);
      next(error);
    }
  };

  /**
   * Check if worker is available for specific time
   * GET /api/schedulehub/workers/:workerId/check-availability
   */
  checkAvailability = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { workerId } = req.params;
      const { date, startTime, endTime } = req.query;

      if (!date || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          error: 'date, startTime, and endTime are required'
        });
      }

      const result = await this.availabilityService.checkWorkerAvailable(
        workerId,
        organizationId,
        date,
        startTime,
        endTime
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in checkAvailability controller:', error);
      next(error);
    }
  };

  /**
   * Get available workers for a shift
   * GET /api/schedulehub/available-workers
   */
  getAvailableWorkers = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { date, startTime, endTime, roleId } = req.query;

      if (!date || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          error: 'date, startTime, and endTime are required'
        });
      }

      const result = await this.availabilityService.getAvailableWorkers(
        organizationId,
        date,
        startTime,
        endTime,
        roleId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in getAvailableWorkers controller:', error);
      next(error);
    }
  };

  /**
   * Create default availability for worker
   * POST /api/schedulehub/workers/:workerId/default-availability
   */
  createDefaultAvailability = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { workerId } = req.params;

      const result = await this.availabilityService.createDefaultAvailability(
        workerId,
        organizationId,
        userId
      );

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createDefaultAvailability controller:', error);
      next(error);
    }
  };
}

export default AvailabilityController;
