-- ================================================================
-- PAYLINQ DATABASE SCHEMA
-- Comprehensive payroll processing schema for RecruitIQ Platform
-- 
-- Schema: payroll
-- Tables: 23
-- Features: Employee payroll records, compensation, time & attendance,
--           tax calculation, deductions, pay components, payroll runs,
--           paychecks, payments, reconciliation, worker types, scheduling
-- 
-- Version: 1.0.0
-- Created: Phase 11 - Database Schema Implementation
-- Updated: November 6, 2025 - Added formula engine support
-- ================================================================

-- ================================================================
-- DROP AND RECREATE SCHEMA (Clean slate)
-- ================================================================

DROP SCHEMA IF EXISTS payroll CASCADE;
CREATE SCHEMA payroll;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS btree_gist; -- Required for GIST indexes on UUID/date ranges

-- Set search path
SET search_path TO payroll, public;

-- ================================================================
-- EMPLOYEE PAYROLL CONFIGURATION
-- NOTE: Employee core data (name, email, employee_number, hire_date, etc.) lives in hris.employee
-- This schema ONLY contains payroll-specific configuration and data
-- ================================================================

-- Employee payroll configuration (payroll-specific data for each employee)
CREATE TABLE IF NOT EXISTS payroll.employee_payroll_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  
  -- Pay configuration (ONLY payroll-specific fields)
  pay_frequency VARCHAR(20) NOT NULL CHECK (pay_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('direct_deposit', 'check', 'cash', 'card')),
  currency VARCHAR(3) DEFAULT 'SRD',
  
  -- Bank information (for direct deposit)
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  routing_number VARCHAR(50),
  account_type VARCHAR(20) CHECK (account_type IN ('checking', 'savings')),
  
  -- Tax information
  tax_id VARCHAR(50), -- National ID or Tax ID number
  tax_filing_status VARCHAR(20), -- single, married, head_of_household
  tax_allowances INTEGER DEFAULT 0,
  additional_withholding NUMERIC(12, 2) DEFAULT 0,
  
  -- Payroll status (can differ from employment status)
  payroll_status VARCHAR(20) DEFAULT 'active' CHECK (payroll_status IN ('active', 'suspended', 'terminated')),
  payroll_start_date DATE NOT NULL,
  payroll_end_date DATE,
  
  -- Additional payroll metadata
  metadata JSONB,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(organization_id, employee_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE CASCADE
);

COMMENT ON TABLE payroll.employee_payroll_config IS 'Payroll-specific configuration for employees. Core employee data is in hris.employee (single source of truth)';
COMMENT ON COLUMN payroll.employee_payroll_config.employee_id IS 'References hris.employee(id) - the single source of truth for employee data';

-- Compensation records (salary/wage history with effective dates)
CREATE TABLE IF NOT EXISTS payroll.compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  
  -- Compensation details
  compensation_type VARCHAR(20) NOT NULL CHECK (compensation_type IN ('hourly', 'salary', 'commission', 'bonus')),
  amount NUMERIC(12, 2) NOT NULL, -- Primary amount (single source of truth)
  overtime_rate NUMERIC(12, 2), -- Overtime rate (e.g., 1.5x)
  
  -- Effective dates
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_current BOOLEAN DEFAULT true,
  currency VARCHAR(3) DEFAULT 'SRD',
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(employee_id, effective_from),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE CASCADE
);

COMMENT ON TABLE payroll.compensation IS 'Compensation history for employees - SINGLE SOURCE OF TRUTH for base salary/hourly rate. Pay structures (worker_pay_structure) reference this data for calculations.';
COMMENT ON COLUMN payroll.compensation.employee_id IS 'References hris.employee(id) - the single source of truth';
COMMENT ON COLUMN payroll.compensation.amount IS 'Primary compensation amount - interpreted based on compensation_type and pay_frequency. For monthly salary, this is the monthly amount. For hourly, this is typically the hourly rate (or use hourly_rate field).';


-- ================================================================
-- WORKER TYPE MANAGEMENT
-- ================================================================

-- Worker type templates (employee classification: FTE, contractor, etc.)
CREATE TABLE IF NOT EXISTS payroll.worker_type_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template details
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description TEXT,
  
  -- Default settings for this worker type
  default_pay_frequency VARCHAR(20),
  default_payment_method VARCHAR(20),
  
  -- Eligibility flags
  benefits_eligible BOOLEAN DEFAULT true,
  overtime_eligible BOOLEAN DEFAULT true,
  pto_eligible BOOLEAN DEFAULT true,
  sick_leave_eligible BOOLEAN DEFAULT true,
  vacation_accrual_rate NUMERIC(5, 2) DEFAULT 0, -- Hours per pay period
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(organization_id, code),
  UNIQUE(organization_id, name),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Worker type assignments (historical tracking of employee worker types)
CREATE TABLE IF NOT EXISTS payroll.worker_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.user_account(id), -- References platform user
  worker_type_template_id UUID NOT NULL REFERENCES payroll.worker_type_template(id),
  
  -- Assignment details
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_current BOOLEAN DEFAULT true,
  
  -- Overrides (optional, defaults come from template)
  pay_frequency VARCHAR(20),
  payment_method VARCHAR(20),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(organization_id, employee_id, worker_type_template_id, effective_from),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_type_template_id) REFERENCES payroll.worker_type_template(id)
);

-- ================================================================
-- TIME & ATTENDANCE
-- ================================================================

-- Shift types (defines different shifts: morning, evening, night, etc.)
CREATE TABLE IF NOT EXISTS payroll.shift_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Shift details
  shift_name VARCHAR(100) NOT NULL,
  shift_code VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours NUMERIC(5, 2) NOT NULL,
  is_overnight BOOLEAN DEFAULT false, -- Shift crosses midnight
  
  -- Break configuration
  break_duration_minutes INTEGER DEFAULT 0,
  is_paid_break BOOLEAN DEFAULT false,
  
  -- Shift differential (additional pay rate for this shift)
  shift_differential_rate NUMERIC(5, 2) DEFAULT 0, -- Percentage or fixed amount
  
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(organization_id, shift_code),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Time attendance events (clock in/out events)
CREATE TABLE IF NOT EXISTS payroll.time_attendance_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id),
  
  -- Event details
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Location tracking (Phase 2: GPS verification, biometric)
  location_id UUID, -- Optional location/site ID
  gps_latitude NUMERIC(10, 7),
  gps_longitude NUMERIC(10, 7),
  device_id VARCHAR(100), -- Device identifier for tracking
  ip_address INET,
  
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE CASCADE
);

-- Time entries (approved time worked, can be from clock events or manual entry)
CREATE TABLE IF NOT EXISTS payroll.time_entry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id),
  
  -- Time entry details
  entry_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  
  -- Hours breakdown
  worked_hours NUMERIC(5, 2) NOT NULL DEFAULT 0, -- Total hours
  regular_hours NUMERIC(5, 2) DEFAULT 0,
  overtime_hours NUMERIC(5, 2) DEFAULT 0,
  break_hours NUMERIC(5, 2) DEFAULT 0,
  
  -- Shift association
  shift_type_id UUID REFERENCES payroll.shift_type(id),
  
  -- Entry metadata
  entry_type VARCHAR(20) DEFAULT 'regular' CHECK (entry_type IN ('regular', 'overtime', 'pto', 'sick', 'holiday', 'unpaid')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  notes TEXT,
  
  -- Approval tracking
  approved_by UUID REFERENCES hris.user_account(id),
  approved_at TIMESTAMPTZ,
  
  -- Link to clock events
  clock_in_event_id UUID REFERENCES payroll.time_attendance_event(id),
  clock_out_event_id UUID REFERENCES payroll.time_attendance_event(id),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE CASCADE
);

-- Timesheets (grouped time entries for pay period)
CREATE TABLE IF NOT EXISTS payroll.timesheet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id),
  
  -- Period covered
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Hours summary
  regular_hours NUMERIC(5, 2) DEFAULT 0,
  overtime_hours NUMERIC(5, 2) DEFAULT 0,
  pto_hours NUMERIC(5, 2) DEFAULT 0,
  sick_hours NUMERIC(5, 2) DEFAULT 0,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  notes TEXT,
  
  -- Approval tracking
  approved_by UUID REFERENCES hris.user_account(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES hris.user_account(id),
  rejected_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(employee_id, period_start, period_end),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE CASCADE
);

COMMENT ON COLUMN payroll.timesheet.employee_id IS 'References hris.employee(id) - the single source of truth';

-- ================================================================
-- PAY COMPONENTS (EARNINGS & DEDUCTIONS)
-- ================================================================

-- Pay components (standard earnings and deduction types)
CREATE TABLE IF NOT EXISTS payroll.pay_component (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Component identification
  component_code VARCHAR(50) NOT NULL,
  component_name VARCHAR(100) NOT NULL,
  component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('earning', 'deduction')),
  category VARCHAR(50), -- 'regular_pay', 'overtime', 'bonus', 'commission', 'benefit', 'tax', etc.
  
  -- Calculation method
  calculation_type VARCHAR(20) NOT NULL CHECK (calculation_type IN ('fixed_amount', 'percentage', 'hourly_rate', 'formula')),
  default_rate NUMERIC(12, 2), -- Default rate (hourly rate, percentage, etc.)
  default_amount NUMERIC(12, 2), -- Default fixed amount
  
  -- Formula support (Hybrid approach)
  formula TEXT, -- Simple formula expression (e.g., "gross_pay * 0.10")
  formula_id UUID, -- Complex formula reference (FK added later to avoid circular dependency)
  metadata JSONB, -- Additional data: formula AST, variables, validation results, etc.
  
  -- Tax treatment
  is_taxable BOOLEAN DEFAULT true,
  is_recurring BOOLEAN DEFAULT false, -- Appears on every paycheck
  is_pre_tax BOOLEAN DEFAULT false, -- Pre-tax deduction (like 401k)
  is_system_component BOOLEAN DEFAULT false, -- System-managed (can't be deleted)
  applies_to_gross BOOLEAN DEFAULT false, -- Applied to gross pay
  
  -- GAAP compliance
  gaap_category VARCHAR(50), -- 'labor_cost', 'benefits', 'taxes', 'deductions', 'reimbursements'
  
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(organization_id, component_code),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Component formulas (for complex pay component calculations with conditionals and AST)
-- Note: This table is independent to avoid circular FK dependency with pay_component
CREATE TABLE IF NOT EXISTS payroll.component_formula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pay_component_id UUID, -- Nullable to avoid circular dependency, populated after pay_component creation
  
  -- Formula details
  formula_name VARCHAR(100) NOT NULL,
  formula_expression TEXT NOT NULL, -- Human-readable: "gross_pay * 0.15 - 500"
  formula_type VARCHAR(20) DEFAULT 'arithmetic' CHECK (formula_type IN ('arithmetic', 'conditional', 'lookup')),
  
  -- Advanced formula support
  formula_ast JSONB, -- Parsed Abstract Syntax Tree for execution: {type: 'multiply', left: {var: 'gross_pay'}, right: {value: 0.15}}
  conditional_rules JSONB, -- IF/THEN/ELSE logic: [{condition: {var: 'gross_pay', op: '>', value: 5000}, then: 'formula1', else: 'formula2'}]
  variables JSONB, -- Available variables with metadata: {gross_pay: {type: 'number', required: true}, hours: {type: 'number'}}
  validation_schema JSONB, -- Validation rules: {result: {min: 0, max: 10000}, variables: {hours: {min: 0, max: 300}}}
  
  -- Versioning
  formula_version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  description TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
  -- Note: pay_component_id FK added later to avoid circular dependency
);

