/**
 * ApplicationService - Business logic layer for applications
 * Implements all business rules and orchestrates repository calls
 */

import type { ApplicationData, ApplicationSearchFilters, PaginatedResponse } from '../../types/recruitment.types.js';
import { ApplicationRepository, FindByJobOptions } from '../../repositories/ApplicationRepository.js';
import { JobRepository } from '../../repositories/JobRepository.js';
import { CandidateRepository } from '../../repositories/CandidateRepository.js';
import Organization from '../../models/Organization.js';
import logger from '../../utils/logger.js';
import { ValidationError, BusinessRuleError, NotFoundError } from '../../middleware/errorHandler.js';
import Joi from 'joi';

export class ApplicationService {
  applicationRepository: ApplicationRepository;
  jobRepository: JobRepository;
  candidateRepository: CandidateRepository;
  logger: typeof logger;
  
  constructor(
    applicationRepository: ApplicationRepository | null = null,
    jobRepository: JobRepository | null = null,
    candidateRepository: CandidateRepository | null = null
  ) {
    this.applicationRepository = applicationRepository || new ApplicationRepository();
    this.jobRepository = jobRepository || new JobRepository();
    this.candidateRepository = candidateRepository || new CandidateRepository();
    this.logger = logger;
  }

  /**
   * Validation schema for application creation
   */
  static get createSchema() {
    return Joi.object({
      candidate_id: Joi.string().uuid().required(),
      job_id: Joi.string().uuid().required(),
      cover_letter: Joi.string().max(5000).allow(null, ''),
      source: Joi.string().valid('website', 'referral', 'linkedin', 'indeed', 'other').default('website'),
      referrer_name: Joi.string().max(255).allow(null, ''),
      answers: Joi.object().allow(null),
      metadata: Joi.object().allow(null)
    });
  }

  /**
   * Validation schema for application update
   */
  static get updateSchema() {
    return Joi.object({
      status: Joi.string().valid('applied', 'screening', 'interview', 'offer', 'hired', 'rejected'),
      cover_letter: Joi.string().max(5000).allow(null, ''),
      notes: Joi.string().max(2000).allow(null, ''),
      reviewed_by: Joi.string().uuid().allow(null),
      answers: Joi.object().allow(null),
      metadata: Joi.object().allow(null)
    }).min(1);
  }

  /**
   * Create a new application
   */
  async create(data, user) {
    try {
      // Validate input
      const { error, value } = ApplicationService.createSchema.validate(data);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const organizationId = user.organization_id;

      // Check if job exists and is open for applications
      const job = await this.jobRepository.findById(value.job_id, organizationId);
      if (!job) {
        throw new NotFoundError('Job not found');
      }

      if (job.status === 'closed') {
        throw new BusinessRuleError('Cannot apply to a closed job');
      }

      if (!job.is_published) {
        throw new BusinessRuleError('Cannot apply to an unpublished job');
      }

      // Check if candidate exists
      const candidate = await this.candidateRepository.findById(value.candidate_id, organizationId);
      if (!candidate) {
        throw new NotFoundError('Candidate not found');
      }

      // Check for duplicate application
      const existingApplication = await this.applicationRepository.findByCandidateAndJob(
        value.candidate_id,
        value.job_id,
        organizationId
      );

      if (existingApplication) {
        throw new BusinessRuleError('Candidate has already applied to this job');
      }

      // Create application with default status
      const applicationData = {
        ...value,
        status: 'applied',
        applied_at: new Date(),
        created_by: user.id,
        status_history: [{
          status: 'applied',
          changed_at: new Date(),
          changed_by: user.id,
          notes: 'Application submitted'
        }]
      };

      const application = await this.applicationRepository.create(
        applicationData,
        organizationId
      );

      this.logger.info('Application created', {
        applicationId: application.id,
        candidateId: value.candidate_id,
        jobId: value.job_id,
        organizationId
      });

      return this.sanitizeApplication(application);
    } catch (error) {
      this.logger.error('Error creating application:', error);
      throw error;
    }
  }

