/**
 * CandidateRepository - Data access layer for candidates
 * Handles all database operations for candidate entities
 */

import { BaseRepository } from './BaseRepository.js';
import { db } from '../config/database.js';

export class CandidateRepository extends BaseRepository {
  constructor() {
    super('candidates');
  }

  /**
   * Find candidate with application count
   * @param {string} id - Candidate ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>}
   */
  async findByIdWithApplications(id, organizationId) {
    try {
      const query = `
        SELECT 
          c.*,
          COUNT(a.id) as application_count,
          json_agg(
            json_build_object(
              'id', a.id,
              'status', a.status,
              'job_id', a.job_id,
              'job_title', j.title,
              'applied_at', a.created_at
            )
          ) FILTER (WHERE a.id IS NOT NULL) as applications
        FROM candidates c
        LEFT JOIN applications a ON c.id = a.candidate_id AND a.deleted_at IS NULL
        LEFT JOIN jobs j ON a.job_id = j.id AND j.deleted_at IS NULL
        WHERE c.id = $1 
        AND c.organization_id = $2
        AND c.deleted_at IS NULL
        GROUP BY c.id
      `;

      const result = await db.query(query, [id, organizationId], organizationId, {
        operation: 'findByIdWithApplications',
        table: this.tableName
      });

      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error in findByIdWithApplications', {
        id,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find candidate by email
   * @param {string} email - Candidate email
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email, organizationId) {
    return await this.findOneBy({ email }, organizationId);
  }

  /**
   * Search candidates with filters and pagination
   * @param {Object} params - Search parameters
   * @param {string} organizationId - Organization ID
   * @returns {Promise<{candidates: Array, total: number, page: number, totalPages: number}>}
   */
  async search(params, organizationId) {
    try {
      const {
        search = '',
        status = null,
        source = null,
        tags = null,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = params;

      const offset = (page - 1) * limit;
      const queryParams = [organizationId];
      let paramIndex = 2;
      
      let whereConditions = ['c.organization_id = $1', 'c.deleted_at IS NULL'];

      // Search by name, email, phone
      if (search) {
        whereConditions.push(`(
          c.first_name ILIKE $${paramIndex} OR 
          c.last_name ILIKE $${paramIndex} OR 
          c.email ILIKE $${paramIndex} OR 
          c.phone ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      // Filter by status
      if (status) {
        whereConditions.push(`c.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      // Filter by source
      if (source) {
        whereConditions.push(`c.source = $${paramIndex}`);
        queryParams.push(source);
        paramIndex++;
      }

      // Filter by tags
      if (tags && Array.isArray(tags) && tags.length > 0) {
        whereConditions.push(`c.tags && $${paramIndex}`);
        queryParams.push(tags);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Count total
      const countQuery = `
        SELECT COUNT(DISTINCT c.id) as total
        FROM candidates c
        WHERE ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams, organizationId, {
        operation: 'search-count',
        table: this.tableName
      });

      const total = parseInt(countResult.rows[0].total, 10);

      // Get paginated results
      const dataQuery = `
        SELECT 
          c.*,
          COUNT(a.id) as application_count
        FROM candidates c
        LEFT JOIN applications a ON c.id = a.candidate_id AND a.deleted_at IS NULL
        WHERE ${whereClause}
        GROUP BY c.id
        ORDER BY c.${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const dataResult = await db.query(dataQuery, queryParams, organizationId, {
        operation: 'search',
        table: this.tableName
      });

      return {
        candidates: dataResult.rows,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      this.logger.error('Error in search', {
        params,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get candidate count by status
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getCountByStatus(organizationId) {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as count
        FROM candidates
        WHERE organization_id = $1
        AND deleted_at IS NULL
        GROUP BY status
      `;

      const result = await db.query(query, [organizationId], organizationId, {
        operation: 'getCountByStatus',
        table: this.tableName
      });

      return result.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      }, {});
    } catch (error) {
      this.logger.error('Error in getCountByStatus', {
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get recently added candidates
   * @param {number} limit - Number of candidates to retrieve
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async getRecent(limit, organizationId) {
    try {
      const query = `
        SELECT c.*, COUNT(a.id) as application_count
        FROM candidates c
        LEFT JOIN applications a ON c.id = a.candidate_id AND a.deleted_at IS NULL
        WHERE c.organization_id = $1
        AND c.deleted_at IS NULL
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT $2
      `;

      const result = await db.query(query, [organizationId, limit], organizationId, {
        operation: 'getRecent',
        table: this.tableName
      });

      return result.rows;
    } catch (error) {
      this.logger.error('Error in getRecent', {
        limit,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Bulk create candidates
   * @param {Array<Object>} candidatesData - Array of candidate data
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async bulkCreate(candidatesData, organizationId) {
    return await this.transaction(async (client) => {
      const candidates = [];
      
      for (const data of candidatesData) {
        const candidate = await this.create(data, organizationId);
        candidates.push(candidate);
      }

      return candidates;
    });
  }

  /**
   * Update candidate tags
   * @param {string} id - Candidate ID
   * @param {Array<string>} tags - Tags array
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async updateTags(id, tags, organizationId) {
    try {
      const query = `
        UPDATE candidates
        SET tags = $1, updated_at = $2
        WHERE id = $3 
        AND organization_id = $4
        AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await db.query(
        query,
        [tags, new Date(), id, organizationId],
        organizationId,
        {
          operation: 'updateTags',
          table: this.tableName
        }
      );

      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error in updateTags', {
        id,
        tags,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }
}
