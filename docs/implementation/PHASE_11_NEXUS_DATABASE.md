# Phase 11: Nexus Product - HRIS Database Schema

**Duration:** 5 days  
**Dependencies:** Phase 7 (Integration Bus)  
**Team:** Database Architect + Backend Developer Team (2-3 developers)  
**Status:** Not Started

---

## 📋 Overview

This phase designs and implements the comprehensive enterprise-grade database schema for the Nexus HRIS (Human Resource Information System) product. Nexus manages complete employee lifecycle, organizational structure, contract management, performance management with review templates, benefits administration, attendance tracking, sophisticated time-off management with accrual rules, compliance documentation, and a flexible rule engine for HR policy automation.

**Implementation Approach:** This phase creates the full ERD structure with all tables and relationships. Initial business logic will be simplified (MVP), with advanced features like complex rule engine execution and automated contract sequencing marked as "Phase 2 Enhancements" for future implementation.

---

## 🎯 Objectives

1. Design enterprise-grade HRIS schema in `hris` namespace with all ERD tables
2. Implement contract lifecycle management system with sequence policies
3. Create flexible rule engine infrastructure for HR policy automation
4. Build performance management system with review templates
5. Implement attendance tracking with integration to time-off system
6. Create sophisticated leave management with JSON-based accrual rules
7. Implement user account system separate from employee records
8. Build benefits administration with enrollment tracking
9. Add comprehensive indexes for query optimization
10. Create views for reporting and analytics
11. Set up proper relationships and constraints
12. Ensure integration points with recruitment and payroll schemas

---

## 📊 Deliverables

### 1. HRIS Database Schema SQL (Part 1: Core & Organization)

**File:** `backend/src/products/nexus/database/schema.sql`

