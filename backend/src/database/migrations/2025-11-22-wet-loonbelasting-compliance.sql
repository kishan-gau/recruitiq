-- =====================================================================
-- Wet Loonbelasting (Suriname Wage Tax Law) Compliance Migration
-- =====================================================================
-- Date: November 22, 2025
-- Version: 1.0
-- Purpose: Implement database schema changes for Surinamese wage tax compliance
--
-- Legal References:
--   - Article 13.1a: Tax-free allowance (resident vs non-resident)
--   - Article 13.3: Loontijdvak (wage period) definitions
--   - Article 17: Bijzondere beloning (special bonus taxation)
--   - Article 17c: Overtime special tax rates
--
-- Notes:
--   - No data migration needed (dev environment only)
--   - No backwards compatibility required
--   - All changes are additive (no drops)
-- =====================================================================

BEGIN;

-- =====================================================================
-- SECTION 1: Employee Record Updates (Resident Status & Overtime)
-- =====================================================================

-- Add Suriname residency status (Article 13.1a)
-- Residents get tax-free allowance of SRD 108,000/year
-- Non-residents do NOT get tax-free allowance
ALTER TABLE hris.employee_record
ADD COLUMN IF NOT EXISTS is_suriname_resident BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS residence_start_date DATE,
ADD COLUMN IF NOT EXISTS residence_notes TEXT;

COMMENT ON COLUMN hris.employee_record.is_suriname_resident IS 
  'Suriname tax residency status per Article 13.1a. TRUE = entitled to tax-free allowance (SRD 108,000/year), FALSE = no allowance.';

COMMENT ON COLUMN hris.employee_record.residence_start_date IS 
  'Date when Suriname tax residency status became effective. Used for mid-year changes.';

COMMENT ON COLUMN hris.employee_record.residence_notes IS 
  'Additional notes about residency status (e.g., work permit details, tax treaty application).';

-- Add overtime tax opt-in (Article 17c)
-- Employees can opt to use special overtime rates: 5%, 15%, 25%
-- Opt-in must be voluntary
ALTER TABLE hris.employee_record
ADD COLUMN IF NOT EXISTS overtime_tax_opt_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS overtime_opt_in_date DATE,
ADD COLUMN IF NOT EXISTS overtime_opt_in_by UUID REFERENCES hris.user_account(id);

COMMENT ON COLUMN hris.employee_record.overtime_tax_opt_in IS 
  'Employee opted into Article 17c special overtime tax rates (5%/15%/25%). Must be voluntary.';

COMMENT ON COLUMN hris.employee_record.overtime_opt_in_date IS 
  'Date when employee opted into overtime special tax treatment.';

COMMENT ON COLUMN hris.employee_record.overtime_opt_in_by IS 
  'User (employee or HR admin) who processed the opt-in. Audit trail.';

-- Create indexes for new employee fields
CREATE INDEX IF NOT EXISTS idx_employee_record_resident_status 
  ON hris.employee_record(organization_id, is_suriname_resident) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employee_record_overtime_optin 
  ON hris.employee_record(organization_id, overtime_tax_opt_in) 
  WHERE deleted_at IS NULL AND overtime_tax_opt_in = true;

-- =====================================================================
-- SECTION 2: Paycheck Updates (Bonus & Loontijdvak Tracking)
-- =====================================================================

-- Add bonus tracking fields (Article 17)
-- Bijzondere beloning = bonuses taxed over multiple loontijdvakken
ALTER TABLE payroll.paycheck
ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS bonus_loontijdvakken_covered INTEGER,
ADD COLUMN IF NOT EXISTS bonus_tax_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS bonus_regular_income_periods JSONB;

COMMENT ON COLUMN payroll.paycheck.bonus_amount IS 
  'Total bonus amount in this paycheck. Separate from regular wages for Article 17 calculation.';

COMMENT ON COLUMN payroll.paycheck.bonus_type IS 
  'Type of bonus: annual, quarterly, monthly, performance, commission, etc. Used for tax classification.';

COMMENT ON COLUMN payroll.paycheck.bonus_loontijdvakken_covered IS 
  'Number of loontijdvakken (wage periods) this bonus covers per Article 17. E.g., quarterly = 3, annual = 12.';

COMMENT ON COLUMN payroll.paycheck.bonus_tax_method IS 
  'Tax calculation method used: bijzondere_beloning (Article 17) or regular_rate. Tracks compliance.';

COMMENT ON COLUMN payroll.paycheck.bonus_regular_income_periods IS 
  'JSON array of regular income for covered periods. Used in Article 17 calculation: [{period: "2025-01", income: 5000}, ...]';

