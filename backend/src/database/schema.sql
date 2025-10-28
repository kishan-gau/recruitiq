-- ============================================================================
-- RecruitIQ Database Schema
-- Single source of truth for database structure
-- Last updated: 2025-10-26
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop all tables (for clean reset)
DROP TABLE IF EXISTS communications CASCADE;
DROP TABLE IF EXISTS interview_interviewers CASCADE;
DROP TABLE IF EXISTS interviews CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS flow_templates CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  
  -- License & Subscription
  tier VARCHAR(50) NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter', 'professional', 'enterprise')),
  license_key VARCHAR(500),
  license_expires_at TIMESTAMP,
  subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'suspended')),
  subscription_id VARCHAR(255),
  
  -- Limits
  max_users INTEGER DEFAULT 10,
  max_workspaces INTEGER DEFAULT 1,
  max_jobs INTEGER,
  max_candidates INTEGER,
  
  -- Settings
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_tier ON organizations(tier);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Auth
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  
  -- Profile
  name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  phone VARCHAR(50),
  timezone VARCHAR(100) DEFAULT 'UTC',
  
  -- Role & Permissions
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'recruiter', 'member', 'applicant')),
  permissions JSONB DEFAULT '[]',
  
  -- Security
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(50),
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires_at TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- REFRESH TOKENS TABLE
-- ============================================================================
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- ============================================================================
-- WORKSPACES TABLE
-- ============================================================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_workspaces_organization_id ON workspaces(organization_id);

-- ============================================================================
-- WORKSPACE MEMBERS TABLE
-- ============================================================================
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Role in workspace
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  
  -- Metadata
  joined_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);

-- ============================================================================
-- FLOW TEMPLATES TABLE
-- ============================================================================
CREATE TABLE flow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Template Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Stages Definition (array of stage objects)
  stages JSONB NOT NULL,
  
  -- Usage
  is_default BOOLEAN DEFAULT FALSE,
  is_global BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_flow_templates_organization_id ON flow_templates(organization_id);
CREATE INDEX idx_flow_templates_workspace_id ON flow_templates(workspace_id);

-- ============================================================================
-- JOBS TABLE
-- ============================================================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Job Details
  title VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  location VARCHAR(255),
  employment_type VARCHAR(50) CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship', 'temporary')),
  experience_level VARCHAR(50) CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead', 'executive')),
  remote_policy VARCHAR(50) CHECK (remote_policy IN ('onsite', 'hybrid', 'remote')),
  is_remote BOOLEAN DEFAULT FALSE,
  
  -- Description
  description TEXT,
  requirements TEXT, -- Can be JSON array or text
  responsibilities TEXT,
  benefits TEXT, -- Can be JSON array or text
  
  -- Compensation
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency VARCHAR(10) DEFAULT 'USD',
  
  -- Status & Visibility
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paused', 'filled', 'closed', 'archived')),
  is_public BOOLEAN DEFAULT FALSE,
  
  -- Public Portal Settings
  public_slug VARCHAR(255) UNIQUE,
  public_portal_settings JSONB DEFAULT '{
    "companyName": "",
    "companyLogo": "",
    "salaryPublic": false,
    "customFields": []
  }'::jsonb,
  view_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  
  -- Flow Template
  flow_template_id UUID REFERENCES flow_templates(id),
  
  -- Hiring Team
  hiring_manager_id UUID REFERENCES users(id),
  recruiter_id UUID REFERENCES users(id),
  
  -- Dates
  posted_at TIMESTAMP,
  closes_at TIMESTAMP,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_jobs_organization_id ON jobs(organization_id);
