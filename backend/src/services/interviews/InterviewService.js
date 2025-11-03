/**
 * InterviewService - Business logic layer for interviews
 * Implements all business rules and orchestrates repository calls
 */

import { InterviewRepository } from '../../repositories/InterviewRepository.js';
import { ApplicationRepository } from '../../repositories/ApplicationRepository.js';
import logger from '../../utils/logger.js';
import { ValidationError, BusinessRuleError, NotFoundError } from '../../middleware/errorHandler.js';
import Joi from 'joi';

export class InterviewService {
  constructor() {
    this.interviewRepository = new InterviewRepository();
    this.applicationRepository = new ApplicationRepository();
    this.logger = logger;
  }

  /**
   * Validation schema for interview creation
   */
  static get createSchema() {
    return Joi.object({
      application_id: Joi.string().uuid().required(),
      interviewer_id: Joi.string().uuid().required(),
      scheduled_at: Joi.date().iso().greater('now').required(),
      duration: Joi.number().integer().min(15).max(480).default(60), // 15 min to 8 hours
      interview_type: Joi.string()
        .valid('phone_screen', 'video', 'onsite', 'technical', 'behavioral', 'panel', 'final')
        .required(),
      location: Joi.string().max(500).allow(null, ''),
      meeting_link: Joi.string().uri().max(1000).allow(null, ''),
      notes: Joi.string().max(2000).allow(null, ''),
      agenda: Joi.string().max(2000).allow(null, '')
    });
  }

  /**
   * Validation schema for interview update
   */
  static get updateSchema() {
    return Joi.object({
      interviewer_id: Joi.string().uuid(),
      scheduled_at: Joi.date().iso(),
      duration: Joi.number().integer().min(15).max(480),
      interview_type: Joi.string()
        .valid('phone_screen', 'video', 'onsite', 'technical', 'behavioral', 'panel', 'final'),
      location: Joi.string().max(500).allow(null, ''),
      meeting_link: Joi.string().uri().max(1000).allow(null, ''),
      notes: Joi.string().max(2000).allow(null, ''),
      agenda: Joi.string().max(2000).allow(null, ''),
      status: Joi.string().valid('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')
    }).min(1);
  }

  /**
   * Validation schema for feedback
   */
  static get feedbackSchema() {
    return Joi.object({
      feedback: Joi.string().max(5000).required(),
      rating: Joi.number().integer().min(1).max(5).required(),
      decision: Joi.string().valid('proceed', 'reject', 'maybe').required()
    });
  }

  /**
   * Create a new interview
   */
  async create(data, user) {
    try {
      // Validate input
      const { error, value } = InterviewService.createSchema.validate(data);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const organizationId = user.organization_id;

      // Check if application exists
      const application = await this.applicationRepository.findById(
        value.application_id,
        organizationId
      );

      if (!application) {
        throw new NotFoundError('Application not found');
      }

      // Business rule: Cannot schedule interview for rejected or hired applications
      if (['rejected', 'hired'].includes(application.status)) {
        throw new BusinessRuleError(
          `Cannot schedule interview for application with status '${application.status}'`
        );
      }

      // Check for scheduling conflicts
      const conflict = await this.interviewRepository.checkSchedulingConflict(
        value.interviewer_id,
        value.scheduled_at,
        value.duration,
        organizationId
      );

      if (conflict) {
        throw new BusinessRuleError(
          `Interviewer has a scheduling conflict at ${new Date(conflict.scheduled_at).toISOString()}`
        );
      }

      // Create interview
      const interviewData = {
        ...value,
        status: 'scheduled',
        created_by: user.id
      };

      const interview = await this.interviewRepository.create(
        interviewData,
        organizationId
      );

      // Update application status to 'interview' if not already
      if (application.status !== 'interview') {
        await this.applicationRepository.updateStatus(
          application.id,
          'interview',
          user.id,
          'Interview scheduled',
          organizationId
        );
      }

      this.logger.info('Interview created', {
        interviewId: interview.id,
        applicationId: value.application_id,
        organizationId
      });

      return this.sanitizeInterview(interview);
    } catch (error) {
      this.logger.error('Error creating interview:', error);
      throw error;
    }
  }

  /**
   * Get interview by ID
   */
  async getById(id, user, includeDetails = false) {
    try {
      const organizationId = user.organization_id;

      let interview;
      if (includeDetails) {
        interview = await this.interviewRepository.findByIdWithDetails(id, organizationId);
      } else {
        interview = await this.interviewRepository.findById(id, organizationId);
      }

      if (!interview) {
        throw new NotFoundError('Interview not found');
      }

      return this.sanitizeInterview(interview);
    } catch (error) {
      this.logger.error('Error getting interview:', error);
      throw error;
    }
  }

