# Phase 8: Paylinq Product - Database Schema

**Duration:** 5 days  
**Dependencies:** Phase 3, Phase 7  
**Team:** Database Architect + Backend Developer  
**Status:** Not Started

---

## 📋 Overview

This phase designs and implements the comprehensive enterprise-grade database schema for the Paylinq payroll management system. The schema covers advanced worker type management, sophisticated tax calculation engine, flexible pay component system, time & attendance tracking, scheduling, payroll processing, reconciliation, and compliance reporting.

**Implementation Approach:** This phase creates the full ERD structure with all tables and relationships. Initial business logic will be simplified (MVP), with advanced features marked as "Phase 2 Enhancements" for future implementation.

---

## 🎯 Objectives

1. Design enterprise-grade payroll schema in `payroll` namespace with all ERD tables
2. Implement worker type templating system for flexible employee classifications
3. Create sophisticated tax calculation engine with rule sets and brackets
4. Build flexible pay component system with custom formulas
5. Implement time & attendance tracking with shift management
6. Create work scheduling system with change request workflow
7. Build reconciliation tables for payroll accuracy
8. Add comprehensive indexes for query optimization
9. Create views for reporting and analytics
10. Ensure compliance with payroll regulations

---

## 📊 Deliverables

### 1. Payroll Schema Migration (Part 1: Core Tables)

**File:** `backend/database/migrations/003_create_payroll_schema.sql`