```sql
-- =====================================================
-- Nexus HRIS Database Schema
-- Enterprise-Grade Implementation
-- Based on Nexus ERD v1.0
-- Product: Nexus (Human Resource Information System)
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
    organization_id UUID NOT NULL,
    
    -- Authentication
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Account Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    failed_login_attempts INTEGER DEFAULT 0,
    last_login_at TIMESTAMP,
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    password_changed_at TIMESTAMP,
    must_change_password BOOLEAN DEFAULT false,
    
    -- Profile
    profile_picture_url VARCHAR(500),
    preferred_language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(100) DEFAULT 'UTC',
    
    -- System Fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT unique_username UNIQUE (organization_id, username),
    CONSTRAINT unique_email UNIQUE (organization_id, email)
);

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
    organization_id UUID NOT NULL,
    
    department_name VARCHAR(200) NOT NULL,
    department_code VARCHAR(50) NOT NULL,
    description TEXT,
    parent_department_id UUID,
    head_of_department_id UUID, -- References employee
    cost_center VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT fk_parent_department FOREIGN KEY (parent_department_id) REFERENCES hris.department(id),
    CONSTRAINT unique_department_code UNIQUE (organization_id, department_code)
);

CREATE INDEX idx_department_org ON hris.department(organization_id);
CREATE INDEX idx_department_parent ON hris.department(parent_department_id);
CREATE INDEX idx_department_active ON hris.department(is_active) WHERE deleted_at IS NULL;

-- Locations
CREATE TABLE hris.location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    location_name VARCHAR(200) NOT NULL,
    location_code VARCHAR(50) NOT NULL,
    location_type VARCHAR(50) CHECK (location_type IN ('headquarters', 'branch', 'remote', 'co-working', 'client-site')),
    
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL,
    
    timezone VARCHAR(100),
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
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
    organization_id UUID NOT NULL,
    user_account_id UUID, -- Link to user account (nullable for employees without login)
    
    -- Basic Information
    employee_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    preferred_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    personal_email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Employment Details
    hire_date DATE NOT NULL,
    termination_date DATE,
    employment_type VARCHAR(50) NOT NULL CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'intern', 'temporary', 'seasonal')),
    employment_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'on-leave', 'terminated', 'suspended', 'probation')),
    probation_end_date DATE,
    
    -- Job Information
    job_title VARCHAR(200) NOT NULL,
    department_id UUID,
    manager_id UUID,
    location_id UUID,
    work_location_type VARCHAR(50) CHECK (work_location_type IN ('on-site', 'remote', 'hybrid')),
    
    -- Personal Information
    date_of_birth DATE,
    gender VARCHAR(50),
    marital_status VARCHAR(50),
    nationality VARCHAR(100),
    tax_id VARCHAR(50), -- SSN or equivalent - ENCRYPTED
    
    -- Contact Information
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(200),
    emergency_contact_relationship VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_email VARCHAR(255),
    
    -- System Fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT fk_user_account FOREIGN KEY (user_account_id) REFERENCES hris.user_account(id),
    CONSTRAINT fk_department FOREIGN KEY (department_id) REFERENCES hris.department(id),
    CONSTRAINT fk_manager FOREIGN KEY (manager_id) REFERENCES hris.employee(id),
    CONSTRAINT fk_location FOREIGN KEY (location_id) REFERENCES hris.location(id),
    CONSTRAINT unique_employee_number UNIQUE (organization_id, employee_number)
);

CREATE INDEX idx_employee_org ON hris.employee(organization_id);
CREATE INDEX idx_employee_user_account ON hris.employee(user_account_id);
CREATE INDEX idx_employee_department ON hris.employee(department_id);
CREATE INDEX idx_employee_manager ON hris.employee(manager_id);
CREATE INDEX idx_employee_status ON hris.employee(employment_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_email ON hris.employee(email);

-- =====================================================
-- SECTION 4: CONTRACT MANAGEMENT
-- Employee contract lifecycle with sequence policies
-- =====================================================

-- Contract Sequence Policies (Define contract renewal/progression rules)
-- Phase 2 Enhancement: Automated contract progression based on rules
CREATE TABLE hris.contract_sequence_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    -- Policy Details
    policy_name VARCHAR(200) NOT NULL,
    policy_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Sequence Rules
    auto_renew BOOLEAN DEFAULT false,
    max_renewals INTEGER,
    requires_approval BOOLEAN DEFAULT true,
    notification_days_before_expiry INTEGER DEFAULT 30,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- System Fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT unique_policy_code UNIQUE (organization_id, policy_code)
);

CREATE INDEX idx_contract_sequence_policy_org ON hris.contract_sequence_policy(organization_id);
CREATE INDEX idx_contract_sequence_policy_active ON hris.contract_sequence_policy(is_active) WHERE deleted_at IS NULL;

-- Contract Sequence Steps (Define progression stages)
CREATE TABLE hris.contract_sequence_step (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_sequence_policy_id UUID NOT NULL,
    
    -- Step Details
    step_order INTEGER NOT NULL,
    step_name VARCHAR(200) NOT NULL,
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('probation', 'fixed-term', 'permanent', 'temporary', 'contractor')),
    duration_months INTEGER,
    
    -- Conditions for progression
    requires_performance_review BOOLEAN DEFAULT false,
    minimum_performance_rating DECIMAL(3,2), -- e.g., 3.50 out of 5.00
    
    -- Next Step
    next_step_id UUID, -- Nullable for final step
    
    -- System Fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_policy FOREIGN KEY (contract_sequence_policy_id) REFERENCES hris.contract_sequence_policy(id) ON DELETE CASCADE,
    CONSTRAINT fk_next_step FOREIGN KEY (next_step_id) REFERENCES hris.contract_sequence_step(id)
);

CREATE INDEX idx_contract_sequence_step_policy ON hris.contract_sequence_step(contract_sequence_policy_id);
CREATE INDEX idx_contract_sequence_step_order ON hris.contract_sequence_step(contract_sequence_policy_id, step_order);

-- Contracts (Individual employee contracts)
CREATE TABLE hris.contract (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    contract_sequence_policy_id UUID,
    contract_sequence_step_id UUID,
    
    -- Contract Details
    contract_number VARCHAR(50) NOT NULL,
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('probation', 'fixed-term', 'permanent', 'temporary', 'contractor')),
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE,
    signed_date DATE,
    
    -- Terms
    salary_amount DECIMAL(15,2),
    salary_currency VARCHAR(3) DEFAULT 'USD',
    working_hours_per_week DECIMAL(5,2),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewed')),
    
    -- Renewal Tracking
    renewal_count INTEGER DEFAULT 0,
    previous_contract_id UUID,
    next_contract_id UUID,
    
    -- Documents
    contract_document_id UUID, -- Reference to documents table
    
    -- Notes
    notes TEXT,
    termination_reason TEXT,
    
    -- System Fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES hris.employee(id),
    CONSTRAINT fk_policy FOREIGN KEY (contract_sequence_policy_id) REFERENCES hris.contract_sequence_policy(id),
    CONSTRAINT fk_step FOREIGN KEY (contract_sequence_step_id) REFERENCES hris.contract_sequence_step(id),
    CONSTRAINT fk_previous_contract FOREIGN KEY (previous_contract_id) REFERENCES hris.contract(id),
    CONSTRAINT fk_next_contract FOREIGN KEY (next_contract_id) REFERENCES hris.contract(id),
    CONSTRAINT unique_contract_number UNIQUE (organization_id, contract_number)
);

CREATE INDEX idx_contract_org ON hris.contract(organization_id);
CREATE INDEX idx_contract_employee ON hris.contract(employee_id);
CREATE INDEX idx_contract_status ON hris.contract(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_dates ON hris.contract(start_date, end_date);

-- =====================================================
-- SECTION 5: ATTENDANCE TRACKING
-- Employee attendance records
-- =====================================================

CREATE TABLE hris.attendance_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    
    -- Attendance Details
    attendance_date DATE NOT NULL,
    clock_in_time TIMESTAMP,
    clock_out_time TIMESTAMP,
    
    -- Status
    status VARCHAR(50) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half-day', 'on-leave', 'holiday', 'weekend')),
    
    -- Hours
    total_hours DECIMAL(8,2),
    break_hours DECIMAL(8,2),
    worked_hours DECIMAL(8,2),
    
    -- Location
    location_id UUID,
    clock_in_location VARCHAR(255),
    clock_out_location VARCHAR(255),
    
    -- Approval
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID,
    approved_at TIMESTAMP,
    
    -- Notes
    notes TEXT,
    absence_reason TEXT,
    
    -- System Fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES hris.employee(id),
    CONSTRAINT fk_location FOREIGN KEY (location_id) REFERENCES hris.location(id),
    CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES hris.employee(id),
    CONSTRAINT unique_employee_date UNIQUE (employee_id, attendance_date)
);

CREATE INDEX idx_attendance_record_org ON hris.attendance_record(organization_id);
CREATE INDEX idx_attendance_record_employee ON hris.attendance_record(employee_id);
CREATE INDEX idx_attendance_record_date ON hris.attendance_record(attendance_date DESC);
CREATE INDEX idx_attendance_record_status ON hris.attendance_record(status);

-- =====================================================
-- SECTION 6: RULE ENGINE
-- Flexible HR policy automation system
-- Phase 2 Enhancement: Advanced rule execution engine
-- =====================================================

CREATE TABLE hris.rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    -- Rule Details
    rule_name VARCHAR(200) NOT NULL,
    rule_code VARCHAR(50) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
        'leave_accrual', 'probation_completion', 'contract_renewal', 
        'performance_milestone', 'attendance_policy', 'overtime_approval',
        'custom'
    )),
    description TEXT,
    
    -- Rule Definition (JSON or YAML)
    rule_definition JSONB NOT NULL,
    -- Example: {"conditions": [{"field": "tenure_months", "operator": ">=", "value": 6}], "actions": [{"type": "accrue_leave", "policy_id": "...", "amount": 1.5}]}
    
    -- Execution
    is_active BOOLEAN DEFAULT true,
    execution_priority INTEGER DEFAULT 0,
    execution_schedule VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'on_event'
    
    -- Validation
    last_validated_at TIMESTAMP,
    validation_errors JSONB,
    
    -- System Fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT unique_rule_code UNIQUE (organization_id, rule_code)
);

CREATE INDEX idx_rule_org ON hris.rule(organization_id);
CREATE INDEX idx_rule_type ON hris.rule(rule_type);
CREATE INDEX idx_rule_active ON hris.rule(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_rule_definition ON hris.rule USING GIN (rule_definition);

-- Rule Execution Log
CREATE TABLE hris.rule_execution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    
    -- Execution Details
    executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    execution_status VARCHAR(20) NOT NULL CHECK (execution_status IN ('success', 'failed', 'skipped')),
    
    -- Context
    employee_id UUID, -- If rule applies to specific employee
    execution_context JSONB, -- Input data for rule execution
    
    -- Results
    actions_taken JSONB, -- What actions were performed
    error_message TEXT,
    
    -- Performance
    execution_time_ms INTEGER,
    
    CONSTRAINT fk_rule FOREIGN KEY (rule_id) REFERENCES hris.rule(id) ON DELETE CASCADE,
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES hris.employee(id)
);

CREATE INDEX idx_rule_execution_log_rule ON hris.rule_execution_log(rule_id);
CREATE INDEX idx_rule_execution_log_executed_at ON hris.rule_execution_log(executed_at DESC);
CREATE INDEX idx_rule_execution_log_employee ON hris.rule_execution_log(employee_id);

-- =====================================================
-- SECTION 7: ENHANCED TIME-OFF MANAGEMENT  
-- With JSON-based accrual rules
-- =====================================================

CREATE TABLE hris.leave_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    location_name VARCHAR(200) NOT NULL,
    location_code VARCHAR(50) NOT NULL,
    location_type VARCHAR(50) CHECK (location_type IN ('headquarters', 'branch', 'remote', 'co-working')),
    
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL,
    
    timezone VARCHAR(100),
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT unique_location_code UNIQUE (organization_id, location_code)
);

-- =====================================================
-- TIME OFF POLICIES TABLE
-- Time off policies (PTO, sick leave, etc.)
-- =====================================================
CREATE TABLE hris.time_off_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    policy_name VARCHAR(200) NOT NULL,
    policy_code VARCHAR(50) NOT NULL,
    time_off_type VARCHAR(50) NOT NULL CHECK (time_off_type IN ('pto', 'sick', 'vacation', 'bereavement', 'maternity', 'paternity', 'unpaid')),
    
    accrual_method VARCHAR(50) CHECK (accrual_method IN ('annual', 'monthly', 'per-pay-period', 'none')),
    accrual_amount DECIMAL(10, 2),
    max_balance DECIMAL(10, 2),
    carryover_allowed BOOLEAN DEFAULT false,
    max_carryover DECIMAL(10, 2),
    
    requires_approval BOOLEAN DEFAULT true,
    min_notice_days INTEGER DEFAULT 0,
    is_paid BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT unique_policy_code UNIQUE (organization_id, policy_code)
);

-- =====================================================
-- TIME OFF BALANCES TABLE
-- Employee time off balances
-- =====================================================
CREATE TABLE hris.time_off_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    policy_id UUID NOT NULL,
    
    available_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    pending_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    used_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    year INTEGER NOT NULL,
    last_accrual_date DATE,
    next_accrual_date DATE,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES hris.employees(id),
    CONSTRAINT fk_policy FOREIGN KEY (policy_id) REFERENCES hris.time_off_policies(id),
    CONSTRAINT unique_employee_policy_year UNIQUE (employee_id, policy_id, year)
);

-- =====================================================
-- TIME OFF REQUESTS TABLE
-- Employee time off requests
-- =====================================================
CREATE TABLE hris.time_off_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    policy_id UUID NOT NULL,
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(5, 2) NOT NULL,
    request_note TEXT,
    
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
    approved_by UUID,
    approved_at TIMESTAMP,
    denial_reason TEXT,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES hris.employees(id),
    CONSTRAINT fk_policy FOREIGN KEY (policy_id) REFERENCES hris.time_off_policies(id),
    CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES hris.employees(id),
    CONSTRAINT check_date_range CHECK (end_date >= start_date)
);

-- =====================================================
-- PERFORMANCE REVIEWS TABLE
-- Employee performance reviews
-- =====================================================
CREATE TABLE hris.performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    review_type VARCHAR(50) CHECK (review_type IN ('annual', 'quarterly', 'probation', 'project', 'ad-hoc')),
    
    overall_rating DECIMAL(3, 2),
    strengths TEXT,
    areas_for_improvement TEXT,
    goals TEXT,
    reviewer_comments TEXT,
    employee_comments TEXT,
    
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged', 'completed')),
    submitted_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES hris.employees(id),
    CONSTRAINT fk_reviewer FOREIGN KEY (reviewer_id) REFERENCES hris.employees(id)
);

-- =====================================================
-- GOALS TABLE
-- Employee goals and objectives
-- =====================================================
CREATE TABLE hris.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    
    goal_title VARCHAR(200) NOT NULL,
    goal_description TEXT,
    goal_type VARCHAR(50) CHECK (goal_type IN ('individual', 'team', 'company')),
    
    start_date DATE NOT NULL,
    target_date DATE NOT NULL,
    completion_date DATE,
    
    status VARCHAR(50) NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'completed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES hris.employees(id)
);

-- =====================================================
-- BENEFITS TABLE
-- Employee benefits administration
-- =====================================================
CREATE TABLE hris.benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    benefit_name VARCHAR(200) NOT NULL,
    benefit_code VARCHAR(50) NOT NULL,
    benefit_type VARCHAR(50) CHECK (benefit_type IN ('health', 'dental', 'vision', 'life', '401k', 'hsa', 'fsa', 'other')),
    description TEXT,
    
    provider_name VARCHAR(200),
    provider_contact VARCHAR(255),
    
    employee_cost DECIMAL(10, 2),
    employer_cost DECIMAL(10, 2),
    frequency VARCHAR(50) CHECK (frequency IN ('monthly', 'per-paycheck', 'annual')),
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT unique_benefit_code UNIQUE (organization_id, benefit_code)
);

-- =====================================================
-- EMPLOYEE BENEFITS TABLE
-- Employee benefit enrollments
-- =====================================================
CREATE TABLE hris.employee_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    benefit_id UUID NOT NULL,
    
    enrollment_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    termination_date DATE,
    
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'terminated', 'waived')),
    employee_contribution DECIMAL(10, 2),
    employer_contribution DECIMAL(10, 2),
    
    coverage_level VARCHAR(50) CHECK (coverage_level IN ('employee-only', 'employee-spouse', 'employee-children', 'family')),
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES hris.employees(id),
    CONSTRAINT fk_benefit FOREIGN KEY (benefit_id) REFERENCES hris.benefits(id)
);

-- =====================================================
-- DOCUMENTS TABLE
-- Employee documents (contracts, certifications, etc.)
-- =====================================================
CREATE TABLE hris.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    
    document_name VARCHAR(200) NOT NULL,
    document_type VARCHAR(50) CHECK (document_type IN ('contract', 'id-proof', 'certification', 'policy', 'tax-form', 'other')),
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    issue_date DATE,
    expiry_date DATE,
    
    is_confidential BOOLEAN DEFAULT true,
    requires_signature BOOLEAN DEFAULT false,
    signed_at TIMESTAMP,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    uploaded_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES core.organizations(id),
    CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES hris.employees(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Employees
CREATE INDEX idx_employees_org ON hris.employees(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_status ON hris.employees(organization_id, employment_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_manager ON hris.employees(manager_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_department ON hris.employees(department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_email ON hris.employees(email);

-- Departments
CREATE INDEX idx_departments_org ON hris.departments(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_departments_parent ON hris.departments(parent_department_id) WHERE deleted_at IS NULL;

-- Time Off
CREATE INDEX idx_timeoff_requests_employee ON hris.time_off_requests(employee_id, status);
CREATE INDEX idx_timeoff_requests_dates ON hris.time_off_requests(start_date, end_date);
CREATE INDEX idx_timeoff_balances_employee ON hris.time_off_balances(employee_id, year);

-- Performance Reviews
CREATE INDEX idx_reviews_employee ON hris.performance_reviews(employee_id, review_period_end DESC);
CREATE INDEX idx_reviews_reviewer ON hris.performance_reviews(reviewer_id);

-- Benefits
CREATE INDEX idx_employee_benefits_employee ON hris.employee_benefits(employee_id, status);
CREATE INDEX idx_employee_benefits_benefit ON hris.employee_benefits(benefit_id);

-- Documents
CREATE INDEX idx_documents_employee ON hris.documents(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_expiry ON hris.documents(expiry_date) WHERE expiry_date IS NOT NULL AND deleted_at IS NULL;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Active Employees with Manager and Department
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
    e.job_title,
    e.employment_type,
    e.work_location_type,
    d.department_name,
    d.department_code,
    m.first_name || ' ' || m.last_name AS manager_name,
    l.location_name,
    l.city AS location_city,
    l.country AS location_country
FROM hris.employees e
LEFT JOIN hris.departments d ON e.department_id = d.id
LEFT JOIN hris.employees m ON e.manager_id = m.id
LEFT JOIN hris.locations l ON e.location_id = l.id
WHERE e.employment_status = 'active'
AND e.deleted_at IS NULL;

-- Time Off Summary by Employee
CREATE OR REPLACE VIEW hris.v_timeoff_summary AS
SELECT 
    e.id AS employee_id,
    e.organization_id,
    e.employee_number,
    e.first_name || ' ' || e.last_name AS employee_name,
    p.policy_name,
    b.available_balance,
    b.pending_balance,
    b.used_balance,
    b.year
FROM hris.employees e
INNER JOIN hris.time_off_balances b ON e.id = b.employee_id
INNER JOIN hris.time_off_policies p ON b.policy_id = p.id
WHERE e.deleted_at IS NULL
AND e.employment_status = 'active';

-- Department Headcount
CREATE OR REPLACE VIEW hris.v_department_headcount AS
SELECT 
    d.id AS department_id,
    d.organization_id,
    d.department_name,
    d.department_code,
    COUNT(e.id) AS employee_count,
    COUNT(CASE WHEN e.employment_type = 'full-time' THEN 1 END) AS fulltime_count,
    COUNT(CASE WHEN e.employment_type = 'part-time' THEN 1 END) AS parttime_count,
    COUNT(CASE WHEN e.employment_type = 'contract' THEN 1 END) AS contract_count
FROM hris.departments d
LEFT JOIN hris.employees e ON d.id = e.department_id 
    AND e.employment_status = 'active' 
    AND e.deleted_at IS NULL
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.organization_id, d.department_name, d.department_code;

-- =====================================================
-- AUDIT TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION hris.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON hris.employees
    FOR EACH ROW EXECUTE FUNCTION hris.update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON hris.departments
    FOR EACH ROW EXECUTE FUNCTION hris.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON hris.locations
    FOR EACH ROW EXECUTE FUNCTION hris.update_updated_at_column();

CREATE TRIGGER update_time_off_policies_updated_at BEFORE UPDATE ON hris.time_off_policies
    FOR EACH ROW EXECUTE FUNCTION hris.update_updated_at_column();

CREATE TRIGGER update_time_off_balances_updated_at BEFORE UPDATE ON hris.time_off_balances
    FOR EACH ROW EXECUTE FUNCTION hris.update_updated_at_column();

CREATE TRIGGER update_time_off_requests_updated_at BEFORE UPDATE ON hris.time_off_requests
    FOR EACH ROW EXECUTE FUNCTION hris.update_updated_at_column();

CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON hris.performance_reviews
    FOR EACH ROW EXECUTE FUNCTION hris.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON hris.goals
    FOR EACH ROW EXECUTE FUNCTION hris.update_updated_at_column();

CREATE TRIGGER update_benefits_updated_at BEFORE UPDATE ON hris.benefits
    FOR EACH ROW EXECUTE FUNCTION hris.update_updated_at_column();

CREATE TRIGGER update_employee_benefits_updated_at BEFORE UPDATE ON hris.employee_benefits
    FOR EACH ROW EXECUTE FUNCTION hris.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON hris.documents
    FOR EACH ROW EXECUTE FUNCTION hris.update_updated_at_column();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA hris TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hris TO app_user;
GRANT SELECT ON ALL TABLES IN SCHEMA hris TO app_readonly;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON SCHEMA hris IS 'Nexus HRIS product schema for employee management';
COMMENT ON TABLE hris.employees IS 'Core employee records';
COMMENT ON TABLE hris.departments IS 'Organizational departments';
COMMENT ON TABLE hris.time_off_requests IS 'Employee time off requests';
COMMENT ON TABLE hris.performance_reviews IS 'Employee performance reviews';
COMMENT ON TABLE hris.benefits IS 'Benefits offerings';
```

