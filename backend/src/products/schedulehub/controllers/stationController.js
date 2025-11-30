/**
 * ScheduleHub Station Controller
 * HTTP request handlers for station and role requirement management
 */

import StationService from '../services/stationService.js';
import logger from '../../../utils/logger.js';

class StationController {
  constructor() {
    this.stationService = new StationService();
  }

  /**
   * Create a new station
   * POST /api/schedulehub/stations
   */
  createStation = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      const result = await this.stationService.createStation(
        req.body,
        organizationId,
        userId
      );

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createStation controller:', error);
      next(error);
    }
  };

  /**
   * Update station
   * PATCH /api/schedulehub/stations/:id
   */
  updateStation = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { id } = req.params;

      const result = await this.stationService.updateStation(
        id,
        req.body,
        organizationId,
        userId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in updateStation controller:', error);
      next(error);
    }
  };

  /**
   * List stations
   * GET /api/schedulehub/stations
   */
  listStations = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { isActive, locationId } = req.query;

      const stations = await this.stationService.listStations(
        organizationId,
        isActive === 'true',
        locationId
      );

      res.json({ success: true, stations });
    } catch (error) {
      logger.error('Error in listStations controller:', error);
      next(error);
    }
  };

  /**
   * Get station by ID
   * GET /api/schedulehub/stations/:id
   */
  getStationById = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const station = await this.stationService.getStationById(id, organizationId);

      if (!station) {
        return res.status(404).json({
          success: false,
          error: 'Station not found',
          errorCode: 'STATION_NOT_FOUND'
        });
      }

      res.json({ success: true, station });
    } catch (error) {
      logger.error('Error in getStationById controller:', error);
      next(error);
    }
  };

  /**
   * Get station requirements
   * GET /api/schedulehub/stations/:id/requirements
   */
  getStationRequirements = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const result = await this.stationService.getStationRequirements(
        id,
        organizationId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in getStationRequirements controller:', error);
      next(error);
    }
  };

  /**
   * Add role requirement to station
   * POST /api/schedulehub/stations/:stationId/requirements
   */
  addRequirement = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { stationId } = req.params;
      const { roleId, minWorkers, maxWorkers, priority } = req.body;

      const result = await this.stationService.addRoleRequirement(
        stationId,
        roleId,
        organizationId,
        minWorkers,
        maxWorkers,
        priority,
        userId
      );

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in addRequirement controller:', error);
      next(error);
    }
  };

  /**
   * Update role requirement
   * PATCH /api/schedulehub/stations/:stationId/requirements/:roleId
   */
  updateRequirement = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { stationId, roleId } = req.params;
      const { minWorkers, maxWorkers, priority } = req.body;

      // Remove and re-add requirement
      await this.stationService.removeRoleRequirement(
        stationId,
        roleId,
        organizationId
      );

      const result = await this.stationService.addRoleRequirement(
        stationId,
        roleId,
        organizationId,
        minWorkers,
        maxWorkers,
        priority,
        userId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in updateRequirement controller:', error);
      next(error);
    }
  };

  /**
   * Remove role requirement from station
   * DELETE /api/schedulehub/stations/:stationId/requirements/:roleId
   */
  removeRequirement = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { stationId, roleId } = req.params;

      const result = await this.stationService.removeRoleRequirement(
        stationId,
        roleId,
        organizationId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in removeRequirement controller:', error);
      next(error);
    }
  };
}

export default StationController;
