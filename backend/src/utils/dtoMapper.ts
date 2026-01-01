/**
 * RecruitIQ DTO Mapper Utility
 * 
 * Maps between API field names and database schema field names.
 * Ensures consistency across all RecruitIQ endpoints and provides
 * data sanitization, validation, and transformation.
 * 
 * Industry Standard: Data Transfer Objects (DTOs) pattern
 * - Separates internal representation from external API
 * - Provides a single source of truth for field mappings
 * - Enables versioning and API evolution
 * - Protects against exposing sensitive database fields
 * 
 * @module utils/dtoMapper
 */

/**
 * Field name mappings from Database to API (snake_case to camelCase)
 * Database names match PostgreSQL schema conventions
 * API names follow JavaScript/JSON camelCase conventions
 */
const DB_TO_API_MAPPINGS = {
  // Common fields
  id: 'id',
  organization_id: 'organizationId',
  workspace_id: 'workspaceId',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  deleted_at: 'deletedAt',
  created_by: 'createdBy',
  updated_by: 'updatedBy',
  tracking_code: 'trackingCode',
  
  // Job fields
  employment_type: 'employmentType',
  experience_level: 'experienceLevel',
  remote_policy: 'remotePolicy',
  is_remote: 'isRemote',
  is_published: 'isPublished',
  salary_min: 'salaryMin',
  salary_max: 'salaryMax',
  salary_currency: 'salaryCurrency',
  is_public: 'isPublic',
  public_slug: 'publicSlug',
  public_portal_settings: 'publicPortalSettings',
  view_count: 'viewCount',
  application_count: 'applicationCount',
  flow_template_id: 'flowTemplateId',
  hiring_manager_id: 'hiringManagerId',
  hiring_manager_email: 'hiringManagerEmail',
  hiring_manager_name: 'hiringManagerName',
  new_applications: 'newApplications',
  screening_count: 'screeningCount',
  interviewing_count: 'interviewingCount',
  
  // Candidate fields
  first_name: 'firstName',
  last_name: 'lastName',
  phone: 'phone', // Actual field in schema
  phone_number: 'phoneNumber', // Legacy mapping
  linkedin_url: 'linkedinUrl',
  portfolio_url: 'portfolioUrl',
  resume_url: 'resumeUrl',
  cover_letter_url: 'coverLetterUrl',
  current_company: 'currentCompany',
  current_job_title: 'currentJobTitle', // Actual field in schema
  current_position: 'currentPosition', // Legacy mapping
  years_of_experience: 'yearsOfExperience',
  expected_salary: 'expectedSalary',
  notice_period: 'noticePeriod',
  is_available: 'isAvailable',
  preferred_locations: 'preferredLocations',
  work_authorization: 'workAuthorization',
  
  // Application fields
  job_id: 'jobId',
  candidate_id: 'candidateId',
  applied_at: 'appliedAt',
  source_channel: 'sourceChannel',
  referrer_id: 'referrerId',
  stage_id: 'stageId',
  stage_name: 'stageName',
  rejection_reason: 'rejectionReason',
  rejected_at: 'rejectedAt',
  rejected_by: 'rejectedBy',
  hired_at: 'hiredAt',
  
  // Interview fields
  application_id: 'applicationId',
  interview_type: 'interviewType',
  scheduled_at: 'scheduledAt',
  duration_minutes: 'durationMinutes',
  meeting_link: 'meetingLink',
  meeting_id: 'meetingId',
  meeting_password: 'meetingPassword',
  conducted_at: 'conductedAt',
  completed_at: 'completedAt',
  cancelled_at: 'cancelledAt',
  cancellation_reason: 'cancellationReason',
  overall_rating: 'overallRating',
  technical_rating: 'technicalRating',
  communication_rating: 'communicationRating',
  cultural_fit_rating: 'culturalFitRating',
  
  // Organization fields
  license_key: 'licenseKey',
  license_expires_at: 'licenseExpiresAt',
  subscription_status: 'subscriptionStatus',
  subscription_id: 'subscriptionId',
  max_users: 'maxUsers',
  max_workspaces: 'maxWorkspaces',
  max_jobs: 'maxJobs',
  max_candidates: 'maxCandidates',
  session_policy: 'sessionPolicy',
  max_sessions_per_user: 'maxSessionsPerUser',
  concurrent_login_detection: 'concurrentLoginDetection',
  mfa_required: 'mfaRequired',
  mfa_enforcement_date: 'mfaEnforcementDate',
  deployment_model: 'deploymentModel',
  vps_id: 'vpsId',
  
  // User fields
  password_hash: 'passwordHash', // Never expose in API responses
  password_changed_at: 'passwordChangedAt',
  failed_login_attempts: 'failedLoginAttempts',
  account_locked_until: 'accountLockedUntil',
  last_login_at: 'lastLoginAt',
  last_login_ip: 'lastLoginIp',
  mfa_enabled: 'mfaEnabled',
  mfa_secret: 'mfaSecret', // Never expose in API responses
  backup_codes: 'backupCodes', // Never expose in API responses
  email_verified: 'emailVerified',
  email_verified_at: 'emailVerifiedAt',
  phone_verified: 'phoneVerified',
  is_active: 'isActive',
  
  // Workspace fields
  workspace_name: 'workspaceName',
  member_count: 'memberCount',
  job_count: 'jobCount',
  
  // Flow template fields
  template_name: 'templateName',
  is_default: 'isDefault',
  stage_order: 'stageOrder',
  
  // Communication fields
  communication_type: 'communicationType',
  sent_at: 'sentAt',
  delivered_at: 'deliveredAt',
  read_at: 'readAt',
  failed_at: 'failedAt',
  error_message: 'errorMessage',
  template_id: 'templateId',
  template_data: 'templateData',
};