-- Custom pay components (employee-specific overrides)
CREATE TABLE IF NOT EXISTS payroll.custom_pay_component (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id),
  pay_component_id UUID NOT NULL REFERENCES payroll.pay_component(id),
  
  -- Custom rates/amounts for this employee
  custom_rate NUMERIC(12, 2),
  custom_amount NUMERIC(12, 2),
  
  -- Effective dates
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE CASCADE,
  FOREIGN KEY (pay_component_id) REFERENCES payroll.pay_component(id)
);

-- Formula execution audit log (for SOX compliance and debugging)
CREATE TABLE IF NOT EXISTS payroll.formula_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pay_component_id UUID REFERENCES payroll.pay_component(id) ON DELETE SET NULL,
  formula_id UUID REFERENCES payroll.component_formula(id) ON DELETE SET NULL,
  
  -- Execution details
  formula_expression TEXT NOT NULL, -- Formula that was executed
  input_variables JSONB NOT NULL, -- Input values: {gross_pay: 5000, hours_worked: 160}
  calculated_result NUMERIC(12, 2), -- Output value
  execution_time_ms INTEGER, -- Performance tracking
  
  -- Context (which payroll calculation triggered this)
  paycheck_id UUID, -- Reference to paycheck if available
  employee_id UUID REFERENCES hris.employee(id),
  payroll_run_id UUID, -- FK added later to avoid dependency issues
  
  -- Audit
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  executed_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
  -- Note: payroll_run_id FK added after payroll_run table creation
);

-- Rated time lines (time entries broken down by pay component rates)
CREATE TABLE IF NOT EXISTS payroll.rated_time_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  time_entry_id UUID NOT NULL REFERENCES payroll.time_entry(id) ON DELETE CASCADE,
  pay_component_id UUID NOT NULL REFERENCES payroll.pay_component(id),
  
  -- Calculation
  hours NUMERIC(5, 2) NOT NULL,
  rate NUMERIC(12, 2) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (time_entry_id) REFERENCES payroll.time_entry(id) ON DELETE CASCADE,
  FOREIGN KEY (pay_component_id) REFERENCES payroll.pay_component(id)
);

-- ================================================================
-- DEDUCTIONS
-- ================================================================

-- Employee deductions (benefits, garnishments, loans, etc.)
CREATE TABLE IF NOT EXISTS payroll.employee_deduction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id),
  
  -- Deduction details
  deduction_type VARCHAR(50) NOT NULL CHECK (deduction_type IN ('benefit', 'garnishment', 'loan', 'union_dues', 'pension', 'insurance', 'other')),
  deduction_name VARCHAR(100) NOT NULL,
  deduction_code VARCHAR(50) NOT NULL,
  
  -- Calculation
  calculation_type VARCHAR(20) NOT NULL CHECK (calculation_type IN ('fixed_amount', 'percentage', 'graduated')),
  deduction_amount NUMERIC(12, 2), -- Fixed amount per payroll
  deduction_percentage NUMERIC(5, 2), -- Percentage of gross
  max_per_payroll NUMERIC(12, 2), -- Maximum per paycheck
  max_annual NUMERIC(12, 2), -- Maximum per year
  
  -- Tax treatment
  is_pre_tax BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT true,
  frequency VARCHAR(20) DEFAULT 'per_payroll', -- per_payroll, monthly, annually
  
  -- Effective dates
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  -- Priority (order of deduction application)
  priority INTEGER DEFAULT 1,
  
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE CASCADE
);

-- ================================================================
-- TAX CALCULATION ENGINE
-- ================================================================

-- Tax rule sets (country/state/locality tax rules)
CREATE TABLE IF NOT EXISTS payroll.tax_rule_set (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Tax identification
  tax_type VARCHAR(50) NOT NULL, -- 'wage_tax', 'aov', 'aww', 'federal', 'state', 'local', 'social_security', 'medicare'
  tax_name VARCHAR(100) NOT NULL,
  
  -- Jurisdiction
  country VARCHAR(2) DEFAULT 'SR', -- ISO country code
  state VARCHAR(50), -- State/province/region
  locality VARCHAR(50), -- City/district
  
  -- Effective dates
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  -- Calculation method
  annual_cap NUMERIC(12, 2), -- Maximum tax per year
  calculation_method VARCHAR(20) DEFAULT 'bracket' CHECK (calculation_method IN ('bracket', 'flat_rate', 'graduated')),
  calculation_mode VARCHAR(30) DEFAULT 'proportional_distribution' CHECK (calculation_mode IN ('aggregated', 'component_based', 'proportional_distribution')),
  
  description TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Tax brackets (progressive tax calculation brackets)
CREATE TABLE IF NOT EXISTS payroll.tax_bracket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tax_rule_set_id UUID NOT NULL REFERENCES payroll.tax_rule_set(id) ON DELETE CASCADE,
  
  -- Bracket definition
  bracket_order INTEGER NOT NULL, -- Order of application
  income_min NUMERIC(12, 2) NOT NULL, -- Minimum income for this bracket
  income_max NUMERIC(12, 2), -- Maximum income (NULL for unlimited upper bracket)
  rate_percentage NUMERIC(5, 2) NOT NULL, -- Tax rate for this bracket
  fixed_amount NUMERIC(12, 2) DEFAULT 0, -- Fixed amount added to calculated tax
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (tax_rule_set_id) REFERENCES payroll.tax_rule_set(id) ON DELETE CASCADE
);

-- Allowances (tax-free allowances and deductions)
CREATE TABLE IF NOT EXISTS payroll.allowance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Allowance details
  allowance_type VARCHAR(50) NOT NULL, -- 'personal', 'dependent', 'disability', 'veteran', 'tax_free_sum_monthly', 'holiday_allowance', 'bonus_gratuity'
  allowance_name VARCHAR(100) NOT NULL,
  
  -- Jurisdiction
  country VARCHAR(2) DEFAULT 'SR',
  state VARCHAR(50),
  
  -- Amount
  amount NUMERIC(12, 2) NOT NULL,
  is_percentage BOOLEAN DEFAULT false, -- Is amount a percentage or fixed
  
  -- Effective dates
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  
  description TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID,
  deleted_by UUID,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- ================================================================
-- COMPONENT-BASED PAYROLL ARCHITECTURE ADDITIONS
-- Added: November 12, 2025
-- ================================================================

-- Payroll run types (defines different types of payroll runs)
CREATE TABLE IF NOT EXISTS payroll.payroll_run_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Type identification
  type_code VARCHAR(50) NOT NULL,              -- 'VAKANTIEGELD', 'BONUS', 'REGULAR'
  type_name VARCHAR(100) NOT NULL,             -- 'Holiday Allowance', 'Bonus Payment'
  description TEXT,
  
  -- HYBRID APPROACH: Template OR Explicit
  default_template_id UUID,  -- FK added later after pay_structure_template is created
  component_override_mode VARCHAR(20) DEFAULT 'template' 
    CHECK (component_override_mode IN ('template', 'explicit', 'hybrid')),
  
  -- Explicit component specification (used when mode = 'explicit' or 'hybrid')
  allowed_components JSONB,   -- ["VAKANTIEGELD"] or ["BONUS", "GRATUITY"]
  excluded_components JSONB,  -- ["REGULAR_SALARY", "OVERTIME"]
  
  -- Configuration
  is_system_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  icon VARCHAR(50),            -- UI icon name
  color VARCHAR(7),            -- Hex color for badges
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID,  -- FK added later after user_account is created
  updated_by UUID,
  deleted_by UUID,
  
  UNIQUE(organization_id, type_code),
  CONSTRAINT valid_mode_config CHECK (
    (component_override_mode = 'template' AND default_template_id IS NOT NULL) OR
    (component_override_mode = 'explicit' AND allowed_components IS NOT NULL) OR
    (component_override_mode = 'hybrid' AND default_template_id IS NOT NULL)
  )
);

CREATE INDEX idx_payroll_run_type_org 
  ON payroll.payroll_run_type(organization_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_payroll_run_type_active 
  ON payroll.payroll_run_type(is_active) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_payroll_run_type_code
  ON payroll.payroll_run_type(organization_id, type_code)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE payroll.payroll_run_type IS 
  'Run type definitions with hybrid template/explicit component support. MULTI-TENANT: Each organization has its own run types (tenant isolation via organization_id).';
COMMENT ON COLUMN payroll.payroll_run_type.component_override_mode IS 
  'template: use template components | explicit: use allowed_components | hybrid: template + overrides';
COMMENT ON COLUMN payroll.payroll_run_type.organization_id IS 
  'REQUIRED: Every run type belongs to a specific organization (tenant isolation). No NULL values allowed for multi-tenant security.';

-- Employee allowance usage tracking (yearly caps enforcement)
CREATE TABLE IF NOT EXISTS payroll.employee_allowance_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES hris.employee(id),
  allowance_type VARCHAR(50) NOT NULL,  -- 'holiday_allowance', 'bonus_gratuity'
  
  -- Usage tracking
  calendar_year INTEGER NOT NULL,
  amount_used NUMERIC(12, 2) DEFAULT 0,
  amount_remaining NUMERIC(12, 2),      -- Cached for performance
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  
  UNIQUE(employee_id, allowance_type, calendar_year),
  CONSTRAINT valid_year CHECK (calendar_year >= 2020 AND calendar_year <= 2100)
);

CREATE INDEX idx_employee_allowance_usage_emp_year 
  ON payroll.employee_allowance_usage(employee_id, calendar_year);

CREATE INDEX idx_employee_allowance_usage_type 
  ON payroll.employee_allowance_usage(allowance_type);

COMMENT ON TABLE payroll.employee_allowance_usage IS 
  'Tracks yearly allowance usage per employee for cap enforcement';

-- ================================================================
-- NOTE: Vakantiegeld calculation rules are stored in pay_component.calculation_metadata
-- Tax-free caps are defined in payroll.allowance table per Surinamese Wage Tax Law
-- This provides maximum flexibility for different organization practices
-- ================================================================

