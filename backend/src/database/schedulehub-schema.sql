-- ================================================================
-- SCHEDULEHUB DATABASE SCHEMA
-- Comprehensive workforce scheduling schema for RecruitIQ Platform
-- 
-- Schema: scheduling
-- Tables: 16
-- Features: Shift scheduling, station management, role assignments,
--           availability tracking, shift swapping, time-off requests,
--           schedule optimization, demand forecasting
-- 
-- Version: 1.0.0
-- Created: Phase 16 - ScheduleHub Implementation
-- Updated: November 7, 2025
-- ================================================================

-- ================================================================
-- DROP AND RECREATE SCHEMA (Clean slate)
-- ================================================================

DROP SCHEMA IF EXISTS scheduling CASCADE;
CREATE SCHEMA scheduling;

-- Set search path
SET search_path TO scheduling, public;

-- ================================================================
-- WORKERS & ROLES
-- ================================================================

-- Worker Scheduling Configuration (extends hris.employee with scheduling-specific data)
-- NOTE: Employee core data (name, email, phone, hire_date, status, etc.) lives in hris.employee
-- This table ONLY contains scheduling-specific configuration
CREATE TABLE scheduling.worker_scheduling_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  
  -- Scheduling configuration (ONLY scheduling-specific fields)
  max_hours_per_week DECIMAL(5,2) DEFAULT 40.00,
  min_hours_per_week DECIMAL(5,2) DEFAULT 0.00,
  max_consecutive_days INTEGER DEFAULT 6,
  min_rest_hours_between_shifts INTEGER DEFAULT 11,
  
  -- Scheduling preferences
  preferred_shift_types VARCHAR(50)[],  -- Array of preferred shift types
  blocked_days INTEGER[],  -- Days of week blocked (0-6)
  scheduling_notes TEXT,
  
  -- Status (scheduling-specific, not employment status)
  is_schedulable BOOLEAN DEFAULT TRUE,
  scheduling_status VARCHAR(20) DEFAULT 'active' CHECK (scheduling_status IN ('active', 'temporary_unavailable', 'restricted')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(organization_id, employee_id)
);

CREATE INDEX idx_worker_config_organization ON scheduling.worker_scheduling_config(organization_id);
CREATE INDEX idx_worker_config_employee ON scheduling.worker_scheduling_config(employee_id);
CREATE INDEX idx_worker_config_schedulable ON scheduling.worker_scheduling_config(is_schedulable);

COMMENT ON TABLE scheduling.worker_scheduling_config IS 'Scheduling-specific configuration for employees. Core employee data is in hris.employee (single source of truth)';
COMMENT ON COLUMN scheduling.worker_scheduling_config.employee_id IS 'References hris.employee(id) - the single source of truth for employee data';

-- Roles (job positions/functions)
CREATE TABLE scheduling.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Role info
  role_code VARCHAR(50) NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- Hex color for UI display
  
  -- Requirements
  requires_certification BOOLEAN DEFAULT FALSE,
  certification_types TEXT[], -- Array of required certifications
  skill_level VARCHAR(20) CHECK (skill_level IN ('entry', 'intermediate', 'advanced', 'expert')),
  
  -- Pay rate (optional - can override worker's base rate)
  hourly_rate DECIMAL(10,2),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, role_code)
);

CREATE INDEX idx_roles_organization ON scheduling.roles(organization_id);
CREATE INDEX idx_roles_active ON scheduling.roles(is_active);

-- Worker role assignments (many-to-many)
CREATE TABLE scheduling.worker_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES scheduling.roles(id) ON DELETE CASCADE,
  
  -- Skill level for this role
  proficiency_level VARCHAR(20) CHECK (proficiency_level IN ('trainee', 'competent', 'proficient', 'expert')),
  
  -- Certifications
  certifications JSONB DEFAULT '[]', -- Array of certification objects
  certification_expiry DATE,
  
  -- Dates
  assigned_date DATE DEFAULT CURRENT_DATE,
  removed_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(employee_id, role_id, removed_date)
);