```sql
-- ===================================
-- Paylinq (Payroll) Database Schema
-- Enterprise-Grade Implementation
-- Based on Paylinq ERD v1.0
-- ===================================

CREATE SCHEMA IF NOT EXISTS payroll;

-- ===================================
-- SECTION 1: WORKER TYPE MANAGEMENT
-- Flexible employee classification system
-- ===================================

-- 1.1 Worker Type Templates
-- Defines reusable worker classifications (FT, PT, Contract, etc.)
CREATE TABLE payroll.worker_type_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  
  -- Template Details
  name VARCHAR(100) NOT NULL, -- e.g., "Full-Time", "Part-Time", "Contractor"
  code VARCHAR(20) NOT NULL, -- e.g., "FT", "PT", "CNT"
  description TEXT,
  
  -- Default Settings (can be overridden per worker)
  default_pay_frequency VARCHAR(20) CHECK (default_pay_frequency IN ('weekly', 'bi-weekly', 'semi-monthly', 'monthly')),
  default_payment_method VARCHAR(20) CHECK (default_payment_method IN ('direct_deposit', 'check', 'ach')),
  benefits_eligible BOOLEAN DEFAULT false,
  overtime_eligible BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP,
  
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_worker_type_template_org ON payroll.worker_type_template(organization_id);
CREATE INDEX idx_worker_type_template_active ON payroll.worker_type_template(is_active) WHERE deleted_at IS NULL;

-- 1.2 Worker Types (Instances per employee)
-- Associates employees with worker type templates
CREATE TABLE payroll.worker_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  employee_id UUID NOT NULL, -- Reference to hris.employees
  worker_type_template_id UUID NOT NULL REFERENCES payroll.worker_type_template(id),
  
  -- Effective Period
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_current BOOLEAN DEFAULT true,
  
  -- Custom Overrides (overrides template defaults)
  pay_frequency VARCHAR(20),
  payment_method VARCHAR(20),
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_worker_type_org ON payroll.worker_type(organization_id);
CREATE INDEX idx_worker_type_employee ON payroll.worker_type(employee_id);
CREATE INDEX idx_worker_type_current ON payroll.worker_type(is_current) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_type_template ON payroll.worker_type(worker_type_template_id);

-- ===================================
-- SECTION 2: EMPLOYEE PAYROLL RECORDS
-- Core payroll information per employee
-- ===================================

CREATE TABLE payroll.employee_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  employee_id UUID NOT NULL, -- Reference to hris.employees
  
  -- Payroll Identifiers
  employee_number VARCHAR(50) NOT NULL,
  payroll_id VARCHAR(50), -- External payroll system ID
  
  -- Bank Information (encrypted in production)
  bank_name VARCHAR(200),
  account_number VARCHAR(100), -- ENCRYPTED
  routing_number VARCHAR(50), -- ENCRYPTED
  account_type VARCHAR(20) CHECK (account_type IN ('checking', 'savings')),
  
  -- Tax Information
  tax_id VARCHAR(50), -- SSN/EIN - ENCRYPTED
  tax_filing_status VARCHAR(20) CHECK (tax_filing_status IN ('single', 'married', 'married_separately', 'head_of_household')),
  tax_exemptions INTEGER DEFAULT 0,
  additional_withholding DECIMAL(10,2) DEFAULT 0,
  
  -- Currency
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'terminated')),
  hire_date DATE NOT NULL,
  termination_date DATE,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP,
  
  UNIQUE(organization_id, employee_number)
);

CREATE INDEX idx_employee_record_org ON payroll.employee_record(organization_id);
CREATE INDEX idx_employee_record_employee ON payroll.employee_record(employee_id);
CREATE INDEX idx_employee_record_status ON payroll.employee_record(status) WHERE deleted_at IS NULL;

-- ===================================
-- SECTION 3: COMPENSATION MANAGEMENT
-- Base compensation and custom pay components
-- ===================================

-- 3.1 Base Compensation
CREATE TABLE payroll.compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  employee_record_id UUID NOT NULL REFERENCES payroll.employee_record(id),
  
  -- Compensation Type
  compensation_type VARCHAR(20) NOT NULL CHECK (compensation_type IN ('salary', 'hourly', 'commission', 'contract')),
  
  -- Amount
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Hourly Specific
  hourly_rate DECIMAL(10,2),
  overtime_rate DECIMAL(10,2),
  double_time_rate DECIMAL(10,2),
  
  -- Salary Specific
  annual_salary DECIMAL(12,2),
  pay_period_amount DECIMAL(12,2),
  
  -- Effective Period
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_current BOOLEAN DEFAULT true,
  
  -- Reason for Change
  change_reason TEXT,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_compensation_org ON payroll.compensation(organization_id);
CREATE INDEX idx_compensation_employee ON payroll.compensation(employee_record_id);
CREATE INDEX idx_compensation_current ON payroll.compensation(is_current) WHERE deleted_at IS NULL;

-- 3.2 Pay Components (Standard pay elements)
-- Defines reusable pay elements like "Base Pay", "Overtime", "Bonus"
CREATE TABLE payroll.pay_component (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  
  -- Component Details
  name VARCHAR(100) NOT NULL, -- e.g., "Base Pay", "Overtime", "Holiday Pay"
  code VARCHAR(20) NOT NULL, -- e.g., "BASE", "OT", "HOL"
  description TEXT,
  
  -- Component Type
  component_category VARCHAR(50) NOT NULL CHECK (component_category IN (
    'earning', 'deduction', 'tax', 'benefit', 'reimbursement', 'adjustment'
  )),
  
  -- Calculation Method
  calculation_type VARCHAR(20) NOT NULL CHECK (calculation_type IN ('fixed', 'hourly_rate', 'percentage', 'formula')),
  
  -- Default Settings
  default_rate DECIMAL(12,4),
  default_percentage DECIMAL(6,4),
  
  -- Tax Treatment
  is_taxable BOOLEAN DEFAULT true,
  affects_gross BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP,
  
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_pay_component_org ON payroll.pay_component(organization_id);
CREATE INDEX idx_pay_component_category ON payroll.pay_component(component_category);
CREATE INDEX idx_pay_component_active ON payroll.pay_component(is_active) WHERE deleted_at IS NULL;

-- 3.3 Custom Pay Components (Employee-specific pay elements)
-- Associates pay components with specific employees with custom rates
CREATE TABLE payroll.custom_pay_component (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  employee_record_id UUID NOT NULL REFERENCES payroll.employee_record(id),
  pay_component_id UUID NOT NULL REFERENCES payroll.pay_component(id),
  
  -- Custom Rates (overrides pay_component defaults)
  custom_rate DECIMAL(12,4),
  custom_percentage DECIMAL(6,4),
  custom_amount DECIMAL(12,2),
  
  -- Effective Period
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_custom_pay_component_org ON payroll.custom_pay_component(organization_id);
CREATE INDEX idx_custom_pay_component_employee ON payroll.custom_pay_component(employee_record_id);
CREATE INDEX idx_custom_pay_component_pay ON payroll.custom_pay_component(pay_component_id);
CREATE INDEX idx_custom_pay_component_active ON payroll.custom_pay_component(is_active) WHERE deleted_at IS NULL;

-- 3.4 Component Formulas
-- Stores formulas for complex pay calculations
-- Phase 2 Enhancement: Implement formula parser/evaluator
CREATE TABLE payroll.component_formula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  pay_component_id UUID NOT NULL REFERENCES payroll.pay_component(id),
  
  -- Formula Definition
  formula_name VARCHAR(100) NOT NULL,
  formula_expression TEXT NOT NULL, -- e.g., "(base_rate * hours) + (ot_hours * base_rate * 1.5)"
  formula_language VARCHAR(20) DEFAULT 'simple', -- 'simple', 'javascript', 'python'
  
  -- Variables
  variables JSONB, -- Array of variable names used in formula
  
  -- Validation
  validation_rules JSONB, -- Constraints on input/output values
  
  -- Effective Period
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_component_formula_org ON payroll.component_formula(organization_id);
CREATE INDEX idx_component_formula_component ON payroll.component_formula(pay_component_id);
CREATE INDEX idx_component_formula_active ON payroll.component_formula(is_active) WHERE deleted_at IS NULL;

-- ===================================
-- SECTION 4: TAX CALCULATION ENGINE
-- Sophisticated multi-jurisdictional tax system
-- ===================================

-- 4.1 Tax Rule Set
-- Defines tax calculation rules for different jurisdictions
CREATE TABLE payroll.tax_rule_set (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  
  -- Rule Set Details
  name VARCHAR(100) NOT NULL, -- e.g., "US Federal 2025", "CA State 2025"
  code VARCHAR(20) NOT NULL,
  description TEXT,
  
  -- Jurisdiction
  country VARCHAR(3) NOT NULL DEFAULT 'USA',
  state VARCHAR(50),
  locality VARCHAR(100),
  
  -- Tax Type
  tax_type VARCHAR(50) NOT NULL CHECK (tax_type IN (
    'federal_income', 'state_income', 'local_income',
    'social_security', 'medicare', 'unemployment', 'disability',
    'withholding', 'other'
  )),
  
  -- Calculation Method
  calculation_method VARCHAR(20) CHECK (calculation_method IN ('bracket', 'flat_rate', 'formula')),
  
  -- Effective Period
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP,
  
  UNIQUE(organization_id, code, effective_from)
);

CREATE INDEX idx_tax_rule_set_org ON payroll.tax_rule_set(organization_id);
CREATE INDEX idx_tax_rule_set_jurisdiction ON payroll.tax_rule_set(country, state, locality);
CREATE INDEX idx_tax_rule_set_type ON payroll.tax_rule_set(tax_type);
CREATE INDEX idx_tax_rule_set_active ON payroll.tax_rule_set(is_active) WHERE deleted_at IS NULL;

-- 4.2 Tax Brackets
-- Defines progressive tax brackets for bracket-based calculations
CREATE TABLE payroll.tax_bracket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_rule_set_id UUID NOT NULL REFERENCES payroll.tax_rule_set(id) ON DELETE CASCADE,
  
  -- Bracket Details
  bracket_order INTEGER NOT NULL, -- Order of bracket (1, 2, 3...)
  income_min DECIMAL(15,2) NOT NULL,
  income_max DECIMAL(15,2), -- NULL for highest bracket
  rate_percentage DECIMAL(6,4) NOT NULL, -- e.g., 12.0000 for 12%
  fixed_amount DECIMAL(12,2) DEFAULT 0, -- Additional fixed amount
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tax_bracket_rule_set ON payroll.tax_bracket(tax_rule_set_id);
CREATE INDEX idx_tax_bracket_order ON payroll.tax_bracket(tax_rule_set_id, bracket_order);

-- 4.3 Allowances
-- Defines tax allowances and exemptions
CREATE TABLE payroll.allowance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  
  -- Allowance Details
  name VARCHAR(100) NOT NULL, -- e.g., "Standard Deduction", "Personal Exemption"
  code VARCHAR(20) NOT NULL,
  allowance_type VARCHAR(50) NOT NULL CHECK (allowance_type IN (
    'standard_deduction', 'personal_exemption', 'dependent_exemption',
    'blind_exemption', 'senior_exemption', 'other'
  )),
  
  -- Amount
  amount DECIMAL(12,2) NOT NULL,
  
  -- Jurisdiction
  country VARCHAR(3) NOT NULL DEFAULT 'USA',
  state VARCHAR(50),
  
  -- Effective Period
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP,
  
  UNIQUE(organization_id, code, effective_from)
);

CREATE INDEX idx_allowance_org ON payroll.allowance(organization_id);
CREATE INDEX idx_allowance_type ON payroll.allowance(allowance_type);
CREATE INDEX idx_allowance_active ON payroll.allowance(is_active) WHERE deleted_at IS NULL;

-- 4.4 Deductible Cost Rules
-- Defines rules for deductible costs (pre-tax deductions)
CREATE TABLE payroll.deductible_cost_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  
  -- Rule Details
  name VARCHAR(100) NOT NULL, -- e.g., "401(k) Contribution", "Health Insurance"
  code VARCHAR(20) NOT NULL,
  description TEXT,
  
  -- Deduction Limits
  annual_limit DECIMAL(12,2),
  per_paycheck_limit DECIMAL(12,2),
  employer_match_percentage DECIMAL(6,4),
  employer_match_limit DECIMAL(12,2),
  
  -- Tax Treatment
  pre_tax BOOLEAN DEFAULT true,
  reduces_taxable_income BOOLEAN DEFAULT true,
  reduces_social_security BOOLEAN DEFAULT false,
  reduces_medicare BOOLEAN DEFAULT false,
  
  -- Effective Period
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP,
  
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_deductible_cost_rule_org ON payroll.deductible_cost_rule(organization_id);
CREATE INDEX idx_deductible_cost_rule_active ON payroll.deductible_cost_rule(is_active) WHERE deleted_at IS NULL;

-- ===================================
-- SECTION 5: TIME & ATTENDANCE
-- Advanced time tracking and shift management
-- ===================================

-- 5.1 Shift Types
-- Defines different shift classifications
CREATE TABLE payroll.shift_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  
  -- Shift Details
  name VARCHAR(100) NOT NULL, -- e.g., "Day Shift", "Night Shift", "Weekend"
  code VARCHAR(20) NOT NULL,
  description TEXT,
  
  -- Time Period
  start_time TIME,
  end_time TIME,
  duration_hours DECIMAL(5,2),
  
  -- Pay Multipliers
  pay_rate_multiplier DECIMAL(5,4) DEFAULT 1.0000, -- e.g., 1.5 for night shift differential
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP,
  
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_shift_type_org ON payroll.shift_type(organization_id);
CREATE INDEX idx_shift_type_active ON payroll.shift_type(is_active) WHERE deleted_at IS NULL;

-- 5.2 Time Attendance Events
-- Records clock-in/clock-out events
CREATE TABLE payroll.time_attendance_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  employee_record_id UUID NOT NULL REFERENCES payroll.employee_record(id),
  
  -- Event Details
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  event_timestamp TIMESTAMP NOT NULL,
  
  -- Location
  location_id UUID, -- Reference to location if applicable
  gps_coordinates POINT, -- GPS location if mobile clock-in
  
  -- Device/Method
  device_id VARCHAR(100),
  clock_method VARCHAR(20) CHECK (clock_method IN ('web', 'mobile', 'biometric', 'manual')),
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id)
);

CREATE INDEX idx_time_attendance_event_org ON payroll.time_attendance_event(organization_id);
CREATE INDEX idx_time_attendance_event_employee ON payroll.time_attendance_event(employee_record_id);
CREATE INDEX idx_time_attendance_event_timestamp ON payroll.time_attendance_event(event_timestamp DESC);

-- 5.3 Time Entries (Calculated from events or manual entry)
CREATE TABLE payroll.time_entry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  employee_record_id UUID NOT NULL REFERENCES payroll.employee_record(id),
  shift_type_id UUID REFERENCES payroll.shift_type(id),
  
  -- Time Period
  entry_date DATE NOT NULL,
  clock_in TIMESTAMP,
  clock_out TIMESTAMP,
  
  -- Hours
  total_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  break_hours DECIMAL(8,2) DEFAULT 0,
  worked_hours DECIMAL(8,2) GENERATED ALWAYS AS (total_hours - break_hours) STORED,
  
  -- Entry Type
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('regular', 'overtime', 'double_time', 'pto', 'sick', 'holiday')),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  
  -- Approval
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES core.users(id),
  rejection_reason TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_time_entry_org ON payroll.time_entry(organization_id);
CREATE INDEX idx_time_entry_employee ON payroll.time_entry(employee_record_id);
CREATE INDEX idx_time_entry_date ON payroll.time_entry(entry_date DESC);
CREATE INDEX idx_time_entry_status ON payroll.time_entry(status) WHERE deleted_at IS NULL;

-- 5.4 Rated Time Lines (Calculated time with rates applied)
-- Phase 2 Enhancement: Complex rate calculations based on rules
CREATE TABLE payroll.rated_time_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  time_entry_id UUID NOT NULL REFERENCES payroll.time_entry(id),
  pay_component_id UUID NOT NULL REFERENCES payroll.pay_component(id),
  
  -- Rate Details
  hours DECIMAL(8,2) NOT NULL,
  rate DECIMAL(10,4) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  
  -- Multiplier Applied
  rate_multiplier DECIMAL(5,4) DEFAULT 1.0000,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rated_time_line_org ON payroll.rated_time_line(organization_id);
CREATE INDEX idx_rated_time_line_time_entry ON payroll.rated_time_line(time_entry_id);
CREATE INDEX idx_rated_time_line_component ON payroll.rated_time_line(pay_component_id);

-- ===================================
-- SECTION 6: WORK SCHEDULING
-- Employee scheduling and schedule change management
-- ===================================

-- 6.1 Work Schedules
CREATE TABLE payroll.work_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  employee_record_id UUID NOT NULL REFERENCES payroll.employee_record(id),
  shift_type_id UUID REFERENCES payroll.shift_type(id),
  
  -- Schedule Details
  schedule_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  expected_hours DECIMAL(5,2) NOT NULL,
  
  -- Location
  location_id UUID, -- Reference to location
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_work_schedule_org ON payroll.work_schedule(organization_id);
CREATE INDEX idx_work_schedule_employee ON payroll.work_schedule(employee_record_id);
CREATE INDEX idx_work_schedule_date ON payroll.work_schedule(schedule_date DESC);
CREATE INDEX idx_work_schedule_status ON payroll.work_schedule(status) WHERE deleted_at IS NULL;

-- 6.2 Schedule Change Requests
-- Workflow for schedule modifications
CREATE TABLE payroll.schedule_change_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  work_schedule_id UUID NOT NULL REFERENCES payroll.work_schedule(id),
  requested_by_employee_id UUID NOT NULL, -- Reference to employee
  
  -- Change Details
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('time_change', 'shift_swap', 'cancellation')),
  
  -- Original Values
  original_start_time TIME,
  original_end_time TIME,
  original_shift_type_id UUID REFERENCES payroll.shift_type(id),
  
  -- Requested Values
  requested_start_time TIME,
  requested_end_time TIME,
  requested_shift_type_id UUID REFERENCES payroll.shift_type(id),
  swap_with_employee_id UUID, -- If shift swap
  
  -- Request Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reason TEXT,
  
  -- Approval
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES core.users(id),
  review_notes TEXT,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schedule_change_request_org ON payroll.schedule_change_request(organization_id);
CREATE INDEX idx_schedule_change_request_schedule ON payroll.schedule_change_request(work_schedule_id);
CREATE INDEX idx_schedule_change_request_employee ON payroll.schedule_change_request(requested_by_employee_id);
CREATE INDEX idx_schedule_change_request_status ON payroll.schedule_change_request(status);

-- ===================================
-- SECTION 7: TIMESHEETS (Legacy/Simple Time Tracking)
-- Simplified timesheet system for organizations not using full T&A
-- ===================================

CREATE TABLE payroll.timesheet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  employee_record_id UUID NOT NULL REFERENCES payroll.employee_record(id),
  
  -- Time Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Hours
  regular_hours DECIMAL(8,2) DEFAULT 0,
  overtime_hours DECIMAL(8,2) DEFAULT 0,
  double_time_hours DECIMAL(8,2) DEFAULT 0,
  pto_hours DECIMAL(8,2) DEFAULT 0,
  sick_hours DECIMAL(8,2) DEFAULT 0,
  holiday_hours DECIMAL(8,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'processed')),
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES core.users(id),
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_timesheet_org ON payroll.timesheet(organization_id);
CREATE INDEX idx_timesheet_employee ON payroll.timesheet(employee_record_id);
CREATE INDEX idx_timesheet_period ON payroll.timesheet(period_start, period_end);
CREATE INDEX idx_timesheet_status ON payroll.timesheet(status) WHERE deleted_at IS NULL;

-- ===================================
-- SECTION 8: PAYROLL RUNS & PROCESSING
-- Payroll run execution and paycheck generation
-- ===================================

-- 8.1 Payroll Runs
CREATE TABLE payroll.payroll_run (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  
  -- Run Information
  run_number VARCHAR(50) NOT NULL,
  run_name VARCHAR(200),
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  payment_date DATE NOT NULL,
  
  -- Run Type
  run_type VARCHAR(20) CHECK (run_type IN ('regular', 'off_cycle', 'bonus', 'correction', 'final')),
  
  -- Summary Totals
  total_employees INTEGER DEFAULT 0,
  total_gross_pay DECIMAL(15,2) DEFAULT 0,
  total_net_pay DECIMAL(15,2) DEFAULT 0,
  total_taxes DECIMAL(15,2) DEFAULT 0,
  total_deductions DECIMAL(15,2) DEFAULT 0,
  total_employer_taxes DECIMAL(15,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'calculating', 'calculated', 'review', 'approved', 
    'processing', 'completed', 'cancelled', 'failed'
  )),
  
  -- Processing Timestamps
  calculated_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES core.users(id),
  processing_started_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  -- Error Handling
  error_message TEXT,
  error_count INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP,
  
  UNIQUE(organization_id, run_number)
);

CREATE INDEX idx_payroll_run_org ON payroll.payroll_run(organization_id);
CREATE INDEX idx_payroll_run_status ON payroll.payroll_run(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_payroll_run_payment_date ON payroll.payroll_run(payment_date DESC);
CREATE INDEX idx_payroll_run_period ON payroll.payroll_run(pay_period_start, pay_period_end);

-- 8.2 Paychecks
CREATE TABLE payroll.paycheck (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  payroll_run_id UUID NOT NULL REFERENCES payroll.payroll_run(id),
  employee_record_id UUID NOT NULL REFERENCES payroll.employee_record(id),
  
  -- Payment Details
  check_number VARCHAR(50),
  payment_date DATE NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  
  -- Earnings (Summary)
  gross_pay DECIMAL(12,2) NOT NULL,
  regular_pay DECIMAL(12,2) DEFAULT 0,
  overtime_pay DECIMAL(12,2) DEFAULT 0,
  double_time_pay DECIMAL(12,2) DEFAULT 0,
  bonus DECIMAL(12,2) DEFAULT 0,
  commission DECIMAL(12,2) DEFAULT 0,
  other_earnings DECIMAL(12,2) DEFAULT 0,
  
  -- Deductions (Summary)
  federal_tax DECIMAL(12,2) DEFAULT 0,
  state_tax DECIMAL(12,2) DEFAULT 0,
  local_tax DECIMAL(12,2) DEFAULT 0,
  social_security DECIMAL(12,2) DEFAULT 0,
  medicare DECIMAL(12,2) DEFAULT 0,
  pre_tax_deductions DECIMAL(12,2) DEFAULT 0,
  post_tax_deductions DECIMAL(12,2) DEFAULT 0,
  
  -- Net Pay
  net_pay DECIMAL(12,2) NOT NULL,
  
  -- YTD Totals
  ytd_gross DECIMAL(15,2) DEFAULT 0,
  ytd_net DECIMAL(15,2) DEFAULT 0,
  ytd_federal_tax DECIMAL(15,2) DEFAULT 0,
  ytd_state_tax DECIMAL(15,2) DEFAULT 0,
  ytd_social_security DECIMAL(15,2) DEFAULT 0,
  ytd_medicare DECIMAL(15,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'issued', 'cancelled', 'voided', 'stopped'
  )),
  
  -- Payment Details
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('direct_deposit', 'check', 'ach', 'wire')),
  transaction_id VARCHAR(100),
  
  -- Void/Cancel Information
  voided_at TIMESTAMP,
  voided_by UUID REFERENCES core.users(id),
  void_reason TEXT,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_paycheck_org ON payroll.paycheck(organization_id);
CREATE INDEX idx_paycheck_run ON payroll.paycheck(payroll_run_id);
CREATE INDEX idx_paycheck_employee ON payroll.paycheck(employee_record_id);
CREATE INDEX idx_paycheck_payment_date ON payroll.paycheck(payment_date DESC);
CREATE INDEX idx_paycheck_status ON payroll.paycheck(status) WHERE deleted_at IS NULL;

-- 8.3 Payroll Run Components (Detailed line items)
-- Stores individual pay component calculations per paycheck
CREATE TABLE payroll.payroll_run_component (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  paycheck_id UUID NOT NULL REFERENCES payroll.paycheck(id),
  pay_component_id UUID NOT NULL REFERENCES payroll.pay_component(id),
  
  -- Component Values
  quantity DECIMAL(10,4), -- Hours, units, etc.
  rate DECIMAL(12,4), -- Rate per unit
  amount DECIMAL(12,2) NOT NULL,
  
  -- Calculation Details
  calculation_note TEXT, -- How this was calculated
  
  -- Source Reference
  source_type VARCHAR(50), -- 'time_entry', 'timesheet', 'manual', 'formula'
  source_id UUID, -- ID of source record
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payroll_run_component_org ON payroll.payroll_run_component(organization_id);
CREATE INDEX idx_payroll_run_component_paycheck ON payroll.payroll_run_component(paycheck_id);
CREATE INDEX idx_payroll_run_component_component ON payroll.payroll_run_component(pay_component_id);

-- ===================================
-- SECTION 9: EMPLOYEE DEDUCTIONS
-- Employee-specific deduction assignments
-- ===================================

CREATE TABLE payroll.employee_deduction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  employee_record_id UUID NOT NULL REFERENCES payroll.employee_record(id),
  deductible_cost_rule_id UUID REFERENCES payroll.deductible_cost_rule(id),
  
  -- Deduction Details
  deduction_name VARCHAR(100) NOT NULL,
  deduction_type VARCHAR(50) NOT NULL CHECK (deduction_type IN ('pre_tax', 'post_tax', 'garnishment', 'loan')),
  category VARCHAR(50) CHECK (category IN ('health_insurance', 'dental', 'vision', 'retirement', '401k', 'hsa', 'fsa', 'loan', 'garnishment', 'other')),
  
  -- Amount Configuration
  amount_type VARCHAR(20) NOT NULL CHECK (amount_type IN ('fixed', 'percentage', 'formula')),
  amount DECIMAL(12,2),
  percentage DECIMAL(6,4),
  
  -- Limits
  per_paycheck_limit DECIMAL(12,2),
  annual_limit DECIMAL(12,2),
  ytd_amount DECIMAL(12,2) DEFAULT 0,
  
  -- Priority (for garnishments)
  priority INTEGER DEFAULT 0,
  
  -- Effective Period
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_employee_deduction_org ON payroll.employee_deduction(organization_id);
CREATE INDEX idx_employee_deduction_employee ON payroll.employee_deduction(employee_record_id);
CREATE INDEX idx_employee_deduction_rule ON payroll.employee_deduction(deductible_cost_rule_id);
CREATE INDEX idx_employee_deduction_active ON payroll.employee_deduction(is_active) WHERE deleted_at IS NULL;

-- ===================================
-- SECTION 10: PAYMENT PROCESSING
-- Payment execution and tracking
-- ===================================

CREATE TABLE payroll.payment_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  paycheck_id UUID NOT NULL REFERENCES payroll.paycheck(id),
  
  -- Payment Details
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('direct_deposit', 'check', 'ach', 'wire', 'cash')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'initiated', 'processing', 'completed', 'failed', 'returned', 'cancelled'
  )),
  amount DECIMAL(12,2) NOT NULL,
  
  -- Bank Details (for electronic payments)
  bank_name VARCHAR(200),
  account_number_last4 VARCHAR(4),
  routing_number_last4 VARCHAR(4),
  
  -- Processing Timestamps
  initiated_at TIMESTAMP,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  returned_at TIMESTAMP,
  
  -- Error Handling
  failure_reason TEXT,
  return_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- External References
  transaction_id VARCHAR(100),
  external_reference VARCHAR(100),
  batch_id VARCHAR(100), -- ACH batch ID
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_transaction_org ON payroll.payment_transaction(organization_id);
CREATE INDEX idx_payment_transaction_paycheck ON payroll.payment_transaction(paycheck_id);
CREATE INDEX idx_payment_transaction_status ON payroll.payment_transaction(payment_status);
CREATE INDEX idx_payment_transaction_batch ON payroll.payment_transaction(batch_id);

-- ===================================
-- SECTION 11: RECONCILIATION
-- Payroll reconciliation and adjustments
-- ===================================

-- 11.1 Reconciliation Records
-- Tracks reconciliation processes
CREATE TABLE payroll.reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  payroll_run_id UUID NOT NULL REFERENCES payroll.payroll_run(id),
  
  -- Reconciliation Details
  reconciliation_type VARCHAR(50) NOT NULL CHECK (reconciliation_type IN (
    'bank', 'tax', 'gl', 'benefits', 'deductions', 'manual'
  )),
  reconciliation_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'discrepancy', 'resolved'
  )),
  
  -- Totals
  expected_amount DECIMAL(15,2) NOT NULL,
  actual_amount DECIMAL(15,2),
  variance_amount DECIMAL(15,2),
  
  -- Discrepancy Tracking
  has_discrepancy BOOLEAN DEFAULT false,
  discrepancy_count INTEGER DEFAULT 0,
  
  -- Resolution
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES core.users(id),
  resolution_notes TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id)
);

CREATE INDEX idx_reconciliation_org ON payroll.reconciliation(organization_id);
CREATE INDEX idx_reconciliation_run ON payroll.reconciliation(payroll_run_id);
CREATE INDEX idx_reconciliation_type ON payroll.reconciliation(reconciliation_type);
CREATE INDEX idx_reconciliation_status ON payroll.reconciliation(status);
CREATE INDEX idx_reconciliation_date ON payroll.reconciliation(reconciliation_date DESC);

-- 11.2 Reconciliation Items (Detailed discrepancies)
CREATE TABLE payroll.reconciliation_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES payroll.reconciliation(id) ON DELETE CASCADE,
  
  -- Item Details
  item_type VARCHAR(50) NOT NULL, -- 'paycheck', 'deduction', 'tax', 'adjustment'
  reference_id UUID, -- ID of related record
  employee_record_id UUID REFERENCES payroll.employee_record(id),
  
  -- Variance Details
  expected_amount DECIMAL(12,2) NOT NULL,
  actual_amount DECIMAL(12,2) NOT NULL,
  variance_amount DECIMAL(12,2) NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'exception')),
  
  -- Resolution
  resolution_action VARCHAR(50), -- 'adjustment', 'correction', 'accepted', 'waived'
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES core.users(id),
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reconciliation_item_reconciliation ON payroll.reconciliation_item(reconciliation_id);
CREATE INDEX idx_reconciliation_item_employee ON payroll.reconciliation_item(employee_record_id);
CREATE INDEX idx_reconciliation_item_status ON payroll.reconciliation_item(status);

-- 11.3 Payroll Adjustments
-- Manual adjustments to paychecks
CREATE TABLE payroll.payroll_adjustment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  paycheck_id UUID REFERENCES payroll.paycheck(id),
  employee_record_id UUID NOT NULL REFERENCES payroll.employee_record(id),
  
  -- Adjustment Details
  adjustment_type VARCHAR(50) NOT NULL CHECK (adjustment_type IN (
    'correction', 'bonus', 'reimbursement', 'deduction', 'garnishment', 'manual'
  )),
  description TEXT NOT NULL,
  
  -- Amount
  amount DECIMAL(12,2) NOT NULL,
  affects_gross BOOLEAN DEFAULT true,
  is_taxable BOOLEAN DEFAULT true,
  
  -- Effective Date
  adjustment_date DATE NOT NULL,
  apply_to_payroll_run_id UUID REFERENCES payroll.payroll_run(id),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'applied', 'cancelled')),
  
  -- Approval
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES core.users(id),
  applied_at TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES core.users(id),
  updated_by UUID REFERENCES core.users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_payroll_adjustment_org ON payroll.payroll_adjustment(organization_id);
CREATE INDEX idx_payroll_adjustment_paycheck ON payroll.payroll_adjustment(paycheck_id);
CREATE INDEX idx_payroll_adjustment_employee ON payroll.payroll_adjustment(employee_record_id);
CREATE INDEX idx_payroll_adjustment_status ON payroll.payroll_adjustment(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_payroll_adjustment_date ON payroll.payroll_adjustment(adjustment_date DESC);

-- ===================================
-- SECTION 12: REPORTING VIEWS
-- Optimized views for common queries
-- ===================================

-- Employee Payroll Summary View
CREATE VIEW payroll.v_employee_payroll_summary AS
SELECT 
  er.id as employee_record_id,
  er.organization_id,
  er.employee_id,
  er.employee_number,
  er.status,
  wt.worker_type_template_id,
  wtt.name as worker_type_name,
  c.compensation_type,
  c.amount as current_compensation,
  COUNT(DISTINCT pc.id) as total_paychecks_ytd,
  SUM(pc.gross_pay) as ytd_gross_pay,
  SUM(pc.net_pay) as ytd_net_pay,
  SUM(pc.federal_tax + pc.state_tax + pc.local_tax) as ytd_taxes,
  SUM(pc.social_security + pc.medicare) as ytd_fica
FROM payroll.employee_record er
LEFT JOIN payroll.worker_type wt ON wt.employee_id = er.employee_id AND wt.is_current = true
LEFT JOIN payroll.worker_type_template wtt ON wtt.id = wt.worker_type_template_id
LEFT JOIN payroll.compensation c ON c.employee_record_id = er.id AND c.is_current = true
LEFT JOIN payroll.paycheck pc ON pc.employee_record_id = er.id 
  AND EXTRACT(YEAR FROM pc.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND pc.status IN ('issued', 'completed')
WHERE er.deleted_at IS NULL
GROUP BY er.id, er.organization_id, er.employee_id, er.employee_number, er.status,
         wt.worker_type_template_id, wtt.name, c.compensation_type, c.amount;

-- Payroll Run Summary View
CREATE VIEW payroll.v_payroll_run_summary AS
SELECT 
  pr.id as payroll_run_id,
  pr.organization_id,
  pr.run_number,
  pr.run_name,
  pr.pay_period_start,
  pr.pay_period_end,
  pr.payment_date,
  pr.status,
  pr.total_employees,
  pr.total_gross_pay,
  pr.total_net_pay,
  pr.total_taxes,
  pr.total_deductions,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.status = 'issued') as paychecks_issued,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.status = 'pending') as paychecks_pending,
  COUNT(DISTINCT pt.id) FILTER (WHERE pt.payment_status = 'completed') as payments_completed,
  COUNT(DISTINCT pt.id) FILTER (WHERE pt.payment_status = 'failed') as payments_failed
FROM payroll.payroll_run pr
LEFT JOIN payroll.paycheck pc ON pc.payroll_run_id = pr.id AND pc.deleted_at IS NULL
LEFT JOIN payroll.payment_transaction pt ON pt.paycheck_id = pc.id
WHERE pr.deleted_at IS NULL
GROUP BY pr.id, pr.organization_id, pr.run_number, pr.run_name, pr.pay_period_start, 
         pr.pay_period_end, pr.payment_date, pr.status, pr.total_employees, 
         pr.total_gross_pay, pr.total_net_pay, pr.total_taxes, pr.total_deductions;

-- Time Entry Summary View (for managers)
CREATE VIEW payroll.v_time_entry_summary AS
SELECT 
  te.id as time_entry_id,
  te.organization_id,
  te.employee_record_id,
  er.employee_number,
  te.entry_date,
  te.entry_type,
  te.total_hours,
  te.break_hours,
  te.worked_hours,
  te.status,
  st.name as shift_type,
  te.approved_at,
  COUNT(rtl.id) as rated_lines_count,
  SUM(rtl.amount) as estimated_pay
FROM payroll.time_entry te
JOIN payroll.employee_record er ON er.id = te.employee_record_id
LEFT JOIN payroll.shift_type st ON st.id = te.shift_type_id
LEFT JOIN payroll.rated_time_line rtl ON rtl.time_entry_id = te.id
WHERE te.deleted_at IS NULL
GROUP BY te.id, te.organization_id, te.employee_record_id, er.employee_number, 
         te.entry_date, te.entry_type, te.total_hours, te.break_hours, te.worked_hours,
         te.status, st.name, te.approved_at;
```