---

## 🔍 Detailed Tasks

### Task 11.1: Design Schema (0.5 days)

**Assignee:** Database Architect

**Actions:**
1. ✅ Review HRIS requirements
2. ✅ Design entity relationships
3. ✅ Define all tables and columns
4. ✅ Plan indexes and constraints
5. ✅ Review with stakeholders

**Standards:** Follow DATABASE_STANDARDS.md

### Task 11.2: Create Core Tables (1 day)

**Assignee:** Database Developer 1

**Actions:**
1. ✅ Create employees table
2. ✅ Create departments table
3. ✅ Create locations table
4. ✅ Add all constraints
5. ✅ Test referential integrity

**Standards:** Follow DATABASE_STANDARDS.md

### Task 11.3: Create Time Off Tables (0.5 days)

**Assignee:** Database Developer 2

**Actions:**
1. ✅ Create time_off_policies table
2. ✅ Create time_off_balances table
3. ✅ Create time_off_requests table
4. ✅ Add indexes
5. ✅ Test accrual logic

**Standards:** Follow DATABASE_STANDARDS.md

### Task 11.4: Create Performance & Benefits Tables (0.5 days)

**Assignee:** Database Developer 1

**Actions:**
1. ✅ Create performance_reviews table
2. ✅ Create goals table
3. ✅ Create benefits tables
4. ✅ Create documents table
5. ✅ Add indexes

