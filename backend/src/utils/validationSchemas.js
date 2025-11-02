/**
 * Validation schemas for all API endpoints
 * Uses Joi with custom extensions for comprehensive input validation
 */

import Joi from '../utils/joiExtensions.js';

// ============================================================================
// COMMON/REUSABLE SCHEMAS
// ============================================================================

export const commonSchemas = {
  // UUID v4
  uuid: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Must be a valid UUID',
    }),
  
  // Email
  email: Joi.string()
    .email({ tlds: { allow: false } }) // Allow all TLDs
    .lowercase()
    .trim()
    .max(255)
    .required()
    .messages({
      'string.email': 'Must be a valid email address',
      'string.max': 'Email must not exceed 255 characters',
    }),
  
  // Password (strong requirements)
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
  
  // Phone number (international format)
  phone: Joi.phoneNumber()
    .required()
    .messages({
      'any.required': 'Phone number is required',
    }),
  
  // URL
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(2048)
    .trim()
    .messages({
      'string.uri': 'Must be a valid URL',
      'string.max': 'URL must not exceed 2048 characters',
    }),
  
  // Date (ISO 8601)
  date: Joi.date()
    .iso()
    .messages({
      'date.format': 'Must be a valid ISO 8601 date',
    }),
  
  // Username
  username: Joi.username()
    .required()
    .messages({
      'any.required': 'Username is required',
    }),
  
  // Slug
  slug: Joi.slug()
    .required()
    .messages({
      'any.required': 'Slug is required',
    }),
  
  // Safe text (no XSS/SQL injection)
  safeText: Joi.safeString()
    .trim()
    .max(5000)
    .messages({
      'string.max': 'Text must not exceed 5000 characters',
    }),
  
  // Name fields
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z\s\-'.]+$/)
    .messages({
      'string.min': 'Name must not be empty',
      'string.max': 'Name must not exceed 100 characters',
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
    }),
  
  // Pagination
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  },
  
  // Search query
  searchQuery: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .messages({
      'string.min': 'Search query must not be empty',
      'string.max': 'Search query must not exceed 200 characters',
    }),
  
  // Status filters
  status: Joi.string()
    .valid('active', 'inactive', 'pending', 'archived')
    .messages({
      'any.only': 'Status must be one of: active, inactive, pending, archived',
    }),
};

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

export const authSchemas = {
  // Register
  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords must match',
      }),
    firstName: commonSchemas.name.required(),
    lastName: commonSchemas.name.required(),
    organizationName: Joi.string()
      .trim()
      .min(2)
      .max(200)
      .required()
      .messages({
        'string.min': 'Organization name must be at least 2 characters',
        'string.max': 'Organization name must not exceed 200 characters',
      }),
    phone: commonSchemas.phone.optional(),
    termsAccepted: Joi.boolean()
      .valid(true)
      .required()
      .messages({
        'any.only': 'You must accept the terms and conditions',
      }),
  }),
  
  // Login
  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),
  
  // Request password reset
  requestPasswordReset: Joi.object({
    email: commonSchemas.email,
  }),
  
  // Reset password
  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: commonSchemas.password,
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords must match',
      }),
  }),
  
  // Change password
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password,
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Passwords must match',
      }),
  }),
};

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const userSchemas = {
  // Create user
  create: Joi.object({
    email: commonSchemas.email,
    firstName: commonSchemas.name.required(),
    lastName: commonSchemas.name.required(),
    phone: commonSchemas.phone.optional(),
    role: Joi.string()
      .valid('admin', 'recruiter', 'hiring_manager', 'interviewer')
      .required()
      .messages({
        'any.only': 'Role must be one of: admin, recruiter, hiring_manager, interviewer',
      }),
    workspaceIds: Joi.array()
      .items(commonSchemas.uuid)
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one workspace must be assigned',
      }),
  }),
  
  // Update user
  update: Joi.object({
    firstName: commonSchemas.name.optional(),
    lastName: commonSchemas.name.optional(),
    phone: commonSchemas.phone.optional(),
    role: Joi.string()
      .valid('admin', 'recruiter', 'hiring_manager', 'interviewer')
      .optional(),
    workspaceIds: Joi.array().items(commonSchemas.uuid).optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
  
  // User preferences
  updatePreferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'auto').optional(),
    language: Joi.string().valid('en', 'es', 'fr', 'de').optional(),
    timezone: Joi.string().optional(),
    emailNotifications: Joi.boolean().optional(),
    pushNotifications: Joi.boolean().optional(),
  }).min(1),
};

