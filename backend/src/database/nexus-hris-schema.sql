-- =====================================================
-- Nexus HRIS Database Schema
-- Enterprise-Grade Implementation
-- Based on Nexus ERD v1.0
-- Product: Nexus (Human Resource Information System)
-- Version: 1.0.0
-- Created: November 6, 2025
-- =====================================================

-- Create HRIS schema
CREATE SCHEMA IF NOT EXISTS hris;

-- =====================================================
-- SECTION 1: USER ACCOUNTS
-- Separate user accounts from employee records
-- =====================================================

-- User Accounts (Login credentials, separate from employee identity)
CREATE TABLE hris.user_account (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Link to employee record (nullable - not all employees have login access)
    -- Note: FK constraint added later after hris.employee table is created
    employee_id UUID,
    
    -- Authentication
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(500),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    
    -- Status
    account_status VARCHAR(50) NOT NULL DEFAULT 'active' 
        CHECK (account_status IN ('active', 'inactive', 'locked', 'pending_activation')),
    is_active BOOLEAN DEFAULT true,
    
    -- Product Access and Roles
    enabled_products JSONB DEFAULT '["nexus"]', -- Array of enabled product slugs: nexus, paylinq, schedulehub, recruitiq
    product_roles JSONB DEFAULT '{}', -- { "nexus": "admin", "paylinq": "payroll_manager", "schedulehub": "scheduler" }
    
    -- Security
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(50),
    password_changed_at TIMESTAMPTZ,
    password_reset_token VARCHAR(500),
    password_reset_expires_at TIMESTAMPTZ,
    
    -- MFA
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    mfa_backup_codes JSONB DEFAULT '[]',
    mfa_backup_codes_used INTEGER DEFAULT 0,
    mfa_enabled_at TIMESTAMPTZ,
    
    -- Preferences
    preferences JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT unique_email UNIQUE (organization_id, email)
);

COMMENT ON TABLE hris.user_account IS 'Tenant users with login access to product applications (Nexus, PayLinQ, ScheduleHub, RecruitIQ). Linked to employee records but not all employees have user accounts.';
COMMENT ON COLUMN hris.user_account.employee_id IS 'Optional link to hris.employee. Not all employees have login access, and some users (like external contractors) may have accounts without employee records.';
COMMENT ON COLUMN hris.user_account.enabled_products IS 'JSONB array of product slugs this user can access: ["nexus", "paylinq", "schedulehub", "recruitiq"]';
COMMENT ON COLUMN hris.user_account.product_roles IS 'JSONB object mapping product to role: {"nexus": "admin", "paylinq": "payroll_manager", "schedulehub": "scheduler"}';
COMMENT ON COLUMN hris.user_account.email_verified IS 'Whether email has been verified via verification token';
COMMENT ON COLUMN hris.user_account.last_login_ip IS 'IP address of last successful login for security audit';

-- Tenant refresh tokens for session management
CREATE TABLE hris.tenant_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_account_id UUID NOT NULL REFERENCES hris.user_account(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  ip_address VARCHAR(50),
  user_agent VARCHAR(500)
);

CREATE INDEX idx_tenant_refresh_tokens_user ON hris.tenant_refresh_tokens(user_account_id);
CREATE INDEX idx_tenant_refresh_tokens_token ON hris.tenant_refresh_tokens(token);
CREATE INDEX idx_tenant_refresh_tokens_org ON hris.tenant_refresh_tokens(organization_id);
CREATE INDEX idx_tenant_refresh_tokens_expires ON hris.tenant_refresh_tokens(expires_at) WHERE revoked_at IS NULL;

COMMENT ON TABLE hris.tenant_refresh_tokens IS 'Refresh tokens for tenant user sessions. Used to maintain authentication across multiple devices and generate new access tokens.';
COMMENT ON COLUMN hris.tenant_refresh_tokens.user_account_id IS 'The tenant user who owns this refresh token';
COMMENT ON COLUMN hris.tenant_refresh_tokens.organization_id IS 'Organization context for Row Level Security';
COMMENT ON COLUMN hris.tenant_refresh_tokens.token IS 'Hashed refresh token value';
COMMENT ON COLUMN hris.tenant_refresh_tokens.revoked_at IS 'When the token was revoked (logout, password change, etc.)';