**Standards:** Follow DATABASE_STANDARDS.md

### Task 11.5: Create Views & Functions (0.25 days)

**Assignee:** Database Developer 2

**Actions:**
1. ✅ Create reporting views
2. ✅ Create audit triggers
3. ✅ Test all views
4. ✅ Add comments

**Standards:** Follow DATABASE_STANDARDS.md

### Task 11.6: Performance Testing (0.25 days)

**Assignee:** Database Team

**Actions:**
1. ✅ Test query performance
2. ✅ Verify index usage
3. ✅ Optimize slow queries
4. ✅ Document performance

**Standards:** Follow PERFORMANCE_STANDARDS.md

---

## 📋 Standards Compliance Checklist

- [ ] All tables have organization_id for multi-tenancy
- [ ] Soft deletes (deleted_at) on all core tables
- [ ] Audit fields (created_at, updated_at, created_by, updated_by)
- [ ] Proper foreign key constraints
- [ ] Indexes on foreign keys and common queries
- [ ] Updated_at triggers on all tables
- [ ] Views for common reporting needs
- [ ] Comments on schema and tables

---

## 🚀 Phase 2 Enhancements

The following features are documented in the schema but will have **simplified implementation** in MVP, with full sophistication added in Phase 2:

### Contract Sequence Automation
- **MVP:** Manual contract creation with sequence policy tracking
- **Phase 2:** Automated contract progression based on:
  - Performance review ratings
  - Tenure milestones
  - Automatic renewal notifications
  - Workflow automation for approvals
  - Document generation from templates

