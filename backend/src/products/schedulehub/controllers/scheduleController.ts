/**
 * ScheduleHub Schedule Controller
 * HTTP request handlers for schedule and shift management
 */

import ScheduleService from '../services/scheduleService.js';
import logger from '../../../utils/logger.js';

class ScheduleController {
  constructor() {
    this.scheduleService = new ScheduleService();
  }

  /**
   * Create a new schedule
   * POST /api/schedulehub/schedules
   */
  createSchedule = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      const schedule = await this.scheduleService.createSchedule(
        req.body,
        organizationId,
        userId
      );

      res.status(201).json({
        success: true,
        schedule
      });
    } catch (_error) {
      logger.error('Error in createSchedule controller:', error);
      next(error);
    }
  };

  /**
   * Auto-generate schedule with shifts based on availability and templates
   * POST /api/schedulehub/schedules/auto-generate
   */
  autoGenerateSchedule = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      // Extract options from request body
      const { allowPartialTime, ...scheduleData } = req.body;
      const options = { allowPartialTime: allowPartialTime || false };

      const result = await this.scheduleService.autoGenerateSchedule(
        scheduleData,
        organizationId,
        userId,
        options
      );

      res.status(201).json({
        success: true,
        schedule: result.schedule,
        generationSummary: result.generationSummary
      });
    } catch (_error) {
      logger.error('Error in autoGenerateSchedule controller:', error);
      next(error);
    }
  };

  /**
   * Get schedule by ID
   * GET /api/schedulehub/schedules/:id
   */
  getScheduleById = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;
      const includeShifts = req.query.includeShifts === 'true';

      const result = await this.scheduleService.getScheduleById(
        id,
        organizationId,
        includeShifts
      );

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found'
        });
      }

      // Return consistent API response format
      res.json({
        success: true,
        schedule: result.data.schedule,
        shifts: includeShifts ? result.data.shifts : undefined
      });
    } catch (_error) {
      logger.error('Error in getScheduleById controller:', error);
      next(error);
    }
  };

  /**
   * Update and regenerate schedule with new template configuration
   * PUT /api/schedulehub/schedules/:id/regenerate
   */
  regenerateSchedule = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { id } = req.params;

      const result = await this.scheduleService.updateScheduleGeneration(
        id,
        req.body,
        organizationId,
        userId
      );

      // Handle conflict response
      if (!result.success && result.code === 'SHIFT_CONFLICT') {
        return res.status(409).json({
          success: false,
          error: result.error,
          conflicts: result.conflicts,
          code: result.code
        });
      }

      // Return successful regeneration
      res.json({
        success: true,
        schedule: result.schedule,
        generationSummary: result.generationSummary
      });
    } catch (_error) {
      logger.error('Error in regenerateSchedule controller:', error);
      
      // Handle validation errors
      if (error.message.includes('Validation error')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          code: 'VALIDATION_ERROR'
        });
      }
      
      // Handle business logic errors
      if (error.message.includes('not found') || 
          error.message.includes('Cannot regenerate')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          code: 'BUSINESS_LOGIC_ERROR'
        });
      }
      
      next(error);
    }
  };

  /**
   * List schedules with filters
   * GET /api/schedulehub/schedules
   */
  listSchedules = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const filters = {
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await this.scheduleService.listSchedules(
        organizationId,
        filters
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in listSchedules controller:', error);
      next(error);
    }
  };

  /**
   * Create a shift
   * POST /api/schedulehub/schedules/:scheduleId/shifts
   */
  createShift = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { scheduleId } = req.params;

      const result = await this.scheduleService.createShift(
        { ...req.body, scheduleId },
        organizationId,
        userId
      );

      res.status(201).json(result);
    } catch (_error) {
      logger.error('Error in createShift controller:', error);
      next(error);
    }
  };

  /**
   * Update a shift
   * PATCH /api/schedulehub/shifts/:id
   */
  updateShift = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { id } = req.params;

      const result = await this.scheduleService.updateShift(
        id,
        req.body,
        organizationId,
        userId
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in updateShift controller:', error);
      next(error);
    }
  };

  /**
   * Cancel a shift
   * POST /api/schedulehub/shifts/:id/cancel
   */
  cancelShift = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { id } = req.params;
      const { cancellationReason } = req.body;

      const result = await this.scheduleService.cancelShift(
        id,
        organizationId,
        cancellationReason,
        userId
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in cancelShift controller:', error);
      next(error);
    }
  };

  /**
   * Assign worker to shift
   * POST /api/schedulehub/shifts/:id/assign
   */
  assignWorker = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { id } = req.params;
      const { workerId } = req.body;

      const result = await this.scheduleService.assignWorkerToShift(
        id,
        workerId,
        organizationId,
        userId
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in assignWorker controller:', error);
      next(error);
    }
  };

  /**
   * Unassign worker from shift
   * POST /api/schedulehub/shifts/:id/unassign
   */
  unassignWorker = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { id } = req.params;

      const result = await this.scheduleService.unassignWorkerFromShift(
        id,
        organizationId,
        userId
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in unassignWorker controller:', error);
      next(error);
    }
  };

  /**
   * Publish schedule
   * POST /api/schedulehub/schedules/:id/publish
   */
  publishSchedule = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { id } = req.params;

      const result = await this.scheduleService.publishSchedule(
        id,
        organizationId,
        userId
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in publishSchedule controller:', error);
      next(error);
    }
  };

  /**
   * Clock in to shift
   * POST /api/schedulehub/shifts/:id/clock-in
   */
  clockIn = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const result = await this.scheduleService.clockIn(id, organizationId);

      res.json(result);
    } catch (_error) {
      logger.error('Error in clockIn controller:', error);
      next(error);
    }
  };

  /**
   * Get worker shifts by date range
   * GET /api/schedulehub/workers/:workerId/shifts
   */
  getWorkerShifts = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { workerId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
      }

      const result = await this.scheduleService.getWorkerShifts(
        workerId,
        organizationId,
        startDate,
        endDate
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in getWorkerShifts controller:', error);
      next(error);
    }
  };

  /**
   * Get all shifts with optional filtering
   * GET /api/schedulehub/shifts
   */
  getAllShifts = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { date, stationId, status } = req.query;
      
      const result = await this.scheduleService.getAllShifts(
        organizationId,
        { date, stationId, status }
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in getAllShifts controller:', error);
      next(error);
    }
  };

  /**
   * Get station coverage statistics for timeline visualization
   * GET /api/schedulehub/stations/coverage/stats
   */
  getStationCoverageStats = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      
      const result = await this.scheduleService.getStationCoverageStats(
        organizationId,
        date
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in getStationCoverageStats controller:', error);
      next(error);
    }
  };
}

export default ScheduleController;