CREATE INDEX idx_user_account_org ON hris.user_account(organization_id);
CREATE INDEX idx_user_account_email ON hris.user_account(email);
CREATE INDEX idx_user_account_active ON hris.user_account(is_active) WHERE deleted_at IS NULL;

-- =====================================================
-- SECTION 2: ORGANIZATIONAL STRUCTURE
-- Departments and locations
-- =====================================================

-- Departments
CREATE TABLE hris.department (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Identification
    department_code VARCHAR(50) NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_department_id UUID REFERENCES hris.department(id) ON DELETE SET NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT unique_department_code UNIQUE (organization_id, department_code)
);

CREATE INDEX idx_department_org ON hris.department(organization_id);
CREATE INDEX idx_department_parent ON hris.department(parent_department_id);
CREATE INDEX idx_department_active ON hris.department(is_active) WHERE deleted_at IS NULL;

-- Locations
CREATE TABLE hris.location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Identification
    location_code VARCHAR(50) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    location_type VARCHAR(50) CHECK (location_type IN ('headquarters', 'branch', 'remote', 'warehouse', 'store')),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Contact
    phone VARCHAR(50),
    email VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT unique_location_code UNIQUE (organization_id, location_code)
);

CREATE INDEX idx_location_org ON hris.location(organization_id);
CREATE INDEX idx_location_active ON hris.location(is_active) WHERE deleted_at IS NULL;

-- =====================================================
-- SECTION 3: EMPLOYEE CORE
-- Core employee information
-- =====================================================

CREATE TABLE hris.employee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Link to user account (may be NULL for employees without login)
    user_account_id UUID REFERENCES hris.user_account(id) ON DELETE SET NULL,
    
    -- Identification
    employee_number VARCHAR(50) NOT NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    preferred_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(50),
    nationality VARCHAR(100),
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_relationship VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    
    -- Employment Information
    hire_date DATE NOT NULL,
    termination_date DATE,
    employment_status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (employment_status IN ('active', 'on_leave', 'terminated', 'suspended')),
    employment_type VARCHAR(50) CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary', 'intern')),
    
    -- Organizational Assignment
    department_id UUID REFERENCES hris.department(id) ON DELETE SET NULL,
    location_id UUID REFERENCES hris.location(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    job_title VARCHAR(255),
    
    -- Work Schedule
    work_schedule VARCHAR(50) DEFAULT 'standard',
    fte_percentage DECIMAL(5,2) DEFAULT 100.00,
    
    -- Profile
    profile_photo_url VARCHAR(500),
    bio TEXT,
    skills JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT unique_employee_number UNIQUE (organization_id, employee_number)
);

CREATE INDEX idx_employee_org ON hris.employee(organization_id);
CREATE INDEX idx_employee_user_account ON hris.employee(user_account_id);
CREATE INDEX idx_employee_department ON hris.employee(department_id);
CREATE INDEX idx_employee_manager ON hris.employee(manager_id);
CREATE INDEX idx_employee_status ON hris.employee(employment_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_email ON hris.employee(email);

-- Add FK constraint from user_account to employee (circular reference resolved)
ALTER TABLE hris.user_account
ADD CONSTRAINT fk_user_account_employee
FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE SET NULL;

-- =====================================================
-- SECTION 4: CONTRACT MANAGEMENT
-- Employee contract lifecycle with sequence policies
-- =====================================================

-- Contract Sequence Policies (Define contract renewal/progression rules)
CREATE TABLE hris.contract_sequence_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Identification
    policy_code VARCHAR(50) NOT NULL,
    policy_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    auto_renewal BOOLEAN DEFAULT false,
    notification_days_before_expiry INTEGER DEFAULT 30,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT unique_policy_code UNIQUE (organization_id, policy_code)
);

CREATE INDEX idx_contract_sequence_policy_org ON hris.contract_sequence_policy(organization_id);
CREATE INDEX idx_contract_sequence_policy_active ON hris.contract_sequence_policy(is_active) WHERE deleted_at IS NULL;