### Rule Engine Execution
- **MVP:** Simple JSON rule definitions, manual/scheduled execution
- **Phase 2:** Advanced features:
  - Real-time rule evaluation on events
  - Complex conditional logic (AND/OR/NOT operators)
  - Rule chaining and dependencies
  - A/B testing for rule variations
  - Rule impact analysis and simulation
  - Visual rule builder interface

### Leave Accrual Calculations
- **MVP:** Simple fixed accrual rates
- **Phase 2:** Advanced features:
  - Tenure-based tiered accrual (from accrual_rules_json)
  - Pro-rating for mid-year hires
  - Waiting period enforcement
  - Hour-worked based accrual
  - Different rates by employment type
  - Automatic balance adjustments

### Attendance Integration
- **MVP:** Manual attendance entry
- **Phase 2:** Advanced features:
  - Integration with biometric devices
  - GPS-based attendance verification
  - Automatic absent marking
  - Integration with leave requests
  - Real-time attendance dashboard
  - Attendance pattern analysis

### Performance Review Templates
- **MVP:** Simple review creation
- **Phase 2:** Advanced features:
  - 360-degree review workflows
  - Custom question templates by role
  - Weighted scoring algorithms
  - Automated review scheduling
  - Performance trend analysis
  - Development plan integration

### User Account Management
- **MVP:** Basic authentication
- **Phase 2:** Advanced features:
  - SSO integration (SAML, OAuth)
  - Role-based access control (RBAC)
  - Password complexity policies
  - Session management
  - Account activity monitoring
  - Automated provisioning/deprovisioning