---

## 🔍 Detailed Tasks

### Task 8.1: Design Enterprise Payroll Schema (2 days)

**Assignee:** Database Architect + Senior Backend Developer

**Actions:**
1. ✅ Design comprehensive payroll data model with all ERD tables
2. ✅ Define worker type management system
3. ✅ Design sophisticated tax engine with rule sets and brackets
4. ✅ Design flexible pay component system with formulas
5. ✅ Design time & attendance tracking with shift management
6. ✅ Design work scheduling and change request workflow
7. ✅ Design reconciliation system
8. ✅ Define all table relationships and constraints
9. ✅ Document MVP vs Phase 2 features
10. ✅ Review with backend team and stakeholders

**Standards:** Follow DATABASE_STANDARDS.md

**Notes:** 
- Full ERD schema with 35+ tables
- MVP approach: Simplified formulas and business logic initially
- Phase 2: Advanced formula parser, complex tax calculations, full scheduling

### Task 8.2: Create Core Migration Scripts (1.5 days)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Write `003_create_payroll_schema_part1.sql` (Worker Types, Employee Records, Compensation)
2. ✅ Write `003_create_payroll_schema_part2.sql` (Tax Engine tables)
3. ✅ Write `003_create_payroll_schema_part3.sql` (Time & Attendance, Scheduling)
4. ✅ Write `003_create_payroll_schema_part4.sql` (Payroll Processing, Reconciliation)
5. ✅ Include all tables with proper constraints
6. ✅ Add comprehensive indexes for performance
7. ✅ Create reporting views
8. ✅ Test migrations on development database