-- Add loontijdvak tracking fields (Article 13.3)
-- Tracks the wage period type for correct tax proration
ALTER TABLE payroll.paycheck
ADD COLUMN IF NOT EXISTS loontijdvak_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS loontijdvak_periods_covered NUMERIC(10,4) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS loontijdvak_days NUMERIC(10,4);

COMMENT ON COLUMN payroll.paycheck.loontijdvak_type IS 
  'Wage period type per Article 13.3: yearly, monthly, weekly, daily. Determines tax proration basis.';

COMMENT ON COLUMN payroll.paycheck.loontijdvak_periods_covered IS 
  'Number of loontijdvakken covered by this paycheck. Usually 1.0 for regular pay, may be fractional for partial periods.';

COMMENT ON COLUMN payroll.paycheck.loontijdvak_days IS 
  'Number of days in this loontijdvak per Article 13.3: yearly=364, monthly=30.33, weekly=7, daily=1.';

-- Add constraint to ensure loontijdvak_type matches valid values
ALTER TABLE payroll.paycheck
ADD CONSTRAINT check_loontijdvak_type 
  CHECK (loontijdvak_type IS NULL OR loontijdvak_type IN ('yearly', 'monthly', 'weekly', 'daily'));

-- Create indexes for bonus and loontijdvak queries
CREATE INDEX IF NOT EXISTS idx_paycheck_bonus_type 
  ON payroll.paycheck(organization_id, bonus_type) 
  WHERE deleted_at IS NULL AND bonus_amount > 0;

CREATE INDEX IF NOT EXISTS idx_paycheck_loontijdvak 
  ON payroll.paycheck(organization_id, loontijdvak_type, pay_date) 
  WHERE deleted_at IS NULL;

-- =====================================================================
-- SECTION 3: Pay Frequency Enum Update (Article 13.3)
-- =====================================================================

-- Check if pay_frequency column exists and what type it is
DO $$
BEGIN
  -- Add 'yearly' and 'daily' to pay_frequency enum if not already present
  -- Note: This assumes pay_frequency is stored as VARCHAR, not enum type
  -- If using CHECK constraint, we'll update it
  
  -- For payroll.paycheck table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'payroll' 
      AND table_name = 'paycheck' 
      AND column_name = 'pay_frequency'
  ) THEN
    -- Drop existing constraint if it exists
    ALTER TABLE payroll.paycheck 
    DROP CONSTRAINT IF EXISTS check_pay_frequency;
    
    -- Add updated constraint with yearly and daily
    ALTER TABLE payroll.paycheck
    ADD CONSTRAINT check_pay_frequency 
      CHECK (pay_frequency IN ('yearly', 'monthly', 'bi_weekly', 'weekly', 'semi_monthly', 'daily'));
  END IF;
  
  -- For payroll.pay_schedule table if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'payroll' 
      AND table_name = 'pay_schedule' 
      AND column_name = 'pay_frequency'
  ) THEN
    ALTER TABLE payroll.pay_schedule 
    DROP CONSTRAINT IF EXISTS check_pay_schedule_frequency;
    
    ALTER TABLE payroll.pay_schedule
    ADD CONSTRAINT check_pay_schedule_frequency 
      CHECK (pay_frequency IN ('yearly', 'monthly', 'bi_weekly', 'weekly', 'semi_monthly', 'daily'));
  END IF;
  
  -- For payroll.pay_structure_template table if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'payroll' 
      AND table_name = 'pay_structure_template' 
      AND column_name = 'pay_frequency'
  ) THEN
    ALTER TABLE payroll.pay_structure_template 
    DROP CONSTRAINT IF EXISTS check_template_frequency;
    
    ALTER TABLE payroll.pay_structure_template
    ADD CONSTRAINT check_template_frequency 
      CHECK (pay_frequency IN ('yearly', 'monthly', 'bi_weekly', 'weekly', 'semi_monthly', 'daily'));
  END IF;
END $$;

-- =====================================================================
-- SECTION 4: Data Dictionary & Compliance Documentation
-- =====================================================================

-- Create a compliance reference table for audit purposes
CREATE TABLE IF NOT EXISTS payroll.wage_tax_compliance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Event tracking
  event_type VARCHAR(50) NOT NULL, -- 'resident_status_change', 'overtime_optin', 'bonus_calculated', etc.
  event_date DATE NOT NULL,
  employee_id UUID REFERENCES hris.employee(id),
  paycheck_id UUID REFERENCES payroll.paycheck(id),
  
  -- Compliance details
  legal_article VARCHAR(50), -- 'Article 13.1a', 'Article 17', 'Article 17c', etc.
  calculation_method VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id),
  notes TEXT,
  
  CONSTRAINT check_event_type CHECK (event_type IN (
    'resident_status_change',
    'overtime_optin',
    'overtime_optout',
    'bonus_calculated',
    'loontijdvak_updated',
    'tax_free_allowance_applied',
    'special_rate_applied'
  ))
);