// ============================================================================
// ORGANIZATION SCHEMAS
// ============================================================================

export const organizationSchemas = {
  // Update organization
  update: Joi.object({
    name: Joi.string().trim().min(2).max(200).optional(),
    website: commonSchemas.url.optional(),
    industry: Joi.string().trim().max(100).optional(),
    size: Joi.string()
      .valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')
      .optional(),
    logo: commonSchemas.url.optional(),
    description: Joi.string().trim().max(1000).optional(),
    address: Joi.object({
      street: Joi.string().trim().max(200).optional(),
      city: Joi.string().trim().max(100).optional(),
      state: Joi.string().trim().max(100).optional(),
      postalCode: Joi.string().trim().max(20).optional(),
      country: Joi.string().trim().max(100).optional(),
    }).optional(),
    settings: Joi.object({
      allowPublicApplications: Joi.boolean().optional(),
      requireApprovalForJobs: Joi.boolean().optional(),
      defaultJobVisibility: Joi.string().valid('public', 'private').optional(),
    }).optional(),
  }).min(1),
};

// ============================================================================
// WORKSPACE SCHEMAS
// ============================================================================

export const workspaceSchemas = {
  // Create workspace
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().trim().max(500).optional(),
    settings: Joi.object({
      allowCandidateImport: Joi.boolean().optional(),
      requireApprovalForApplications: Joi.boolean().optional(),
      defaultInterviewDuration: Joi.number().integer().min(15).max(480).optional(),
    }).optional(),
  }),
  
  // Update workspace
  update: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    description: Joi.string().trim().max(500).optional(),
    isActive: Joi.boolean().optional(),
    settings: Joi.object({
      allowCandidateImport: Joi.boolean().optional(),
      requireApprovalForApplications: Joi.boolean().optional(),
      defaultInterviewDuration: Joi.number().integer().min(15).max(480).optional(),
    }).optional(),
  }).min(1),
};

// ============================================================================
// JOB SCHEMAS
// ============================================================================

