/**
 * ShiftTemplateRepository
 * Data access layer for shift templates with station many-to-many relationships
 * 
 * @module products/schedulehub/repositories/ShiftTemplateRepository
 */

import { BaseRepository } from '../../../repositories/BaseRepository.js';
import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

class ShiftTemplateRepository extends BaseRepository {
  constructor() {
    super('shift_templates');
  }

  /**
   * Find shift template by ID with stations
   * @param {string} id - Template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Shift template with stations array
   */
  async findByIdWithStations(id, organizationId) {
    try {
      const result = await query(`
        SELECT 
          st.*,
          json_agg(
            CASE 
              WHEN sts.id IS NOT NULL THEN 
                json_build_object(
                  'id', sts.id,
                  'station_id', sts.station_id,
                  'station_name', s.station_name,
                  'created_at', sts.created_at
                )
              ELSE NULL
            END
          ) FILTER (WHERE sts.id IS NOT NULL) as stations
        FROM shift_templates st
        LEFT JOIN shift_template_stations sts ON st.id = sts.template_id 
          AND sts.organization_id = $2
        LEFT JOIN scheduling.stations s ON sts.station_id = s.id 
          AND s.organization_id = $2
          AND s.deleted_at IS NULL
        WHERE st.id = $1 
          AND st.organization_id = $2 
          AND st.deleted_at IS NULL
        GROUP BY st.id
      `, [id, organizationId], organizationId, {
        operation: 'SELECT',
        table: 'shift_templates'
      });

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding shift template with stations', {
        error: error.message,
        id,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Find station by ID
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Station record
   */
  async findStationById(stationId, organizationId) {
    try {
      const result = await query(`
        SELECT * FROM scheduling.stations
        WHERE id = $1 
          AND organization_id = $2 
          AND deleted_at IS NULL
      `, [stationId, organizationId], organizationId, {
        operation: 'SELECT',
        table: 'scheduling.stations'
      });

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding station', {
        error: error.message,
        stationId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Clear all station assignments for a template
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<void>}
   */
  async clearStationAssignments(templateId, organizationId) {
    try {
      await query(`
        DELETE FROM shift_template_stations
        WHERE template_id = $1 AND organization_id = $2
      `, [templateId, organizationId], organizationId, {
        operation: 'DELETE',
        table: 'shift_template_stations'
      });

      logger.info('Cleared station assignments for template', {
        templateId,
        organizationId
      });
    } catch (error) {
      logger.error('Error clearing station assignments', {
        error: error.message,
        templateId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Assign station to template
   * @param {string} templateId - Template UUID
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing the operation
   * @returns {Promise<Object>} Assignment record
   */
  async assignStationToTemplate(templateId, stationId, organizationId, userId) {
    try {
      const id = uuidv4();
      const result = await query(`
        INSERT INTO shift_template_stations (
          id, template_id, station_id, organization_id, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `, [id, templateId, stationId, organizationId, userId], organizationId, {
        operation: 'INSERT',
        table: 'shift_template_stations'
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error assigning station to template', {
        error: error.message,
        templateId,
        stationId,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Find stations assigned to a template
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of station records with assignment details
   */
  async findStationsByTemplateId(templateId, organizationId) {
    try {
      const result = await query(`
        SELECT 
          sts.id as assignment_id,
          sts.template_id,
          sts.station_id,
          s.station_name,
          s.station_code,
          s.description as station_description,
          sts.created_at as assigned_at,
          sts.created_by as assigned_by
        FROM shift_template_stations sts
        JOIN scheduling.stations s ON sts.station_id = s.id
        WHERE sts.template_id = $1 
          AND sts.organization_id = $2
          AND s.organization_id = $2
          AND s.deleted_at IS NULL
        ORDER BY s.station_name
      `, [templateId, organizationId], organizationId, {
        operation: 'SELECT',
        table: 'shift_template_stations'
      });

      return result.rows;
    } catch (error) {
      logger.error('Error finding stations by template', {
        error: error.message,
        templateId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Remove specific station assignments from template
   * @param {string} templateId - Template UUID
   * @param {Array<string>} stationIds - Array of station UUIDs to remove
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<void>}
   */
  async removeStationAssignments(templateId, stationIds, organizationId) {
    try {
      if (stationIds.length === 0) return;

      const placeholders = stationIds.map((_, index) => `$${index + 3}`).join(',');
      
      await query(`
        DELETE FROM shift_template_stations
        WHERE template_id = $1 
          AND organization_id = $2 
          AND station_id IN (${placeholders})
      `, [templateId, organizationId, ...stationIds], organizationId, {
        operation: 'DELETE',
        table: 'shift_template_stations'
      });

      logger.info('Removed station assignments from template', {
        templateId,
        stationIds,
        organizationId
      });
    } catch (error) {
      logger.error('Error removing station assignments', {
        error: error.message,
        templateId,
        stationIds,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Check if station is assigned to template
   * @param {string} templateId - Template UUID
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<boolean>} True if assigned
   */
  async isStationAssigned(templateId, stationId, organizationId) {
    try {
      const result = await query(`
        SELECT 1 FROM shift_template_stations
        WHERE template_id = $1 
          AND station_id = $2 
          AND organization_id = $3
      `, [templateId, stationId, organizationId], organizationId, {
        operation: 'SELECT',
        table: 'shift_template_stations'
      });

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking station assignment', {
        error: error.message,
        templateId,
        stationId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Get assignment statistics for a template
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Statistics object
   */
  async getAssignmentStatistics(templateId, organizationId) {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_stations,
          COUNT(CASE WHEN s.is_active = true THEN 1 END) as active_stations,
          array_agg(s.station_name ORDER BY s.station_name) as station_names
        FROM shift_template_stations sts
        JOIN scheduling.stations s ON sts.station_id = s.id
        WHERE sts.template_id = $1 
          AND sts.organization_id = $2
          AND s.organization_id = $2
          AND s.deleted_at IS NULL
      `, [templateId, organizationId], organizationId, {
        operation: 'SELECT',
        table: 'shift_template_stations'
      });

      const row = result.rows[0];
      return {
        totalStations: parseInt(row.total_stations) || 0,
        activeStations: parseInt(row.active_stations) || 0,
        stationNames: row.station_names || []
      };
    } catch (error) {
      logger.error('Error getting assignment statistics', {
        error: error.message,
        templateId,
        organizationId
      });
      throw error;
    }
  }
}

export default ShiftTemplateRepository;