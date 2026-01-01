/**
 * ScheduleHub Integration Service
 * Handles cross-product integration from Nexus HRIS
 * Direct service-to-service calls for monolithic architecture
 */

import pool from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import integrationErrorHandler from '../../../shared/utils/integrationErrorHandler.js';

class ScheduleHubIntegrationService {
  
  errorHandler: any;

  logger: any;

constructor() {
    this.logger = logger;
    this.errorHandler = integrationErrorHandler;
  }

  /**
   * CROSS-PRODUCT INTEGRATION: Nexus → ScheduleHub (with error handling)
   * Sync employee to ScheduleHub workforce when created/updated in Nexus
   * Wraps syncEmployeeFromNexusInternal with retry and circuit breaker
   * 
   * @param {Object} employeeData - Employee data from Nexus
   * @param {string} createdBy - UUID of user creating the record
   * @returns {Promise<Object>} Result with success flag and data
   */
  async syncEmployeeFromNexus(employeeData, createdBy) {
    const context = this.errorHandler.createContext({
      integration: 'nexus-to-schedulehub-workforce',
      employeeId: employeeData.employeeId,
      organizationId: employeeData.organizationId
    });

    return this.errorHandler.executeNonBlocking(
      'nexus-to-schedulehub-workforce',
      () => this.syncEmployeeFromNexusInternal(employeeData, createdBy),
      context
    );
  }

