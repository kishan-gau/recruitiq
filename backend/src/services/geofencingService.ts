/**
 * Geofencing Service
 * Validates employee location for clock-in restrictions
 * Uses Haversine formula for distance calculation
 */

import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import * as Joi from 'joi';

interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

interface GeofenceConfig {
  enabled: boolean;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  strict: boolean;
  locationName?: string;
}

interface GeofenceValidationResult {
  allowed: boolean;
  distance?: number;
  withinGeofence: boolean;
  geofenceConfig?: GeofenceConfig;
  warningMessage?: string;
  errorMessage?: string;
}

class GeofencingService {
  private logger: typeof logger;
  
  constructor() {
    this.logger = logger;
  }
  
  /**
   * Validation schemas
   */
  static locationSchema = Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  });
  
  static geofenceConfigSchema = Joi.object({
    enabled: Joi.boolean().required(),
    latitude: Joi.number().min(-90).max(90).when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    longitude: Joi.number().min(-180).max(180).when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    radiusMeters: Joi.number().min(1).max(100000).when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    strict: Joi.boolean().optional().default(false),
    locationId: Joi.string().uuid().optional(),
  });
  
  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in meters
   */
  private calculateDistance(
    coord1: LocationCoordinates,
    coord2: LocationCoordinates
  ): number {
    const R = 6371000; // Earth's radius in meters
    
    const lat1Rad = this.toRadians(coord1.latitude);
    const lat2Rad = this.toRadians(coord2.latitude);
    const deltaLatRad = this.toRadians(coord2.latitude - coord1.latitude);
    const deltaLonRad = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLonRad / 2) *
        Math.sin(deltaLonRad / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance); // Round to nearest meter
  }
  
  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Get geofencing configuration for a location
   */
  async getLocationGeofenceConfig(
    locationId: string,
    organizationId: string
  ): Promise<GeofenceConfig | null> {
    try {
      const locationQuery = `
        SELECT 
          location_name,
          geofencing_enabled,
          geofence_latitude,
          geofence_longitude,
          geofence_radius_meters,
          strict_geofencing
        FROM hris.location
        WHERE id = $1 
          AND organization_id = $2
          AND is_active = true
          AND deleted_at IS NULL
      `;
      
      const result = await query(
        locationQuery,
        [locationId, organizationId],
        organizationId
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const location = result.rows[0];
      
      if (!location.geofencing_enabled) {
        return {
          enabled: false,
          latitude: 0,
          longitude: 0,
          radiusMeters: 0,
          strict: false,
          locationName: location.location_name,
        };
      }
      
      return {
        enabled: location.geofencing_enabled,
        latitude: parseFloat(location.geofence_latitude),
        longitude: parseFloat(location.geofence_longitude),
        radiusMeters: location.geofence_radius_meters,
        strict: location.strict_geofencing,
        locationName: location.location_name,
      };
    } catch (error: any) {
      this.logger.error('Error fetching geofence config:', error);
      throw error;
    }
  }
  
  /**
   * Get geofencing configuration for employee's primary location
   */
  async getEmployeeGeofenceConfig(
    employeeId: string,
    organizationId: string
  ): Promise<GeofenceConfig | null> {
    try {
      // Get employee's primary location
      const employeeQuery = `
        SELECT l.id as location_id
        FROM hris.employee e
        LEFT JOIN hris.location l ON e.location_id = l.id
        WHERE e.id = $1 
          AND e.organization_id = $2
          AND e.deleted_at IS NULL
      `;
      
      const result = await query(
        employeeQuery,
        [employeeId, organizationId],
        organizationId
      );
      
      if (result.rows.length === 0 || !result.rows[0].location_id) {
        // No location assigned to employee
        return null;
      }
      
      const locationId = result.rows[0].location_id;
      return await this.getLocationGeofenceConfig(locationId, organizationId);
    } catch (error: any) {
      this.logger.error('Error fetching employee geofence config:', error);
      throw error;
    }
  }
  
  /**
   * Validate employee location against geofence
   */
  async validateClockInLocation(
    employeeId: string,
    organizationId: string,
    employeeLocation?: LocationCoordinates
  ): Promise<GeofenceValidationResult> {
    try {
      // Get geofence configuration
      const geofenceConfig = await this.getEmployeeGeofenceConfig(
        employeeId,
        organizationId
      );
      
      // If no geofencing configured, allow clock-in
      if (!geofenceConfig || !geofenceConfig.enabled) {
        return {
          allowed: true,
          withinGeofence: true,
          geofenceConfig: geofenceConfig || undefined,
        };
      }
      
      // If no location provided, handle based on strict mode
      if (!employeeLocation) {
        if (geofenceConfig.strict) {
          return {
            allowed: false,
            withinGeofence: false,
            geofenceConfig,
            errorMessage: 'Location required for clock-in at this location',
          };
        } else {
          return {
            allowed: true,
            withinGeofence: false,
            geofenceConfig,
            warningMessage: 'Clock-in allowed without location verification',
          };
        }
      }
      
      // Validate location format
      await GeofencingService.locationSchema.validateAsync(employeeLocation);
      
      // Calculate distance from geofence center
      const distance = this.calculateDistance(
        {
          latitude: geofenceConfig.latitude,
          longitude: geofenceConfig.longitude,
        },
        employeeLocation
      );
      
      // GPS_ACCURACY_BUFFER: Typical GPS accuracy is 5-10m
      // Consider adding small tolerance for GPS precision issues
      // For now, using exact distance for strict enforcement
      // Future enhancement: Make buffer configurable per location
      const GPS_ACCURACY_BUFFER = 0; // Can be increased to 5-10m if needed
      const withinGeofence = distance <= (geofenceConfig.radiusMeters + GPS_ACCURACY_BUFFER);
      
      // Log the validation
      this.logger.info('Geofence validation', {
        employeeId,
        organizationId,
        distance,
        radiusMeters: geofenceConfig.radiusMeters,
        withinGeofence,
        strict: geofenceConfig.strict,
        locationName: geofenceConfig.locationName,
      });
      
      // Determine if clock-in is allowed
      if (withinGeofence) {
        return {
          allowed: true,
          distance,
          withinGeofence: true,
          geofenceConfig,
        };
      } else {
        // Outside geofence
        if (geofenceConfig.strict) {
          return {
            allowed: false,
            distance,
            withinGeofence: false,
            geofenceConfig,
            errorMessage: `You must be within ${geofenceConfig.radiusMeters}m of ${geofenceConfig.locationName || 'the work location'} to clock in. Current distance: ${distance}m`,
          };
        } else {
          // Non-strict mode: allow but warn
          return {
            allowed: true,
            distance,
            withinGeofence: false,
            geofenceConfig,
            warningMessage: `Clock-in recorded outside designated area. Distance: ${distance}m from ${geofenceConfig.locationName || 'work location'}`,
          };
        }
      }
    } catch (error: any) {
      this.logger.error('Error validating clock-in location:', error);
      
      // SECURITY NOTE: Fail-safe mechanism for production
      // Consider implementing:
      // - Circuit breaker pattern to detect systematic failures
      // - Manual approval queue for failed validations
      // - Alerts to administrators when validation fails
      // - Rate limiting to prevent exploitation
      // Current fail-safe allows clock-in to avoid blocking legitimate users
      // but logs error for investigation
      
      // On error, fail safe based on environment
      if (process.env.NODE_ENV === 'production') {
        // In production, allow but log error
        this.logger.warn('Geofencing validation failed, allowing clock-in', {
          employeeId,
          organizationId,
          error: error.message,
        });
        
        return {
          allowed: true,
          withinGeofence: false,
          warningMessage: 'Location validation temporarily unavailable',
        };
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Update geofencing configuration for a location
   */
  async updateLocationGeofence(
    locationId: string,
    organizationId: string,
    config: {
      enabled: boolean;
      latitude?: number;
      longitude?: number;
      radiusMeters?: number;
      strict?: boolean;
    },
    userId: string
  ) {
    try {
      // Validate config
      await GeofencingService.geofenceConfigSchema.validateAsync({
        ...config,
        locationId,
      });
      
      // Build update query
      const updateQuery = `
        UPDATE hris.location
        SET 
          geofencing_enabled = $1,
          geofence_latitude = $2,
          geofence_longitude = $3,
          geofence_radius_meters = $4,
          strict_geofencing = $5,
          updated_by = $6,
          updated_at = NOW()
        WHERE id = $7 AND organization_id = $8
        RETURNING *
      `;
      
      const params = [
        config.enabled,
        config.enabled ? config.latitude : null,
        config.enabled ? config.longitude : null,
        config.enabled ? config.radiusMeters : null,
        config.strict || false,
        userId,
        locationId,
        organizationId,
      ];
      
      const result = await query(updateQuery, params, organizationId, {
        operation: 'UPDATE',
        table: 'hris.location',
      });
      
      if (result.rows.length === 0) {
        throw new Error('Location not found');
      }
      
      this.logger.info('Geofencing configuration updated', {
        locationId,
        organizationId,
        enabled: config.enabled,
        strict: config.strict,
        updatedBy: userId,
      });
      
      return result.rows[0];
    } catch (error: any) {
      this.logger.error('Error updating geofence config:', error);
      throw error;
    }
  }
  
  /**
   * Test if coordinates are within a geofence (utility method)
   */
  isWithinGeofence(
    employeeLocation: LocationCoordinates,
    geofenceCenter: LocationCoordinates,
    radiusMeters: number
  ): { withinGeofence: boolean; distance: number } {
    const distance = this.calculateDistance(geofenceCenter, employeeLocation);
    return {
      withinGeofence: distance <= radiusMeters,
      distance,
    };
  }
}

export default GeofencingService;