-- Deductible cost rules (allowable cost deductions from gross income)
CREATE TABLE IF NOT EXISTS payroll.deductible_cost_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Cost rule details
  cost_type VARCHAR(50) NOT NULL, -- 'business_expense', 'travel', 'uniform', etc.
  cost_name VARCHAR(100) NOT NULL,
  
  -- Jurisdiction
  country VARCHAR(2) DEFAULT 'SR',
  state VARCHAR(50),
  
  -- Deduction calculation
  amount NUMERIC(12, 2) NOT NULL,
  is_percentage BOOLEAN DEFAULT false,
  max_deduction NUMERIC(12, 2), -- Maximum deductible amount
  
  -- Effective dates
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  description TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- ================================================================
-- PAYROLL RUNS & PAYCHECKS
-- ================================================================

-- Payroll runs (pay period processing batches)
CREATE TABLE IF NOT EXISTS payroll.payroll_run (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Run identification
  run_number VARCHAR(50) NOT NULL,
  run_name VARCHAR(100) NOT NULL,
  run_type VARCHAR(50) DEFAULT 'Regular',
  
  -- Pay period
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  payment_date DATE NOT NULL,
  
  -- Summary totals
  total_employees INTEGER DEFAULT 0,
  total_gross_pay NUMERIC(12, 2) DEFAULT 0,
  total_net_pay NUMERIC(12, 2) DEFAULT 0,
  total_taxes NUMERIC(12, 2) DEFAULT 0,
  total_deductions NUMERIC(12, 2) DEFAULT 0,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'calculating', 'calculated', 'approved', 'processing', 'processed', 'cancelled')),
  calculated_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES hris.user_account(id),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES hris.user_account(id),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(organization_id, run_number),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Paychecks (individual employee paychecks within a payroll run)
CREATE TABLE IF NOT EXISTS payroll.paycheck (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll.payroll_run(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id),
  
  -- Pay period
  payment_date DATE NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  
  -- Earnings
  gross_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
  regular_pay NUMERIC(12, 2) DEFAULT 0,
  overtime_pay NUMERIC(12, 2) DEFAULT 0,
  bonus_pay NUMERIC(12, 2) DEFAULT 0,
  commission_pay NUMERIC(12, 2) DEFAULT 0,
  
  -- Allowances (Component-Based Payroll Architecture)
  taxable_income NUMERIC(12, 2) DEFAULT 0,      -- Income after tax-free allowance deduction
  tax_free_allowance NUMERIC(12, 2) DEFAULT 0,  -- Total tax-free allowance applied
  
  -- Taxes
  federal_tax NUMERIC(12, 2) DEFAULT 0,
  state_tax NUMERIC(12, 2) DEFAULT 0,
  local_tax NUMERIC(12, 2) DEFAULT 0,
  social_security NUMERIC(12, 2) DEFAULT 0,
  medicare NUMERIC(12, 2) DEFAULT 0,
  wage_tax NUMERIC(12, 2) DEFAULT 0, -- Suriname wage tax
  aov_tax NUMERIC(12, 2) DEFAULT 0, -- Suriname AOV
  aww_tax NUMERIC(12, 2) DEFAULT 0, -- Suriname AWW
  
  -- Deductions
  pre_tax_deductions NUMERIC(12, 2) DEFAULT 0,
  post_tax_deductions NUMERIC(12, 2) DEFAULT 0,
  other_deductions NUMERIC(12, 2) DEFAULT 0,
  
  -- Net pay
  net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Payment details
  payment_method VARCHAR(20) CHECK (payment_method IN ('direct_deposit', 'check', 'cash', 'card')),
  check_number VARCHAR(50),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'voided')),
  paid_at TIMESTAMPTZ,
  
  -- Email tracking
  payslip_sent_at TIMESTAMPTZ,
  payslip_sent_to VARCHAR(255),
  payslip_send_status VARCHAR(20) CHECK (payslip_send_status IN ('pending', 'sent', 'failed', 'bounced')),
  payslip_send_error TEXT,
  
  -- Payslip template used for PDF generation
  payslip_template_id UUID, -- FK added later to avoid circular dependency
  payslip_template_snapshot JSONB, -- Frozen template config at time of generation
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.employee(id)
);

COMMENT ON COLUMN payroll.paycheck.taxable_income IS 
  'Income after tax-free allowance deduction (gross - allowances)';
COMMENT ON COLUMN payroll.paycheck.tax_free_allowance IS 
  'Total tax-free allowance amount applied to this paycheck';

-- Payroll run components (detailed breakdown of earnings, taxes, deductions per paycheck)
CREATE TABLE IF NOT EXISTS payroll.payroll_run_component (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll.payroll_run(id) ON DELETE CASCADE,
  paycheck_id UUID NOT NULL REFERENCES payroll.paycheck(id) ON DELETE CASCADE,
  
  -- Component details
  component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('earning', 'tax', 'deduction')),
  component_code VARCHAR(50) NOT NULL,
  component_name VARCHAR(100) NOT NULL,
  
  -- Calculation
  units NUMERIC(12, 2), -- Hours, percentage, etc.
  rate NUMERIC(12, 2), -- Rate per unit
  amount NUMERIC(12, 2) NOT NULL,
  
  -- Metadata
  is_taxable BOOLEAN DEFAULT true,
  tax_category VARCHAR(50),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE CASCADE,
  FOREIGN KEY (paycheck_id) REFERENCES payroll.paycheck(id) ON DELETE CASCADE
);

-- ================================================================
-- PAYSLIP TEMPLATES
-- ================================================================

-- Payslip templates for customizable payslip design
CREATE TABLE IF NOT EXISTS payroll.payslip_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template identification
  template_name VARCHAR(100) NOT NULL,
  template_code VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Status and defaults
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  is_default BOOLEAN DEFAULT false,
  
  -- Design configuration
  layout_type VARCHAR(50) DEFAULT 'standard' CHECK (layout_type IN ('standard', 'compact', 'detailed', 'custom')),
  
  -- Header configuration
  show_company_logo BOOLEAN DEFAULT true,
  company_logo_url TEXT,
  header_text TEXT,
  header_color VARCHAR(7) DEFAULT '#10b981', -- Hex color code
  
  -- Section visibility
  show_employee_info BOOLEAN DEFAULT true,
  show_payment_details BOOLEAN DEFAULT true,
  show_earnings_section BOOLEAN DEFAULT true,
  show_deductions_section BOOLEAN DEFAULT true,
  show_taxes_section BOOLEAN DEFAULT true,
  show_leave_balances BOOLEAN DEFAULT false,
  show_ytd_totals BOOLEAN DEFAULT true,
  show_qr_code BOOLEAN DEFAULT false, -- For digital verification
  
  -- Custom sections (JSONB array for flexibility)
  custom_sections JSONB, -- [{ "title": "Notes", "content": "...", "order": 1 }]
  
  -- Field configuration (which fields to show/hide)
  field_configuration JSONB, -- { "earnings": { "regular_pay": true, "overtime": true }, ... }
  
  -- Styling
  font_family VARCHAR(50) DEFAULT 'Arial',
  font_size INTEGER DEFAULT 10,
  primary_color VARCHAR(7) DEFAULT '#10b981',
  secondary_color VARCHAR(7) DEFAULT '#6b7280',
  
  -- Footer configuration
  footer_text TEXT,
  show_confidentiality_notice BOOLEAN DEFAULT true,
  confidentiality_text TEXT,
  
  -- Page settings
  page_size VARCHAR(20) DEFAULT 'A4' CHECK (page_size IN ('A4', 'Letter', 'Legal')),
  page_orientation VARCHAR(20) DEFAULT 'portrait' CHECK (page_orientation IN ('portrait', 'landscape')),
  
  -- Localization
  language VARCHAR(10) DEFAULT 'en',
  currency_display_format VARCHAR(50) DEFAULT 'SRD #,##0.00',
  date_format VARCHAR(50) DEFAULT 'MMM dd, yyyy',
  
  -- Conditional display rules
  display_rules JSONB, -- { "show_overtime_if_zero": false, "group_taxes": true, ... }
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(organization_id, template_code),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_payslip_template_org ON payroll.payslip_template(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payslip_template_status ON payroll.payslip_template(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_payslip_template_default ON payroll.payslip_template(organization_id, is_default) WHERE is_default = true AND deleted_at IS NULL;

COMMENT ON TABLE payroll.payslip_template IS 'Customizable payslip templates for PDF generation with branding and layout options';

-- Payslip template assignments (link templates to worker types, departments, or individuals)
CREATE TABLE IF NOT EXISTS payroll.payslip_template_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES payroll.payslip_template(id) ON DELETE CASCADE,
  
  -- Assignment scope
  assignment_type VARCHAR(50) NOT NULL CHECK (assignment_type IN ('organization', 'worker_type', 'department', 'employee', 'pay_structure')),
  
  -- Target references (only one should be set based on assignment_type)
  worker_type_id UUID REFERENCES payroll.worker_type(id),
  department_id UUID, -- Reference to hris.department if needed
  employee_id UUID REFERENCES hris.employee(id),
  pay_structure_template_id UUID, -- FK added later to avoid circular dependency
  
  -- Priority (higher number = higher priority when multiple templates match)
  priority INTEGER DEFAULT 0,
  
  -- Effective dates
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES payroll.payslip_template(id) ON DELETE CASCADE
);

CREATE INDEX idx_payslip_template_assignment_org ON payroll.payslip_template_assignment(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payslip_template_assignment_type ON payroll.payslip_template_assignment(assignment_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_payslip_template_assignment_employee ON payroll.payslip_template_assignment(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payslip_template_assignment_worker_type ON payroll.payslip_template_assignment(worker_type_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE payroll.payslip_template_assignment IS 'Assigns payslip templates to specific scopes (org-wide, worker types, departments, individuals)';

-- ================================================================
-- PAYMENT PROCESSING
-- ================================================================

-- Payment transactions (actual payment execution tracking)
CREATE TABLE IF NOT EXISTS payroll.payment_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  paycheck_id UUID REFERENCES payroll.paycheck(id),
  payroll_run_id UUID REFERENCES payroll.payroll_run(id),
  employee_id UUID REFERENCES hris.employee(id),
  
  -- Payment details
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('direct_deposit', 'ach', 'wire', 'check', 'cash', 'card')),
  payment_amount NUMERIC(12, 2) NOT NULL,
  payment_date DATE,
  scheduled_date DATE NOT NULL,
  
  -- Transaction tracking
  transaction_reference VARCHAR(100), -- Internal reference number
  bank_account_number VARCHAR(50),
  routing_number VARCHAR(50),
  
  -- Status tracking
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'processed', 'failed', 'cancelled', 'reconciled')),
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES hris.user_account(id),
  
  -- Payment processor integration
  currency VARCHAR(3) DEFAULT 'SRD',
  processor_name VARCHAR(50), -- Payment gateway/bank name
  processor_transaction_id VARCHAR(100), -- External transaction ID
  
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (paycheck_id) REFERENCES payroll.paycheck(id),
  FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id),
  FOREIGN KEY (employee_id) REFERENCES hris.employee(id)
);

-- ================================================================
-- RECONCILIATION & ADJUSTMENTS
-- ================================================================

