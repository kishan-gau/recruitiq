/**
 * PerformanceService
 * Business logic layer for employee performance management
 */

import { query } from '../../../config/database.ts';
import logger from '../../../utils/logger.ts';

class PerformanceService {
  constructor() {
    this.logger = logger;
  }

  /**
   * Create a new performance review
   */
  async createReview(reviewData, organizationId, userId) {
    try {
      this.logger.info('Creating performance review', { 
        organizationId, 
        userId,
        employeeId: reviewData.employee_id 
      });

      if (!reviewData.employee_id) {
        throw new Error('Employee ID is required');
      }
      if (!reviewData.review_period_start) {
        throw new Error('Review period start date is required');
      }
      if (!reviewData.review_period_end) {
        throw new Error('Review period end date is required');
      }

      const sql = `
        INSERT INTO hris.performance_review (
          organization_id, employee_id, reviewer_id,
          review_period_start, review_period_end, due_date,
          overall_rating, status, review_type,
          responses, strengths, areas_for_improvement,
          goals_for_next_period,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        RETURNING *
      `;

      const params = [
        organizationId,
        reviewData.employee_id,
        reviewData.reviewer_id || userId,
        reviewData.review_period_start,
        reviewData.review_period_end,
        reviewData.due_date || null,
        reviewData.overall_rating || null,
        reviewData.status || 'draft',
        reviewData.review_type || 'annual',
        reviewData.responses || {},
        reviewData.strengths || null,
        reviewData.areas_for_improvement || null,
        reviewData.goals_for_next_period || null,
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'create',
        table: 'hris.performance_review'
      });

      this.logger.info('Performance review created successfully', { 
        reviewId: result.rows[0].id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error creating performance review', { 
        error: error.message,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get performance review by ID
   */
  async getReview(id, organizationId) {
    try {
      this.logger.debug('Getting performance review', { id, organizationId });

      const sql = `
        SELECT pr.*, 
               e.first_name || ' ' || e.last_name as employee_name,
               e.email as employee_email,
               r.first_name || ' ' || r.last_name as reviewer_name
        FROM hris.performance_review pr
        LEFT JOIN hris.employee e ON pr.employee_id = e.id
        LEFT JOIN hris.employee r ON pr.reviewer_id = r.id
        WHERE pr.id = $1 
          AND pr.organization_id = $2
          AND pr.deleted_at IS NULL
      `;

      const result = await query(sql, [id, organizationId], organizationId, {
        operation: 'findById',
        table: 'hris.performance_review'
      });
      
      if (result.rows.length === 0) {
        throw new Error('Performance review not found');
      }

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error getting performance review', { 
        error: error.message,
        id,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * List performance reviews with optional filters
   */
  async listReviews(filters = {}, organizationId, options = {}) {
    try {
      this.logger.debug('Listing performance reviews', { 
        filters,
        organizationId,
        options 
      });

      const { limit = 50, offset = 0 } = options;

      let sql = `
        SELECT pr.*,
               e.first_name || ' ' || e.last_name as employee_name,
               e.email as employee_email,
               r.first_name || ' ' || r.last_name as reviewer_name
        FROM hris.performance_review pr
        LEFT JOIN hris.employee e ON pr.employee_id = e.id
        LEFT JOIN hris.employee r ON pr.reviewer_id = r.id
        WHERE pr.organization_id = $1 AND pr.deleted_at IS NULL
      `;

      const params = [organizationId];
      let paramIndex = 2;

      if (filters.employeeId) {
        sql += ` AND pr.employee_id = $${paramIndex}`;
        params.push(filters.employeeId);
        paramIndex++;
      }

      if (filters.reviewerId) {
        sql += ` AND pr.reviewer_id = $${paramIndex}`;
        params.push(filters.reviewerId);
        paramIndex++;
      }

      if (filters.status) {
        sql += ` AND pr.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.reviewType) {
        sql += ` AND pr.review_type = $${paramIndex}`;
        params.push(filters.reviewType);
        paramIndex++;
      }

      sql += ` ORDER BY pr.completed_date DESC NULLS LAST LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params, organizationId, {
        operation: 'findAll',
        table: 'hris.performance_review'
      });

      // Get total count
      let countSql = `
        SELECT COUNT(*) as count 
        FROM hris.performance_review pr
        WHERE pr.organization_id = $1 AND pr.deleted_at IS NULL
      `;

      const countParams = [organizationId];
      let countIndex = 2;

      if (filters.employeeId) {
        countSql += ` AND pr.employee_id = $${countIndex}`;
        countParams.push(filters.employeeId);
        countIndex++;
      }

      if (filters.reviewerId) {
        countSql += ` AND pr.reviewer_id = $${countIndex}`;
        countParams.push(filters.reviewerId);
        countIndex++;
      }

      if (filters.status) {
        countSql += ` AND pr.status = $${countIndex}`;
        countParams.push(filters.status);
        countIndex++;
      }

      if (filters.reviewType) {
        countSql += ` AND pr.review_type = $${countIndex}`;
        countParams.push(filters.reviewType);
        countIndex++;
      }

      const countResult = await query(countSql, countParams, organizationId, {
        operation: 'count',
        table: 'hris.performance_review'
      });

      return {
        reviews: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      };
    } catch (error) {
      this.logger.error('Error listing performance reviews', { 
        error: error.message,
        filters,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Update performance review
   */
  async updateReview(id, reviewData, organizationId, userId) {
    try {
      this.logger.info('Updating performance review', { 
        id,
        organizationId,
        userId 
      });

      // Check if review exists
      const checkSql = `
        SELECT id FROM hris.performance_review 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Performance review not found');
      }

      // Build update query dynamically
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const updateableFields = [
        'reviewer_id', 'review_period_start', 'review_period_end', 'due_date',
        'overall_rating', 'status', 'review_type',
        'responses', 'strengths', 'areas_for_improvement', 'goals_for_next_period',
        'submitted_date', 'completed_date'
      ];

      updateableFields.forEach(field => {
        if (reviewData[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push(reviewData[field]);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        return await this.getReview(id, organizationId);
      }

      updates.push(`updated_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(id, organizationId);

      const sql = `
        UPDATE hris.performance_review 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, params, organizationId, {
        operation: 'update',
        table: 'hris.performance_review'
      });

      this.logger.info('Performance review updated successfully', { 
        id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error updating performance review', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Delete performance review (soft delete)
   */
  async deleteReview(id, organizationId, userId) {
    try {
      this.logger.info('Deleting performance review', { 
        id,
        organizationId,
        userId 
      });

      // Check if review exists
      const checkSql = `
        SELECT id FROM hris.performance_review 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Performance review not found');
      }

      // Soft delete review
      const sql = `
        UPDATE hris.performance_review 
        SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $3
        WHERE id = $1 AND organization_id = $2
      `;

      await query(sql, [id, organizationId, userId], organizationId, {
        operation: 'softDelete',
        table: 'hris.performance_review'
      });

      this.logger.info('Performance review deleted successfully', { 
        id,
        organizationId 
      });

      return { success: true, message: 'Performance review deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting performance review', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get reviews statistics
   */
  async getReviewsStatistics(organizationId) {
    try {
      this.logger.info('Getting reviews statistics', { organizationId });

      const sql = `
        SELECT 
          COUNT(*) as total_reviews,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_reviews,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reviews,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_reviews,
          AVG(CASE WHEN overall_rating IS NOT NULL THEN overall_rating END) as average_rating,
          COUNT(CASE WHEN completed_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_reviews
        FROM hris.performance_review
        WHERE organization_id = $1 AND deleted_at IS NULL
      `;

      const result = await query(sql, [organizationId], organizationId, {
        operation: 'SELECT',
        table: 'hris.performance_review'
      });

      return result.rows[0] || {
        total_reviews: 0,
        completed_reviews: 0,
        pending_reviews: 0,
        in_progress_reviews: 0,
        average_rating: null,
        recent_reviews: 0
      };
    } catch (error) {
      this.logger.error('Error getting reviews statistics', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get goals statistics
   */
  async getGoalsStatistics(organizationId) {
    try {
      this.logger.info('Getting goals statistics', { organizationId });

      const sql = `
        SELECT 
          COUNT(*) as total_goals,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_goals,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_goals,
          COUNT(CASE WHEN status = 'not_started' THEN 1 END) as not_started_goals,
          COUNT(CASE WHEN target_date < CURRENT_DATE AND status != 'completed' THEN 1 END) as overdue_goals,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_goals
        FROM hris.performance_goal
        WHERE organization_id = $1 AND deleted_at IS NULL
      `;

      const result = await query(sql, [organizationId], organizationId, {
        operation: 'SELECT',
        table: 'hris.performance_goal'
      });

      return result.rows[0] || {
        total_goals: 0,
        completed_goals: 0,
        in_progress_goals: 0,
        not_started_goals: 0,
        overdue_goals: 0,
        recent_goals: 0
      };
    } catch (error) {
      this.logger.error('Error getting goals statistics', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }
}

export default PerformanceService;