/**
 * Reverse mapping from API to Database (camelCase to snake_case)
 */
const API_TO_DB_MAPPINGS = Object.entries(DB_TO_API_MAPPINGS).reduce((acc, [dbKey, apiKey]) => {
  acc[apiKey] = dbKey;
  return acc;
}, {});

/**
 * Fields that should NEVER be exposed in API responses
 * These are filtered out automatically in mapDbToApi
 */
const SENSITIVE_FIELDS = new Set([
  'password_hash',
  'mfa_secret',
  'backup_codes',
  'refresh_token',
  'access_token',
]);

/**
 * Fields that should be included in list/search responses (lightweight)
 * versus detail responses (complete data)
 */
const LIST_RESPONSE_FIELDS = {
  jobs: [
    'id', 'title', 'department', 'location', 'employment_type', 
    'experience_level', 'status', 'is_public', 'salary_min', 'salary_max',
    'salary_currency', 'application_count', 'created_at', 'updated_at'
  ],
  candidates: [
    'id', 'first_name', 'last_name', 'email', 'phone_number',
    'current_position', 'years_of_experience', 'status', 'created_at'
  ],
  applications: [
    'id', 'job_id', 'candidate_id', 'status', 'stage_name',
    'applied_at', 'source_channel', 'created_at'
  ],
  interviews: [
    'id', 'application_id', 'interview_type', 'scheduled_at',
    'duration_minutes', 'status', 'overall_rating', 'created_at'
  ],
};

/**
 * Map database record to API response format
 * Converts snake_case to camelCase and filters sensitive fields
 * 
 * @param {Object} dbData - Data from database query
 * @param {Object} options - Mapping options
 * @param {boolean} options.includeAll - Include all fields (default: true)
 * @param {string[]} options.only - Only include specified fields
 * @param {string[]} options.exclude - Exclude specified fields
 * @param {boolean} options.isList - Use list response fields (lightweight)
 * @param {string} options.entity - Entity type for list filtering (jobs, candidates, etc.)
 * @returns {Object} Mapped data for API response
 */

interface MapDbToApiOptions {
  includeAll?: boolean;
  only?: string[] | null;
  exclude?: string[];
  isList?: boolean;
  entity?: string | null;
}