---

## 🎯 Success Criteria

Phase 11 is complete when:

1. ✅ **All HRIS tables created** - Including user_account, contract management, attendance, rule engine
2. ✅ **Contract management system** - Sequence policies, steps, and contract tracking
3. ✅ **Rule engine infrastructure** - Rule definitions with JSON storage, execution logging
4. ✅ **Attendance tracking** - Basic attendance record keeping
5. ✅ **Enhanced leave policy** - JSON-based accrual rules structure
6. ✅ **User account separation** - Distinct from employee records
7. ✅ **All constraints and indexes** - Foreign keys, unique constraints, performance indexes
8. ✅ **Views created and tested** - Reporting views return accurate data
9. ✅ **Triggers working correctly** - Automated updated_at timestamps
10. ✅ **Performance tests pass** - Query performance meets benchmarks
11. ✅ **Database documentation complete** - ERD and table documentation
12. ✅ **Integration points verified** - Links to recruitment and payroll schemas
13. ✅ **Code review approved** - Team sign-off on design
14. ✅ **DBA sign-off obtained** - Database architect approval
15. ✅ **Phase 2 features documented** - Clear MVP vs advanced feature separation

---

## 📤 Outputs

### Database Migrations
- [ ] `backend/database/migrations/004_create_hris_schema_part1.sql` - Core tables (user_account, department, location, employee)
- [ ] `backend/database/migrations/004_create_hris_schema_part2.sql` - Contract management (sequence policies, steps, contracts)
- [ ] `backend/database/migrations/004_create_hris_schema_part3.sql` - Attendance & Rule Engine
- [ ] `backend/database/migrations/004_create_hris_schema_part4.sql` - Leave policies, time-off, performance, benefits
- [ ] `backend/database/seeds/hris_test_data.sql` - Sample organizational structure and employee data
- [ ] `backend/database/seeds/hris_contract_policies.sql` - Sample contract sequence policies
- [ ] `backend/database/seeds/hris_leave_policies.sql` - Standard leave policies with accrual rules
- [ ] `backend/database/seeds/hris_rules.sql` - Sample HR policy rules