-- Contract Sequence Steps (Define progression stages)
CREATE TABLE hris.contract_sequence_step (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_sequence_policy_id UUID NOT NULL REFERENCES hris.contract_sequence_policy(id) ON DELETE CASCADE,
    
    -- Step Definition
    step_order INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('probation', 'fixed_term', 'permanent', 'seasonal')),
    duration_months INTEGER,
    
    -- Next Step
    next_step_id UUID REFERENCES hris.contract_sequence_step(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_contract_sequence_step_policy ON hris.contract_sequence_step(contract_sequence_policy_id);
CREATE INDEX idx_contract_sequence_step_order ON hris.contract_sequence_step(contract_sequence_policy_id, step_order);

-- Contracts (Individual employee contracts)
CREATE TABLE hris.contract (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    
    -- Contract Identification
    contract_number VARCHAR(50) NOT NULL,
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('probation', 'fixed_term', 'permanent', 'seasonal')),
    
    -- Sequence Tracking
    contract_sequence_policy_id UUID REFERENCES hris.contract_sequence_policy(id) ON DELETE SET NULL,
    current_step_id UUID REFERENCES hris.contract_sequence_step(id) ON DELETE SET NULL,
    sequence_number INTEGER DEFAULT 1,
    
    -- Contract Dates
    start_date DATE NOT NULL,
    end_date DATE,
    notice_period_days INTEGER,
    
    -- Contract Details
    job_title VARCHAR(255),
    department_id UUID REFERENCES hris.department(id) ON DELETE SET NULL,
    location_id UUID REFERENCES hris.location(id) ON DELETE SET NULL,
    
    -- Compensation
    salary_amount DECIMAL(15,2),
    salary_currency VARCHAR(10) DEFAULT 'USD',
    salary_frequency VARCHAR(50) CHECK (salary_frequency IN ('hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'annually')),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewed')),
    
    -- Documents
    contract_document_url VARCHAR(500),
    signed_date DATE,
    signed_by_employee BOOLEAN DEFAULT false,
    signed_by_employer BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT unique_contract_number UNIQUE (organization_id, contract_number)
);

CREATE INDEX idx_contract_org ON hris.contract(organization_id);
CREATE INDEX idx_contract_employee ON hris.contract(employee_id);
CREATE INDEX idx_contract_status ON hris.contract(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_dates ON hris.contract(start_date, end_date);

-- =====================================================
-- SECTION 5: PERFORMANCE MANAGEMENT
-- Reviews, goals, and feedback
-- =====================================================

-- Review Templates
CREATE TABLE hris.review_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Template Info
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    review_type VARCHAR(50) CHECK (review_type IN ('annual', 'mid_year', 'probation', 'project', 'continuous')),
    
    -- Configuration
    sections JSONB DEFAULT '[]',  -- Array of section definitions
    rating_scale JSONB DEFAULT '{}',  -- Rating scale configuration
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_review_template_org ON hris.review_template(organization_id);
CREATE INDEX idx_review_template_active ON hris.review_template(is_active) WHERE deleted_at IS NULL;

-- Performance Reviews
CREATE TABLE hris.performance_review (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    template_id UUID REFERENCES hris.review_template(id) ON DELETE SET NULL,
    
    -- Review Period
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    review_type VARCHAR(50) CHECK (review_type IN ('annual', 'mid_year', 'probation', 'project', 'continuous')),
    
    -- Review Content
    responses JSONB DEFAULT '{}',  -- Responses to template sections
    overall_rating DECIMAL(3,2),
    strengths TEXT,
    areas_for_improvement TEXT,
    goals_for_next_period TEXT,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'in_progress', 'submitted', 'approved', 'completed')),
    
    -- Dates
    due_date DATE,
    submitted_date DATE,
    completed_date DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_performance_review_org ON hris.performance_review(organization_id);
CREATE INDEX idx_performance_review_employee ON hris.performance_review(employee_id);
CREATE INDEX idx_performance_review_status ON hris.performance_review(status) WHERE deleted_at IS NULL;

-- Performance Goals
CREATE TABLE hris.performance_goal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    review_id UUID REFERENCES hris.performance_review(id) ON DELETE SET NULL,
    
    -- Goal Details
    goal_title VARCHAR(255) NOT NULL,
    goal_description TEXT,
    goal_category VARCHAR(100),
    
    -- Tracking
    target_date DATE,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    status VARCHAR(50) DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'cancelled', 'deferred')),
    
    -- Measurement
    measurement_criteria TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_performance_goal_org ON hris.performance_goal(organization_id);