**Standards:** Follow DATABASE_STANDARDS.md

### Task 8.3: Create Seed Data (1 day)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Create worker type templates (Full-Time, Part-Time, Contractor)
2. ✅ Seed US federal and state tax rule sets for 2025
3. ✅ Create tax brackets for progressive taxation
4. ✅ Seed standard allowances and exemptions
5. ✅ Create deductible cost rules (401k, health insurance, HSA)
6. ✅ Create standard pay components (Base, Overtime, Bonus)
7. ✅ Create shift types (Day, Night, Weekend)
8. ✅ Create sample employee payroll records
9. ✅ Create sample compensation and deductions
10. ✅ Create sample time entries and schedules
11. ✅ Verify data integrity and relationships

**Standards:** Follow DATABASE_STANDARDS.md

### Task 8.4: Write Comprehensive Database Tests (0.5 days)

**Assignee:** QA + Backend Developer

**Actions:**
1. ✅ Test all table constraints
2. ✅ Test foreign key relationships
3. ✅ Test views return correct data
4. ✅ Test indexes improve query performance
5. ✅ Verify tenant isolation works

**Standards:** Follow TESTING_STANDARDS.md

---

## � Phase 2 Enhancements

The following features are documented in the schema but will have **simplified implementation** in MVP, with full sophistication added in Phase 2:

