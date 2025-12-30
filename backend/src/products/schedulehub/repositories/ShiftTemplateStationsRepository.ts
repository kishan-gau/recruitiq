import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Repository for shift template stations junction table data access
 * Handles many-to-many relationship between shift templates and stations
 */
class ShiftTemplateStationsRepository {
  constructor() {
    this.tableName = 'shift_template_stations';
    this.schema = 'scheduling';
    this.fullTableName = `${this.schema}.${this.tableName}`;
  }

  /**
   * Creates a new shift template station association
   * @param {Object} data - Association data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID creating the association
   * @returns {Promise<Object>} Created association
   */
  async create(data, organizationId, userId) {
    const id = uuidv4();
    const now = new Date();

    const text = `
      INSERT INTO ${this.fullTableName} (
        id, shift_template_id, station_id, organization_id,
        created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      id,
      data.shift_template_id,
      data.station_id,
      organizationId,
      userId,
      now,
      now
    ];

    const result = await query(
      text,
      values,
      organizationId,
      { operation: 'INSERT', table: this.fullTableName }
    );

    return result.rows[0];
  }

  /**
   * Finds association by shift template ID and station ID
   * @param {string} shiftTemplateId - Shift template UUID
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Association or null
   */
  async findByTemplateAndStation(shiftTemplateId, stationId, organizationId) {
    const text = `
      SELECT *
      FROM ${this.fullTableName}
      WHERE shift_template_id = $1 
        AND station_id = $2
        AND organization_id = $3
        AND deleted_at IS NULL
    `;

    const result = await query(
      text,
      [shiftTemplateId, stationId, organizationId],
      organizationId,
      { operation: 'SELECT', table: this.fullTableName }
    );

    return result.rows[0] || null;
  }

  /**
   * Finds all stations for a shift template
   * @param {string} shiftTemplateId - Shift template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of station associations
   */
  async findStationsByTemplate(shiftTemplateId, organizationId) {
    const text = `
      SELECT 
        sts.*,
        s.name as station_name,
        s.location as station_location
      FROM ${this.fullTableName} sts
      JOIN scheduling.stations s ON sts.station_id = s.id
      WHERE sts.shift_template_id = $1
        AND sts.organization_id = $2
        AND sts.deleted_at IS NULL
        AND s.deleted_at IS NULL
      ORDER BY s.name
    `;

    const result = await query(
      text,
      [shiftTemplateId, organizationId],
      organizationId,
      { operation: 'SELECT', table: this.fullTableName }
    );

    return result.rows;
  }

  /**
   * Finds all shift templates for a station
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of shift template associations
   */
  async findTemplatesByStation(stationId, organizationId) {
    const text = `
      SELECT 
        sts.*,
        st.name as template_name,
        st.description as template_description
      FROM ${this.fullTableName} sts
      JOIN scheduling.shift_templates st ON sts.shift_template_id = st.id
      WHERE sts.station_id = $1
        AND sts.organization_id = $2
        AND sts.deleted_at IS NULL
        AND st.deleted_at IS NULL
      ORDER BY st.name
    `;

    const result = await query(
      text,
      [stationId, organizationId],
      organizationId,
      { operation: 'SELECT', table: this.fullTableName }
    );

    return result.rows;
  }

  /**
   * Bulk creates associations for a shift template
   * @param {string} shiftTemplateId - Shift template UUID
   * @param {Array<string>} stationIds - Array of station UUIDs
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID creating the associations
   * @returns {Promise<Array>} Array of created associations
   */
  async bulkCreateForTemplate(shiftTemplateId, stationIds, organizationId, userId) {
    if (!stationIds || stationIds.length === 0) {
      return [];
    }

    const now = new Date();
    const values = [];
    const placeholders = [];

    stationIds.forEach((stationId, index) => {
      const baseIndex = index * 7;
      placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7})`);
      
      values.push(
        uuidv4(),           // id
        shiftTemplateId,    // shift_template_id
        stationId,          // station_id
        organizationId,     // organization_id
        userId,             // created_by
        now,                // created_at
        now                 // updated_at
      );
    });

    const text = `
      INSERT INTO ${this.fullTableName} (
        id, shift_template_id, station_id, organization_id,
        created_by, created_at, updated_at
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (shift_template_id, station_id, organization_id) 
      WHERE deleted_at IS NULL
      DO NOTHING
      RETURNING *
    `;

    const result = await query(
      text,
      values,
      organizationId,
      { operation: 'INSERT', table: this.fullTableName }
    );

    return result.rows;
  }

  /**
   * Removes association (soft delete)
   * @param {string} shiftTemplateId - Shift template UUID
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing the deletion
   * @returns {Promise<void>}
   */
  async removeAssociation(shiftTemplateId, stationId, organizationId, userId) {
    const text = `
      UPDATE ${this.fullTableName}
      SET 
        deleted_at = NOW(),
        deleted_by = $1,
        updated_at = NOW(),
        updated_by = $1
      WHERE shift_template_id = $2
        AND station_id = $3
        AND organization_id = $4
        AND deleted_at IS NULL
    `;

    await query(
      text,
      [userId, shiftTemplateId, stationId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: this.fullTableName }
    );
  }

  /**
   * Removes all associations for a shift template (soft delete)
   * @param {string} shiftTemplateId - Shift template UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing the deletion
   * @returns {Promise<number>} Number of associations removed
   */
  async removeAllForTemplate(shiftTemplateId, organizationId, userId) {
    const text = `
      UPDATE ${this.fullTableName}
      SET 
        deleted_at = NOW(),
        deleted_by = $1,
        updated_at = NOW(),
        updated_by = $1
      WHERE shift_template_id = $2
        AND organization_id = $3
        AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await query(
      text,
      [userId, shiftTemplateId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: this.fullTableName }
    );

    return result.rowCount;
  }

  /**
   * Updates associations for a shift template (replaces existing)
   * @param {string} shiftTemplateId - Shift template UUID
   * @param {Array<string>} stationIds - New array of station UUIDs
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing the update
   * @returns {Promise<Array>} Array of current associations
   */
  async updateAssociationsForTemplate(shiftTemplateId, stationIds, organizationId, userId) {
    // Remove all existing associations
    await this.removeAllForTemplate(shiftTemplateId, organizationId, userId);

    // Create new associations
    if (stationIds && stationIds.length > 0) {
      return await this.bulkCreateForTemplate(shiftTemplateId, stationIds, organizationId, userId);
    }

    return [];
  }

  /**
   * Checks if association exists
   * @param {string} shiftTemplateId - Shift template UUID
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<boolean>} Whether association exists
   */
  async exists(shiftTemplateId, stationId, organizationId) {
    const text = `
      SELECT EXISTS(
        SELECT 1
        FROM ${this.fullTableName}
        WHERE shift_template_id = $1
          AND station_id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
      ) as exists
    `;

    const result = await query(
      text,
      [shiftTemplateId, stationId, organizationId],
      organizationId,
      { operation: 'SELECT', table: this.fullTableName }
    );

    return result.rows[0].exists;
  }
}

export default ShiftTemplateStationsRepository;