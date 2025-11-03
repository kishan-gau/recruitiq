/**
 * InterviewRepository - Data access layer for interviews
 * Handles all database operations for interview entities
 */

import { BaseRepository } from './BaseRepository.js';
import pool from '../config/database.js';

const db = pool;

export class InterviewRepository extends BaseRepository {
  constructor() {
    super('interviews');
  }

  /**
   * Find interview by ID with related application, candidate, and job data
   */
  async findByIdWithDetails(id, organizationId) {
    try {
      const query = `
        SELECT 
          i.*,
          a.status as application_status,
          c.first_name, c.last_name, c.email as candidate_email, c.phone,
          j.title as job_title, j.department,
          u1.first_name as interviewer_first_name, u1.last_name as interviewer_last_name,
          u2.first_name as created_by_first_name, u2.last_name as created_by_last_name
        FROM interviews i
        INNER JOIN applications a ON i.application_id = a.id
        INNER JOIN candidates c ON a.candidate_id = c.id
        INNER JOIN jobs j ON a.job_id = j.id
        LEFT JOIN users u1 ON i.interviewer_id = u1.id
        LEFT JOIN users u2 ON i.created_by = u2.id
        WHERE i.id = $1 
          AND i.organization_id = $2 
          AND i.deleted_at IS NULL
      `;

      const result = await db.query(query, [id, organizationId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding interview with details:', error);
      throw error;
    }
  }

  /**
   * Find all interviews for a specific application
   */
  async findByApplication(applicationId, organizationId) {
    try {
      const query = `
        SELECT 
          i.*,
          u.first_name as interviewer_first_name, 
          u.last_name as interviewer_last_name,
          u.email as interviewer_email
        FROM interviews i
        LEFT JOIN users u ON i.interviewer_id = u.id
        WHERE i.application_id = $1 
          AND i.organization_id = $2 
          AND i.deleted_at IS NULL
        ORDER BY i.scheduled_at ASC
      `;

      const result = await db.query(query, [applicationId, organizationId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error finding interviews by application:', error);
      throw error;
    }
  }

  /**
   * Find interviews by interviewer
   */
  async findByInterviewer(interviewerId, organizationId, options = {}) {
    try {
      const {
        status = null,
        dateFrom = null,
        dateTo = null,
        page = 1,
        limit = 20
      } = options;

      let query = `
        SELECT 
          i.*,
          a.id as application_id,
          c.first_name, c.last_name, c.email as candidate_email,
          j.title as job_title, j.department
        FROM interviews i
        INNER JOIN applications a ON i.application_id = a.id
        INNER JOIN candidates c ON a.candidate_id = c.id
        INNER JOIN jobs j ON a.job_id = j.id
        WHERE i.interviewer_id = $1 
          AND i.organization_id = $2 
          AND i.deleted_at IS NULL
      `;

      const params = [interviewerId, organizationId];
      let paramCount = 2;

      if (status) {
        paramCount++;
        query += ` AND i.status = $${paramCount}`;
        params.push(status);
      }

      if (dateFrom) {
        paramCount++;
        query += ` AND i.scheduled_at >= $${paramCount}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        paramCount++;
        query += ` AND i.scheduled_at <= $${paramCount}`;
        params.push(dateTo);
      }

      // Get total count
      const countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // Add sorting and pagination
      query += ` ORDER BY i.scheduled_at ASC`;

      const offset = (page - 1) * limit;
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await db.query(query, params);

      return {
        interviews: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      this.logger.error('Error finding interviews by interviewer:', error);
      throw error;
    }
  }

  /**
   * Search interviews with filters
   */
  async search(filters, organizationId) {
    try {
      const {
        search = null,
        status = null,
        interviewType = null,
        interviewerId = null,
        dateFrom = null,
        dateTo = null,
        page = 1,
        limit = 20,
        sortBy = 'scheduled_at',
        sortOrder = 'ASC'
      } = filters;

      let query = `
        SELECT 
          i.*,
          a.id as application_id, a.status as application_status,
          c.first_name, c.last_name, c.email as candidate_email,
          j.title as job_title, j.department,
          u.first_name as interviewer_first_name, u.last_name as interviewer_last_name
        FROM interviews i
        INNER JOIN applications a ON i.application_id = a.id
        INNER JOIN candidates c ON a.candidate_id = c.id
        INNER JOIN jobs j ON a.job_id = j.id
        LEFT JOIN users u ON i.interviewer_id = u.id
        WHERE i.organization_id = $1 
          AND i.deleted_at IS NULL
      `;

      const params = [organizationId];
      let paramCount = 1;

      // Search filter (candidate name or job title)
      if (search) {
        paramCount++;
        query += ` AND (
          c.first_name ILIKE $${paramCount} OR 
          c.last_name ILIKE $${paramCount} OR 
          j.title ILIKE $${paramCount}
        )`;
        params.push(`%${search}%`);
      }

      // Status filter
      if (status) {
        paramCount++;
        query += ` AND i.status = $${paramCount}`;
        params.push(status);
      }

      // Interview type filter
      if (interviewType) {
        paramCount++;
        query += ` AND i.interview_type = $${paramCount}`;
        params.push(interviewType);
      }

      // Interviewer filter
      if (interviewerId) {
        paramCount++;
        query += ` AND i.interviewer_id = $${paramCount}`;
        params.push(interviewerId);
      }

      // Date range filters
      if (dateFrom) {
        paramCount++;
        query += ` AND i.scheduled_at >= $${paramCount}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        paramCount++;
        query += ` AND i.scheduled_at <= $${paramCount}`;
        params.push(dateTo);
      }

      // Get total count
      const countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // Add sorting
      const allowedSortFields = ['scheduled_at', 'status', 'interview_type', 'first_name', 'job_title'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'scheduled_at';
      const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      
      if (sortBy === 'first_name') {
        query += ` ORDER BY c.first_name ${order}`;
      } else if (sortBy === 'job_title') {
        query += ` ORDER BY j.title ${order}`;
      } else {
        query += ` ORDER BY i.${sortField} ${order}`;
      }

      // Add pagination
      const offset = (page - 1) * limit;
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await db.query(query, params);

      return {
        interviews: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      this.logger.error('Error searching interviews:', error);
      throw error;
    }
  }

  /**
   * Get upcoming interviews (scheduled in the future)
   */
  async getUpcoming(organizationId, limit = 10, interviewerId = null) {
    try {
      let query = `
        SELECT 
          i.*,
          c.first_name, c.last_name, c.email as candidate_email,
          j.title as job_title, j.department,
          u.first_name as interviewer_first_name, u.last_name as interviewer_last_name
        FROM interviews i
        INNER JOIN applications a ON i.application_id = a.id
        INNER JOIN candidates c ON a.candidate_id = c.id
        INNER JOIN jobs j ON a.job_id = j.id
        LEFT JOIN users u ON i.interviewer_id = u.id
        WHERE i.organization_id = $1 
          AND i.deleted_at IS NULL
          AND i.status = 'scheduled'
          AND i.scheduled_at > CURRENT_TIMESTAMP
      `;

      const params = [organizationId];

      if (interviewerId) {
        query += ` AND i.interviewer_id = $2`;
        params.push(interviewerId);
        query += ` ORDER BY i.scheduled_at ASC LIMIT $3`;
        params.push(limit);
      } else {
        query += ` ORDER BY i.scheduled_at ASC LIMIT $2`;
        params.push(limit);
      }

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Error getting upcoming interviews:', error);
      throw error;
    }
  }

  /**
   * Get interview count by status
   */
  async getCountByStatus(organizationId) {
    try {
      const query = `
        SELECT status, COUNT(*) as count
        FROM ${this.tableName}
        WHERE organization_id = $1 AND deleted_at IS NULL
        GROUP BY status
        ORDER BY status
      `;

      const result = await db.query(query, [organizationId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error getting interview count by status:', error);
      throw error;
    }
  }

  /**
   * Get interview count by type
   */
  async getCountByType(organizationId) {
    try {
      const query = `
        SELECT interview_type, COUNT(*) as count
        FROM ${this.tableName}
        WHERE organization_id = $1 AND deleted_at IS NULL
        GROUP BY interview_type
        ORDER BY interview_type
      `;

      const result = await db.query(query, [organizationId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error getting interview count by type:', error);
      throw error;
    }
  }

  /**
   * Check for scheduling conflicts for an interviewer
   */
  async checkSchedulingConflict(interviewerId, scheduledAt, duration, organizationId, excludeInterviewId = null) {
    try {
      const endTime = new Date(new Date(scheduledAt).getTime() + duration * 60000); // duration in minutes

      let query = `
        SELECT id, scheduled_at, duration
        FROM ${this.tableName}
        WHERE interviewer_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
          AND status IN ('scheduled', 'in_progress')
          AND (
            (scheduled_at <= $3 AND scheduled_at + (duration * interval '1 minute') > $3)
            OR (scheduled_at < $4 AND scheduled_at + (duration * interval '1 minute') >= $4)
            OR (scheduled_at >= $3 AND scheduled_at < $4)
          )
      `;

      const params = [interviewerId, organizationId, scheduledAt, endTime];

      if (excludeInterviewId) {
        query += ` AND id != $5`;
        params.push(excludeInterviewId);
      }

      const result = await db.query(query, params);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      this.logger.error('Error checking scheduling conflict:', error);
      throw error;
    }
  }

  /**
   * Update interview feedback
   */
  async updateFeedback(id, feedback, rating, decision, organizationId) {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET 
          feedback = $1,
          rating = $2,
          decision = $3,
          completed_at = CASE WHEN $3 IS NOT NULL THEN CURRENT_TIMESTAMP ELSE completed_at END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 
          AND organization_id = $5 
          AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await db.query(query, [feedback, rating, decision, id, organizationId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error updating interview feedback:', error);
      throw error;
    }
  }
}
