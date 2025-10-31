-- ============================================================================
-- RecruitIQ Database Schema
-- Single source of truth for database structure
-- Last updated: 2025-10-28
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

-- Drop central logging tables
DROP TABLE IF EXISTS security_alerts CASCADE;
DROP TABLE IF EXISTS security_events CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;

-- Drop deployment tables
DROP TABLE IF EXISTS instance_deployments CASCADE;
DROP TABLE IF EXISTS vps_instances CASCADE;

-- Drop views
DROP VIEW IF EXISTS active_threats CASCADE;
DROP VIEW IF EXISTS security_summary_by_tenant CASCADE;
DROP VIEW IF EXISTS recent_errors_by_tenant CASCADE;

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
  
  -- Deployment Configuration
  deployment_model VARCHAR(50) NOT NULL DEFAULT 'shared' CHECK (deployment_model IN ('shared', 'dedicated')),
  vps_id UUID,  -- References vps_instances(id), added later with FK
  
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
CREATE INDEX idx_organizations_deployment ON organizations(deployment_model);

-- ============================================================================
-- PERMISSIONS TABLE - Define all available system permissions
-- ============================================================================
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Permission details
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_name ON permissions(name);

COMMENT ON TABLE permissions IS 'System-wide permissions for granular access control';
COMMENT ON COLUMN permissions.name IS 'Unique permission identifier (e.g., "license.create", "vps.provision")';
COMMENT ON COLUMN permissions.category IS 'Permission category (e.g., "license", "portal", "security", "vps")';

-- ============================================================================
-- ROLES TABLE - Define platform-level and tenant-level roles
-- ============================================================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Role details
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Role type
  role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('platform', 'tenant')),
  
  -- Role level
  level INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_type ON roles(role_type);

COMMENT ON TABLE roles IS 'System roles with hierarchical levels';
COMMENT ON COLUMN roles.role_type IS 'Platform roles for admin panel/license manager, Tenant roles for RecruitIQ instances';
COMMENT ON COLUMN roles.level IS 'Role hierarchy level - higher numbers have more privileges';

-- ============================================================================
-- ROLE_PERMISSIONS TABLE - Map permissions to roles
-- ============================================================================
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
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
  
  -- Platform vs Tenant User
  user_type VARCHAR(20) NOT NULL DEFAULT 'tenant' CHECK (user_type IN ('platform', 'tenant')),
  
  -- Role & Permissions
  role_id UUID REFERENCES roles(id),
  
  -- Legacy role field (for backward compatibility, will be deprecated)
  legacy_role VARCHAR(50) CHECK (legacy_role IN ('owner', 'admin', 'recruiter', 'member', 'applicant', 'platform_admin', 'security_admin')),
  
  -- Additional permissions beyond role (if needed)
  additional_permissions UUID[] DEFAULT '{}',
  
  -- Security
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(50),
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires_at TIMESTAMP,
  
  -- MFA (Multi-Factor Authentication)
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  mfa_backup_codes TEXT[],
  mfa_backup_codes_used INTEGER DEFAULT 0,
  mfa_enabled_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT check_tenant_user_has_org CHECK (
    (user_type = 'tenant' AND organization_id IS NOT NULL) OR 
    (user_type = 'platform' AND organization_id IS NULL)
  )
);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_legacy_role ON users(legacy_role);

COMMENT ON TABLE users IS 'Unified users table for both platform admins and tenant users';
COMMENT ON COLUMN users.user_type IS 'Platform users access admin panel/license manager, Tenant users access RecruitIQ instances';
COMMENT ON COLUMN users.organization_id IS 'NULL for platform users, set for tenant users';
COMMENT ON COLUMN users.role_id IS 'References roles table for RBAC';
COMMENT ON COLUMN users.legacy_role IS 'Deprecated - for backward compatibility only';
COMMENT ON COLUMN users.additional_permissions IS 'Array of permission IDs for user-specific permissions beyond their role';

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
-- CENTRAL LOGGING TABLES (for cloud instances)
-- ============================================================================

-- System Logs Table
CREATE TABLE system_logs (
  id BIGSERIAL PRIMARY KEY,
  
  -- Timestamp
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Log details
  level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  
  -- Multi-tenant/instance identification
  tenant_id VARCHAR(50) NOT NULL,
  instance_id VARCHAR(50),
  
  -- Request context
  request_id VARCHAR(50),
  user_id UUID,
  ip_address INET,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  
  -- Error details
  error_stack TEXT,
  error_code VARCHAR(50),
  
  -- Additional metadata
  metadata JSONB
);

CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX idx_system_logs_tenant_id ON system_logs(tenant_id);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_request_id ON system_logs(request_id);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_tenant_timestamp ON system_logs(tenant_id, timestamp DESC);
CREATE INDEX idx_system_logs_metadata ON system_logs USING GIN (metadata);

COMMENT ON TABLE system_logs IS 'Centralized system logs from all cloud instances';
COMMENT ON COLUMN system_logs.tenant_id IS 'Identifier for the cloud tenant (for multi-tenant SaaS)';
COMMENT ON COLUMN system_logs.instance_id IS 'Identifier for the cloud instance (if multiple regions/instances)';

-- Security Events Table
CREATE TABLE security_events (
  id BIGSERIAL PRIMARY KEY,
  
  -- Timestamp
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Event details
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  description TEXT,
  
  -- Multi-tenant/instance identification
  tenant_id VARCHAR(50) NOT NULL,
  instance_id VARCHAR(50),
  
  -- User/source information
  user_id UUID,
  username VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  
  -- Additional metadata
  metadata JSONB,
  
  -- Alert information
  alert_sent BOOLEAN DEFAULT FALSE,
  alert_channels TEXT[]
);

