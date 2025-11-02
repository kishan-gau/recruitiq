/**
 * CandidateService - Business logic layer for candidates
 * Implements all business rules and orchestrates repository calls
 */

import { CandidateRepository } from '../repositories/CandidateRepository.js';
import { Organization } from '../models/Organization.js';
import { logger } from '../utils/logger.js';
import { ValidationError, BusinessRuleError, NotFoundError } from '../middleware/errorHandler.js';
import Joi from 'joi';

export class CandidateService {
  constructor() {
    this.candidateRepository = new CandidateRepository();
    this.logger = logger;
  }

  /**
   * Validation schema for candidate creation
   */
  static get createSchema() {
    return Joi.object({
      first_name: Joi.string().required().trim().max(100),
      last_name: Joi.string().required().trim().max(100),
      email: Joi.string().email().required().lowercase().trim(),
      phone: Joi.string().optional().allow('', null).trim().max(50),
      linkedin_url: Joi.string().uri().optional().allow('', null),
      resume_url: Joi.string().optional().allow('', null),
      source: Joi.string().optional().allow('', null),
      status: Joi.string().valid('new', 'screening', 'interviewing', 'offer', 'hired', 'rejected').default('new'),
      tags: Joi.array().items(Joi.string()).optional().default([]),
      notes: Joi.string().optional().allow('', null),
      skills: Joi.array().items(Joi.string()).optional().default([]),
      experience_years: Joi.number().integer().min(0).optional().allow(null),
      current_company: Joi.string().optional().allow('', null).max(200),
      current_title: Joi.string().optional().allow('', null).max(200),
      location: Joi.string().optional().allow('', null).max(200),
      expected_salary: Joi.number().optional().allow(null),
      notice_period_days: Joi.number().integer().min(0).optional().allow(null)
    });
  }

  /**
   * Validation schema for candidate update
   */
  static get updateSchema() {
    return Joi.object({
      first_name: Joi.string().optional().trim().max(100),
      last_name: Joi.string().optional().trim().max(100),
      email: Joi.string().email().optional().lowercase().trim(),
      phone: Joi.string().optional().allow('', null).trim().max(50),
      linkedin_url: Joi.string().uri().optional().allow('', null),
      resume_url: Joi.string().optional().allow('', null),
      source: Joi.string().optional().allow('', null),
      status: Joi.string().valid('new', 'screening', 'interviewing', 'offer', 'hired', 'rejected').optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      notes: Joi.string().optional().allow('', null),
      skills: Joi.array().items(Joi.string()).optional(),
      experience_years: Joi.number().integer().min(0).optional().allow(null),
      current_company: Joi.string().optional().allow('', null).max(200),
      current_title: Joi.string().optional().allow('', null).max(200),
      location: Joi.string().optional().allow('', null).max(200),
      expected_salary: Joi.number().optional().allow(null),
      notice_period_days: Joi.number().integer().min(0).optional().allow(null)
    }).min(1);
  }

  /**
   * Create a new candidate
   * @param {Object} data - Candidate data
   * @param {Object} user - Current user context
   * @returns {Promise<Object>}
   */
  async create(data, user) {
    try {
      // Validate input
      const { error, value } = CandidateService.createSchema.validate(data);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Check organization candidate limit
      await this.checkCandidateLimit(user.organization_id);

      // Check for duplicate email
      const existingCandidate = await this.candidateRepository.findByEmail(
        value.email,
        user.organization_id
      );

      if (existingCandidate) {
        throw new BusinessRuleError(
          `A candidate with email ${value.email} already exists`
        );
      }

      // Create candidate
      const candidate = await this.candidateRepository.create(
        value,
        user.organization_id
      );

      this.logger.info('Candidate created', {
        candidateId: candidate.id,
        email: candidate.email,
        organizationId: user.organization_id,
        userId: user.id
      });

      // Remove sensitive data before returning
      return this.sanitizeCandidate(candidate);
    } catch (error) {
      this.logger.error('Error creating candidate', {
        error: error.message,
        organizationId: user.organization_id,
        userId: user.id
      });
      throw error;
    }
  }