-- Reconciliation records (bank/GL/tax reconciliation)
CREATE TABLE IF NOT EXISTS payroll.reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_run_id UUID REFERENCES payroll.payroll_run(id),
  
  -- Reconciliation details
  reconciliation_type VARCHAR(20) NOT NULL CHECK (reconciliation_type IN ('bank', 'gl', 'tax', 'benefit')),
  reconciliation_date DATE NOT NULL,
  
  -- Amounts
  expected_total NUMERIC(12, 2),
  actual_total NUMERIC(12, 2),
  variance_amount NUMERIC(12, 2),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  reconciled_by UUID REFERENCES hris.user_account(id),
  reconciled_at TIMESTAMPTZ,
  
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id)
);

-- Reconciliation items (line items within a reconciliation)
CREATE TABLE IF NOT EXISTS payroll.reconciliation_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reconciliation_id UUID NOT NULL REFERENCES payroll.reconciliation(id) ON DELETE CASCADE,
  
  -- Item details
  item_type VARCHAR(50) NOT NULL, -- 'paycheck', 'tax_payment', 'benefit_payment', etc.
  item_reference VARCHAR(100), -- Reference to source record
  
  -- Amounts
  expected_amount NUMERIC(12, 2),
  actual_amount NUMERIC(12, 2),
  variance_amount NUMERIC(12, 2),
  
  -- Reconciliation status
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  reconciliation_notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (reconciliation_id) REFERENCES payroll.reconciliation(id) ON DELETE CASCADE
);

-- ================================================================
-- SCHEDULING
-- ================================================================

-- Work schedules (employee shift schedules)
CREATE TABLE IF NOT EXISTS payroll.work_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id),
  shift_type_id UUID REFERENCES payroll.shift_type(id),
  
  -- Schedule details
  schedule_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours NUMERIC(5, 2) NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(employee_id, schedule_date, start_time),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE CASCADE,
  FOREIGN KEY (shift_type_id) REFERENCES payroll.shift_type(id)
);

COMMENT ON COLUMN payroll.work_schedule.employee_id IS 'References hris.employee(id) - the single source of truth';

-- Schedule change requests (employee schedule change/swap requests)
CREATE TABLE IF NOT EXISTS payroll.schedule_change_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_schedule_id UUID REFERENCES payroll.work_schedule(id),
  requested_by UUID REFERENCES hris.employee(id),
  
  -- Request details
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('swap', 'change', 'cancel')),
  original_date DATE,
  proposed_date DATE,
  original_shift_type_id UUID REFERENCES payroll.shift_type(id),
  proposed_shift_type_id UUID REFERENCES payroll.shift_type(id),
  
  reason TEXT,
  
  -- Approval
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by UUID REFERENCES hris.user_account(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (work_schedule_id) REFERENCES payroll.work_schedule(id),
  FOREIGN KEY (requested_by) REFERENCES hris.employee(id)
);

COMMENT ON COLUMN payroll.schedule_change_request.requested_by IS 'References hris.employee(id) - the single source of truth';

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

