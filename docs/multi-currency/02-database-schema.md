# Multi-Currency Database Schema Changes

**Version:** 2.0  
**Date:** November 13, 2025  
**Dependencies:** Existing PayLinQ schema (paylinq-schema.sql)

---

## Overview

This document specifies all database schema changes required to support multi-currency payroll operations while maintaining backward compatibility with the existing single-currency system.

---

## Design Principles

1. **Backward Compatibility:** Existing tables extended, not replaced
2. **Minimal Disruption:** New columns with sensible defaults
3. **Audit Trail:** Every conversion logged immutably
4. **Performance:** Indexed for fast temporal queries
5. **Data Integrity:** Foreign keys and constraints enforce validity

---

## New Tables

### 1. Exchange Rate Master Table

```sql
-- Exchange rate master table (central rate management)
CREATE TABLE payroll.exchange_rate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Currency pair
  from_currency VARCHAR(3) NOT NULL,  -- ISO 4217 (USD, EUR, SRD)
  to_currency VARCHAR(3) NOT NULL,
  
  -- Rate details
  rate NUMERIC(12, 6) NOT NULL,  -- 6 decimals for precision (e.g., 17.850000)
  inverse_rate NUMERIC(12, 6),   -- Cached for performance (1/rate)
  
  -- Rate metadata
  rate_type VARCHAR(20) DEFAULT 'manual' 
    CHECK (rate_type IN ('market', 'fixed', 'manual', 'average')),
  rate_source VARCHAR(50),  -- 'ECB', 'CBSuriname', 'manual', 'Bloomberg', etc.
  
  -- Effective period
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  
  -- Constraints
  CONSTRAINT valid_rate CHECK (rate > 0),
  CONSTRAINT valid_inverse_rate CHECK (inverse_rate IS NULL OR inverse_rate > 0),
  CONSTRAINT valid_currencies CHECK (from_currency != to_currency),
  CONSTRAINT valid_period CHECK (effective_to IS NULL OR effective_to > effective_from),
  
  -- Unique constraint: One rate per currency pair per effective date
  UNIQUE(organization_id, from_currency, to_currency, effective_from)
);

-- Indexes for performance
CREATE INDEX idx_exchange_rate_org 
  ON payroll.exchange_rate(organization_id) 
  WHERE is_active = true;

CREATE INDEX idx_exchange_rate_pair 
  ON payroll.exchange_rate(from_currency, to_currency) 
  WHERE is_active = true;

CREATE INDEX idx_exchange_rate_effective 
  ON payroll.exchange_rate(organization_id, effective_from DESC, effective_to) 
  WHERE is_active = true;

-- Composite index for temporal queries (most common query pattern)
CREATE INDEX idx_exchange_rate_temporal 
  ON payroll.exchange_rate(organization_id, from_currency, to_currency, effective_from DESC) 
  WHERE is_active = true;

COMMENT ON TABLE payroll.exchange_rate IS 
  'Central exchange rate management with temporal validity. Supports manual entry and automatic updates from external sources.';

COMMENT ON COLUMN payroll.exchange_rate.rate IS 
  'Exchange rate from_currency → to_currency. Example: USD → SRD rate of 17.85 means 1 USD = 17.85 SRD';

COMMENT ON COLUMN payroll.exchange_rate.inverse_rate IS 
  'Cached inverse rate (1/rate) for reverse conversion performance. Auto-calculated on insert/update.';
```

### 2. Currency Conversion Audit Log