  /**
   * Update interview
   */
  async update(id, data, user) {
    try {
      // Validate input
      const { error, value } = InterviewService.updateSchema.validate(data);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const organizationId = user.organization_id;

      // Check if interview exists
      const existingInterview = await this.interviewRepository.findById(id, organizationId);
      if (!existingInterview) {
        throw new NotFoundError('Interview not found');
      }

      // Business rule: Cannot update completed, cancelled, or no_show interviews
      if (['completed', 'cancelled', 'no_show'].includes(existingInterview.status)) {
        if (value.status && value.status !== existingInterview.status) {
          throw new BusinessRuleError(
            `Cannot change interview status from '${existingInterview.status}'`
          );
        }
        // Allow updating only feedback-related fields for completed interviews
        if (existingInterview.status === 'completed') {
          const allowedFields = ['feedback', 'rating', 'decision', 'notes'];
          const hasDisallowedFields = Object.keys(value).some(
            key => !allowedFields.includes(key)
          );
          if (hasDisallowedFields) {
            throw new BusinessRuleError(
              'Can only update feedback, rating, decision, and notes for completed interviews'
            );
          }
        } else {
          throw new BusinessRuleError(
            `Cannot update ${existingInterview.status} interviews`
          );
        }
      }

      // Check for scheduling conflicts if rescheduling
      if (value.scheduled_at || value.interviewer_id || value.duration) {
        const scheduledAt = value.scheduled_at || existingInterview.scheduled_at;
        const interviewerId = value.interviewer_id || existingInterview.interviewer_id;
        const duration = value.duration || existingInterview.duration;

        const conflict = await this.interviewRepository.checkSchedulingConflict(
          interviewerId,
          scheduledAt,
          duration,
          organizationId,
          id // Exclude current interview
        );

        if (conflict) {
          throw new BusinessRuleError(
            `Interviewer has a scheduling conflict at ${new Date(conflict.scheduled_at).toISOString()}`
          );
        }
      }

      // Validate scheduled_at is in the future if being updated
      if (value.scheduled_at && new Date(value.scheduled_at) <= new Date()) {
        throw new ValidationError('Interview must be scheduled in the future');
      }

      const updateData = {
        ...value,
        updated_by: user.id
      };

      const interview = await this.interviewRepository.update(
        id,
        updateData,
        organizationId
      );

      this.logger.info('Interview updated', {
        interviewId: id,
        organizationId
      });

      return this.sanitizeInterview(interview);
    } catch (error) {
      this.logger.error('Error updating interview:', error);
      throw error;
    }
  }

  /**
   * Delete interview (soft delete)
   */
  async delete(id, user) {
    try {
      const organizationId = user.organization_id;

      // Check if interview exists
      const interview = await this.interviewRepository.findById(id, organizationId);
      if (!interview) {
        throw new NotFoundError('Interview not found');
      }

      // Business rule: Cannot delete completed interviews
      if (interview.status === 'completed') {
        throw new BusinessRuleError('Cannot delete completed interviews');
      }

      await this.interviewRepository.delete(id, organizationId);

      this.logger.info('Interview deleted', {
        interviewId: id,
        organizationId
      });

      return true;
    } catch (error) {
      this.logger.error('Error deleting interview:', error);
      throw error;
    }
  }

  /**
   * Search interviews with filters
   */
  async search(filters, user) {
    try {
      const organizationId = user.organization_id;
      const result = await this.interviewRepository.search(filters, organizationId);

      return {
        ...result,
        interviews: result.interviews.map(interview => this.sanitizeInterview(interview))
      };
    } catch (error) {
      this.logger.error('Error searching interviews:', error);
      throw error;
    }
  }

  /**
   * Get interviews for a specific application
   */
  async getByApplication(applicationId, user) {
    try {
      const organizationId = user.organization_id;

      // Check if application exists
      const application = await this.applicationRepository.findById(applicationId, organizationId);
      if (!application) {
        throw new NotFoundError('Application not found');
      }

      const interviews = await this.interviewRepository.findByApplication(
        applicationId,
        organizationId
      );

      return interviews.map(interview => this.sanitizeInterview(interview));
    } catch (error) {
      this.logger.error('Error getting interviews by application:', error);
      throw error;
    }
  }

  /**
   * Get interviews for a specific interviewer
   */
  async getByInterviewer(interviewerId, user, options = {}) {
    try {
      const organizationId = user.organization_id;

      const result = await this.interviewRepository.findByInterviewer(
        interviewerId,
        organizationId,
        options
      );

      return {
        ...result,
        interviews: result.interviews.map(interview => this.sanitizeInterview(interview))
      };
    } catch (error) {
      this.logger.error('Error getting interviews by interviewer:', error);
      throw error;
    }
  }

