/**
 * JobService - Business logic layer for jobs
 * Implements all business rules and orchestrates repository calls
 */

import type { JobData, JobSearchFilters, JobStatistics, PaginatedResponse } from '../../types/recruitment.types.js';
import { JobRepository } from '../../repositories/JobRepository.js';
import Organization from '../../models/Organization.js';
import logger from '../../utils/logger.js';
import { ValidationError, BusinessRuleError, NotFoundError } from '../../middleware/errorHandler.js';
import Joi from 'joi';

export class JobService {
  jobRepository: JobRepository;
  logger: typeof logger;
  
  static createSchema: Joi.ObjectSchema;
  static updateSchema: Joi.ObjectSchema;
  static searchSchema: Joi.ObjectSchema;
  
  constructor(jobRepository: JobRepository | null = null) {
    this.jobRepository = jobRepository || new JobRepository();
    this.logger = logger;
  }

  /**
   * Validation schema for job creation
   */
  static get createSchema() {
    return Joi.object({
      workspace_id: Joi.string().uuid().required(),
      title: Joi.string().required().trim().min(3).max(200),
      description: Joi.string().required().min(50),
      department: Joi.string().trim().max(100).optional().allow(''),
      location: Joi.string().trim().max(200).optional().allow(''),
      employment_type: Joi.string().valid('full-time', 'part-time', 'contract', 'temporary', 'internship').required(),
      experience_level: Joi.string().valid('entry', 'mid', 'senior', 'lead', 'executive').optional().allow(''),
      remote_policy: Joi.string().valid('onsite', 'hybrid', 'remote').optional().allow(null),
      is_remote: Joi.boolean().default(false),
      requirements: Joi.alternatives().try(
        Joi.array().items(Joi.string()),
        Joi.string()
      ).optional().allow('', null),
      responsibilities: Joi.alternatives().try(
        Joi.array().items(Joi.string()),
        Joi.string()
      ).optional().allow('', null),
      benefits: Joi.alternatives().try(
        Joi.array().items(Joi.string()),
        Joi.string()
      ).optional().allow('', null),
      salary_min: Joi.number().integer().min(0).optional().allow(null),
      salary_max: Joi.number().integer().min(0).optional().allow(null),
      salary_currency: Joi.string().max(10).default('USD'),
      status: Joi.string().valid('draft', 'open', 'paused', 'filled', 'closed', 'archived').default('draft'),
      is_public: Joi.boolean().default(false),
      public_slug: Joi.string().max(255).optional().allow(null),
      public_portal_settings: Joi.object().optional().allow(null),
      flow_template_id: Joi.string().uuid().optional().allow(null),
      hiring_manager_id: Joi.string().uuid().optional().allow(null),
      recruiter_id: Joi.string().uuid().optional().allow(null),
      posted_at: Joi.date().iso().optional().allow(null),
      closes_at: Joi.date().iso().optional().allow(null)
    }).custom((value, helpers) => {
      // Validate salary range
      if (value.salary_min && value.salary_max && value.salary_min > value.salary_max) {
        return helpers.error('any.custom', {
          message: 'Minimum salary cannot be greater than maximum salary'
        });
      }
      return value;
    });
  }

