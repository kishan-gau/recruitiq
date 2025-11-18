/**
 * Tests for DocumentController
 * Tests all HTTP request handlers for document management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the service before importing controller
class MockDocumentService {
  createDocument = jest.fn();
  getDocument = jest.fn();
  updateDocument = jest.fn();
  deleteDocument = jest.fn();
  getEmployeeDocuments = jest.fn();
  getDocumentsByType = jest.fn();
  getExpiringDocuments = jest.fn();
  getExpiredDocuments = jest.fn();
  searchDocuments = jest.fn();
  getEmployeeDocumentStats = jest.fn();
  getOrganizationDocumentStats = jest.fn();
}

jest.unstable_mockModule('../../../../src/products/nexus/services/documentService.js', () => ({
  default: MockDocumentService
}));

// Import controller after mocking
const { default: DocumentController } = await import('../../../../src/products/nexus/controllers/documentController.js');

describe('DocumentController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    controller = new DocumentController();
    
    mockReq = {
      user: {
        organizationId: 'org-123',
        userId: 'user-123'
      },
      params: {},
      query: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Clear all mock calls
    jest.clearAllMocks();
  });

  describe('createDocument', () => {
    it('should create a document successfully', async () => {
      const documentData = {
        employeeId: 'emp-123',
        name: 'Employment Contract',
        type: 'contract',
        fileUrl: 'https://storage.com/doc.pdf'
      };

      const createdDocument = {
        id: 'doc-123',
        ...documentData,
        organizationId: 'org-123'
      };

      mockReq.body = documentData;
      controller.service.createDocument.mockResolvedValue(createdDocument);

      await controller.createDocument(mockReq, mockRes);

      expect(controller.service.createDocument).toHaveBeenCalledWith(
        documentData,
        'org-123',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: createdDocument
      });
    });

    it('should handle errors during document creation', async () => {
      mockReq.body = { name: 'Test Doc' };
      controller.service.createDocument.mockRejectedValue(new Error('Validation failed'));

      await controller.createDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed'
      });
    });
  });

  describe('getDocument', () => {
    it('should get a document by ID successfully', async () => {
      const document = {
        id: 'doc-123',
        name: 'Contract',
        type: 'contract',
        organizationId: 'org-123'
      };

      mockReq.params = { id: 'doc-123' };
      controller.service.getDocument.mockResolvedValue(document);

      await controller.getDocument(mockReq, mockRes);

      expect(controller.service.getDocument).toHaveBeenCalledWith('doc-123', 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: document
      });
    });

    it('should return 404 when document not found', async () => {
      mockReq.params = { id: 'doc-999' };
      controller.service.getDocument.mockRejectedValue(new Error('Document not found'));

      await controller.getDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Document not found'
      });
    });

    it('should return 500 for other errors', async () => {
      mockReq.params = { id: 'doc-123' };
      controller.service.getDocument.mockRejectedValue(new Error('Database error'));

      await controller.getDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('updateDocument', () => {
    it('should update a document successfully', async () => {
      const updateData = { name: 'Updated Contract' };
      const updatedDocument = {
        id: 'doc-123',
        name: 'Updated Contract',
        type: 'contract'
      };

      mockReq.params = { id: 'doc-123' };
      mockReq.body = updateData;
      controller.service.updateDocument.mockResolvedValue(updatedDocument);

      await controller.updateDocument(mockReq, mockRes);

      expect(controller.service.updateDocument).toHaveBeenCalledWith(
        'doc-123',
        updateData,
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedDocument
      });
    });

    it('should return 404 when document not found', async () => {
      mockReq.params = { id: 'doc-999' };
      mockReq.body = { name: 'Updated' };
      controller.service.updateDocument.mockRejectedValue(new Error('Document not found'));

      await controller.updateDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Document not found'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.body = { name: '' };
      controller.service.updateDocument.mockRejectedValue(new Error('Name is required'));

      await controller.updateDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Name is required'
      });
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document successfully', async () => {
      mockReq.params = { id: 'doc-123' };
      controller.service.deleteDocument.mockResolvedValue();

      await controller.deleteDocument(mockReq, mockRes);

      expect(controller.service.deleteDocument).toHaveBeenCalledWith(
        'doc-123',
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Document deleted successfully'
      });
    });

    it('should return 404 when document not found', async () => {
      mockReq.params = { id: 'doc-999' };
      controller.service.deleteDocument.mockRejectedValue(new Error('Document not found'));

      await controller.deleteDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Document not found'
      });
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { id: 'doc-123' };
      controller.service.deleteDocument.mockRejectedValue(new Error('Cannot delete'));

      await controller.deleteDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot delete'
      });
    });
  });

  describe('getEmployeeDocuments', () => {
    it('should get employee documents with filters', async () => {
      const documents = [
        { id: 'doc-1', name: 'Contract', type: 'contract' },
        { id: 'doc-2', name: 'ID', type: 'identification' }
      ];

      mockReq.params = { employeeId: 'emp-123' };
      mockReq.query = { type: 'contract', isConfidential: 'true', limit: '20', offset: '0' };
      controller.service.getEmployeeDocuments.mockResolvedValue(documents);

      await controller.getEmployeeDocuments(mockReq, mockRes);

      expect(controller.service.getEmployeeDocuments).toHaveBeenCalledWith(
        'emp-123',
        'org-123',
        {
          type: 'contract',
          isConfidential: true,
          limit: 20,
          offset: 0
        }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: documents
      });
    });

    it('should use default pagination when not provided', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      mockReq.query = {};
      controller.service.getEmployeeDocuments.mockResolvedValue([]);

      await controller.getEmployeeDocuments(mockReq, mockRes);

      expect(controller.service.getEmployeeDocuments).toHaveBeenCalledWith(
        'emp-123',
        'org-123',
        {
          limit: 50,
          offset: 0
        }
      );
    });

    it('should handle errors when getting employee documents', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      controller.service.getEmployeeDocuments.mockRejectedValue(new Error('Database error'));

      await controller.getEmployeeDocuments(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getDocumentsByType', () => {
    it('should get documents by type', async () => {
      const documents = [
        { id: 'doc-1', name: 'Contract 1', type: 'contract' },
        { id: 'doc-2', name: 'Contract 2', type: 'contract' }
      ];

      mockReq.params = { type: 'contract' };
      mockReq.query = { limit: '25', offset: '10' };
      controller.service.getDocumentsByType.mockResolvedValue(documents);

      await controller.getDocumentsByType(mockReq, mockRes);

      expect(controller.service.getDocumentsByType).toHaveBeenCalledWith(
        'contract',
        'org-123',
        { limit: 25, offset: 10 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: documents
      });
    });

    it('should use default pagination', async () => {
      mockReq.params = { type: 'identification' };
      mockReq.query = {};
      controller.service.getDocumentsByType.mockResolvedValue([]);

      await controller.getDocumentsByType(mockReq, mockRes);

      expect(controller.service.getDocumentsByType).toHaveBeenCalledWith(
        'identification',
        'org-123',
        { limit: 50, offset: 0 }
      );
    });

    it('should handle errors', async () => {
      mockReq.params = { type: 'contract' };
      controller.service.getDocumentsByType.mockRejectedValue(new Error('Database error'));

      await controller.getDocumentsByType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getExpiringDocuments', () => {
    it('should get expiring documents with custom days', async () => {
      const documents = [
        { id: 'doc-1', name: 'Expiring Soon', expiryDate: '2025-12-01' }
      ];

      mockReq.params = { days: '60' };
      controller.service.getExpiringDocuments.mockResolvedValue(documents);

      await controller.getExpiringDocuments(mockReq, mockRes);

      expect(controller.service.getExpiringDocuments).toHaveBeenCalledWith(60, 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: documents
      });
    });

    it('should use default days when not provided', async () => {
      mockReq.params = {};
      controller.service.getExpiringDocuments.mockResolvedValue([]);

      await controller.getExpiringDocuments(mockReq, mockRes);

      expect(controller.service.getExpiringDocuments).toHaveBeenCalledWith(30, 'org-123');
    });

    it('should handle errors', async () => {
      mockReq.params = { days: '30' };
      controller.service.getExpiringDocuments.mockRejectedValue(new Error('Database error'));

      await controller.getExpiringDocuments(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getExpiredDocuments', () => {
    it('should get expired documents', async () => {
      const documents = [
        { id: 'doc-1', name: 'Expired', expiryDate: '2024-01-01' }
      ];

      controller.service.getExpiredDocuments.mockResolvedValue(documents);

      await controller.getExpiredDocuments(mockReq, mockRes);

      expect(controller.service.getExpiredDocuments).toHaveBeenCalledWith('org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: documents
      });
    });

    it('should handle errors', async () => {
      controller.service.getExpiredDocuments.mockRejectedValue(new Error('Database error'));

      await controller.getExpiredDocuments(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('searchDocuments', () => {
    it('should search documents with search term', async () => {
      const documents = [
        { id: 'doc-1', name: 'Contract Agreement' },
        { id: 'doc-2', name: 'Employment Contract' }
      ];

      mockReq.query = { q: 'contract', limit: '20', offset: '0' };
      controller.service.searchDocuments.mockResolvedValue(documents);

      await controller.searchDocuments(mockReq, mockRes);

      expect(controller.service.searchDocuments).toHaveBeenCalledWith(
        'contract',
        'org-123',
        { limit: 20, offset: 0 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: documents
      });
    });

    it('should search with type filter', async () => {
      mockReq.query = { q: 'contract', type: 'contract' };
      controller.service.searchDocuments.mockResolvedValue([]);

      await controller.searchDocuments(mockReq, mockRes);

      expect(controller.service.searchDocuments).toHaveBeenCalledWith(
        'contract',
        'org-123',
        { type: 'contract', limit: 50, offset: 0 }
      );
    });

    it('should return 400 when search term is missing', async () => {
      mockReq.query = {};

      await controller.searchDocuments(mockReq, mockRes);

      expect(controller.service.searchDocuments).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Search term (q) is required'
      });
    });

    it('should handle errors during search', async () => {
      mockReq.query = { q: 'test' };
      controller.service.searchDocuments.mockRejectedValue(new Error('Search failed'));

      await controller.searchDocuments(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Search failed'
      });
    });
  });

  describe('getEmployeeDocumentStats', () => {
    it('should get employee document statistics', async () => {
      const stats = {
        total: 15,
        byType: {
          contract: 5,
          identification: 3,
          certification: 7
        },
        expiringSoon: 2,
        expired: 1
      };

      mockReq.params = { employeeId: 'emp-123' };
      controller.service.getEmployeeDocumentStats.mockResolvedValue(stats);

      await controller.getEmployeeDocumentStats(mockReq, mockRes);

      expect(controller.service.getEmployeeDocumentStats).toHaveBeenCalledWith(
        'emp-123',
        'org-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: stats
      });
    });

    it('should handle errors', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      controller.service.getEmployeeDocumentStats.mockRejectedValue(new Error('Database error'));

      await controller.getEmployeeDocumentStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getOrganizationDocumentStats', () => {
    it('should get organization document statistics', async () => {
      const stats = {
        total: 250,
        byType: {
          contract: 80,
          identification: 50,
          certification: 70,
          other: 50
        },
        expiringSoon: 15,
        expired: 8
      };

      controller.service.getOrganizationDocumentStats.mockResolvedValue(stats);

      await controller.getOrganizationDocumentStats(mockReq, mockRes);

      expect(controller.service.getOrganizationDocumentStats).toHaveBeenCalledWith('org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: stats
      });
    });

    it('should handle errors', async () => {
      controller.service.getOrganizationDocumentStats.mockRejectedValue(new Error('Database error'));

      await controller.getOrganizationDocumentStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });
});
