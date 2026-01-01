/**
 * PerformanceRepository
 * Data access layer for performance reviews, goals, and feedback
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import { mapDbToApi, mapApiToDb } from '../../../utils/dtoMapper.js';

class PerformanceRepository {
  
  feedbackTable: string;

  goalTable: string;

  logger: any;

  query: any;

  reviewTable: string;

  templateTable: string;

constructor(database = null) {
    this.query = database?.query || query;
    this.reviewTable = 'hris.performance_review';
    this.goalTable = 'hris.performance_goal';
    this.feedbackTable = 'hris.feedback';
    this.templateTable = 'hris.review_template';
    this.logger = logger;
  }

  // ========== REVIEWS ==========

  async findReviewById(id, organizationId) {
    try {
      const sql = `
        SELECT r.*,
               e.first_name || ' ' || e.last_name as employee_name,
               rev.first_name || ' ' || rev.last_name as reviewer_name,
               t.template_name
        FROM ${this.reviewTable} r
        LEFT JOIN hris.employee e ON r.employee_id = e.id
        LEFT JOIN hris.employee rev ON r.reviewer_id = rev.id
        LEFT JOIN ${this.templateTable} t ON r.template_id = t.id
        WHERE r.id = $1 AND r.organization_id = $2 AND r.deleted_at IS NULL
      `;
      const result = await this.query(sql, [id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding review', { id, error: error.message });
      throw error;
    }
  }

  async findReviews(filters, organizationId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      let sql = `
        SELECT r.*, e.first_name || ' ' || e.last_name as employee_name
        FROM ${this.reviewTable} r
        LEFT JOIN hris.employee e ON r.employee_id = e.id
        WHERE r.organization_id = $1 AND r.deleted_at IS NULL
      `;
      const params = [organizationId];
      let paramIndex = 2;

      if (filters.employeeId) {
        sql += ` AND r.employee_id = $${paramIndex}`;
        params.push(filters.employeeId);
        paramIndex++;
      }
      if (filters.status) {
        sql += ` AND r.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      sql += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.query(sql, params, organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding reviews', { error: error.message });
      throw error;
    }
  }

  async getReviewsStatistics(organizationId) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'draft') as draft,
          COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
          COUNT(*) FILTER (WHERE status = 'under_review') as "underReview",
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          ROUND(AVG(overall_rating), 2) as "averageRating"
        FROM ${this.reviewTable}
        WHERE organization_id = $1 AND deleted_at IS NULL
      `;
      const result = await this.query(sql, [organizationId], organizationId);
      return {
        total: parseInt(result.rows[0].total) || 0,
        draft: parseInt(result.rows[0].draft) || 0,
        submitted: parseInt(result.rows[0].submitted) || 0,
        underReview: parseInt(result.rows[0].underReview) || 0,
        completed: parseInt(result.rows[0].completed) || 0,
        averageRating: parseFloat(result.rows[0].averageRating) || 0
      };
    } catch (error) {
      this.logger.error('Error getting reviews statistics', { error: error.message });
      throw error;
    }
  }

  async createReview(reviewData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(reviewData);
      const sql = `
        INSERT INTO ${this.reviewTable} (
          organization_id, employee_id, reviewer_id, template_id,
          review_period_start, review_period_end, review_type,
          responses, overall_rating, strengths, areas_for_improvement,
          goals_for_next_period, status, due_date,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;
      const params = [
        organizationId, dbData.employee_id, dbData.reviewer_id || null, dbData.template_id || null,
        dbData.review_period_start, dbData.review_period_end, dbData.review_type || null,
        dbData.responses ? JSON.stringify(dbData.responses) : '{}',
        dbData.overall_rating || null, dbData.strengths || null, dbData.areas_for_improvement || null,
        dbData.goals_for_next_period || null, dbData.status || 'draft', dbData.due_date || null,
        userId, userId
      ];
      const result = await this.query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating review', { error: error.message });
      throw error;
    }
  }

  async updateReview(id, reviewData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(reviewData);
      const sql = `
        UPDATE ${this.reviewTable}
        SET
          responses = COALESCE($1, responses),
          overall_rating = $2,
          strengths = $3,
          areas_for_improvement = $4,
          goals_for_next_period = $5,
          status = COALESCE($6, status),
          updated_by = $7,
          updated_at = NOW()
        WHERE id = $8 AND organization_id = $9 AND deleted_at IS NULL
        RETURNING *
      `;
      const params = [
        dbData.responses ? JSON.stringify(dbData.responses) : null,
        dbData.overall_rating, dbData.strengths, dbData.areas_for_improvement,
        dbData.goals_for_next_period, dbData.status, userId, id, organizationId
      ];
      const result = await this.query(sql, params, organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating review', { error: error.message });
      throw error;
    }
  }

  // ========== GOALS ==========

  async findGoalById(id, organizationId) {
    try {
      const sql = `SELECT * FROM ${this.goalTable} WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`;
      const result = await this.query(sql, [id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding goal', { error: error.message });
      throw error;
    }
  }

  async findGoals(filters, organizationId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      let sql = `SELECT * FROM ${this.goalTable} WHERE organization_id = $1 AND deleted_at IS NULL`;
      const params = [organizationId];
      let paramIndex = 2;

      if (filters.employeeId) {
        sql += ` AND employee_id = $${paramIndex}`;
        params.push(filters.employeeId);
        paramIndex++;
      }
      if (filters.status) {
        sql += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      sql += ` ORDER BY target_date ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.query(sql, params, organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding goals', { error: error.message });
      throw error;
    }
  }

  async getGoalsStatistics(organizationId) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          ROUND(AVG(completion_percentage), 2) as "averageCompletion"
        FROM ${this.goalTable}
        WHERE organization_id = $1 AND deleted_at IS NULL
      `;
      const result = await this.query(sql, [organizationId], organizationId);
      return {
        total: parseInt(result.rows[0].total) || 0,
        active: parseInt(result.rows[0].active) || 0,
        completed: parseInt(result.rows[0].completed) || 0,
        cancelled: parseInt(result.rows[0].cancelled) || 0,
        averageCompletion: parseFloat(result.rows[0].averageCompletion) || 0
      };
    } catch (error) {
      this.logger.error('Error getting goals statistics', { error: error.message });
      throw error;
    }
  }

  async createGoal(goalData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(goalData);
      const sql = `
        INSERT INTO ${this.goalTable} (
          organization_id, employee_id, review_id,
          goal_title, goal_description, goal_category,
          target_date, completion_percentage, status, measurement_criteria,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      const params = [
        organizationId, dbData.employee_id, dbData.review_id || null,
        dbData.goal_title, dbData.goal_description || null, dbData.goal_category || null,
        dbData.target_date || null, dbData.completion_percentage || 0, dbData.status || 'active',
        dbData.measurement_criteria || null, userId, userId
      ];
      const result = await this.query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating goal', { error: error.message });
      throw error;
    }
  }

  async updateGoal(id, goalData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(goalData);
      const sql = `
        UPDATE ${this.goalTable}
        SET
          goal_description = COALESCE($1, goal_description),
          completion_percentage = COALESCE($2, completion_percentage),
          status = COALESCE($3, status),
          updated_by = $4,
          updated_at = NOW()
        WHERE id = $5 AND organization_id = $6 AND deleted_at IS NULL
        RETURNING *
      `;
      const params = [dbData.goal_description, dbData.completion_percentage, dbData.status, userId, id, organizationId];
      const result = await this.query(sql, params, organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating goal', { error: error.message });
      throw error;
    }
  }

  // ========== FEEDBACK ==========

  async createFeedback(feedbackData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(feedbackData);
      const sql = `
        INSERT INTO ${this.feedbackTable} (
          organization_id, employee_id, feedback_provider_id,
          feedback_type, feedback_text, is_anonymous, related_goal_id,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const params = [
        organizationId, dbData.employee_id, dbData.feedback_provider_id || null,
        dbData.feedback_type || null, dbData.feedback_text, dbData.is_anonymous || false,
        dbData.related_goal_id || null, userId, userId
      ];
      const result = await this.query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating feedback', { error: error.message });
      throw error;
    }
  }

  async findFeedbackByEmployee(employeeId, organizationId, limit = 50) {
    try {
      const sql = `
        SELECT f.*, p.first_name || ' ' || p.last_name as provider_name
        FROM ${this.feedbackTable} f
        LEFT JOIN hris.employee p ON f.feedback_provider_id = p.id
        WHERE f.employee_id = $1 AND f.organization_id = $2 AND f.deleted_at IS NULL
        ORDER BY f.created_at DESC
        LIMIT $3
      `;
      const result = await this.query(sql, [employeeId, organizationId, limit], organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding feedback', { error: error.message });
      throw error;
    }
  }
}

export default PerformanceRepository;
