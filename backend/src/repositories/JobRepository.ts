/**
 * JobRepository - Data access layer for jobs
 * Handles all database operations for job entities
 */

import { BaseRepository } from './BaseRepository.ts';
import pool, { query } from '../config/database.ts';

// Use the custom query function that supports organizationId filtering
const db = { query };

export class JobRepository extends BaseRepository {
  constructor() {
    super('jobs');
  }

  /**
   * Find job with application count
   * @param {string} id - Job ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>}
   */
  async findByIdWithStats(id, organizationId) {
    try {
      const query = `
        SELECT 
          j.*,
          COUNT(DISTINCT a.id) as application_count,
          COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'applied') as new_applications,
          COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'screening') as screening_count,
          COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'interviewing') as interviewing_count,
          ua.email as hiring_manager_email,
          e.first_name || ' ' || e.last_name as hiring_manager_name
        FROM jobs j
        LEFT JOIN applications a ON j.id = a.job_id AND a.deleted_at IS NULL
        LEFT JOIN hris.user_account ua ON j.hiring_manager_id = ua.id AND ua.deleted_at IS NULL
        LEFT JOIN hris.employee e ON ua.employee_id = e.id AND e.deleted_at IS NULL
        WHERE j.id = $1 
        AND j.organization_id = $2
        AND j.deleted_at IS NULL
        GROUP BY j.id, ua.id, ua.email, e.first_name, e.last_name
      `;

      const result = await db.query(query, [id, organizationId], organizationId, {
        operation: 'findByIdWithStats',
        table: this.tableName
      });

      const dbRecord = result.rows[0] || null;
      if (!dbRecord) return null;
      
      // Import DTO mapper for specialized stats mapping
      const { mapJobWithStatsDto } = await import('../utils/dtoMapper');
      return mapJobWithStatsDto(dbRecord);
    } catch (error) {
      this.logger.error('Error in findByIdWithStats', {
        id,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find job by slug (public access)
   * @param {string} slug - Job slug
   * @returns {Promise<Object|null>}
   */
  async findBySlug(slug) {
    try {
      const query = `
        SELECT 
          j.*,
          o.name as organization_name,
          o.slug as organization_slug
        FROM jobs j
        JOIN organizations o ON j.organization_id = o.id
        WHERE j.public_slug = $1 
        AND j.is_public = true
        AND j.deleted_at IS NULL
      `;

      const result = await db.query(query, [slug], null, {
        operation: 'findBySlug',
        table: this.tableName
      });

      const dbRecord = result.rows[0] || null;
      if (!dbRecord) return null;
      
      // Import DTO mapper
      const { mapDbToApi } = await import('../utils/dtoMapper');
      return mapDbToApi(dbRecord);
    } catch (error) {
      this.logger.error('Error in findBySlug', {
        slug,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search jobs with filters and pagination
   * @param {Object} params - Search parameters
   * @param {string} organizationId - Organization ID
   * @returns {Promise<{jobs: Array, total: number, page: number, totalPages: number}>}
   */
  async search(params, organizationId) {
    try {
      const {
        search = '',
        status = null,
        department = null,
        employment_type = null,
        location = null,
        hiring_manager_id = null,
        is_published = null,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = params;

      const offset = (page - 1) * limit;
      const queryParams = [organizationId];
      let paramIndex = 2;
      
      let whereConditions = ['j.organization_id = $1', 'j.deleted_at IS NULL'];

      // Search by title, description
      if (search) {
        whereConditions.push(`(
          j.title ILIKE $${paramIndex} OR 
          j.description ILIKE $${paramIndex} OR
          j.department ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      // Filter by status
      if (status) {
        whereConditions.push(`j.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      // Filter by department
      if (department) {
        whereConditions.push(`j.department = $${paramIndex}`);
        queryParams.push(department);
        paramIndex++;
      }

      // Filter by employment type
      if (employment_type) {
        whereConditions.push(`j.employment_type = $${paramIndex}`);
        queryParams.push(employment_type);
        paramIndex++;
      }

      // Filter by location
      if (location) {
        whereConditions.push(`j.location ILIKE $${paramIndex}`);
        queryParams.push(`%${location}%`);
        paramIndex++;
      }

      // Filter by hiring manager
      if (hiring_manager_id) {
        whereConditions.push(`j.hiring_manager_id = $${paramIndex}`);
        queryParams.push(hiring_manager_id);
        paramIndex++;
      }

      // Filter by published status
      if (is_published !== null) {
        whereConditions.push(`j.is_published = $${paramIndex}`);
        queryParams.push(is_published);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Count total
      const countQuery = `
        SELECT COUNT(DISTINCT j.id) as total
        FROM jobs j
        WHERE ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams, organizationId, {
        operation: 'search-count',
        table: this.tableName
      });

      const total = parseInt(countResult.rows[0].total, 10);

      // Get paginated results with application counts
      const dataQuery = `
        SELECT 
          j.*,
          COUNT(DISTINCT a.id) as application_count,
          COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'applied') as new_applications,
          e.first_name || ' ' || e.last_name as hiring_manager_name
        FROM jobs j
        LEFT JOIN applications a ON j.id = a.job_id AND a.deleted_at IS NULL
        LEFT JOIN hris.user_account ua ON j.hiring_manager_id = ua.id AND ua.deleted_at IS NULL
        LEFT JOIN hris.employee e ON ua.employee_id = e.id AND e.deleted_at IS NULL
        WHERE ${whereClause}
        GROUP BY j.id, e.first_name, e.last_name
        ORDER BY j.${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const dataResult = await db.query(dataQuery, queryParams, organizationId, {
        operation: 'search',
        table: this.tableName
      });

      // Import DTO mapper for list results
      const { mapToListDto } = await import('../utils/dtoMapper');
      
      return {
        jobs: mapToListDto(dataResult.rows, 'jobs'),
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
   * Get active jobs count by status
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getCountByStatus(organizationId) {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as count
        FROM jobs
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
   * Get published jobs for career page
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>}
   */
  async getPublishedJobs(organizationId, filters = {}) {
    try {
      const { location, department, employment_type, limit = 50 } = filters;
      
      let whereConditions = [
        'j.organization_id = $1',
        'j.is_published = true',
        'j.deleted_at IS NULL',
        'j.status = $2'
      ];
      const queryParams = [organizationId, 'open'];
      let paramIndex = 3;

      if (location) {
        whereConditions.push(`j.location ILIKE $${paramIndex}`);
        queryParams.push(`%${location}%`);
        paramIndex++;
      }

      if (department) {
        whereConditions.push(`j.department = $${paramIndex}`);
        queryParams.push(department);
        paramIndex++;
      }

      if (employment_type) {
        whereConditions.push(`j.employment_type = $${paramIndex}`);
        queryParams.push(employment_type);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          j.id,
          j.title,
          j.department,
          j.location,
          j.employment_type,
          j.salary_min,
          j.salary_max,
          j.experience_level,
          j.public_slug,
          j.posted_at,
          j.description,
          COUNT(DISTINCT a.id) as application_count
        FROM jobs j
        LEFT JOIN applications a ON j.id = a.job_id AND a.deleted_at IS NULL
        WHERE ${whereClause}
        GROUP BY j.id
        ORDER BY j.posted_at DESC
        LIMIT $${paramIndex}
      `;

      queryParams.push(limit);

      const result = await db.query(query, queryParams, organizationId, {
        operation: 'getPublishedJobs',
        table: this.tableName
      });

      return result.rows;
    } catch (error) {
      this.logger.error('Error in getPublishedJobs', {
        organizationId,
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate unique slug for job
   * @param {string} title - Job title
   * @param {string} jobId - Job ID (optional, for updates)
   * @returns {Promise<string>}
   */
  async generateUniqueSlug(title, jobId = null) {
    try {
      // Create base slug from title
      let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if slug exists
      let counter = 0;
      let uniqueSlug = slug;
      let exists = true;

      while (exists) {
        const query = jobId
          ? 'SELECT id FROM jobs WHERE public_slug = $1 AND id != $2 AND deleted_at IS NULL'
          : 'SELECT id FROM jobs WHERE public_slug = $1 AND deleted_at IS NULL';
        
        const params = jobId ? [uniqueSlug, jobId] : [uniqueSlug];
        
        const result = await db.query(query, params, null, {
          operation: 'checkSlugUnique',
          table: this.tableName
        });

        if (result.rows.length === 0) {
          exists = false;
        } else {
          counter++;
          uniqueSlug = `${slug}-${counter}`;
        }
      }

      return uniqueSlug;
    } catch (error) {
      this.logger.error('Error in generateUniqueSlug', {
        title,
        jobId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update job publish status
   * @param {string} id - Job ID
   * @param {boolean} isPublished - Published status
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async updatePublishStatus(id, isPublished, organizationId) {
    try {
      const updates = {
        is_published: isPublished
      };

      // Set posted_at when publishing for the first time
      if (isPublished) {
        const job = await this.findById(id, organizationId);
        if (job && !job.posted_at) {
          updates.posted_at = new Date();
        }
      }

      return await this.update(id, updates, organizationId);
    } catch (error) {
      this.logger.error('Error in updatePublishStatus', {
        id,
        isPublished,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get jobs by hiring manager
   * @param {string} hiringManagerId - Hiring manager user ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async getByHiringManager(hiringManagerId, organizationId) {
    try {
      const query = `
        SELECT 
          j.*,
          COUNT(DISTINCT a.id) as application_count
        FROM jobs j
        LEFT JOIN applications a ON j.id = a.job_id AND a.deleted_at IS NULL
        WHERE j.hiring_manager_id = $1
        AND j.organization_id = $2
        AND j.deleted_at IS NULL
        GROUP BY j.id
        ORDER BY j.created_at DESC
      `;

      const result = await db.query(
        query,
        [hiringManagerId, organizationId],
        organizationId,
        {
          operation: 'getByHiringManager',
          table: this.tableName
        }
      );

      return result.rows;
    } catch (error) {
      this.logger.error('Error in getByHiringManager', {
        hiringManagerId,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }
}
