/**
 * LocationService
 * Business logic layer for location management
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class LocationService {
  constructor() {
    this.logger = logger;
  }

  /**
   * Create a new location
   */
  async createLocation(locationData, organizationId, userId) {
    try {
      this.logger.info('Creating location', { 
        organizationId, 
        userId,
        locationName: locationData.location_name 
      });

      if (!locationData.location_name) {
        throw new Error('Location name is required');
      }

      // Check if location name already exists
      const checkSql = `
        SELECT id FROM hris.location 
        WHERE location_name = $1 
          AND organization_id = $2 
          AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [locationData.location_name, organizationId], organizationId);

      if (checkResult.rows.length > 0) {
        throw new Error(`Location with name '${locationData.location_name}' already exists`);
      }

      const sql = `
        INSERT INTO hris.location (
          organization_id, location_name, location_code,
          address_line1, address_line2, city, state_province,
          postal_code, country, timezone, phone, email,
          is_primary, is_active, capacity, facilities,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
        RETURNING *
      `;

      const params = [
        organizationId,
        locationData.location_name,
        locationData.location_code || null,
        locationData.address_line1 || null,
        locationData.address_line2 || null,
        locationData.city || null,
        locationData.state_province || null,
        locationData.postal_code || null,
        locationData.country || null,
        locationData.timezone || 'UTC',
        locationData.phone || null,
        locationData.email || null,
        locationData.is_primary || false,
        locationData.is_active !== false,
        locationData.capacity || null,
        locationData.facilities ? JSON.stringify(locationData.facilities) : null,
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'create',
        table: 'hris.location'
      });

      this.logger.info('Location created successfully', { 
        locationId: result.rows[0].id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error creating location', { 
        error: error.message,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get location by ID
   */
  async getLocation(id, organizationId) {
    try {
      this.logger.debug('Getting location', { id, organizationId });

      const sql = `
        SELECT l.*,
               COUNT(DISTINCT e.id) as employee_count
        FROM hris.location l
        LEFT JOIN hris.employee e ON l.id = e.location_id AND e.deleted_at IS NULL
        WHERE l.id = $1 
          AND l.organization_id = $2
          AND l.deleted_at IS NULL
        GROUP BY l.id
      `;

      const result = await query(sql, [id, organizationId], organizationId, {
        operation: 'findById',
        table: 'hris.location'
      });
      
      if (result.rows.length === 0) {
        throw new Error('Location not found');
      }

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error getting location', { 
        error: error.message,
        id,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * List locations with optional filters
   */
  async listLocations(filters = {}, organizationId, options = {}) {
    try {
      this.logger.debug('Listing locations', { 
        filters,
        organizationId,
        options 
      });

      const { limit = 50, offset = 0 } = options;

      let sql = `
        SELECT l.*,
               COUNT(DISTINCT e.id) as employee_count
        FROM hris.location l
        LEFT JOIN hris.employee e ON l.id = e.location_id AND e.deleted_at IS NULL
        WHERE l.organization_id = $1 AND l.deleted_at IS NULL
      `;

      const params = [organizationId];
      let paramIndex = 2;

      if (filters.isActive !== undefined) {
        sql += ` AND l.is_active = $${paramIndex}`;
        params.push(filters.isActive);
        paramIndex++;
      }

      if (filters.country) {
        sql += ` AND l.country = $${paramIndex}`;
        params.push(filters.country);
        paramIndex++;
      }

      if (filters.stateProvince) {
        sql += ` AND l.state_province = $${paramIndex}`;
        params.push(filters.stateProvince);
        paramIndex++;
      }

      if (filters.city) {
        sql += ` AND l.city = $${paramIndex}`;
        params.push(filters.city);
        paramIndex++;
      }

      if (filters.isPrimary !== undefined) {
        sql += ` AND l.is_primary = $${paramIndex}`;
        params.push(filters.isPrimary);
        paramIndex++;
      }

      sql += ` GROUP BY l.id`;
      sql += ` ORDER BY l.is_primary DESC, l.location_name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params, organizationId, {
        operation: 'findAll',
        table: 'hris.location'
      });

      // Get total count
      let countSql = `
        SELECT COUNT(*) as count 
        FROM hris.location l
        WHERE l.organization_id = $1 AND l.deleted_at IS NULL
      `;

      const countParams = [organizationId];
      let countIndex = 2;

      if (filters.isActive !== undefined) {
        countSql += ` AND l.is_active = $${countIndex}`;
        countParams.push(filters.isActive);
        countIndex++;
      }

      if (filters.country) {
        countSql += ` AND l.country = $${countIndex}`;
        countParams.push(filters.country);
        countIndex++;
      }

      if (filters.stateProvince) {
        countSql += ` AND l.state_province = $${countIndex}`;
        countParams.push(filters.stateProvince);
        countIndex++;
      }

      if (filters.city) {
        countSql += ` AND l.city = $${countIndex}`;
        countParams.push(filters.city);
        countIndex++;
      }

      if (filters.isPrimary !== undefined) {
        countSql += ` AND l.is_primary = $${countIndex}`;
        countParams.push(filters.isPrimary);
        countIndex++;
      }

      const countResult = await query(countSql, countParams, organizationId, {
        operation: 'count',
        table: 'hris.location'
      });

      return {
        locations: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      };
    } catch (error) {
      this.logger.error('Error listing locations', { 
        error: error.message,
        filters,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Update location
   */
  async updateLocation(id, locationData, organizationId, userId) {
    try {
      this.logger.info('Updating location', { 
        id,
        organizationId,
        userId 
      });

      // Check if location exists
      const checkSql = `
        SELECT * FROM hris.location 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Location not found');
      }

      const existingLocation = checkResult.rows[0];

      // Check for duplicate name if name is being changed
      if (locationData.location_name && 
          locationData.location_name !== existingLocation.location_name) {
        const dupCheckSql = `
          SELECT id FROM hris.location 
          WHERE location_name = $1 
            AND organization_id = $2 
            AND id != $3
            AND deleted_at IS NULL
        `;
        const dupCheck = await query(dupCheckSql, [locationData.location_name, organizationId, id], organizationId);
        
        if (dupCheck.rows.length > 0) {
          throw new Error(`Location with name '${locationData.location_name}' already exists`);
        }
      }

      // Build update query dynamically
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const updateableFields = [
        'location_name', 'location_code', 'address_line1', 'address_line2',
        'city', 'state_province', 'postal_code', 'country', 'timezone',
        'phone', 'email', 'is_primary', 'is_active', 'capacity'
      ];

      updateableFields.forEach(field => {
        if (locationData[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push(locationData[field]);
          paramIndex++;
        }
      });

      // Handle JSON field
      if (locationData.facilities !== undefined) {
        updates.push(`facilities = $${paramIndex}`);
        params.push(JSON.stringify(locationData.facilities));
        paramIndex++;
      }

      if (updates.length === 0) {
        return existingLocation;
      }

      updates.push(`updated_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(id, organizationId);

      const sql = `
        UPDATE hris.location 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, params, organizationId, {
        operation: 'update',
        table: 'hris.location'
      });

      this.logger.info('Location updated successfully', { 
        id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error updating location', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Delete location (soft delete)
   */
  async deleteLocation(id, organizationId, userId) {
    try {
      this.logger.info('Deleting location', { 
        id,
        organizationId,
        userId 
      });

      // Check if location exists
      const checkSql = `
        SELECT id FROM hris.location 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Location not found');
      }

      // Check if location has employees
      const employeeCheckSql = `
        SELECT COUNT(*) as count FROM hris.employee 
        WHERE location_id = $1 
          AND organization_id = $2 
          AND deleted_at IS NULL
      `;
      const employeeCheck = await query(employeeCheckSql, [id, organizationId], organizationId);
      
      if (parseInt(employeeCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete location with active employees. Please reassign employees first.');
      }

      // Soft delete location
      const sql = `
        UPDATE hris.location 
        SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $3
        WHERE id = $1 AND organization_id = $2
      `;

      await query(sql, [id, organizationId, userId], organizationId, {
        operation: 'softDelete',
        table: 'hris.location'
      });

      this.logger.info('Location deleted successfully', { 
        id,
        organizationId 
      });

      return { success: true, message: 'Location deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting location', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get primary location for organization
   */
  async getPrimaryLocation(organizationId) {
    try {
      this.logger.debug('Getting primary location', { organizationId });

      const sql = `
        SELECT * FROM hris.location
        WHERE organization_id = $1 
          AND is_primary = true
          AND deleted_at IS NULL
        LIMIT 1
      `;

      const result = await query(sql, [organizationId], organizationId, {
        operation: 'findPrimary',
        table: 'hris.location'
      });

      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error getting primary location', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Set location as primary
   */
  async setPrimaryLocation(id, organizationId, userId) {
    try {
      this.logger.info('Setting primary location', { 
        id,
        organizationId,
        userId 
      });

      // Check if location exists
      const checkSql = `
        SELECT id FROM hris.location 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Location not found');
      }

      // Unset current primary location
      const unsetSql = `
        UPDATE hris.location 
        SET is_primary = false, updated_by = $2, updated_at = CURRENT_TIMESTAMP
        WHERE organization_id = $1 AND is_primary = true
      `;
      await query(unsetSql, [organizationId, userId], organizationId);

      // Set new primary location
      const setSql = `
        UPDATE hris.location 
        SET is_primary = true, updated_by = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND organization_id = $2
        RETURNING *
      `;
      const result = await query(setSql, [id, organizationId, userId], organizationId, {
        operation: 'update',
        table: 'hris.location'
      });

      this.logger.info('Primary location set successfully', { 
        id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error setting primary location', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }
}

export default LocationService;