### Formula Engine (component_formula table)
- **MVP:** Support simple arithmetic expressions: `(hours * rate)`, `(base * 1.5)`
- **Phase 2:** Full formula parser with:
  - Conditional logic (if/then/else)
  - Function library (round, max, min, sum)
  - Variable substitution from multiple sources
  - Validation and error handling
  - Formula testing interface

### Tax Calculation Engine
- **MVP:** Bracket-based progressive tax with simple lookups
- **Phase 2:** Advanced features:
  - Multi-jurisdictional tax calculation (federal + state + local simultaneously)
  - Withholding certificate parsing (W-4 forms)
  - Tax treaty processing for international workers
  - Quarterly and annual tax projections
  - What-if tax scenario modeling

### Time & Attendance
- **MVP:** Manual time entry and simple approval workflow
- **Phase 2:** Advanced features:
  - Automated clock-in/out from biometric devices
  - GPS-based location verification
  - Real-time labor cost tracking
  - Overtime prediction and alerts
  - Integration with physical time clocks
  - Mobile app for remote workers

### Work Scheduling
- **MVP:** Basic schedule creation and change requests
- **Phase 2:** Advanced features:
  - Automated schedule generation based on business rules
  - Shift optimization algorithms
  - Labor demand forecasting
  - Employee availability matching
  - Shift swapping marketplace
  - Schedule conflict detection and resolution

