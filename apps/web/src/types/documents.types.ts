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
  | 'policy'
  | 'handbook'
  | 'other';

export type DocumentStatus = 
  | 'draft'
  | 'active' 
  | 'expired' 
  | 'pending' 
  | 'revoked'
  | 'archived';

export type DocumentCategory = 
  | 'personal'
  | 'employment'
  | 'legal'
  | 'compliance'
  | 'training'
  | 'other';

export interface Document extends AuditFields {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName?: string; // For UI display
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  }; // Nested employee object for joins
  documentType: DocumentType;
  documentNumber?: string;
  name: string;
  description?: string;
  category?: DocumentCategory;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  issueDate?: string;
  expiryDate?: string;
  status: DocumentStatus;
  notes?: string;
  requiresSignature?: boolean;
  signedAt?: string;
  signedBy?: string;
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
