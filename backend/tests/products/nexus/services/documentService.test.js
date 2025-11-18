/**
 * DocumentService Unit Tests
 * Tests business logic for document management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies BEFORE importing service
const mockQuery = jest.fn();
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  query: mockQuery
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import service AFTER mocks
const { default: DocumentService } = await import('../../../../src/products/nexus/services/documentService.js');

describe('DocumentService', () => {
  let service;
  const mockOrgId = 'org-123';
  const mockUserId = 'user-456';
  const mockEmployeeId = 'emp-789';
  const mockDocId = 'doc-101';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentService();
  });

  describe('createDocument', () => {
    const validDocData = {
      employee_id: mockEmployeeId,
      document_name: 'Passport',
      document_type: 'identification',
      file_path: '/docs/passport.pdf',
      file_size: 1024000
    };

    it('should create document successfully', async () => {
      const mockCreated = { id: mockDocId, ...validDocData };
      
      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockEmployeeId }] }) // Employee exists
        .mockResolvedValueOnce({ rows: [mockCreated] }); // Insert

      const result = await service.createDocument(validDocData, mockOrgId, mockUserId);

      expect(result).toEqual(mockCreated);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw error if document name is missing', async () => {
      await expect(
        service.createDocument({ employee_id: mockEmployeeId }, mockOrgId, mockUserId)
      ).rejects.toThrow('Document name is required');
    });

    it('should throw error if employee_id is missing', async () => {
      await expect(
        service.createDocument({ document_name: 'Test' }, mockOrgId, mockUserId)
      ).rejects.toThrow('Employee ID is required');
    });

    it('should throw error if document_type is missing', async () => {
      await expect(
        service.createDocument({ 
          document_name: 'Test',
          employee_id: mockEmployeeId 
        }, mockOrgId, mockUserId)
      ).rejects.toThrow('Document type is required');
    });

    it('should throw error if employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.createDocument(validDocData, mockOrgId, mockUserId)
      ).rejects.toThrow('Employee not found');
    });

    it('should default is_confidential to false', async () => {
      const mockCreated = { id: mockDocId, ...validDocData, is_confidential: false };
      
      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockEmployeeId }] })
        .mockResolvedValueOnce({ rows: [mockCreated] });

      await service.createDocument(validDocData, mockOrgId, mockUserId);

      const createCall = mockQuery.mock.calls[1];
      expect(createCall[1]).toContain(false); // is_confidential
    });

    it('should handle JSON fields (tags, metadata)', async () => {
      const docWithMeta = {
        ...validDocData,
        tags: ['urgent', 'verified'],
        metadata: { source: 'upload', version: '1.0' }
      };
      
      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockEmployeeId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockDocId, ...docWithMeta }] });

      await service.createDocument(docWithMeta, mockOrgId, mockUserId);

      const createCall = mockQuery.mock.calls[1];
      const tagsParam = createCall[1][17];
      const metadataParam = createCall[1][18];
      
      expect(tagsParam).toBe(JSON.stringify(docWithMeta.tags));
      expect(metadataParam).toBe(JSON.stringify(docWithMeta.metadata));
    });
  });

  describe('getDocument', () => {
    it('should get document with employee name', async () => {
      const mockDoc = {
        id: mockDocId,
        document_name: 'Passport',
        employee_name: 'John Doe'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockDoc] });

      const result = await service.getDocument(mockDocId, mockOrgId);

      expect(result).toEqual(mockDoc);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('employee_name'),
        [mockDocId, mockOrgId],
        mockOrgId,
        expect.any(Object)
      );
    });

    it('should throw error if document not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.getDocument('non-existent', mockOrgId)
      ).rejects.toThrow('Document not found');
    });

    it('should include verified_by_name', async () => {
      const mockDoc = {
        id: mockDocId,
        document_name: 'Passport',
        verified_by_name: 'Jane Admin'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockDoc] });

      const result = await service.getDocument(mockDocId, mockOrgId);

      expect(result.verified_by_name).toBe('Jane Admin');
    });
  });

  describe('updateDocument', () => {
    const existingDoc = {
      id: mockDocId,
      document_name: 'Passport',
      is_verified: false
    };

    it('should update document successfully', async () => {
      const updateData = { is_verified: true, verified_by: 'verifier-123' };
      const mockUpdated = { ...existingDoc, ...updateData };

      mockQuery.mockResolvedValueOnce({ rows: [existingDoc] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      const result = await service.updateDocument(mockDocId, updateData, mockOrgId, mockUserId);

      expect(result).toEqual(mockUpdated);
    });

    it('should throw error if document not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.updateDocument('non-existent', {}, mockOrgId, mockUserId)
      ).rejects.toThrow('Document not found');
    });

    it('should return existing document if no updates', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [existingDoc] });

      const result = await service.updateDocument(mockDocId, {}, mockOrgId, mockUserId);

      expect(result).toEqual(existingDoc);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should handle JSON field updates', async () => {
      const updateData = {
        tags: ['updated', 'reviewed'],
        metadata: { status: 'processed' }
      };

      mockQuery.mockResolvedValueOnce({ rows: [existingDoc] })
        .mockResolvedValueOnce({ rows: [{ ...existingDoc, ...updateData }] });

      await service.updateDocument(mockDocId, updateData, mockOrgId, mockUserId);

      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain('tags = $');
      expect(updateCall[0]).toContain('metadata = $');
    });
  });

  describe('deleteDocument', () => {
    it('should soft delete document successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockDocId }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.deleteDocument(mockDocId, mockOrgId, mockUserId);

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw error if document not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.deleteDocument('non-existent', mockOrgId, mockUserId)
      ).rejects.toThrow('Document not found');
    });
  });

  describe('getEmployeeDocuments', () => {
    const mockDocs = [
      { id: 'doc-1', document_name: 'Passport', employee_name: 'John Doe' },
      { id: 'doc-2', document_name: 'License', employee_name: 'John Doe' }
    ];

    it('should get all documents for employee', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockDocs })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await service.getEmployeeDocuments(mockEmployeeId, mockOrgId);

      expect(result.documents).toEqual(mockDocs);
      expect(result.total).toBe(2);
    });

    it('should filter by document type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDocs[0]] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      await service.getEmployeeDocuments(mockEmployeeId, mockOrgId, { type: 'identification' });

      expect(mockQuery.mock.calls[0][0]).toContain('d.document_type = $');
    });

    it('should filter by is_confidential', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockDocs })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      await service.getEmployeeDocuments(mockEmployeeId, mockOrgId, { isConfidential: true });

      expect(mockQuery.mock.calls[0][0]).toContain('d.is_confidential = $');
    });

    it('should apply pagination', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockDocs })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      await service.getEmployeeDocuments(mockEmployeeId, mockOrgId, { limit: 10, offset: 5 });

      expect(mockQuery.mock.calls[0][1]).toContain(10);
      expect(mockQuery.mock.calls[0][1]).toContain(5);
    });
  });

  describe('getDocumentsByType', () => {
    it('should get all documents of specific type', async () => {
      const mockDocs = [
        { id: 'doc-1', document_type: 'identification', employee_name: 'John' },
        { id: 'doc-2', document_type: 'identification', employee_name: 'Jane' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockDocs })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await service.getDocumentsByType('identification', mockOrgId);

      expect(result.documents).toEqual(mockDocs);
      expect(result.total).toBe(2);
    });
  });

  describe('getExpiringDocuments', () => {
    it('should get documents expiring within specified days', async () => {
      const mockDocs = [
        { id: 'doc-1', document_name: 'Passport', days_until_expiry: 15 },
        { id: 'doc-2', document_name: 'Work Permit', days_until_expiry: 25 }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockDocs });

      const result = await service.getExpiringDocuments(30, mockOrgId);

      expect(result).toEqual(mockDocs);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INTERVAL \'30 days\''),
        [mockOrgId],
        mockOrgId,
        expect.any(Object)
      );
    });

    it('should exclude already expired documents', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.getExpiringDocuments(30, mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('expiry_date > CURRENT_DATE');
    });
  });

  describe('getExpiredDocuments', () => {
    it('should get all expired documents', async () => {
      const mockDocs = [
        { id: 'doc-1', document_name: 'Old Passport', days_expired: 45 }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockDocs });

      const result = await service.getExpiredDocuments(mockOrgId);

      expect(result).toEqual(mockDocs);
      expect(mockQuery.mock.calls[0][0]).toContain('expiry_date < CURRENT_DATE');
    });
  });

  describe('searchDocuments', () => {
    it('should search documents by name', async () => {
      const mockDocs = [
        { id: 'doc-1', document_name: 'Passport Copy' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockDocs })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await service.searchDocuments('Passport', mockOrgId);

      expect(result.documents).toEqual(mockDocs);
      expect(mockQuery.mock.calls[0][1][1]).toBe('%Passport%');
    });

    it('should search across multiple fields', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.searchDocuments('test', mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('document_name ILIKE');
      expect(mockQuery.mock.calls[0][0]).toContain('description ILIKE');
      expect(mockQuery.mock.calls[0][0]).toContain('document_number ILIKE');
    });

    it('should filter by type while searching', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.searchDocuments('test', mockOrgId, { type: 'identification' });

      expect(mockQuery.mock.calls[0][0]).toContain('d.document_type = $');
    });
  });

  describe('getEmployeeDocumentStats', () => {
    it('should return comprehensive statistics', async () => {
      const mockStats = {
        total_documents: '10',
        verified_documents: '8',
        confidential_documents: '3',
        expired_documents: '1',
        expiring_soon: '2',
        document_types: '5',
        total_size: '5242880'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockStats] });

      const result = await service.getEmployeeDocumentStats(mockEmployeeId, mockOrgId);

      expect(result).toEqual(mockStats);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as total_documents'),
        [mockEmployeeId, mockOrgId],
        mockOrgId,
        expect.any(Object)
      );
    });

    it('should use FILTER for conditional counts', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{}] });

      await service.getEmployeeDocumentStats(mockEmployeeId, mockOrgId);

      expect(mockQuery.mock.calls[0][0]).toContain('FILTER');
      expect(mockQuery.mock.calls[0][0]).toContain('is_verified = true');
      expect(mockQuery.mock.calls[0][0]).toContain('is_confidential = true');
    });
  });

  describe('getOrganizationDocumentStats', () => {
    it('should return organization-wide statistics', async () => {
      const mockStats = {
        total_documents: '150',
        verified_documents: '120',
        confidential_documents: '30',
        expired_documents: '5',
        expiring_soon: '10',
        document_types: '8',
        employees_with_documents: '45',
        total_size: '52428800'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockStats] });

      const result = await service.getOrganizationDocumentStats(mockOrgId);

      expect(result).toEqual(mockStats);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('employees_with_documents'),
        [mockOrgId],
        mockOrgId,
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors in createDocument', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.createDocument({ 
          document_name: 'Test',
          employee_id: mockEmployeeId,
          document_type: 'test'
        }, mockOrgId, mockUserId)
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors in getExpiringDocuments', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.getExpiringDocuments(30, mockOrgId)
      ).rejects.toThrow('Database error');
    });
  });
});