COMMENT ON TABLE payroll.wage_tax_compliance_log IS 
  'Audit log for Wet Loonbelasting compliance events. Tracks residency changes, opt-ins, special calculations.';

CREATE INDEX IF NOT EXISTS idx_compliance_log_org_date 
  ON payroll.wage_tax_compliance_log(organization_id, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_log_employee 
  ON payroll.wage_tax_compliance_log(employee_id, event_date DESC) 
  WHERE employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_log_article 
  ON payroll.wage_tax_compliance_log(organization_id, legal_article) 
  WHERE legal_article IS NOT NULL;

-- =====================================================================
-- SECTION 5: Default Values for Existing Records (Dev Environment)
-- =====================================================================

-- Set default resident status for existing employees
-- Assumption: All existing employees are Suriname residents
UPDATE hris.employee_record
SET is_suriname_resident = true,
    residence_start_date = COALESCE(start_date, created_at::DATE)
WHERE is_suriname_resident IS NULL
  AND deleted_at IS NULL;

-- Set default overtime opt-in to false for existing employees
UPDATE hris.employee_record
SET overtime_tax_opt_in = false
WHERE overtime_tax_opt_in IS NULL
  AND deleted_at IS NULL;

-- =====================================================================
-- SECTION 6: Validation & Statistics
-- =====================================================================

-- Create a view for quick compliance statistics
CREATE OR REPLACE VIEW payroll.wet_loonbelasting_stats AS
SELECT 
  er.organization_id,
  COUNT(*) as total_employees,
  COUNT(*) FILTER (WHERE er.is_suriname_resident = true) as resident_employees,
  COUNT(*) FILTER (WHERE er.is_suriname_resident = false) as non_resident_employees,
  COUNT(*) FILTER (WHERE er.overtime_tax_opt_in = true) as overtime_optin_employees,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.bonus_amount > 0) as paychecks_with_bonus,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.loontijdvak_type IS NOT NULL) as paychecks_with_loontijdvak
FROM hris.employee_record er
LEFT JOIN payroll.paycheck pc ON pc.employee_id = er.employee_id 
  AND pc.deleted_at IS NULL
WHERE er.deleted_at IS NULL
GROUP BY er.organization_id;

COMMENT ON VIEW payroll.wet_loonbelasting_stats IS 
  'Quick statistics for Wet Loonbelasting compliance monitoring. Shows resident count, overtime opt-ins, bonus usage.';

-- =====================================================================
-- SECTION 7: Migration Validation
-- =====================================================================

DO $$
DECLARE
  employee_resident_count INTEGER;
  paycheck_columns_count INTEGER;
BEGIN
  -- Validate employee_record changes
  SELECT COUNT(*) INTO employee_resident_count
  FROM information_schema.columns
  WHERE table_schema = 'hris'
    AND table_name = 'employee_record'
    AND column_name IN ('is_suriname_resident', 'overtime_tax_opt_in');
  
  IF employee_resident_count < 2 THEN
    RAISE EXCEPTION 'Migration failed: employee_record columns not created';
  END IF;
  
  -- Validate paycheck changes
  SELECT COUNT(*) INTO paycheck_columns_count
  FROM information_schema.columns
  WHERE table_schema = 'payroll'
    AND table_name = 'paycheck'
    AND column_name IN ('bonus_amount', 'loontijdvak_type');
  
  IF paycheck_columns_count < 2 THEN
    RAISE EXCEPTION 'Migration failed: paycheck columns not created';
  END IF;
  
  RAISE NOTICE 'Migration validation passed: % employee columns, % paycheck columns', 
    employee_resident_count, paycheck_columns_count;
END $$;

COMMIT;

-- =====================================================================
-- Migration Complete
-- =====================================================================

-- Summary of changes:
-- ✅ Added is_suriname_resident, residence_start_date to employee_record (Article 13.1a)
-- ✅ Added overtime_tax_opt_in, overtime_opt_in_date to employee_record (Article 17c)
-- ✅ Added bonus tracking fields to paycheck (Article 17)
-- ✅ Added loontijdvak tracking fields to paycheck (Article 13.3)
-- ✅ Updated pay_frequency constraints to include 'yearly' and 'daily'
-- ✅ Created wage_tax_compliance_log table for audit trail
-- ✅ Created wet_loonbelasting_stats view for monitoring
-- ✅ Added appropriate indexes for query performance
-- ✅ Set default values for existing records
-- ✅ Validated migration success

-- Next Steps:
-- 1. Run this migration: psql -U postgres -d recruitiq_dev -f 2025-11-22-wet-loonbelasting-compliance.sql
-- 2. Verify with: SELECT * FROM payroll.wet_loonbelasting_stats;
-- 3. Proceed to Phase 2: LoontijdvakService implementation