```sql
-- Currency conversion audit log (immutable record of all conversions)
CREATE TABLE payroll.currency_conversion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Source transaction reference
  source_table VARCHAR(50) NOT NULL,  -- 'paycheck', 'payroll_run_component', etc.
  source_id UUID NOT NULL,
  
  -- Conversion details
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  from_amount NUMERIC(12, 2) NOT NULL,
  to_amount NUMERIC(12, 2) NOT NULL,
  
  -- Rate used for this conversion
  exchange_rate_id UUID REFERENCES payroll.exchange_rate(id),
  rate_used NUMERIC(12, 6) NOT NULL,
  rate_timestamp TIMESTAMPTZ NOT NULL,  -- When rate was valid
  
  -- Conversion metadata
  conversion_method VARCHAR(20) DEFAULT 'automatic' 
    CHECK (conversion_method IN ('automatic', 'manual', 'override')),
  rounding_method VARCHAR(20) DEFAULT 'standard' 
    CHECK (rounding_method IN ('standard', 'up', 'down', 'bankers')),
  
  -- Context
  payroll_run_id UUID REFERENCES payroll.payroll_run(id),
  employee_id UUID REFERENCES hris.employee(id),
  conversion_date DATE NOT NULL,
  
  -- Additional metadata (for audit trail)
  conversion_notes TEXT,
  
  -- Audit (immutable - no update_at, no soft delete)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id),
  
  CONSTRAINT valid_amounts CHECK (from_amount > 0 AND to_amount > 0)
);

-- Indexes for audit queries
CREATE INDEX idx_currency_conversion_org 
  ON payroll.currency_conversion(organization_id, conversion_date DESC);

CREATE INDEX idx_currency_conversion_source 
  ON payroll.currency_conversion(source_table, source_id);

CREATE INDEX idx_currency_conversion_payroll 
  ON payroll.currency_conversion(payroll_run_id) 
  WHERE payroll_run_id IS NOT NULL;

CREATE INDEX idx_currency_conversion_employee 
  ON payroll.currency_conversion(employee_id, conversion_date DESC) 
  WHERE employee_id IS NOT NULL;

CREATE INDEX idx_currency_conversion_rate 
  ON payroll.currency_conversion(exchange_rate_id) 
  WHERE exchange_rate_id IS NOT NULL;

COMMENT ON TABLE payroll.currency_conversion IS 
  'Immutable audit log of all currency conversions. Provides full traceability for SOX/SOC 2 compliance.';

COMMENT ON COLUMN payroll.currency_conversion.source_table IS 
  'Table where the converted amount is stored (e.g., paycheck, payroll_run_component)';

COMMENT ON COLUMN payroll.currency_conversion.rate_timestamp IS 
  'Timestamp when the exchange rate was valid (for point-in-time accuracy)';
```

### 3. Organization Currency Configuration

```sql
-- Organization currency configuration (per-org currency settings)
CREATE TABLE payroll.organization_currency_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Base currencies
  base_currency VARCHAR(3) NOT NULL DEFAULT 'SRD',
  reporting_currency VARCHAR(3),  -- For financial reporting (can differ from base)
  
  -- Supported currencies
  supported_currencies VARCHAR(3)[] NOT NULL DEFAULT ARRAY['SRD'],
  
  -- Exchange rate settings
  auto_update_rates BOOLEAN DEFAULT false,
  rate_provider VARCHAR(50),  -- 'ECB', 'CBSuriname', 'Bloomberg', etc.
  rate_update_frequency VARCHAR(20) DEFAULT 'manual',  -- 'daily', 'weekly', 'manual'
  last_rate_update TIMESTAMPTZ,
  
  -- Conversion rules
  default_rounding_method VARCHAR(20) DEFAULT 'standard',
  conversion_tolerance NUMERIC(5, 4) DEFAULT 0.0001,  -- Acceptable variance (0.01%)
  
  -- Approval workflow
  require_conversion_approval BOOLEAN DEFAULT false,
  approval_threshold_amount NUMERIC(12, 2),  -- Require approval for conversions above this amount
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(organization_id)
);

CREATE INDEX idx_org_currency_config 
  ON payroll.organization_currency_config(organization_id);

COMMENT ON TABLE payroll.organization_currency_config IS 
  'Organization-wide currency configuration and preferences.';

COMMENT ON COLUMN payroll.organization_currency_config.supported_currencies IS 
  'Array of ISO 4217 currency codes supported by this organization.';

COMMENT ON COLUMN payroll.organization_currency_config.conversion_tolerance IS 
  'Acceptable variance in conversion calculations (for rounding differences).';
```

### 4. Exchange Rate Audit Log

```sql
-- Exchange rate change audit (track all rate modifications)
CREATE TABLE payroll.exchange_rate_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_rate_id UUID NOT NULL REFERENCES payroll.exchange_rate(id),
  
  -- Change details
  old_rate NUMERIC(12, 6),
  new_rate NUMERIC(12, 6),
  rate_change_percentage NUMERIC(5, 2),  -- Calculated: ((new - old) / old) * 100
  
  -- Change metadata
  change_reason TEXT,
  change_type VARCHAR(20) CHECK (change_type IN ('manual_update', 'auto_update', 'correction', 'initial')),
  
  -- Audit
  changed_by UUID REFERENCES hris.user_account(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exchange_rate_audit_rate 
  ON payroll.exchange_rate_audit(exchange_rate_id, changed_at DESC);

CREATE INDEX idx_exchange_rate_audit_date 
  ON payroll.exchange_rate_audit(changed_at DESC);

COMMENT ON TABLE payroll.exchange_rate_audit IS 
  'Audit trail of all exchange rate changes for compliance and analysis.';
```

