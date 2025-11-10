import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { documentsService } from '../../src/services/documents.service';
import type { Document, DocumentFolder, DocumentSignature, DocumentTemplate } from '../../src/types/documents.types';

const mockDocument: Document = {
  id: 'doc-123',
  organizationId: 'org-123',
  name: 'Employee Handbook',
  description: 'Company policies and procedures',
  category: 'handbook',
  status: 'active',
  fileName: 'handbook.pdf',
  fileSize: 1024000,
  fileType: 'pdf',
  mimeType: 'application/pdf',
  fileUrl: 'https://storage.example.com/handbook.pdf',
  version: 1,
  isLatestVersion: true,
  accessLevel: 'internal',
  isPublic: false,
  allowDownload: true,
  allowPrint: true,
  tags: ['policy', 'handbook', '2024'],
  expiryDate: '2025-12-31',
  requiresSignature: false,
  uploadedBy: 'user-123',
  uploadedAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  accessCount: 42,
};

const mockFolder: DocumentFolder = {
  id: 'folder-123',
  organizationId: 'org-123',
  name: 'HR Policies',
  description: 'Human resources policies and procedures',
  parentFolderId: undefined,
  path: '/HR Policies',
  accessLevel: 'internal',
  isPublic: false,
  documentCount: 5,
  subfolderCount: 2,
  createdBy: 'user-123',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const mockSignature: DocumentSignature = {
  id: 'sig-123',
  organizationId: 'org-123',
  documentId: 'doc-123',
  signerId: 'user-456',
  signerName: 'John Doe',
  signerEmail: 'john.doe@example.com',
  signatureType: 'electronic',
  status: 'pending',
  requestedAt: '2024-01-15T10:00:00Z',
  expiryDate: '2024-02-15',
  requestedBy: 'user-123',
  createdAt: '2024-01-15T10:00:00Z',
};

const mockTemplate: DocumentTemplate = {
  id: 'template-123',
  organizationId: 'org-123',
  name: 'Employment Contract Template',
  description: 'Standard employment contract',
  category: 'contract',
  templateData: '<html>{{employeeName}} - {{startDate}}</html>',
  placeholders: ['employeeName', 'startDate', 'salary'],
  isActive: true,
  isDefault: false,
  createdBy: 'user-123',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const server = setupServer(
  // Statistics endpoints - must come before /documents/:id
  http.get('/api/nexus/documents/statistics', () => {
    return HttpResponse.json({
      totalDocuments: 150,
      activeDocuments: 130,
      archivedDocuments: 20,
      totalSize: 52428800,
      byCategory: [
        { category: 'contract', count: 25, size: 10485760 },
        { category: 'policy', count: 30, size: 15728640 },
      ],
      recentUploads: 12,
      pendingSignatures: 5,
    });
  }),

  // Folders endpoints - must come before /documents/:id
  http.get('/api/nexus/documents/folders/:id/documents', () => {
    return HttpResponse.json([mockDocument]);
  }),
  http.get('/api/nexus/documents/folders/:id', () => {
    return HttpResponse.json(mockFolder);
  }),
  http.get('/api/nexus/documents/folders', () => {
    return HttpResponse.json([mockFolder]);
  }),
  http.post('/api/nexus/documents/folders', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockFolder, ...(body as any) });
  }),
  http.put('/api/nexus/documents/folders/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockFolder, ...(body as any) });
  }),
  http.delete('/api/nexus/documents/folders/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Signatures endpoints - must come before /documents/:id
  http.get('/api/nexus/documents/signatures', () => {
    return HttpResponse.json([mockSignature]);
  }),
  http.post('/api/nexus/documents/signatures/request', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockSignature, ...(body as any) });
  }),
  http.post('/api/nexus/documents/signatures/:id/sign', () => {
    return HttpResponse.json({ ...mockSignature, status: 'signed' as const });
  }),
  http.post('/api/nexus/documents/signatures/:id/decline', () => {
    return HttpResponse.json({ ...mockSignature, status: 'declined' as const });
  }),

  // Templates endpoints - must come before /documents/:id
  http.get('/api/nexus/documents/templates/:id/generate', () => {
    return HttpResponse.json(mockDocument);
  }),
  http.get('/api/nexus/documents/templates/:id', () => {
    return HttpResponse.json(mockTemplate);
  }),
  http.get('/api/nexus/documents/templates', () => {
    return HttpResponse.json([mockTemplate]);
  }),
  http.post('/api/nexus/documents/templates', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockTemplate, ...(body as any) });
  }),
  http.put('/api/nexus/documents/templates/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockTemplate, ...(body as any) });
  }),
  http.delete('/api/nexus/documents/templates/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.post('/api/nexus/documents/templates/:id/generate', () => {
    return HttpResponse.json(mockDocument);
  }),

  // Document-specific endpoints - must come before general /documents
  http.get('/api/nexus/documents/:id/download', () => {
    return new HttpResponse(new Blob(['file content']), {
      headers: { 'Content-Type': 'application/pdf' },
    });
  }),
  http.get('/api/nexus/documents/:id/activity', () => {
    return HttpResponse.json({
      documentId: 'doc-123',
      documentName: 'Employee Handbook',
      category: 'handbook',
      totalAccesses: 42,
      uniqueUsers: 15,
      lastAccessedAt: '2024-11-07T10:00:00Z',
      downloads: 20,
      views: 22,
      prints: 5,
    });
  }),
  http.post('/api/nexus/documents/:id/archive', () => {
    return HttpResponse.json({ ...mockDocument, status: 'archived' });
  }),
  http.post('/api/nexus/documents/:id/restore', () => {
    return HttpResponse.json({ ...mockDocument, status: 'active' });
  }),

  // Upload endpoint - must come before general /documents
  http.post('/api/nexus/documents/upload', () => {
    return HttpResponse.json(mockDocument);
  }),

  // Documents endpoints - general routes come last
  http.get('/api/nexus/documents/:id', ({ params }) => {
    return HttpResponse.json(mockDocument);
  }),
  http.get('/api/nexus/documents', () => {
    return HttpResponse.json([mockDocument]);
  }),
  http.post('/api/nexus/documents', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockDocument, ...(body as any) });
  }),
  http.put('/api/nexus/documents/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockDocument, ...(body as any) });
  }),
  http.delete('/api/nexus/documents/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Documents Service', () => {
  describe('Document Operations', () => {
    it('should list documents', async () => {
      const result = await documentsService.listDocuments();
      expect(result).toEqual([mockDocument]);
      expect(result[0].name).toBe('Employee Handbook');
    });

    it('should list documents with filters', async () => {
      const result = await documentsService.listDocuments({
        category: 'handbook',
        status: 'active',
      });
      expect(result).toEqual([mockDocument]);
    });

    it('should get a document by id', async () => {
      const result = await documentsService.getDocument('doc-123');
      expect(result).toEqual(mockDocument);
      expect(result.id).toBe('doc-123');
    });

    it('should create a document', async () => {
      const newDoc = {
        name: 'New Policy',
        category: 'policy' as const,
        fileName: 'policy.pdf',
        fileSize: 1024,
        fileType: 'pdf' as const,
        mimeType: 'application/pdf',
        fileUrl: 'https://storage.example.com/policy.pdf',
        accessLevel: 'internal' as const,
      };
      const result = await documentsService.createDocument(newDoc);
      expect(result.name).toBeDefined();
    });

    it('should update a document', async () => {
      const updates = { name: 'Updated Handbook' };
      const result = await documentsService.updateDocument('doc-123', updates);
      expect(result).toBeDefined();
    });

    it('should delete a document', async () => {
      await expect(documentsService.deleteDocument('doc-123')).resolves.not.toThrow();
    });

    it('should archive a document', async () => {
      const result = await documentsService.archiveDocument('doc-123');
      expect(result.status).toBe('archived');
    });

    it('should restore a document', async () => {
      const result = await documentsService.restoreDocument('doc-123');
      expect(result.status).toBe('active');
    });

    it('should upload a file', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const metadata = {
        name: 'Test Document',
        category: 'other' as const,
        accessLevel: 'internal' as const,
      };
      const result = await documentsService.uploadFile(file, metadata);
      expect(result).toBeDefined();
    });
  });

  describe('Folder Operations', () => {
    it('should list folders', async () => {
      const result = await documentsService.listFolders();
      expect(result).toEqual([mockFolder]);
      expect(result[0].name).toBe('HR Policies');
    });

    it('should get a folder by id', async () => {
      const result = await documentsService.getFolder('folder-123');
      expect(result).toEqual(mockFolder);
    });

    it('should create a folder', async () => {
      const newFolder = {
        name: 'Training Materials',
        description: 'Employee training documents',
      };
      const result = await documentsService.createFolder(newFolder);
      expect(result).toBeDefined();
    });

    it('should update a folder', async () => {
      const updates = { name: 'Updated HR Policies' };
      const result = await documentsService.updateFolder('folder-123', updates);
      expect(result).toBeDefined();
    });

    it('should delete a folder', async () => {
      await expect(documentsService.deleteFolder('folder-123')).resolves.not.toThrow();
    });

    it('should get folder documents', async () => {
      const result = await documentsService.getFolderDocuments('folder-123');
      expect(result).toEqual([mockDocument]);
    });
  });

  describe('Signature Operations', () => {
    it('should list signature requests', async () => {
      const result = await documentsService.listSignatureRequests();
      expect(result).toEqual([mockSignature]);
    });

    it('should request a signature', async () => {
      const request = {
        documentId: 'doc-123',
        signerId: 'user-456',
        expiryDate: '2024-02-15',
      };
      const result = await documentsService.requestSignature(request);
      expect(result).toBeDefined();
    });

    it('should submit a signature', async () => {
      const signatureData = {
        signatureData: 'base64-signature-data',
        signatureType: 'electronic' as const,
      };
      const result = await documentsService.submitSignature('sig-123', signatureData);
      expect(result.status).toBe('signed');
    });

    it('should decline a signature', async () => {
      const result = await documentsService.declineSignature('sig-123', 'Not authorized');
      expect(result.status).toBe('declined');
    });
  });

  describe('Template Operations', () => {
    it('should list templates', async () => {
      const result = await documentsService.listTemplates();
      expect(result).toEqual([mockTemplate]);
    });

    it('should get a template by id', async () => {
      const result = await documentsService.getTemplate('template-123');
      expect(result).toEqual(mockTemplate);
    });

    it('should create a template', async () => {
      const newTemplate = {
        name: 'Offer Letter Template',
        category: 'contract' as const,
        templateData: '<html>{{candidateName}}</html>',
        placeholders: ['candidateName', 'position', 'salary'],
      };
      const result = await documentsService.createTemplate(newTemplate);
      expect(result).toBeDefined();
    });

    it('should update a template', async () => {
      const updates = { name: 'Updated Contract Template' };
      const result = await documentsService.updateTemplate('template-123', updates);
      expect(result).toBeDefined();
    });

    it('should delete a template', async () => {
      await expect(documentsService.deleteTemplate('template-123')).resolves.not.toThrow();
    });

    it('should generate document from template', async () => {
      const data = {
        employeeName: 'John Doe',
        startDate: '2024-01-15',
        salary: '75000',
      };
      const result = await documentsService.generateFromTemplate('template-123', data);
      expect(result).toBeDefined();
    });
  });

  describe('Statistics Operations', () => {
    it('should get document statistics', async () => {
      const result = await documentsService.getStatistics();
      expect(result.totalDocuments).toBe(150);
      expect(result.activeDocuments).toBe(130);
      expect(result.archivedDocuments).toBe(20);
    });

    it('should get document activity', async () => {
      const result = await documentsService.getDocumentActivity('doc-123');
      expect(result.totalAccesses).toBe(42);
      expect(result.uniqueUsers).toBe(15);
      expect(result.downloads).toBe(20);
    });
  });
});
