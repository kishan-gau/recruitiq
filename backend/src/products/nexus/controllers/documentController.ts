/**
 * DocumentController
 * HTTP request handlers for document management
 */

import DocumentService from '../services/documentService.js';
import logger from '../../../utils/logger.js';

class DocumentController {
  constructor() {
    this.service = new DocumentService();
    this.logger = logger;
  }

  /**
   * Create document
   * POST /api/nexus/documents
   */
  createDocument = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const document = await this.service.createDocument(req.body, organizationId, userId);
      res.status(201).json({ success: true, data: document });
    } catch (_error) {
      this.logger.error('Error in createDocument controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Get document by ID
   * GET /api/nexus/documents/:id
   */
  getDocument = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { id } = req.params;
      const document = await this.service.getDocument(id, organizationId);
      res.json({ success: true, data: document });
    } catch (_error) {
      this.logger.error('Error in getDocument controller', { error: error.message });
      const status = error.message === 'Document not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Update document
   * PATCH /api/nexus/documents/:id
   */
  updateDocument = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { id } = req.params;
      const document = await this.service.updateDocument(id, req.body, organizationId, userId);
      res.json({ success: true, data: document });
    } catch (_error) {
      this.logger.error('Error in updateDocument controller', { error: error.message });
      const status = error.message === 'Document not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Delete document
   * DELETE /api/nexus/documents/:id
   */
  deleteDocument = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { id } = req.params;
      await this.service.deleteDocument(id, organizationId, userId);
      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (_error) {
      this.logger.error('Error in deleteDocument controller', { error: error.message });
      const status = error.message === 'Document not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Get employee documents
   * GET /api/nexus/documents/employee/:employeeId
   */
  getEmployeeDocuments = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { employeeId } = req.params;
      const { type, isConfidential, limit = 50, offset = 0 } = req.query;

      const filters = {};
      if (type) filters.type = type;
      if (isConfidential !== undefined) filters.isConfidential = isConfidential === 'true';

      const documents = await this.service.getEmployeeDocuments(
        employeeId,
        organizationId,
        { ...filters, limit: parseInt(limit), offset: parseInt(offset) }
      );
      res.json({ success: true, data: documents });
    } catch (_error) {
      this.logger.error('Error in getEmployeeDocuments controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get documents by type
   * GET /api/nexus/documents/type/:type
   */
  getDocumentsByType = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { type } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const documents = await this.service.getDocumentsByType(
        type,
        organizationId,
        { limit: parseInt(limit), offset: parseInt(offset) }
      );
      res.json({ success: true, data: documents });
    } catch (_error) {
      this.logger.error('Error in getDocumentsByType controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get expiring documents
   * GET /api/nexus/documents/expiring/:days
   */
  getExpiringDocuments = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { days = 30 } = req.params;
      const documents = await this.service.getExpiringDocuments(parseInt(days), organizationId);
      res.json({ success: true, data: documents });
    } catch (_error) {
      this.logger.error('Error in getExpiringDocuments controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get expired documents
   * GET /api/nexus/documents/expired
   */
  getExpiredDocuments = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const documents = await this.service.getExpiredDocuments(organizationId);
      res.json({ success: true, data: documents });
    } catch (_error) {
      this.logger.error('Error in getExpiredDocuments controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Search documents
   * GET /api/nexus/documents/search
   */
  searchDocuments = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { q: searchTerm, type, limit = 50, offset = 0 } = req.query;

      if (!searchTerm) {
        return res.status(400).json({ 
          success: false, 
          error: 'Search term (q) is required' 
        });
      }

      const filters = {};
      if (type) filters.type = type;

      const documents = await this.service.searchDocuments(
        searchTerm,
        organizationId,
        { ...filters, limit: parseInt(limit), offset: parseInt(offset) }
      );
      res.json({ success: true, data: documents });
    } catch (_error) {
      this.logger.error('Error in searchDocuments controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Get employee document statistics
   * GET /api/nexus/documents/employee/:employeeId/stats
   */
  getEmployeeDocumentStats = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { employeeId } = req.params;
      const stats = await this.service.getEmployeeDocumentStats(employeeId, organizationId);
      res.json({ success: true, data: stats });
    } catch (_error) {
      this.logger.error('Error in getEmployeeDocumentStats controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get organization document statistics
   * GET /api/nexus/documents/stats/organization
   */
  getOrganizationDocumentStats = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const stats = await this.service.getOrganizationDocumentStats(organizationId);
      res.json({ success: true, data: stats });
    } catch (_error) {
      this.logger.error('Error in getOrganizationDocumentStats controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

export default DocumentController;