export const jobSchemas = {
  // Create job
  create: Joi.object({
    title: Joi.string().trim().min(3).max(200).required(),
    description: commonSchemas.safeText.required(),
    department: Joi.string().trim().max(100).optional(),
    location: Joi.string().trim().max(200).required(),
    employmentType: Joi.string()
      .valid('full-time', 'part-time', 'contract', 'internship', 'temporary')
      .required(),
    experienceLevel: Joi.string()
      .valid('entry', 'mid', 'senior', 'lead', 'executive')
      .required(),
    salaryRange: Joi.object({
      min: Joi.number().integer().min(0).optional(),
      max: Joi.number().integer().min(0).optional(),
      currency: Joi.string().length(3).uppercase().default('USD'),
    }).optional(),
    requirements: Joi.array().items(Joi.string().trim().max(500)).max(20).optional(),
    responsibilities: Joi.array().items(Joi.string().trim().max(500)).max(20).optional(),
    benefits: Joi.array().items(Joi.string().trim().max(500)).max(20).optional(),
    skills: Joi.array().items(Joi.string().trim().max(50)).max(30).optional(),
    workspaceId: commonSchemas.uuid,
    hiringManagerId: commonSchemas.uuid.optional(),
    isRemote: Joi.boolean().default(false),
    status: Joi.string()
      .valid('draft', 'open', 'closed', 'on-hold')
      .default('draft'),
  }),
  
  // Update job
  update: Joi.object({
    title: Joi.string().trim().min(3).max(200).optional(),
    description: commonSchemas.safeText.optional(),
    department: Joi.string().trim().max(100).optional(),
    location: Joi.string().trim().max(200).optional(),
    employmentType: Joi.string()
      .valid('full-time', 'part-time', 'contract', 'internship', 'temporary')
      .optional(),
    experienceLevel: Joi.string()
      .valid('entry', 'mid', 'senior', 'lead', 'executive')
      .optional(),
    salaryRange: Joi.object({
      min: Joi.number().integer().min(0).optional(),
      max: Joi.number().integer().min(0).optional(),
      currency: Joi.string().length(3).uppercase().optional(),
    }).optional(),
    requirements: Joi.array().items(Joi.string().trim().max(500)).max(20).optional(),
    responsibilities: Joi.array().items(Joi.string().trim().max(500)).max(20).optional(),
    benefits: Joi.array().items(Joi.string().trim().max(500)).max(20).optional(),
    skills: Joi.array().items(Joi.string().trim().max(50)).max(30).optional(),
    hiringManagerId: commonSchemas.uuid.optional(),
    isRemote: Joi.boolean().optional(),
    status: Joi.string()
      .valid('draft', 'open', 'closed', 'on-hold')
      .optional(),
  }).min(1),
  
  // Job search/filter
  search: Joi.object({
    query: commonSchemas.searchQuery.optional(),
    department: Joi.string().trim().max(100).optional(),
    location: Joi.string().trim().max(200).optional(),
    employmentType: Joi.string()
      .valid('full-time', 'part-time', 'contract', 'internship', 'temporary')
      .optional(),
    experienceLevel: Joi.string()
      .valid('entry', 'mid', 'senior', 'lead', 'executive')
      .optional(),
    isRemote: Joi.boolean().optional(),
    status: Joi.string()
      .valid('draft', 'open', 'closed', 'on-hold')
      .optional(),
    ...commonSchemas.pagination,
  }),
};

// ============================================================================
// CANDIDATE SCHEMAS
// ============================================================================

export const candidateSchemas = {
  // Create candidate
  create: Joi.object({
    firstName: commonSchemas.name.required(),
    lastName: commonSchemas.name.required(),
    email: commonSchemas.email,
    phone: commonSchemas.phone.optional(),
    location: Joi.string().trim().max(200).optional(),
    linkedin: commonSchemas.url.optional(),
    portfolio: commonSchemas.url.optional(),
    resume: commonSchemas.url.optional(),
    coverLetter: commonSchemas.safeText.optional(),
    skills: Joi.array().items(Joi.string().trim().max(50)).max(30).optional(),
    experience: Joi.array().items(Joi.object({
      title: Joi.string().trim().max(200).required(),
      company: Joi.string().trim().max(200).required(),
      startDate: commonSchemas.date.required(),
      endDate: commonSchemas.date.optional(),
      current: Joi.boolean().default(false),
      description: Joi.string().trim().max(1000).optional(),
    })).max(20).optional(),
    education: Joi.array().items(Joi.object({
      degree: Joi.string().trim().max(200).required(),
      institution: Joi.string().trim().max(200).required(),
      startDate: commonSchemas.date.required(),
      endDate: commonSchemas.date.optional(),
      current: Joi.boolean().default(false),
    })).max(10).optional(),
    workspaceId: commonSchemas.uuid,
  }),
  
  // Update candidate
  update: Joi.object({
    firstName: commonSchemas.name.optional(),
    lastName: commonSchemas.name.optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone.optional(),
    location: Joi.string().trim().max(200).optional(),
    linkedin: commonSchemas.url.optional(),
    portfolio: commonSchemas.url.optional(),
    resume: commonSchemas.url.optional(),
    coverLetter: commonSchemas.safeText.optional(),
    skills: Joi.array().items(Joi.string().trim().max(50)).max(30).optional(),
    experience: Joi.array().items(Joi.object({
      title: Joi.string().trim().max(200).required(),
      company: Joi.string().trim().max(200).required(),
      startDate: commonSchemas.date.required(),
      endDate: commonSchemas.date.optional(),
      current: Joi.boolean().default(false),
      description: Joi.string().trim().max(1000).optional(),
    })).max(20).optional(),
    education: Joi.array().items(Joi.object({
      degree: Joi.string().trim().max(200).required(),
      institution: Joi.string().trim().max(200).required(),
      startDate: commonSchemas.date.required(),
      endDate: commonSchemas.date.optional(),
      current: Joi.boolean().default(false),
    })).max(10).optional(),
  }).min(1),
  
  // Search candidates
  search: Joi.object({
    query: commonSchemas.searchQuery.optional(),
    skills: Joi.array().items(Joi.string().trim().max(50)).optional(),
    location: Joi.string().trim().max(200).optional(),
    experienceYears: Joi.object({
      min: Joi.number().integer().min(0).optional(),
      max: Joi.number().integer().min(0).optional(),
    }).optional(),
    ...commonSchemas.pagination,
  }),
};

