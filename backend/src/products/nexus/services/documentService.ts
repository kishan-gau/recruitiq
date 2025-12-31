/**
 * DocumentService
 * Business logic layer for document management
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import type { DocumentData } from '../../../types/nexus.types.js';

class DocumentService {
  logger: typeof logger;
  
  
  
  logger: any;

constructor() {
    this.logger = logger;
  }

  /**
   * Create a new document
   */
  async createDocument(documentData, organizationId, userId) {
    try {
      this.logger.info('Creating document', { 
        organizationId, 
        userId,
        documentName: documentData.document_name,
        employeeId: documentData.employee_id
      });

      if (!documentData.document_name) {
        throw new Error('Document name is required');
      }

      if (!documentData.employee_id) {
        throw new Error('Employee ID is required');
      }

      if (!documentData.document_type) {
        throw new Error('Document type is required');
      }

      // Verify employee exists
      const employeeSql = `
        SELECT id FROM hris.employee 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const employeeResult = await query(employeeSql, [documentData.employee_id, organizationId], organizationId);

      if (employeeResult.rows.length === 0) {
        throw new Error('Employee not found');
      }

      const sql = `
        INSERT INTO hris.employee_document (
          organization_id, employee_id, document_name, document_type,
          file_path, file_url, file_size, mime_type, description,
          issue_date, expiry_date, issuing_authority, document_number,
          is_confidential, is_verified, verified_by, verified_at,
          tags, metadata, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        RETURNING *
      `;

      const params = [
        organizationId,
        documentData.employee_id,
        documentData.document_name,
        documentData.document_type,
        documentData.file_path || null,
        documentData.file_url || null,
        documentData.file_size || null,
        documentData.mime_type || null,
        documentData.description || null,
        documentData.issue_date || null,
        documentData.expiry_date || null,
        documentData.issuing_authority || null,
        documentData.document_number || null,
        documentData.is_confidential || false,
        documentData.is_verified || false,
        documentData.verified_by || null,
        documentData.verified_at || null,
        documentData.tags ? JSON.stringify(documentData.tags) : null,
        documentData.metadata ? JSON.stringify(documentData.metadata) : null,
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'create',
        table: 'hris.employee_document'
      });

      this.logger.info('Document created successfully', { 
        documentId: result.rows[0].id,
        organizationId 
      });

      return result.rows[0];
    } catch (_error) {
      this.logger.error('Error creating document', { 
        error: error.message,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(id, organizationId) {
    try {
      this.logger.debug('Getting document', { id, organizationId });

      const sql = `
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name,
               vb.first_name || ' ' || vb.last_name as verified_by_name
        FROM hris.employee_document d
        INNER JOIN hris.employee e ON d.employee_id = e.id
        LEFT JOIN hris.employee vb ON d.verified_by = vb.id
        WHERE d.id = $1 
          AND d.organization_id = $2
          AND d.deleted_at IS NULL
      `;

      const result = await query(sql, [id, organizationId], organizationId, {
        operation: 'findById',
        table: 'hris.employee_document'
      });
      
      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      return result.rows[0];
    } catch (_error) {
      this.logger.error('Error getting document', { 
        error: error.message,
        id,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Update document
   */
  async updateDocument(id, documentData, organizationId, userId) {
    try {
      this.logger.info('Updating document', { 
        id,
        organizationId,
        userId 
      });

      // Check if document exists
      const checkSql = `
        SELECT * FROM hris.employee_document 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      const existingDoc = checkResult.rows[0];

      // Build update query dynamically
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const updateableFields = [
        'document_name', 'document_type', 'file_path', 'file_url', 'file_size',
        'mime_type', 'description', 'issue_date', 'expiry_date', 'issuing_authority',
        'document_number', 'is_confidential', 'is_verified', 'verified_by', 'verified_at'
      ];

      updateableFields.forEach(field => {
        if (documentData[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push(documentData[field]);
          paramIndex++;
        }
      });

      // Handle JSON fields
      if (documentData.tags !== undefined) {
        updates.push(`tags = $${paramIndex}`);
        params.push(JSON.stringify(documentData.tags));
        paramIndex++;
      }

      if (documentData.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex}`);
        params.push(JSON.stringify(documentData.metadata));
        paramIndex++;
      }

      if (updates.length === 0) {
        return existingDoc;
      }

      updates.push(`updated_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(id, organizationId);

      const sql = `
        UPDATE hris.employee_document 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, params, organizationId, {
        operation: 'update',
        table: 'hris.employee_document'
      });

      this.logger.info('Document updated successfully', { 
        id,
        organizationId 
      });

      return result.rows[0];
    } catch (_error) {
      this.logger.error('Error updating document', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Delete document (soft delete)
   */
  async deleteDocument(id, organizationId, userId) {
    try {
      this.logger.info('Deleting document', { 
        id,
        organizationId,
        userId 
      });

      // Check if document exists
      const checkSql = `
        SELECT id FROM hris.employee_document 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      // Soft delete document
      const sql = `
        UPDATE hris.employee_document 
        SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $3
        WHERE id = $1 AND organization_id = $2
      `;

      await query(sql, [id, organizationId, userId], organizationId, {
        operation: 'softDelete',
        table: 'hris.employee_document'
      });

      this.logger.info('Document deleted successfully', { 
        id,
        organizationId 
      });

      return { success: true, message: 'Document deleted successfully' };
    } catch (_error) {
      this.logger.error('Error deleting document', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get employee documents
   */
  async getEmployeeDocuments(employeeId, organizationId, options = {}) {
    try {
      this.logger.debug('Getting employee documents', { 
        employeeId,
        organizationId,
        options 
      });

      const { type, isConfidential, limit = 50, offset = 0 } = options;

      let sql = `
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM hris.employee_document d
        INNER JOIN hris.employee e ON d.employee_id = e.id
        WHERE d.employee_id = $1 
          AND d.organization_id = $2
          AND d.deleted_at IS NULL
      `;

      const params = [employeeId, organizationId];
      let paramIndex = 3;

      if (type) {
        sql += ` AND d.document_type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      if (isConfidential !== undefined) {
        sql += ` AND d.is_confidential = $${paramIndex}`;
        params.push(isConfidential);
        paramIndex++;
      }

      sql += ` ORDER BY d.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params, organizationId, {
        operation: 'findAll',
        table: 'hris.employee_document'
      });

      // Get total count
      let countSql = `
        SELECT COUNT(*) as count 
        FROM hris.employee_document d
        WHERE d.employee_id = $1 
          AND d.organization_id = $2
          AND d.deleted_at IS NULL
      `;

      const countParams = [employeeId, organizationId];
      let countIndex = 3;

      if (type) {
        countSql += ` AND d.document_type = $${countIndex}`;
        countParams.push(type);
        countIndex++;
      }

      if (isConfidential !== undefined) {
        countSql += ` AND d.is_confidential = $${countIndex}`;
        countParams.push(isConfidential);
        countIndex++;
      }

      const countResult = await query(countSql, countParams, organizationId, {
        operation: 'count',
        table: 'hris.employee_document'
      });

      return {
        documents: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      };
    } catch (_error) {
      this.logger.error('Error getting employee documents', { 
        error: error.message,
        employeeId,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get documents by type
   */
  async getDocumentsByType(type, organizationId, options = {}) {
    try {
      this.logger.debug('Getting documents by type', { 
        type,
        organizationId,
        options 
      });

      const { limit = 50, offset = 0 } = options;

      const sql = `
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM hris.employee_document d
        INNER JOIN hris.employee e ON d.employee_id = e.id
        WHERE d.document_type = $1 
          AND d.organization_id = $2
          AND d.deleted_at IS NULL
        ORDER BY d.created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await query(sql, [type, organizationId, limit, offset], organizationId, {
        operation: 'findAll',
        table: 'hris.employee_document'
      });

      // Get total count
      const countSql = `
        SELECT COUNT(*) as count 
        FROM hris.employee_document d
        WHERE d.document_type = $1 
          AND d.organization_id = $2
          AND d.deleted_at IS NULL
      `;

      const countResult = await query(countSql, [type, organizationId], organizationId, {
        operation: 'count',
        table: 'hris.employee_document'
      });

      return {
        documents: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      };
    } catch (_error) {
      this.logger.error('Error getting documents by type', { 
        error: error.message,
        type,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get expiring documents
   */
  async getExpiringDocuments(days, organizationId) {
    try {
      this.logger.debug('Getting expiring documents', { 
        days,
        organizationId 
      });

      const sql = `
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name,
               (d.expiry_date - CURRENT_DATE) as days_until_expiry
        FROM hris.employee_document d
        INNER JOIN hris.employee e ON d.employee_id = e.id
        WHERE d.organization_id = $1
          AND d.expiry_date IS NOT NULL
          AND d.expiry_date > CURRENT_DATE
          AND d.expiry_date <= CURRENT_DATE + INTERVAL '${days} days'
          AND d.deleted_at IS NULL
        ORDER BY d.expiry_date ASC
      `;

      const result = await query(sql, [organizationId], organizationId, {
        operation: 'findAll',
        table: 'hris.employee_document'
      });

      return result.rows;
    } catch (_error) {
      this.logger.error('Error getting expiring documents', { 
        error: error.message,
        days,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get expired documents
   */
  async getExpiredDocuments(organizationId) {
    try {
      this.logger.debug('Getting expired documents', { organizationId });

      const sql = `
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name,
               (CURRENT_DATE - d.expiry_date) as days_expired
        FROM hris.employee_document d
        INNER JOIN hris.employee e ON d.employee_id = e.id
        WHERE d.organization_id = $1
          AND d.expiry_date IS NOT NULL
          AND d.expiry_date < CURRENT_DATE
          AND d.deleted_at IS NULL
        ORDER BY d.expiry_date DESC
      `;

      const result = await query(sql, [organizationId], organizationId, {
        operation: 'findAll',
        table: 'hris.employee_document'
      });

      return result.rows;
    } catch (_error) {
      this.logger.error('Error getting expired documents', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(searchTerm, organizationId, options = {}) {
    try {
      this.logger.debug('Searching documents', { 
        searchTerm,
        organizationId,
        options 
      });

      const { type, limit = 50, offset = 0 } = options;

      let sql = `
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM hris.employee_document d
        INNER JOIN hris.employee e ON d.employee_id = e.id
        WHERE d.organization_id = $1
          AND d.deleted_at IS NULL
          AND (
            d.document_name ILIKE $2 
            OR d.description ILIKE $2
            OR d.document_number ILIKE $2
            OR (e.first_name || ' ' || e.last_name) ILIKE $2
          )
      `;

      const params = [organizationId, `%${searchTerm}%`];
      let paramIndex = 3;

      if (type) {
        sql += ` AND d.document_type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      sql += ` ORDER BY d.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params, organizationId, {
        operation: 'search',
        table: 'hris.employee_document'
      });

      // Get total count
      let countSql = `
        SELECT COUNT(*) as count 
        FROM hris.employee_document d
        INNER JOIN hris.employee e ON d.employee_id = e.id
        WHERE d.organization_id = $1
          AND d.deleted_at IS NULL
          AND (
            d.document_name ILIKE $2 
            OR d.description ILIKE $2
            OR d.document_number ILIKE $2
            OR (e.first_name || ' ' || e.last_name) ILIKE $2
          )
      `;

      const countParams = [organizationId, `%${searchTerm}%`];
      let countIndex = 3;

      if (type) {
        countSql += ` AND d.document_type = $${countIndex}`;
        countParams.push(type);
        countIndex++;
      }

      const countResult = await query(countSql, countParams, organizationId, {
        operation: 'count',
        table: 'hris.employee_document'
      });

      return {
        documents: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      };
    } catch (_error) {
      this.logger.error('Error searching documents', { 
        error: error.message,
        searchTerm,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get employee document statistics
   */
  async getEmployeeDocumentStats(employeeId, organizationId) {
    try {
      this.logger.debug('Getting employee document stats', { 
        employeeId,
        organizationId 
      });

      const sql = `
        SELECT 
          COUNT(*) as total_documents,
          COUNT(*) FILTER (WHERE is_verified = true) as verified_documents,
          COUNT(*) FILTER (WHERE is_confidential = true) as confidential_documents,
          COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE) as expired_documents,
          COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date > CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_soon,
          COUNT(DISTINCT document_type) as document_types,
          SUM(file_size) as total_size
        FROM hris.employee_document
        WHERE employee_id = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
      `;

      const result = await query(sql, [employeeId, organizationId], organizationId, {
        operation: 'stats',
        table: 'hris.employee_document'
      });

      return result.rows[0];
    } catch (_error) {
      this.logger.error('Error getting employee document stats', { 
        error: error.message,
        employeeId,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get organization document statistics
   */
  async getOrganizationDocumentStats(organizationId) {
    try {
      this.logger.debug('Getting organization document stats', { organizationId });

      const sql = `
        SELECT 
          COUNT(*) as total_documents,
          COUNT(*) FILTER (WHERE is_verified = true) as verified_documents,
          COUNT(*) FILTER (WHERE is_confidential = true) as confidential_documents,
          COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE) as expired_documents,
          COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date > CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_soon,
          COUNT(DISTINCT document_type) as document_types,
          COUNT(DISTINCT employee_id) as employees_with_documents,
          SUM(file_size) as total_size
        FROM hris.employee_document
        WHERE organization_id = $1
          AND deleted_at IS NULL
      `;

      const result = await query(sql, [organizationId], organizationId, {
        operation: 'stats',
        table: 'hris.employee_document'
      });

      return result.rows[0];
    } catch (_error) {
      this.logger.error('Error getting organization document stats', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }
}

export default DocumentService;