CREATE INDEX idx_worker_roles_employee ON scheduling.worker_roles(employee_id);
CREATE INDEX idx_worker_roles_role ON scheduling.worker_roles(role_id);
CREATE INDEX idx_worker_roles_organization ON scheduling.worker_roles(organization_id);

COMMENT ON COLUMN scheduling.worker_roles.employee_id IS 'References hris.employee(id) - the single source of truth';

-- ================================================================
-- STATIONS & LOCATIONS
-- ================================================================

-- Stations (work locations/areas within a facility)
CREATE TABLE scheduling.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Station info
  station_code VARCHAR(50) NOT NULL,
  station_name VARCHAR(100) NOT NULL,
  description TEXT,
  location_id UUID REFERENCES hris.location(id) ON DELETE SET NULL,
  
  -- Physical details
  floor_level VARCHAR(20),
  zone VARCHAR(50),
  capacity INTEGER, -- Max workers that can be assigned simultaneously
  
  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  requires_supervision BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, station_code)
);

CREATE INDEX idx_stations_organization ON scheduling.stations(organization_id);
CREATE INDEX idx_stations_location ON scheduling.stations(location_id);
CREATE INDEX idx_stations_active ON scheduling.stations(is_active);

-- Station role requirements (which roles can work at which stations)
CREATE TABLE scheduling.station_role_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES scheduling.stations(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES scheduling.roles(id) ON DELETE CASCADE,
  
  -- Requirements
  min_workers INTEGER DEFAULT 1,
  max_workers INTEGER,
  required_proficiency VARCHAR(20) CHECK (required_proficiency IN ('trainee', 'competent', 'proficient', 'expert')),
  
  -- Priority (for optimization algorithms)
  priority INTEGER DEFAULT 50, -- 1-100, higher = more important
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(station_id, role_id)
);

CREATE INDEX idx_station_requirements_station ON scheduling.station_role_requirements(station_id);
CREATE INDEX idx_station_requirements_role ON scheduling.station_role_requirements(role_id);

-- ================================================================
-- SCHEDULES & SHIFTS
-- ================================================================

-- Schedules (weekly/period schedules)
CREATE TABLE scheduling.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Schedule info
  schedule_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Time period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'finalized', 'archived')),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES hris.user_account(id),
  
  -- Version control
  version INTEGER DEFAULT 1,
  parent_schedule_id UUID REFERENCES scheduling.schedules(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_schedules_organization ON scheduling.schedules(organization_id);
CREATE INDEX idx_schedules_dates ON scheduling.schedules(start_date, end_date);
CREATE INDEX idx_schedules_status ON scheduling.schedules(status);

-- Shifts (individual work shifts)
CREATE TABLE scheduling.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES scheduling.schedules(id) ON DELETE CASCADE,
  
  -- Shift details
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Worker assignment
  employee_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
  role_id UUID NOT NULL REFERENCES scheduling.roles(id),
  station_id UUID REFERENCES scheduling.stations(id),
  
  -- Break time
  break_duration_minutes INTEGER DEFAULT 0,
  break_paid BOOLEAN DEFAULT TRUE,
  
  -- Shift type
  shift_type VARCHAR(20) DEFAULT 'regular' CHECK (shift_type IN ('regular', 'overtime', 'on_call', 'training')),
  
  -- Status
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  
  -- Time tracking
  actual_clock_in TIMESTAMPTZ,
  actual_clock_out TIMESTAMPTZ,
  actual_break_minutes INTEGER,
  
  -- Notes
  notes TEXT,
  cancellation_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  
  CHECK (end_time > start_time OR (end_time < start_time)) -- Allow overnight shifts
);

CREATE INDEX idx_shifts_organization ON scheduling.shifts(organization_id);
CREATE INDEX idx_shifts_schedule ON scheduling.shifts(schedule_id);
CREATE INDEX idx_shifts_employee ON scheduling.shifts(employee_id);
CREATE INDEX idx_shifts_date ON scheduling.shifts(shift_date);
CREATE INDEX idx_shifts_status ON scheduling.shifts(status);
CREATE INDEX idx_shifts_station ON scheduling.shifts(station_id);
CREATE INDEX idx_shifts_role ON scheduling.shifts(role_id);