  /**
   * Get upcoming interviews
   */
  async getUpcoming(user, limit = 10, interviewerId = null) {
    try {
      const organizationId = user.organization_id;

      const interviews = await this.interviewRepository.getUpcoming(
        organizationId,
        limit,
        interviewerId
      );

      return interviews.map(interview => this.sanitizeInterview(interview));
    } catch (error) {
      this.logger.error('Error getting upcoming interviews:', error);
      throw error;
    }
  }

  /**
   * Get interview statistics
   */
  async getStatistics(user) {
    try {
      const organizationId = user.organization_id;

      const [byStatus, byType] = await Promise.all([
        this.interviewRepository.getCountByStatus(organizationId),
        this.interviewRepository.getCountByType(organizationId)
      ]);

      const total = byStatus.reduce((sum, item) => sum + parseInt(item.count, 10), 0);

      return {
        byStatus,
        byType,
        total
      };
    } catch (error) {
      this.logger.error('Error getting interview statistics:', error);
      throw error;
    }
  }

  /**
   * Submit interview feedback
   */
  async submitFeedback(id, feedbackData, user) {
    try {
      // Validate input
      const { error, value } = InterviewService.feedbackSchema.validate(feedbackData);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const organizationId = user.organization_id;

      // Check if interview exists
      const interview = await this.interviewRepository.findById(id, organizationId);
      if (!interview) {
        throw new NotFoundError('Interview not found');
      }

      // Business rule: Can only submit feedback for completed interviews
      if (interview.status !== 'completed') {
        throw new BusinessRuleError('Can only submit feedback for completed interviews');
      }

      // Update interview with feedback
      const updatedInterview = await this.interviewRepository.updateFeedback(
        id,
        value.feedback,
        value.rating,
        value.decision,
        organizationId
      );

      this.logger.info('Interview feedback submitted', {
        interviewId: id,
        decision: value.decision,
        organizationId
      });

      return this.sanitizeInterview(updatedInterview);
    } catch (error) {
      this.logger.error('Error submitting interview feedback:', error);
      throw error;
    }
  }

  /**
   * Cancel interview
   */
  async cancel(id, user, reason = null) {
    try {
      const organizationId = user.organization_id;

      // Check if interview exists
      const interview = await this.interviewRepository.findById(id, organizationId);
      if (!interview) {
        throw new NotFoundError('Interview not found');
      }

      // Business rule: Can only cancel scheduled or in_progress interviews
      if (!['scheduled', 'in_progress'].includes(interview.status)) {
        throw new BusinessRuleError(
          `Cannot cancel interview with status '${interview.status}'`
        );
      }

      const updateData = {
        status: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
        updated_by: user.id
      };

      const updatedInterview = await this.interviewRepository.update(
        id,
        updateData,
        organizationId
      );

      this.logger.info('Interview cancelled', {
        interviewId: id,
        reason,
        organizationId
      });

      return this.sanitizeInterview(updatedInterview);
    } catch (error) {
      this.logger.error('Error cancelling interview:', error);
      throw error;
    }
  }

  /**
   * Mark interview as completed
   */
  async complete(id, user) {
    try {
      const organizationId = user.organization_id;

      // Check if interview exists
      const interview = await this.interviewRepository.findById(id, organizationId);
      if (!interview) {
        throw new NotFoundError('Interview not found');
      }

      // Business rule: Can only complete scheduled or in_progress interviews
      if (!['scheduled', 'in_progress'].includes(interview.status)) {
        throw new BusinessRuleError(
          `Cannot complete interview with status '${interview.status}'`
        );
      }

      const updateData = {
        status: 'completed',
        completed_at: new Date(),
        updated_by: user.id
      };

      const updatedInterview = await this.interviewRepository.update(
        id,
        updateData,
        organizationId
      );

      this.logger.info('Interview marked as completed', {
        interviewId: id,
        organizationId
      });

      return this.sanitizeInterview(updatedInterview);
    } catch (error) {
      this.logger.error('Error completing interview:', error);
      throw error;
    }
  }

  /**
   * Sanitize interview data
   */
  sanitizeInterview(interview) {
    if (!interview) return null;

    const sanitized = { ...interview };

    // Ensure dates are ISO strings
    if (sanitized.scheduled_at) {
      sanitized.scheduled_at = new Date(sanitized.scheduled_at).toISOString();
    }
    if (sanitized.completed_at) {
      sanitized.completed_at = new Date(sanitized.completed_at).toISOString();
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
