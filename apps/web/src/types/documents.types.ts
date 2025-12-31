/**
 * Document types for HRIS document management
 */

import type { AuditFields } from './common.types';

export type DocumentType = 
  | 'id'
  | 'passport'
  | 'driver_license'
  | 'work_permit'
  | 'visa'
  | 'contract'
  | 'certificate'
  | 'other';

export type DocumentStatus = 'active' | 'expired' | 'pending' | 'revoked';

export interface Document extends AuditFields {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName?: string; // For UI display
  documentType: DocumentType;
  documentNumber?: string;
  name: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  issueDate?: string;
  expiryDate?: string;
  status: DocumentStatus;
  notes?: string;
}

export interface CreateDocumentDTO {
  employeeId: string;
  documentType: DocumentType;
  documentNumber?: string;
  name: string;
  description?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface UpdateDocumentDTO extends Partial<CreateDocumentDTO> {
  status?: DocumentStatus;
}

export interface DocumentFilters {
  employeeId?: string;
  documentType?: DocumentType;
  status?: DocumentStatus;
  expiryBefore?: string;
  expiryAfter?: string;
}