  /**
   * Validation schema for job update
   */
  static get updateSchema() {
    return Joi.object({
      title: Joi.string().optional().trim().min(3).max(200),
      description: Joi.string().optional().min(50),
      department: Joi.string().optional().trim().max(100),
      location: Joi.string().optional().trim().max(200),
      employment_type: Joi.string().valid('full-time', 'part-time', 'contract', 'temporary', 'internship').optional(),
      experience_level: Joi.string().valid('entry', 'mid', 'senior', 'lead', 'executive').optional(),
      salary_min: Joi.number().integer().min(0).optional().allow(null),
      salary_max: Joi.number().integer().min(0).optional().allow(null),
      salary_currency: Joi.string().length(3).uppercase().optional(),
      requirements: Joi.array().items(Joi.string()).optional(),
      responsibilities: Joi.array().items(Joi.string()).optional(),
      benefits: Joi.array().items(Joi.string()).optional(),
      skills_required: Joi.array().items(Joi.string()).optional(),
      skills_preferred: Joi.array().items(Joi.string()).optional(),
      hiring_manager_id: Joi.string().uuid().optional().allow(null),
      status: Joi.string().valid('draft', 'open', 'on-hold', 'closed', 'cancelled').optional(),
      is_published: Joi.boolean().optional(),
      remote_ok: Joi.boolean().optional(),
      visa_sponsorship: Joi.boolean().optional(),
      application_deadline: Joi.date().iso().optional().allow(null),
      positions_count: Joi.number().integer().min(1).optional()
    }).min(1).custom((value, helpers) => {
      // Validate salary range
      if (value.salary_min && value.salary_max && value.salary_min > value.salary_max) {
        return helpers.error('any.custom', {
          message: 'Minimum salary cannot be greater than maximum salary'
        });
      }
      return value;
    });
  }

  /**
   * Create a new job
   * @param {Object} data - Job data
   * @param {Object} user - Current user context
   * @returns {Promise<Object>}
   */
  async create(data, user) {
    try {
      // Validate input
      const { error, value } = JobService.createSchema.validate(data);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Check organization job limit
      await this.checkJobLimit(user.organization_id);

      // Generate unique slug for public job page
      const slug = await this.jobRepository.generateUniqueSlug(value.title);

      // Create job with slug
      const jobData = {
        ...value,
        public_slug: slug
      };

      const job = await this.jobRepository.create(jobData, user.organization_id);

      this.logger.info('Job created', {
        jobId: job.id,
        title: job.title,
        organizationId: user.organization_id,
        userId: user.id
      });

      return this.sanitizeJob(job);
    } catch (error) {
      this.logger.error('Error creating job', {
        error: error.message,
        organizationId: user.organization_id,
        userId: user.id
      });
      throw error;
    }
  }

