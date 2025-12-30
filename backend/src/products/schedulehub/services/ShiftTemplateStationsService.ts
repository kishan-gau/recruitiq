import ShiftTemplateStationsRepository from '../repositories/ShiftTemplateStationsRepository.js';
import { mapShiftTemplateStationDbToApi, mapShiftTemplateStationsDbToApi } from '../dto/shiftTemplateStationsDto.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import Joi from 'joi';
import logger from '../../../utils/logger.js';

/**
 * Service for managing shift template to stations associations
 * Handles business logic for many-to-many relationship
 */
class ShiftTemplateStationsService {
  /**
   * Constructor with dependency injection
   * @param {ShiftTemplateStationsRepository} repository - Repository instance
   */
  constructor(repository = null) {
    this.repository = repository || new ShiftTemplateStationsRepository();
  }

  /**
   * Joi validation schema for station assignment
   */
  static get assignStationSchema() {
    return Joi.object({
      shiftTemplateId: Joi.string().uuid().required(),
      stationId: Joi.string().uuid().required()
    }).options({ stripUnknown: true });
  }

  /**
   * Joi validation schema for bulk station assignment
   */
  static get bulkAssignSchema() {
    return Joi.object({
      shiftTemplateId: Joi.string().uuid().required(),
      stationIds: Joi.array()
        .items(Joi.string().uuid())
        .min(1)
        .max(100)
        .unique()
        .required()
    }).options({ stripUnknown: true });
  }

  /**
   * Joi validation schema for updating template stations
   */
  static get updateTemplateStationsSchema() {
    return Joi.object({
      shiftTemplateId: Joi.string().uuid().required(),
      stationIds: Joi.array()
        .items(Joi.string().uuid())
        .max(100)
        .unique()
        .optional()
        .allow(null, [])
    }).options({ stripUnknown: true });
  }

  /**
   * Assigns a station to a shift template
   * @param {Object} data - Assignment data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Created association
   * @throws {ValidationError} If data is invalid
   */
  async assignStation(data, organizationId, userId) {
    try {
      // Validate input data
      const validated = await this.constructor.assignStationSchema.validateAsync(data);

      // Check if association already exists
      const exists = await this.repository.exists(
        validated.shiftTemplateId,
        validated.stationId,
        organizationId
      );

      if (exists) {
        throw new ValidationError('Station is already assigned to this shift template');
      }

      // Create association
      const dbData = {
        shift_template_id: validated.shiftTemplateId,
        station_id: validated.stationId
      };

      const created = await this.repository.create(dbData, organizationId, userId);

      // Log success
      logger.info('Station assigned to shift template', {
        shiftTemplateId: validated.shiftTemplateId,
        stationId: validated.stationId,
        organizationId,
        userId
      });

      // Transform to API format
      return mapShiftTemplateStationDbToApi(created);

    } catch (error) {
      logger.error('Error assigning station to shift template', {
        error: error.message,
        data,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Removes a station from a shift template
   * @param {string} shiftTemplateId - Shift template UUID
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<void>}
   * @throws {NotFoundError} If association doesn't exist
   */
  async unassignStation(shiftTemplateId, stationId, organizationId, userId) {
    try {
      // Check if association exists
      const exists = await this.repository.exists(shiftTemplateId, stationId, organizationId);

      if (!exists) {
        throw new NotFoundError('Station is not assigned to this shift template');
      }

      // Remove association
      await this.repository.removeAssociation(shiftTemplateId, stationId, organizationId, userId);

      // Log success
      logger.info('Station unassigned from shift template', {
        shiftTemplateId,
        stationId,
        organizationId,
        userId
      });

    } catch (error) {
      logger.error('Error unassigning station from shift template', {
        error: error.message,
        shiftTemplateId,
        stationId,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Gets all stations assigned to a shift template
   * @param {string} shiftTemplateId - Shift template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of station associations
   */
  async getStationsForTemplate(shiftTemplateId, organizationId) {
    try {
      const associations = await this.repository.findStationsByTemplate(shiftTemplateId, organizationId);

      // Transform to API format
      return mapShiftTemplateStationsDbToApi(associations);

    } catch (error) {
      logger.error('Error retrieving stations for shift template', {
        error: error.message,
        shiftTemplateId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Gets all shift templates assigned to a station
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of shift template associations
   */
  async getTemplatesForStation(stationId, organizationId) {
    try {
      const associations = await this.repository.findTemplatesByStation(stationId, organizationId);

      // Transform to API format
      return mapShiftTemplateStationsDbToApi(associations);

    } catch (error) {
      logger.error('Error retrieving templates for station', {
        error: error.message,
        stationId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Bulk assigns multiple stations to a shift template
   * @param {Object} data - Bulk assignment data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} Array of created associations
   * @throws {ValidationError} If data is invalid
   */
  async bulkAssignStations(data, organizationId, userId) {
    try {
      // Validate input data
      const validated = await this.constructor.bulkAssignSchema.validateAsync(data);

      // Create associations
      const created = await this.repository.bulkCreateForTemplate(
        validated.shiftTemplateId,
        validated.stationIds,
        organizationId,
        userId
      );

      // Log success
      logger.info('Stations bulk assigned to shift template', {
        shiftTemplateId: validated.shiftTemplateId,
        stationCount: validated.stationIds.length,
        createdCount: created.length,
        organizationId,
        userId
      });

      // Transform to API format
      return mapShiftTemplateStationsDbToApi(created);

    } catch (error) {
      logger.error('Error bulk assigning stations to shift template', {
        error: error.message,
        data,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Updates all stations for a shift template (replaces existing assignments)
   * @param {Object} data - Update data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} Array of current associations
   * @throws {ValidationError} If data is invalid
   */
  async updateTemplateStations(data, organizationId, userId) {
    try {
      // Validate input data
      const validated = await this.constructor.updateTemplateStationsSchema.validateAsync(data);

      // Update associations
      const updated = await this.repository.updateAssociationsForTemplate(
        validated.shiftTemplateId,
        validated.stationIds || [],
        organizationId,
        userId
      );

      // Log success
      logger.info('Shift template stations updated', {
        shiftTemplateId: validated.shiftTemplateId,
        newStationCount: validated.stationIds?.length || 0,
        organizationId,
        userId
      });

      // Transform to API format
      return mapShiftTemplateStationsDbToApi(updated);

    } catch (error) {
      logger.error('Error updating shift template stations', {
        error: error.message,
        data,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Removes all stations from a shift template
   * @param {string} shiftTemplateId - Shift template UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<number>} Number of associations removed
   */
  async removeAllStations(shiftTemplateId, organizationId, userId) {
    try {
      const removedCount = await this.repository.removeAllForTemplate(
        shiftTemplateId,
        organizationId,
        userId
      );

      // Log success
      logger.info('All stations removed from shift template', {
        shiftTemplateId,
        removedCount,
        organizationId,
        userId
      });

      return removedCount;

    } catch (error) {
      logger.error('Error removing all stations from shift template', {
        error: error.message,
        shiftTemplateId,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Checks if a station is assigned to a shift template
   * @param {string} shiftTemplateId - Shift template UUID
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<boolean>} Whether assignment exists
   */
  async isStationAssigned(shiftTemplateId, stationId, organizationId) {
    try {
      return await this.repository.exists(shiftTemplateId, stationId, organizationId);

    } catch (error) {
      logger.error('Error checking station assignment', {
        error: error.message,
        shiftTemplateId,
        stationId,
        organizationId
      });
      throw error;
    }
  }
}

export default ShiftTemplateStationsService;