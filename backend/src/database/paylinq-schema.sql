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
  payment_currency VARCHAR(3), -- Currency for payment (can differ from base currency)
  allow_multi_currency BOOLEAN NOT NULL DEFAULT false,
  
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
  
  -- Multi-Currency Support
  base_currency VARCHAR(3) DEFAULT 'SRD',
  payment_currency VARCHAR(3),
  exchange_rate_used NUMERIC(18, 8),
  conversion_summary JSONB DEFAULT '{}'::jsonb,
  
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
  
  -- Multi-Currency Support
  component_currency VARCHAR(3),
  original_amount NUMERIC(15, 2),
  converted_amount NUMERIC(15, 2),
  conversion_id BIGINT REFERENCES payroll.currency_conversion(id),
  exchange_rate_used NUMERIC(18, 8),
  conversion_metadata JSONB DEFAULT '{}'::jsonb,
  
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
CREATE INDEX IF NOT EXISTS idx_paycheck_multi_currency ON payroll.paycheck(id) 
  WHERE payment_currency IS NOT NULL AND payment_currency != base_currency;

-- Payroll run component indexes
CREATE INDEX IF NOT EXISTS idx_run_component_paycheck ON payroll.payroll_run_component(paycheck_id);
CREATE INDEX IF NOT EXISTS idx_run_component_run ON payroll.payroll_run_component(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_run_component_type ON payroll.payroll_run_component(component_type, component_code);
CREATE INDEX IF NOT EXISTS idx_run_component_conversion ON payroll.payroll_run_component(conversion_id)
  WHERE conversion_id IS NOT NULL;

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
  
  -- Multi-Currency Support (for Phase 3)
  component_currency VARCHAR(3),
  currency_conversion_required BOOLEAN NOT NULL DEFAULT false,
  
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
-- MULTI-CURRENCY SUPPORT TABLES
-- ================================================================

-- Exchange Rate Management
CREATE TABLE IF NOT EXISTS payroll.exchange_rate (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Currency Pair
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  
  -- Rate Information
  rate NUMERIC(18, 8) NOT NULL CHECK (rate > 0),
  
  -- Temporal Validity
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  
  -- Source & Metadata
  source VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ecb', 'central_bank', 'api', 'system_default')),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  
  -- Constraints
  CONSTRAINT valid_currencies CHECK (from_currency != to_currency),
  CONSTRAINT valid_date_range CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT unique_rate_effective UNIQUE (organization_id, from_currency, to_currency, effective_from)
);

-- Indexes for exchange_rate
CREATE INDEX idx_exchange_rate_org_curr_date ON payroll.exchange_rate(
  organization_id, from_currency, to_currency, effective_from
) WHERE effective_to IS NULL;

CREATE INDEX idx_exchange_rate_temporal ON payroll.exchange_rate 
  USING GIST (tstzrange(effective_from, effective_to));

CREATE INDEX idx_exchange_rate_metadata ON payroll.exchange_rate 
  USING GIN (metadata);

CREATE INDEX idx_exchange_rate_org ON payroll.exchange_rate(organization_id);

COMMENT ON TABLE payroll.exchange_rate IS 'Exchange rates for currency conversions with temporal validity';
COMMENT ON COLUMN payroll.exchange_rate.rate IS 'Exchange rate from from_currency to to_currency (e.g., 1 USD = 21.5 SRD)';
COMMENT ON COLUMN payroll.exchange_rate.effective_from IS 'When this rate becomes effective';
COMMENT ON COLUMN payroll.exchange_rate.effective_to IS 'When this rate expires (NULL = current)';

-- Currency Conversion Audit Trail
CREATE TABLE IF NOT EXISTS payroll.currency_conversion (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Conversion Details
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  from_amount NUMERIC(15, 2) NOT NULL CHECK (from_amount > 0),
  to_amount NUMERIC(15, 2) NOT NULL CHECK (to_amount > 0),
  
  -- Rate Used
  exchange_rate_id BIGINT REFERENCES payroll.exchange_rate(id),
  rate_used NUMERIC(18, 8) NOT NULL CHECK (rate_used > 0),
  
  -- Reference to Source Transaction
  reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('paycheck', 'component', 'adjustment', 'manual')),
  reference_id BIGINT NOT NULL,
  
  -- Metadata
  conversion_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for currency_conversion
CREATE INDEX idx_conversion_org_date ON payroll.currency_conversion(
  organization_id, conversion_date DESC
);

CREATE INDEX idx_conversion_reference ON payroll.currency_conversion(
  reference_type, reference_id
);

CREATE INDEX idx_conversion_exchange_rate ON payroll.currency_conversion(
  exchange_rate_id
);

CREATE INDEX idx_conversion_metadata ON payroll.currency_conversion 
  USING GIN (metadata);

COMMENT ON TABLE payroll.currency_conversion IS 'Audit trail for all currency conversions performed in the system';
COMMENT ON COLUMN payroll.currency_conversion.reference_type IS 'Type of entity that triggered the conversion';
COMMENT ON COLUMN payroll.currency_conversion.reference_id IS 'ID of the entity that triggered the conversion';

-- Organization Currency Configuration
CREATE TABLE IF NOT EXISTS payroll.organization_currency_config (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Currency Settings
  base_currency VARCHAR(3) NOT NULL DEFAULT 'SRD',
  supported_currencies VARCHAR(3)[] NOT NULL DEFAULT '{SRD}',
  
  -- Exchange Rate Settings
  auto_update_rates BOOLEAN NOT NULL DEFAULT false,
  rate_update_source VARCHAR(50) CHECK (rate_update_source IN ('ecb', 'central_bank', 'manual')),
  rate_update_frequency VARCHAR(20) CHECK (rate_update_frequency IN ('daily', 'weekly', 'manual')),
  
  -- Conversion Settings
  default_rounding_method VARCHAR(20) NOT NULL DEFAULT 'half_up' CHECK (default_rounding_method IN ('up', 'down', 'half_up', 'half_down', 'half_even')),
  default_decimal_places INTEGER NOT NULL DEFAULT 2 CHECK (default_decimal_places BETWEEN 0 AND 4),
  
  -- Approval Settings
  require_approval_threshold NUMERIC(15, 2),
  require_approval_for_rate_changes BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_org_currency_config_org ON payroll.organization_currency_config(organization_id);

COMMENT ON TABLE payroll.organization_currency_config IS 'Organization-level currency configuration and preferences';
COMMENT ON COLUMN payroll.organization_currency_config.base_currency IS 'Primary currency for payroll calculations';
COMMENT ON COLUMN payroll.organization_currency_config.supported_currencies IS 'Array of currencies the organization supports for payments';

-- Exchange Rate Audit Log
CREATE TABLE IF NOT EXISTS payroll.exchange_rate_audit (
  id BIGSERIAL PRIMARY KEY,
  exchange_rate_id BIGINT NOT NULL REFERENCES payroll.exchange_rate(id) ON DELETE CASCADE,
  
  -- Action Details
  action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'expired')),
  old_rate NUMERIC(18, 8),
  new_rate NUMERIC(18, 8),
  
  -- Context
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID NOT NULL REFERENCES hris.user_account(id)
);