### Documentation
- [ ] `docs/database/hris_schema_diagram.pdf` - Complete ERD diagram
- [ ] `docs/database/hris_tables.md` - Table-by-table documentation
- [ ] `docs/database/hris_contract_management.md` - Contract lifecycle documentation
- [ ] `docs/database/hris_rule_engine.md` - Rule system documentation
- [ ] `docs/database/hris_mvp_vs_phase2.md` - Feature implementation roadmap
- [ ] `docs/database/hris_integration_points.md` - Integration with recruitment/payroll

### Tests
- [ ] `backend/tests/database/hris-schema.test.js` - Schema validation tests
- [ ] `backend/tests/database/hris-constraints.test.js` - Constraint tests
- [ ] `backend/tests/database/hris-integrity.test.js` - Data integrity tests
- [ ] `backend/tests/database/hris-performance.test.js` - Index performance tests

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex organizational hierarchy | **Medium** | Recursive queries with depth limits; materialized paths |
| Performance issues with large employee base | **High** | Proper indexing; table partitioning by year; archival strategy |
| Data privacy concerns (PII/SSN) | **Critical** | Field-level encryption; access controls; audit logs; GDPR compliance |
| Rule engine security vulnerabilities | **High** | Sandboxed execution; input validation; no code eval in MVP |
| Time off calculation errors | **High** | Thorough testing; validation rules; external audit |
| Contract sequence automation complexity | **Medium** | Start with manual workflow; automate in Phase 2 |
| Schema complexity increases development time | **High** | Clear MVP scope; Phase 2 deferred features; good documentation |
| Integration failures with payroll/recruitment | **High** | Well-defined integration events; transaction management; rollback procedures |

---

## 🔗 Related Phases

- **Previous:** [Phase 10: Paylinq Product - Testing](./PHASE_10_PAYLINQ_TESTING.md)
- **Next:** [Phase 12: Nexus Product - Backend](./PHASE_12_NEXUS_BACKEND.md)
- **Related:** [Phase 8: Paylinq Database](./PHASE_08_PAYLINQ_DATABASE.md)

---

## ⏭️ Next Phase

**[Phase 12: Nexus Product - Backend Implementation](./PHASE_12_NEXUS_BACKEND.md)**

Upon completion of Phase 11, proceed to Phase 12 to implement the Nexus HRIS backend.

---

**Phase Owner:** Database Architect + Backend Developer Team  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start  
**Complexity:** High (Enterprise-grade HRIS schema with 30+ tables)  
**Approach:** Hybrid (Full ERD structure with user accounts, contracts, attendance, rules; simplified MVP business logic; Phase 2 advanced automation)
