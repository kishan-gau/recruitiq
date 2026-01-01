/**
 * Geofencing Admin Controller
 * Handles location geofencing configuration for administrators
 */

import GeofencingService from '../../../services/geofencingService.js';
import logger from '../../../utils/logger.js';

class GeofencingAdminController {
  private service: GeofencingService;
  private logger: typeof logger;
  
  constructor() {
    this.service = new GeofencingService();
    this.logger = logger;
  }
  
  /**
   * Get geofencing configuration for a location
   * GET /api/products/nexus/locations/:locationId/geofence
   */
  getLocationGeofence = async (req: any, res: any) => {
    try {
      const { organizationId } = req.user;
      const { locationId } = req.params;
      
      const config = await this.service.getLocationGeofenceConfig(
        locationId,
        organizationId
      );
      
      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Location not found',
        });
      }
      
      res.json({
        success: true,
        geofence: config,
      });
    } catch (error: any) {
      this.logger.error('Error fetching geofence config:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };
  
  /**
   * Update geofencing configuration for a location
   * PUT /api/products/nexus/locations/:locationId/geofence
   */
  updateLocationGeofence = async (req: any, res: any) => {
    try {
      const { organizationId, userId } = req.user;
      const { locationId } = req.params;
      const { enabled, latitude, longitude, radiusMeters, strict } = req.body;
      
      // Validate required fields when enabling
      if (enabled && (!latitude || !longitude || !radiusMeters)) {
        return res.status(400).json({
          success: false,
          error: 'Latitude, longitude, and radius are required when enabling geofencing',
        });
      }
      
      const result = await this.service.updateLocationGeofence(
        locationId,
        organizationId,
        {
          enabled,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radiusMeters: parseInt(radiusMeters),
          strict: strict || false,
        },
        userId
      );
      
      res.json({
        success: true,
        location: {
          id: result.id,
          locationName: result.location_name,
          geofencingEnabled: result.geofencing_enabled,
          geofenceLatitude: result.geofence_latitude,
          geofenceLongitude: result.geofence_longitude,
          geofenceRadiusMeters: result.geofence_radius_meters,
          strictGeofencing: result.strict_geofencing,
        },
      });
    } catch (error: any) {
      this.logger.error('Error updating geofence config:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };
  
  /**
   * Test geofencing validation (for testing)
   * POST /api/products/nexus/locations/:locationId/geofence/test
   */
  testGeofence = async (req: any, res: any) => {
    try {
      const { organizationId } = req.user;
      const { locationId } = req.params;
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required',
        });
      }
      
      // Get location geofence config
      const config = await this.service.getLocationGeofenceConfig(
        locationId,
        organizationId
      );
      
      if (!config || !config.enabled) {
        return res.status(400).json({
          success: false,
          error: 'Geofencing is not enabled for this location',
        });
      }
      
      // Test the coordinates
      const result = this.service.isWithinGeofence(
        { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
        { latitude: config.latitude, longitude: config.longitude },
        config.radiusMeters
      );
      
      res.json({
        success: true,
        test: {
          testLocation: { latitude, longitude },
          geofenceCenter: {
            latitude: config.latitude,
            longitude: config.longitude,
          },
          radiusMeters: config.radiusMeters,
          distance: result.distance,
          withinGeofence: result.withinGeofence,
          wouldAllow: config.strict ? result.withinGeofence : true,
        },
      });
    } catch (error: any) {
      this.logger.error('Error testing geofence:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };
}

export default GeofencingAdminController;
