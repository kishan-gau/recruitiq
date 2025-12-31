/**
 * LocationService
 * Business logic layer for location management
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import type { LocationData, LocationSearchFilters } from '../../../types/nexus.types.js';

class LocationService {
  logger: typeof logger;
  
  
  
  logger: any;

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
          organization_id, location_name, location_code, location_type,
          address_line1, address_line2, city, state_province,
          postal_code, country, phone, email,
          is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        RETURNING *
      `;

      const params = [
        organizationId,
        locationData.location_name,
        locationData.location_code || null,
        locationData.location_type || 'branch',
        locationData.address_line1 || null,
        locationData.address_line2 || null,
        locationData.city || null,
        locationData.state_province || null,
        locationData.postal_code || null,
        locationData.country || null,
        locationData.phone || null,
        locationData.email || null,
        locationData.is_active !== false,
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
    } catch (_error) {
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
      this.logger.info('Getting location - DEBUG', { 
        id, 
        organizationId,
        expectedOrgId: '808d7b06-2011-4e9a-9ce0-2eebf27d8680',
        orgIdMatch: organizationId === '808d7b06-2011-4e9a-9ce0-2eebf27d8680'
      });

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
      
      this.logger.info('Location query result - DEBUG', {
        id,
        organizationId,
        rowCount: result.rows.length,
        foundLocation: result.rows.length > 0 ? result.rows[0].id : null
      });
      
      if (result.rows.length === 0) {
        // Let's also check if the location exists with any organization
        const checkSql = `
          SELECT l.id, l.organization_id, l.location_name, l.deleted_at
          FROM hris.location l
          WHERE l.id = $1
        `;
        const checkResult = await query(checkSql, [id], null, {
          operation: 'findById',
          table: 'hris.location'
        });
        
        this.logger.error('Location not found - additional info', {
          id,
          requestedOrgId: organizationId,
          locationExists: checkResult.rows.length > 0,
          actualLocation: checkResult.rows.length > 0 ? checkResult.rows[0] : null
        });
        
        throw new Error('Location not found');
      }

      return result.rows[0];
    } catch (_error) {
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
      
      // Handle custom ordering
      if (filters.orderBy === 'is_primary') {
        sql += ` ORDER BY l.is_primary DESC, l.location_name ASC`;
      } else {
        sql += ` ORDER BY l.location_name ASC`;
      }
      
      sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
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
    } catch (_error) {
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
        'location_name', 'location_code', 'location_type', 'address_line1', 'address_line2',
        'city', 'state_province', 'postal_code', 'country',
        'phone', 'email', 'is_active'
      ];

      updateableFields.forEach(field => {
        if (locationData[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push(locationData[field]);
          paramIndex++;
        }
      });

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
    } catch (_error) {
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
    } catch (_error) {
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
          AND is_active = true
          AND deleted_at IS NULL
        ORDER BY location_name ASC
        LIMIT 1
      `;

      const result = await query(sql, [organizationId], organizationId, {
        operation: 'findPrimary',
        table: 'hris.location'
      });

      return result.rows[0] || null;
    } catch (_error) {
      this.logger.error('Error getting primary location', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Set a location as primary
   */
  async setPrimaryLocation(locationId, organizationId, userId) {
    try {
      this.logger.info('Setting primary location', { 
        locationId, 
        organizationId,
        userId 
      });

      // Check if location exists
      const checkSql = `
        SELECT * FROM hris.location 
        WHERE id = $1 
          AND organization_id = $2 
          AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [locationId, organizationId], organizationId);

      if (checkResult.rows.length === 0) {
        throw new Error('Location not found');
      }

      // Unset current primary location(s)
      const unsetSql = `
        UPDATE hris.location 
        SET is_primary = false, 
            updated_by = $2, 
            updated_at = NOW()
        WHERE organization_id = $1 
          AND is_primary = true 
          AND deleted_at IS NULL
      `;
      await query(unsetSql, [organizationId, userId], organizationId);

      // Set new primary location
      const setSql = `
        UPDATE hris.location 
        SET is_primary = true, 
            updated_by = $1, 
            updated_at = NOW()
        WHERE id = $2 
          AND organization_id = $3 
          AND deleted_at IS NULL
        RETURNING *
      `;
      const result = await query(setSql, [userId, locationId, organizationId], organizationId);

      this.logger.info('Primary location set successfully', { 
        locationId, 
        organizationId 
      });

      return result.rows[0];
    } catch (_error) {
      this.logger.error('Error setting primary location', { 
        error: error.message,
        locationId,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get location by code
   */
  async getLocationByCode(code, organizationId) {
    try {
      this.logger.debug('Getting location by code', { code, organizationId });

      const sql = `
        SELECT l.*,
               COUNT(DISTINCT e.id) as employee_count
        FROM hris.location l
        LEFT JOIN hris.employee e ON l.id = e.location_id AND e.deleted_at IS NULL
        WHERE l.location_code = $1 
          AND l.organization_id = $2
          AND l.deleted_at IS NULL
        GROUP BY l.id
      `;

      const result = await query(sql, [code, organizationId], organizationId, {
        operation: 'findByCode',
        table: 'hris.location'
      });
      
      if (result.rows.length === 0) {
        throw new Error('Location not found');
      }

      return result.rows[0];
    } catch (_error) {
      this.logger.error('Error getting location by code', { 
        error: error.message,
        code,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get location statistics (employee count, departments, etc.)
   */
  async getLocationStats(id, organizationId) {
    try {
      this.logger.debug('Getting location statistics', { id, organizationId });

      // Check if location exists
      const checkSql = `
        SELECT id FROM hris.location 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Location not found');
      }

      const sql = `
        SELECT 
          COUNT(DISTINCT e.id) as total_employees,
          COUNT(DISTINCT e.id) FILTER (WHERE e.employee_status = 'active') as active_employees,
          COUNT(DISTINCT e.department_id) as departments,
          COUNT(DISTINCT e.id) FILTER (WHERE e.employment_type = 'full_time') as full_time_employees,
          COUNT(DISTINCT e.id) FILTER (WHERE e.employment_type = 'part_time') as part_time_employees,
          COUNT(DISTINCT e.id) FILTER (WHERE e.employment_type = 'contract') as contract_employees
        FROM hris.employee e
        WHERE e.location_id = $1 
          AND e.organization_id = $2
          AND e.deleted_at IS NULL
      `;

      const result = await query(sql, [id, organizationId], organizationId, {
        operation: 'getStats',
        table: 'hris.location'
      });

      return result.rows[0];
    } catch (_error) {
      this.logger.error('Error getting location statistics', { 
        error: error.message,
        id,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get all location statistics for organization
   */
  async getAllLocationStats(organizationId) {
    try {
      this.logger.debug('Getting all location statistics', { organizationId });

      const sql = `
        SELECT 
          l.id,
          l.location_name,
          l.location_code,
          l.is_active,
          COUNT(DISTINCT e.id) as total_employees,
          COUNT(DISTINCT e.id) FILTER (WHERE e.employee_status = 'active') as active_employees,
          COUNT(DISTINCT e.department_id) as departments
        FROM hris.location l
        LEFT JOIN hris.employee e ON l.id = e.location_id AND e.deleted_at IS NULL
        WHERE l.organization_id = $1
          AND l.deleted_at IS NULL
        GROUP BY l.id, l.location_name, l.location_code, l.is_active
        ORDER BY l.location_name ASC
      `;

      const result = await query(sql, [organizationId], organizationId, {
        operation: 'getAllStats',
        table: 'hris.location'
      });

      return result.rows;
    } catch (_error) {
      this.logger.error('Error getting all location statistics', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }
}

export default LocationService;
