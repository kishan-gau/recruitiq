/**
 * Documents Service
 * API service for document management and file operations
 */

import { apiClient } from './api';
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

export const documentsService = {
  // ============ Documents ============
  
  async listDocuments(filters?: DocumentFilters): Promise<Document[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.accessLevel) params.append('accessLevel', filters.accessLevel);
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.uploadedBy) params.append('uploadedBy', filters.uploadedBy);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.tags) filters.tags.forEach(tag => params.append('tags', tag));
    
    const queryString = params.toString();
    const { data } = await apiClient.get<Document[]>(`/documents${queryString ? `?${queryString}` : ''}`);
    return data;
  },

  async getDocument(id: string): Promise<Document> {
    const { data } = await apiClient.get<Document>(`/documents/${id}`);
    return data;
  },

  async createDocument(data: CreateDocumentDTO): Promise<Document> {
    const response = await apiClient.post<Document>('/documents', data);
    return response.data;
  },

  async updateDocument(id: string, updates: UpdateDocumentDTO): Promise<Document> {
    const { data } = await apiClient.put<Document>(`/documents/${id}`, updates);
    return data;
  },

  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },

  async downloadDocument(id: string): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(`/documents/${id}/download`, { responseType: 'blob' });
    return data;
  },

  async getDocumentUrl(id: string): Promise<{ url: string; expiresAt: string }> {
    const { data } = await apiClient.get<{ url: string; expiresAt: string }>(`/documents/${id}/url`);
    return data;
  },

  async archiveDocument(id: string): Promise<Document> {
    const { data } = await apiClient.post<Document>(`/documents/${id}/archive`);
    return data;
  },

  async restoreDocument(id: string): Promise<Document> {
    const { data } = await apiClient.post<Document>(`/documents/${id}/restore`);
    return data;
  },

  // ============ Folders ============
  
  async listFolders(parentId?: string): Promise<DocumentFolder[]> {
    const url = parentId ? `/documents/folders?parentId=${parentId}` : '/documents/folders';
    const { data } = await apiClient.get<DocumentFolder[]>(url);
    return data;
  },

  async getFolder(id: string): Promise<DocumentFolder> {
    const { data } = await apiClient.get<DocumentFolder>(`/documents/folders/${id}`);
    return data;
  },

  async createFolder(data: CreateFolderDTO): Promise<DocumentFolder> {
    const response = await apiClient.post<DocumentFolder>('/documents/folders', data);
    return response.data;
  },

  async updateFolder(id: string, updates: UpdateFolderDTO): Promise<DocumentFolder> {
    const { data } = await apiClient.put<DocumentFolder>(`/documents/folders/${id}`, updates);
    return data;
  },

  async deleteFolder(id: string): Promise<void> {
    await apiClient.delete(`/documents/folders/${id}`);
  },

  async getFolderDocuments(folderId: string): Promise<Document[]> {
    const { data } = await apiClient.get<Document[]>(`/documents/folders/${folderId}/documents`);
    return data;
  },

  // ============ Access Logs ============
  
  async getDocumentAccessLogs(documentId: string): Promise<DocumentAccessLog[]> {
    const { data } = await apiClient.get<DocumentAccessLog[]>(`/documents/${documentId}/access-logs`);
    return data;
  },

  async logDocumentAccess(documentId: string, action: string): Promise<void> {
    await apiClient.post(`/documents/${documentId}/log-access`, { action });
  },

  // ============ Signatures ============
  
  async listSignatureRequests(): Promise<DocumentSignature[]> {
    const { data } = await apiClient.get<DocumentSignature[]>('/documents/signatures');
    return data;
  },

  async getSignatureRequest(id: string): Promise<DocumentSignature> {
    const { data } = await apiClient.get<DocumentSignature>(`/documents/signatures/${id}`);
    return data;
  },

  async requestSignature(data: RequestSignatureDTO): Promise<DocumentSignature> {
    const response = await apiClient.post<DocumentSignature>('/documents/signatures/request', data);
    return response.data;
  },

  async submitSignature(id: string, data: SubmitSignatureDTO): Promise<DocumentSignature> {
    const response = await apiClient.post<DocumentSignature>(`/documents/signatures/${id}/sign`, data);
    return response.data;
  },

  async declineSignature(id: string, reason: string): Promise<DocumentSignature> {
    const response = await apiClient.post<DocumentSignature>(`/documents/signatures/${id}/decline`, { reason });
    return response.data;
  },

  // ============ Templates ============
  
  async listTemplates(category?: string): Promise<DocumentTemplate[]> {
    const url = category ? `/documents/templates?category=${category}` : '/documents/templates';
    const { data } = await apiClient.get<DocumentTemplate[]>(url);
    return data;
  },

  async getTemplate(id: string): Promise<DocumentTemplate> {
    const { data } = await apiClient.get<DocumentTemplate>(`/documents/templates/${id}`);
    return data;
  },

  async createTemplate(data: CreateTemplateDTO): Promise<DocumentTemplate> {
    const response = await apiClient.post<DocumentTemplate>('/documents/templates', data);
    return response.data;
  },

  async updateTemplate(id: string, updates: UpdateTemplateDTO): Promise<DocumentTemplate> {
    const { data } = await apiClient.put<DocumentTemplate>(`/documents/templates/${id}`, updates);
    return data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/documents/templates/${id}`);
  },

  async generateFromTemplate(templateId: string, data: Record<string, any>): Promise<Document> {
    const response = await apiClient.post<Document>(`/documents/templates/${templateId}/generate`, data);
    return response.data;
  },

  // ============ Upload ============
  
  async uploadFile(file: File, metadata: Partial<CreateDocumentDTO>): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    const { data } = await apiClient.post<Document>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // ============ Statistics & Reports ============
  
  async getStatistics(): Promise<DocumentStatistics> {
    const { data } = await apiClient.get<DocumentStatistics>('/documents/statistics');
    return data;
  },

  async getDocumentActivity(documentId: string): Promise<DocumentActivityReport> {
    const { data } = await apiClient.get<DocumentActivityReport>(`/documents/${documentId}/activity`);
    return data;
  },

  async getUserActivity(userId: string, startDate: string, endDate: string): Promise<UserDocumentActivity> {
    const { data } = await apiClient.get<UserDocumentActivity>(`/documents/activity/user/${userId}?startDate=${startDate}&endDate=${endDate}`);
    return data;
  },

  async getExpiringDocuments(days: number = 30): Promise<Document[]> {
    const { data } = await apiClient.get<Document[]>(`/documents/expiring?days=${days}`);
    return data;
  },
};