### Reconciliation
- **MVP:** Manual reconciliation with basic variance tracking
- **Phase 2:** Advanced features:
  - Automated bank reconciliation via API
  - GL integration with automated journal entries
  - Benefits provider reconciliation
  - Tax filing reconciliation
  - Automated discrepancy detection and alerts
  - Reconciliation workflow automation

### Deductible Cost Rules
- **MVP:** Simple pre-tax/post-tax deduction configuration
- **Phase 2:** Advanced features:
  - Employer matching calculations
  - Catch-up contributions (age 50+)
  - HSA/FSA contribution tracking with limits
  - Garnishment priority processing
  - Loan repayment tracking with interest
  - Automatic deduction start/stop based on life events

---

## �📋 Standards Compliance Checklist

- [ ] All tables follow DATABASE_STANDARDS.md naming (snake_case)
- [ ] Required audit columns present (created_at, updated_at, created_by, updated_by, deleted_at)
- [ ] organization_id present for tenant isolation
- [ ] All foreign keys properly defined
- [ ] Indexes on frequently queried columns
- [ ] CHECK constraints for valid values
- [ ] Proper data types for financial data (DECIMAL)
- [ ] Documentation for all tables and columns

---

## 🎯 Success Criteria

Phase 8 is complete when:

1. ✅ **Enterprise schema created** - All 35 tables from ERD implemented
2. ✅ **Worker type system ready** - Template-based employee classification
3. ✅ **Tax engine foundation** - Rule sets, brackets, allowances, deductions
4. ✅ **Pay component system** - Flexible earning/deduction components with formula support
5. ✅ **Time & attendance tables** - Events, entries, rated lines
6. ✅ **Scheduling system** - Work schedules and change requests
7. ✅ **Payroll processing tables** - Runs, paychecks, components
8. ✅ **Reconciliation system** - Reconciliation records and items
9. ✅ **All relationships validated** - Foreign keys and constraints working
10. ✅ **Indexes optimized** - Query performance meets benchmarks
11. ✅ **Views functional** - Reporting views return accurate data
12. ✅ **Migration tested** - Runs without errors on clean database
13. ✅ **Test data seeded** - Representative data for all major tables
14. ✅ **Database tests pass** - All constraint and integrity tests pass
15. ✅ **Schema review approved** - Team sign-off on design
16. ✅ **Documentation complete** - ERD diagram and table documentation
17. ✅ **Complies with regulations** - Payroll compliance requirements met
18. ✅ **Phase 2 features documented** - Clear separation of MVP vs advanced features