CREATE INDEX idx_performance_goal_employee ON hris.performance_goal(employee_id);
CREATE INDEX idx_performance_goal_status ON hris.performance_goal(status) WHERE deleted_at IS NULL;

-- Continuous Feedback
CREATE TABLE hris.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    feedback_provider_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    
    -- Feedback Content
    feedback_type VARCHAR(50) CHECK (feedback_type IN ('praise', 'constructive', 'coaching', 'general')),
    feedback_text TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT false,
    
    -- Context
    related_goal_id UUID REFERENCES hris.performance_goal(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_feedback_org ON hris.feedback(organization_id);
CREATE INDEX idx_feedback_employee ON hris.feedback(employee_id);
CREATE INDEX idx_feedback_provider ON hris.feedback(feedback_provider_id);

-- =====================================================
-- SECTION 6: BENEFITS MANAGEMENT
-- Benefits plans and employee enrollment
-- =====================================================

-- Benefits Plans
CREATE TABLE hris.benefits_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Plan Information
    plan_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) NOT NULL
        CHECK (plan_type IN ('health', 'dental', 'vision', 'life', 'disability', 'retirement', 'other')),
    provider_name VARCHAR(255),
    description TEXT,
    
    -- Coverage
    coverage_level VARCHAR(50) CHECK (coverage_level IN ('employee', 'employee_spouse', 'employee_children', 'family')),
    
    -- Costs
    employer_contribution DECIMAL(15,2),
    employee_cost DECIMAL(15,2),
    contribution_frequency VARCHAR(50) CHECK (contribution_frequency IN ('monthly', 'biweekly', 'annual')),
    
    -- Eligibility
    eligibility_rules JSONB DEFAULT '{}',
    waiting_period_days INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    effective_date DATE,
    termination_date DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_benefits_plan_org ON hris.benefits_plan(organization_id);
CREATE INDEX idx_benefits_plan_type ON hris.benefits_plan(plan_type);
CREATE INDEX idx_benefits_plan_active ON hris.benefits_plan(is_active) WHERE deleted_at IS NULL;

-- Employee Benefit Enrollments
CREATE TABLE hris.employee_benefit_enrollment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    benefits_plan_id UUID NOT NULL REFERENCES hris.benefits_plan(id) ON DELETE CASCADE,
    
    -- Enrollment Details
    enrollment_date DATE NOT NULL,
    coverage_start_date DATE NOT NULL,
    coverage_end_date DATE,
    coverage_level VARCHAR(50) CHECK (coverage_level IN ('employee', 'employee_spouse', 'employee_children', 'family')),
    
    -- Dependents (if applicable)
    dependents JSONB DEFAULT '[]',
    
    -- Status
    status VARCHAR(50) DEFAULT 'active'
        CHECK (status IN ('active', 'pending', 'cancelled', 'expired')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_employee_benefit_enrollment_org ON hris.employee_benefit_enrollment(organization_id);
CREATE INDEX idx_employee_benefit_enrollment_employee ON hris.employee_benefit_enrollment(employee_id);
CREATE INDEX idx_employee_benefit_enrollment_status ON hris.employee_benefit_enrollment(status) WHERE deleted_at IS NULL;

-- =====================================================
-- SECTION 7: TIME OFF MANAGEMENT
-- Sophisticated leave management with accrual rules
-- =====================================================

-- Time Off Types
CREATE TABLE hris.time_off_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Type Information
    type_code VARCHAR(50) NOT NULL,
    type_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Configuration
    is_paid BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT true,
    max_days_per_request INTEGER,
    max_consecutive_days INTEGER,
    
    -- Accrual Configuration (JSON-based rules)
    accrual_enabled BOOLEAN DEFAULT false,
    accrual_rules JSONB DEFAULT '{}',  -- Flexible accrual configuration
    
    -- Carry Over
    allow_carryover BOOLEAN DEFAULT false,
    max_carryover_days DECIMAL(10,2),
    carryover_expiry_months INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT unique_time_off_type_code UNIQUE (organization_id, type_code)
);

CREATE INDEX idx_time_off_type_org ON hris.time_off_type(organization_id);
CREATE INDEX idx_time_off_type_active ON hris.time_off_type(is_active) WHERE deleted_at IS NULL;

