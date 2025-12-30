import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Repository for shift template stations (junction table)
 * Manages many-to-many relationship between shift templates and stations
 */
class ShiftTemplateStationRepository {
  /**
   * Creates a new shift template station association
   * 
   * @param {Object} data - Association data
   * @param {string} data.shift_template_id - Template UUID
   * @param {string} data.station_id - Station UUID
   * @param {string} data.organization_id - Organization UUID
   * @param {string} data.created_by - User UUID
   * @returns {Promise<Object>} Created association
   */
  async create(data) {
    const text = `
      INSERT INTO scheduling.shift_template_stations (
        id, shift_template_id, station_id, 
        organization_id, created_by, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      uuidv4(),
      data.shift_template_id,
      data.station_id,
      data.organization_id,
      data.created_by,
      new Date()
    ];

    const result = await query(
      text,
      values,
      data.organization_id,
      { operation: 'INSERT', table: 'shift_template_stations' }
    );

    return result.rows[0];
  }

  /**
   * Finds a specific template-station association
   * 
   * @param {string} templateId - Template UUID
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Association or null
   */
  async findByTemplateAndStation(templateId, stationId, organizationId) {
    const text = `
      SELECT sts.*
      FROM scheduling.shift_template_stations sts
      WHERE sts.shift_template_id = $1
        AND sts.station_id = $2
        AND sts.organization_id = $3
    `;

    const result = await query(
      text,
      [templateId, stationId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'shift_template_stations' }
    );

    return result.rows[0] || null;
  }

  /**
   * Finds all stations associated with a template
   * 
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of station associations
   */
  async findStationsByTemplate(templateId, organizationId) {
    const text = `
      SELECT 
        sts.*,
        s.station_name,
        s.station_code
      FROM scheduling.shift_template_stations sts
      JOIN scheduling.stations s ON sts.station_id = s.id
      WHERE sts.shift_template_id = $1
        AND sts.organization_id = $2
        AND s.deleted_at IS NULL
      ORDER BY s.station_name
    `;

    const result = await query(
      text,
      [templateId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'shift_template_stations' }
    );

    return result.rows;
  }

  /**
   * Finds all templates associated with a station
   * 
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of template associations
   */
  async findTemplatesByStation(stationId, organizationId) {
    const text = `
      SELECT 
        sts.*,
        st.name as template_name,
        st.description as template_description
      FROM scheduling.shift_template_stations sts
      JOIN scheduling.shift_templates st ON sts.shift_template_id = st.id
      WHERE sts.station_id = $1
        AND sts.organization_id = $2
        AND st.deleted_at IS NULL
      ORDER BY st.name
    `;

    const result = await query(
      text,
      [stationId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'shift_template_stations' }
    );

    return result.rows;
  }

  /**
   * Creates multiple associations for a template (bulk operation)
   * 
   * @param {string} templateId - Template UUID
   * @param {Array<string>} stationIds - Array of station UUIDs
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} Array of created associations
   */
  async bulkCreateForTemplate(templateId, stationIds, organizationId, userId, client = null) {
    if (!stationIds.length) return [];

    const timestamp = new Date();
    const values = [];
    const placeholders = [];

    stationIds.forEach((stationId, index) => {
      const baseIndex = index * 6;
      placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`);
      values.push(uuidv4(), templateId, stationId, organizationId, userId, timestamp);
    });

    const text = `
      INSERT INTO scheduling.shift_template_stations (
        id, shift_template_id, station_id, 
        organization_id, created_by, created_at
      )
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    // Use client if provided (for transactions), otherwise use default query
    let result;
    if (client) {
      result = await client.query(text, values);
    } else {
      result = await query(
        text,
        values,
        organizationId,
        { operation: 'INSERT', table: 'shift_template_stations' }
      );
    }

    return result.rows;
  }

  /**
   * Updates all station associations for a template
   * Removes existing associations and creates new ones
   * 
   * @param {string} templateId - Template UUID
   * @param {Array<string>} stationIds - New station UUIDs
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Array>} Array of new associations
   */
  async updateAssociationsForTemplate(templateId, stationIds, organizationId, userId, client = null) {
    // Start with delete to clear existing associations
    await this.deleteByTemplate(templateId, organizationId, client);
    
    // Create new associations
    if (stationIds.length > 0) {
      return await this.bulkCreateForTemplate(templateId, stationIds, organizationId, userId, client);
    }
    
    return [];
  }

  /**
   * Deletes all associations for a template
   * 
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<void>}
   */
  async deleteByTemplate(templateId, organizationId, client = null) {
    const text = `
      DELETE FROM scheduling.shift_template_stations
      WHERE shift_template_id = $1
        AND organization_id = $2
    `;

    if (client) {
      await client.query(text, [templateId, organizationId]);
    } else {
      await query(
        text,
        [templateId, organizationId],
        organizationId,
        { operation: 'DELETE', table: 'shift_template_stations' }
      );
    }
  }

  /**
   * Deletes all associations for a station
   * 
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<void>}
   */
  async deleteByStation(stationId, organizationId) {
    const text = `
      DELETE FROM scheduling.shift_template_stations
      WHERE station_id = $1
        AND organization_id = $2
    `;

    await query(
      text,
      [stationId, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'shift_template_stations' }
    );
  }

  /**
   * Deletes a specific association
   * 
   * @param {string} templateId - Template UUID
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<void>}
   */
  async deleteAssociation(templateId, stationId, organizationId) {
    const text = `
      DELETE FROM scheduling.shift_template_stations
      WHERE shift_template_id = $1
        AND station_id = $2
        AND organization_id = $3
    `;

    await query(
      text,
      [templateId, stationId, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'shift_template_stations' }
    );
  }

  /**
   * Counts associations for a template
   * 
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<number>} Number of associations
   */
  async countByTemplate(templateId, organizationId) {
    const text = `
      SELECT COUNT(*) as count
      FROM scheduling.shift_template_stations
      WHERE shift_template_id = $1
        AND organization_id = $2
    `;

    const result = await query(
      text,
      [templateId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'shift_template_stations' }
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Checks if a template-station association exists
   * 
   * @param {string} templateId - Template UUID
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<boolean>} True if association exists
   */
  async exists(templateId, stationId, organizationId) {
    const association = await this.findByTemplateAndStation(templateId, stationId, organizationId);
    return !!association;
  }
}

export default ShiftTemplateStationRepository;