---

## 📤 Outputs

### Database Migrations
- [ ] `backend/database/migrations/003_create_payroll_schema_part1.sql` - Worker Types & Employee Records
- [ ] `backend/database/migrations/003_create_payroll_schema_part2.sql` - Tax Engine
- [ ] `backend/database/migrations/003_create_payroll_schema_part3.sql` - Time & Attendance
- [ ] `backend/database/migrations/003_create_payroll_schema_part4.sql` - Payroll Processing & Reconciliation
- [ ] `backend/database/seeds/payroll_worker_types.sql` - Worker type templates
- [ ] `backend/database/seeds/payroll_tax_rates_2025.sql` - US tax rates and brackets
- [ ] `backend/database/seeds/payroll_pay_components.sql` - Standard pay components
- [ ] `backend/database/seeds/payroll_test_data.sql` - Sample employee data

### Documentation
- [ ] `docs/database/payroll_schema_diagram.pdf` - Complete ERD diagram
- [ ] `docs/database/payroll_tables.md` - Table-by-table documentation
- [ ] `docs/database/payroll_tax_engine.md` - Tax calculation documentation
- [ ] `docs/database/payroll_formulas.md` - Formula system documentation
- [ ] `docs/database/payroll_mvp_vs_phase2.md` - Feature implementation roadmap