COMMENT ON COLUMN scheduling.shifts.employee_id IS 'References hris.employee(id) - the single source of truth';

-- ================================================================
-- AVAILABILITY & PREFERENCES
-- ================================================================

-- Worker availability (when workers are available to work)
CREATE TABLE scheduling.worker_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  
  -- Availability type
  availability_type VARCHAR(20) NOT NULL CHECK (availability_type IN ('recurring', 'one_time', 'unavailable')),
  
  -- Recurring availability (e.g., "Every Monday")
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  
  -- One-time availability
  specific_date DATE,
  
  -- Time range
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Effective period
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  
  -- Priority (for scheduling optimization)
  priority VARCHAR(20) DEFAULT 'preferred' CHECK (priority IN ('required', 'preferred', 'available', 'unavailable')),
  
  -- Reason
  reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (end_time > start_time OR (end_time < start_time)), -- Allow overnight
  CHECK (
    (availability_type = 'recurring' AND day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (availability_type IN ('one_time', 'unavailable') AND specific_date IS NOT NULL AND day_of_week IS NULL)
  )
);

CREATE INDEX idx_availability_employee ON scheduling.worker_availability(employee_id);
CREATE INDEX idx_availability_organization ON scheduling.worker_availability(organization_id);
CREATE INDEX idx_availability_date ON scheduling.worker_availability(specific_date);
CREATE INDEX idx_availability_day ON scheduling.worker_availability(day_of_week);
CREATE INDEX idx_availability_type ON scheduling.worker_availability(availability_type);

COMMENT ON COLUMN scheduling.worker_availability.employee_id IS 'References hris.employee(id) - the single source of truth';

-- ================================================================
-- TIME OFF REQUESTS
-- ================================================================

-- Time off requests (managed in ScheduleHub, different from Nexus time-off)
CREATE TABLE scheduling.time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  
  -- Request details
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('vacation', 'sick', 'personal', 'unpaid', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Time details
  is_full_day BOOLEAN DEFAULT TRUE,
  start_time TIME,
  end_time TIME,
  total_days DECIMAL(5,2), -- Can be fractional for partial days
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled', 'expired')),
  
  -- Approval
  reviewed_by UUID REFERENCES hris.user_account(id),
  reviewed_at TIMESTAMPTZ,
  denial_reason TEXT,
  
  -- Notes
  reason TEXT,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_time_off_employee ON scheduling.time_off_requests(employee_id);
CREATE INDEX idx_time_off_organization ON scheduling.time_off_requests(organization_id);
CREATE INDEX idx_time_off_dates ON scheduling.time_off_requests(start_date, end_date);
CREATE INDEX idx_time_off_status ON scheduling.time_off_requests(status);

COMMENT ON COLUMN scheduling.time_off_requests.employee_id IS 'References hris.employee(id) - the single source of truth';

-- ================================================================
-- SHIFT SWAPPING & MARKETPLACE
-- ================================================================

-- Shift swap offers (workers offering their shifts to others)
CREATE TABLE scheduling.shift_swap_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Original shift
  shift_id UUID NOT NULL REFERENCES scheduling.shifts(id) ON DELETE CASCADE,
  offering_employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  
  -- Swap details
  swap_type VARCHAR(20) DEFAULT 'direct' CHECK (swap_type IN ('direct', 'open', 'trade')),
  target_employee_id UUID REFERENCES hris.employee(id), -- For direct swaps
  
  -- Status
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'pending_approval', 'approved', 'completed', 'cancelled', 'expired')),
  
  -- Approval
  requires_approval BOOLEAN DEFAULT TRUE,
  approved_by UUID REFERENCES hris.user_account(id),
  approved_at TIMESTAMPTZ,
  denial_reason TEXT,
  
  -- Expiry
  expires_at TIMESTAMPTZ,
  
  -- Notes
  reason TEXT,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_swap_offers_shift ON scheduling.shift_swap_offers(shift_id);