  /**
   * Get candidate by ID
   * @param {string} id - Candidate ID
   * @param {Object} user - Current user context
   * @param {boolean} includeApplications - Include applications data
   * @returns {Promise<Object>}
   */
  async getById(id, user, includeApplications = false) {
    try {
      let candidate;

      if (includeApplications) {
        candidate = await this.candidateRepository.findByIdWithApplications(
          id,
          user.organization_id
        );
      } else {
        candidate = await this.candidateRepository.findById(id, user.organization_id);
      }

      if (!candidate) {
        throw new NotFoundError('Candidate not found');
      }

      return this.sanitizeCandidate(candidate);
    } catch (error) {
      this.logger.error('Error getting candidate', {
        error: error.message,
        candidateId: id,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Update candidate
   * @param {string} id - Candidate ID
   * @param {Object} data - Update data
   * @param {Object} user - Current user context
   * @returns {Promise<Object>}
   */
  async update(id, data, user) {
    try {
      // Validate input
      const { error, value } = CandidateService.updateSchema.validate(data);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Check if candidate exists
      const existingCandidate = await this.candidateRepository.findById(
        id,
        user.organization_id
      );

      if (!existingCandidate) {
        throw new NotFoundError('Candidate not found');
      }

      // If email is being updated, check for duplicates
      if (value.email && value.email !== existingCandidate.email) {
        const duplicateCandidate = await this.candidateRepository.findByEmail(
          value.email,
          user.organization_id
        );

        if (duplicateCandidate) {
          throw new BusinessRuleError(
            `A candidate with email ${value.email} already exists`
          );
        }
      }

      // Update candidate
      const updatedCandidate = await this.candidateRepository.update(
        id,
        value,
        user.organization_id
      );

      this.logger.info('Candidate updated', {
        candidateId: id,
        changes: Object.keys(value),
        organizationId: user.organization_id,
        userId: user.id
      });

      return this.sanitizeCandidate(updatedCandidate);
    } catch (error) {
      this.logger.error('Error updating candidate', {
        error: error.message,
        candidateId: id,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Delete candidate (soft delete)
   * @param {string} id - Candidate ID
   * @param {Object} user - Current user context
   * @returns {Promise<boolean>}
   */
  async delete(id, user) {
    try {
      const candidate = await this.candidateRepository.findById(id, user.organization_id);

      if (!candidate) {
        throw new NotFoundError('Candidate not found');
      }

      const deleted = await this.candidateRepository.delete(id, user.organization_id);

      this.logger.info('Candidate deleted', {
        candidateId: id,
        organizationId: user.organization_id,
        userId: user.id
      });

      return deleted;
    } catch (error) {
      this.logger.error('Error deleting candidate', {
        error: error.message,
        candidateId: id,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Search candidates with filters
   * @param {Object} params - Search parameters
   * @param {Object} user - Current user context
   * @returns {Promise<Object>}
   */
  async search(params, user) {
    try {
      const result = await this.candidateRepository.search(params, user.organization_id);

      // Sanitize all candidates
      result.candidates = result.candidates.map(c => this.sanitizeCandidate(c));

      return result;
    } catch (error) {
      this.logger.error('Error searching candidates', {
        error: error.message,
        params,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Get candidate statistics
   * @param {Object} user - Current user context
   * @returns {Promise<Object>}
   */
  async getStatistics(user) {
    try {
      const [countByStatus, total, recent] = await Promise.all([
        this.candidateRepository.getCountByStatus(user.organization_id),
        this.candidateRepository.count({}, user.organization_id),
        this.candidateRepository.getRecent(5, user.organization_id)
      ]);

      return {
        total,
        byStatus: countByStatus,
        recent: recent.map(c => this.sanitizeCandidate(c))
      };
    } catch (error) {
      this.logger.error('Error getting candidate statistics', {
        error: error.message,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Update candidate tags
   * @param {string} id - Candidate ID
   * @param {Array<string>} tags - Tags array
   * @param {Object} user - Current user context
   * @returns {Promise<Object>}
   */
  async updateTags(id, tags, user) {
    try {
      // Validate tags
      const schema = Joi.array().items(Joi.string()).required();
      const { error, value } = schema.validate(tags);
      
      if (error) {
        throw new ValidationError('Invalid tags format');
      }

      const candidate = await this.candidateRepository.findById(id, user.organization_id);

      if (!candidate) {
        throw new NotFoundError('Candidate not found');
      }

      const updatedCandidate = await this.candidateRepository.updateTags(
        id,
        value,
        user.organization_id
      );

      this.logger.info('Candidate tags updated', {
        candidateId: id,
        tags: value,
        organizationId: user.organization_id,
        userId: user.id
      });

      return this.sanitizeCandidate(updatedCandidate);
    } catch (error) {
      this.logger.error('Error updating candidate tags', {
        error: error.message,
        candidateId: id,
        organizationId: user.organization_id
      });
      throw error;
    }
  }

  /**
   * Check if organization can add more candidates (business rule)
   * @param {string} organizationId - Organization ID
   * @throws {BusinessRuleError}
   */
  async checkCandidateLimit(organizationId) {
    try {
      // Get organization with limits
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new NotFoundError('Organization not found');
      }

      // Get current candidate count
      const currentCount = await this.candidateRepository.count({}, organizationId);

      // Check against limit
      const limit = organization.max_candidates || Infinity;

      if (currentCount >= limit) {
        throw new BusinessRuleError(
          `Candidate limit reached. Your plan allows ${limit} candidates. Please upgrade your plan to add more.`,
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
      this.logger.error('Error checking candidate limit', {
        error: error.message,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Sanitize candidate data (remove sensitive info)
   * @param {Object} candidate - Candidate object
   * @returns {Object}
   */
  sanitizeCandidate(candidate) {
    if (!candidate) return null;

    // Create a copy to avoid mutating original
    const sanitized = { ...candidate };

    // Remove internal fields if present
    delete sanitized.internal_notes;
    
    return sanitized;
  }

  /**
   * Bulk import candidates
   * @param {Array<Object>} candidatesData - Array of candidate data
   * @param {Object} user - Current user context
   * @returns {Promise<{success: Array, failed: Array}>}
   */
  async bulkImport(candidatesData, user) {
    try {
      // Check if bulk import would exceed limit
      await this.checkCandidateLimit(user.organization_id);
      
      const currentCount = await this.candidateRepository.count({}, user.organization_id);
      const organization = await Organization.findById(user.organization_id);
      const limit = organization.max_candidates || Infinity;
      
      if (currentCount + candidatesData.length > limit) {
        throw new BusinessRuleError(
          `Bulk import would exceed candidate limit. Current: ${currentCount}, Importing: ${candidatesData.length}, Limit: ${limit}`
        );
      }

      const results = {
        success: [],
        failed: []
      };

      for (const data of candidatesData) {
        try {
          const candidate = await this.create(data, user);
          results.success.push(candidate);
        } catch (error) {
          results.failed.push({
            data,
            error: error.message
          });
        }
      }

      this.logger.info('Bulk import completed', {
        total: candidatesData.length,
        successful: results.success.length,
        failed: results.failed.length,
        organizationId: user.organization_id,
        userId: user.id
      });

      return results;
    } catch (error) {
      this.logger.error('Error in bulk import', {
        error: error.message,
        count: candidatesData.length,
        organizationId: user.organization_id
      });
      throw error;
    }
  }
}