CREATE INDEX idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX idx_security_events_tenant_id ON security_events(tenant_id);
CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX idx_security_events_tenant_timestamp ON security_events(tenant_id, timestamp DESC);
CREATE INDEX idx_security_events_severity_timestamp ON security_events(severity, timestamp DESC);
CREATE INDEX idx_security_events_metadata ON security_events USING GIN (metadata);

COMMENT ON TABLE security_events IS 'Security events tracked across all cloud instances';
COMMENT ON COLUMN security_events.alert_sent IS 'Whether an alert was sent for this event';

-- Security Alerts Table
CREATE TABLE security_alerts (
  id BIGSERIAL PRIMARY KEY,
  
  -- Timestamp
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Alert details
  alert_id VARCHAR(100) UNIQUE NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  
  -- Source
  tenant_id VARCHAR(50) NOT NULL,
  instance_id VARCHAR(50),
  
  -- Related event
  security_event_id BIGINT REFERENCES security_events(id),
  
  -- Alert delivery
  channels_sent TEXT[],
  delivery_status JSONB,
  
  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by UUID,
  resolution_notes TEXT,
  
  -- Metadata
  metadata JSONB
);

CREATE INDEX idx_security_alerts_timestamp ON security_alerts(timestamp DESC);
CREATE INDEX idx_security_alerts_tenant_id ON security_alerts(tenant_id);
CREATE INDEX idx_security_alerts_alert_type ON security_alerts(alert_type);
CREATE INDEX idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_security_alerts_resolved ON security_alerts(resolved);

COMMENT ON TABLE security_alerts IS 'Security alerts generated and sent to administrators';
COMMENT ON COLUMN security_alerts.delivery_status IS 'JSON object tracking delivery status for each channel';

-- Log Retention Function
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- Delete system logs older than 90 days
  DELETE FROM system_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Delete security events older than 1 year (keep longer for compliance)
  DELETE FROM security_events
  WHERE timestamp < NOW() - INTERVAL '1 year'
  AND severity NOT IN ('critical', 'error');
  
  -- Delete resolved alerts older than 6 months
  DELETE FROM security_alerts
  WHERE timestamp < NOW() - INTERVAL '6 months'
  AND resolved = TRUE;
  
  RAISE NOTICE 'Old logs cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

-- Views for Common Queries
CREATE OR REPLACE VIEW recent_errors_by_tenant AS
SELECT 
  tenant_id,
  COUNT(*) as error_count,
  MAX(timestamp) as last_error,
  array_agg(DISTINCT error_code) as error_codes
FROM system_logs
WHERE level = 'error'
AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY tenant_id;

CREATE OR REPLACE VIEW security_summary_by_tenant AS
SELECT 
  tenant_id,
  event_type,
  severity,
  COUNT(*) as event_count,
  MAX(timestamp) as last_occurrence
FROM security_events
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY tenant_id, event_type, severity;

CREATE OR REPLACE VIEW active_threats AS
SELECT 
  a.*,
  e.ip_address,
  e.username,
  e.metadata as event_metadata
FROM security_alerts a
LEFT JOIN security_events e ON a.security_event_id = e.id
WHERE a.resolved = FALSE
AND a.severity IN ('critical', 'error')
ORDER BY a.timestamp DESC;

-- ============================================================================
-- VPS INSTANCES TABLE
-- ============================================================================
CREATE TABLE vps_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- VPS identification
  vps_name VARCHAR(255) NOT NULL UNIQUE,
  vps_ip VARCHAR(50) NOT NULL,
  hostname VARCHAR(255),
  
  -- VPS type
  deployment_type VARCHAR(20) NOT NULL CHECK (deployment_type IN ('shared', 'dedicated')),
  
  -- Dedicated VPS links to one organization
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Location & Provider
  location VARCHAR(100),
  provider VARCHAR(50) DEFAULT 'transip',
  
  -- Specs
  cpu_cores INTEGER,
  memory_mb INTEGER,
  disk_gb INTEGER,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active' 
    CHECK (status IN ('provisioning', 'active', 'maintenance', 'offline', 'decommissioned')),
  
  -- Capacity management (for shared VPS)
  max_tenants INTEGER DEFAULT 20,
  current_tenants INTEGER DEFAULT 0,
  
  -- Resource usage metrics (updated periodically)
  cpu_usage_percent DECIMAL(5,2),
  memory_usage_percent DECIMAL(5,2),
  disk_usage_percent DECIMAL(5,2),
  last_health_check TIMESTAMP,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vps_deployment_type ON vps_instances(deployment_type);
CREATE INDEX idx_vps_status ON vps_instances(status);
CREATE INDEX idx_vps_organization ON vps_instances(organization_id);

-- Add foreign key to organizations table
ALTER TABLE organizations 
  ADD CONSTRAINT fk_organizations_vps 
  FOREIGN KEY (vps_id) REFERENCES vps_instances(id) ON DELETE SET NULL;

CREATE INDEX idx_organizations_vps ON organizations(vps_id);

-- ============================================================================
-- INSTANCE DEPLOYMENTS TABLE
-- ============================================================================
CREATE TABLE instance_deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Deployment configuration
  deployment_model VARCHAR(20) NOT NULL CHECK (deployment_model IN ('shared', 'dedicated')),
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'provisioning',
  -- Statuses: provisioning, creating_vps, configuring, active, failed, paused, deleted
  
  -- Instance details
  subdomain VARCHAR(100) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  
  -- VPS reference
  vps_id UUID REFERENCES vps_instances(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Error handling
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_deployments_org ON instance_deployments(organization_id);
CREATE INDEX idx_deployments_status ON instance_deployments(status);
CREATE INDEX idx_deployments_vps ON instance_deployments(vps_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant all privileges to the database user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