CREATE INDEX idx_swap_offers_offering_employee ON scheduling.shift_swap_offers(offering_employee_id);
CREATE INDEX idx_swap_offers_target_employee ON scheduling.shift_swap_offers(target_employee_id);
CREATE INDEX idx_swap_offers_status ON scheduling.shift_swap_offers(status);
CREATE INDEX idx_swap_offers_organization ON scheduling.shift_swap_offers(organization_id);

COMMENT ON COLUMN scheduling.shift_swap_offers.offering_employee_id IS 'References hris.employee(id) - the single source of truth';
COMMENT ON COLUMN scheduling.shift_swap_offers.target_employee_id IS 'References hris.employee(id) - the single source of truth';

-- Shift swap requests (workers requesting to take someone's shift)
CREATE TABLE scheduling.shift_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  swap_offer_id UUID NOT NULL REFERENCES scheduling.shift_swap_offers(id) ON DELETE CASCADE,
  
  -- Requesting worker
  requesting_employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  
  -- Response
  responded_at TIMESTAMPTZ,
  response_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_swap_requests_offer ON scheduling.shift_swap_requests(swap_offer_id);
CREATE INDEX idx_swap_requests_employee ON scheduling.shift_swap_requests(requesting_employee_id);
CREATE INDEX idx_swap_requests_status ON scheduling.shift_swap_requests(status);

COMMENT ON COLUMN scheduling.shift_swap_requests.requesting_employee_id IS 'References hris.employee(id) - the single source of truth';

-- Swap credits (gamification for shift swapping)
CREATE TABLE scheduling.swap_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  
  -- Credit balance
  credits INTEGER DEFAULT 0,
  
  -- Transaction details
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'penalty', 'adjustment')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  -- Reference
  shift_swap_offer_id UUID REFERENCES scheduling.shift_swap_offers(id),
  reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id)
);

CREATE INDEX idx_swap_credits_employee ON scheduling.swap_credits(employee_id);
CREATE INDEX idx_swap_credits_organization ON scheduling.swap_credits(organization_id);
CREATE INDEX idx_swap_credits_created ON scheduling.swap_credits(created_at);

COMMENT ON COLUMN scheduling.swap_credits.employee_id IS 'References hris.employee(id) - the single source of truth';

-- ================================================================
-- SCHEDULE OPTIMIZATION & ANALYTICS
-- ================================================================

-- Coverage requirements (how many workers needed per time slot)
CREATE TABLE scheduling.coverage_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Location
  location_id UUID, -- References hris.location(id)
  station_id UUID REFERENCES scheduling.stations(id),
  
  -- Time period
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Requirements
  role_id UUID REFERENCES scheduling.roles(id),
  min_workers INTEGER NOT NULL DEFAULT 1,
  optimal_workers INTEGER,
  max_workers INTEGER,
  
  -- Effective period
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  
  -- Priority
  priority INTEGER DEFAULT 50, -- 1-100
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (end_time > start_time OR (end_time < start_time))
);

CREATE INDEX idx_coverage_organization ON scheduling.coverage_requirements(organization_id);
CREATE INDEX idx_coverage_location ON scheduling.coverage_requirements(location_id);
CREATE INDEX idx_coverage_station ON scheduling.coverage_requirements(station_id);
CREATE INDEX idx_coverage_role ON scheduling.coverage_requirements(role_id);
CREATE INDEX idx_coverage_day ON scheduling.coverage_requirements(day_of_week);