---

## Modified Tables (Existing Tables - Add Currency Support)

### 1. Paycheck Table Enhancements

```sql
-- Add multi-currency tracking to paycheck
ALTER TABLE payroll.paycheck
  ADD COLUMN base_currency VARCHAR(3) DEFAULT 'SRD',
  ADD COLUMN payment_currency VARCHAR(3),
  ADD COLUMN currency_conversion_summary JSONB,
  ADD COLUMN total_conversions INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN payroll.paycheck.base_currency IS 
  'Primary currency for paycheck calculations (usually from employee payroll config)';

COMMENT ON COLUMN payroll.paycheck.payment_currency IS 
  'Currency for actual payment (may differ from base if employee receives in different currency)';

COMMENT ON COLUMN payroll.paycheck.currency_conversion_summary IS 
  'Summary of all currency conversions in this paycheck: {"USD": {"earnings": 500, "converted": 8925}, "EUR": {"earnings": 200, "converted": 3840}}';

COMMENT ON COLUMN payroll.paycheck.total_conversions IS 
  'Count of currency conversions performed for this paycheck';

-- Add index for currency queries
CREATE INDEX idx_paycheck_currencies 
  ON payroll.paycheck(organization_id, base_currency, payment_currency) 
  WHERE payment_currency IS NOT NULL AND payment_currency != base_currency;
```

### 2. Payroll Run Component Enhancements

```sql
-- Add multi-currency tracking to payroll run components
ALTER TABLE payroll.payroll_run_component
  ADD COLUMN component_currency VARCHAR(3) NOT NULL DEFAULT 'SRD',
  ADD COLUMN component_amount_original NUMERIC(12, 2),
  ADD COLUMN paycheck_currency VARCHAR(3) NOT NULL DEFAULT 'SRD',
  ADD COLUMN amount_converted NUMERIC(12, 2),
  ADD COLUMN exchange_rate_used NUMERIC(12, 6),
  ADD COLUMN conversion_id UUID REFERENCES payroll.currency_conversion(id);

-- Add comments
COMMENT ON COLUMN payroll.payroll_run_component.component_currency IS 
  'Currency of the component as defined (original currency before any conversion)';

COMMENT ON COLUMN payroll.payroll_run_component.component_amount_original IS 
  'Amount in original component currency before conversion (if currency differs from paycheck)';

COMMENT ON COLUMN payroll.payroll_run_component.paycheck_currency IS 
  'Target currency for this paycheck (from employee payroll config)';

COMMENT ON COLUMN payroll.payroll_run_component.amount_converted IS 
  'Amount after conversion to paycheck currency (equals amount if no conversion needed)';

COMMENT ON COLUMN payroll.payroll_run_component.exchange_rate_used IS 
  'Cached exchange rate used for conversion (for audit trail)';

COMMENT ON COLUMN payroll.payroll_run_component.conversion_id IS 
  'Reference to currency_conversion audit record (if conversion was performed)';

-- Add index for currency analysis
CREATE INDEX idx_payroll_component_currency 
  ON payroll.payroll_run_component(component_currency, paycheck_currency) 
  WHERE component_currency != paycheck_currency;
```

### 3. Employee Payroll Config Enhancements

```sql
-- Add payment currency preference to employee payroll config
ALTER TABLE payroll.employee_payroll_config
  ADD COLUMN payment_currency VARCHAR(3),
  ADD COLUMN allow_multi_currency BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN payroll.employee_payroll_config.payment_currency IS 
  'Preferred currency for net payment. If NULL, uses currency field. If different from currency, conversion will be applied.';

COMMENT ON COLUMN payroll.employee_payroll_config.allow_multi_currency IS 
  'If true, employee can have pay components in multiple currencies within same paycheck.';

-- Add index
CREATE INDEX idx_employee_payment_currency 
  ON payroll.employee_payroll_config(organization_id, payment_currency) 
  WHERE payment_currency IS NOT NULL;
```

### 4. Worker Pay Structure Component Override Enhancements

