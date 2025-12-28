/**
 * Documents Service
 * Wraps NexusClient document management methods
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';

// Create singleton instances
const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

/**
 * Documents service permissions
 */
export const documentsServicePermissions = {
  LIST: 'nexus.documents:list',
  VIEW: 'nexus.documents:view',
  CREATE: 'nexus.documents:create',
  UPDATE: 'nexus.documents:update',
  DELETE: 'nexus.documents:delete',
  DOWNLOAD: 'nexus.documents:download',
  ARCHIVE: 'nexus.documents:archive',
  RESTORE: 'nexus.documents:restore',
  MANAGE_FOLDERS: 'nexus.documents:manage_folders',
  VIEW_ACCESS_LOGS: 'nexus.documents:view_access_logs',
};

export interface Document {
  id: string;
  name: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  documentType: 'CONTRACT' | 'CERTIFICATE' | 'ID' | 'TAX' | 'COMPLIANCE' | 'OTHER';
  employeeId?: string;
  employeeName?: string;
  folderId?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName?: string;
  expiryDate?: string;
  isConfidential: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface DocumentFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  documentCount: number;
  createdAt: string;
  createdBy: string;
}

export interface DocumentAccessLog {
  id: string;
  documentId: string;
  action: 'VIEW' | 'DOWNLOAD' | 'UPLOAD' | 'UPDATE' | 'DELETE';
  userId: string;
  userName: string;
  timestamp: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface DocumentFilters {
  search?: string;
  documentType?: string;
  employeeId?: string;
  folderId?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  uploadedBy?: string;
  uploadedAfter?: string;
  uploadedBefore?: string;
  expiresWithin?: number; // Days
  isConfidential?: boolean;
  tags?: string[];
}

/**
 * Documents Service
 */
export const documentsService = {
  /**
   * List all documents with optional filters
   */
  async list(filters?: DocumentFilters) {
    const response = await nexusClient.listDocuments(filters);
    return response.data.documents || response.data;
  },

  /**
   * Get a single document by ID
   */
  async get(id: string) {
    const response = await nexusClient.getDocument(id);
    return response.data.document || response.data;
  },

  /**
   * Create a new document
   */
  async create(data: Partial<Document>) {
    const response = await nexusClient.createDocument(data);
    return response.data.document || response.data;
  },

  /**
   * Update an existing document
   */
  async update(id: string, updates: Partial<Document>) {
    const response = await nexusClient.updateDocument(id, updates);
    return response.data.document || response.data;
  },

  /**
   * Delete a document
   */
  async delete(id: string) {
    await nexusClient.deleteDocument(id);
  },

  /**
   * Download a document
   */
  async download(id: string) {
    const response = await nexusClient.downloadDocument(id);
    return response; // response is already a Blob
  },

  /**
   * Get document download URL
   */
  async getUrl(id: string) {
    const response = await nexusClient.getDocumentUrl(id);
    return response.data.url || response.data;
  },

  /**
   * Archive a document
   */
  async archive(id: string) {
    const response = await nexusClient.archiveDocument(id);
    return response.data.document || response.data;
  },

  /**
   * Restore an archived document
   */
  async restore(id: string) {
    const response = await nexusClient.restoreDocument(id);
    return response.data.document || response.data;
  },

  // Folder Operations
  /**
   * List all folders
   */
  async listFolders(parentId?: string) {
    const response = await nexusClient.listFolders(parentId);
    return response.data.folders || response.data;
  },

  /**
   * Get a single folder
   */
  async getFolder(id: string) {
    const response = await nexusClient.getFolder(id);
    return response.data.folder || response.data;
  },

  /**
   * Create a new folder
   */
  async createFolder(data: { name: string; description?: string; parentId?: string }) {
    const response = await nexusClient.createFolder(data);
    return response.data.folder || response.data;
  },

  /**
   * Update a folder
   */
  async updateFolder(id: string, updates: { name?: string; description?: string }) {
    const response = await nexusClient.updateFolder(id, updates);
    return response.data.folder || response.data;
  },

  /**
   * Delete a folder
   */
  async deleteFolder(id: string) {
    await nexusClient.deleteFolder(id);
  },

  /**
   * Get documents in a folder
   */
  async getFolderDocuments(folderId: string) {
    const response = await nexusClient.getFolderDocuments(folderId);
    return response.data.documents || response.data;
  },

  // Access Logs
  /**
   * Get access logs for a document
   */
  async getAccessLogs(documentId: string) {
    const response = await nexusClient.getDocumentAccessLogs(documentId);
    return response.data.logs || response.data;
  },
};
