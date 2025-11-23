/**
 * Foreign Worker Compliance Service
 * Business logic for work permits, visas, and tax residency management
 */

import Joi from 'joi';
import ForeignWorkerRepository from '../repositories/foreignWorkerRepository.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError } from '../../../middleware/errorHandler.js';
import {
  mapWorkPermitDbToApi,
  mapWorkPermitsDbToApi,
  mapWorkPermitApiToDb,
  mapVisaStatusDbToApi,
  mapVisaStatusesDbToApi,
  mapVisaStatusApiToDb,
  mapTaxResidencyDbToApi,
  mapTaxResidenciesDbToApi,
  mapTaxResidencyApiToDb,
  mapComplianceAuditLogsDbToApi,
} from '../dto/foreignWorkerDto.js';

class ForeignWorkerComplianceService {
  constructor(repository = null) {
    this.repository = repository || new ForeignWorkerRepository();
  }

  // ==================== VALIDATION SCHEMAS ====================

  workPermitSchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    permitNumber: Joi.string().min(1).max(100).required(),
    permitType: Joi.string().valid('work_permit', 'residence_permit', 'combined').required(),
    issuingCountry: Joi.string().length(2).uppercase().required(), // ISO 3166-1 alpha-2
    issuingAuthority: Joi.string().max(200).optional().allow(null, ''),
    issueDate: Joi.date().required(),
    expiryDate: Joi.date().greater(Joi.ref('issueDate')).required(),
    renewalDate: Joi.date().optional().allow(null),
    status: Joi.string().valid('active', 'expired', 'suspended', 'revoked', 'pending_renewal').optional(),
    restrictions: Joi.string().optional().allow(null, ''),
    sponsor: Joi.string().max(200).optional().allow(null, ''),
    notes: Joi.string().optional().allow(null, ''),
    documentUrl: Joi.string().uri().max(500).optional().allow(null, ''),
    alertDaysBeforeExpiry: Joi.number().integer().min(1).max(365).optional(),
  });

  visaStatusSchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    visaNumber: Joi.string().min(1).max(100).required(),
    visaType: Joi.string().valid('work_visa', 'business_visa', 'dependent_visa').required(),
    issuingCountry: Joi.string().length(2).uppercase().required(),
    destinationCountry: Joi.string().length(2).uppercase().required(),
    issueDate: Joi.date().required(),
    expiryDate: Joi.date().greater(Joi.ref('issueDate')).required(),
    entryDate: Joi.date().optional().allow(null),
    status: Joi.string().valid('active', 'expired', 'cancelled', 'pending').optional(),
    maxStayDays: Joi.number().integer().min(1).optional().allow(null),
    entriesAllowed: Joi.string().valid('single', 'multiple').optional().allow(null),
    notes: Joi.string().optional().allow(null, ''),
    documentUrl: Joi.string().uri().max(500).optional().allow(null, ''),
    alertDaysBeforeExpiry: Joi.number().integer().min(1).max(365).optional(),
  });

  taxResidencySchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    country: Joi.string().length(2).uppercase().required(),
    taxIdentificationNumber: Joi.string().max(100).optional().allow(null, ''),
    residencyType: Joi.string().valid('resident', 'non_resident', 'dual_resident').required(),
    effectiveFrom: Joi.date().required(),
    effectiveTo: Joi.date().greater(Joi.ref('effectiveFrom')).optional().allow(null),
    isCurrent: Joi.boolean().optional(),
    treatyCountry: Joi.string().length(2).uppercase().optional().allow(null),
    treatyArticle: Joi.string().max(50).optional().allow(null, ''),
    withholdingRate: Joi.number().min(0).max(100).precision(2).optional().allow(null),
    daysInCountry: Joi.number().integer().min(0).max(366).optional().allow(null),
    permanentEstablishment: Joi.boolean().optional(),
    centerOfVitalInterests: Joi.boolean().optional(),
    notes: Joi.string().optional().allow(null, ''),
    certificateUrl: Joi.string().uri().max(500).optional().allow(null, ''),
  });

  // ==================== WORK PERMIT METHODS ====================

  /**
   * Create a work permit
   */
  async createWorkPermit(permitData, organizationId, userId) {
    // Validate input
    const { error, value } = this.workPermitSchema.validate(permitData, {
      stripUnknown: true,
      abortEarly: false,
    });

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      // Convert API format to DB format
      const dbPermit = mapWorkPermitApiToDb(value);
      
      const result = await this.repository.createWorkPermit(dbPermit, organizationId, userId);
      
      // Create audit log
      await this.repository.createComplianceAuditLog(
        {
          employee_id: value.employeeId,
          event_type: 'work_permit_created',
          event_category: 'work_permit',
          severity: 'info',
          description: `Work permit ${value.permitNumber} created for employee`,
          work_permit_id: result.id,
        },
        organizationId,
        userId
      );

      logger.info('Work permit created', {
        permitId: result.id,
        employeeId: value.employeeId,
        organizationId,
      });

      return mapWorkPermitDbToApi(result);
    } catch (err) {
      logger.error('Error creating work permit', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get work permits for an employee
   */
  async getWorkPermitsByEmployee(employeeId, organizationId, filters = {}) {
    try {
      const dbPermits = await this.repository.findWorkPermitsByEmployee(
        employeeId,
        organizationId,
        filters
      );
      return mapWorkPermitsDbToApi(dbPermits);
    } catch (err) {
      logger.error('Error fetching work permits', { error: err.message, employeeId });
      throw err;
    }
  }

  /**
   * Get work permit by ID
   */
  async getWorkPermitById(permitId, organizationId) {
    try {
      const dbPermit = await this.repository.findWorkPermitById(permitId, organizationId);
      
      if (!dbPermit) {
        throw new NotFoundError('Work permit not found');
      }

      return mapWorkPermitDbToApi(dbPermit);
    } catch (err) {
      logger.error('Error fetching work permit', { error: err.message, permitId });
      throw err;
    }
  }

  /**
   * Update work permit
   */
  async updateWorkPermit(permitId, updates, organizationId, userId) {
    try {
      // Validate partial schema
      const allowedFields = [
        'renewalDate', 'status', 'restrictions', 'sponsor', 'notes',
        'documentUrl', 'alertDaysBeforeExpiry', 'expiryDate',
      ];

      const filteredUpdates = {};
      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      const dbUpdates = mapWorkPermitApiToDb(filteredUpdates);
      const result = await this.repository.updateWorkPermit(permitId, dbUpdates, organizationId, userId);

      if (!result) {
        throw new NotFoundError('Work permit not found');
      }

      // Create audit log
      await this.repository.createComplianceAuditLog(
        {
          employee_id: result.employee_id,
          event_type: 'work_permit_updated',
          event_category: 'work_permit',
          severity: 'info',
          description: `Work permit updated: ${Object.keys(filteredUpdates).join(', ')}`,
          work_permit_id: permitId,
        },
        organizationId,
        userId
      );

      logger.info('Work permit updated', {
        permitId,
        updatedFields: Object.keys(filteredUpdates),
        organizationId,
      });

      return mapWorkPermitDbToApi(result);
    } catch (err) {
      logger.error('Error updating work permit', { error: err.message, permitId });
      throw err;
    }
  }

  /**
   * Get expiring work permits
   */
  async getExpiringWorkPermits(organizationId, daysAhead = 90) {
    try {
      const dbPermits = await this.repository.findExpiringWorkPermits(organizationId, daysAhead);
      return mapWorkPermitsDbToApi(dbPermits);
    } catch (err) {
      logger.error('Error fetching expiring work permits', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get expired work permits
   */
  async getExpiredWorkPermits(organizationId) {
    try {
      const dbPermits = await this.repository.findExpiredWorkPermits(organizationId);
      return mapWorkPermitsDbToApi(dbPermits);
    } catch (err) {
      logger.error('Error fetching expired work permits', { error: err.message, organizationId });
      throw err;
    }
  }

  // ==================== VISA STATUS METHODS ====================

  /**
   * Create a visa status
   */
  async createVisaStatus(visaData, organizationId, userId) {
    const { error, value } = this.visaStatusSchema.validate(visaData, {
      stripUnknown: true,
      abortEarly: false,
    });

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      const dbVisa = mapVisaStatusApiToDb(value);
      const result = await this.repository.createVisaStatus(dbVisa, organizationId, userId);

      // Create audit log
      await this.repository.createComplianceAuditLog(
        {
          employee_id: value.employeeId,
          event_type: 'visa_created',
          event_category: 'visa',
          severity: 'info',
          description: `Visa ${value.visaNumber} created for employee`,
          visa_status_id: result.id,
        },
        organizationId,
        userId
      );

      logger.info('Visa status created', {
        visaId: result.id,
        employeeId: value.employeeId,
        organizationId,
      });

      return mapVisaStatusDbToApi(result);
    } catch (err) {
      logger.error('Error creating visa status', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get visa statuses for an employee
   */
  async getVisaStatusesByEmployee(employeeId, organizationId, filters = {}) {
    try {
      const dbVisas = await this.repository.findVisaStatusesByEmployee(
        employeeId,
        organizationId,
        filters
      );
      return mapVisaStatusesDbToApi(dbVisas);
    } catch (err) {
      logger.error('Error fetching visa statuses', { error: err.message, employeeId });
      throw err;
    }
  }

  /**
   * Get visa status by ID
   */
  async getVisaStatusById(visaId, organizationId) {
    try {
      const dbVisa = await this.repository.findVisaStatusById(visaId, organizationId);

      if (!dbVisa) {
        throw new NotFoundError('Visa status not found');
      }

      return mapVisaStatusDbToApi(dbVisa);
    } catch (err) {
      logger.error('Error fetching visa status', { error: err.message, visaId });
      throw err;
    }
  }

  /**
   * Update visa status
   */
  async updateVisaStatus(visaId, updates, organizationId, userId) {
    try {
      const allowedFields = [
        'status', 'entryDate', 'maxStayDays', 'entriesAllowed', 'notes',
        'documentUrl', 'alertDaysBeforeExpiry', 'expiryDate',
      ];

      const filteredUpdates = {};
      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      const dbUpdates = mapVisaStatusApiToDb(filteredUpdates);
      const result = await this.repository.updateVisaStatus(visaId, dbUpdates, organizationId, userId);

      if (!result) {
        throw new NotFoundError('Visa status not found');
      }

      // Create audit log
      await this.repository.createComplianceAuditLog(
        {
          employee_id: result.employee_id,
          event_type: 'visa_updated',
          event_category: 'visa',
          severity: 'info',
          description: `Visa status updated: ${Object.keys(filteredUpdates).join(', ')}`,
          visa_status_id: visaId,
        },
        organizationId,
        userId
      );

      logger.info('Visa status updated', {
        visaId,
        updatedFields: Object.keys(filteredUpdates),
        organizationId,
      });

      return mapVisaStatusDbToApi(result);
    } catch (err) {
      logger.error('Error updating visa status', { error: err.message, visaId });
      throw err;
    }
  }

  /**
   * Get expiring visas
   */
  async getExpiringVisas(organizationId, daysAhead = 60) {
    try {
      const dbVisas = await this.repository.findExpiringVisas(organizationId, daysAhead);
      return mapVisaStatusesDbToApi(dbVisas);
    } catch (err) {
      logger.error('Error fetching expiring visas', { error: err.message, organizationId });
      throw err;
    }
  }

  // ==================== TAX RESIDENCY METHODS ====================

  /**
   * Create a tax residency record
   */
  async createTaxResidency(residencyData, organizationId, userId) {
    const { error, value } = this.taxResidencySchema.validate(residencyData, {
      stripUnknown: true,
      abortEarly: false,
    });

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      const dbResidency = mapTaxResidencyApiToDb(value);
      const result = await this.repository.createTaxResidency(dbResidency, organizationId, userId);

      // Create audit log
      await this.repository.createComplianceAuditLog(
        {
          employee_id: value.employeeId,
          event_type: 'tax_residency_created',
          event_category: 'tax_residency',
          severity: 'info',
          description: `Tax residency created for ${value.country}`,
          tax_residency_id: result.id,
        },
        organizationId,
        userId
      );

      logger.info('Tax residency created', {
        residencyId: result.id,
        employeeId: value.employeeId,
        country: value.country,
        organizationId,
      });

      return mapTaxResidencyDbToApi(result);
    } catch (err) {
      logger.error('Error creating tax residency', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get tax residencies for an employee
   */
  async getTaxResidenciesByEmployee(employeeId, organizationId, currentOnly = false) {
    try {
      const dbResidencies = await this.repository.findTaxResidenciesByEmployee(
        employeeId,
        organizationId,
        currentOnly
      );
      return mapTaxResidenciesDbToApi(dbResidencies);
    } catch (err) {
      logger.error('Error fetching tax residencies', { error: err.message, employeeId });
      throw err;
    }
  }

  /**
   * Get current tax residency for an employee
   */
  async getCurrentTaxResidency(employeeId, organizationId) {
    try {
      const dbResidency = await this.repository.findCurrentTaxResidency(employeeId, organizationId);
      return mapTaxResidencyDbToApi(dbResidency);
    } catch (err) {
      logger.error('Error fetching current tax residency', { error: err.message, employeeId });
      throw err;
    }
  }

  /**
   * Update tax residency
   */
  async updateTaxResidency(residencyId, updates, organizationId, userId) {
    try {
      const allowedFields = [
        'taxIdentificationNumber', 'effectiveTo', 'isCurrent', 'treatyCountry',
        'treatyArticle', 'withholdingRate', 'daysInCountry', 'permanentEstablishment',
        'centerOfVitalInterests', 'notes', 'certificateUrl',
      ];

      const filteredUpdates = {};
      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      const dbUpdates = mapTaxResidencyApiToDb(filteredUpdates);
      const result = await this.repository.updateTaxResidency(residencyId, dbUpdates, organizationId, userId);

      if (!result) {
        throw new NotFoundError('Tax residency not found');
      }

      // Create audit log
      await this.repository.createComplianceAuditLog(
        {
          employee_id: result.employee_id,
          event_type: 'tax_residency_updated',
          event_category: 'tax_residency',
          severity: 'info',
          description: `Tax residency updated: ${Object.keys(filteredUpdates).join(', ')}`,
          tax_residency_id: residencyId,
        },
        organizationId,
        userId
      );

      logger.info('Tax residency updated', {
        residencyId,
        updatedFields: Object.keys(filteredUpdates),
        organizationId,
      });

      return mapTaxResidencyDbToApi(result);
    } catch (err) {
      logger.error('Error updating tax residency', { error: err.message, residencyId });
      throw err;
    }
  }

  // ==================== COMPLIANCE MONITORING ====================

  /**
   * Get compliance summary for organization
   */
  async getComplianceSummary(organizationId) {
    try {
      const summary = await this.repository.getComplianceSummary(organizationId);
      return summary || {
        employeesWithWorkPermits: 0,
        employeesWithVisas: 0,
        employeesWithTaxResidency: 0,
        permitsExpiringSoon: 0,
        permitsExpired: 0,
        visasExpiringSoon: 0,
        visasExpired: 0,
      };
    } catch (err) {
      logger.error('Error fetching compliance summary', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get compliance audit logs
   */
  async getComplianceAuditLogs(organizationId, filters = {}) {
    try {
      const dbLogs = await this.repository.findComplianceAuditLogs(organizationId, filters);
      return mapComplianceAuditLogsDbToApi(dbLogs);
    } catch (err) {
      logger.error('Error fetching compliance audit logs', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Run compliance checks and create alerts for expiring permits/visas
   */
  async runComplianceChecks(organizationId, userId) {
    try {
      const alerts = [];

      // Check for expiring work permits
      const expiringPermits = await this.getExpiringWorkPermits(organizationId, 90);
      for (const permit of expiringPermits) {
        const daysUntilExpiry = Math.ceil(
          (new Date(permit.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
        );

        const severity = daysUntilExpiry <= 30 ? 'critical' : daysUntilExpiry <= 60 ? 'warning' : 'info';

        await this.repository.createComplianceAuditLog(
          {
            employee_id: permit.employeeId,
            event_type: 'permit_expiring',
            event_category: 'alert',
            severity,
            description: `Work permit ${permit.permitNumber} expiring in ${daysUntilExpiry} days`,
            work_permit_id: permit.id,
            event_data: { days_until_expiry: daysUntilExpiry },
          },
          organizationId,
          userId
        );

        alerts.push({
          type: 'work_permit',
          severity,
          permitId: permit.id,
          employeeId: permit.employeeId,
          daysUntilExpiry,
        });
      }

      // Check for expired work permits
      const expiredPermits = await this.getExpiredWorkPermits(organizationId);
      for (const permit of expiredPermits) {
        await this.repository.createComplianceAuditLog(
          {
            employee_id: permit.employeeId,
            event_type: 'permit_expired',
            event_category: 'alert',
            severity: 'critical',
            description: `Work permit ${permit.permitNumber} has expired`,
            work_permit_id: permit.id,
          },
          organizationId,
          userId
        );

        alerts.push({
          type: 'work_permit_expired',
          severity: 'critical',
          permitId: permit.id,
          employeeId: permit.employeeId,
        });
      }

      // Check for expiring visas
      const expiringVisas = await this.getExpiringVisas(organizationId, 60);
      for (const visa of expiringVisas) {
        const daysUntilExpiry = Math.ceil(
          (new Date(visa.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
        );

        const severity = daysUntilExpiry <= 14 ? 'critical' : daysUntilExpiry <= 30 ? 'warning' : 'info';

        await this.repository.createComplianceAuditLog(
          {
            employee_id: visa.employeeId,
            event_type: 'visa_expiring',
            event_category: 'alert',
            severity,
            description: `Visa ${visa.visaNumber} expiring in ${daysUntilExpiry} days`,
            visa_status_id: visa.id,
            event_data: { days_until_expiry: daysUntilExpiry },
          },
          organizationId,
          userId
        );

        alerts.push({
          type: 'visa',
          severity,
          visaId: visa.id,
          employeeId: visa.employeeId,
          daysUntilExpiry,
        });
      }

      logger.info('Compliance checks completed', {
        organizationId,
        alertsCreated: alerts.length,
      });

      return {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter((a) => a.severity === 'critical').length,
        warningAlerts: alerts.filter((a) => a.severity === 'warning').length,
        infoAlerts: alerts.filter((a) => a.severity === 'info').length,
        alerts,
      };
    } catch (err) {
      logger.error('Error running compliance checks', { error: err.message, organizationId });
      throw err;
    }
  }
}

export default ForeignWorkerComplianceService;