-- Employee Time Off Balances
CREATE TABLE hris.employee_time_off_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    time_off_type_id UUID NOT NULL REFERENCES hris.time_off_type(id) ON DELETE CASCADE,
    
    -- Balance Tracking
    year INTEGER NOT NULL,
    total_allocated DECIMAL(10,2) DEFAULT 0,
    total_accrued DECIMAL(10,2) DEFAULT 0,
    total_used DECIMAL(10,2) DEFAULT 0,
    total_pending DECIMAL(10,2) DEFAULT 0,
    current_balance DECIMAL(10,2) DEFAULT 0,
    
    -- Carry Over
    carried_over_from_previous_year DECIMAL(10,2) DEFAULT 0,
    carryover_expires_at DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_employee_balance UNIQUE (organization_id, employee_id, time_off_type_id, year)
);

CREATE INDEX idx_employee_time_off_balance_org ON hris.employee_time_off_balance(organization_id);
CREATE INDEX idx_employee_time_off_balance_employee ON hris.employee_time_off_balance(employee_id);
CREATE INDEX idx_employee_time_off_balance_year ON hris.employee_time_off_balance(year);

-- Time Off Requests
CREATE TABLE hris.time_off_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    time_off_type_id UUID NOT NULL REFERENCES hris.time_off_type(id) ON DELETE CASCADE,
    
    -- Request Details
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(10,2) NOT NULL,
    reason TEXT,
    
    -- Approval Workflow
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approver_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_time_off_request_org ON hris.time_off_request(organization_id);
CREATE INDEX idx_time_off_request_employee ON hris.time_off_request(employee_id);
CREATE INDEX idx_time_off_request_status ON hris.time_off_request(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_time_off_request_dates ON hris.time_off_request(start_date, end_date);

-- Time Off Accrual History
CREATE TABLE hris.time_off_accrual_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    time_off_type_id UUID NOT NULL REFERENCES hris.time_off_type(id) ON DELETE CASCADE,
    balance_id UUID NOT NULL REFERENCES hris.employee_time_off_balance(id) ON DELETE CASCADE,
    
    -- Accrual Details
    accrual_date DATE NOT NULL,
    accrual_amount DECIMAL(10,2) NOT NULL,
    accrual_reason VARCHAR(255),
    balance_after_accrual DECIMAL(10,2),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_off_accrual_history_org ON hris.time_off_accrual_history(organization_id);
CREATE INDEX idx_time_off_accrual_history_employee ON hris.time_off_accrual_history(employee_id);
CREATE INDEX idx_time_off_accrual_history_date ON hris.time_off_accrual_history(accrual_date);

-- =====================================================
-- SECTION 8: ATTENDANCE MANAGEMENT
-- Track employee attendance and integration with time-off
-- =====================================================

CREATE TABLE hris.attendance_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    
    -- Attendance Date and Time
    attendance_date DATE NOT NULL,
    clock_in_time TIMESTAMPTZ,
    clock_out_time TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'present'
        CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'weekend')),
    
    -- Leave Reference (if on leave)
    time_off_request_id UUID REFERENCES hris.time_off_request(id) ON DELETE SET NULL,
    
    -- Work Hours
    total_hours DECIMAL(5,2),
    overtime_hours DECIMAL(5,2),
    
    -- Location Tracking
    clock_in_location VARCHAR(255),
    clock_out_location VARCHAR(255),
    clock_in_ip VARCHAR(50),
    clock_out_ip VARCHAR(50),
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_employee_attendance_date UNIQUE (organization_id, employee_id, attendance_date)
);

CREATE INDEX idx_attendance_record_org ON hris.attendance_record(organization_id);
CREATE INDEX idx_attendance_record_employee ON hris.attendance_record(employee_id);
CREATE INDEX idx_attendance_record_date ON hris.attendance_record(attendance_date);
CREATE INDEX idx_attendance_record_status ON hris.attendance_record(status);

-- =====================================================
-- SECTION 9: RULE ENGINE
-- Flexible policy automation (MVP: JSON-based storage)
-- =====================================================