-- Demand forecasting (historical data for predictive scheduling)
CREATE TABLE scheduling.demand_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Period
  date DATE NOT NULL,
  hour INTEGER CHECK (hour BETWEEN 0 AND 23),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  
  -- Location
  location_id UUID, -- References hris.location(id)
  department_id UUID, -- References hris.department(id)
  
  -- Metrics
  customer_count INTEGER,
  transaction_count INTEGER,
  revenue DECIMAL(12,2),
  labor_hours DECIMAL(8,2),
  workers_scheduled INTEGER,
  workers_present INTEGER,
  
  -- Calculated metrics
  labor_cost DECIMAL(12,2),
  revenue_per_labor_hour DECIMAL(10,2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_demand_history_organization ON scheduling.demand_history(organization_id);
CREATE INDEX idx_demand_history_date ON scheduling.demand_history(date);
CREATE INDEX idx_demand_history_location ON scheduling.demand_history(location_id);
CREATE INDEX idx_demand_history_department ON scheduling.demand_history(department_id);

-- Demand forecasts (AI/ML generated predictions)
CREATE TABLE scheduling.demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Forecast period
  forecast_date DATE NOT NULL,
  hour INTEGER CHECK (hour BETWEEN 0 AND 23),
  
  -- Location
  location_id UUID, -- References hris.location(id)
  department_id UUID, -- References hris.department(id)
  
  -- Predictions
  predicted_customer_count INTEGER,
  predicted_transaction_count INTEGER,
  predicted_revenue DECIMAL(12,2),
  recommended_workers INTEGER,
  confidence_level DECIMAL(5,4), -- 0.0000 to 1.0000
  
  -- Model info
  model_version VARCHAR(50),
  algorithm VARCHAR(50),
  
  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES hris.user_account(id)
);

CREATE INDEX idx_forecasts_organization ON scheduling.demand_forecasts(organization_id);
CREATE INDEX idx_forecasts_date ON scheduling.demand_forecasts(forecast_date);
CREATE INDEX idx_forecasts_location ON scheduling.demand_forecasts(location_id);

-- Optimization runs (track schedule optimization attempts)
CREATE TABLE scheduling.optimization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES scheduling.schedules(id) ON DELETE CASCADE,
  
  -- Optimization details
  algorithm VARCHAR(50) NOT NULL,
  objective VARCHAR(50) NOT NULL CHECK (objective IN ('minimize_cost', 'maximize_coverage', 'balance_workload', 'fairness')),
  
  -- Results
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  success BOOLEAN,
  execution_time_ms INTEGER,
  
  -- Metrics
  initial_cost DECIMAL(12,2),
  optimized_cost DECIMAL(12,2),
  cost_savings DECIMAL(12,2),
  coverage_score DECIMAL(5,2), -- 0-100
  fairness_score DECIMAL(5,2), -- 0-100
  
  -- Parameters
  parameters JSONB,
  constraints JSONB,
  
  -- Error info
  error_message TEXT,
  
  -- Metadata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  triggered_by UUID REFERENCES hris.user_account(id)
);

CREATE INDEX idx_optimization_organization ON scheduling.optimization_history(organization_id);
CREATE INDEX idx_optimization_schedule ON scheduling.optimization_history(schedule_id);
CREATE INDEX idx_optimization_status ON scheduling.optimization_history(status);
CREATE INDEX idx_optimization_started ON scheduling.optimization_history(started_at);

-- ================================================================
-- SERVICE LEVEL TARGETS
-- ================================================================

-- Service level agreements (SLAs) for staffing levels
CREATE TABLE scheduling.service_level_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Target details
  target_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Scope
  location_id UUID, -- References hris.location(id)
  department_id UUID, -- References hris.department(id)
  
  -- Metrics
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('coverage_percentage', 'response_time', 'wait_time', 'customer_satisfaction')),
  target_value DECIMAL(10,2) NOT NULL,
  min_acceptable_value DECIMAL(10,2),
  
  -- Time period
  applies_to_day_of_week INTEGER[], -- Array of days (0-6)
  applies_to_time_range TSRANGE, -- Time range
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id)
);

CREATE INDEX idx_sla_targets_organization ON scheduling.service_level_targets(organization_id);
CREATE INDEX idx_sla_targets_location ON scheduling.service_level_targets(location_id);
CREATE INDEX idx_sla_targets_department ON scheduling.service_level_targets(department_id);
CREATE INDEX idx_sla_targets_active ON scheduling.service_level_targets(is_active);

-- ================================================================
-- TRIGGERS FOR UPDATED_AT
-- ================================================================

CREATE OR REPLACE FUNCTION scheduling.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all relevant tables
-- Note: scheduling.workers table removed - using hris.employee directly

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON scheduling.roles
  FOR EACH ROW EXECUTE FUNCTION scheduling.update_updated_at_column();