  /**
   * Get application by ID
   */
  async getById(id, user, includeDetails = false) {
    try {
      const organizationId = user.organization_id;

      let application;
      if (includeDetails) {
        application = await this.applicationRepository.findByIdWithDetails(id, organizationId);
      } else {
        application = await this.applicationRepository.findById(id, organizationId);
      }

      if (!application) {
        throw new NotFoundError('Application not found');
      }

      return this.sanitizeApplication(application);
    } catch (error) {
      this.logger.error('Error getting application:', error);
      throw error;
    }
  }

  /**
   * Update application
   */
  async update(id, data, user) {
    try {
      // Validate input
      const { error, value } = ApplicationService.updateSchema.validate(data);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const organizationId = user.organization_id;

      // Check if application exists
      const existingApplication = await this.applicationRepository.findById(id, organizationId);
      if (!existingApplication) {
        throw new NotFoundError('Application not found');
      }

      // Business rule: Cannot change status from hired or rejected to other statuses
      if (value.status && ['hired', 'rejected'].includes(existingApplication.status)) {
        if (value.status !== existingApplication.status) {
          throw new BusinessRuleError(
            `Cannot change application status from '${existingApplication.status}' to '${value.status}'`
          );
        }
      }

      // Business rule: Status flow validation
      if (value.status && value.status !== existingApplication.status) {
        this.validateStatusTransition(existingApplication.status, value.status);
      }

      const updateData = {
        ...value,
        updated_by: user.id
      };

      // If status is being changed, use the special updateStatus method
      if (value.status && value.status !== existingApplication.status) {
        const application = await this.applicationRepository.updateStatus(
          id,
          value.status,
          value.reviewed_by || user.id,
          value.notes || null,
          organizationId
        );

        this.logger.info('Application status updated', {
          applicationId: id,
          oldStatus: existingApplication.status,
          newStatus: value.status,
          organizationId
        });

        return this.sanitizeApplication(application);
      }

      // Regular update
      const application = await this.applicationRepository.update(
        id,
        updateData,
        organizationId
      );

      this.logger.info('Application updated', {
        applicationId: id,
        organizationId
      });

      return this.sanitizeApplication(application);
    } catch (error) {
      this.logger.error('Error updating application:', error);
      throw error;
    }
  }

  /**
   * Delete application (soft delete)
   */
  async delete(id, user) {
    try {
      const organizationId = user.organization_id;

      // Check if application exists
      const application = await this.applicationRepository.findById(id, organizationId);
      if (!application) {
        throw new NotFoundError('Application not found');
      }

      // Business rule: Cannot delete hired applications
      if (application.status === 'hired') {
        throw new BusinessRuleError('Cannot delete applications with hired status');
      }

      await this.applicationRepository.delete(id, organizationId);

      this.logger.info('Application deleted', {
        applicationId: id,
        organizationId
      });

      return true;
    } catch (error) {
      this.logger.error('Error deleting application:', error);
      throw error;
    }
  }

  /**
   * Search applications with filters
   */
  async search(filters, user) {
    try {
      const organizationId = user.organization_id;
      const result = await this.applicationRepository.search(filters, organizationId);

      return {
        ...result,
        applications: result.applications.map(app => this.sanitizeApplication(app))
      };
    } catch (error) {
      this.logger.error('Error searching applications:', error);
      throw error;
    }
  }

  /**
   * Get applications for a specific job
   */
  async getByJob(jobId: string, user: { organization_id: string }, options: FindByJobOptions = {}) {
    try {
      const organizationId = user.organization_id;

      // Check if job exists
      const job = await this.jobRepository.findById(jobId, organizationId);
      if (!job) {
        throw new NotFoundError('Job not found');
      }

      const result = await this.applicationRepository.findByJob(jobId, organizationId, options);

      return {
        ...result,
        applications: result.applications.map(app => this.sanitizeApplication(app))
      };
    } catch (error) {
      this.logger.error('Error getting applications by job:', error);
      throw error;
    }
  }

