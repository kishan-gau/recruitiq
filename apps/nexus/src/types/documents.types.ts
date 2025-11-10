/**
 * Documents Module Type Definitions
 * Types for document management, file storage, and access control
 */

// ============ Document Types ============

export type DocumentCategory = 
  | 'contract'
  | 'policy'
  | 'handbook'
  | 'training'
  | 'personal'
  | 'payroll'
  | 'benefit'
  | 'performance'
  | 'compliance'
  | 'other';

export type DocumentStatus = 'active' | 'archived' | 'expired' | 'draft';
export type AccessLevel = 'public' | 'internal' | 'confidential' | 'restricted';
export type DocumentType = 'pdf' | 'word' | 'excel' | 'image' | 'text' | 'other';

// ============ Document ============

export interface Document {
  id: string;
  organizationId: string;
  
  // Document Details
  name: string;
  description?: string;
  category: DocumentCategory;
  status: DocumentStatus;
  
  // File Information
  fileName: string;
  fileSize: number; // bytes
  fileType: DocumentType;
  mimeType: string;
  fileUrl: string; // Storage URL
  thumbnailUrl?: string;
  
  // Version Control
  version: number;
  isLatestVersion: boolean;
  parentDocumentId?: string; // For versioning
  
  // Access Control
  accessLevel: AccessLevel;
  isPublic: boolean;
  allowDownload: boolean;
  allowPrint: boolean;
  
  // Associations
  employeeId?: string; // If employee-specific
  departmentId?: string; // If department-specific
  relatedEntityType?: string; // e.g., 'contract', 'review', 'timeoff'
  relatedEntityId?: string;
  
  // Metadata
  tags: string[];
  expiryDate?: string;
  effectiveDate?: string;
  
  // Signatures & Approval
  requiresSignature: boolean;
  signedBy?: string[];
  signedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  
  // Audit fields
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  accessCount: number;
  
  // Populated fields
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeNumber: string;
  };
  department?: {
    id: string;
    name: string;
  };
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// ============ Document DTOs ============

export interface CreateDocumentDTO {
  name: string;
  description?: string;
  category: DocumentCategory;
  fileName: string;
  fileSize: number;
  fileType: DocumentType;
  mimeType: string;
  fileUrl: string;
  thumbnailUrl?: string;
  accessLevel: AccessLevel;
  isPublic?: boolean;
  allowDownload?: boolean;
  allowPrint?: boolean;
  employeeId?: string;
  departmentId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  tags?: string[];
  expiryDate?: string;
  effectiveDate?: string;
  requiresSignature?: boolean;
}

export interface UpdateDocumentDTO {
  name?: string;
  description?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  accessLevel?: AccessLevel;
  isPublic?: boolean;
  allowDownload?: boolean;
  allowPrint?: boolean;
  tags?: string[];
  expiryDate?: string;
  effectiveDate?: string;
}

export interface DocumentFilters {
  category?: DocumentCategory;
  status?: DocumentStatus;
  accessLevel?: AccessLevel;
  employeeId?: string;
  departmentId?: string;
  tags?: string[];
  uploadedBy?: string;
  startDate?: string; // Filter by uploadedAt
  endDate?: string;
  search?: string; // Search in name, description, tags
}

// ============ Document Folder ============

export interface DocumentFolder {
  id: string;
  organizationId: string;
  
  // Folder Details
  name: string;
  description?: string;
  parentFolderId?: string;
  path: string; // e.g., '/HR/Policies'
  
  // Access Control
  accessLevel: AccessLevel;
  isPublic: boolean;
  
  // Associations
  departmentId?: string;
  
  // Metadata
  documentCount: number;
  subfolderCount: number;
  
  // Audit fields
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Populated fields
  documents?: Document[];
  subfolders?: DocumentFolder[];
  department?: {
    id: string;
    name: string;
  };
}

export interface CreateFolderDTO {
  name: string;
  description?: string;
  parentFolderId?: string;
  accessLevel?: AccessLevel;
  isPublic?: boolean;
  departmentId?: string;
}

export interface UpdateFolderDTO {
  name?: string;
  description?: string;
  accessLevel?: AccessLevel;
  isPublic?: boolean;
}

// ============ Document Access Log ============

export interface DocumentAccessLog {
  id: string;
  organizationId: string;
  documentId: string;
  userId: string;
  action: 'view' | 'download' | 'print' | 'share' | 'delete' | 'update';
  ipAddress?: string;
  deviceInfo?: string;
  accessedAt: string;
  
  // Populated fields
  document?: Document;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// ============ Document Signature ============

export interface DocumentSignature {
  id: string;
  organizationId: string;
  documentId: string;
  
  // Signer Information
  signerId: string;
  signerName: string;
  signerEmail: string;
  
  // Signature Details
  signatureData?: string; // Base64 encoded signature image
  signatureType: 'electronic' | 'digital' | 'wet';
  ipAddress?: string;
  deviceInfo?: string;
  
  // Status
  status: 'pending' | 'signed' | 'declined' | 'expired';
  requestedAt: string;
  signedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  expiryDate?: string;
  
  // Audit fields
  requestedBy: string;
  createdAt: string;
  
  // Populated fields
  document?: Document;
  signer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface RequestSignatureDTO {
  documentId: string;
  signerId: string;
  expiryDate?: string;
  message?: string;
}

export interface SubmitSignatureDTO {
  signatureData?: string;
  signatureType: 'electronic' | 'digital' | 'wet';
}

// ============ Document Template ============

export interface DocumentTemplate {
  id: string;
  organizationId: string;
  
  // Template Details
  name: string;
  description?: string;
  category: DocumentCategory;
  
  // Template Content
  templateData: string; // JSON or HTML template
  placeholders: string[]; // List of variable placeholders
  
  // Settings
  isActive: boolean;
  isDefault: boolean;
  
  // Audit fields
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateDTO {
  name: string;
  description?: string;
  category: DocumentCategory;
  templateData: string;
  placeholders: string[];
}

export interface UpdateTemplateDTO {
  name?: string;
  description?: string;
  templateData?: string;
  placeholders?: string[];
  isActive?: boolean;
  isDefault?: boolean;
}

// ============ Statistics & Reports ============

export interface DocumentStatistics {
  totalDocuments: number;
  activeDocuments: number;
  archivedDocuments: number;
  expiringDocuments: number; // Expiring in next 30 days
  totalFolders: number;
  totalSize: number; // Total size in bytes
  byCategory: {
    category: DocumentCategory;
    count: number;
    size: number;
  }[];
  recentUploads: number; // Last 7 days
  pendingSignatures: number;
}

export interface DocumentActivityReport {
  documentId: string;
  documentName: string;
  category: DocumentCategory;
  totalAccesses: number;
  uniqueUsers: number;
  lastAccessedAt: string;
  downloads: number;
  views: number;
  prints: number;
}

export interface UserDocumentActivity {
  userId: string;
  userName: string;
  totalAccesses: number;
  documentsAccessed: number;
  lastActivityAt: string;
  actions: {
    views: number;
    downloads: number;
    prints: number;
    uploads: number;
  };
}
