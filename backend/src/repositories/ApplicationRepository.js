/**
 * ApplicationRepository - Data access layer for applications
 * Handles all database operations for application entities
 */

import { BaseRepository } from './BaseRepository.js';
import pool from '../config/database.js';

const db = pool;

export class ApplicationRepository extends BaseRepository {
  constructor() {
    super('applications');
  }

  /**
   * Find application by ID with related candidate and job data
   */
  async findByIdWithDetails(id, organizationId) {
    try {
      const query = `
        SELECT 
          a.*,
          c.first_name, c.last_name, c.email as candidate_email,
          c.phone, c.location as candidate_location,
          j.title as job_title, j.department, j.location as job_location,
          u.first_name as reviewer_first_name, u.last_name as reviewer_last_name
        FROM applications a
        INNER JOIN candidates c ON a.candidate_id = c.id
        INNER JOIN jobs j ON a.job_id = j.id
        LEFT JOIN users u ON a.reviewed_by = u.id
        WHERE a.id = $1 
          AND a.organization_id = $2 
          AND a.deleted_at IS NULL
      `;

      const result = await db.query(query, [id, organizationId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding application with details:', error);
      throw error;
    }
  }

  /**
   * Find application by candidate and job IDs
   */
  async findByCandidateAndJob(candidateId, jobId, organizationId) {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE candidate_id = $1 
          AND job_id = $2 
          AND organization_id = $3 
          AND deleted_at IS NULL
      `;

      const result = await db.query(query, [candidateId, jobId, organizationId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding application by candidate and job:', error);
      throw error;
    }
  }

  /**
   * Get all applications for a specific job
   */
  async findByJob(jobId, organizationId, options = {}) {
    try {
      const { 
        status = null, 
        page = 1, 
        limit = 50,
        sortBy = 'applied_at',
        sortOrder = 'DESC'
      } = options;

      let query = `
        SELECT 
          a.*,
          c.first_name, c.last_name, c.email as candidate_email,
          c.phone, c.resume_url, c.linkedin_url
        FROM applications a
        INNER JOIN candidates c ON a.candidate_id = c.id
        WHERE a.job_id = $1 
          AND a.organization_id = $2 
          AND a.deleted_at IS NULL
      `;

      const params = [jobId, organizationId];
      let paramCount = 2;

      if (status) {
        paramCount++;
        query += ` AND a.status = $${paramCount}`;
        params.push(status);
      }

      // Add sorting
      const allowedSortFields = ['applied_at', 'status', 'first_name', 'last_name'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'applied_at';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      query += ` ORDER BY a.${sortField} ${order}`;

      // Add pagination
      const offset = (page - 1) * limit;
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await db.query(query, params);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM applications a
        WHERE a.job_id = $1 
          AND a.organization_id = $2 
          AND a.deleted_at IS NULL
          ${status ? 'AND a.status = $3' : ''}
      `;
      const countParams = status ? [jobId, organizationId, status] : [jobId, organizationId];
      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total, 10);

      return {
        applications: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      this.logger.error('Error finding applications by job:', error);
      throw error;
    }
  }

  /**
   * Get all applications for a specific candidate
   */
  async findByCandidate(candidateId, organizationId) {
    try {
      const query = `
        SELECT 
          a.*,
          j.title as job_title, j.department, j.location as job_location,
          j.employment_type, j.status as job_status
        FROM applications a
        INNER JOIN jobs j ON a.job_id = j.id
        WHERE a.candidate_id = $1 
          AND a.organization_id = $2 
          AND a.deleted_at IS NULL
        ORDER BY a.applied_at DESC
      `;

      const result = await db.query(query, [candidateId, organizationId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error finding applications by candidate:', error);
      throw error;
    }
  }

  /**
   * Search applications with filters
   */
  async search(filters, organizationId) {
    try {
      const {
        search = null,
        status = null,
        jobId = null,
        candidateId = null,
        dateFrom = null,
        dateTo = null,
        page = 1,
        limit = 20,
        sortBy = 'applied_at',
        sortOrder = 'DESC'
      } = filters;

      let query = `
        SELECT 
          a.*,
          c.first_name, c.last_name, c.email as candidate_email,
          j.title as job_title, j.department
        FROM applications a
        INNER JOIN candidates c ON a.candidate_id = c.id
        INNER JOIN jobs j ON a.job_id = j.id
        WHERE a.organization_id = $1 
          AND a.deleted_at IS NULL
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
        query += ` AND a.status = $${paramCount}`;
        params.push(status);
      }

      // Job filter
      if (jobId) {
        paramCount++;
        query += ` AND a.job_id = $${paramCount}`;
        params.push(jobId);
      }

      // Candidate filter
      if (candidateId) {
        paramCount++;
        query += ` AND a.candidate_id = $${paramCount}`;
        params.push(candidateId);
      }

      // Date range filters
      if (dateFrom) {
        paramCount++;
        query += ` AND a.applied_at >= $${paramCount}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        paramCount++;
        query += ` AND a.applied_at <= $${paramCount}`;
        params.push(dateTo);
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT .+ FROM/,
        'SELECT COUNT(*) as total FROM'
      );
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // Add sorting
      const allowedSortFields = ['applied_at', 'status', 'first_name', 'last_name', 'job_title'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'applied_at';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      if (sortBy === 'first_name' || sortBy === 'last_name') {
        query += ` ORDER BY c.${sortField} ${order}`;
      } else if (sortBy === 'job_title') {
        query += ` ORDER BY j.title ${order}`;
      } else {
        query += ` ORDER BY a.${sortField} ${order}`;
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
        applications: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      this.logger.error('Error searching applications:', error);
      throw error;
    }
  }

  /**
   * Get application count by status
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
      this.logger.error('Error getting application count by status:', error);
      throw error;
    }
  }

  /**
   * Get recent applications
   */
  async getRecent(organizationId, limit = 10) {
    try {
      const query = `
        SELECT 
          a.*,
          c.first_name, c.last_name, c.email as candidate_email,
          j.title as job_title, j.department
        FROM applications a
        INNER JOIN candidates c ON a.candidate_id = c.id
        INNER JOIN jobs j ON a.job_id = j.id
        WHERE a.organization_id = $1 
          AND a.deleted_at IS NULL
        ORDER BY a.applied_at DESC
        LIMIT $2
      `;

      const result = await db.query(query, [organizationId, limit]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error getting recent applications:', error);
      throw error;
    }
  }

  /**
   * Update application status with status history tracking
   */
  async updateStatus(id, status, reviewedBy, notes, organizationId) {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET 
          status = $1,
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          notes = CASE WHEN $3 IS NOT NULL THEN $3 ELSE notes END,
          status_history = COALESCE(status_history, '[]'::jsonb) || 
            jsonb_build_object(
              'status', $1,
              'changed_at', CURRENT_TIMESTAMP,
              'changed_by', $2,
              'notes', $3
            )::jsonb,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 
          AND organization_id = $5 
          AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await db.query(query, [status, reviewedBy, notes, id, organizationId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error updating application status:', error);
      throw error;
    }
  }

  /**
   * Count applications for a specific job
   */
  async countByJob(jobId, organizationId, status = null) {
    try {
      let query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE job_id = $1 
          AND organization_id = $2 
          AND deleted_at IS NULL
      `;

      const params = [jobId, organizationId];

      if (status) {
        query += ` AND status = $3`;
        params.push(status);
      }

      const result = await db.query(query, params);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      this.logger.error('Error counting applications by job:', error);
      throw error;
    }
  }

  /**
   * Count applications for a specific candidate
   */
  async countByCandidate(candidateId, organizationId) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE candidate_id = $1 
          AND organization_id = $2 
          AND deleted_at IS NULL
      `;

      const result = await db.query(query, [candidateId, organizationId]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      this.logger.error('Error counting applications by candidate:', error);
      throw error;
    }
  }

  /**
   * Get application pipeline statistics
   */
  async getPipelineStats(organizationId, jobId = null) {
    try {
      let query = `
        SELECT 
          status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (COALESCE(reviewed_at, CURRENT_TIMESTAMP) - applied_at))/86400)::integer as avg_days_in_status
        FROM ${this.tableName}
        WHERE organization_id = $1 
          AND deleted_at IS NULL
      `;

      const params = [organizationId];

      if (jobId) {
        query += ` AND job_id = $2`;
        params.push(jobId);
      }

      query += `
        GROUP BY status
        ORDER BY 
          CASE status
            WHEN 'applied' THEN 1
            WHEN 'screening' THEN 2
            WHEN 'interview' THEN 3
            WHEN 'offer' THEN 4
            WHEN 'hired' THEN 5
            WHEN 'rejected' THEN 6
            ELSE 7
          END
      `;

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Error getting pipeline stats:', error);
      throw error;
    }
  }
}
