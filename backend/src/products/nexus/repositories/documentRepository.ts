/**
 * DocumentRepository
 * Data access layer for employee document management
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import { mapDbToApi, mapApiToDb } from '../../../utils/dtoMapper.js';

class DocumentRepository {
  
  logger: any;

  query: any;

  tableName: string;

constructor(database = null) {
    this.query = database?.query || query;
    this.tableName = 'hris.employee_document';
    this.logger = logger;
  }

  async findById(id, organizationId) {
    try {
      const sql = `
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name,
               u.first_name || ' ' || u.last_name as uploaded_by_name
        FROM ${this.tableName} d
        LEFT JOIN hris.employee e ON d.employee_id = e.id
        LEFT JOIN hris.user_account u ON d.uploaded_by = u.id
        WHERE d.id = $1 AND d.organization_id = $2 AND d.deleted_at IS NULL
      `;
      const result = await this.query(sql, [id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (_error) {
      this.logger.error('Error finding document', { id, error: error.message });
      throw error;
    }
  }

  async findByEmployee(employeeId, organizationId, filters = {}) {
    try {
      let sql = `
        SELECT d.*,
               u.first_name || ' ' || u.last_name as uploaded_by_name
        FROM ${this.tableName} d
        LEFT JOIN hris.user_account u ON d.uploaded_by = u.id
        WHERE d.employee_id = $1 AND d.organization_id = $2 AND d.deleted_at IS NULL
      `;
      const params = [employeeId, organizationId];
      let paramIndex = 3;

      if (filters.documentType) {
        sql += ` AND d.document_type = $${paramIndex}`;
        params.push(filters.documentType);
        paramIndex++;
      }

      if (filters.category) {
        sql += ` AND d.category = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      sql += ` ORDER BY d.uploaded_at DESC`;

      const result = await this.query(sql, params, organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (_error) {
      this.logger.error('Error finding documents by employee', { employeeId, error: error.message });
      throw error;
    }
  }

  async findAll(filters, organizationId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      let sql = `
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name,
               u.first_name || ' ' || u.last_name as uploaded_by_name
        FROM ${this.tableName} d
        LEFT JOIN hris.employee e ON d.employee_id = e.id
        LEFT JOIN hris.user_account u ON d.uploaded_by = u.id
        WHERE d.organization_id = $1 AND d.deleted_at IS NULL
      `;
      const params = [organizationId];
      let paramIndex = 2;

      if (filters.documentType) {
        sql += ` AND d.document_type = $${paramIndex}`;
        params.push(filters.documentType);
        paramIndex++;
      }

      if (filters.category) {
        sql += ` AND d.category = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      if (filters.isConfidential !== undefined) {
        sql += ` AND d.is_confidential = $${paramIndex}`;
        params.push(filters.isConfidential);
        paramIndex++;
      }

      sql += ` ORDER BY d.uploaded_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.query(sql, params, organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (_error) {
      this.logger.error('Error finding documents', { error: error.message });
      throw error;
    }
  }

  async create(documentData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(documentData);
      const sql = `
        INSERT INTO ${this.tableName} (
          organization_id, employee_id, document_type, document_name,
          file_url, file_size, file_type, category,
          expiry_date, is_confidential, notes, metadata,
          uploaded_by, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;
      const params = [
        organizationId, dbData.employee_id, dbData.document_type, dbData.document_name,
        dbData.file_url, dbData.file_size || null, dbData.file_type || null, dbData.category || null,
        dbData.expiry_date || null, dbData.is_confidential || false, dbData.notes || null,
        dbData.metadata ? JSON.stringify(dbData.metadata) : '{}',
        userId, userId, userId
      ];
      const result = await this.query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (_error) {
      this.logger.error('Error creating document', { error: error.message });
      throw error;
    }
  }

  async update(id, documentData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(documentData);
      const sql = `
        UPDATE ${this.tableName}
        SET
          document_name = COALESCE($1, document_name),
          category = COALESCE($2, category),
          expiry_date = COALESCE($3, expiry_date),
          is_confidential = COALESCE($4, is_confidential),
          notes = COALESCE($5, notes),
          metadata = COALESCE($6, metadata),
          updated_by = $7,
          updated_at = NOW()
        WHERE id = $8 AND organization_id = $9 AND deleted_at IS NULL
        RETURNING *
      `;
      const params = [
        dbData.document_name, dbData.category, dbData.expiry_date, dbData.is_confidential,
        dbData.notes, dbData.metadata ? JSON.stringify(dbData.metadata) : null,
        userId, id, organizationId
      ];
      const result = await this.query(sql, params, organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (_error) {
      this.logger.error('Error updating document', { error: error.message });
      throw error;
    }
  }

  async delete(id, organizationId, userId) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET deleted_at = NOW(), updated_by = $1
        WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
        RETURNING *
      `;
      const result = await this.query(sql, [userId, id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (_error) {
      this.logger.error('Error deleting document', { error: error.message });
      throw error;
    }
  }

  async findExpiringSoon(daysAhead, organizationId) {
    try {
      const sql = `
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name,
               (d.expiry_date - CURRENT_DATE) as days_until_expiry
        FROM ${this.tableName} d
        LEFT JOIN hris.employee e ON d.employee_id = e.id
        WHERE d.organization_id = $1
          AND d.deleted_at IS NULL
          AND d.expiry_date IS NOT NULL
          AND d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $2
        ORDER BY d.expiry_date ASC
      `;
      const result = await this.query(sql, [organizationId, daysAhead], organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (_error) {
      this.logger.error('Error finding expiring documents', { error: error.message });
      throw error;
    }
  }

  async count(filters, organizationId) {
    try {
      let sql = `SELECT COUNT(*) FROM ${this.tableName} WHERE organization_id = $1 AND deleted_at IS NULL`;
      const params = [organizationId];
      let paramIndex = 2;

      if (filters.documentType) {
        sql += ` AND document_type = $${paramIndex}`;
        params.push(filters.documentType);
        paramIndex++;
      }

      if (filters.category) {
        sql += ` AND category = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      const result = await this.query(sql, params, organizationId);
      return parseInt(result.rows[0].count, 10);
    } catch (_error) {
      this.logger.error('Error counting documents', { error: error.message });
      throw error;
    }
  }
}

export default DocumentRepository;