-- Employee payroll config indexes
CREATE INDEX IF NOT EXISTS idx_employee_payroll_config_org_id ON payroll.employee_payroll_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_payroll_config_employee_id ON payroll.employee_payroll_config(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_payroll_config_status ON payroll.employee_payroll_config(payroll_status) WHERE deleted_at IS NULL;

-- Compensation indexes
CREATE INDEX IF NOT EXISTS idx_compensation_employee ON payroll.compensation(employee_id);
CREATE INDEX IF NOT EXISTS idx_compensation_current ON payroll.compensation(employee_id, is_current) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compensation_effective_dates ON payroll.compensation(effective_from, effective_to);

-- Time entry indexes
CREATE INDEX IF NOT EXISTS idx_time_entry_employee ON payroll.time_entry(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entry_date ON payroll.time_entry(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entry_status ON payroll.time_entry(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_entry_approval ON payroll.time_entry(status, employee_id) WHERE status IN ('submitted', 'approved');

-- Time attendance event indexes
CREATE INDEX IF NOT EXISTS idx_time_event_employee ON payroll.time_attendance_event(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_event_timestamp ON payroll.time_attendance_event(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_time_event_type ON payroll.time_attendance_event(event_type, employee_id);

-- Timesheet indexes
CREATE INDEX IF NOT EXISTS idx_timesheet_employee ON payroll.timesheet(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_period ON payroll.timesheet(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_timesheet_status ON payroll.timesheet(status) WHERE deleted_at IS NULL;

-- Pay component indexes
CREATE INDEX IF NOT EXISTS idx_pay_component_org ON payroll.pay_component(organization_id);
CREATE INDEX IF NOT EXISTS idx_pay_component_type ON payroll.pay_component(component_type, status);
CREATE INDEX IF NOT EXISTS idx_pay_component_code ON payroll.pay_component(organization_id, component_code);
CREATE INDEX IF NOT EXISTS idx_pay_component_formula ON payroll.pay_component(formula_id) WHERE formula_id IS NOT NULL;

-- Component formula indexes
CREATE INDEX IF NOT EXISTS idx_component_formula_component ON payroll.component_formula(pay_component_id);
CREATE INDEX IF NOT EXISTS idx_component_formula_ast ON payroll.component_formula USING gin(formula_ast);
CREATE INDEX IF NOT EXISTS idx_component_formula_conditionals ON payroll.component_formula USING gin(conditional_rules);
CREATE INDEX IF NOT EXISTS idx_component_formula_active ON payroll.component_formula(pay_component_id, is_active) WHERE is_active = true;

-- Formula execution log indexes
CREATE INDEX IF NOT EXISTS idx_formula_log_org_date ON payroll.formula_execution_log(organization_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_formula_log_component ON payroll.formula_execution_log(pay_component_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_formula_log_payroll_run ON payroll.formula_execution_log(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_formula_log_employee ON payroll.formula_execution_log(employee_id, executed_at DESC);

-- Custom pay component indexes
CREATE INDEX IF NOT EXISTS idx_custom_component_employee ON payroll.custom_pay_component(employee_id);
CREATE INDEX IF NOT EXISTS idx_custom_component_active ON payroll.custom_pay_component(employee_id) WHERE deleted_at IS NULL;

-- Employee deduction indexes
CREATE INDEX IF NOT EXISTS idx_employee_deduction_employee ON payroll.employee_deduction(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_deduction_active ON payroll.employee_deduction(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employee_deduction_dates ON payroll.employee_deduction(effective_from, effective_to);

-- Tax rule set indexes
CREATE INDEX IF NOT EXISTS idx_tax_rule_set_org ON payroll.tax_rule_set(organization_id);
CREATE INDEX IF NOT EXISTS idx_tax_rule_set_jurisdiction ON payroll.tax_rule_set(country, state, locality);
CREATE INDEX IF NOT EXISTS idx_tax_rule_set_active ON payroll.tax_rule_set(effective_from, effective_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tax_rule_set_calculation_mode ON payroll.tax_rule_set(calculation_mode) WHERE deleted_at IS NULL;

-- Tax bracket indexes
CREATE INDEX IF NOT EXISTS idx_tax_bracket_rule_set ON payroll.tax_bracket(tax_rule_set_id);
CREATE INDEX IF NOT EXISTS idx_tax_bracket_order ON payroll.tax_bracket(tax_rule_set_id, bracket_order);

-- Payroll run indexes
CREATE INDEX IF NOT EXISTS idx_payroll_run_org ON payroll.payroll_run(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_run_status ON payroll.payroll_run(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payroll_run_period ON payroll.payroll_run(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_run_payment_date ON payroll.payroll_run(payment_date);
CREATE INDEX IF NOT EXISTS idx_payroll_run_type ON payroll.payroll_run(run_type);

-- Add FK constraint for run_type (links to payroll_run_type.type_code)
-- Note: This is optional - allows both predefined types and custom types
ALTER TABLE payroll.payroll_run
  DROP CONSTRAINT IF EXISTS fk_payroll_run_type;

-- Comment out FK for now to allow flexibility with custom run types
-- ALTER TABLE payroll.payroll_run
--   ADD CONSTRAINT fk_payroll_run_type 
--   FOREIGN KEY (run_type) 
--   REFERENCES payroll.payroll_run_type(type_code);

COMMENT ON COLUMN payroll.payroll_run.run_type IS 
  'Run type code - should match payroll_run_type.type_code when using predefined types';

-- Paycheck indexes
CREATE INDEX IF NOT EXISTS idx_paycheck_run ON payroll.paycheck(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_paycheck_employee ON payroll.paycheck(employee_id);
CREATE INDEX IF NOT EXISTS idx_paycheck_status ON payroll.paycheck(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_paycheck_payment_date ON payroll.paycheck(payment_date);

-- Payroll run component indexes
CREATE INDEX IF NOT EXISTS idx_run_component_paycheck ON payroll.payroll_run_component(paycheck_id);
CREATE INDEX IF NOT EXISTS idx_run_component_run ON payroll.payroll_run_component(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_run_component_type ON payroll.payroll_run_component(component_type, component_code);

-- Payment transaction indexes
CREATE INDEX IF NOT EXISTS idx_payment_transaction_paycheck ON payroll.payment_transaction(paycheck_id);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_run ON payroll.payment_transaction(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_employee ON payroll.payment_transaction(employee_id);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_status ON payroll.payment_transaction(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_date ON payroll.payment_transaction(payment_date);

-- Reconciliation indexes
CREATE INDEX IF NOT EXISTS idx_reconciliation_run ON payroll.reconciliation(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_type_status ON payroll.reconciliation(reconciliation_type, status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_date ON payroll.reconciliation(reconciliation_date);

-- Reconciliation item indexes
CREATE INDEX IF NOT EXISTS idx_reconciliation_item_recon ON payroll.reconciliation_item(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_item_type ON payroll.reconciliation_item(item_type);

-- Worker type indexes
CREATE INDEX IF NOT EXISTS idx_worker_type_employee ON payroll.worker_type(employee_id);
CREATE INDEX IF NOT EXISTS idx_worker_type_organization ON payroll.worker_type(organization_id);
CREATE INDEX IF NOT EXISTS idx_worker_type_current ON payroll.worker_type(employee_id, is_current) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_worker_type_template ON payroll.worker_type(worker_type_template_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_worker_type_employee_current 
  ON payroll.worker_type(employee_id, organization_id) 
  WHERE is_current = true AND deleted_at IS NULL;

-- Work schedule indexes
CREATE INDEX IF NOT EXISTS idx_work_schedule_employee ON payroll.work_schedule(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_schedule_date ON payroll.work_schedule(schedule_date);
CREATE INDEX IF NOT EXISTS idx_work_schedule_status ON payroll.work_schedule(status) WHERE deleted_at IS NULL;

-- Schedule change request indexes
CREATE INDEX IF NOT EXISTS idx_schedule_change_requester ON payroll.schedule_change_request(requested_by);
CREATE INDEX IF NOT EXISTS idx_schedule_change_status ON payroll.schedule_change_request(status) WHERE deleted_at IS NULL;

-- Pay component metadata index (for formula AST queries)
CREATE INDEX IF NOT EXISTS idx_pay_component_metadata ON payroll.pay_component USING gin(metadata) WHERE metadata IS NOT NULL;

-- ================================================================
-- FOREIGN KEY CONSTRAINTS (Added after table creation to avoid circular dependencies)
-- ================================================================

-- Add payslip_template_id foreign key to paycheck
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_paycheck_payslip_template_id'
    AND table_schema = 'payroll'
    AND table_name = 'paycheck'
  ) THEN
    ALTER TABLE payroll.paycheck 
      ADD CONSTRAINT fk_paycheck_payslip_template_id 
      FOREIGN KEY (payslip_template_id) 
      REFERENCES payroll.payslip_template(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Add run_type foreign key to payroll_run (Component-Based Payroll Architecture)
-- Note: FK references both organization_id and type_code since they form the unique constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_payroll_run_type'
    AND table_schema = 'payroll'
    AND table_name = 'payroll_run'
  ) THEN
    ALTER TABLE payroll.payroll_run
      ADD CONSTRAINT fk_payroll_run_type 
      FOREIGN KEY (organization_id, run_type) 
      REFERENCES payroll.payroll_run_type(organization_id, type_code)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN payroll.payroll_run.run_type IS 
  'Run type code (FK to payroll_run_type.type_code with organization_id)';

-- Add formula_id foreign key to pay_component
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_pay_component_formula_id'
    AND table_schema = 'payroll'
    AND table_name = 'pay_component'
  ) THEN
    ALTER TABLE payroll.pay_component 
      ADD CONSTRAINT fk_pay_component_formula_id 
      FOREIGN KEY (formula_id) 
      REFERENCES payroll.component_formula(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Add pay_component_id foreign key to component_formula
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_component_formula_pay_component_id'
    AND table_schema = 'payroll'
    AND table_name = 'component_formula'
  ) THEN
    ALTER TABLE payroll.component_formula 
      ADD CONSTRAINT fk_component_formula_pay_component_id 
      FOREIGN KEY (pay_component_id) 
      REFERENCES payroll.pay_component(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Add payroll_run_id foreign key to formula_execution_log
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_formula_log_payroll_run_id'
    AND table_schema = 'payroll'
    AND table_name = 'formula_execution_log'
  ) THEN
    ALTER TABLE payroll.formula_execution_log 
      ADD CONSTRAINT fk_formula_log_payroll_run_id 
      FOREIGN KEY (payroll_run_id) 
      REFERENCES payroll.payroll_run(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign keys for payroll_run_type (deferred to avoid circular dependencies)
DO $$ 
BEGIN
  -- Add default_template_id foreign key (only if pay_structure_template table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'payroll' 
    AND table_name = 'pay_structure_template'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_payroll_run_type_template'
    AND table_schema = 'payroll'
    AND table_name = 'payroll_run_type'
  ) THEN
    ALTER TABLE payroll.payroll_run_type
      ADD CONSTRAINT fk_payroll_run_type_template
      FOREIGN KEY (default_template_id)
      REFERENCES payroll.pay_structure_template(id)
      ON DELETE SET NULL;
  END IF;

  -- Add created_by foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_payroll_run_type_created_by'
    AND table_schema = 'payroll'
    AND table_name = 'payroll_run_type'
  ) THEN
    ALTER TABLE payroll.payroll_run_type
      ADD CONSTRAINT fk_payroll_run_type_created_by
      FOREIGN KEY (created_by)
      REFERENCES hris.user_account(id)
      ON DELETE SET NULL;
  END IF;

  -- Add updated_by foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_payroll_run_type_updated_by'
    AND table_schema = 'payroll'
    AND table_name = 'payroll_run_type'
  ) THEN
    ALTER TABLE payroll.payroll_run_type
      ADD CONSTRAINT fk_payroll_run_type_updated_by
      FOREIGN KEY (updated_by)
      REFERENCES hris.user_account(id)
      ON DELETE SET NULL;
  END IF;

  -- Add deleted_by foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_payroll_run_type_deleted_by'
    AND table_schema = 'payroll'
    AND table_name = 'payroll_run_type'
  ) THEN
    ALTER TABLE payroll.payroll_run_type
      ADD CONSTRAINT fk_payroll_run_type_deleted_by
      FOREIGN KEY (deleted_by)
      REFERENCES hris.user_account(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA payroll TO PUBLIC;

-- Grant table permissions (adjust based on role requirements)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA payroll TO PUBLIC;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA payroll TO PUBLIC;

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON SCHEMA payroll IS 'Paylinq payroll processing schema - References hris.employee as single source of truth. Contains only payroll-specific data';

COMMENT ON TABLE payroll.employee_payroll_config IS 'Payroll-specific configuration for employees - Core employee data in hris.employee';
COMMENT ON TABLE payroll.compensation IS 'Employee compensation history - references hris.employee as source of truth';
COMMENT ON TABLE payroll.worker_type_template IS 'Worker classification templates (FTE, contractor, etc.)';
COMMENT ON TABLE payroll.worker_type IS 'Historical worker type assignments for employees';
COMMENT ON TABLE payroll.shift_type IS 'Shift definitions with differential rates';
COMMENT ON TABLE payroll.time_attendance_event IS 'Clock in/out events with location tracking';
COMMENT ON TABLE payroll.time_entry IS 'Approved time worked with hours breakdown';
COMMENT ON TABLE payroll.timesheet IS 'Grouped time entries for pay periods';
COMMENT ON TABLE payroll.pay_component IS 'Standard pay components (earnings and deductions)';
COMMENT ON TABLE payroll.component_formula IS 'Complex calculation formulas for pay components';
COMMENT ON TABLE payroll.custom_pay_component IS 'Employee-specific pay component overrides';
COMMENT ON TABLE payroll.rated_time_line IS 'Time entries broken down by pay rates';
COMMENT ON TABLE payroll.employee_deduction IS 'Employee-specific deductions (benefits, garnishments, etc.)';
COMMENT ON TABLE payroll.tax_rule_set IS 'Tax calculation rules by jurisdiction';
COMMENT ON COLUMN payroll.tax_rule_set.calculation_mode IS 'Tax calculation mode: aggregated (tax on total only, no breakdown), component_based (tax per component, ONLY for flat-rate taxes), proportional_distribution (tax on total, distribute proportionally - correct for progressive taxes)';
COMMENT ON TABLE payroll.tax_bracket IS 'Progressive tax brackets';
COMMENT ON TABLE payroll.allowance IS 'Tax-free allowances';
COMMENT ON TABLE payroll.deductible_cost_rule IS 'Allowable cost deductions from gross income';
COMMENT ON TABLE payroll.payroll_run IS 'Payroll processing batches by pay period';
COMMENT ON TABLE payroll.paycheck IS 'Individual employee paychecks';
COMMENT ON TABLE payroll.payroll_run_component IS 'Detailed earnings/taxes/deductions breakdown per paycheck';
COMMENT ON TABLE payroll.payment_transaction IS 'Payment execution tracking with bank integration';
COMMENT ON TABLE payroll.reconciliation IS 'Bank/GL/tax reconciliation records';
COMMENT ON TABLE payroll.reconciliation_item IS 'Line items within reconciliation';
COMMENT ON TABLE payroll.work_schedule IS 'Employee shift schedules';
COMMENT ON TABLE payroll.schedule_change_request IS 'Employee schedule change/swap requests';

-- ================================================================
-- PAY STRUCTURE TEMPLATES (Versioned Pay Structures)
-- Versioned pay structure templates for flexible payroll configuration
-- Added: November 9, 2025
-- ================================================================

-- Pay Structure Templates (Versioned Blueprints)
CREATE TABLE IF NOT EXISTS payroll.pay_structure_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template Identity
  template_code VARCHAR(50) NOT NULL, -- e.g., 'STANDARD_SALARY', 'HOURLY_SR'
  template_name VARCHAR(100) NOT NULL, -- e.g., 'Standard Salaried Employee - Suriname'
  description TEXT,
  
  -- Semantic Versioning (major.minor.patch)
  version_major INT NOT NULL DEFAULT 1,
  version_minor INT NOT NULL DEFAULT 0,
  version_patch INT NOT NULL DEFAULT 0,
  version_string VARCHAR(20) GENERATED ALWAYS AS (
    version_major || '.' || version_minor || '.' || version_patch
  ) STORED,
  
  -- Template Status Lifecycle
  status VARCHAR(20) NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'active', 'deprecated', 'archived')),
  
  -- Scope & Applicability
  applicable_to_worker_types VARCHAR(50)[], -- ['full_time', 'part_time', 'contractor']
  applicable_to_jurisdictions VARCHAR(10)[], -- ['SR', 'US', 'NL']
  
  -- Default Payroll Settings
  pay_frequency VARCHAR(20) CHECK (pay_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  currency VARCHAR(3) DEFAULT 'SRD',
  
  -- Organizational Defaults
  is_organization_default BOOLEAN DEFAULT false,
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  -- Publishing Lifecycle
  published_at TIMESTAMPTZ, -- When template became active
  published_by UUID REFERENCES hris.user_account(id),
  deprecated_at TIMESTAMPTZ,
  deprecated_by UUID REFERENCES hris.user_account(id),
  deprecation_reason TEXT,
  
  -- Version Change Summary
  change_summary TEXT, -- Summary of changes in this version (set when creating new version)
  
  -- Metadata
  tags VARCHAR(50)[], -- Searchable tags: ['executive', 'sr-based', 'hourly']
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  -- Constraints
  -- Note: unique_template_version is enforced via partial index below to exclude soft-deleted records
  
  -- Ensure only one organization default per time period
  CONSTRAINT unique_org_default_period 
    EXCLUDE USING gist (
      organization_id WITH =,
      daterange(effective_from, COALESCE(effective_to, '9999-12-31'::DATE), '[]') WITH &&
    ) WHERE (is_organization_default = true AND deleted_at IS NULL),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_pay_structure_template_org ON payroll.pay_structure_template(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_structure_template_status ON payroll.pay_structure_template(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_structure_template_default ON payroll.pay_structure_template(organization_id, is_organization_default, effective_from, effective_to) WHERE is_organization_default = true AND deleted_at IS NULL;

-- Unique constraint for template versions (excluding soft-deleted records)
CREATE UNIQUE INDEX unique_template_version_active ON payroll.pay_structure_template(organization_id, template_code, version_major, version_minor, version_patch) WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_structure_template_code ON payroll.pay_structure_template(organization_id, template_code, version_major DESC, version_minor DESC, version_patch DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_structure_template_version ON payroll.pay_structure_template(template_code, version_major, version_minor, version_patch) WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_structure_template_search ON payroll.pay_structure_template USING gin(tags) WHERE deleted_at IS NULL;

COMMENT ON TABLE payroll.pay_structure_template IS 'Versioned pay structure templates that define how workers are paid. Uses semantic versioning (major.minor.patch). Templates are immutable once published and used in payroll runs.';
COMMENT ON COLUMN payroll.pay_structure_template.version_string IS 'Auto-generated semantic version string (e.g., 1.2.3) for display';
COMMENT ON COLUMN payroll.pay_structure_template.change_summary IS 'Summary of changes made in this version. Required when creating new versions.';

-- Pay Structure Components (Template Component Definitions)
CREATE TABLE IF NOT EXISTS payroll.pay_structure_component (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES payroll.pay_structure_template(id) ON DELETE CASCADE,
  
  -- Component Reference (link to reusable component library)
  pay_component_id UUID REFERENCES payroll.pay_component(id), -- Optional: link to standard component
  
  -- Component Definition
  component_code VARCHAR(50) NOT NULL, -- 'BASE_SALARY', 'OVERTIME', 'BONUS', 'AOV_DEDUCTION'
  component_name VARCHAR(100) NOT NULL,
  component_category VARCHAR(50) NOT NULL 
    CHECK (component_category IN ('earning', 'deduction', 'tax', 'benefit', 'employer_cost', 'reimbursement')),
  
  -- Calculation Configuration
  calculation_type VARCHAR(20) NOT NULL 
    CHECK (calculation_type IN ('fixed', 'percentage', 'formula', 'hourly_rate', 'tiered', 'external')),
  
  -- Fixed Amount Configuration (for calculation_type = 'fixed')
  default_amount NUMERIC(12,4),
  default_currency VARCHAR(3),
  
  -- Percentage Configuration (for calculation_type = 'percentage')
  percentage_of VARCHAR(50), -- 'gross_earnings', 'base_salary', 'total_earnings', 'taxable_income'
  percentage_rate NUMERIC(6,4), -- 0.0500 = 5%, stored as decimal
  
  -- Formula Configuration (for calculation_type = 'formula')
  formula_expression TEXT, -- e.g., '(base_salary * 0.05) + (overtime_hours * hourly_rate * 1.5)'
  formula_variables JSONB, -- Required variables: {"base_salary": "number", "overtime_hours": "number"}
  formula_ast JSONB, -- Parsed Abstract Syntax Tree for efficient execution
  
  -- Hourly Rate Configuration (for calculation_type = 'hourly_rate')
  rate_multiplier NUMERIC(6,4), -- 1.0 = regular, 1.5 = overtime, 2.0 = double time
  applies_to_hours_type VARCHAR(20), -- 'regular', 'overtime', 'double_time', 'pto'
  
  -- Tiered Configuration (for calculation_type = 'tiered')
  tier_configuration JSONB, -- [{"threshold": 0, "rate": 0.10}, {"threshold": 50000, "rate": 0.15}]
  tier_basis VARCHAR(50), -- 'annual_salary', 'gross_earnings', 'hours_worked'
  
  -- Component Execution Behavior
  sequence_order INT NOT NULL, -- Calculation order (1, 2, 3...). Components execute in this order.
  depends_on_components VARCHAR(50)[], -- ['BASE_SALARY', 'GROSS_EARNINGS'] - components that must execute first
  is_mandatory BOOLEAN DEFAULT false, -- Cannot be removed from worker assignments
  
  -- Tax & Accounting Treatment
  is_taxable BOOLEAN DEFAULT true,
  affects_gross_pay BOOLEAN DEFAULT true,
  affects_net_pay BOOLEAN DEFAULT true,
  tax_category VARCHAR(50), -- 'gross', 'pre_tax', 'post_tax', 'non_taxable'
  accounting_code VARCHAR(50), -- GL account code for accounting integration
  
  -- Limits & Validation
  min_amount NUMERIC(12,4),
  max_amount NUMERIC(12,4),
  min_percentage NUMERIC(6,4),
  max_percentage NUMERIC(6,4),
  max_annual NUMERIC(12,4), -- Annual cap for this component
  max_per_period NUMERIC(12,4), -- Per pay period cap
  
  -- Worker Overridability
  allow_worker_override BOOLEAN DEFAULT false, -- Can worker-specific assignment override this component?
  override_allowed_fields VARCHAR(50)[], -- ['amount', 'percentage', 'formula', 'rate']
  requires_approval BOOLEAN DEFAULT false, -- Overrides need approval?
  
  -- Display Configuration
  display_on_payslip BOOLEAN DEFAULT true,
  display_name VARCHAR(100), -- Friendly name for payslip (may differ from component_name)
  display_order INT, -- Display order on payslip (may differ from calculation order)
  display_category VARCHAR(50), -- Grouping on payslip: 'earnings', 'taxes', 'deductions'
  
  -- Conditional Execution
  conditions JSONB, -- Conditions for component execution: {"employment_type": "full_time"}
  is_conditional BOOLEAN DEFAULT false,
  
  -- Metadata
  description TEXT,
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  -- Constraints
  CONSTRAINT unique_template_component_code UNIQUE (template_id, component_code),
  FOREIGN KEY (template_id) REFERENCES payroll.pay_structure_template(id) ON DELETE CASCADE,
  FOREIGN KEY (pay_component_id) REFERENCES payroll.pay_component(id) ON DELETE SET NULL
);

CREATE INDEX idx_pay_structure_component_template ON payroll.pay_structure_component(template_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_structure_component_sequence ON payroll.pay_structure_component(template_id, sequence_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_structure_component_category ON payroll.pay_structure_component(template_id, component_category) WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_structure_component_pay_component ON payroll.pay_structure_component(pay_component_id) WHERE pay_component_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON TABLE payroll.pay_structure_component IS 'Individual compensation components within a pay structure template. Defines how each component is calculated.';

-- Worker Pay Structure Assignments (Worker-Specific Applications)
-- ARCHITECTURE: Reference-Based with Override Layer
-- Templates are referenced by FK, not duplicated in snapshots
-- Only worker-specific data (overrides, base salary) is stored
-- Runtime resolution: JOIN template + apply overrides
CREATE TABLE IF NOT EXISTS payroll.worker_pay_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  
  -- Template Reference (FK to versioned template - single source of truth)
  template_version_id UUID NOT NULL REFERENCES payroll.pay_structure_template(id),
  
  -- Worker-Specific Data (overrides template defaults)
  base_salary NUMERIC(12, 4), -- Worker's base salary (if applicable)
  
  -- Assignment Metadata
  assignment_type VARCHAR(20) NOT NULL 
    CHECK (assignment_type IN ('default', 'department', 'group', 'custom', 'temporary')),
  assignment_source VARCHAR(50), -- 'org_default', 'department_policy', 'hr_override', 'promotion'
  assigned_by UUID REFERENCES hris.user_account(id),
  assignment_reason TEXT,
  
  -- Effective Period
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_current BOOLEAN DEFAULT true,
  
  -- Metadata
  pay_frequency VARCHAR(20), -- Can override template default
  currency VARCHAR(3), -- Can override template default
  
  -- Approval Workflow
  approval_status VARCHAR(20) DEFAULT 'approved' 
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES hris.user_account(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Metadata
  tags VARCHAR(50)[],
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  -- Constraints: Only one current assignment per employee at any given time
  CONSTRAINT unique_current_worker_structure 
    EXCLUDE USING gist (
      organization_id WITH =,
      employee_id WITH =,
      daterange(effective_from, COALESCE(effective_to, '9999-12-31'::DATE), '[]') WITH &&
    ) WHERE (deleted_at IS NULL),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE CASCADE,
  FOREIGN KEY (template_version_id) REFERENCES payroll.pay_structure_template(id)
);

CREATE INDEX idx_worker_pay_structure_org ON payroll.worker_pay_structure(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_pay_structure_employee ON payroll.worker_pay_structure(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_pay_structure_current ON payroll.worker_pay_structure(employee_id, is_current) WHERE is_current = true AND deleted_at IS NULL;
CREATE INDEX idx_worker_pay_structure_template_version ON payroll.worker_pay_structure(template_version_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_pay_structure_effective ON payroll.worker_pay_structure(employee_id, effective_from, effective_to) WHERE deleted_at IS NULL;

COMMENT ON TABLE payroll.worker_pay_structure IS 'Worker-specific assignments of pay structure templates. Uses reference-based architecture: templates are referenced by FK, worker-specific overrides stored separately.';
COMMENT ON COLUMN payroll.worker_pay_structure.template_version_id IS 'FK to pay_structure_template. Single source of truth. Template changes flow through automatically.';
COMMENT ON COLUMN payroll.worker_pay_structure.base_salary IS 'Worker-specific base salary. Overrides template default if set.';

-- Worker Pay Structure Component Overrides
CREATE TABLE IF NOT EXISTS payroll.worker_pay_structure_component_override (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_structure_id UUID NOT NULL REFERENCES payroll.worker_pay_structure(id) ON DELETE CASCADE,
  component_code VARCHAR(50) NOT NULL,
  
  -- Override Type
  override_type VARCHAR(20) NOT NULL 
    CHECK (override_type IN ('amount', 'percentage', 'formula', 'rate', 'disabled', 'custom', 'condition')),
  
  -- Override Values (based on override_type)
  override_amount NUMERIC(12,4),
  override_percentage NUMERIC(6,4),
  override_formula TEXT,
  override_formula_variables JSONB,
  override_rate NUMERIC(12,4),
  is_disabled BOOLEAN DEFAULT false, -- Disable this component for this worker
  
  -- Custom Component Configuration (for override_type = 'custom')
  custom_component_definition JSONB, -- Complete component config if this is a custom add-on
  
  -- Conditional Override (for override_type = 'condition')
  override_conditions JSONB, -- New conditions for this worker
  
  -- Limits (override template limits)
  override_min_amount NUMERIC(12,4),
  override_max_amount NUMERIC(12,4),
  override_max_annual NUMERIC(12,4),
  
  -- Justification & Approval
  override_reason TEXT NOT NULL,
  business_justification TEXT,
  requires_approval BOOLEAN DEFAULT false,
  approval_status VARCHAR(20) DEFAULT 'approved' 
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES hris.user_account(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Effective Period (can be temporary)
  effective_from DATE,
  effective_to DATE,
  
  -- Metadata
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  -- Constraints
  CONSTRAINT unique_worker_component_override UNIQUE (worker_structure_id, component_code),
  FOREIGN KEY (worker_structure_id) REFERENCES payroll.worker_pay_structure(id) ON DELETE CASCADE
);

CREATE INDEX idx_worker_override_structure ON payroll.worker_pay_structure_component_override(worker_structure_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_override_approval ON payroll.worker_pay_structure_component_override(approval_status) WHERE approval_status = 'pending' AND deleted_at IS NULL;
CREATE INDEX idx_worker_override_component ON payroll.worker_pay_structure_component_override(worker_structure_id, component_code) WHERE deleted_at IS NULL;

COMMENT ON TABLE payroll.worker_pay_structure_component_override IS 'Worker-specific overrides to pay structure components. Allows customization while maintaining template integrity.';

-- Pay Structure Template Changelog
CREATE TABLE IF NOT EXISTS payroll.pay_structure_template_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES payroll.pay_structure_template(id) ON DELETE CASCADE,
  
  -- Version Transition
  from_version VARCHAR(20), -- NULL if this is the initial version
  to_version VARCHAR(20) NOT NULL,
  
  -- Change Classification
  change_type VARCHAR(20) NOT NULL 
    CHECK (change_type IN ('created', 'minor_update', 'major_update', 'patch', 'deprecated', 'archived')),
  
  -- Changes Description
  change_summary TEXT NOT NULL,
  changes_detail JSONB, -- Structured diff: {"added": [], "removed": [], "modified": []}
  breaking_changes BOOLEAN DEFAULT false, -- Does this break compatibility?
  breaking_changes_description TEXT,
  
  -- Impact Analysis
  affected_worker_count INT, -- How many workers are on previous version
  requires_worker_migration BOOLEAN DEFAULT false, -- Do workers need to migrate?
  migration_instructions TEXT,
  auto_migrate BOOLEAN DEFAULT false, -- Can workers be auto-migrated?
  
  -- Changelog Details
  changelog_entries JSONB, -- Detailed list: [{"type": "added", "component": "BONUS"}]
  
  -- Audit
  changed_by UUID NOT NULL REFERENCES hris.user_account(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (template_id) REFERENCES payroll.pay_structure_template(id) ON DELETE CASCADE
);

CREATE INDEX idx_template_changelog_template ON payroll.pay_structure_template_changelog(template_id);
CREATE INDEX idx_template_changelog_date ON payroll.pay_structure_template_changelog(template_id, changed_at DESC);
CREATE INDEX idx_template_changelog_version ON payroll.pay_structure_template_changelog(template_id, to_version);

COMMENT ON TABLE payroll.pay_structure_template_changelog IS 'Complete history of changes to pay structure templates. Enables audit trail and version comparison.';

-- Add pay_structure_template_id foreign key to payslip_template_assignment (after pay_structure_template is created)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_payslip_assignment_pay_structure_template_id'
    AND table_schema = 'payroll'
    AND table_name = 'payslip_template_assignment'
  ) THEN
    ALTER TABLE payroll.payslip_template_assignment 
      ADD CONSTRAINT fk_payslip_assignment_pay_structure_template_id 
      FOREIGN KEY (pay_structure_template_id) 
      REFERENCES payroll.pay_structure_template(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Extend payroll_run_component table for structure tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'payroll' 
    AND table_name = 'payroll_run_component' 
    AND column_name = 'worker_structure_id'
  ) THEN
    ALTER TABLE payroll.payroll_run_component 
      ADD COLUMN worker_structure_id UUID REFERENCES payroll.worker_pay_structure(id),
      ADD COLUMN structure_template_version VARCHAR(20),
      ADD COLUMN component_config_snapshot JSONB,
      ADD COLUMN calculation_metadata JSONB;
    
    CREATE INDEX idx_payroll_run_component_worker_structure 
      ON payroll.payroll_run_component(worker_structure_id) 
      WHERE worker_structure_id IS NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN payroll.payroll_run_component.worker_structure_id IS 'References the pay structure assignment used for this calculation.';
COMMENT ON COLUMN payroll.payroll_run_component.structure_template_version IS 'Version of the pay structure template used (e.g., 1.2.3). Frozen at calculation time.';
COMMENT ON COLUMN payroll.payroll_run_component.component_config_snapshot IS 'Complete component configuration at calculation time. Enables exact recalculation.';
COMMENT ON COLUMN payroll.payroll_run_component.calculation_metadata IS 'Metadata about the calculation: formula variables, inputs, intermediate results, etc.';

-- Helper function to get current pay structure for a worker (with template JOIN)
CREATE OR REPLACE FUNCTION payroll.get_current_worker_pay_structure(
  p_employee_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  structure_id UUID,
  template_id UUID,
  template_code VARCHAR(50),
  template_name VARCHAR(100),
  template_version VARCHAR(20),
  base_salary NUMERIC(12, 4),
  effective_from DATE,
  effective_to DATE,
  pay_frequency VARCHAR(20),
  currency VARCHAR(3)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wps.id,
    t.id,
    t.template_code,
    t.template_name,
    t.version_string,
    wps.base_salary,
    wps.effective_from,
    wps.effective_to,
    COALESCE(wps.pay_frequency, t.pay_frequency),
    COALESCE(wps.currency, t.currency)
  FROM payroll.worker_pay_structure wps
  JOIN payroll.pay_structure_template t ON wps.template_version_id = t.id
  WHERE wps.employee_id = p_employee_id
    AND wps.effective_from <= p_as_of_date
    AND (wps.effective_to IS NULL OR wps.effective_to >= p_as_of_date)
    AND wps.deleted_at IS NULL
  ORDER BY wps.effective_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION payroll.get_current_worker_pay_structure IS 'Retrieves the active pay structure for a worker as of a specific date.';

-- Function to get organization default template
CREATE OR REPLACE FUNCTION payroll.get_organization_default_template(
  p_organization_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  template_id UUID,
  template_code VARCHAR(50),
  template_name VARCHAR(100),
  template_version VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pst.id,
    pst.template_code,
    pst.template_name,
    pst.version_string
  FROM payroll.pay_structure_template pst
  WHERE pst.organization_id = p_organization_id
    AND pst.is_organization_default = true
    AND pst.status = 'active'
    AND pst.effective_from <= p_as_of_date
    AND (pst.effective_to IS NULL OR pst.effective_to >= p_as_of_date)
    AND pst.deleted_at IS NULL
  ORDER BY pst.effective_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION payroll.get_organization_default_template IS 'Retrieves the organization default pay structure template as of a specific date.';

-- Convenient views for common queries
CREATE OR REPLACE VIEW payroll.v_active_pay_structure_templates AS
SELECT 
  pst.id,
  pst.organization_id,
  pst.template_code,
  pst.template_name,
  pst.version_string,
  pst.status,
  pst.is_organization_default,
  pst.effective_from,
  pst.effective_to,
  pst.applicable_to_worker_types,
  pst.applicable_to_jurisdictions,
  pst.pay_frequency,
  pst.currency,
  pst.tags,
  pst.published_at,
  pst.created_at,
  COUNT(DISTINCT psc.id) as component_count,
  COUNT(DISTINCT wps.id) as assigned_worker_count
FROM payroll.pay_structure_template pst
LEFT JOIN payroll.pay_structure_component psc ON psc.template_id = pst.id AND psc.deleted_at IS NULL
LEFT JOIN payroll.worker_pay_structure wps ON wps.template_version_id = pst.id AND wps.is_current = true AND wps.deleted_at IS NULL
WHERE pst.status = 'active'
  AND pst.deleted_at IS NULL
GROUP BY pst.id;

COMMENT ON VIEW payroll.v_active_pay_structure_templates IS 'Active pay structure templates with component and assignment counts.';

CREATE OR REPLACE VIEW payroll.v_worker_pay_structure_summary AS
SELECT 
  wps.id as structure_id,
  wps.employee_id,
  e.employee_number,
  e.first_name || ' ' || e.last_name as employee_name,
  pst.template_code,
  pst.version_string as template_version,
  pst.template_name,
  wps.assignment_type,
  wps.effective_from,
  wps.effective_to,
  wps.is_current,
  COALESCE(wps.currency, pst.currency) as currency,
  COALESCE(wps.pay_frequency, pst.pay_frequency) as pay_frequency,
  COUNT(DISTINCT wpco.id) as override_count
FROM payroll.worker_pay_structure wps
INNER JOIN hris.employee e ON e.id = wps.employee_id
JOIN payroll.pay_structure_template pst ON pst.id = wps.template_version_id
LEFT JOIN payroll.worker_pay_structure_component_override wpco ON wpco.worker_structure_id = wps.id AND wpco.deleted_at IS NULL
WHERE wps.deleted_at IS NULL
GROUP BY wps.id, e.employee_number, e.first_name, e.last_name, pst.template_code, pst.version_string, pst.template_name, wps.currency, wps.pay_frequency, pst.currency, pst.pay_frequency;

COMMENT ON VIEW payroll.v_worker_pay_structure_summary IS 'Summary view of worker pay structure assignments with override counts.';

COMMENT ON TABLE payroll.pay_structure_template IS 'Versioned pay structure templates for organization-wide and worker-specific payroll configuration';
COMMENT ON TABLE payroll.pay_structure_component IS 'Individual pay components within templates with calculation rules';
COMMENT ON TABLE payroll.worker_pay_structure IS 'Worker-specific pay structure assignments with frozen snapshots';
COMMENT ON TABLE payroll.worker_pay_structure_component_override IS 'Worker-specific overrides to template components';
COMMENT ON TABLE payroll.pay_structure_template_changelog IS 'Version history and change tracking for templates';

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant Data Isolation at Database Level
-- ================================================================

-- Helper function to get current organization from session variable
CREATE OR REPLACE FUNCTION payroll.get_current_organization_id()
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

COMMENT ON FUNCTION payroll.get_current_organization_id IS 'Returns current organization UUID from session variable set by auth middleware. Throws error if not set.';

-- ================================================================
-- RLS: EMPLOYEE PAYROLL CONFIGURATION
-- ================================================================

ALTER TABLE payroll.employee_payroll_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_payroll_config_tenant_isolation ON payroll.employee_payroll_config
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY employee_payroll_config_tenant_isolation_insert ON payroll.employee_payroll_config
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.compensation ENABLE ROW LEVEL SECURITY;

CREATE POLICY compensation_tenant_isolation ON payroll.compensation
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY compensation_tenant_isolation_insert ON payroll.compensation
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

-- ================================================================
-- RLS: WORKER TYPE MANAGEMENT
-- ================================================================

ALTER TABLE payroll.worker_type_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY worker_type_template_tenant_isolation ON payroll.worker_type_template
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY worker_type_template_tenant_isolation_insert ON payroll.worker_type_template
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.worker_type ENABLE ROW LEVEL SECURITY;

CREATE POLICY worker_type_tenant_isolation ON payroll.worker_type
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY worker_type_tenant_isolation_insert ON payroll.worker_type
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

-- ================================================================
-- RLS: TIME & ATTENDANCE
-- ================================================================

ALTER TABLE payroll.shift_type ENABLE ROW LEVEL SECURITY;

CREATE POLICY shift_type_tenant_isolation ON payroll.shift_type
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY shift_type_tenant_isolation_insert ON payroll.shift_type
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.time_attendance_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_attendance_event_tenant_isolation ON payroll.time_attendance_event
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY time_attendance_event_tenant_isolation_insert ON payroll.time_attendance_event
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.time_entry ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_entry_tenant_isolation ON payroll.time_entry
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY time_entry_tenant_isolation_insert ON payroll.time_entry
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.timesheet ENABLE ROW LEVEL SECURITY;

CREATE POLICY timesheet_tenant_isolation ON payroll.timesheet
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY timesheet_tenant_isolation_insert ON payroll.timesheet
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

-- ================================================================
-- RLS: PAY COMPONENTS
-- ================================================================

ALTER TABLE payroll.pay_component ENABLE ROW LEVEL SECURITY;

CREATE POLICY pay_component_tenant_isolation ON payroll.pay_component
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY pay_component_tenant_isolation_insert ON payroll.pay_component
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.component_formula ENABLE ROW LEVEL SECURITY;

CREATE POLICY component_formula_tenant_isolation ON payroll.component_formula
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY component_formula_tenant_isolation_insert ON payroll.component_formula
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.custom_pay_component ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_pay_component_tenant_isolation ON payroll.custom_pay_component
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY custom_pay_component_tenant_isolation_insert ON payroll.custom_pay_component
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.formula_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY formula_execution_log_tenant_isolation ON payroll.formula_execution_log
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY formula_execution_log_tenant_isolation_insert ON payroll.formula_execution_log
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.rated_time_line ENABLE ROW LEVEL SECURITY;

CREATE POLICY rated_time_line_tenant_isolation ON payroll.rated_time_line
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY rated_time_line_tenant_isolation_insert ON payroll.rated_time_line
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

-- ================================================================
-- RLS: DEDUCTIONS
-- ================================================================

ALTER TABLE payroll.employee_deduction ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_deduction_tenant_isolation ON payroll.employee_deduction
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY employee_deduction_tenant_isolation_insert ON payroll.employee_deduction
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

-- ================================================================
-- RLS: TAX CALCULATION ENGINE
-- ================================================================

ALTER TABLE payroll.tax_rule_set ENABLE ROW LEVEL SECURITY;

CREATE POLICY tax_rule_set_tenant_isolation ON payroll.tax_rule_set
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY tax_rule_set_tenant_isolation_insert ON payroll.tax_rule_set
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.tax_bracket ENABLE ROW LEVEL SECURITY;

CREATE POLICY tax_bracket_tenant_isolation ON payroll.tax_bracket
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY tax_bracket_tenant_isolation_insert ON payroll.tax_bracket
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.allowance ENABLE ROW LEVEL SECURITY;

CREATE POLICY allowance_tenant_isolation ON payroll.allowance
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY allowance_tenant_isolation_insert ON payroll.allowance
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.deductible_cost_rule ENABLE ROW LEVEL SECURITY;

CREATE POLICY deductible_cost_rule_tenant_isolation ON payroll.deductible_cost_rule
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY deductible_cost_rule_tenant_isolation_insert ON payroll.deductible_cost_rule
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

-- ================================================================
-- RLS: COMPONENT-BASED PAYROLL ARCHITECTURE
-- ================================================================

ALTER TABLE payroll.payroll_run_type ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_run_type_tenant_isolation ON payroll.payroll_run_type
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY payroll_run_type_tenant_isolation_insert ON payroll.payroll_run_type
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.employee_allowance_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_allowance_usage_tenant_isolation ON payroll.employee_allowance_usage
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY employee_allowance_usage_tenant_isolation_insert ON payroll.employee_allowance_usage
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

-- ================================================================
-- RLS: PAYROLL RUNS & PAYCHECKS
-- ================================================================

ALTER TABLE payroll.payroll_run ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_run_tenant_isolation ON payroll.payroll_run
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY payroll_run_tenant_isolation_insert ON payroll.payroll_run
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.paycheck ENABLE ROW LEVEL SECURITY;

CREATE POLICY paycheck_tenant_isolation ON payroll.paycheck
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY paycheck_tenant_isolation_insert ON payroll.paycheck
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.payroll_run_component ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_run_component_tenant_isolation ON payroll.payroll_run_component
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY payroll_run_component_tenant_isolation_insert ON payroll.payroll_run_component
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

-- ================================================================
-- RLS: PAYSLIP TEMPLATES
-- ================================================================

ALTER TABLE payroll.payslip_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY payslip_template_tenant_isolation ON payroll.payslip_template
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY payslip_template_tenant_isolation_insert ON payroll.payslip_template
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.payslip_template_assignment ENABLE ROW LEVEL SECURITY;

CREATE POLICY payslip_template_assignment_tenant_isolation ON payroll.payslip_template_assignment
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY payslip_template_assignment_tenant_isolation_insert ON payroll.payslip_template_assignment
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

-- ================================================================
-- RLS: PAYMENT PROCESSING
-- ================================================================

ALTER TABLE payroll.payment_transaction ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_transaction_tenant_isolation ON payroll.payment_transaction
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY payment_transaction_tenant_isolation_insert ON payroll.payment_transaction
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

-- ================================================================
-- RLS: RECONCILIATION & ADJUSTMENTS
-- ================================================================

ALTER TABLE payroll.reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY reconciliation_tenant_isolation ON payroll.reconciliation
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY reconciliation_tenant_isolation_insert ON payroll.reconciliation
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.reconciliation_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY reconciliation_item_tenant_isolation ON payroll.reconciliation_item
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY reconciliation_item_tenant_isolation_insert ON payroll.reconciliation_item
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

-- ================================================================
-- RLS: SCHEDULING
-- ================================================================

ALTER TABLE payroll.work_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_schedule_tenant_isolation ON payroll.work_schedule
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY work_schedule_tenant_isolation_insert ON payroll.work_schedule
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.schedule_change_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedule_change_request_tenant_isolation ON payroll.schedule_change_request
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY schedule_change_request_tenant_isolation_insert ON payroll.schedule_change_request
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

-- ================================================================
-- RLS: PAY STRUCTURE TEMPLATES (Versioned)
-- ================================================================

ALTER TABLE payroll.pay_structure_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY pay_structure_template_tenant_isolation ON payroll.pay_structure_template
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY pay_structure_template_tenant_isolation_insert ON payroll.pay_structure_template
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.pay_structure_component ENABLE ROW LEVEL SECURITY;

CREATE POLICY pay_structure_component_tenant_isolation ON payroll.pay_structure_component
  USING (
    EXISTS (
      SELECT 1 FROM payroll.pay_structure_template pst
      WHERE pst.id = pay_structure_component.template_id
      AND pst.organization_id = payroll.get_current_organization_id()
    )
  );

CREATE POLICY pay_structure_component_tenant_isolation_insert ON payroll.pay_structure_component
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payroll.pay_structure_template pst
      WHERE pst.id = pay_structure_component.template_id
      AND pst.organization_id = payroll.get_current_organization_id()
    )
  );

ALTER TABLE payroll.worker_pay_structure ENABLE ROW LEVEL SECURITY;

CREATE POLICY worker_pay_structure_tenant_isolation ON payroll.worker_pay_structure
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY worker_pay_structure_tenant_isolation_insert ON payroll.worker_pay_structure
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.worker_pay_structure_component_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY worker_pay_structure_component_override_tenant_isolation ON payroll.worker_pay_structure_component_override
  USING (
    EXISTS (
      SELECT 1 FROM payroll.worker_pay_structure wps
      WHERE wps.id = worker_pay_structure_component_override.worker_structure_id
      AND wps.organization_id = payroll.get_current_organization_id()
    )
  );

CREATE POLICY worker_pay_structure_component_override_tenant_isolation_insert ON payroll.worker_pay_structure_component_override
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payroll.worker_pay_structure wps
      WHERE wps.id = worker_pay_structure_component_override.worker_structure_id
      AND wps.organization_id = payroll.get_current_organization_id()
    )
  );

ALTER TABLE payroll.pay_structure_template_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY pay_structure_template_changelog_tenant_isolation ON payroll.pay_structure_template_changelog
  USING (
    EXISTS (
      SELECT 1 FROM payroll.pay_structure_template pst
      WHERE pst.id = pay_structure_template_changelog.template_id
      AND pst.organization_id = payroll.get_current_organization_id()
    )
  );

CREATE POLICY pay_structure_template_changelog_tenant_isolation_insert ON payroll.pay_structure_template_changelog
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payroll.pay_structure_template pst
      WHERE pst.id = pay_structure_template_changelog.template_id
      AND pst.organization_id = payroll.get_current_organization_id()
    )
  );

-- ================================================================
-- PAY PERIOD CONFIGURATION
-- ================================================================

-- Pay Period Configuration (organization-level settings)
CREATE TABLE IF NOT EXISTS payroll.pay_period_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Pay Frequency Configuration
  pay_frequency VARCHAR(20) NOT NULL CHECK (pay_frequency IN ('weekly', 'bi-weekly', 'semi-monthly', 'monthly')),
  
  -- Pay Period Start (anchor date for calculating all periods)
  period_start_date DATE NOT NULL,
  
  -- Pay Day Configuration (days after period end)
  pay_day_offset INTEGER NOT NULL DEFAULT 0 CHECK (pay_day_offset >= 0 AND pay_day_offset <= 30),
  
  -- Semi-Monthly specific settings
  first_pay_day INTEGER CHECK (first_pay_day >= 1 AND first_pay_day <= 31), -- e.g., 15
  second_pay_day INTEGER CHECK (second_pay_day >= 1 AND second_pay_day <= 31), -- e.g., last day
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  
  -- Only one active config per organization
  CONSTRAINT unique_active_config UNIQUE (organization_id, is_active)
    DEFERRABLE INITIALLY DEFERRED,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_pay_period_config_org ON payroll.pay_period_config(organization_id) WHERE is_active = true;

COMMENT ON TABLE payroll.pay_period_config IS 'Organization pay period configuration - defines pay frequency and schedule';
COMMENT ON COLUMN payroll.pay_period_config.period_start_date IS 'Anchor date for calculating all pay periods';
COMMENT ON COLUMN payroll.pay_period_config.pay_day_offset IS 'Number of days after period end that employees get paid';

-- Company Holidays Calendar
CREATE TABLE IF NOT EXISTS payroll.company_holiday (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Holiday Information
  holiday_name VARCHAR(100) NOT NULL,
  holiday_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false, -- Recurs annually (e.g., Christmas)
  
  -- Pay Schedule Impact
  affects_pay_schedule BOOLEAN DEFAULT true, -- If payday falls on holiday, adjust
  affects_work_schedule BOOLEAN DEFAULT true, -- Employees don't work on this day
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_company_holiday_org_date ON payroll.company_holiday(organization_id, holiday_date) WHERE is_active = true;
CREATE INDEX idx_company_holiday_org ON payroll.company_holiday(organization_id) WHERE is_active = true;

COMMENT ON TABLE payroll.company_holiday IS 'Organization holiday calendar for pay schedule and attendance tracking';

-- ================================================================
-- PAY PERIOD CONFIGURATION RLS POLICIES
-- ================================================================

ALTER TABLE payroll.pay_period_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY pay_period_config_tenant_isolation ON payroll.pay_period_config
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY pay_period_config_tenant_isolation_insert ON payroll.pay_period_config
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

ALTER TABLE payroll.company_holiday ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_holiday_tenant_isolation ON payroll.company_holiday
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY company_holiday_tenant_isolation_insert ON payroll.company_holiday
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

-- ================================================================
-- END OF PAYLINQ SCHEMA
-- ================================================================
