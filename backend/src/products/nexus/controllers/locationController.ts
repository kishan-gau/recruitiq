/**
 * LocationController
 * HTTP request handlers for location management
 */

import LocationService from '../services/locationService.js';
import { mapLocationApiToDb, mapLocationDbToApi, mapLocationsDbToApi } from '../dto/locationDto.js';
import logger from '../../../utils/logger.js';

class LocationController {
  constructor() {
    this.service = new LocationService();
    this.logger = logger;
  }

  /**
   * Create location
   * POST /api/nexus/locations
   */
  createLocation = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      
      // Transform API data (camelCase) to database format (snake_case)
      const dbData = mapLocationApiToDb(req.body);
      
      const location = await this.service.createLocation(dbData, organizationId, userId);
      
      // Transform database response back to API format
      const apiLocation = mapLocationDbToApi(location);
      
      res.status(201).json({ success: true, location: apiLocation });
    } catch (error) {
      this.logger.error('Error in createLocation controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Get location by ID
   * GET /api/nexus/locations/:id
   */
  getLocation = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { id } = req.params;
      const location = await this.service.getLocation(id, organizationId);
      
      // Transform database response to API format
      const apiLocation = mapLocationDbToApi(location);
      
      res.json({ success: true, location: apiLocation });
    } catch (error) {
      this.logger.error('Error in getLocation controller', { error: error.message });
      const status = error.message === 'Location not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Update location
   * PATCH /api/nexus/locations/:id
   */
  updateLocation = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { id } = req.params;
      
      // Transform API data to database format
      const dbData = mapLocationApiToDb(req.body);
      
      const location = await this.service.updateLocation(id, dbData, organizationId, userId);
      
      // Transform database response to API format
      const apiLocation = mapLocationDbToApi(location);
      
      res.json({ success: true, location: apiLocation });
    } catch (error) {
      this.logger.error('Error in updateLocation controller', { error: error.message });
      const status = error.message === 'Location not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Delete location
   * DELETE /api/nexus/locations/:id
   */
  deleteLocation = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { id } = req.params;
      await this.service.deleteLocation(id, organizationId, userId);
      res.json({ success: true, message: 'Location deleted successfully' });
    } catch (error) {
      this.logger.error('Error in deleteLocation controller', { error: error.message });
      const status = error.message === 'Location not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Get all locations
   * GET /api/nexus/locations
   */
  getLocations = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { type, isActive, limit = 50, offset = 0 } = req.query;

      const filters = {};
      if (type) filters.type = type;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      
      const options = {
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const result = await this.service.listLocations(filters, organizationId, options);
      
      // Transform database response to API format
      const apiLocations = mapLocationsDbToApi(result.locations);
      
      res.json({ 
        success: true, 
        data: apiLocations, 
        meta: { 
          total: result.total, 
          limit: result.limit, 
          offset: result.offset 
        } 
      });
    } catch (error) {
      this.logger.error('Error in getLocations controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get location by code
   * GET /api/nexus/locations/code/:code
   */
  getLocationByCode = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { code } = req.params;
      const location = await this.service.getLocationByCode(code, organizationId);
      
      // Transform database response to API format
      const apiLocation = mapLocationDbToApi(location);
      
      res.json({ success: true, location: apiLocation });
    } catch (error) {
      this.logger.error('Error in getLocationByCode controller', { error: error.message });
      const status = error.message === 'Location not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Get location statistics
   * GET /api/nexus/locations/:id/stats
   */
  getLocationStats = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { id } = req.params;
      const stats = await this.service.getLocationStats(id, organizationId);
      res.json({ success: true, stats });
    } catch (error) {
      this.logger.error('Error in getLocationStats controller', { error: error.message });
      const status = error.message === 'Location not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Get all location statistics
   * GET /api/nexus/locations/stats/all
   */
  getAllLocationStats = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const stats = await this.service.getAllLocationStats(organizationId);
      res.json({ success: true, stats });
    } catch (error) {
      this.logger.error('Error in getAllLocationStats controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

export default LocationController;
