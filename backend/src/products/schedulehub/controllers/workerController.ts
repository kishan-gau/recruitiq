/**
 * ScheduleHub Worker Controller
 * HTTP request handlers for worker management
 */

import WorkerService from '../services/workerService.js';
import logger from '../../../utils/logger.js';

class WorkerController {
  constructor() {
    this.workerService = new WorkerService();
  }

  /**
   * Create a new worker
   * POST /api/schedulehub/workers
   */
  createWorker = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      const result = await this.workerService.createWorker(
        req.body,
        organizationId,
        userId
      );

      res.status(201).json(result);
    } catch (_error) {
      logger.error('Error in createWorker controller:', error);
      next(error);
    }
  };

  /**
   * Get worker by ID
   * GET /api/schedulehub/workers/:id
   */
  getWorkerById = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const worker = await this.workerService.getWorkerById(id, organizationId);

      if (!worker) {
        return res.status(404).json({
          success: false,
          error: 'Worker not found'
        });
      }

      res.json({
        success: true,
        data: worker
      });
    } catch (_error) {
      logger.error('Error in getWorkerById controller:', error);
      next(error);
    }
  };

  /**
   * Get worker by employee ID
   * GET /api/schedulehub/workers/employee/:employeeId
   */
  getWorkerByEmployeeId = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { employeeId } = req.params;

      const worker = await this.workerService.getWorkerByEmployeeId(
        employeeId,
        organizationId
      );

      if (!worker) {
        return res.status(404).json({
          success: false,
          error: 'Worker not found'
        });
      }

      res.json({
        success: true,
        data: worker
      });
    } catch (_error) {
      logger.error('Error in getWorkerByEmployeeId controller:', error);
      next(error);
    }
  };

  /**
   * List workers with filters
   * GET /api/schedulehub/workers
   */
  listWorkers = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const filters = {
        status: req.query.status,
        departmentId: req.query.departmentId,
        locationId: req.query.locationId,
        employmentType: req.query.employmentType,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const result = await this.workerService.listWorkers(organizationId, filters);

      // Transform response to use resource-specific key format
      res.json({
        success: result.success,
        workers: result.data,  // Use 'workers' key instead of 'data'
        pagination: result.pagination
      });
    } catch (_error) {
      logger.error('Error in listWorkers controller:', error);
      next(error);
    }
  };

  /**
   * Update worker
   * PATCH /api/schedulehub/workers/:id
   */
  updateWorker = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { id } = req.params;

      const result = await this.workerService.updateWorker(
        id,
        req.body,
        organizationId,
        userId
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in updateWorker controller:', error);
      next(error);
    }
  };

  /**
   * Terminate worker
   * POST /api/schedulehub/workers/:id/terminate
   */
  terminateWorker = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { id } = req.params;
      const { terminationDate } = req.body;

      const result = await this.workerService.terminateWorker(
        id,
        organizationId,
        terminationDate,
        userId
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in terminateWorker controller:', error);
      next(error);
    }
  };

  /**
   * Get worker availability summary
   * GET /api/schedulehub/workers/:id/availability
   */
  getAvailabilitySummary = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
      }

      const result = await this.workerService.getWorkerAvailabilitySummary(
        id,
        organizationId,
        startDate,
        endDate
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in getAvailabilitySummary controller:', error);
      next(error);
    }
  };

  /**
   * Get worker shift history
   * GET /api/schedulehub/workers/:id/shifts
   */
  getShiftHistory = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status,
        limit: parseInt(req.query.limit) || 50
      };

      const result = await this.workerService.getWorkerShiftHistory(
        id,
        organizationId,
        filters
      );

      res.json(result);
    } catch (_error) {
      logger.error('Error in getShiftHistory controller:', error);
      next(error);
    }
  };
}

export default WorkerController;