// ============================================================================
// APPLICATION SCHEMAS
// ============================================================================

export const applicationSchemas = {
  // Submit application (public endpoint)
  submit: Joi.object({
    jobId: commonSchemas.uuid,
    firstName: commonSchemas.name.required(),
    lastName: commonSchemas.name.required(),
    email: commonSchemas.email,
    phone: commonSchemas.phone.required(),
    resume: commonSchemas.url.required(),
    coverLetter: commonSchemas.safeText.optional(),
    linkedin: commonSchemas.url.optional(),
    portfolio: commonSchemas.url.optional(),
    answers: Joi.array().items(Joi.object({
      questionId: commonSchemas.uuid,
      answer: commonSchemas.safeText.required(),
    })).optional(),
  }),
  
  // Update application status
  updateStatus: Joi.object({
    status: Joi.string()
      .valid('new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn')
      .required(),
    notes: commonSchemas.safeText.optional(),
  }),
  
  // Add note to application
  addNote: Joi.object({
    content: commonSchemas.safeText.required(),
    isPrivate: Joi.boolean().default(true),
  }),
};

// ============================================================================
// INTERVIEW SCHEMAS
// ============================================================================

export const interviewSchemas = {
  // Schedule interview
  schedule: Joi.object({
    applicationId: commonSchemas.uuid,
    interviewerIds: Joi.array()
      .items(commonSchemas.uuid)
      .min(1)
      .required(),
    scheduledAt: commonSchemas.date.required(),
    duration: Joi.number().integer().min(15).max(480).required(),
    location: Joi.string().trim().max(200).optional(),
    meetingLink: commonSchemas.url.optional(),
    notes: commonSchemas.safeText.optional(),
    type: Joi.string()
      .valid('phone', 'video', 'in-person', 'technical', 'behavioral')
      .required(),
  }),
  
  // Update interview
  update: Joi.object({
    scheduledAt: commonSchemas.date.optional(),
    duration: Joi.number().integer().min(15).max(480).optional(),
    location: Joi.string().trim().max(200).optional(),
    meetingLink: commonSchemas.url.optional(),
    notes: commonSchemas.safeText.optional(),
    status: Joi.string()
      .valid('scheduled', 'completed', 'cancelled', 'rescheduled')
      .optional(),
  }).min(1),
  
  // Submit feedback
  submitFeedback: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    technicalSkills: Joi.number().integer().min(1).max(5).optional(),
    communication: Joi.number().integer().min(1).max(5).optional(),
    cultureFit: Joi.number().integer().min(1).max(5).optional(),
    feedback: commonSchemas.safeText.required(),
    recommendation: Joi.string()
      .valid('strong-yes', 'yes', 'maybe', 'no', 'strong-no')
      .required(),
  }),
};

// Export all schemas
export default {
  common: commonSchemas,
  auth: authSchemas,
  user: userSchemas,
  organization: organizationSchemas,
  workspace: workspaceSchemas,
  job: jobSchemas,
  candidate: candidateSchemas,
  application: applicationSchemas,
  interview: interviewSchemas,
};