### Tests
- [ ] `backend/tests/database/payroll-schema.test.js` - Schema validation tests
- [ ] `backend/tests/database/payroll-constraints.test.js` - Constraint tests
- [ ] `backend/tests/database/payroll-integrity.test.js` - Data integrity tests
- [ ] `backend/tests/database/payroll-performance.test.js` - Index performance tests

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tax calculation errors | **Critical** | Validate against official IRS/state tax tables; CPA review; automated testing |
| Data privacy violations (PII/SSN) | **Critical** | Encrypt at rest (tax_id, account_number); field-level encryption; audit logging |
| Formula execution security | **High** | Sandboxed formula execution; input validation; no eval() in MVP |
| Performance with large datasets | **High** | Proper indexing strategy; table partitioning by year; archive old data |
| Compliance issues (FLSA, state laws) | **Critical** | Legal review; compliance officer sign-off; regular audits |
| Schema complexity increases development time | **High** | Clear MVP scope; Phase 2 deferred features; good documentation |
| Schema changes after release | **Medium** | Version all migrations; backward compatibility; blue-green deployments |
| Multi-jurisdictional tax complexity | **High** | Start with US-only; add intl in Phase 2; use tax service APIs |

---

## 🔗 Related Phases

- **Previous:** [Phase 7: Integration Bus Infrastructure](./PHASE_07_INTEGRATION_BUS.md)
- **Next:** [Phase 9: Paylinq Product - Backend](./PHASE_09_PAYLINQ_BACKEND.md)
- **Related:** [Phase 3: Database Schema Design](./PHASE_03_DATABASE_SCHEMA.md)

---

## ⏭️ Next Phase

**[Phase 9: Paylinq Product - Backend](./PHASE_09_PAYLINQ_BACKEND.md)**

Upon completion of Phase 8, proceed to Phase 9 to implement the Paylinq backend services, repositories, controllers, and routes.

---

**Phase Owner:** Database Architect + Senior Backend Developer  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start  
**Complexity:** High (Enterprise-grade schema with 35 tables)  
**Approach:** Hybrid (Full ERD structure, simplified MVP business logic, Phase 2 advanced features)
