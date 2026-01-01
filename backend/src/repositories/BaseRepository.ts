/**
 * BaseRepository - Abstract base class for all repositories
 * Implements common CRUD operations following Repository Pattern
 * 
 * Industry Standards:
 * - Returns DTOs (Data Transfer Objects), not raw database records
 * - Handles snake_case to camelCase transformation
 * - Provides consistent API across all repositories
 * 
 * @see https://martinfowler.com/eaaCatalog/repository.html
 */

import pool, { query } from '../config/database.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { mapDbToApi, mapApiToDb } from '../utils/dtoMapper.js';

// Use the custom query function that supports organizationId filtering
const db = { query };

/**
 * Generic filter type for base repository queries
 */
export type BaseFilters = Record<string, unknown>;

export class BaseRepository {
  tableName: string;
  logger: any;

  /**
   * @param {string} tableName - The database table name
   */
  constructor(tableName: string) {
    if (new.target === BaseRepository) {
      throw new TypeError('Cannot construct BaseRepository instances directly');
    }
    this.tableName = tableName;
    this.logger = logger;
  }

  /**
   * Find a single record by ID
   * @param {string} id - Record ID
   * @param {string} organizationId - Organization ID for multi-tenancy
   * @returns {Promise<Object|null>} DTO object with camelCase fields
   */
  async findById(id, organizationId) {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE id = $1 
        AND organization_id = $2
        AND deleted_at IS NULL
      `;
      
      const result = await db.query(query, [id, organizationId], organizationId, {
        operation: 'findById',
        table: this.tableName
      });

      const dbRecord = result.rows[0] || null;
      return dbRecord ? mapDbToApi(dbRecord) : null;
    } catch (error) {
      this.logger.error('Error in findById', {
        table: this.tableName,
        id,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find all records with optional filtering
   * @param {Object} filters - Filter conditions
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array>}
   */
  async findAll(filters: Record<string, any> = {}, organizationId: string, options: { limit?: number; offset?: number; orderBy?: string } = {}) {
    try {
      const { limit = 50, offset = 0, orderBy = 'created_at DESC' } = options;
      
      let query = `SELECT * FROM ${this.tableName} WHERE organization_id = $1 AND deleted_at IS NULL`;
      const params = [organizationId];
      let paramIndex = 2;

      // Add dynamic filters
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query += ` AND ${key} = $${paramIndex}`;
          params.push(value);
          paramIndex++;
        }
      }

      query += ` ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params, organizationId, {
        operation: 'findAll',
        table: this.tableName
      });

      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error in findAll', {
        table: this.tableName,
        filters,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find one record by conditions
   * @param {Object} conditions - Where conditions
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>}
   */
  async findOneBy(conditions, organizationId) {
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE organization_id = $1 AND deleted_at IS NULL`;
      const params = [organizationId];
      let paramIndex = 2;

      for (const [key, value] of Object.entries(conditions)) {
        if (value !== undefined && value !== null) {
          query += ` AND ${key} = $${paramIndex}`;
          params.push(value);
          paramIndex++;
        }
      }

      query += ' LIMIT 1';

      const result = await db.query(query, params, organizationId, {
        operation: 'findOneBy',
        table: this.tableName
      });

      const dbRecord = result.rows[0] || null;
      return dbRecord ? mapDbToApi(dbRecord) : null;
    } catch (error) {
      this.logger.error('Error in findOneBy', {
        table: this.tableName,
        conditions,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async create(data, organizationId) {
    try {
      const id = uuidv4();
      const now = new Date();
      
      const recordData = {
        id,
        ...data,
        organization_id: organizationId,
        created_at: now,
        updated_at: now
      };

      const columns = Object.keys(recordData);
      const values = Object.values(recordData);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

      const query = `
        INSERT INTO ${this.tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = await db.query(query, values, organizationId, {
        operation: 'create',
        table: this.tableName
      });

      this.logger.info('Record created', {
        table: this.tableName,
        id,
        organizationId
      });

      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error in create', {
        table: this.tableName,
        data,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update a record
   * @param {string} id - Record ID
   * @param {Object} data - Updated data
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async update(id, data, organizationId) {
    try {
      const updateData = {
        ...data,
        updated_at: new Date()
      };

      const entries = Object.entries(updateData);
      const setClause = entries
        .map(([key], i) => `${key} = $${i + 3}`)
        .join(', ');
      
      const values = entries.map(([, value]) => value);

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}
        WHERE id = $1 
        AND organization_id = $2
        AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await db.query(
        query, 
        [id, organizationId, ...values], 
        organizationId,
        {
          operation: 'update',
          table: this.tableName
        }
      );

      if (result.rows.length === 0) {
        return null;
      }

      this.logger.info('Record updated', {
        table: this.tableName,
        id,
        organizationId
      });

      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error in update', {
        table: this.tableName,
        id,
        data,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Soft delete a record
   * @param {string} id - Record ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async delete(id, organizationId) {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET deleted_at = $1, updated_at = $1
        WHERE id = $2 
        AND organization_id = $3
        AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await db.query(
        query, 
        [new Date(), id, organizationId], 
        organizationId,
        {
          operation: 'delete',
          table: this.tableName
        }
      );

      const deleted = result.rows.length > 0;

      if (deleted) {
        this.logger.info('Record soft deleted', {
          table: this.tableName,
          id,
          organizationId
        });
      }

      return deleted;
    } catch (error) {
      this.logger.error('Error in delete', {
        table: this.tableName,
        id,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Count records with optional filters
   * @param {Object} filters - Filter conditions
   * @param {string} organizationId - Organization ID
   * @returns {Promise<number>}
   */
  async count(filters: BaseFilters = {}, organizationId: string) {
    try {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE organization_id = $1 AND deleted_at IS NULL`;
      const params: unknown[] = [organizationId];
      let paramIndex = 2;

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query += ` AND ${key} = $${paramIndex}`;
          params.push(value);
          paramIndex++;
        }
      }

      const result = await db.query(query, params, organizationId, {
        operation: 'count',
        table: this.tableName
      });

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      this.logger.error('Error in count', {
        table: this.tableName,
        filters,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if a record exists
   * @param {Object} conditions - Where conditions
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async exists(conditions, organizationId) {
    try {
      const record = await this.findOneBy(conditions, organizationId);
      return record !== null;
    } catch (error) {
      this.logger.error('Error in exists', {
        table: this.tableName,
        conditions,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute a transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>}
   */
  async transaction(callback) {
    return await db.transaction(callback);
  }
}