export function mapDbToApi(dbData: unknown, options: MapDbToApiOptions = {}): unknown {
  if (!dbData || typeof dbData !== 'object') {
    return dbData;
  }

  // Handle arrays
  if (Array.isArray(dbData)) {
    return dbData.map(item => mapDbToApi(item, options));
  }

  const {
    includeAll = true,
    only = null,
    exclude = [],
    isList = false,
    entity = null,
  } = options;

  const result = {};
  
  // Determine which fields to include
  let fieldsToInclude = Object.keys(dbData);
  
  if (isList && entity && LIST_RESPONSE_FIELDS[entity]) {
    fieldsToInclude = LIST_RESPONSE_FIELDS[entity];
  } else if (only && Array.isArray(only)) {
    fieldsToInclude = only;
  }

  for (const dbKey of fieldsToInclude) {
    // Skip sensitive fields
    if (SENSITIVE_FIELDS.has(dbKey)) {
      continue;
    }

    // Skip excluded fields
    if (exclude.includes(dbKey)) {
      continue;
    }

    // Skip if field doesn't exist in data
    if (!(dbKey in dbData)) {
      continue;
    }

    const apiKey = DB_TO_API_MAPPINGS[dbKey] || dbKey;
    const value = dbData[dbKey];

    // Handle nested objects and arrays
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[apiKey] = mapDbToApi(value, options);
    } else if (Array.isArray(value)) {
      result[apiKey] = value.map(item => 
        typeof item === 'object' ? mapDbToApi(item, options) : item
      );
    } else {
      result[apiKey] = value;
    }
  }

  return result;
}

/**
 * Map API request data to database schema format
 * Converts camelCase to snake_case
 * 
 * @param {Object} apiData - Data from API request
 * @param {Object} options - Mapping options
 * @param {string[]} options.allowedFields - Whitelist of allowed fields (mass assignment protection)
 * @param {Object} options.defaults - Default values to merge
 * @returns {Object} Mapped data for database operations
 */

interface MapApiToDbOptions {
  allowedFields?: string[] | null;
  defaults?: Record<string, unknown>;
}

export function mapApiToDb(apiData: unknown, options: MapApiToDbOptions = {}): unknown {
  if (!apiData || typeof apiData !== 'object') {
    return apiData;
  }

  // Handle arrays
  if (Array.isArray(apiData)) {
    return apiData.map(item => mapApiToDb(item, options));
  }

  const { allowedFields = null, defaults = {} } = options;
  const result = { ...defaults };

  for (const [apiKey, value] of Object.entries(apiData)) {
    const dbKey = API_TO_DB_MAPPINGS[apiKey] || apiKey;

    // Apply mass assignment protection if allowedFields specified
    if (allowedFields && !allowedFields.includes(dbKey)) {
      continue;
    }

    // Handle nested objects and arrays
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[dbKey] = mapApiToDb(value, options);
    } else if (Array.isArray(value)) {
      result[dbKey] = value.map(item =>
        typeof item === 'object' ? mapApiToDb(item, options) : item
      );
    } else {
      result[dbKey] = value;
    }
  }

  return result;
}

/**
 * Create a lightweight DTO for list responses
 * Only includes essential fields to reduce payload size
 * 
 * @param {Object|Object[]} dbData - Database record(s)
 * @param {string} entity - Entity type (jobs, candidates, applications, interviews)
 * @returns {Object|Object[]} Lightweight DTO(s)
 */
export function mapToListDto(dbData, entity) {
  return mapDbToApi(dbData, { isList: true, entity });
}

/**
 * Create a detailed DTO for single record responses
 * Includes all non-sensitive fields
 * 
 * @param {Object} dbData - Database record
 * @param {string[]} exclude - Additional fields to exclude
 * @returns {Object} Detailed DTO
 */
export function mapToDetailDto(dbData, exclude = []) {
  return mapDbToApi(dbData, { exclude });
}

/**
 * Map job entity with stats to API response
 * Specialized mapper for job with application statistics
 * 
 * @param {Object} dbData - Job record with stats from database
 * @returns {Object} Job DTO with stats
 */
