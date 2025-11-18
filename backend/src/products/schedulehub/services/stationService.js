/**
 * ScheduleHub Station Service
 * Business logic for station and coverage requirement management
 */

import pool from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import Joi from 'joi';

class StationService {
  constructor() {
    this.logger = logger;
  }

  createStationSchema = Joi.object({
    stationCode: Joi.string().max(50).required(),
    stationName: Joi.string().max(100).required(),
    description: Joi.string().allow(null, ''),
    locationId: Joi.string().uuid().allow(null),
    floorLevel: Joi.string().max(20).allow(null),
    zone: Joi.string().max(50).allow(null),
    capacity: Joi.number().integer().positive().allow(null),
    requiresSupervision: Joi.boolean().default(false)
  });

  async createStation(stationData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const { error, value } = this.createStationSchema.validate(stationData);
      if (error) throw new Error(`Validation error: ${error.details[0].message}`);

      const result = await client.query(
        `INSERT INTO scheduling.stations (
          organization_id, station_code, station_name, description, location_id,
          floor_level, zone, capacity, requires_supervision
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [organizationId, value.stationCode, value.stationName, value.description || null,
         value.locationId || null, value.floorLevel || null, value.zone || null,
         value.capacity || null, value.requiresSupervision]
      );

      await client.query('COMMIT');
      this.logger.info('Station created', { stationId: result.rows[0].id, organizationId });
      return { success: true, data: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating station:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async listStations(organizationId, includeInactive = false) {
    try {
      let query = `
        SELECT s.*,
          l.location_name,
          (SELECT COUNT(*) FROM scheduling.shifts WHERE station_id = s.id) as shift_count
        FROM scheduling.stations s
        LEFT JOIN hris.location l ON s.location_id = l.id
        WHERE s.organization_id = $1
      `;
      const params = [organizationId];

      if (!includeInactive) query += ` AND s.is_active = true`;
      query += ` ORDER BY s.station_name`;

      const result = await pool.query(query, params);
      return { success: true, data: result.rows };
    } catch (error) {
      this.logger.error('Error listing stations:', error);
      throw error;
    }
  }

  async getStationById(stationId, organizationId) {
    try {
      const result = await pool.query(
        `SELECT s.*,
          l.location_name,
          (SELECT COUNT(*) FROM scheduling.station_role_requirements WHERE station_id = s.id) as role_requirement_count
        FROM scheduling.stations s
        LEFT JOIN hris.location l ON s.location_id = l.id
        WHERE s.id = $1 AND s.organization_id = $2`,
        [stationId, organizationId]
      );

      if (result.rows.length === 0) return { success: false, error: 'Station not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      this.logger.error('Error fetching station:', error);
      throw error;
    }
  }

  async updateStation(stationId, updateData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const allowedFields = ['stationName', 'description', 'locationId', 'floorLevel', 
                             'zone', 'capacity', 'requiresSupervision', 'isActive'];
      const updates = [];
      const params = [];
      let paramCount = 0;

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          paramCount++;
          const snakeKey = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          updates.push(`${snakeKey} = $${paramCount}`);
          params.push(updateData[field]);
        }
      });

      if (updates.length === 0) throw new Error('No valid fields to update');

      paramCount++;
      params.push(stationId);
      paramCount++;
      params.push(organizationId);

      const query = `
        UPDATE scheduling.stations
        SET ${updates.join(', ')}
        WHERE id = $${paramCount - 1} AND organization_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, params);
      if (result.rows.length === 0) throw new Error('Station not found');

      await client.query('COMMIT');
      return { success: true, data: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating station:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async addRoleRequirement(stationId, roleId, organizationId, requirements) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO scheduling.station_role_requirements (
          organization_id, station_id, role_id, min_workers, max_workers,
          required_proficiency, priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (station_id, role_id)
        DO UPDATE SET min_workers = $4, max_workers = $5, required_proficiency = $6, priority = $7
        RETURNING *`,
        [organizationId, stationId, roleId, requirements.minWorkers || 1,
         requirements.maxWorkers || null, requirements.requiredProficiency || null,
         requirements.priority || 50]
      );

      await client.query('COMMIT');
      return { success: true, data: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error adding role requirement:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getStationRequirements(stationId, organizationId) {
    try {
      const result = await pool.query(
        `SELECT srr.*, r.role_name, r.role_code, r.color
         FROM scheduling.station_role_requirements srr
         JOIN scheduling.roles r ON srr.role_id = r.id
         WHERE srr.station_id = $1 AND srr.organization_id = $2
         ORDER BY srr.priority DESC, r.role_name`,
        [stationId, organizationId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      this.logger.error('Error fetching station requirements:', error);
      throw error;
    }
  }

  async removeRoleRequirement(stationId, roleId, organizationId) {
    try {
      const result = await pool.query(
        `DELETE FROM scheduling.station_role_requirements
         WHERE station_id = $1 AND role_id = $2 AND organization_id = $3
         RETURNING *`,
        [stationId, roleId, organizationId]
      );

      if (result.rows.length === 0) throw new Error('Requirement not found');
      return { success: true, data: result.rows[0] };
    } catch (error) {
      this.logger.error('Error removing role requirement:', error);
      throw error;
    }
  }
}

export default StationService;
