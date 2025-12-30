/**
 * DTOs (Data Transfer Objects) - Request & Response Schemas
 * Defines the contract between API clients and the backend
 *
 * This file contains TypeScript interfaces that define:
 * - Request body structures (what clients send)
 * - Response structures (what backend returns)
 * - Validation rules and constraints
 *
 * Used for:
 * - API documentation (auto-generated from types)
 * - Request validation (type checking)
 * - Response validation (ensuring correct format)
 * - Client code generation (OpenAPI/Swagger)
 */

// ============================================================================
// PAGINATION DTOs
// ============================================================================

/**
 * Pagination query parameters
 * @example { page: 1, limit: 20 }
 */
export interface PaginationParams {
  page?: number; // Default: 1, Min: 1
  limit?: number; // Default: 20, Min: 1, Max: 100
}

/**
 * Pagination metadata in responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  success: true;
  items: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// ERROR DTOs
// ============================================================================

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  constraint?: string;
  value?: any;
}

/**
 * Error response format
 */
export interface ErrorResponse {
  success: false;
  error: string; // User-friendly error message
  errorCode: string; // Machine-readable error code
  details?: ValidationErrorDetail[]; // For validation errors
}

/**
 * Standard error codes
 */
export const ERROR_CODES = {
  // 400 - Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',

  // 401 - Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // 403 - Authorization
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // 404 - Not Found
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // 409 - Conflict
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // 500 - Server
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};

// ============================================================================
// JOB DTOs
// ============================================================================

/**
 * Job creation request
 * POST /api/jobs
 */
export interface CreateJobRequest {
  // Required fields
  title: string; // Min: 3, Max: 200
  description: string; // Min: 10, Max: 5000
  workspaceId: string; // UUID v4

  // Optional fields
  department?: string; // Max: 100
  location?: string; // Max: 200
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'temporary'; // Default: 'full-time'
  salaryMin?: number; // Min: 0
  salaryMax?: number; // Min: 0, Must be >= salaryMin
  skills?: string[]; // Array of skill names, each max 50 chars
  requirements?: string[]; // Array of requirements, each max 500 chars
}

/**
 * Job update request
 * PATCH /api/jobs/:id
 */
export interface UpdateJobRequest {
  title?: string;
  description?: string;
  department?: string;
  location?: string;
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'temporary';
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  requirements?: string[];
  status?: 'draft' | 'open' | 'closed' | 'archived';
}

/**
 * Job response
 */
export interface JobResponse {
  // Identifiers
  id: string; // UUID v4
  organizationId: string; // UUID v4
  workspaceId: string; // UUID v4

  // Basic info
  title: string;
  description: string;
  department: string | null;
  location: string | null;

  // Employment details
  employmentType: 'full-time' | 'part-time' | 'contract' | 'temporary';
  salaryMin: number | null;
  salaryMax: number | null;

  // Skills & requirements
  skills: string[];
  requirements: string[];

  // Status
  status: 'draft' | 'open' | 'closed' | 'archived';
  isPublished: boolean;

  // Metrics
  applicationCount?: number; // Optional, included in detail views
  viewCount?: number; // Optional

  // Audit
  createdBy: string; // UUID v4
  createdAt: string; // ISO 8601 timestamp
  updatedBy: string | null; // UUID v4
  updatedAt: string; // ISO 8601 timestamp
  deletedAt: string | null; // ISO 8601 timestamp (soft delete)

  // HATEOAS links (optional)
  links?: {
    self: string;
    update: string;
    delete: string;
    publish?: string;
    close?: string;
  };
}

/**
 * List jobs response
 */
export interface ListJobsResponse extends PaginatedResponse<JobResponse> {
  filters?: Record<string, any>;
  sort?: {
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
  };
}

/**
 * Create job response
 */
export interface CreateJobResponse {
  success: true;
  job: JobResponse;
  message: string;
}

// ============================================================================
// CANDIDATE DTOs
// ============================================================================

/**
 * Candidate creation request
 * POST /api/candidates
 */
export interface CreateCandidateRequest {
  // Required fields
  firstName: string; // Min: 2, Max: 100
  lastName: string; // Min: 2, Max: 100
  email: string; // Valid email format, unique per workspace