export function mapJobWithStatsDto(dbData) {
  if (!dbData) return null;

  const baseDto = mapDbToApi(dbData);
  
  // Ensure numeric fields are numbers
  if (baseDto.applicationCount) {
    baseDto.applicationCount = parseInt(baseDto.applicationCount, 10);
  }
  if (baseDto.newApplications) {
    baseDto.newApplications = parseInt(baseDto.newApplications, 10);
  }
  if (baseDto.screeningCount) {
    baseDto.screeningCount = parseInt(baseDto.screeningCount, 10);
  }
  if (baseDto.interviewingCount) {
    baseDto.interviewingCount = parseInt(baseDto.interviewingCount, 10);
  }

  return baseDto;
}

/**
 * Map candidate with application details to API response
 * 
 * @param {Object} dbData - Candidate record with applications
 * @returns {Object} Candidate DTO with applications
 */
export function mapCandidateWithApplicationsDto(dbData) {
  if (!dbData) return null;

  const dto = mapDbToApi(dbData);
  
  // Map nested applications if present
  if (dto.applications && Array.isArray(dto.applications)) {
    dto.applications = dto.applications.map(app => mapDbToApi(app));
  }

  return dto;
}

/**
 * Map search results with pagination metadata
 * 
 * @param {Object[]} rows - Database rows
 * @param {number} total - Total count
 * @param {Object} params - Search parameters (page, limit)
 * @param {string} entity - Entity type for list mapping
 * @returns {Object} Paginated response DTO
 */
export function mapSearchResultsDto(rows, total, params, entity) {
  const { page = 1, limit = 20 } = params;
  
  return {
    data: mapToListDto(rows, entity),
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: parseInt(total, 10),
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Sanitize and validate UUID
 * 
 * @param {string} id - UUID to validate
 * @returns {boolean} True if valid UUID v4
 */
export function isValidUuid(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Mass assignment protection - filter allowed fields
 * 
 * @param {Object} data - Input data
 * @param {string[]} allowedFields - Whitelist of allowed field names (snake_case)
 * @returns {Object} Filtered data
 */
export function filterAllowedFields(data, allowedFields) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const result = {};
  for (const field of allowedFields) {
    if (field in data) {
      result[field] = data[field];
    }
  }
  return result;
}

/**
 * Allowed fields for mass assignment protection by entity
 */
export const ALLOWED_FIELDS = {
  jobs: [
    'workspace_id', 'title', 'department', 'location', 'employment_type',
    'experience_level', 'remote_policy', 'is_remote', 'description',
    'requirements', 'responsibilities', 'benefits', 'salary_min',
    'salary_max', 'salary_currency', 'status', 'is_public', 'public_slug',
    'public_portal_settings', 'flow_template_id', 'hiring_manager_id',
  ],
  candidates: [
    'first_name', 'last_name', 'email', 'phone_number', 'linkedin_url',
    'portfolio_url', 'resume_url', 'cover_letter_url', 'current_company',
    'current_position', 'years_of_experience', 'skills', 'education',
    'expected_salary', 'notice_period', 'is_available', 'preferred_locations',
    'work_authorization', 'notes', 'tags', 'status',
  ],
  applications: [
    'job_id', 'candidate_id', 'source_channel', 'referrer_id',
    'cover_letter', 'answers', 'status', 'stage_id', 'notes',
    'rejection_reason',
  ],
  interviews: [
    'application_id', 'interview_type', 'scheduled_at', 'duration_minutes',
    'location', 'meeting_link', 'meeting_id', 'meeting_password',
    'interviewer_notes', 'technical_notes', 'status', 'overall_rating',
    'technical_rating', 'communication_rating', 'cultural_fit_rating',
    'recommendation', 'feedback',
  ],
};

export default {
  mapDbToApi,
  mapApiToDb,
  mapToListDto,
  mapToDetailDto,
  mapJobWithStatsDto,
  mapCandidateWithApplicationsDto,
  mapSearchResultsDto,
  isValidUuid,
  filterAllowedFields,
  ALLOWED_FIELDS,
};