CREATE TABLE hris.rule_definition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Rule Identification
    rule_code VARCHAR(50) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_category VARCHAR(100) CHECK (rule_category IN ('time_off', 'attendance', 'contract', 'performance', 'benefits', 'general')),
    
    -- Rule Logic (JSON-based for MVP)
    conditions JSONB NOT NULL DEFAULT '{}',  -- Condition definitions
    actions JSONB NOT NULL DEFAULT '{}',  -- Action definitions
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT unique_rule_code UNIQUE (organization_id, rule_code)
);

CREATE INDEX idx_rule_definition_org ON hris.rule_definition(organization_id);
CREATE INDEX idx_rule_definition_category ON hris.rule_definition(rule_category);
CREATE INDEX idx_rule_definition_active ON hris.rule_definition(is_active) WHERE deleted_at IS NULL;

-- Rule Execution History
CREATE TABLE hris.rule_execution_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    rule_definition_id UUID NOT NULL REFERENCES hris.rule_definition(id) ON DELETE CASCADE,
    
    -- Execution Details
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    execution_context JSONB DEFAULT '{}',  -- Input data
    execution_result JSONB DEFAULT '{}',  -- Output/actions taken
    
    -- Status
    status VARCHAR(50) CHECK (status IN ('success', 'failure', 'skipped')),
    error_message TEXT,
    
    -- Metadata
    executed_by UUID,
    execution_time_ms INTEGER
);

CREATE INDEX idx_rule_execution_history_org ON hris.rule_execution_history(organization_id);
CREATE INDEX idx_rule_execution_history_rule ON hris.rule_execution_history(rule_definition_id);
CREATE INDEX idx_rule_execution_history_date ON hris.rule_execution_history(executed_at);

-- =====================================================
-- SECTION 10: DOCUMENT MANAGEMENT
-- Employee documents and compliance tracking
-- =====================================================

CREATE TABLE hris.document_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Category Information
    category_code VARCHAR(50) NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Configuration
    requires_expiry BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT false,
    is_confidential BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT unique_document_category_code UNIQUE (organization_id, category_code)
);

CREATE INDEX idx_document_category_org ON hris.document_category(organization_id);
CREATE INDEX idx_document_category_active ON hris.document_category(is_active) WHERE deleted_at IS NULL;