```sql
-- Add currency override capability to worker component overrides
ALTER TABLE payroll.worker_pay_structure_component_override
  ADD COLUMN override_currency VARCHAR(3),
  ADD COLUMN requires_conversion BOOLEAN DEFAULT false;

COMMENT ON COLUMN payroll.worker_pay_structure_component_override.override_currency IS 
  'Currency for this specific component override. If different from worker structure currency, conversion will be required.';

COMMENT ON COLUMN payroll.worker_pay_structure_component_override.requires_conversion IS 
  'Flag indicating this component needs currency conversion during payroll calculation.';
```

---

## Migration Scripts

### Migration 001: Create Exchange Rate Tables

```sql
-- Migration: 001_create_exchange_rate_tables.sql
-- Description: Create exchange rate management and audit tables
-- Date: 2025-11-13

BEGIN;

-- Create exchange rate table
CREATE TABLE payroll.exchange_rate (
  -- [Full table definition from above]
);

-- Create currency conversion audit log
CREATE TABLE payroll.currency_conversion (
  -- [Full table definition from above]
);

-- Create organization currency config
CREATE TABLE payroll.organization_currency_config (
  -- [Full table definition from above]
);

-- Create exchange rate audit log
CREATE TABLE payroll.exchange_rate_audit (
  -- [Full table definition from above]
);

-- Create all indexes
-- [All index creation statements from above]

-- Create trigger for inverse_rate auto-calculation
CREATE OR REPLACE FUNCTION calculate_inverse_rate()
RETURNS TRIGGER AS $$
BEGIN
  NEW.inverse_rate := 1.0 / NEW.rate;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_inverse_rate
  BEFORE INSERT OR UPDATE OF rate ON payroll.exchange_rate
  FOR EACH ROW
  EXECUTE FUNCTION calculate_inverse_rate();

-- Create trigger for exchange rate audit
CREATE OR REPLACE FUNCTION audit_exchange_rate_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.rate != NEW.rate THEN
    INSERT INTO payroll.exchange_rate_audit (
      exchange_rate_id,
      old_rate,
      new_rate,
      rate_change_percentage,
      change_reason,
      change_type,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.rate,
      NEW.rate,
      ((NEW.rate - OLD.rate) / OLD.rate) * 100,
      'Rate updated',
      'manual_update',
      NEW.updated_by
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO payroll.exchange_rate_audit (
      exchange_rate_id,
      old_rate,
      new_rate,
      rate_change_percentage,
      change_reason,
      change_type,
      changed_by
    ) VALUES (
      NEW.id,
      NULL,
      NEW.rate,
      NULL,
      'Initial rate',
      'initial',
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_exchange_rate
  AFTER INSERT OR UPDATE ON payroll.exchange_rate
  FOR EACH ROW
  EXECUTE FUNCTION audit_exchange_rate_change();

COMMIT;
```

### Migration 002: Add Currency Fields to Existing Tables

```sql
-- Migration: 002_add_currency_fields.sql
-- Description: Add multi-currency support to existing payroll tables
-- Date: 2025-11-13

BEGIN;

-- Paycheck table
ALTER TABLE payroll.paycheck
  ADD COLUMN IF NOT EXISTS base_currency VARCHAR(3) DEFAULT 'SRD',
  ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS currency_conversion_summary JSONB,
  ADD COLUMN IF NOT EXISTS total_conversions INTEGER DEFAULT 0;

-- Payroll run component
ALTER TABLE payroll.payroll_run_component
  ADD COLUMN IF NOT EXISTS component_currency VARCHAR(3) NOT NULL DEFAULT 'SRD',
  ADD COLUMN IF NOT EXISTS component_amount_original NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS paycheck_currency VARCHAR(3) NOT NULL DEFAULT 'SRD',
  ADD COLUMN IF NOT EXISTS amount_converted NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC(12, 6),
  ADD COLUMN IF NOT EXISTS conversion_id UUID REFERENCES payroll.currency_conversion(id);

-- Employee payroll config
ALTER TABLE payroll.employee_payroll_config
  ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS allow_multi_currency BOOLEAN DEFAULT false;

-- Worker pay structure component override
ALTER TABLE payroll.worker_pay_structure_component_override
  ADD COLUMN IF NOT EXISTS override_currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS requires_conversion BOOLEAN DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_paycheck_currencies 
  ON payroll.paycheck(organization_id, base_currency, payment_currency) 
  WHERE payment_currency IS NOT NULL AND payment_currency != base_currency;

CREATE INDEX IF NOT EXISTS idx_payroll_component_currency 
  ON payroll.payroll_run_component(component_currency, paycheck_currency) 
  WHERE component_currency != paycheck_currency;

CREATE INDEX IF NOT EXISTS idx_employee_payment_currency 
  ON payroll.employee_payroll_config(organization_id, payment_currency) 
  WHERE payment_currency IS NOT NULL;

COMMIT;
```