  /**
   * Get job by ID
   * @param {string} id - Job ID
   * @param {Object} user - Current user context
   * @param {boolean} includeStats - Include application statistics
   * @returns {Promise<Object>}
   */
  async getById(id, user, includeStats = false) {
    try {
      let job;

      if (includeStats) {
        job = await this.jobRepository.findByIdWithStats(id, user.organization_id);
      } else {
        job = await this.jobRepository.findById(id, user.organization_id);
      }

      if (!job) {
        throw new NotFoundError('Job not found');
      }

      return this.sanitizeJob(job);
    } catch (error) {
      this.logger.error('Error getting job', {
        error: error.message,
        jobId: id,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Get job by slug (public access)
   * @param {string} slug - Job slug
   * @returns {Promise<Object>}
   */
  async getBySlug(slug) {
    try {
      const job = await this.jobRepository.findBySlug(slug);

      if (!job) {
        throw new NotFoundError('Job not found');
      }

      // Return public-safe data only
      return this.sanitizeJobForPublic(job);
    } catch (error) {
      this.logger.error('Error getting job by slug', {
        error: error.message,
        slug
      });
      throw error;
    }
  }

  /**
   * Update job
   * @param {string} id - Job ID
   * @param {Object} data - Update data
   * @param {Object} user - Current user context
   * @returns {Promise<Object>}
   */
  async update(id, data, user) {
    try {
      // Validate input
      const { error, value } = JobService.updateSchema.validate(data);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Check if job exists
      const existingJob = await this.jobRepository.findById(id, user.organization_id);

      if (!existingJob) {
        throw new NotFoundError('Job not found');
      }

      // If title is being updated, regenerate slug
      if (value.title && value.title !== existingJob.title) {
        value.public_slug = await this.jobRepository.generateUniqueSlug(value.title, id);
      }

      // Business rule: Cannot change status from 'closed' to 'open' directly
      if (existingJob.status === 'closed' && value.status === 'open') {
        throw new BusinessRuleError(
          'Cannot reopen a closed job. Please create a new job posting instead.'
        );
      }

      // Update job
      const updatedJob = await this.jobRepository.update(id, value, user.organization_id);

      this.logger.info('Job updated', {
        jobId: id,
        changes: Object.keys(value),
        organizationId: user.organization_id,
        userId: user.id
      });

      return this.sanitizeJob(updatedJob);
    } catch (error) {
      this.logger.error('Error updating job', {
        error: error.message,
        jobId: id,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Delete job (soft delete)
   * @param {string} id - Job ID
   * @param {Object} user - Current user context
   * @returns {Promise<boolean>}
   */
  async delete(id, user) {
    try {
      const job = await this.jobRepository.findById(id, user.organization_id);

      if (!job) {
        throw new NotFoundError('Job not found');
      }

      // Business rule: Cannot delete published jobs with applications
      if (job.is_published) {
        const jobWithStats = await this.jobRepository.findByIdWithStats(id, user.organization_id);
        if (jobWithStats.application_count > 0) {
          throw new BusinessRuleError(
            'Cannot delete a job with active applications. Please close the job instead.'
          );
        }
      }

      const deleted = await this.jobRepository.delete(id, user.organization_id);

      this.logger.info('Job deleted', {
        jobId: id,
        organizationId: user.organization_id,
        userId: user.id
      });

      return deleted;
    } catch (error) {
      this.logger.error('Error deleting job', {
        error: error.message,
        jobId: id,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Search jobs with filters
   * @param {Object} params - Search parameters
   * @param {Object} user - Current user context
   * @returns {Promise<Object>}
   */
  async search(params, user) {
    try {
      const result = await this.jobRepository.search(params, user.organization_id);

      // Sanitize all jobs
      result.jobs = result.jobs.map(j => this.sanitizeJob(j));

      return result;
    } catch (error) {
      this.logger.error('Error searching jobs', {
        error: error.message,
        params,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Get job statistics
   * @param {Object} user - Current user context
   * @returns {Promise<Object>}
   */
  async getStatistics(user) {
    try {
      const [countByStatus, total] = await Promise.all([
        this.jobRepository.getCountByStatus(user.organization_id),
        this.jobRepository.count({}, user.organization_id)
      ]);

      return {
        total,
        byStatus: countByStatus
      };
    } catch (error) {
      this.logger.error('Error getting job statistics', {
        error: error.message,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Publish or unpublish a job
   * @param {string} id - Job ID
   * @param {boolean} publish - True to publish, false to unpublish
   * @param {Object} user - Current user context
   * @returns {Promise<Object>}
   */
  async togglePublish(id, publish, user) {
    try {
      const job = await this.jobRepository.findById(id, user.organization_id);

      if (!job) {
        throw new NotFoundError('Job not found');
      }

      // Business rule: Can only publish jobs in 'draft' or 'open' status
      if (publish && !['draft', 'open'].includes(job.status)) {
        throw new BusinessRuleError(
          `Cannot publish job with status '${job.status}'. Job must be in 'draft' or 'open' status.`
        );
      }

      // Business rule: Auto-set status to 'open' when publishing
      const updates = { is_published: publish };
      if (publish && job.status === 'draft') {
        updates.status = 'open';
      }

      const updatedJob = await this.jobRepository.updatePublishStatus(
        id,
        publish,
        user.organization_id
      );

      this.logger.info(`Job ${publish ? 'published' : 'unpublished'}`, {
        jobId: id,
        organizationId: user.organization_id,
        userId: user.id
      });

      return this.sanitizeJob(updatedJob);
    } catch (error) {
      this.logger.error('Error toggling job publish status', {
        error: error.message,
        jobId: id,
        publish,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Get published jobs for career page
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>}
   */
  async getPublishedJobs(organizationId, filters = {}) {
    try {
      const jobs = await this.jobRepository.getPublishedJobs(organizationId, filters);

      // Return public-safe data
      return jobs.map(j => this.sanitizeJobForPublic(j));
    } catch (error) {
      this.logger.error('Error getting published jobs', {
        error: error.message,
        organizationId,
        filters
      });
      throw error;
    }
  }

  /**
   * Get jobs by hiring manager
   * @param {string} hiringManagerId - Hiring manager user ID
   * @param {Object} user - Current user context
   * @returns {Promise<Array>}
   */
  async getByHiringManager(hiringManagerId, user) {
    try {
      const jobs = await this.jobRepository.getByHiringManager(
        hiringManagerId,
        user.organization_id
      );

      return jobs.map(j => this.sanitizeJob(j));
    } catch (error) {
      this.logger.error('Error getting jobs by hiring manager', {
        error: error.message,
        hiringManagerId,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Close a job (change status to closed)
   * @param {string} id - Job ID
   * @param {Object} user - Current user context
   * @param {string} reason - Optional reason for closing
   * @returns {Promise<Object>}
   */
  async closeJob(id, user, reason = null) {
    try {
      const job = await this.jobRepository.findById(id, user.organization_id);

      if (!job) {
        throw new NotFoundError('Job not found');
      }

      if (job.status === 'closed') {
        throw new BusinessRuleError('Job is already closed');
      }

      const updates = {
        status: 'closed',
        is_published: false, // Unpublish when closing
        closed_at: new Date()
      };

      if (reason) {
        updates.closure_reason = reason;
      }

      const updatedJob = await this.jobRepository.update(id, updates, user.organization_id);

      this.logger.info('Job closed', {
        jobId: id,
        reason,
        organizationId: user.organization_id,
        userId: user.id
      });

      return this.sanitizeJob(updatedJob);
    } catch (error) {
      this.logger.error('Error closing job', {
        error: error.message,
        jobId: id,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Check if organization can create more jobs (business rule)
   * @param {string} organizationId - Organization ID
   * @throws {BusinessRuleError}
   */
  async checkJobLimit(organizationId) {
    try {
      // Get organization with limits
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new NotFoundError('Organization not found');
      }

      // Get current active jobs count
      const currentCount = await this.jobRepository.count(
        { status: ['draft', 'open', 'on-hold'] },
        organizationId
      );

      // Check against limit
      const limit = organization.max_jobs || Infinity;

      if (currentCount >= limit) {
        throw new BusinessRuleError(
          `Job posting limit reached. Your plan allows ${limit} active jobs. Please upgrade your plan to add more.`,
          { current: currentCount, limit }
        );
      }

      return {
        canCreate: true,
        current: currentCount,
        limit,
        remaining: limit - currentCount
      };
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Error checking job limit', {
        error: error.message,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Sanitize job data (remove sensitive info)
   * @param {Object} job - Job object
   * @returns {Object}
   */
  sanitizeJob(job) {
    if (!job) return null;

    // Create a copy to avoid mutating original
    const sanitized = { ...job };

    // Remove internal fields if present
    delete sanitized.internal_notes;
    
    return sanitized;
  }

  /**
   * Sanitize job for public access
   * @param {Object} job - Job object
   * @returns {Object}
   */
  sanitizeJobForPublic(job) {
    if (!job) return null;

    // Only return public-safe fields
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      department: job.department,
      location: job.location,
      employment_type: job.employment_type,
      experience_level: job.experience_level,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      salary_currency: job.salary_currency,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      benefits: job.benefits,
      skills_required: job.skills_required,
      skills_preferred: job.skills_preferred,
      remote_ok: job.remote_ok,
      visa_sponsorship: job.visa_sponsorship,
      application_deadline: job.application_deadline,
      positions_count: job.positions_count,
      public_slug: job.public_slug,
      posted_at: job.posted_at,
      organization_name: job.organization_name,
      organization_website: job.organization_website,
      organization_logo: job.organization_logo,
      application_count: job.application_count
    };
  }
}