-- Employee Documents
CREATE TABLE hris.employee_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    category_id UUID REFERENCES hris.document_category(id) ON DELETE SET NULL,
    
    -- Document Information
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),
    description TEXT,
    
    -- File Information
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER,  -- in bytes
    mime_type VARCHAR(100),
    
    -- Dates
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    issue_date DATE,
    expiry_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'pending_review', 'approved', 'rejected')),
    
    -- Access Control
    is_confidential BOOLEAN DEFAULT false,
    accessible_to JSONB DEFAULT '[]',  -- Array of user/role IDs
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_employee_document_org ON hris.employee_document(organization_id);
CREATE INDEX idx_employee_document_employee ON hris.employee_document(employee_id);
CREATE INDEX idx_employee_document_category ON hris.employee_document(category_id);
CREATE INDEX idx_employee_document_status ON hris.employee_document(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_document_expiry ON hris.employee_document(expiry_date) WHERE expiry_date IS NOT NULL;

-- =====================================================
-- SECTION 11: AUDIT & COMPLIANCE
-- Track changes for compliance
-- =====================================================

CREATE TABLE hris.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Audit Information
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- Change Details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    user_id UUID,
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_org ON hris.audit_log(organization_id);
CREATE INDEX idx_audit_log_table ON hris.audit_log(table_name);
CREATE INDEX idx_audit_log_record ON hris.audit_log(record_id);
CREATE INDEX idx_audit_log_date ON hris.audit_log(created_at);
CREATE INDEX idx_audit_log_user ON hris.audit_log(user_id);

-- =====================================================
-- SECTION 12: REPORTING VIEWS
-- Convenient views for common queries
-- =====================================================

-- Active Employees View
CREATE OR REPLACE VIEW hris.v_active_employees AS
SELECT 
    e.id,
    e.organization_id,
    e.employee_number,
    e.first_name,
    e.middle_name,
    e.last_name,
    e.email,
    e.phone,
    e.hire_date,
    e.employment_status,
    e.employment_type,
    e.job_title,
    d.department_name,
    l.location_name,
    m.first_name || ' ' || m.last_name AS manager_name,
    e.created_at,
    e.updated_at
FROM hris.employee e
LEFT JOIN hris.department d ON e.department_id = d.id
LEFT JOIN hris.location l ON e.location_id = l.id
LEFT JOIN hris.employee m ON e.manager_id = m.id
WHERE e.deleted_at IS NULL 
  AND e.employment_status = 'active';

-- Time Off Balance Summary View
CREATE OR REPLACE VIEW hris.v_time_off_balance_summary AS
SELECT 
    b.id,
    b.organization_id,
    b.employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    b.time_off_type_id,
    t.type_name,
    b.year,
    b.total_allocated,
    b.total_accrued,
    b.total_used,
    b.total_pending,
    b.current_balance,
    b.carried_over_from_previous_year,
    b.carryover_expires_at
FROM hris.employee_time_off_balance b
JOIN hris.employee e ON b.employee_id = e.id
JOIN hris.time_off_type t ON b.time_off_type_id = t.id
WHERE e.deleted_at IS NULL;

-- Contract Expiry Alert View
CREATE OR REPLACE VIEW hris.v_contracts_expiring_soon AS
SELECT 
    c.id,
    c.organization_id,
    c.employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    c.contract_number,
    c.contract_type,
    c.start_date,
    c.end_date,
    c.status,
    (c.end_date - CURRENT_DATE) AS days_until_expiry
FROM hris.contract c
JOIN hris.employee e ON c.employee_id = e.id
WHERE c.deleted_at IS NULL 
  AND c.status = 'active'
  AND c.end_date IS NOT NULL
  AND c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
ORDER BY c.end_date;

-- =====================================================
-- SECTION 13: TRIGGERS & FUNCTIONS
-- Automated business logic
-- =====================================================

-- Function to update employee time off balance
CREATE OR REPLACE FUNCTION hris.update_time_off_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
        -- Deduct from balance
        UPDATE hris.employee_time_off_balance
        SET 
            total_used = total_used + NEW.total_days,
            current_balance = current_balance - NEW.total_days,
            updated_at = NOW()
        WHERE employee_id = NEW.employee_id
          AND time_off_type_id = NEW.time_off_type_id
          AND year = EXTRACT(YEAR FROM NEW.start_date);
          
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'approved' AND NEW.status = 'cancelled' THEN
            -- Restore balance
            UPDATE hris.employee_time_off_balance
            SET 
                total_used = total_used - NEW.total_days,
                current_balance = current_balance + NEW.total_days,
                updated_at = NOW()
            WHERE employee_id = NEW.employee_id
              AND time_off_type_id = NEW.time_off_type_id
              AND year = EXTRACT(YEAR FROM NEW.start_date);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for time off balance updates
CREATE TRIGGER trg_update_time_off_balance
AFTER INSERT OR UPDATE ON hris.time_off_request
FOR EACH ROW
EXECUTE FUNCTION hris.update_time_off_balance();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION hris.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to all tables with updated_at
-- (This would be repeated for each table - showing pattern)
CREATE TRIGGER trg_employee_updated_at
BEFORE UPDATE ON hris.employee
FOR EACH ROW
EXECUTE FUNCTION hris.update_updated_at_column();

CREATE TRIGGER trg_contract_updated_at
BEFORE UPDATE ON hris.contract
FOR EACH ROW
EXECUTE FUNCTION hris.update_updated_at_column();

-- Add similar triggers for other tables...

-- =====================================================
-- SECTION 14: COMMENTS
-- Document schema for future reference
-- =====================================================

COMMENT ON SCHEMA hris IS 'Nexus HRIS - Enterprise Human Resource Information System';
COMMENT ON TABLE hris.employee IS 'Core employee records with personal and employment information';
COMMENT ON TABLE hris.contract IS 'Employment contracts with sequence-based lifecycle management';
COMMENT ON TABLE hris.time_off_type IS 'Time off policy definitions with flexible JSON-based accrual rules';
COMMENT ON TABLE hris.rule_definition IS 'Policy automation rules - MVP uses JSON storage, Phase 2 will add advanced execution engine';

-- =====================================================
-- END OF NEXUS HRIS SCHEMA
-- =====================================================

-- Grant appropriate permissions (adjust as needed)
GRANT USAGE ON SCHEMA hris TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hris TO PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hris TO PUBLIC;
