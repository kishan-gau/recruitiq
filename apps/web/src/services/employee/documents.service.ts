/**
 * Documents Service
 * Provides API integration for employee document management
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export interface Document {
  id: string;
  name: string;
  category: 'contract' | 'tax' | 'policy' | 'offer' | 'other';
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  url: string;
}

export interface DocumentCategory {
  category: string;
  count: number;
  documents: Document[];
}

export const documentsService = {
  /**
   * Get all documents for the authenticated employee
   */
  async listDocuments(filters?: { category?: string; search?: string }): Promise<Document[]> {
    const response = await nexusClient.listDocuments(filters);
    return response.data.documents || response.data || [];
  },

  /**
   * Get documents grouped by category
   */
  async getDocumentsByCategory(): Promise<DocumentCategory[]> {
    const response = await nexusClient.listDocuments();
    const documents = response.data.documents || response.data || [];
    
    // Group by category
    const grouped = documents.reduce((acc: Record<string, Document[]>, doc: Document) => {
      if (!acc[doc.category]) {
        acc[doc.category] = [];
      }
      acc[doc.category].push(doc);
      return acc;
    }, {});

    return Object.entries(grouped).map(([category, docs]) => ({
      category,
      count: docs.length,
      documents: docs
    }));
  },

  /**
   * Get a single document by ID
   */
  async getDocument(id: string): Promise<Document> {
    const response = await nexusClient.getDocument(id);
    return response.data.document || response.data;
  },

  /**
   * Download document
   */
  async downloadDocument(id: string): Promise<Blob> {
    const response = await nexusClient.downloadDocument(id);
    return response.data;
  },

  /**
   * Get document preview URL
   */
  getPreviewUrl(id: string): string {
    return `/api/products/nexus/documents/${id}/preview`;
  }
};