CREATE INDEX idx_rate_audit_rate_id ON payroll.exchange_rate_audit(exchange_rate_id);
CREATE INDEX idx_rate_audit_date ON payroll.exchange_rate_audit(changed_at DESC);

COMMENT ON TABLE payroll.exchange_rate_audit IS 'Audit log for all exchange rate changes';

-- ================================================================
-- MULTI-CURRENCY TRIGGERS
-- ================================================================

-- Trigger for exchange_rate updated_at
CREATE OR REPLACE FUNCTION payroll.update_exchange_rate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exchange_rate_updated_at
  BEFORE UPDATE ON payroll.exchange_rate
  FOR EACH ROW
  EXECUTE FUNCTION payroll.update_exchange_rate_updated_at();

-- Trigger for organization_currency_config updated_at
CREATE OR REPLACE FUNCTION payroll.update_org_currency_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER org_currency_config_updated_at
  BEFORE UPDATE ON payroll.organization_currency_config
  FOR EACH ROW
  EXECUTE FUNCTION payroll.update_org_currency_config_updated_at();

-- Trigger to log exchange rate changes
CREATE OR REPLACE FUNCTION payroll.log_exchange_rate_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO payroll.exchange_rate_audit (
      exchange_rate_id, action, new_rate, changed_by
    ) VALUES (
      NEW.id, 'created', NEW.rate, NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.rate != NEW.rate THEN
      INSERT INTO payroll.exchange_rate_audit (
        exchange_rate_id, action, old_rate, new_rate, changed_by
      ) VALUES (
        NEW.id, 'updated', OLD.rate, NEW.rate, NEW.updated_by
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO payroll.exchange_rate_audit (
      exchange_rate_id, action, old_rate, changed_by, changed_at
    ) VALUES (
      OLD.id, 'deleted', OLD.rate, 
      COALESCE(current_setting('app.current_user_id', true)::UUID, OLD.updated_by),
      NOW()
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exchange_rate_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payroll.exchange_rate
  FOR EACH ROW
  EXECUTE FUNCTION payroll.log_exchange_rate_changes();

-- ================================================================
-- MULTI-CURRENCY RLS POLICIES
-- ================================================================

ALTER TABLE payroll.exchange_rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.currency_conversion ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.organization_currency_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.exchange_rate_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY exchange_rate_org_isolation ON payroll.exchange_rate
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY exchange_rate_org_isolation_insert ON payroll.exchange_rate
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

CREATE POLICY conversion_org_isolation ON payroll.currency_conversion
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY conversion_org_isolation_insert ON payroll.currency_conversion
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

CREATE POLICY config_org_isolation ON payroll.organization_currency_config
  USING (organization_id = payroll.get_current_organization_id());

CREATE POLICY config_org_isolation_insert ON payroll.organization_currency_config
  FOR INSERT
  WITH CHECK (organization_id = payroll.get_current_organization_id());

CREATE POLICY audit_org_isolation ON payroll.exchange_rate_audit
  USING (
    EXISTS (
      SELECT 1 FROM payroll.exchange_rate er
      WHERE er.id = exchange_rate_audit.exchange_rate_id
      AND er.organization_id = payroll.get_current_organization_id()
    )
  );

-- ================================================================
-- PERFORMANCE OPTIMIZATION - MATERIALIZED VIEWS & INDEXES
-- Phase 3 Week 9: Performance & Polish
-- ================================================================

-- =============================================================================
-- 1. MATERIALIZED VIEW FOR ACTIVE EXCHANGE RATES
-- =============================================================================
-- Purpose: Pre-compute active rates for faster lookups
-- Refresh: Every 5 minutes via cron or manual trigger

CREATE MATERIALIZED VIEW IF NOT EXISTS payroll.active_exchange_rates_mv AS
SELECT 
  er.id,
  er.organization_id,
  er.from_currency,
  er.to_currency,
  er.rate,
  er.effective_from,
  er.source,
  er.metadata,
  er.updated_at,
  -- Add commonly queried computed fields
  (1.0 / er.rate) as inverse_rate,
  EXTRACT(EPOCH FROM (NOW() - er.effective_from)) as age_seconds,
  -- Add organization context for faster joins
  o.name as organization_name
FROM payroll.exchange_rate er
JOIN organizations o ON er.organization_id = o.id
WHERE er.effective_to IS NULL  -- Only active rates
  AND er.rate > 0;  -- Valid rates only

-- Create unique index for fast lookups
CREATE UNIQUE INDEX idx_active_rates_mv_pk 
  ON payroll.active_exchange_rates_mv(id);

CREATE INDEX idx_active_rates_mv_org_pair 
  ON payroll.active_exchange_rates_mv(organization_id, from_currency, to_currency);

CREATE INDEX idx_active_rates_mv_org 
  ON payroll.active_exchange_rates_mv(organization_id);

CREATE INDEX idx_active_rates_mv_currencies 
  ON payroll.active_exchange_rates_mv(from_currency, to_currency);

COMMENT ON MATERIALIZED VIEW payroll.active_exchange_rates_mv IS 
  'Materialized view of active exchange rates for performance optimization. Refresh every 5 minutes.';

-- =============================================================================
-- 2. CONVERSION SUMMARY MATERIALIZED VIEW
-- =============================================================================
-- Purpose: Pre-aggregate conversion statistics for reporting

CREATE MATERIALIZED VIEW IF NOT EXISTS payroll.currency_conversion_summary_mv AS
SELECT 
  cc.organization_id,
  cc.from_currency,
  cc.to_currency,
  DATE_TRUNC('day', cc.conversion_date) as conversion_day,
  
  -- Aggregated metrics
  COUNT(*) as total_conversions,
  SUM(cc.from_amount) as total_from_amount,
  SUM(cc.to_amount) as total_to_amount,
  AVG(cc.rate_used) as avg_rate_used,
  MIN(cc.rate_used) as min_rate_used,
  MAX(cc.rate_used) as max_rate_used,
  STDDEV(cc.rate_used) as rate_stddev,
  
  -- By reference type
  COUNT(*) FILTER (WHERE cc.reference_type = 'paycheck') as paycheck_conversions,
  COUNT(*) FILTER (WHERE cc.reference_type = 'component') as component_conversions,
  COUNT(*) FILTER (WHERE cc.reference_type = 'adjustment') as adjustment_conversions,
  
  -- Amounts by reference type
  SUM(cc.to_amount) FILTER (WHERE cc.reference_type = 'paycheck') as paycheck_total,
  SUM(cc.to_amount) FILTER (WHERE cc.reference_type = 'component') as component_total,
  
  -- Time metadata
  MIN(cc.conversion_date) as first_conversion_at,
  MAX(cc.conversion_date) as last_conversion_at

FROM payroll.currency_conversion cc
WHERE cc.conversion_date >= NOW() - INTERVAL '90 days'  -- Keep 90 days
GROUP BY 
  cc.organization_id, 
  cc.from_currency, 
  cc.to_currency, 
  DATE_TRUNC('day', cc.conversion_date);

CREATE INDEX idx_conversion_summary_mv_org_date 
  ON payroll.currency_conversion_summary_mv(organization_id, conversion_day DESC);

CREATE INDEX idx_conversion_summary_mv_currencies 
  ON payroll.currency_conversion_summary_mv(from_currency, to_currency);

CREATE INDEX idx_conversion_summary_mv_day 
  ON payroll.currency_conversion_summary_mv(conversion_day DESC);

COMMENT ON MATERIALIZED VIEW payroll.currency_conversion_summary_mv IS 
  'Daily aggregated conversion statistics. Refresh hourly.';

-- =============================================================================
-- 3. RATE CHANGE HISTORY VIEW WITH VARIANCE ANALYSIS
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS payroll.exchange_rate_history_mv AS
SELECT 
  er.id,
  er.organization_id,
  er.from_currency,
  er.to_currency,
  er.rate as current_rate,
  er.effective_from,
  er.effective_to,
  er.source,
  
  -- Previous rate (for variance calculation)
  LAG(er.rate) OVER (
    PARTITION BY er.organization_id, er.from_currency, er.to_currency 
    ORDER BY er.effective_from
  ) as previous_rate,
  
  LAG(er.effective_from) OVER (
    PARTITION BY er.organization_id, er.from_currency, er.to_currency 
    ORDER BY er.effective_from
  ) as previous_rate_date,
  
  -- Calculate rate change
  er.rate - LAG(er.rate) OVER (
    PARTITION BY er.organization_id, er.from_currency, er.to_currency 
    ORDER BY er.effective_from
  ) as rate_change_amount,
  
  -- Calculate percentage change
  CASE 
    WHEN LAG(er.rate) OVER (
      PARTITION BY er.organization_id, er.from_currency, er.to_currency 
      ORDER BY er.effective_from
    ) IS NOT NULL AND LAG(er.rate) OVER (
      PARTITION BY er.organization_id, er.from_currency, er.to_currency 
      ORDER BY er.effective_from
    ) > 0
    THEN ROUND(
      ((er.rate - LAG(er.rate) OVER (
        PARTITION BY er.organization_id, er.from_currency, er.to_currency 
        ORDER BY er.effective_from
      )) / LAG(er.rate) OVER (
        PARTITION BY er.organization_id, er.from_currency, er.to_currency 
        ORDER BY er.effective_from
      )) * 100, 
      4
    )
    ELSE NULL
  END as rate_change_percentage,
  
  -- Duration this rate was active
  COALESCE(
    EXTRACT(EPOCH FROM (er.effective_to - er.effective_from)) / 86400,
    EXTRACT(EPOCH FROM (NOW() - er.effective_from)) / 86400
  ) as active_days

FROM payroll.exchange_rate er
WHERE er.effective_from >= NOW() - INTERVAL '2 years';  -- Keep 2 years of history

CREATE INDEX idx_rate_history_mv_org_curr 
  ON payroll.exchange_rate_history_mv(organization_id, from_currency, to_currency, effective_from DESC);

CREATE INDEX idx_rate_history_mv_date 
  ON payroll.exchange_rate_history_mv(effective_from DESC);

CREATE INDEX idx_rate_history_mv_variance 
  ON payroll.exchange_rate_history_mv(rate_change_percentage) 
  WHERE rate_change_percentage IS NOT NULL;

COMMENT ON MATERIALIZED VIEW payroll.exchange_rate_history_mv IS 
  'Exchange rate history with variance analysis. Includes rate changes and percentage differences.';

-- =============================================================================
-- 4. ADDITIONAL PERFORMANCE INDEXES
-- =============================================================================

-- Composite index for common query pattern: org + currencies + date range
CREATE INDEX IF NOT EXISTS idx_exchange_rate_lookup_optimized 
  ON payroll.exchange_rate(organization_id, from_currency, to_currency, effective_from DESC)
  INCLUDE (rate, source, metadata)
  WHERE effective_to IS NULL;

-- Partial index for recent conversions (hot data)
CREATE INDEX IF NOT EXISTS idx_conversion_recent 
  ON payroll.currency_conversion(organization_id, conversion_date DESC)
  WHERE conversion_date >= NOW() - INTERVAL '30 days';

-- Index for batch conversion queries
CREATE INDEX IF NOT EXISTS idx_conversion_batch_lookup 
  ON payroll.currency_conversion(organization_id, reference_type, reference_id)
  INCLUDE (from_currency, to_currency, from_amount, to_amount, rate_used);

-- Index for rate variance queries
CREATE INDEX IF NOT EXISTS idx_exchange_rate_org_curr_history 
  ON payroll.exchange_rate(organization_id, from_currency, to_currency, effective_from DESC)
  INCLUDE (rate, effective_to)
  WHERE effective_from >= NOW() - INTERVAL '1 year';

-- =============================================================================
-- 5. REFRESH FUNCTIONS
-- =============================================================================

-- Function to refresh all currency materialized views
CREATE OR REPLACE FUNCTION payroll.refresh_currency_materialized_views()
RETURNS void AS $$
BEGIN
  -- Refresh active rates (fast, small dataset)
  REFRESH MATERIALIZED VIEW CONCURRENTLY payroll.active_exchange_rates_mv;
  
  -- Refresh conversion summary (medium dataset)
  REFRESH MATERIALIZED VIEW CONCURRENTLY payroll.currency_conversion_summary_mv;
  
  -- Refresh rate history (large dataset, less frequent)
  REFRESH MATERIALIZED VIEW CONCURRENTLY payroll.exchange_rate_history_mv;
  
  RAISE NOTICE 'All currency materialized views refreshed successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION payroll.refresh_currency_materialized_views() IS 
  'Refresh all currency-related materialized views. Schedule via cron or pg_cron.';

-- Function to refresh only active rates (frequent refresh)
CREATE OR REPLACE FUNCTION payroll.refresh_active_rates_mv()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY payroll.active_exchange_rates_mv;
  RAISE NOTICE 'Active exchange rates materialized view refreshed';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. QUERY OPTIMIZATION STATISTICS
-- =============================================================================

-- Ensure statistics are up-to-date for query planner
ANALYZE payroll.exchange_rate;
ANALYZE payroll.currency_conversion;
ANALYZE payroll.organization_currency_config;

-- Set statistics target higher for commonly filtered columns
ALTER TABLE payroll.exchange_rate 
  ALTER COLUMN organization_id SET STATISTICS 1000,
  ALTER COLUMN from_currency SET STATISTICS 500,
  ALTER COLUMN to_currency SET STATISTICS 500;

ALTER TABLE payroll.currency_conversion 
  ALTER COLUMN organization_id SET STATISTICS 1000,
  ALTER COLUMN conversion_date SET STATISTICS 1000;

-- =============================================================================
-- 7. PERFORMANCE MONITORING VIEW
-- =============================================================================

CREATE OR REPLACE VIEW payroll.currency_mv_status AS
SELECT 
  'active_exchange_rates_mv' as view_name,
  pg_size_pretty(pg_total_relation_size('payroll.active_exchange_rates_mv')) as size,
  (SELECT COUNT(*) FROM payroll.active_exchange_rates_mv) as row_count,
  (SELECT MAX(updated_at) FROM payroll.active_exchange_rates_mv) as last_data_update,
  pg_stat_get_last_vacuum_time(c.oid) as last_maintenance
FROM pg_class c
WHERE c.relname = 'active_exchange_rates_mv'

UNION ALL

SELECT 
  'currency_conversion_summary_mv' as view_name,
  pg_size_pretty(pg_total_relation_size('payroll.currency_conversion_summary_mv')) as size,
  (SELECT COUNT(*) FROM payroll.currency_conversion_summary_mv) as row_count,
  (SELECT MAX(last_conversion_at) FROM payroll.currency_conversion_summary_mv) as last_data_update,
  pg_stat_get_last_vacuum_time(c.oid) as last_maintenance
FROM pg_class c
WHERE c.relname = 'currency_conversion_summary_mv'

UNION ALL

SELECT 
  'exchange_rate_history_mv' as view_name,
  pg_size_pretty(pg_total_relation_size('payroll.exchange_rate_history_mv')) as size,
  (SELECT COUNT(*) FROM payroll.exchange_rate_history_mv) as row_count,
  (SELECT MAX(effective_from) FROM payroll.exchange_rate_history_mv) as last_data_update,
  pg_stat_get_last_vacuum_time(c.oid) as last_maintenance
FROM pg_class c
WHERE c.relname = 'exchange_rate_history_mv';

COMMENT ON VIEW payroll.currency_mv_status IS 
  'Monitor materialized view size, freshness, and maintenance status';

-- ================================================================
-- END OF PAYLINQ SCHEMA
-- ================================================================
- -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   C u r r e n c y   A p p r o v a l   W o r k f l o w   M i g r a t i o n  
 - -   P h a s e   4   W e e k   1 1 :   A p p r o v a l   S y s t e m   f o r   C u r r e n c y   O p e r a t i o n s  
 - -   D a t e :   2 0 2 5 - 1 1 - 1 4  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   1 .   A P P R O V A L   W O R K F L O W   T A B L E S  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 - -   A p p r o v a l   r e q u e s t s   f o r   c u r r e n c y   c o n v e r s i o n s   a n d   r a t e   c h a n g e s  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t   (  
     i d   B I G S E R I A L   P R I M A R Y   K E Y ,  
     o r g a n i z a t i o n _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   o r g a n i z a t i o n s ( i d )   O N   D E L E T E   C A S C A D E ,  
      
     - -   R e q u e s t   T y p e  
     r e q u e s t _ t y p e   V A R C H A R ( 5 0 )   N O T   N U L L   C H E C K   ( r e q u e s t _ t y p e   I N   (  
         ' c o n v e r s i o n ' ,                       - -   L a r g e   c o n v e r s i o n   n e e d i n g   a p p r o v a l  
         ' r a t e _ c h a n g e ' ,                     - -   E x c h a n g e   r a t e   c h a n g e  
         ' b u l k _ r a t e _ i m p o r t ' ,           - -   B u l k   r a t e   i m p o r t  
         ' c o n f i g u r a t i o n _ c h a n g e '     - -   C u r r e n c y   c o n f i g   c h a n g e  
     ) ) ,  
      
     - -   R e q u e s t   D e t a i l s  
     r e f e r e n c e _ t y p e   V A R C H A R ( 5 0 ) ,     - -   W h a t   e n t i t y   t r i g g e r e d   t h i s   ( p a y c h e c k ,   m a n u a l ,   e t c . )  
     r e f e r e n c e _ i d   B I G I N T ,  
      
     - -   R e q u e s t   D a t a   ( J S O N B   f o r   f l e x i b i l i t y )  
     r e q u e s t _ d a t a   J S O N B   N O T   N U L L ,  
     - -   E x a m p l e s :  
     - -   C o n v e r s i o n :   { " f r o m _ c u r r e n c y " :   " U S D " ,   " t o _ c u r r e n c y " :   " S R D " ,   " a m o u n t " :   5 0 0 0 0 ,   " r a t e " :   2 1 . 5 }  
     - -   R a t e   c h a n g e :   { " f r o m _ c u r r e n c y " :   " U S D " ,   " t o _ c u r r e n c y " :   " S R D " ,   " o l d _ r a t e " :   2 1 . 0 ,   " n e w _ r a t e " :   2 1 . 5 }  
      
     - -   J u s t i f i c a t i o n  
     r e a s o n   T E X T ,  
      
     - -   S t a t u s  
     s t a t u s   V A R C H A R ( 2 0 )   N O T   N U L L   D E F A U L T   ' p e n d i n g '   C H E C K   ( s t a t u s   I N   (  
         ' p e n d i n g ' ,         - -   A w a i t i n g   a p p r o v a l  
         ' a p p r o v e d ' ,       - -   A p p r o v e d  
         ' r e j e c t e d ' ,       - -   R e j e c t e d  
         ' c a n c e l l e d ' ,     - -   C a n c e l l e d   b y   r e q u e s t o r  
         ' e x p i r e d '           - -   E x p i r e d   d u e   t o   t i m e o u t  
     ) ) ,  
      
     - -   P r i o r i t y  
     p r i o r i t y   V A R C H A R ( 2 0 )   N O T   N U L L   D E F A U L T   ' n o r m a l '   C H E C K   ( p r i o r i t y   I N   ( ' l o w ' ,   ' n o r m a l ' ,   ' h i g h ' ,   ' u r g e n t ' ) ) ,  
      
     - -   A p p r o v a l   C o n f i g u r a t i o n  
     r e q u i r e d _ a p p r o v a l s   I N T E G E R   N O T   N U L L   D E F A U L T   1 ,  
     c u r r e n t _ a p p r o v a l s   I N T E G E R   N O T   N U L L   D E F A U L T   0 ,  
      
     - -   E x p i r a t i o n  
     e x p i r e s _ a t   T I M E S T A M P T Z ,  
      
     - -   M e t a d a t a  
     m e t a d a t a   J S O N B   D E F A U L T   ' { } ' : : j s o n b ,  
      
     - -   A u d i t  
     c r e a t e d _ a t   T I M E S T A M P T Z   N O T   N U L L   D E F A U L T   N O W ( ) ,  
     u p d a t e d _ a t   T I M E S T A M P T Z   N O T   N U L L   D E F A U L T   N O W ( ) ,  
     c r e a t e d _ b y   U U I D   N O T   N U L L   R E F E R E N C E S   h r i s . u s e r _ a c c o u n t ( i d ) ,  
      
     - -   I n d e x e s   f o r   q u e r i e s  
     C O N S T R A I N T   v a l i d _ a p p r o v a l s   C H E C K   ( c u r r e n t _ a p p r o v a l s   < =   r e q u i r e d _ a p p r o v a l s )  
 ) ;  
  
 - -   I n d e x e s   f o r   a p p r o v a l   r e q u e s t s  
 C R E A T E   I N D E X   i d x _ a p p r o v a l _ r e q u e s t _ o r g _ s t a t u s    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t ( o r g a n i z a t i o n _ i d ,   s t a t u s ,   c r e a t e d _ a t   D E S C ) ;  
  
 C R E A T E   I N D E X   i d x _ a p p r o v a l _ r e q u e s t _ t y p e    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t ( r e q u e s t _ t y p e ,   s t a t u s ) ;  
  
 C R E A T E   I N D E X   i d x _ a p p r o v a l _ r e q u e s t _ r e f e r e n c e    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t ( r e f e r e n c e _ t y p e ,   r e f e r e n c e _ i d ) ;  
  
 C R E A T E   I N D E X   i d x _ a p p r o v a l _ r e q u e s t _ p e n d i n g    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t ( o r g a n i z a t i o n _ i d ,   c r e a t e d _ a t   D E S C )  
     W H E R E   s t a t u s   =   ' p e n d i n g ' ;  
  
 C R E A T E   I N D E X   i d x _ a p p r o v a l _ r e q u e s t _ e x p i r e s    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t ( e x p i r e s _ a t )  
     W H E R E   s t a t u s   =   ' p e n d i n g '   A N D   e x p i r e s _ a t   I S   N O T   N U L L ;  
  
 C O M M E N T   O N   T A B L E   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t   I S    
     ' A p p r o v a l   r e q u e s t s   f o r   c u r r e n c y   o p e r a t i o n s   r e q u i r i n g   a u t h o r i z a t i o n ' ;  
  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   2 .   A P P R O V A L   A C T I O N S   ( W H O   A P P R O V E D / R E J E C T E D )  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   p a y r o l l . c u r r e n c y _ a p p r o v a l _ a c t i o n   (  
     i d   B I G S E R I A L   P R I M A R Y   K E Y ,  
     a p p r o v a l _ r e q u e s t _ i d   B I G I N T   N O T   N U L L   R E F E R E N C E S   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t ( i d )   O N   D E L E T E   C A S C A D E ,  
      
     - -   A c t i o n   T y p e  
     a c t i o n   V A R C H A R ( 2 0 )   N O T   N U L L   C H E C K   ( a c t i o n   I N   (  
         ' a p p r o v e d ' ,  
         ' r e j e c t e d ' ,  
         ' r e q u e s t e d _ c h a n g e s ' ,  
         ' c a n c e l l e d ' ,  
         ' d e l e g a t e d '  
     ) ) ,  
      
     - -   C o m m e n t s  
     c o m m e n t s   T E X T ,  
      
     - -   D e l e g a t i o n   ( i f   a c t i o n   =   ' d e l e g a t e d ' )  
     d e l e g a t e d _ t o   U U I D   R E F E R E N C E S   h r i s . u s e r _ a c c o u n t ( i d ) ,  
      
     - -   M e t a d a t a  
     m e t a d a t a   J S O N B   D E F A U L T   ' { } ' : : j s o n b ,  
      
     - -   A u d i t  
     c r e a t e d _ a t   T I M E S T A M P T Z   N O T   N U L L   D E F A U L T   N O W ( ) ,  
     c r e a t e d _ b y   U U I D   N O T   N U L L   R E F E R E N C E S   h r i s . u s e r _ a c c o u n t ( i d )  
 ) ;  
  
 C R E A T E   I N D E X   i d x _ a p p r o v a l _ a c t i o n _ r e q u e s t    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ a c t i o n ( a p p r o v a l _ r e q u e s t _ i d ,   c r e a t e d _ a t   D E S C ) ;  
  
 C R E A T E   I N D E X   i d x _ a p p r o v a l _ a c t i o n _ u s e r    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ a c t i o n ( c r e a t e d _ b y ) ;  
  
 C O M M E N T   O N   T A B L E   p a y r o l l . c u r r e n c y _ a p p r o v a l _ a c t i o n   I S    
     ' I n d i v i d u a l   a p p r o v a l / r e j e c t i o n   a c t i o n s   o n   a p p r o v a l   r e q u e s t s ' ;  
  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   3 .   A P P R O V A L   R U L E S   C O N F I G U R A T I O N  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r u l e   (  
     i d   B I G S E R I A L   P R I M A R Y   K E Y ,  
     o r g a n i z a t i o n _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   o r g a n i z a t i o n s ( i d )   O N   D E L E T E   C A S C A D E ,  
      
     - -   R u l e   D e t a i l s  
     n a m e   V A R C H A R ( 2 5 5 )   N O T   N U L L ,  
     d e s c r i p t i o n   T E X T ,  
      
     - -   R u l e   T y p e  
     r u l e _ t y p e   V A R C H A R ( 5 0 )   N O T   N U L L   C H E C K   ( r u l e _ t y p e   I N   (  
         ' c o n v e r s i o n _ t h r e s h o l d ' ,       - -   A p p r o v e   c o n v e r s i o n s   a b o v e   a m o u n t  
         ' r a t e _ v a r i a n c e ' ,                     - -   A p p r o v e   r a t e   c h a n g e s   a b o v e   %  
         ' b u l k _ o p e r a t i o n ' ,                   - -   A p p r o v e   b u l k   i m p o r t s  
         ' c o n f i g u r a t i o n _ c h a n g e '         - -   A p p r o v e   c o n f i g   c h a n g e s  
     ) ) ,  
      
     - -   C o n d i t i o n s   ( J S O N B   f o r   f l e x i b i l i t y )  
     c o n d i t i o n s   J S O N B   N O T   N U L L ,  
     - -   E x a m p l e s :  
     - -   { " t h r e s h o l d _ a m o u n t " :   1 0 0 0 0 ,   " c u r r e n c i e s " :   [ " U S D " ,   " E U R " ] }  
     - -   { " v a r i a n c e _ p e r c e n t a g e " :   5 . 0 ,   " f r o m _ c u r r e n c y " :   " U S D " }  
      
     - -   A p p r o v a l   R e q u i r e m e n t s  
     r e q u i r e d _ a p p r o v a l s   I N T E G E R   N O T   N U L L   D E F A U L T   1 ,  
     a p p r o v e r _ r o l e   V A R C H A R ( 5 0 ) ,     - -   W h i c h   r o l e   c a n   a p p r o v e   ( e . g . ,   ' p a y r o l l _ a d m i n ' ,   ' f i n a n c e _ m a n a g e r ' )  
     a p p r o v e r _ u s e r _ i d s   U U I D [ ] ,       - -   S p e c i f i c   u s e r s   w h o   c a n   a p p r o v e  
      
     - -   R u l e   S e t t i n g s  
     e n a b l e d   B O O L E A N   N O T   N U L L   D E F A U L T   t r u e ,  
     p r i o r i t y   I N T E G E R   N O T   N U L L   D E F A U L T   0 ,     - -   H i g h e r   p r i o r i t y   r u l e s   c h e c k e d   f i r s t  
     e x p i r a t i o n _ h o u r s   I N T E G E R ,     - -   A u t o - e x p i r e   a f t e r   X   h o u r s  
      
     - -   M e t a d a t a  
     m e t a d a t a   J S O N B   D E F A U L T   ' { } ' : : j s o n b ,  
      
     - -   A u d i t  
     c r e a t e d _ a t   T I M E S T A M P T Z   N O T   N U L L   D E F A U L T   N O W ( ) ,  
     u p d a t e d _ a t   T I M E S T A M P T Z   N O T   N U L L   D E F A U L T   N O W ( ) ,  
     c r e a t e d _ b y   U U I D   R E F E R E N C E S   h r i s . u s e r _ a c c o u n t ( i d ) ,  
     u p d a t e d _ b y   U U I D   R E F E R E N C E S   h r i s . u s e r _ a c c o u n t ( i d )  
 ) ;  
  
 C R E A T E   I N D E X   i d x _ a p p r o v a l _ r u l e _ o r g    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r u l e ( o r g a n i z a t i o n _ i d ,   e n a b l e d ,   p r i o r i t y   D E S C ) ;  
  
 C R E A T E   I N D E X   i d x _ a p p r o v a l _ r u l e _ t y p e    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r u l e ( r u l e _ t y p e ,   e n a b l e d ) ;  
  
 C O M M E N T   O N   T A B L E   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r u l e   I S    
     ' C o n f i g u r a b l e   r u l e s   t h a t   d e t e r m i n e   w h e n   a p p r o v a l   i s   r e q u i r e d ' ;  
  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   4 .   A P P R O V A L   N O T I F I C A T I O N S  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   p a y r o l l . c u r r e n c y _ a p p r o v a l _ n o t i f i c a t i o n   (  
     i d   B I G S E R I A L   P R I M A R Y   K E Y ,  
     a p p r o v a l _ r e q u e s t _ i d   B I G I N T   N O T   N U L L   R E F E R E N C E S   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t ( i d )   O N   D E L E T E   C A S C A D E ,  
      
     - -   R e c i p i e n t  
     r e c i p i e n t _ u s e r _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   h r i s . u s e r _ a c c o u n t ( i d ) ,  
      
     - -   N o t i f i c a t i o n   T y p e  
     n o t i f i c a t i o n _ t y p e   V A R C H A R ( 5 0 )   N O T   N U L L   C H E C K   ( n o t i f i c a t i o n _ t y p e   I N   (  
         ' a p p r o v a l _ r e q u e s t e d ' ,  
         ' a p p r o v a l _ r e m i n d e r ' ,  
         ' a p p r o v e d ' ,  
         ' r e j e c t e d ' ,  
         ' e x p i r e d ' ,  
         ' d e l e g a t e d '  
     ) ) ,  
      
     - -   D e l i v e r y  
     d e l i v e r y _ m e t h o d   V A R C H A R ( 2 0 )   N O T   N U L L   C H E C K   ( d e l i v e r y _ m e t h o d   I N   ( ' e m a i l ' ,   ' i n _ a p p ' ,   ' b o t h ' ) ) ,  
     s e n t _ a t   T I M E S T A M P T Z ,  
     r e a d _ a t   T I M E S T A M P T Z ,  
      
     - -   C o n t e n t  
     s u b j e c t   V A R C H A R ( 2 5 5 ) ,  
     m e s s a g e   T E X T ,  
      
     - -   M e t a d a t a  
     m e t a d a t a   J S O N B   D E F A U L T   ' { } ' : : j s o n b ,  
      
     - -   A u d i t  
     c r e a t e d _ a t   T I M E S T A M P T Z   N O T   N U L L   D E F A U L T   N O W ( )  
 ) ;  
  
 C R E A T E   I N D E X   i d x _ a p p r o v a l _ n o t i f i c a t i o n _ r e c i p i e n t    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ n o t i f i c a t i o n ( r e c i p i e n t _ u s e r _ i d ,   r e a d _ a t )  
     W H E R E   r e a d _ a t   I S   N U L L ;  
  
 C R E A T E   I N D E X   i d x _ a p p r o v a l _ n o t i f i c a t i o n _ r e q u e s t    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ n o t i f i c a t i o n ( a p p r o v a l _ r e q u e s t _ i d ) ;  
  
 C O M M E N T   O N   T A B L E   p a y r o l l . c u r r e n c y _ a p p r o v a l _ n o t i f i c a t i o n   I S    
     ' N o t i f i c a t i o n s   s e n t   f o r   a p p r o v a l   w o r k f l o w   e v e n t s ' ;  
  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   5 .   T R I G G E R S   &   F U N C T I O N S  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 - -   A u t o - u p d a t e   u p d a t e d _ a t   o n   a p p r o v a l   r e q u e s t   c h a n g e s  
 C R E A T E   O R   R E P L A C E   F U N C T I O N   p a y r o l l . u p d a t e _ a p p r o v a l _ r e q u e s t _ u p d a t e d _ a t ( )  
 R E T U R N S   T R I G G E R   A S   $ $  
 B E G I N  
     N E W . u p d a t e d _ a t   =   N O W ( ) ;  
     R E T U R N   N E W ;  
 E N D ;  
 $ $   L A N G U A G E   p l p g s q l ;  
  
 C R E A T E   T R I G G E R   a p p r o v a l _ r e q u e s t _ u p d a t e d _ a t  
     B E F O R E   U P D A T E   O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t  
     F O R   E A C H   R O W  
     E X E C U T E   F U N C T I O N   p a y r o l l . u p d a t e _ a p p r o v a l _ r e q u e s t _ u p d a t e d _ a t ( ) ;  
  
 - -   I n c r e m e n t   a p p r o v a l   c o u n t   w h e n   a c t i o n   i s   ' a p p r o v e d '  
 C R E A T E   O R   R E P L A C E   F U N C T I O N   p a y r o l l . i n c r e m e n t _ a p p r o v a l _ c o u n t ( )  
 R E T U R N S   T R I G G E R   A S   $ $  
 B E G I N  
     I F   N E W . a c t i o n   =   ' a p p r o v e d '   T H E N  
         U P D A T E   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t  
         S E T   c u r r e n t _ a p p r o v a l s   =   c u r r e n t _ a p p r o v a l s   +   1 ,  
                 s t a t u s   =   C A S E    
                     W H E N   c u r r e n t _ a p p r o v a l s   +   1   > =   r e q u i r e d _ a p p r o v a l s   T H E N   ' a p p r o v e d '  
                     E L S E   s t a t u s  
                 E N D  
         W H E R E   i d   =   N E W . a p p r o v a l _ r e q u e s t _ i d ;  
     E L S I F   N E W . a c t i o n   =   ' r e j e c t e d '   T H E N  
         U P D A T E   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t  
         S E T   s t a t u s   =   ' r e j e c t e d '  
         W H E R E   i d   =   N E W . a p p r o v a l _ r e q u e s t _ i d ;  
     E N D   I F ;  
      
     R E T U R N   N E W ;  
 E N D ;  
 $ $   L A N G U A G E   p l p g s q l ;  
  
 C R E A T E   T R I G G E R   a p p r o v a l _ a c t i o n _ t r i g g e r  
     A F T E R   I N S E R T   O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ a c t i o n  
     F O R   E A C H   R O W  
     E X E C U T E   F U N C T I O N   p a y r o l l . i n c r e m e n t _ a p p r o v a l _ c o u n t ( ) ;  
  
 - -   E x p i r e   o l d   p e n d i n g   a p p r o v a l s  
 C R E A T E   O R   R E P L A C E   F U N C T I O N   p a y r o l l . e x p i r e _ o l d _ a p p r o v a l _ r e q u e s t s ( )  
 R E T U R N S   I N T E G E R   A S   $ $  
 D E C L A R E  
     e x p i r e d _ c o u n t   I N T E G E R ;  
 B E G I N  
     U P D A T E   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t  
     S E T   s t a t u s   =   ' e x p i r e d '  
     W H E R E   s t a t u s   =   ' p e n d i n g '  
         A N D   e x p i r e s _ a t   I S   N O T   N U L L  
         A N D   e x p i r e s _ a t   <   N O W ( ) ;  
      
     G E T   D I A G N O S T I C S   e x p i r e d _ c o u n t   =   R O W _ C O U N T ;  
     R E T U R N   e x p i r e d _ c o u n t ;  
 E N D ;  
 $ $   L A N G U A G E   p l p g s q l ;  
  
 C O M M E N T   O N   F U N C T I O N   p a y r o l l . e x p i r e _ o l d _ a p p r o v a l _ r e q u e s t s ( )   I S    
     ' E x p i r e   p e n d i n g   a p p r o v a l   r e q u e s t s   p a s t   t h e i r   e x p i r a t i o n   t i m e .   R u n   v i a   c r o n . ' ;  
  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   6 .   V I E W S   F O R   C O M M O N   Q U E R I E S  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 - -   P e n d i n g   a p p r o v a l s   v i e w   w i t h   f u l l   c o n t e x t  
 C R E A T E   O R   R E P L A C E   V I E W   p a y r o l l . p e n d i n g _ a p p r o v a l _ r e q u e s t s   A S  
 S E L E C T    
     a r . i d ,  
     a r . o r g a n i z a t i o n _ i d ,  
     a r . r e q u e s t _ t y p e ,  
     a r . r e f e r e n c e _ t y p e ,  
     a r . r e f e r e n c e _ i d ,  
     a r . r e q u e s t _ d a t a ,  
     a r . r e a s o n ,  
     a r . p r i o r i t y ,  
     a r . r e q u i r e d _ a p p r o v a l s ,  
     a r . c u r r e n t _ a p p r o v a l s ,  
     a r . r e q u i r e d _ a p p r o v a l s   -   a r . c u r r e n t _ a p p r o v a l s   a s   r e m a i n i n g _ a p p r o v a l s ,  
     a r . e x p i r e s _ a t ,  
     a r . c r e a t e d _ a t ,  
     a r . c r e a t e d _ b y ,  
     u . f i r s t _ n a m e   | |   '   '   | |   u . l a s t _ n a m e   a s   r e q u e s t e d _ b y _ n a m e ,  
     u . e m a i l   a s   r e q u e s t e d _ b y _ e m a i l ,  
     E X T R A C T ( E P O C H   F R O M   ( N O W ( )   -   a r . c r e a t e d _ a t ) )   /   3 6 0 0   a s   a g e _ h o u r s ,  
     C A S E    
         W H E N   a r . e x p i r e s _ a t   I S   N O T   N U L L   T H E N    
             E X T R A C T ( E P O C H   F R O M   ( a r . e x p i r e s _ a t   -   N O W ( ) ) )   /   3 6 0 0  
         E L S E   N U L L  
     E N D   a s   h o u r s _ u n t i l _ e x p i r y  
 F R O M   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t   a r  
 L E F T   J O I N   h r i s . u s e r _ a c c o u n t   u   O N   a r . c r e a t e d _ b y   =   u . i d  
 W H E R E   a r . s t a t u s   =   ' p e n d i n g ' ;  
  
 C O M M E N T   O N   V I E W   p a y r o l l . p e n d i n g _ a p p r o v a l _ r e q u e s t s   I S    
     ' A l l   p e n d i n g   a p p r o v a l   r e q u e s t s   w i t h   c o m p u t e d   f i e l d s   f o r   U I   d i s p l a y ' ;  
  
 - -   A p p r o v a l   s t a t i s t i c s   b y   o r g a n i z a t i o n  
 C R E A T E   O R   R E P L A C E   V I E W   p a y r o l l . a p p r o v a l _ s t a t i s t i c s   A S  
 S E L E C T    
     o r g a n i z a t i o n _ i d ,  
     r e q u e s t _ t y p e ,  
     C O U N T ( * )   F I L T E R   ( W H E R E   s t a t u s   =   ' p e n d i n g ' )   a s   p e n d i n g _ c o u n t ,  
     C O U N T ( * )   F I L T E R   ( W H E R E   s t a t u s   =   ' a p p r o v e d ' )   a s   a p p r o v e d _ c o u n t ,  
     C O U N T ( * )   F I L T E R   ( W H E R E   s t a t u s   =   ' r e j e c t e d ' )   a s   r e j e c t e d _ c o u n t ,  
     C O U N T ( * )   F I L T E R   ( W H E R E   s t a t u s   =   ' e x p i r e d ' )   a s   e x p i r e d _ c o u n t ,  
     A V G ( E X T R A C T ( E P O C H   F R O M   ( u p d a t e d _ a t   -   c r e a t e d _ a t ) )   /   3 6 0 0 )   F I L T E R   ( W H E R E   s t a t u s   I N   ( ' a p p r o v e d ' ,   ' r e j e c t e d ' ) )   a s   a v g _ r e s o l u t i o n _ h o u r s ,  
     C O U N T ( * )   F I L T E R   ( W H E R E   s t a t u s   =   ' a p p r o v e d '   A N D   c u r r e n t _ a p p r o v a l s   =   r e q u i r e d _ a p p r o v a l s )   a s   f u l l y _ a p p r o v e d _ c o u n t  
 F R O M   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t  
 W H E R E   c r e a t e d _ a t   > =   N O W ( )   -   I N T E R V A L   ' 9 0   d a y s '  
 G R O U P   B Y   o r g a n i z a t i o n _ i d ,   r e q u e s t _ t y p e ;  
  
 C O M M E N T   O N   V I E W   p a y r o l l . a p p r o v a l _ s t a t i s t i c s   I S    
     ' A p p r o v a l   w o r k f l o w   s t a t i s t i c s   f o r   m o n i t o r i n g   a n d   r e p o r t i n g ' ;  
  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   7 .   U P D A T E   O R G A N I Z A T I O N   C O N F I G   W I T H   A P P R O V A L   S E T T I N G S  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 - -   A d d   a p p r o v a l   n o t i f i c a t i o n   p r e f e r e n c e s   t o   o r g a n i z a t i o n   c o n f i g  
 A L T E R   T A B L E   p a y r o l l . o r g a n i z a t i o n _ c u r r e n c y _ c o n f i g  
     A D D   C O L U M N   I F   N O T   E X I S T S   a p p r o v a l _ n o t i f i c a t i o n _ e m a i l   B O O L E A N   N O T   N U L L   D E F A U L T   t r u e ,  
     A D D   C O L U M N   I F   N O T   E X I S T S   a p p r o v a l _ r e m i n d e r _ h o u r s   I N T E G E R   D E F A U L T   2 4 ,  
     A D D   C O L U M N   I F   N O T   E X I S T S   a p p r o v a l _ a u t o _ e x p i r e _ h o u r s   I N T E G E R   D E F A U L T   7 2 ;  
  
 C O M M E N T   O N   C O L U M N   p a y r o l l . o r g a n i z a t i o n _ c u r r e n c y _ c o n f i g . a p p r o v a l _ n o t i f i c a t i o n _ e m a i l   I S    
     ' S e n d   e m a i l   n o t i f i c a t i o n s   f o r   a p p r o v a l   r e q u e s t s ' ;  
 C O M M E N T   O N   C O L U M N   p a y r o l l . o r g a n i z a t i o n _ c u r r e n c y _ c o n f i g . a p p r o v a l _ r e m i n d e r _ h o u r s   I S    
     ' S e n d   r e m i n d e r   a f t e r   X   h o u r s   f o r   p e n d i n g   a p p r o v a l s ' ;  
 C O M M E N T   O N   C O L U M N   p a y r o l l . o r g a n i z a t i o n _ c u r r e n c y _ c o n f i g . a p p r o v a l _ a u t o _ e x p i r e _ h o u r s   I S    
     ' A u t o - e x p i r e   a p p r o v a l   r e q u e s t s   a f t e r   X   h o u r s ' ;  
  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   8 .   S A M P L E   A P P R O V A L   R U L E S   ( C O M M E N T E D   O U T   -   F O R   R E F E R E N C E )  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 - -   E x a m p l e :   R e q u i r e   a p p r o v a l   f o r   c o n v e r s i o n s   o v e r   $ 1 0 , 0 0 0  
 / *  
 I N S E R T   I N T O   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r u l e   (  
     o r g a n i z a t i o n _ i d ,  
     n a m e ,  
     d e s c r i p t i o n ,  
     r u l e _ t y p e ,  
     c o n d i t i o n s ,  
     r e q u i r e d _ a p p r o v a l s ,  
     a p p r o v e r _ r o l e ,  
     e n a b l e d ,  
     p r i o r i t y ,  
     e x p i r a t i o n _ h o u r s  
 )   V A L U E S   (  
     ' y o u r - o r g - i d - h e r e ' ,  
     ' L a r g e   C o n v e r s i o n   A p p r o v a l ' ,  
     ' R e q u i r e   a p p r o v a l   f o r   c u r r e n c y   c o n v e r s i o n s   e x c e e d i n g   $ 1 0 , 0 0 0 ' ,  
     ' c o n v e r s i o n _ t h r e s h o l d ' ,  
     ' { " t h r e s h o l d _ a m o u n t " :   1 0 0 0 0 ,   " c u r r e n c i e s " :   [ " U S D " ,   " E U R " ] } ' : : j s o n b ,  
     1 ,  
     ' f i n a n c e _ m a n a g e r ' ,  
     t r u e ,  
     1 0 0 ,  
     4 8  
 ) ;  
 * /  
  
 - -   E x a m p l e :   R e q u i r e   a p p r o v a l   f o r   r a t e   c h a n g e s   >   5 %  
 / *  
 I N S E R T   I N T O   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r u l e   (  
     o r g a n i z a t i o n _ i d ,  
     n a m e ,  
     d e s c r i p t i o n ,  
     r u l e _ t y p e ,  
     c o n d i t i o n s ,  
     r e q u i r e d _ a p p r o v a l s ,  
     a p p r o v e r _ r o l e ,  
     e n a b l e d ,  
     p r i o r i t y  
 )   V A L U E S   (  
     ' y o u r - o r g - i d - h e r e ' ,  
     ' S i g n i f i c a n t   R a t e   C h a n g e   A p p r o v a l ' ,  
     ' R e q u i r e   a p p r o v a l   f o r   e x c h a n g e   r a t e   c h a n g e s   e x c e e d i n g   5 %   v a r i a n c e ' ,  
     ' r a t e _ v a r i a n c e ' ,  
     ' { " v a r i a n c e _ p e r c e n t a g e " :   5 . 0 } ' : : j s o n b ,  
     2 ,  
     ' f i n a n c e _ m a n a g e r ' ,  
     t r u e ,  
     9 0  
 ) ;  
 * /  
  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   9 .   R L S   P O L I C I E S  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 A L T E R   T A B L E   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t   E N A B L E   R O W   L E V E L   S E C U R I T Y ;  
 A L T E R   T A B L E   p a y r o l l . c u r r e n c y _ a p p r o v a l _ a c t i o n   E N A B L E   R O W   L E V E L   S E C U R I T Y ;  
 A L T E R   T A B L E   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r u l e   E N A B L E   R O W   L E V E L   S E C U R I T Y ;  
 A L T E R   T A B L E   p a y r o l l . c u r r e n c y _ a p p r o v a l _ n o t i f i c a t i o n   E N A B L E   R O W   L E V E L   S E C U R I T Y ;  
  
 - -   A p p r o v a l   r e q u e s t   p o l i c i e s  
 C R E A T E   P O L I C Y   a p p r o v a l _ r e q u e s t _ o r g _ i s o l a t i o n    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t  
     U S I N G   ( o r g a n i z a t i o n _ i d   =   p a y r o l l . g e t _ c u r r e n t _ o r g a n i z a t i o n _ i d ( ) ) ;  
  
 C R E A T E   P O L I C Y   a p p r o v a l _ r e q u e s t _ o r g _ i s o l a t i o n _ i n s e r t    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t  
     F O R   I N S E R T  
     W I T H   C H E C K   ( o r g a n i z a t i o n _ i d   =   p a y r o l l . g e t _ c u r r e n t _ o r g a n i z a t i o n _ i d ( ) ) ;  
  
 - -   A p p r o v a l   a c t i o n   p o l i c i e s  
 C R E A T E   P O L I C Y   a p p r o v a l _ a c t i o n _ i s o l a t i o n    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ a c t i o n  
     U S I N G   (  
         E X I S T S   (  
             S E L E C T   1   F R O M   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t   a r  
             W H E R E   a r . i d   =   c u r r e n c y _ a p p r o v a l _ a c t i o n . a p p r o v a l _ r e q u e s t _ i d  
             A N D   a r . o r g a n i z a t i o n _ i d   =   p a y r o l l . g e t _ c u r r e n t _ o r g a n i z a t i o n _ i d ( )  
         )  
     ) ;  
  
 - -   A p p r o v a l   r u l e   p o l i c i e s  
 C R E A T E   P O L I C Y   a p p r o v a l _ r u l e _ o r g _ i s o l a t i o n    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r u l e  
     U S I N G   ( o r g a n i z a t i o n _ i d   =   p a y r o l l . g e t _ c u r r e n t _ o r g a n i z a t i o n _ i d ( ) ) ;  
  
 - -   N o t i f i c a t i o n   p o l i c i e s  
 C R E A T E   P O L I C Y   a p p r o v a l _ n o t i f i c a t i o n _ i s o l a t i o n    
     O N   p a y r o l l . c u r r e n c y _ a p p r o v a l _ n o t i f i c a t i o n  
     U S I N G   (  
         E X I S T S   (  
             S E L E C T   1   F R O M   p a y r o l l . c u r r e n c y _ a p p r o v a l _ r e q u e s t   a r  
             W H E R E   a r . i d   =   c u r r e n c y _ a p p r o v a l _ n o t i f i c a t i o n . a p p r o v a l _ r e q u e s t _ i d  
             A N D   a r . o r g a n i z a t i o n _ i d   =   p a y r o l l . g e t _ c u r r e n t _ o r g a n i z a t i o n _ i d ( )  
         )  
     ) ;  
  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   E N D   O F   M I G R A T I O N  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 