### Migration 003: Backfill Existing Data

```sql
-- Migration: 003_backfill_currency_data.sql
-- Description: Populate new currency fields for existing records
-- Date: 2025-11-13

BEGIN;

-- Backfill paycheck base_currency from employee_payroll_config
UPDATE payroll.paycheck pc
SET base_currency = COALESCE(epc.currency, 'SRD')
FROM payroll.employee_payroll_config epc
WHERE pc.employee_id = epc.employee_id
  AND pc.base_currency IS NULL;

-- Backfill payroll_run_component currencies
UPDATE payroll.payroll_run_component prc
SET 
  component_currency = COALESCE(pc.base_currency, 'SRD'),
  paycheck_currency = COALESCE(pc.base_currency, 'SRD'),
  component_amount_original = prc.amount,
  amount_converted = prc.amount
FROM payroll.paycheck pc
WHERE prc.paycheck_id = pc.id
  AND prc.component_currency IS NULL;

-- Create default organization currency configs for existing organizations
INSERT INTO payroll.organization_currency_config (
  organization_id,
  base_currency,
  supported_currencies,
  auto_update_rates,
  rate_update_frequency,
  default_rounding_method,
  created_at
)
SELECT DISTINCT
  id,
  'SRD',
  ARRAY['SRD'],
  false,
  'manual',
  'standard',
  NOW()
FROM organizations
WHERE id NOT IN (SELECT organization_id FROM payroll.organization_currency_config)
  AND EXISTS (SELECT 1 FROM payroll.employee_payroll_config WHERE organization_id = organizations.id);

COMMIT;
```

---

## Rollback Scripts

### Rollback: Remove Currency Fields

```sql
-- Rollback: Remove all multi-currency changes
-- WARNING: This will delete all exchange rate and conversion data

BEGIN;

-- Drop new tables
DROP TABLE IF EXISTS payroll.exchange_rate_audit CASCADE;
DROP TABLE IF EXISTS payroll.currency_conversion CASCADE;
DROP TABLE IF EXISTS payroll.exchange_rate CASCADE;
DROP TABLE IF EXISTS payroll.organization_currency_config CASCADE;

-- Remove columns from existing tables
ALTER TABLE payroll.paycheck
  DROP COLUMN IF EXISTS base_currency,
  DROP COLUMN IF EXISTS payment_currency,
  DROP COLUMN IF EXISTS currency_conversion_summary,
  DROP COLUMN IF EXISTS total_conversions;

ALTER TABLE payroll.payroll_run_component
  DROP COLUMN IF EXISTS component_currency,
  DROP COLUMN IF EXISTS component_amount_original,
  DROP COLUMN IF EXISTS paycheck_currency,
  DROP COLUMN IF EXISTS amount_converted,
  DROP COLUMN IF EXISTS exchange_rate_used,
  DROP COLUMN IF EXISTS conversion_id;

ALTER TABLE payroll.employee_payroll_config
  DROP COLUMN IF EXISTS payment_currency,
  DROP COLUMN IF EXISTS allow_multi_currency;

ALTER TABLE payroll.worker_pay_structure_component_override
  DROP COLUMN IF EXISTS override_currency,
  DROP COLUMN IF EXISTS requires_conversion;

COMMIT;
```

---

## Database Views for Reporting

### Current Exchange Rates View

```sql
-- Materialized view for current exchange rates (performance optimization)
CREATE MATERIALIZED VIEW payroll.mv_current_exchange_rates AS
SELECT DISTINCT ON (organization_id, from_currency, to_currency)
  id,
  organization_id,
  from_currency,
  to_currency,
  rate,
  inverse_rate,
  rate_source,
  rate_type,
  effective_from,
  effective_to
FROM payroll.exchange_rate
WHERE is_active = true
  AND effective_from <= NOW()
  AND (effective_to IS NULL OR effective_to > NOW())
ORDER BY organization_id, from_currency, to_currency, effective_from DESC;

CREATE UNIQUE INDEX ON payroll.mv_current_exchange_rates(organization_id, from_currency, to_currency);

COMMENT ON MATERIALIZED VIEW payroll.mv_current_exchange_rates IS 
  'Cached current exchange rates for fast lookups. Refresh on rate updates.';

-- Refresh trigger
CREATE OR REPLACE FUNCTION refresh_current_rates()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY payroll.mv_current_exchange_rates;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_current_rates
  AFTER INSERT OR UPDATE OR DELETE ON payroll.exchange_rate
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_current_rates();
```