  /**
   * CROSS-PRODUCT INTEGRATION: Nexus → ScheduleHub (Internal implementation)
   * Sync employee to ScheduleHub workforce when created/updated in Nexus
   * Called directly by Nexus employeeService
   * 
   * @param {Object} employeeData - Employee data from Nexus
   * @param {string} employeeData.employeeId - Employee UUID from hris.employee
   * @param {string} employeeData.organizationId - Organization UUID
   * @param {string} employeeData.employeeNumber - Employee number (EMP0001, etc.)
   * @param {string} employeeData.firstName - First name
   * @param {string} employeeData.lastName - Last name
   * @param {string} employeeData.email - Email address
   * @param {string} employeeData.phoneNumber - Phone number
   * @param {string} employeeData.departmentId - Department UUID
   * @param {string} employeeData.locationId - Location UUID
   * @param {string} employeeData.jobTitle - Job title
   * @param {string} employeeData.employmentType - Employment type (full_time, part_time, etc.)
   * @param {string} employeeData.status - Employee status (active, inactive, etc.)
   * @param {Date} employeeData.hireDate - Hire date
   * @param {string} createdBy - UUID of user creating the record
   * @returns {Promise<Object>} Created/updated worker record
   */
  async syncEmployeeFromNexusInternal(employeeData, createdBy) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        employeeId,
        organizationId,
        employeeNumber,
        firstName,
        lastName,
        email,
        phoneNumber,
        departmentId,
        locationId,
        jobTitle,
        employmentType,
        status,
        hireDate
      } = employeeData;

      this.logger.info('[ScheduleHub] Syncing employee from Nexus', {
        employeeId,
        organizationId
      });

      // Check if worker already exists
      const existingWorker = await client.query(
        `SELECT id FROM scheduling.worker 
         WHERE organization_id = $1 
         AND employee_id = $2 
         AND deleted_at IS NULL
         LIMIT 1`,
        [organizationId, employeeId]
      );

      let workerId;

      if (existingWorker.rows.length > 0) {
        // Update existing worker
        workerId = existingWorker.rows[0].id;
        
        const updateResult = await client.query(
          `UPDATE scheduling.worker 
           SET first_name = $1,
               last_name = $2,
               email = $3,
               phone_number = $4,
               job_title = $5,
               employment_type = $6,
               status = $7,
               department_id = $8,
               location_id = $9,
               updated_at = NOW(),
               updated_by = $10
           WHERE id = $11
           RETURNING *`,
          [
            firstName,
            lastName,
            email,
            phoneNumber,
            jobTitle,
            this.mapEmploymentType(employmentType),
            this.mapEmployeeStatus(status),
            departmentId,
            locationId,
            createdBy,
            workerId
          ]
        );

        this.logger.info('[ScheduleHub] Updated existing worker', { workerId });
        
        await client.query('COMMIT');
        return {
          workerId,
          worker: updateResult.rows[0],
          message: 'Worker successfully updated from Nexus'
        };
      } else {
        // Create new worker
        const workerResult = await client.query(
          `INSERT INTO scheduling.worker (
            organization_id,
            employee_id,
            employee_number,
            first_name,
            last_name,
            email,
            phone_number,
            job_title,
            employment_type,
            status,
            department_id,
            location_id,
            hire_date,
            max_hours_per_week,
            max_consecutive_days,
            min_rest_hours,
            created_at,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), $17)
          RETURNING *`,
          [
            organizationId,
            employeeId,
            employeeNumber,
            firstName,
            lastName,
            email,
            phoneNumber,
            jobTitle,
            this.mapEmploymentType(employmentType),
            this.mapEmployeeStatus(status),
            departmentId,
            locationId,
            hireDate,
            this.getDefaultMaxHours(employmentType), // 40 for FT, 30 for PT
            7, // Default max consecutive days
            11, // Default min rest hours (11 hours between shifts - EU standard)
            createdBy
          ]
        );

        workerId = workerResult.rows[0].id;
        this.logger.info('[ScheduleHub] Created new worker', { workerId });

        // Create default availability (Mon-Fri 9am-5pm for full-time)
        if (employmentType === 'full_time') {
          await this.createDefaultAvailability(client, workerId, organizationId, createdBy);
        }

        await client.query('COMMIT');

        return {
          workerId,
          worker: workerResult.rows[0],
          message: 'Worker successfully synced from Nexus'
        };
      }

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('[ScheduleHub] Error syncing employee from Nexus', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * CROSS-PRODUCT INTEGRATION: Nexus → ScheduleHub (with error handling)
   * Remove employee from ScheduleHub when terminated in Nexus
   * Wraps removeEmployeeFromNexusInternal with retry and circuit breaker
   * 
   * @param {string} employeeId - Employee UUID from Nexus
   * @param {string} organizationId - Organization UUID
   * @param {Date} terminationDate - Termination date
   * @param {string} deletedBy - UUID of user performing the action
   * @returns {Promise<Object>} Result with success flag and data
   */
  async removeEmployeeFromNexus(employeeId, organizationId, terminationDate, deletedBy) {
    const context = this.errorHandler.createContext({
      integration: 'nexus-to-schedulehub-termination',
      employeeId,
      organizationId
    });

    return this.errorHandler.executeNonBlocking(
      'nexus-to-schedulehub-termination',
      () => this.removeEmployeeFromNexusInternal(employeeId, organizationId, terminationDate, deletedBy),
      context
    );
  }

  /**
   * CROSS-PRODUCT INTEGRATION: Nexus → ScheduleHub (Internal implementation)
   * Remove employee from ScheduleHub when terminated in Nexus
   * 
   * @param {string} employeeId - Employee UUID from Nexus
   * @param {string} organizationId - Organization UUID
   * @param {Date} terminationDate - Termination date
   * @param {string} deletedBy - UUID of user performing the action
   * @returns {Promise<Object>} Update result
   */
  async removeEmployeeFromNexusInternal(employeeId, organizationId, terminationDate, deletedBy) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      this.logger.info('[ScheduleHub] Removing employee from workforce', {
        employeeId,
        organizationId
      });

      // Find worker
      const workerResult = await client.query(
        `SELECT id FROM scheduling.worker 
         WHERE organization_id = $1 
         AND employee_id = $2 
         AND deleted_at IS NULL
         LIMIT 1`,
        [organizationId, employeeId]
      );

      if (workerResult.rows.length === 0) {
        this.logger.warn('[ScheduleHub] Worker not found for employee', { employeeId });
        await client.query('COMMIT');
        return { message: 'Worker not found' };
      }

      const workerId = workerResult.rows[0].id;

      // Update worker status to terminated
      await client.query(
        `UPDATE scheduling.worker 
         SET status = 'terminated',
             termination_date = $1,
             updated_at = NOW(),
             updated_by = $2
         WHERE id = $3`,
        [terminationDate, deletedBy, workerId]
      );

      // Cancel future shifts
      await client.query(
        `UPDATE scheduling.shift 
         SET status = 'cancelled',
             updated_at = NOW(),
             updated_by = $1
         WHERE employee_id = $2 
         AND shift_date > CURRENT_DATE 
         AND status IN ('scheduled', 'published')
         AND deleted_at IS NULL`,
        [deletedBy, workerId]
      );

      this.logger.info('[ScheduleHub] Worker terminated and future shifts cancelled', {
        workerId,
        employeeId
      });

      await client.query('COMMIT');

      return {
        workerId,
        message: 'Worker successfully removed from workforce'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('[ScheduleHub] Error removing employee', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Create default availability for full-time workers
   * Monday-Friday 9am-5pm
   */
  async createDefaultAvailability(client, workerId, organizationId, createdBy) {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    for (const dayOfWeek of weekdays) {
      await client.query(
        `INSERT INTO scheduling.worker_availability (
          organization_id,
          employee_id,
          day_of_week,
          start_time,
          end_time,
          is_available,
          created_at,
          created_by
        ) VALUES ($1, $2, $3, '09:00:00', '17:00:00', true, NOW(), $4)`,
        [organizationId, workerId, dayOfWeek, createdBy]
      );
    }

    this.logger.info('[ScheduleHub] Created default availability for worker', { workerId });
  }

  /**
   * Helper: Map Nexus employment type to ScheduleHub employment type
   */
  mapEmploymentType(nexusType) {
    const mapping = {
      'full_time': 'full_time',
      'part_time': 'part_time',
      'contractor': 'contract',
      'contract': 'contract',
      'intern': 'temporary',
      'temporary': 'temporary'
    };
    return mapping[nexusType] || 'full_time';
  }

  /**
   * Helper: Map Nexus employee status to ScheduleHub worker status
   */
  mapEmployeeStatus(nexusStatus) {
    const mapping = {
      'active': 'active',
      'inactive': 'inactive',
      'on_leave': 'on_leave',
      'terminated': 'terminated'
    };
    return mapping[nexusStatus] || 'active';
  }

  /**
   * Helper: Get default max hours per week based on employment type
   */
  getDefaultMaxHours(employmentType) {
    switch (employmentType) {
      case 'full_time': return 40;
      case 'part_time': return 30;
      case 'contractor':
      case 'contract': return 40;
      case 'intern': return 20;
      case 'temporary': return 30;
      default: return 40;
    }
  }
}

export default ScheduleHubIntegrationService;