CREATE TRIGGER update_worker_roles_updated_at BEFORE UPDATE ON scheduling.worker_roles
  FOR EACH ROW EXECUTE FUNCTION scheduling.update_updated_at_column();

CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON scheduling.stations
  FOR EACH ROW EXECUTE FUNCTION scheduling.update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON scheduling.schedules
  FOR EACH ROW EXECUTE FUNCTION scheduling.update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON scheduling.shifts
  FOR EACH ROW EXECUTE FUNCTION scheduling.update_updated_at_column();

CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON scheduling.worker_availability
  FOR EACH ROW EXECUTE FUNCTION scheduling.update_updated_at_column();

CREATE TRIGGER update_time_off_updated_at BEFORE UPDATE ON scheduling.time_off_requests
  FOR EACH ROW EXECUTE FUNCTION scheduling.update_updated_at_column();

CREATE TRIGGER update_swap_offers_updated_at BEFORE UPDATE ON scheduling.shift_swap_offers
  FOR EACH ROW EXECUTE FUNCTION scheduling.update_updated_at_column();

CREATE TRIGGER update_swap_requests_updated_at BEFORE UPDATE ON scheduling.shift_swap_requests
  FOR EACH ROW EXECUTE FUNCTION scheduling.update_updated_at_column();

CREATE TRIGGER update_coverage_updated_at BEFORE UPDATE ON scheduling.coverage_requirements
  FOR EACH ROW EXECUTE FUNCTION scheduling.update_updated_at_column();

CREATE TRIGGER update_sla_targets_updated_at BEFORE UPDATE ON scheduling.service_level_targets
  FOR EACH ROW EXECUTE FUNCTION scheduling.update_updated_at_column();

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON SCHEMA scheduling IS 'ScheduleHub workforce scheduling and optimization - References hris.employee as single source of truth';
COMMENT ON TABLE scheduling.worker_scheduling_config IS 'Scheduling-specific configuration for employees - Core employee data in hris.employee';
COMMENT ON TABLE scheduling.roles IS 'Job roles/positions for shift assignments';
COMMENT ON TABLE scheduling.worker_roles IS 'Many-to-many relationship between employees and scheduling roles';
COMMENT ON TABLE scheduling.stations IS 'Physical work locations/areas within facilities';
COMMENT ON TABLE scheduling.station_role_requirements IS 'Required roles and headcount per station';
COMMENT ON TABLE scheduling.schedules IS 'Weekly or period-based work schedules';
COMMENT ON TABLE scheduling.shifts IS 'Individual work shifts with employee assignments';
COMMENT ON TABLE scheduling.worker_availability IS 'Employee availability for scheduling';
COMMENT ON TABLE scheduling.time_off_requests IS 'Time off requests specific to scheduling (separate from Nexus HRIS time-off)';
COMMENT ON TABLE scheduling.shift_swap_offers IS 'Employees offering their shifts for swap';
COMMENT ON TABLE scheduling.shift_swap_requests IS 'Requests to take offered shifts';
COMMENT ON TABLE scheduling.swap_credits IS 'Gamification credits for shift swapping';
COMMENT ON TABLE scheduling.coverage_requirements IS 'Staffing requirements per time slot';
COMMENT ON TABLE scheduling.demand_history IS 'Historical demand data for forecasting';
COMMENT ON TABLE scheduling.demand_forecasts IS 'AI-generated demand predictions';
COMMENT ON TABLE scheduling.optimization_history IS 'Track schedule optimization runs';
COMMENT ON TABLE scheduling.service_level_targets IS 'SLA targets for staffing levels';

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA scheduling TO PUBLIC;

-- Grant select on all tables (read access)
GRANT SELECT ON ALL TABLES IN SCHEMA scheduling TO PUBLIC;

-- Application role will need full access
-- GRANT ALL ON ALL TABLES IN SCHEMA scheduling TO app_role;

-- ================================================================
-- END OF SCHEMA
-- ================================================================
