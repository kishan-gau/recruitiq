/**
 * Documents Service
 * API service for document management and file operations
 * NOW USES: @recruitiq/api-client for type-safe API calls
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';
import type {
  Document,
  CreateDocumentDTO,
  UpdateDocumentDTO,
  DocumentFilters,
  DocumentFolder,
  CreateFolderDTO,
  UpdateFolderDTO,
  DocumentAccessLog,
  DocumentSignature,
  RequestSignatureDTO,
  SubmitSignatureDTO,
  DocumentTemplate,
  CreateTemplateDTO,
  UpdateTemplateDTO,
  DocumentStatistics,
  DocumentActivityReport,
  UserDocumentActivity,
} from '@/types/documents.types';

// Create singleton instance
const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const documentsService = {
  // ============ Documents ============
  
  async listDocuments(filters?: DocumentFilters): Promise<Document[]> {
    const response = await nexusClient.listDocuments(filters);
    // Backend returns { success: true, data: { documents: [...], total, limit, offset } }
    return response.data.documents as Document[];
  },

  async getDocument(id: string): Promise<Document> {
    const response = await nexusClient.getDocument(id);
    return response.data as Document;
  },

  async createDocument(data: CreateDocumentDTO): Promise<Document> {
    const response = await nexusClient.createDocument(data);
    return response.data as Document;
  },

  async updateDocument(id: string, updates: UpdateDocumentDTO): Promise<Document> {
    const response = await nexusClient.updateDocument(id, updates);
    return response.data as Document;
  },

  async deleteDocument(id: string): Promise<void> {
    await nexusClient.deleteDocument(id);
  },

  async downloadDocument(id: string): Promise<Blob> {
    const response = await nexusClient.downloadDocument(id);
    return response.data;
  },

  async getDocumentUrl(id: string): Promise<{ url: string; expiresAt: string }> {
    const response = await nexusClient.getDocumentUrl(id);
    return response.data as { url: string; expiresAt: string };
  },

  async archiveDocument(id: string): Promise<Document> {
    const response = await nexusClient.archiveDocument(id);
    return response.data as Document;
  },

  async restoreDocument(id: string): Promise<Document> {
    const response = await nexusClient.restoreDocument(id);
    return response.data as Document;
  },

  // ============ Folders ============

  async listFolders(parentId?: string): Promise<DocumentFolder[]> {
    const response = await nexusClient.listFolders(parentId);
    return response.data as DocumentFolder[];
  },

  async getFolder(id: string): Promise<DocumentFolder> {
    const response = await nexusClient.getFolder(id);
    return response.data as DocumentFolder;
  },

  async createFolder(data: CreateFolderDTO): Promise<DocumentFolder> {
    const response = await nexusClient.createFolder(data);
    return response.data as DocumentFolder;
  },

  async updateFolder(id: string, updates: UpdateFolderDTO): Promise<DocumentFolder> {
    const response = await nexusClient.updateFolder(id, updates);
    return response.data as DocumentFolder;
  },

  async deleteFolder(id: string): Promise<void> {
    await nexusClient.deleteFolder(id);
  },

  async getFolderDocuments(folderId: string): Promise<Document[]> {
    const response = await nexusClient.getFolderDocuments(folderId);
    return response.data as Document[];
  },

  // ============ Access Logs ============

  async getDocumentAccessLogs(documentId: string): Promise<DocumentAccessLog[]> {
    const response = await nexusClient.getDocumentAccessLogs(documentId);
    return response.data as DocumentAccessLog[];
  },

  async logDocumentAccess(documentId: string, action: string): Promise<void> {
    await nexusClient.logDocumentAccess(documentId, action);
  },

  // ============ Signatures ============

  async listSignatureRequests(): Promise<DocumentSignature[]> {
    const response = await nexusClient.listSignatureRequests();
    return response.data as DocumentSignature[];
  },

  async getSignatureRequest(id: string): Promise<DocumentSignature> {
    const response = await nexusClient.getSignatureRequest(id);
    return response.data as DocumentSignature;
  },

  async requestSignature(data: RequestSignatureDTO): Promise<DocumentSignature> {
    const response = await nexusClient.requestSignature(data);
    return response.data as DocumentSignature;
  },

  async submitSignature(id: string, data: SubmitSignatureDTO): Promise<DocumentSignature> {
    const response = await nexusClient.submitSignature(id, data);
    return response.data as DocumentSignature;
  },

  async declineSignature(id: string, reason: string): Promise<DocumentSignature> {
    const response = await nexusClient.declineSignature(id, reason);
    return response.data as DocumentSignature;
  },

  // ============ Templates ============

  async listTemplates(category?: string): Promise<DocumentTemplate[]> {
    const response = await nexusClient.listTemplates(category);
    return response.data as DocumentTemplate[];
  },

  async getTemplate(id: string): Promise<DocumentTemplate> {
    const response = await nexusClient.getTemplate(id);
    return response.data as DocumentTemplate;
  },

  async createTemplate(data: CreateTemplateDTO): Promise<DocumentTemplate> {
    const response = await nexusClient.createTemplate(data);
    return response.data as DocumentTemplate;
  },

  async updateTemplate(id: string, updates: UpdateTemplateDTO): Promise<DocumentTemplate> {
    const response = await nexusClient.updateTemplate(id, updates);
    return response.data as DocumentTemplate;
  },

  async deleteTemplate(id: string): Promise<void> {
    await nexusClient.deleteTemplate(id);
  },

  async generateFromTemplate(templateId: string, data: Record<string, any>): Promise<Document> {
    const response = await nexusClient.generateFromTemplate(templateId, data);
    return response.data as Document;
  },

  // ============ Upload ============

  async uploadFile(file: File, metadata: Partial<CreateDocumentDTO>): Promise<Document> {
    const response = await nexusClient.uploadFile(file, metadata);
    return response.data as Document;
  },

  // ============ Statistics & Reports ============

  async getStatistics(): Promise<DocumentStatistics> {
    const response = await nexusClient.getDocumentStatistics();
    return response.data as DocumentStatistics;
  },

  async getDocumentActivity(documentId: string): Promise<DocumentActivityReport> {
    const response = await nexusClient.getDocumentActivity(documentId);
    return response.data as DocumentActivityReport;
  },

  async getUserActivity(userId: string, startDate: string, endDate: string): Promise<UserDocumentActivity> {
    const response = await nexusClient.getUserDocumentActivity(userId, startDate, endDate);
    return response.data as UserDocumentActivity;
  },

  async getExpiringDocuments(days: number = 30): Promise<Document[]> {
    const response = await nexusClient.getExpiringDocuments(days);
    return response.data as Document[];
  },
};