CREATE INDEX idx_jobs_workspace_id ON jobs(workspace_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_flow_template_id ON jobs(flow_template_id);
CREATE INDEX idx_jobs_public_slug ON jobs(public_slug);
CREATE INDEX idx_jobs_is_public ON jobs(is_public);

-- ============================================================================
-- CANDIDATES TABLE
-- ============================================================================
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Personal Info
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  name VARCHAR(255), -- Computed field (first_name + last_name)
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  location VARCHAR(255),
  
  -- Professional Info
  current_job_title VARCHAR(255),
  current_company VARCHAR(255),
  
  -- Profile Links
  linkedin_url VARCHAR(500),
  portfolio_url VARCHAR(500),
  resume_url VARCHAR(500),
  
  -- Additional Info
  skills TEXT[],
  experience TEXT,
  education TEXT,
  
  -- Source
  source VARCHAR(100),
  source_details VARCHAR(500),
  
  -- Public Application Fields
  application_source VARCHAR(50) DEFAULT 'manual' CHECK (application_source IN ('manual', 'public-portal', 'referral', 'linkedin', 'indeed', 'other')),
  tracking_code VARCHAR(50) UNIQUE,
  application_data JSONB DEFAULT '{}'::jsonb,
  
  -- Tags & Notes
  tags TEXT[],
  notes TEXT,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_candidates_organization_id ON candidates(organization_id);
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_name ON candidates(first_name, last_name);

-- ============================================================================
-- APPLICATIONS TABLE
-- ============================================================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Tracking Code (unique identifier for applicants)
  tracking_code VARCHAR(50) UNIQUE NOT NULL,
  
  -- Application Status
  status VARCHAR(50) DEFAULT 'applied' CHECK (status IN ('active', 'rejected', 'withdrawn', 'hired')),
  stage VARCHAR(50) DEFAULT 'applied' CHECK (stage IN ('applied', 'screening', 'phone_screen', 'assessment', 'interview', 'offer', 'hired', 'rejected', 'withdrawn')),
  current_stage INTEGER,
  current_stage_name VARCHAR(255),
  
  -- Application Data
  cover_letter TEXT,
  notes TEXT,
  rejection_reason TEXT,
  
  -- Metadata
  applied_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX idx_applications_organization_id ON applications(organization_id);
CREATE INDEX idx_applications_workspace_id ON applications(workspace_id);
CREATE INDEX idx_applications_tracking_code ON applications(tracking_code);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_stage ON applications(stage);

-- ============================================================================
-- INTERVIEWS TABLE
-- ============================================================================
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  
  -- Interview Details
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('phone', 'video', 'onsite', 'technical', 'behavioral', 'panel')),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show')),
  
  -- Scheduling
  scheduled_at TIMESTAMP,
  duration_minutes INTEGER,
  duration INTEGER, -- alias for duration_minutes
  location VARCHAR(500),
  meeting_link VARCHAR(500),
  
  -- Notes
  notes TEXT,
  
  -- Feedback
  feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  recommendation VARCHAR(50),
  strengths TEXT,
  weaknesses TEXT,
  technical_skills JSONB,
  culture_fit INTEGER CHECK (culture_fit >= 1 AND culture_fit <= 5),
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_interviews_application_id ON interviews(application_id);
CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at);

-- ============================================================================
-- INTERVIEW INTERVIEWERS (Junction Table)
-- ============================================================================
CREATE TABLE interview_interviewers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(interview_id, user_id)
);

CREATE INDEX idx_interview_interviewers_interview_id ON interview_interviewers(interview_id);
CREATE INDEX idx_interview_interviewers_user_id ON interview_interviewers(user_id);

-- ============================================================================
-- COMMUNICATIONS TABLE
-- ============================================================================
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  
  -- Message Details
  from_type VARCHAR(20) CHECK (from_type IN ('recruiter', 'candidate', 'system')),
  from_user_id UUID REFERENCES users(id), -- NULL for candidate messages
  from_candidate_id UUID REFERENCES candidates(id), -- NULL for recruiter/system messages
  
  message_type VARCHAR(50) CHECK (message_type IN ('status-update', 'interview-invite', 'document-request', 'general', 'rejection', 'offer')),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  
  -- Visibility
  is_public BOOLEAN DEFAULT TRUE, -- Visible to candidate on tracking page
  
  -- Attachments (stored as JSONB array of file metadata)
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Read Status
  read_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_communications_application_id ON communications(application_id);
CREATE INDEX idx_communications_from_type ON communications(from_type);
CREATE INDEX idx_communications_created_at ON communications(created_at);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant all privileges to the database user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
