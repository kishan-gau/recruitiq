import Joi from 'joi';
import ShiftTemplateStationRepository from '../repositories/ShiftTemplateStationRepository.js';
import { mapShiftTemplateStationDbToApi, mapShiftTemplateStationsDbToApi } from '../dto/shiftTemplateStationDto.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../utils/errors.js';
import logger from '../../../utils/logger.js';

/**
 * Service for managing shift template station associations
 * Handles many-to-many relationships between shift templates and stations
 */
class ShiftTemplateStationService {
  /**
   * @param {ShiftTemplateStationRepository} repository - Optional repository instance for testing
   */
  constructor(repository = null) {
    this.repository = repository || new ShiftTemplateStationRepository();
  }

  /**
   * Joi validation schema for assigning a station to a template
   */
  static get assignStationSchema() {
    return Joi.object({
      templateId: Joi.string().uuid().required(),
      stationId: Joi.string().uuid().required()
    });
  }

  /**
   * Joi validation schema for bulk station assignment
   */
  static get bulkAssignSchema() {
    return Joi.object({
      templateId: Joi.string().uuid().required(),
      stationIds: Joi.array()
        .items(Joi.string().uuid())
        .min(1)
        .max(50)
        .unique()
        .required()
    });
  }

  /**
   * Joi validation schema for updating template stations
   */
  static get updateTemplateStationsSchema() {
    return Joi.object({
      templateId: Joi.string().uuid().required(),
      stationIds: Joi.array()
        .items(Joi.string().uuid())
        .max(50)
        .unique()
        .required()
    });
  }

  /**
   * Assigns a single station to a shift template
   * 
   * @param {Object} data - Assignment data
   * @param {string} data.templateId - Template UUID
   * @param {string} data.stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing assignment
   * @returns {Promise<Object>} Created association
   * @throws {ValidationError} If data is invalid
   * @throws {ConflictError} If association already exists
   */
  async assignStation(data, organizationId, userId) {
    try {
      // Validate input
      const validated = await this.constructor.assignStationSchema.validateAsync(data);

      // Check if association already exists
      const existing = await this.repository.findByTemplateAndStation(
        validated.templateId,
        validated.stationId,
        organizationId
      );

      if (existing) {
        throw new ConflictError('Station is already assigned to this template');
      }

      // Create association
      const dbData = {
        shift_template_id: validated.templateId,
        station_id: validated.stationId,
        organization_id: organizationId,
        created_by: userId
      };

      const created = await this.repository.create(dbData);

      logger.info('Station assigned to template', {
        templateId: validated.templateId,
        stationId: validated.stationId,
        organizationId,
        userId
      });

      return mapShiftTemplateStationDbToApi(created);
    } catch (error) {
      logger.error('Error assigning station to template', {
        error: error.message,
        data,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Assigns multiple stations to a shift template
   * 
   * @param {Object} data - Assignment data
   * @param {string} data.templateId - Template UUID
   * @param {Array<string>} data.stationIds - Array of station UUIDs
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing assignment
   * @returns {Promise<Array>} Array of created associations
   * @throws {ValidationError} If data is invalid
   */
  async bulkAssignStations(data, organizationId, userId, client = null) {
    try {
      // Validate input
      const validated = await this.constructor.bulkAssignSchema.validateAsync(data);

      // Create associations
      const created = await this.repository.bulkCreateForTemplate(
        validated.templateId,
        validated.stationIds,
        organizationId,
        userId,
        client
      );

      logger.info('Stations bulk assigned to template', {
        templateId: validated.templateId,
        stationCount: validated.stationIds.length,
        organizationId,
        userId
      });

      return mapShiftTemplateStationsDbToApi(created);
    } catch (error) {
      logger.error('Error bulk assigning stations to template', {
        error: error.message,
        data,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Updates all station assignments for a template
   * Replaces existing assignments with new ones
   * 
   * @param {Object} data - Update data
   * @param {string} data.templateId - Template UUID
   * @param {Array<string>} data.stationIds - New station UUIDs (can be empty)
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing update
   * @returns {Promise<Array>} Array of new associations
   * @throws {ValidationError} If data is invalid
   */
  async updateTemplateStations(data, organizationId, userId, client = null) {
    try {
      // Validate input
      const validated = await this.constructor.updateTemplateStationsSchema.validateAsync(data);

      // Update associations
      const updated = await this.repository.updateAssociationsForTemplate(
        validated.templateId,
        validated.stationIds,
        organizationId,
        userId,
        client
      );

      logger.info('Template station assignments updated', {
        templateId: validated.templateId,
        newStationCount: validated.stationIds.length,
        organizationId,
        userId
      });

      return mapShiftTemplateStationsDbToApi(updated);
    } catch (error) {
      logger.error('Error updating template station assignments', {
        error: error.message,
        data,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Gets all stations assigned to a template
   * 
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of station associations with station details
   */
  async getStationsByTemplate(templateId, organizationId) {
    try {
      const stations = await this.repository.findStationsByTemplate(templateId, organizationId);
      return mapShiftTemplateStationsDbToApi(stations);
    } catch (error) {
      logger.error('Error getting stations for template', {
        error: error.message,
        templateId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Gets all templates assigned to a station
   * 
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of template associations with template details
   */
  async getTemplatesByStation(stationId, organizationId) {
    try {
      const templates = await this.repository.findTemplatesByStation(stationId, organizationId);
      return mapShiftTemplateStationsDbToApi(templates);
    } catch (error) {
      logger.error('Error getting templates for station', {
        error: error.message,
        stationId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Removes a station from a template
   * 
   * @param {string} templateId - Template UUID
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing removal
   * @returns {Promise<void>}
   * @throws {NotFoundError} If association doesn't exist
   */
  async removeStation(templateId, stationId, organizationId, userId) {
    try {
      // Check if association exists
      const exists = await this.repository.exists(templateId, stationId, organizationId);

      if (!exists) {
        throw new NotFoundError('Station is not assigned to this template');
      }

      // Remove association
      await this.repository.deleteAssociation(templateId, stationId, organizationId);

      logger.info('Station removed from template', {
        templateId,
        stationId,
        organizationId,
        userId
      });
    } catch (error) {
      logger.error('Error removing station from template', {
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
   * Removes all stations from a template
   * 
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing removal
   * @returns {Promise<void>}
   */
  async removeAllStations(templateId, organizationId, userId) {
    try {
      await this.repository.deleteByTemplate(templateId, organizationId);

      logger.info('All stations removed from template', {
        templateId,
        organizationId,
        userId
      });
    } catch (error) {
      logger.error('Error removing all stations from template', {
        error: error.message,
        templateId,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Checks if a station is assigned to a template
   * 
   * @param {string} templateId - Template UUID
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<boolean>} True if assigned
   */
  async isStationAssigned(templateId, stationId, organizationId) {
    try {
      return await this.repository.exists(templateId, stationId, organizationId);
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
   * Gets assignment count for a template
   * 
   * @param {string} templateId - Template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<number>} Number of assigned stations
   */
  async getAssignmentCount(templateId, organizationId) {
    try {
      return await this.repository.countByTemplate(templateId, organizationId);
    } catch (error) {
      logger.error('Error getting assignment count', {
        error: error.message,
        templateId,
        organizationId
      });
      throw error;
    }
  }
}

export default ShiftTemplateStationService;