/**
 * Geofencing Admin Controller
 * Handles location geofencing configuration for administrators
 */
import GeofencingService from '../../../services/geofencingService.js';
import logger from '../../../utils/logger.js';
class GeofencingAdminController {
    constructor() {
        /**
         * Get geofencing configuration for a location
         * GET /api/products/nexus/locations/:locationId/geofence
         */
        this.getLocationGeofence = async (req, res) => {
            try {
                const { organizationId } = req.user;
                const { locationId } = req.params;
                const config = await this.service.getLocationGeofenceConfig(locationId, organizationId);
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
            }
            catch (error) {
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
        this.updateLocationGeofence = async (req, res) => {
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
                // Validate and parse numeric values
                let parsedLatitude;
                let parsedLongitude;
                let parsedRadiusMeters;
                if (enabled) {
                    parsedLatitude = parseFloat(latitude);
                    parsedLongitude = parseFloat(longitude);
                    parsedRadiusMeters = parseFloat(radiusMeters); // Use parseFloat instead of parseInt for decimal precision
                    // Validate parsed values
                    if (isNaN(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
                        return res.status(400).json({
                            success: false,
                            error: 'Latitude must be a valid number between -90 and 90',
                        });
                    }
                    if (isNaN(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
                        return res.status(400).json({
                            success: false,
                            error: 'Longitude must be a valid number between -180 and 180',
                        });
                    }
                    // Use parseFloat for radius to preserve decimal precision
                    if (isNaN(parsedRadiusMeters) || parsedRadiusMeters <= 0 || parsedRadiusMeters > 100000) {
                        return res.status(400).json({
                            success: false,
                            error: 'Radius must be a valid number between 1 and 100000 meters',
                        });
                    }
                }
                const result = await this.service.updateLocationGeofence(locationId, organizationId, {
                    enabled,
                    latitude: parsedLatitude,
                    longitude: parsedLongitude,
                    radiusMeters: parsedRadiusMeters, // Now properly preserves decimal precision
                    strict: strict || false,
                }, userId);
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
            }
            catch (error) {
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
        this.testGeofence = async (req, res) => {
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
                // Validate and parse coordinates
                const parsedLatitude = parseFloat(latitude);
                const parsedLongitude = parseFloat(longitude);
                if (isNaN(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
                    return res.status(400).json({
                        success: false,
                        error: 'Latitude must be a valid number between -90 and 90',
                    });
                }
                if (isNaN(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
                    return res.status(400).json({
                        success: false,
                        error: 'Longitude must be a valid number between -180 and 180',
                    });
                }
                // Get location geofence config
                const config = await this.service.getLocationGeofenceConfig(locationId, organizationId);
                if (!config || !config.enabled) {
                    return res.status(400).json({
                        success: false,
                        error: 'Geofencing is not enabled for this location',
                    });
                }
                // Test the coordinates
                const result = this.service.isWithinGeofence({ latitude: parsedLatitude, longitude: parsedLongitude }, { latitude: config.latitude, longitude: config.longitude }, config.radiusMeters);
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
            }
            catch (error) {
                this.logger.error('Error testing geofence:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        };
        this.service = new GeofencingService();
        this.logger = logger;
    }
}
export default GeofencingAdminController;
