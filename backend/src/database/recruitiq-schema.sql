-- ================================================================
-- RECRUITIQ DATABASE SCHEMA
-- Applicant Tracking System (ATS) schema for RecruitIQ Platform
-- 
-- Schema: public (uses shared organizations and hris.user_account)
-- Tables: workspaces, flow_templates, jobs, candidates, applications, 
--         interviews, interview_interviewers, communications
-- Features: Multi-workspace recruiting, customizable hiring flows,
--           job postings, candidate management, applications tracking,
--           interview scheduling, communications
-- 
-- Version: 1.0.0
-- Created: November 9, 2025 - Auth Refactoring Phase 1
-- Note: References hris.user_account for tenant users, not platform_users
-- ================================================================

-- ============================================================================
-- WORKSPACES TABLE - Multi-tenant workspace organization
-- ============================================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Workspace Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) NOT NULL,
  
  -- Settings
  settings JSONB DEFAULT '{
    "branding": {},
    "workflow": {},
    "notifications": {}
  }'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_by UUID REFERENCES hris.user_account(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT unique_workspace_slug_per_org UNIQUE (organization_id, slug)
);

CREATE INDEX idx_workspaces_organization_id ON workspaces(organization_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_is_active ON workspaces(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE workspaces IS 'Recruiting workspaces for organizing jobs and hiring teams within an organization';
COMMENT ON COLUMN workspaces.slug IS 'URL-friendly identifier for workspace';
COMMENT ON COLUMN workspaces.created_by IS 'Tenant user who created the workspace (from hris.user_account)';

-- ============================================================================
-- FLOW TEMPLATES TABLE - Customizable hiring process templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS flow_templates (
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
  created_by UUID REFERENCES hris.user_account(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_flow_templates_organization_id ON flow_templates(organization_id);
CREATE INDEX idx_flow_templates_workspace_id ON flow_templates(workspace_id);
CREATE INDEX idx_flow_templates_is_default ON flow_templates(is_default) WHERE deleted_at IS NULL;

COMMENT ON TABLE flow_templates IS 'Reusable hiring process templates with customizable stages';
COMMENT ON COLUMN flow_templates.stages IS 'JSONB array of stage objects: [{"name": "Screening", "order": 1, "type": "review"}]';
COMMENT ON COLUMN flow_templates.created_by IS 'Tenant user who created the template (from hris.user_account)';

-- ============================================================================
-- JOBS TABLE - Job postings and openings
-- ============================================================================
CREATE TABLE IF NOT EXISTS jobs (
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
  hiring_manager_id UUID REFERENCES hris.user_account(id),
  recruiter_id UUID REFERENCES hris.user_account(id),
  
  -- Dates
  posted_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES hris.user_account(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_organization_id ON jobs(organization_id);
CREATE INDEX idx_jobs_workspace_id ON jobs(workspace_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_flow_template_id ON jobs(flow_template_id);
CREATE INDEX idx_jobs_public_slug ON jobs(public_slug);
CREATE INDEX idx_jobs_is_public ON jobs(is_public);
CREATE INDEX idx_jobs_hiring_manager ON jobs(hiring_manager_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_recruiter ON jobs(recruiter_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE jobs IS 'Job postings and openings for recruitment';
COMMENT ON COLUMN jobs.hiring_manager_id IS 'Tenant user managing hiring for this job (from hris.user_account)';
COMMENT ON COLUMN jobs.recruiter_id IS 'Tenant user recruiting for this job (from hris.user_account)';
COMMENT ON COLUMN jobs.public_slug IS 'URL-friendly identifier for public job portal';

-- ============================================================================
-- CANDIDATES TABLE - Candidate profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidates (
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
  created_by UUID REFERENCES hris.user_account(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT unique_candidate_email_per_org UNIQUE (email, organization_id)
);

CREATE INDEX idx_candidates_organization_id ON candidates(organization_id);
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_name ON candidates(first_name, last_name);
CREATE INDEX idx_candidates_tracking_code ON candidates(tracking_code);

COMMENT ON TABLE candidates IS 'Candidate profiles and contact information';
COMMENT ON COLUMN candidates.created_by IS 'Tenant user who added the candidate (from hris.user_account)';
COMMENT ON COLUMN candidates.tracking_code IS 'Unique code for candidate to track applications on public portal';

-- ============================================================================
-- APPLICATIONS TABLE - Job applications from candidates
-- ============================================================================
CREATE TABLE IF NOT EXISTS applications (
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
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX idx_applications_organization_id ON applications(organization_id);
CREATE INDEX idx_applications_workspace_id ON applications(workspace_id);
CREATE INDEX idx_applications_tracking_code ON applications(tracking_code);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_stage ON applications(stage);

COMMENT ON TABLE applications IS 'Job applications linking candidates to jobs';
COMMENT ON COLUMN applications.tracking_code IS 'Unique code for applicants to track their application status';
COMMENT ON COLUMN applications.stage IS 'Current hiring pipeline stage';

-- ============================================================================
-- INTERVIEWS TABLE - Interview scheduling and feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  
  -- Interview Details
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('phone', 'video', 'onsite', 'technical', 'behavioral', 'panel')),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show')),
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
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
  created_by UUID REFERENCES hris.user_account(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_interviews_application_id ON interviews(application_id);
CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at);
CREATE INDEX idx_interviews_status ON interviews(status);

COMMENT ON TABLE interviews IS 'Interview scheduling and feedback for applications';
COMMENT ON COLUMN interviews.created_by IS 'Tenant user who scheduled the interview (from hris.user_account)';
COMMENT ON COLUMN interviews.rating IS 'Overall interview rating from 1-5';

-- ============================================================================
-- INTERVIEW INTERVIEWERS - Junction table for interview participants
-- ============================================================================
CREATE TABLE IF NOT EXISTS interview_interviewers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES hris.user_account(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(interview_id, user_id)
);

CREATE INDEX idx_interview_interviewers_interview_id ON interview_interviewers(interview_id);
CREATE INDEX idx_interview_interviewers_user_id ON interview_interviewers(user_id);

COMMENT ON TABLE interview_interviewers IS 'Many-to-many relationship between interviews and interviewers';
COMMENT ON COLUMN interview_interviewers.user_id IS 'Tenant user conducting the interview (from hris.user_account)';

-- ============================================================================
-- COMMUNICATIONS TABLE - Messages between recruiters and candidates
-- ============================================================================
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  
  -- Message Details
  from_type VARCHAR(20) CHECK (from_type IN ('recruiter', 'candidate', 'system')),
  from_user_id UUID REFERENCES hris.user_account(id), -- NULL for candidate messages
  from_candidate_id UUID REFERENCES candidates(id), -- NULL for recruiter/system messages
  
  message_type VARCHAR(50) CHECK (message_type IN ('status-update', 'interview-invite', 'document-request', 'general', 'rejection', 'offer')),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  
  -- Visibility
  is_public BOOLEAN DEFAULT TRUE, -- Visible to candidate on tracking page
  
  -- Attachments (stored as JSONB array of file metadata)
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Read Status
  read_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communications_application_id ON communications(application_id);
CREATE INDEX idx_communications_from_type ON communications(from_type);
CREATE INDEX idx_communications_from_user ON communications(from_user_id) WHERE from_user_id IS NOT NULL;
CREATE INDEX idx_communications_created_at ON communications(created_at);

COMMENT ON TABLE communications IS 'Messages and communications related to applications';
COMMENT ON COLUMN communications.from_user_id IS 'Tenant user sending message (from hris.user_account), NULL for candidate messages';
COMMENT ON COLUMN communications.is_public IS 'Whether message is visible to candidate on public tracking page';

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant Data Isolation at Database Level
-- ================================================================

-- Helper function to get current organization from session variable
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
DECLARE
  org_id TEXT;
BEGIN
  org_id := current_setting('app.current_organization_id', true);
  
  IF org_id IS NULL OR org_id = '' THEN
    RAISE EXCEPTION 'No organization context set. Authentication required.';
  END IF;
  
  RETURN org_id::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid organization context: %', SQLERRM;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_current_organization_id IS 'Returns current organization UUID from session variable set by auth middleware. Throws error if not set.';

-- ================================================================
-- RLS: WORKSPACES
-- ================================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspaces_tenant_isolation ON workspaces
  USING (organization_id = get_current_organization_id());

CREATE POLICY workspaces_tenant_isolation_insert ON workspaces
  FOR INSERT
  WITH CHECK (organization_id = get_current_organization_id());

-- ================================================================
-- RLS: FLOW TEMPLATES
-- ================================================================

ALTER TABLE flow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY flow_templates_tenant_isolation ON flow_templates
  USING (organization_id = get_current_organization_id());

CREATE POLICY flow_templates_tenant_isolation_insert ON flow_templates
  FOR INSERT
  WITH CHECK (organization_id = get_current_organization_id());

-- ================================================================
-- RLS: JOBS
-- ================================================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY jobs_tenant_isolation ON jobs
  USING (organization_id = get_current_organization_id());

CREATE POLICY jobs_tenant_isolation_insert ON jobs
  FOR INSERT
  WITH CHECK (organization_id = get_current_organization_id());

-- ================================================================
-- RLS: CANDIDATES
-- ================================================================

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY candidates_tenant_isolation ON candidates
  USING (organization_id = get_current_organization_id());

CREATE POLICY candidates_tenant_isolation_insert ON candidates
  FOR INSERT
  WITH CHECK (organization_id = get_current_organization_id());

-- ================================================================
-- RLS: APPLICATIONS
-- ================================================================

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY applications_tenant_isolation ON applications
  USING (organization_id = get_current_organization_id());

CREATE POLICY applications_tenant_isolation_insert ON applications
  FOR INSERT
  WITH CHECK (organization_id = get_current_organization_id());

-- ================================================================
-- RLS: INTERVIEWS (via applications relationship)
-- ================================================================

ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY interviews_tenant_isolation ON interviews
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = interviews.application_id
      AND a.organization_id = get_current_organization_id()
    )
  );

CREATE POLICY interviews_tenant_isolation_insert ON interviews
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = interviews.application_id
      AND a.organization_id = get_current_organization_id()
    )
  );

-- ================================================================
-- RLS: INTERVIEW INTERVIEWERS (via interviews relationship)
-- ================================================================

ALTER TABLE interview_interviewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY interview_interviewers_tenant_isolation ON interview_interviewers
  USING (
    EXISTS (
      SELECT 1 FROM interviews i
      JOIN applications a ON a.id = i.application_id
      WHERE i.id = interview_interviewers.interview_id
      AND a.organization_id = get_current_organization_id()
    )
  );

CREATE POLICY interview_interviewers_tenant_isolation_insert ON interview_interviewers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews i
      JOIN applications a ON a.id = i.application_id
      WHERE i.id = interview_interviewers.interview_id
      AND a.organization_id = get_current_organization_id()
    )
  );

-- ================================================================
-- RLS: COMMUNICATIONS (via applications relationship)
-- ================================================================

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY communications_tenant_isolation ON communications
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = communications.application_id
      AND a.organization_id = get_current_organization_id()
    )
  );

CREATE POLICY communications_tenant_isolation_insert ON communications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = communications.application_id
      AND a.organization_id = get_current_organization_id()
    )
  );

-- ================================================================
-- END OF RECRUITIQ SCHEMA
-- ================================================================