  /**
   * Get applications for a specific candidate
   */
  async getByCandidate(candidateId, user) {
    try {
      const organizationId = user.organization_id;

      // Check if candidate exists
      const candidate = await this.candidateRepository.findById(candidateId, organizationId);
      if (!candidate) {
        throw new NotFoundError('Candidate not found');
      }

      const applications = await this.applicationRepository.findByCandidate(
        candidateId,
        organizationId
      );

      return applications.map(app => this.sanitizeApplication(app));
    } catch (error) {
      this.logger.error('Error getting applications by candidate:', error);
      throw error;
    }
  }

  /**
   * Get application statistics
   */
  async getStatistics(user, jobId = null) {
    try {
      const organizationId = user.organization_id;

      const [byStatus, pipelineStats] = await Promise.all([
        this.applicationRepository.getCountByStatus(organizationId),
        this.applicationRepository.getPipelineStats(organizationId, jobId)
      ]);

      const total = byStatus.reduce((sum, item) => sum + parseInt(item.count, 10), 0);

      return {
        byStatus,
        total,
        pipeline: pipelineStats
      };
    } catch (error) {
      this.logger.error('Error getting application statistics:', error);
      throw error;
    }
  }

  /**
   * Change application status
   */
  async changeStatus(id, status, user, notes = null) {
    try {
      const organizationId = user.organization_id;

      // Validate status
      const validStatuses = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Check if application exists
      const existingApplication = await this.applicationRepository.findById(id, organizationId);
      if (!existingApplication) {
        throw new NotFoundError('Application not found');
      }

      // Business rule: Cannot change status from hired or rejected
      if (['hired', 'rejected'].includes(existingApplication.status) && 
          status !== existingApplication.status) {
        throw new BusinessRuleError(
          `Cannot change application status from '${existingApplication.status}' to '${status}'`
        );
      }

      // Validate status transition
      this.validateStatusTransition(existingApplication.status, status);

      const application = await this.applicationRepository.updateStatus(
        id,
        status,
        user.id,
        notes,
        organizationId
      );

      this.logger.info('Application status changed', {
        applicationId: id,
        oldStatus: existingApplication.status,
        newStatus: status,
        organizationId
      });

      return this.sanitizeApplication(application);
    } catch (error) {
      this.logger.error('Error changing application status:', error);
      throw error;
    }
  }

  /**
   * Get recent applications
   */
  async getRecent(user, limit = 10) {
    try {
      const organizationId = user.organization_id;
      const applications = await this.applicationRepository.getRecent(organizationId, limit);

      return applications.map(app => this.sanitizeApplication(app));
    } catch (error) {
      this.logger.error('Error getting recent applications:', error);
      throw error;
    }
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(currentStatus, newStatus) {
    // Define allowed transitions
    const allowedTransitions = {
      'applied': ['screening', 'rejected'],
      'screening': ['interview', 'rejected'],
      'interview': ['offer', 'rejected'],
      'offer': ['hired', 'rejected'],
      'hired': [], // Cannot transition from hired
      'rejected': [] // Cannot transition from rejected
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new BusinessRuleError(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. ` +
        `Allowed transitions: ${allowedTransitions[currentStatus]?.join(', ') || 'none'}`
      );
    }
  }

  /**
   * Sanitize application data
   */
  sanitizeApplication(application) {
    if (!application) return null;

    // Remove sensitive fields if needed
    const sanitized = { ...application };

    // Ensure dates are ISO strings
    if (sanitized.applied_at) {
      sanitized.applied_at = new Date(sanitized.applied_at).toISOString();
    }
    if (sanitized.reviewed_at) {
      sanitized.reviewed_at = new Date(sanitized.reviewed_at).toISOString();
    }
    if (sanitized.created_at) {
      sanitized.created_at = new Date(sanitized.created_at).toISOString();
    }
    if (sanitized.updated_at) {
      sanitized.updated_at = new Date(sanitized.updated_at).toISOString();
    }

    return sanitized;
  }
}