  // Optional fields
  phone?: string; // Valid phone format
  location?: string; // Max: 200
  currentTitle?: string; // Max: 200
  yearsOfExperience?: number; // Min: 0
  resumeUrl?: string; // Valid URL
  linkedinUrl?: string; // Valid URL
  skills?: string[]; // Array of skill names
  notes?: string; // Max: 5000
}

/**
 * Candidate update request
 * PATCH /api/candidates/:id
 */
export interface UpdateCandidateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  currentTitle?: string;
  yearsOfExperience?: number;
  resumeUrl?: string;
  linkedinUrl?: string;
  skills?: string[];
  notes?: string;
  status?: 'active' | 'inactive' | 'archived';
}

/**
 * Candidate response
 */
export interface CandidateResponse {
  // Identifiers
  id: string; // UUID v4
  organizationId: string; // UUID v4
  workspaceId: string; // UUID v4

  // Personal info
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;

  // Professional info
  currentTitle: string | null;
  yearsOfExperience: number | null;
  location: string | null;

  // Documents
  resumeUrl: string | null;
  linkedinUrl: string | null;

  // Skills & notes
  skills: string[];
  notes: string | null;

  // Status
  status: 'active' | 'inactive' | 'archived';

  // Metrics
  applicationCount?: number;
  interviewCount?: number;

  // Audit
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
  deletedAt: string | null;

  // HATEOAS links
  links?: {
    self: string;
    update: string;
    delete: string;
  };
}

/**
 * List candidates response
 */
export interface ListCandidatesResponse extends PaginatedResponse<CandidateResponse> {
  filters?: Record<string, any>;
}

// ============================================================================
// APPLICATION DTOs
// ============================================================================

/**
 * Application creation request
 * POST /api/jobs/:jobId/applications
 */
export interface CreateApplicationRequest {
  candidateId: string; // UUID v4
  coverLetter?: string; // Max: 5000
  customQuestionAnswers?: Record<string, string>;
}

/**
 * Application response
 */
export interface ApplicationResponse {
  id: string;
  jobId: string;
  candidateId: string;
  organizationId: string;
  status: 'submitted' | 'reviewing' | 'shortlisted' | 'rejected' | 'accepted';
  coverLetter: string | null;
  customQuestionAnswers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  links?: {
    self: string;
    candidate: string;
    job: string;
  };
}

// ============================================================================
// FILTER DTOs
// ============================================================================

/**
 * Job filters for list queries
 * Example: GET /api/jobs?status=open&location=New%20York&minSalary=80000
 */
export interface JobFilters {
  status?: 'draft' | 'open' | 'closed' | 'archived';
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'temporary';
  location?: string; // Partial match
  minSalary?: number;
  maxSalary?: number;
  search?: string; // Full-text search on title/description
  workspaceId?: string; // UUID v4
}

/**
 * Candidate filters for list queries
 */
export interface CandidateFilters {
  status?: 'active' | 'inactive' | 'archived';
  location?: string;
  minExperience?: number;
  search?: string; // Full-text search on name/email/skills
  skillId?: string;
}

// ============================================================================
// SORT DTOs
// ============================================================================

/**
 * Sort parameters for list queries
 * Example: GET /api/jobs?sort=createdAt&order=DESC
 */
export interface SortParams {
  sort?: string; // Field name to sort by
  order?: 'ASC' | 'DESC'; // Sort order
}

// ============================================================================
// AUTHENTICATION DTOs
// ============================================================================

/**
 * Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Login response
 */
export interface LoginResponse {
  success: true;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId: string;
  };
  token?: string; // Only if not using httpOnly cookies
  message: string;
}

// ============================================================================
// BULK OPERATION DTOs
// ============================================================================

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  success: true;
  results: {
    created: number;
    updated: number;
    deleted: number;
    failed: number;
    errors: Array<{
      index: number;
      error: string;
    }>;
  };
}

// ============================================================================
// EXPORT ALL DTOs
// ============================================================================
// Note: All types are already exported individually above with 'export interface'
// TypeScript interfaces and types cannot be exported as default object values
// ERROR_CODES is already exported as a named export