### Currency Conversion Summary View

```sql
-- View for currency conversion analytics
CREATE VIEW payroll.v_currency_conversion_summary AS
SELECT 
  cc.organization_id,
  cc.conversion_date,
  cc.from_currency,
  cc.to_currency,
  COUNT(*) as conversion_count,
  SUM(cc.from_amount) as total_from_amount,
  SUM(cc.to_amount) as total_to_amount,
  AVG(cc.rate_used) as avg_rate,
  MIN(cc.rate_used) as min_rate,
  MAX(cc.rate_used) as max_rate,
  cc.conversion_method,
  pr.run_number as payroll_run_number
FROM payroll.currency_conversion cc
LEFT JOIN payroll.payroll_run pr ON pr.id = cc.payroll_run_id
GROUP BY 
  cc.organization_id,
  cc.conversion_date,
  cc.from_currency,
  cc.to_currency,
  cc.conversion_method,
  pr.run_number
ORDER BY cc.conversion_date DESC;

COMMENT ON VIEW payroll.v_currency_conversion_summary IS 
  'Aggregated currency conversion statistics for reporting and analysis.';
```

---

## Performance Optimization

### Partitioning Strategy (Future Enhancement)

```sql
-- Partition currency_conversion by conversion_date for better query performance
-- (To be implemented when table grows beyond 10M rows)

-- Example partitioning approach:
-- CREATE TABLE payroll.currency_conversion_y2025m11 
--   PARTITION OF payroll.currency_conversion 
--   FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

### Index Maintenance

```sql
-- Analyze tables after initial migration
ANALYZE payroll.exchange_rate;
ANALYZE payroll.currency_conversion;
ANALYZE payroll.paycheck;
ANALYZE payroll.payroll_run_component;

-- Vacuum to reclaim space
VACUUM ANALYZE payroll.exchange_rate;
VACUUM ANALYZE payroll.currency_conversion;
```

---

## Data Integrity Checks

### Validation Queries

```sql
-- Check for paychecks with missing currency data
SELECT id, payroll_run_id, employee_id
FROM payroll.paycheck
WHERE base_currency IS NULL OR base_currency = '';

-- Check for orphaned currency conversions
SELECT cc.id, cc.source_table, cc.source_id
FROM payroll.currency_conversion cc
WHERE cc.source_table = 'paycheck' 
  AND NOT EXISTS (
    SELECT 1 FROM payroll.paycheck WHERE id = cc.source_id
  );

-- Check for invalid exchange rates
SELECT id, from_currency, to_currency, rate
FROM payroll.exchange_rate
WHERE rate <= 0 OR rate IS NULL;

-- Check for currency mismatches in components
SELECT prc.id, prc.component_currency, pc.base_currency
FROM payroll.payroll_run_component prc
JOIN payroll.paycheck pc ON pc.id = prc.paycheck_id
WHERE prc.component_currency != prc.paycheck_currency
  AND prc.conversion_id IS NULL;  -- Missing conversion record
```

---

## Summary

### Tables Added: 4
1. `payroll.exchange_rate`
2. `payroll.currency_conversion`
3. `payroll.organization_currency_config`
4. `payroll.exchange_rate_audit`

### Tables Modified: 4
1. `payroll.paycheck` (+4 columns)
2. `payroll.payroll_run_component` (+6 columns)
3. `payroll.employee_payroll_config` (+2 columns)
4. `payroll.worker_pay_structure_component_override` (+2 columns)

### Indexes Added: 15
### Triggers Added: 3
### Views Added: 2 (1 materialized)

### Migration Complexity: Medium
- **Estimated Downtime:** <5 minutes (for index creation)
- **Rollback Time:** <2 minutes
- **Data Loss Risk:** Low (additive changes only)

---

**Next Document:** `03-service-layer.md` - Business logic and currency service implementation
