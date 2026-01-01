/**
 * LocationRepository
 * Data access layer for location records
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import { mapDbToApi, mapApiToDb } from '../../../utils/dtoMapper.js';

class LocationRepository {
  
  logger: any;

  query: any;

  tableName: string;

constructor(database = null) {
    this.query = database?.query || query;
    this.tableName = 'hris.location';
    this.logger = logger;
  }

  /**
   * Find location by ID
   */
  async findById(id, organizationId) {
    try {
      const sql = `
        SELECT l.*,
               (SELECT COUNT(*) FROM hris.employee WHERE location_id = l.id AND deleted_at IS NULL) as employee_count
        FROM ${this.tableName} l
        WHERE l.id = $1 
          AND l.organization_id = $2
          AND l.deleted_at IS NULL
      `;

      const result = await this.query(sql, [id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding location by ID', { id, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find all locations
   */
  async findAll(filters = {}, organizationId, options = {}) {
    try {
      const { limit = 100, offset = 0, orderBy = 'l.location_name ASC' } = options;

      let sql = `
        SELECT l.*,
               (SELECT COUNT(*) FROM hris.employee WHERE location_id = l.id AND deleted_at IS NULL) as employee_count
        FROM ${this.tableName} l
        WHERE l.organization_id = $1 AND l.deleted_at IS NULL
      `;

      const params = [organizationId];
      let paramIndex = 2;

      if (filters.isActive !== undefined) {
        sql += ` AND l.is_active = $${paramIndex}`;
        params.push(filters.isActive);
        paramIndex++;
      }

      if (filters.locationType) {
        sql += ` AND l.location_type = $${paramIndex}`;
        params.push(filters.locationType);
        paramIndex++;
      }

      if (filters.country) {
        sql += ` AND l.country = $${paramIndex}`;
        params.push(filters.country);
        paramIndex++;
      }

      sql += ` ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.query(sql, params, organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding all locations', { filters, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find by location code
   */
  async findByCode(locationCode, organizationId) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE location_code = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
      `;

      const result = await this.query(sql, [locationCode, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding location by code', { locationCode, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Create location
   */
  async create(locationData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(locationData);

      const sql = `
        INSERT INTO ${this.tableName} (
          organization_id, location_code, location_name, location_type,
          address_line1, address_line2, city, state_province, postal_code, country,
          phone, email, is_active, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const params = [
        organizationId,
        dbData.location_code,
        dbData.location_name,
        dbData.location_type || null,
        dbData.address_line1 || null,
        dbData.address_line2 || null,
        dbData.city || null,
        dbData.state_province || null,
        dbData.postal_code || null,
        dbData.country || null,
        dbData.phone || null,
        dbData.email || null,
        dbData.is_active !== undefined ? dbData.is_active : true,
        userId,
        userId
      ];

      const result = await this.query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating location', { locationData, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Update location
   */
  async update(id, locationData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(locationData);

      const sql = `
        UPDATE ${this.tableName}
        SET
          location_name = COALESCE($1, location_name),
          location_type = $2,
          address_line1 = $3,
          address_line2 = $4,
          city = $5,
          state_province = $6,
          postal_code = $7,
          country = $8,
          phone = $9,
          email = $10,
          is_active = COALESCE($11, is_active),
          updated_by = $12,
          updated_at = NOW()
        WHERE id = $13
          AND organization_id = $14
          AND deleted_at IS NULL
        RETURNING *
      `;

      const params = [
        dbData.location_name,
        dbData.location_type,
        dbData.address_line1,
        dbData.address_line2,
        dbData.city,
        dbData.state_province,
        dbData.postal_code,
        dbData.country,
        dbData.phone,
        dbData.email,
        dbData.is_active,
        userId,
        id,
        organizationId
      ];

      const result = await this.query(sql, params, organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating location', { id, locationData, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Delete location (soft delete)
   */
  async delete(id, organizationId, userId) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
        WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await this.query(sql, [userId, id, organizationId], organizationId);
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error('Error deleting location', { id, organizationId, error: error.message });
      throw error;
    }
  }
}

export default LocationRepository;
