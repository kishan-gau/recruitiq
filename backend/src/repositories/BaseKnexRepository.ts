/**
 * BaseRepository with Knex.js
 * 
 * Base class for all repositories with Knex query builder
 * Provides common CRUD operations with tenant isolation
 * 
 * This is an ALTERNATIVE to the raw SQL BaseRepository.
 * Both patterns are valid - choose based on preference:
 * 
 * - Use Knex: For complex queries, joins, query building
 * - Use raw SQL: For simple queries, performance-critical operations
 */

import db from '../config/knex.js';
import logger from '../utils/logger.js';

class BaseKnexRepository {
  tableName: string;
  db: any;

  /**
   * @param {string} tableName - Name of the database table
   */
  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = db;
  }

  /**
   * Base query with tenant isolation
   * ALWAYS filters by organization_id
   * 
   * @param {string} organizationId - Organization UUID
   * @returns {import('knex').Knex.QueryBuilder}
   */
  baseQuery(organizationId) {
    return this.db(this.tableName)
      .where({ organization_id: organizationId })
      .whereNull('deleted_at');
  }

  /**
   * Find record by ID with tenant isolation
   * 
   * @param {string} id - Record UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>}
   */
  async findById(id, organizationId) {
    try {
      const record = await this.baseQuery(organizationId)
        .where({ id })
        .first();
      
      return record || null;
    } catch (_error) {
      logger.error(`Error finding ${this.tableName} by ID`, {
        error: error.message,
        id,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Find all records with tenant isolation
   * 
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array>}
   */
  async findAll(organizationId: string, filters: Record<string, any> = {}, options: { limit?: number; offset?: number; orderBy?: string; orderDirection?: string } = {}) {
    try {
      let query = this.baseQuery(organizationId);
      
      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.where(key, value);
        }
      });
      
      // Apply ordering
      if (options.orderBy) {
        const direction = options.orderDirection || 'asc';
        query = query.orderBy(options.orderBy, direction);
      } else {
        // Default ordering
        query = query.orderBy('created_at', 'desc');
      }
      
      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.offset(options.offset);
      }
      
      const records = await query;
      return records;
    } catch (_error) {
      logger.error(`Error finding all ${this.tableName}`, {
        error: error.message,
        organizationId,
        filters,
      });
      throw error;
    }
  }

  /**
   * Count records with tenant isolation
   * 
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Additional filters
   * @returns {Promise<number>}
   */
  async count(organizationId, filters = {}) {
    try {
      let query = this.baseQuery(organizationId);
      
      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.where(key, value);
        }
      });
      
      const result = await query.count('* as count').first();
      return parseInt(result.count, 10);
    } catch (_error) {
      logger.error(`Error counting ${this.tableName}`, {
        error: error.message,
        organizationId,
        filters,
      });
      throw error;
    }
  }

  /**
   * Create new record with tenant isolation
   * 
   * @param {Object} data - Record data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User ID for audit trail
   * @returns {Promise<Object>}
   */
  async create(data, organizationId, userId) {
    try {
      const recordData = {
        ...data,
        organization_id: organizationId,
        created_by: userId,
        updated_by: userId,
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      };
      
      const [record] = await this.db(this.tableName)
        .insert(recordData)
        .returning('*');
      
      logger.info(`Created ${this.tableName}`, {
        id: record.id,
        organizationId,
        userId,
      });
      
      return record;
    } catch (_error) {
      logger.error(`Error creating ${this.tableName}`, {
        error: error.message,
        organizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update record with tenant isolation
   * 
   * @param {string} id - Record UUID
   * @param {Object} data - Update data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User ID for audit trail
   * @returns {Promise<Object>}
   */
  async update(id, data, organizationId, userId) {
    try {
      const updateData = {
        ...data,
        updated_by: userId,
        updated_at: this.db.fn.now(),
      };
      
      const [record] = await this.db(this.tableName)
        .where({ id, organization_id: organizationId })
        .whereNull('deleted_at')
        .update(updateData)
        .returning('*');
      
      if (!record) {
        return null;
      }
      
      logger.info(`Updated ${this.tableName}`, {
        id,
        organizationId,
        userId,
      });
      
      return record;
    } catch (_error) {
      logger.error(`Error updating ${this.tableName}`, {
        error: error.message,
        id,
        organizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Soft delete record with tenant isolation
   * 
   * @param {string} id - Record UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User ID for audit trail
   * @returns {Promise<boolean>}
   */
  async softDelete(id, organizationId, userId) {
    try {
      const result = await this.db(this.tableName)
        .where({ id, organization_id: organizationId })
        .whereNull('deleted_at')
        .update({
          deleted_at: this.db.fn.now(),
          deleted_by: userId,
        });
      
      const deleted = result > 0;
      
      if (deleted) {
        logger.info(`Soft deleted ${this.tableName}`, {
          id,
          organizationId,
          userId,
        });
      }
      
      return deleted;
    } catch (_error) {
      logger.error(`Error soft deleting ${this.tableName}`, {
        error: error.message,
        id,
        organizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Hard delete record (USE WITH CAUTION)
   * 
   * @param {string} id - Record UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<boolean>}
   */
  async hardDelete(id, organizationId) {
    try {
      const result = await this.db(this.tableName)
        .where({ id, organization_id: organizationId })
        .delete();
      
      const deleted = result > 0;
      
      if (deleted) {
        logger.warn(`Hard deleted ${this.tableName}`, {
          id,
          organizationId,
        });
      }
      
      return deleted;
    } catch (_error) {
      logger.error(`Error hard deleting ${this.tableName}`, {
        error: error.message,
        id,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Execute transaction
   * 
   * @param {Function} callback - Callback function with transaction object
   * @returns {Promise<any>}
   */
  async transaction(callback) {
    return this.db.transaction(callback);
  }
}

export default BaseKnexRepository;
