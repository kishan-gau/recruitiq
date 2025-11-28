# Multi-Currency Migration Strategy

**Version:** 2.0  
**Date:** November 13, 2025  
**Risk Level:** Medium  
**Estimated Downtime:** 0 hours (zero-downtime migration)

---

## Overview

This document outlines the comprehensive migration strategy for introducing multi-currency support to PayLinQ. The strategy emphasizes **zero-downtime deployment**, **data integrity**, and **rollback safety**.

---

## Migration Principles

### 1. Backward Compatibility
- Existing single-currency functionality must continue working
- New fields are additive, not replacing existing ones
- Feature flags control new behavior activation

### 2. Zero Downtime
- All migrations use non-blocking operations
- No exclusive locks on large tables
- Gradual data backfill with batching

### 3. Data Integrity
- Audit trail for all conversions
- Validation at every step
- Comprehensive testing before production

### 4. Rollback Safety
- Every migration has a tested rollback script
- Feature flags allow instant disabling
- Data snapshots before major changes

---

## Migration Phases

## Phase 1: Schema Migration (Week 1)

### 1.1: Create New Tables

**Goal:** Add exchange rate infrastructure without touching existing tables

#### Migration Script: 001_create_exchange_rate_tables.sql

```sql
-- Migration: 001_create_exchange_rate_tables.sql
-- Description: Create new tables for multi-currency support
-- Risk: Low (no existing data modified)
-- Rollback: 001_rollback.sql

BEGIN;

-- Exchange rate table
CREATE TABLE IF NOT EXISTS payroll.exchange_rate (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES auth.organizations(id),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(18, 8) NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP WITH TIME ZONE,
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_currencies CHECK (from_currency != to_currency),
    CONSTRAINT positive_rate CHECK (rate > 0),
    CONSTRAINT valid_date_range CHECK (
        effective_to IS NULL OR effective_to > effective_from
    ),
    CONSTRAINT unique_rate_effective UNIQUE (
        organization_id, from_currency, to_currency, effective_from
    )
);

-- Indexes for exchange_rate
CREATE INDEX idx_exchange_rate_org_curr_date ON payroll.exchange_rate(
    organization_id, from_currency, to_currency, effective_from
) WHERE effective_to IS NULL;

CREATE INDEX idx_exchange_rate_temporal ON payroll.exchange_rate 
    USING GIST (tstzrange(effective_from, effective_to));

CREATE INDEX idx_exchange_rate_metadata ON payroll.exchange_rate 
    USING GIN (metadata);

-- Currency conversion audit table
CREATE TABLE IF NOT EXISTS payroll.currency_conversion (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES auth.organizations(id),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    from_amount NUMERIC(15, 2) NOT NULL,
    to_amount NUMERIC(15, 2) NOT NULL,
    exchange_rate_id BIGINT REFERENCES payroll.exchange_rate(id),
    rate_used NUMERIC(18, 8) NOT NULL,
    conversion_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_type VARCHAR(50) NOT NULL,
    reference_id BIGINT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_amounts CHECK (from_amount > 0 AND to_amount > 0),
    CONSTRAINT valid_rate_used CHECK (rate_used > 0)
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

-- Organization currency configuration
CREATE TABLE IF NOT EXISTS payroll.organization_currency_config (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES auth.organizations(id) UNIQUE,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'SRD',
    supported_currencies VARCHAR(3)[] NOT NULL DEFAULT '{SRD}',
    auto_update_rates BOOLEAN NOT NULL DEFAULT false,
    rate_update_source VARCHAR(50),
    default_rounding_method VARCHAR(20) NOT NULL DEFAULT 'half_up',
    default_decimal_places INTEGER NOT NULL DEFAULT 2,
    require_approval_threshold NUMERIC(15, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_decimal_places CHECK (default_decimal_places BETWEEN 0 AND 4),
    CONSTRAINT valid_threshold CHECK (
        require_approval_threshold IS NULL OR require_approval_threshold >= 0
    )
);

-- Exchange rate audit log
CREATE TABLE IF NOT EXISTS payroll.exchange_rate_audit (
    id BIGSERIAL PRIMARY KEY,
    exchange_rate_id BIGINT NOT NULL REFERENCES payroll.exchange_rate(id),
    action VARCHAR(20) NOT NULL,
    old_rate NUMERIC(18, 8),
    new_rate NUMERIC(18, 8),
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_rate_audit_rate_id ON payroll.exchange_rate_audit(exchange_rate_id);
CREATE INDEX idx_rate_audit_date ON payroll.exchange_rate_audit(changed_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION payroll.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exchange_rate_updated_at
    BEFORE UPDATE ON payroll.exchange_rate
    FOR EACH ROW
    EXECUTE FUNCTION payroll.update_updated_at_column();

CREATE TRIGGER org_currency_config_updated_at
    BEFORE UPDATE ON payroll.organization_currency_config
    FOR EACH ROW
    EXECUTE FUNCTION payroll.update_updated_at_column();

-- RLS Policies
ALTER TABLE payroll.exchange_rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.currency_conversion ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.organization_currency_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.exchange_rate_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY exchange_rate_org_isolation ON payroll.exchange_rate
    USING (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY conversion_org_isolation ON payroll.currency_conversion
    USING (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY config_org_isolation ON payroll.organization_currency_config
    USING (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY audit_org_isolation ON payroll.exchange_rate_audit
    USING (
        EXISTS (
            SELECT 1 FROM payroll.exchange_rate er
            WHERE er.id = exchange_rate_audit.exchange_rate_id
            AND er.organization_id = current_setting('app.current_organization_id')::UUID
        )
    );

COMMIT;
```

#### Rollback Script: 001_rollback.sql

```sql
-- Rollback: 001_rollback.sql
-- Description: Remove multi-currency tables

BEGIN;

-- Drop policies first
DROP POLICY IF EXISTS exchange_rate_org_isolation ON payroll.exchange_rate;
DROP POLICY IF EXISTS conversion_org_isolation ON payroll.currency_conversion;
DROP POLICY IF EXISTS config_org_isolation ON payroll.organization_currency_config;
DROP POLICY IF EXISTS audit_org_isolation ON payroll.exchange_rate_audit;

-- Drop triggers
DROP TRIGGER IF EXISTS exchange_rate_updated_at ON payroll.exchange_rate;
DROP TRIGGER IF EXISTS org_currency_config_updated_at ON payroll.organization_currency_config;

-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS payroll.exchange_rate_audit CASCADE;
DROP TABLE IF EXISTS payroll.currency_conversion CASCADE;
DROP TABLE IF EXISTS payroll.organization_currency_config CASCADE;
DROP TABLE IF EXISTS payroll.exchange_rate CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS payroll.update_updated_at_column CASCADE;

COMMIT;
```

#### Validation Queries

```sql
-- Verify tables created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'payroll' 
AND table_name IN (
    'exchange_rate', 
    'currency_conversion', 
    'organization_currency_config',
    'exchange_rate_audit'
);

-- Verify indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'payroll' 
AND tablename LIKE '%exchange%' OR tablename LIKE '%currency%';

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'payroll' 
AND tablename IN (
    'exchange_rate', 
    'currency_conversion', 
    'organization_currency_config',
    'exchange_rate_audit'
);
```

---

### 1.2: Add Currency Fields to Existing Tables

**Goal:** Extend existing tables with multi-currency support

#### Migration Script: 002_add_currency_fields.sql

```sql
-- Migration: 002_add_currency_fields.sql
-- Description: Add currency tracking fields to existing tables
-- Risk: Low (non-breaking, default values provided)
-- Rollback: 002_rollback.sql

BEGIN;

-- Add fields to paycheck table
ALTER TABLE payroll.paycheck 
    ADD COLUMN IF NOT EXISTS base_currency VARCHAR(3) DEFAULT 'SRD',
    ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(3),
    ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC(18, 8),
    ADD COLUMN IF NOT EXISTS conversion_summary JSONB DEFAULT '{}'::jsonb;

-- Create partial index for multi-currency paychecks
CREATE INDEX idx_paycheck_multi_currency ON payroll.paycheck(id) 
WHERE payment_currency IS NOT NULL AND payment_currency != base_currency;

-- Add fields to payroll_run_component
ALTER TABLE payroll.payroll_run_component
    ADD COLUMN IF NOT EXISTS component_currency VARCHAR(3),
    ADD COLUMN IF NOT EXISTS original_amount NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS converted_amount NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS conversion_id BIGINT REFERENCES payroll.currency_conversion(id),
    ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC(18, 8),
    ADD COLUMN IF NOT EXISTS conversion_metadata JSONB DEFAULT '{}'::jsonb;

-- Index for conversion tracking
CREATE INDEX idx_run_component_conversion ON payroll.payroll_run_component(conversion_id)
WHERE conversion_id IS NOT NULL;

-- Add fields to employee_payroll_config
ALTER TABLE payroll.employee_payroll_config
    ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(3),
    ADD COLUMN IF NOT EXISTS allow_multi_currency BOOLEAN NOT NULL DEFAULT false;

-- Add fields to worker_pay_structure_component_override (for Phase 3)
ALTER TABLE payroll.worker_pay_structure_component_override
    ADD COLUMN IF NOT EXISTS component_currency VARCHAR(3),
    ADD COLUMN IF NOT EXISTS currency_conversion_required BOOLEAN NOT NULL DEFAULT false;

-- Add comment documentation
COMMENT ON COLUMN payroll.paycheck.base_currency IS 
    'Currency used for payroll calculations (typically compensation.currency)';
COMMENT ON COLUMN payroll.paycheck.payment_currency IS 
    'Currency in which employee will be paid (if different from base)';
COMMENT ON COLUMN payroll.paycheck.exchange_rate_used IS 
    'Exchange rate applied for conversion (if payment_currency differs)';
COMMENT ON COLUMN payroll.paycheck.conversion_summary IS 
    'JSONB containing breakdown of all currency conversions in this paycheck';

COMMIT;
```

#### Rollback Script: 002_rollback.sql

```sql
-- Rollback: 002_rollback.sql
-- Description: Remove currency fields from existing tables

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS payroll.idx_paycheck_multi_currency;
DROP INDEX IF EXISTS payroll.idx_run_component_conversion;

-- Remove columns from paycheck
ALTER TABLE payroll.paycheck 
    DROP COLUMN IF EXISTS base_currency,
    DROP COLUMN IF EXISTS payment_currency,
    DROP COLUMN IF EXISTS exchange_rate_used,
    DROP COLUMN IF EXISTS conversion_summary;

-- Remove columns from payroll_run_component
ALTER TABLE payroll.payroll_run_component
    DROP COLUMN IF EXISTS component_currency,
    DROP COLUMN IF EXISTS original_amount,
    DROP COLUMN IF EXISTS converted_amount,
    DROP COLUMN IF EXISTS conversion_id,
    DROP COLUMN IF EXISTS exchange_rate_used,
    DROP COLUMN IF EXISTS conversion_metadata;

-- Remove columns from employee_payroll_config
ALTER TABLE payroll.employee_payroll_config
    DROP COLUMN IF EXISTS payment_currency,
    DROP COLUMN IF EXISTS allow_multi_currency;

-- Remove columns from worker_pay_structure_component_override
ALTER TABLE payroll.worker_pay_structure_component_override
    DROP COLUMN IF EXISTS component_currency,
    DROP COLUMN IF EXISTS currency_conversion_required;

COMMIT;
```

#### Validation Queries

```sql
-- Verify new columns exist
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'payroll'
AND table_name IN ('paycheck', 'payroll_run_component', 'employee_payroll_config')
AND column_name LIKE '%currency%' OR column_name LIKE '%conversion%';

-- Check for any NULL values in critical fields
SELECT 
    COUNT(*) AS total_paychecks,
    COUNT(base_currency) AS paychecks_with_base_currency,
    COUNT(payment_currency) AS paychecks_with_payment_currency
FROM payroll.paycheck;
```

---

### 1.3: Data Backfill & Initialization

**Goal:** Populate default values and create organization configurations

#### Migration Script: 003_backfill_currency_data.sql

```sql
-- Migration: 003_backfill_currency_data.sql
-- Description: Initialize currency data for existing organizations
-- Risk: Medium (updates existing data)
-- Rollback: 003_rollback.sql

BEGIN;

-- Create organization currency configs for all existing organizations
INSERT INTO payroll.organization_currency_config (
    organization_id,
    base_currency,
    supported_currencies,
    auto_update_rates,
    default_rounding_method,
    default_decimal_places
)
SELECT 
    o.id AS organization_id,
    'SRD' AS base_currency,
    ARRAY['SRD']::VARCHAR(3)[] AS supported_currencies,
    false AS auto_update_rates,
    'half_up' AS default_rounding_method,
    2 AS default_decimal_places
FROM auth.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM payroll.organization_currency_config occ
    WHERE occ.organization_id = o.id
);

-- Backfill base_currency in paycheck (use existing currency or default to SRD)
UPDATE payroll.paycheck pc
SET base_currency = COALESCE(
    (SELECT c.currency 
     FROM payroll.compensation c 
     WHERE c.employee_id = pc.employee_id 
     ORDER BY c.effective_from DESC 
     LIMIT 1),
    'SRD'
)
WHERE base_currency IS NULL;

-- Backfill payment_currency in employee_payroll_config (match existing currency)
UPDATE payroll.employee_payroll_config epc
SET payment_currency = COALESCE(epc.currency, 'SRD')
WHERE payment_currency IS NULL;

-- Create default exchange rate (1:1 for SRD to SRD, for testing)
INSERT INTO payroll.exchange_rate (
    organization_id,
    from_currency,
    to_currency,
    rate,
    effective_from,
    source,
    created_by
)
SELECT 
    o.id AS organization_id,
    'SRD' AS from_currency,
    'SRD' AS to_currency,
    1.0 AS rate,
    CURRENT_TIMESTAMP AS effective_from,
    'system_default' AS source,
    (SELECT id FROM auth.users WHERE organization_id = o.id AND role = 'admin' LIMIT 1) AS created_by
FROM auth.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM payroll.exchange_rate er
    WHERE er.organization_id = o.id 
    AND er.from_currency = 'SRD' 
    AND er.to_currency = 'SRD'
)
AND EXISTS (SELECT 1 FROM auth.users WHERE organization_id = o.id AND role = 'admin');

COMMIT;
```

#### Rollback Script: 003_rollback.sql

```sql
-- Rollback: 003_rollback.sql
-- Description: Remove backfilled currency data

BEGIN;

-- Remove default exchange rates (only those created by migration)
DELETE FROM payroll.exchange_rate 
WHERE source = 'system_default';

-- Reset payment_currency in employee_payroll_config
UPDATE payroll.employee_payroll_config
SET payment_currency = NULL;

-- Reset base_currency in paycheck
UPDATE payroll.paycheck
SET base_currency = 'SRD'
WHERE base_currency IS NOT NULL;

-- Remove organization currency configs
DELETE FROM payroll.organization_currency_config;

COMMIT;
```

#### Validation Queries

```sql
-- Verify organization configs created
SELECT COUNT(*) AS org_configs
FROM payroll.organization_currency_config;

SELECT COUNT(*) AS total_orgs
FROM auth.organizations;

-- Should be equal or close (some orgs may not have admins)

-- Verify paychecks have base_currency
SELECT 
    COUNT(*) AS total,
    COUNT(base_currency) AS with_base_currency,
    COUNT(DISTINCT base_currency) AS unique_currencies
FROM payroll.paycheck;

-- Verify default exchange rates
SELECT 
    organization_id,
    from_currency,
    to_currency,
    rate,
    source
FROM payroll.exchange_rate
WHERE source = 'system_default';
```

---

## Phase 2: Service Layer Deployment (Week 2-3)

### 2.1: Deploy CurrencyService

**Goal:** Deploy currency service with feature flag disabled

#### Deployment Steps

1. **Code deployment:**
   ```bash
   # Deploy service code without activation
   git checkout multi-currency-service
   npm install
   npm run build
   pm2 reload paylinq-backend --update-env
   ```

2. **Verify service initialization:**
   ```javascript
   // Test that service loads correctly
   const { CurrencyService } = require('./services/currencyService');
   const service = new CurrencyService();
   console.log('CurrencyService initialized:', !!service);
   ```

3. **Create feature flag:**
   ```sql
   INSERT INTO app.feature_flags (
       name,
       enabled,
       description,
       created_at
   ) VALUES (
       'multi_currency_enabled',
       false,
       'Enable multi-currency support for payroll calculations',
       CURRENT_TIMESTAMP
   );
   ```

4. **Test in staging:**
   - Enable feature flag in staging
   - Test exchange rate CRUD operations
   - Test currency conversion with audit trail
   - Verify cache invalidation
   - Disable feature flag

#### Rollback Procedure

```bash
# Revert to previous deployment
git checkout main
npm install
npm run build
pm2 reload paylinq-backend
```

---

### 2.2: Integrate with PayrollService

**Goal:** Deploy enhanced payroll service with backward compatibility

#### Deployment Steps

1. **Deploy updated PayrollService:**
   ```javascript
   // Modified calculatePayroll method with currency support
   // Feature flag check ensures backward compatibility
   
   async calculatePayroll(payrollRunId, options = {}) {
       const multiCurrencyEnabled = await this.featureFlagService.isEnabled(
           'multi_currency_enabled'
       );
       
       if (multiCurrencyEnabled) {
           return this.calculatePayrollWithCurrency(payrollRunId, options);
       }
       
       // Existing single-currency logic
       return this.calculatePayrollLegacy(payrollRunId, options);
   }
   ```

2. **Gradual activation:**
   - Test with 1 organization in staging
   - Monitor for errors and performance
   - Expand to 10% of staging organizations
   - Full staging rollout
   - Prepare for production

3. **Monitoring setup:**
   ```javascript
   // Add custom metrics
   metrics.gauge('currency.conversions.total', conversionCount);
   metrics.histogram('currency.conversion.duration', duration);
   metrics.counter('currency.conversion.errors', errorCount);
   ```

#### Rollback Procedure

```javascript
// Disable feature flag via API or database
UPDATE app.feature_flags 
SET enabled = false 
WHERE name = 'multi_currency_enabled';

// Or via admin UI
```

---

## Phase 3: UI Deployment (Week 4-6)

### 3.1: Deploy Enhanced Components

**Goal:** Deploy UI components with progressive disclosure

#### Deployment Steps

1. **Deploy component library:**
   ```bash
   cd packages/ui
   npm run build
   npm publish --tag beta
   ```

2. **Deploy PayLinQ frontend:**
   ```bash
   cd apps/paylinq
   npm install @recruitiq/ui@beta
   npm run build
   # Deploy to CDN or static hosting
   ```

3. **Feature flag for UI:**
   ```typescript
   // In React components
   const { isEnabled } = useFeatureFlag('multi_currency_ui');
   
   if (!isEnabled) {
       return <LegacyCurrencyDisplay {...props} />;
   }
   
   return <EnhancedCurrencyDisplay {...props} />;
   ```

4. **Gradual rollout:**
   - Enable for internal users (QA team)
   - Enable for pilot organizations (5-10 orgs)
   - Monitor feedback and bug reports
   - Enable for 25% of organizations
   - Full rollout

#### Rollback Procedure

```typescript
// Disable UI feature flag
UPDATE app.feature_flags 
SET enabled = false 
WHERE name = 'multi_currency_ui';

// Users see legacy components instantly
```

---

## Data Migration Testing

### Pre-Production Testing

#### 1. Staging Environment Test

**Setup:**
1. Clone production database to staging (anonymized)
2. Run all migrations sequentially
3. Verify data integrity
4. Test rollback procedures

**Test Cases:**
```sql
-- Test 1: Verify no data loss
SELECT COUNT(*) FROM payroll.paycheck; -- Before migration
SELECT COUNT(*) FROM payroll.paycheck; -- After migration
-- Should be identical

-- Test 2: Verify foreign key integrity
SELECT 
    COUNT(*) AS total_conversions,
    COUNT(exchange_rate_id) AS conversions_with_rate
FROM payroll.currency_conversion;
-- All conversions should have exchange_rate_id

-- Test 3: Verify RLS policies work
SET app.current_organization_id = '00000000-0000-0000-0000-000000000001';
SELECT COUNT(*) FROM payroll.exchange_rate;
-- Should only see rates for that org

-- Test 4: Verify backward compatibility
-- Run payroll for existing employee without multi-currency
-- Should work exactly as before
```

#### 2. Performance Testing

**Load Test:**
```javascript
// k6 script for load testing
import http from 'k6/http';
import { check } from 'k6';

export let options = {
    stages: [
        { duration: '2m', target: 100 }, // Ramp up
        { duration: '5m', target: 100 }, // Sustain
        { duration: '2m', target: 0 },   // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% under 500ms
    },
};

export default function () {
    // Test exchange rate lookup
    let res = http.get('http://localhost:3000/api/exchange-rates/current/SRD/USD');
    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 50ms': (r) => r.timings.duration < 50,
    });
    
    // Test payroll calculation with conversion
    res = http.post('http://localhost:3000/api/payroll/calculate', JSON.stringify({
        employeeId: 'test-employee-id',
        payCurrency: 'USD',
    }), {
        headers: { 'Content-Type': 'application/json' },
    });
    check(res, {
        'calculation status is 200': (r) => r.status === 200,
        'calculation time < 500ms': (r) => r.timings.duration < 500,
    });
}
```

**Expected Results:**
- Exchange rate lookup: p95 < 50ms
- Payroll calculation: p95 < 500ms
- Error rate: < 0.1%
- Cache hit rate: > 90%

#### 3. Data Integrity Validation

**Validation Scripts:**
```sql
-- Script 1: Orphaned records check
SELECT 'Orphaned conversions' AS issue, COUNT(*) AS count
FROM payroll.currency_conversion cc
WHERE NOT EXISTS (
    SELECT 1 FROM payroll.exchange_rate er
    WHERE er.id = cc.exchange_rate_id
)
UNION ALL
SELECT 'Orphaned audit logs', COUNT(*)
FROM payroll.exchange_rate_audit era
WHERE NOT EXISTS (
    SELECT 1 FROM payroll.exchange_rate er
    WHERE er.id = era.exchange_rate_id
);

-- Script 2: Data consistency check
SELECT 
    'Paychecks with conversion but no rate' AS issue,
    COUNT(*) AS count
FROM payroll.paycheck
WHERE payment_currency IS NOT NULL 
AND payment_currency != base_currency
AND exchange_rate_used IS NULL;

-- Script 3: RLS policy verification
-- Set organization context
SET app.current_organization_id = '11111111-1111-1111-1111-111111111111';
SELECT COUNT(*) AS visible_rates FROM payroll.exchange_rate;

-- Switch organization
SET app.current_organization_id = '22222222-2222-2222-2222-222222222222';
SELECT COUNT(*) AS visible_rates FROM payroll.exchange_rate;
-- Should see different counts (org isolation)
```

---

## Production Deployment Plan

### Pre-Deployment Checklist

- [ ] All migrations tested on staging
- [ ] Rollback procedures tested and documented
- [ ] Performance benchmarks met in staging
- [ ] Security audit completed
- [ ] Backup of production database taken
- [ ] Deployment runbook reviewed by team
- [ ] Monitoring dashboards configured
- [ ] Alert rules configured for error rates
- [ ] Support team briefed on new features
- [ ] Rollback decision tree documented

### Deployment Day Schedule

**Maintenance Window:** Sunday 2:00 AM - 6:00 AM UTC  
**Expected Duration:** 2 hours  
**Downtime:** 0 hours (zero-downtime deployment)

#### Timeline

**1:45 AM - Pre-Deployment**
- [ ] Verify all team members on standby
- [ ] Confirm backup completed successfully
- [ ] Disable non-critical background jobs

**2:00 AM - Schema Migration**
- [ ] Execute Migration 001 (create tables) - Est: 5 minutes
- [ ] Verify tables created successfully
- [ ] Execute Migration 002 (add columns) - Est: 15 minutes
- [ ] Verify columns added successfully
- [ ] Execute Migration 003 (backfill data) - Est: 30 minutes
- [ ] Verify data backfilled correctly

**2:50 AM - Validation**
- [ ] Run validation queries
- [ ] Verify row counts match expected
- [ ] Check for orphaned records
- [ ] Verify RLS policies work
- [ ] Test exchange rate lookup

**3:00 AM - Service Deployment**
- [ ] Deploy backend services with feature flag OFF
- [ ] Verify service health checks pass
- [ ] Test API endpoints (should return 404 or disabled message)
- [ ] Monitor error rates

**3:30 AM - UI Deployment**
- [ ] Deploy frontend builds
- [ ] Verify assets loaded correctly
- [ ] Test basic navigation
- [ ] Verify legacy components still work

**4:00 AM - Smoke Testing**
- [ ] Enable feature flags for test organization
- [ ] Create test exchange rate
- [ ] Run test payroll with currency conversion
- [ ] Verify conversion audit trail
- [ ] Disable feature flags

**4:30 AM - Final Checks**
- [ ] Review monitoring dashboards
- [ ] Check error rates (should be < 0.1%)
- [ ] Verify database performance metrics
- [ ] Re-enable background jobs
- [ ] Document any issues encountered

**5:00 AM - Post-Deployment**
- [ ] Send deployment summary to stakeholders
- [ ] Schedule post-deployment review meeting
- [ ] Monitor system for next 24 hours

### Go/No-Go Decision Points

**After Migration 001:**
- **GO:** Tables created, indexes present, RLS enabled
- **NO-GO:** Any table creation failure → Execute Rollback 001

**After Migration 002:**
- **GO:** Columns added, indexes created, no breaking changes
- **NO-GO:** Column addition fails or breaks existing queries → Execute Rollback 002

**After Migration 003:**
- **GO:** Data backfilled correctly, row counts match, no orphaned records
- **NO-GO:** Data integrity issues detected → Execute Rollback 003

**After Service Deployment:**
- **GO:** Health checks pass, API responds, no errors in logs
- **NO-GO:** Service crashes or high error rate → Revert deployment

---

## Rollback Procedures

### Immediate Rollback (Feature Flag Disable)

**When to use:** Minor issues, unexpected behavior, user confusion

**Procedure:**
```sql
-- Disable feature flags instantly
UPDATE app.feature_flags 
SET enabled = false 
WHERE name IN ('multi_currency_enabled', 'multi_currency_ui');
```

**Impact:** Users see legacy behavior immediately, no data loss

**Recovery Time:** < 1 minute

---

### Service Rollback

**When to use:** Service crashes, high error rates, performance degradation

**Procedure:**
```bash
# Revert to previous deployment
pm2 stop paylinq-backend
git checkout <previous-commit-hash>
npm install
npm run build
pm2 start paylinq-backend

# Verify service health
curl http://localhost:3000/health
```

**Impact:** Service downtime 2-5 minutes

**Recovery Time:** 5 minutes

---

### Full Database Rollback

**When to use:** Critical data integrity issues, migration failures

**Procedure:**
```bash
# Connect to database
psql -h <db-host> -U <db-user> -d paylinq

# Execute rollback scripts in reverse order
\i 003_rollback.sql
\i 002_rollback.sql
\i 001_rollback.sql

# Verify rollback
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'payroll' 
AND table_name LIKE '%exchange%';
-- Should return no results
```

**Impact:** All multi-currency data lost (exchange rates, conversions, configs)

**Recovery Time:** 30 minutes

**Data Loss:** All multi-currency data created after migration

---

## Monitoring & Alerts

### Key Metrics to Monitor

**System Health:**
- API response times (p50, p95, p99)
- Error rates (4xx, 5xx)
- Database connection pool utilization
- Memory and CPU usage

**Business Metrics:**
- Exchange rate lookups per minute
- Currency conversions per hour
- Failed conversion attempts
- Cache hit rate for exchange rates

**Data Quality:**
- Orphaned conversion records
- Missing exchange rates
- Conversion accuracy (sample checks)

### Alert Configuration

```yaml
# alerts.yml
alerts:
  - name: HighConversionErrorRate
    condition: currency.conversion.errors > 10 per 5m
    severity: critical
    action: page_oncall
    
  - name: SlowExchangeRateLookup
    condition: currency.rate_lookup.p95 > 100ms
    severity: warning
    action: notify_slack
    
  - name: LowCacheHitRate
    condition: currency.cache.hit_rate < 80%
    severity: warning
    action: notify_slack
    
  - name: OrphanedConversions
    condition: count(orphaned_conversions) > 0
    severity: critical
    action: page_oncall
```

### Monitoring Dashboard

**Sections:**
1. **Overview:** Total conversions, error rate, average response time
2. **Exchange Rates:** Active rates, recent changes, missing pairs
3. **Performance:** API latency, cache hit rate, database queries
4. **Data Quality:** Orphaned records, conversion accuracy, audit completeness

---

## Training & Documentation

### User Training Materials

**1. Admin Guide:**
- How to add exchange rates
- Configuring currency settings
- Understanding conversion reports
- Approving rate changes

**2. Payroll Staff Guide:**
- Running multi-currency payroll
- Reviewing currency conversions
- Troubleshooting common issues
- Understanding paycheck breakdowns

**3. Video Tutorials:**
- Adding exchange rates (5 min)
- Running multi-currency payroll (10 min)
- Reviewing conversion audit trail (5 min)

### Developer Documentation

**1. API Documentation:**
- Swagger/OpenAPI spec
- Example requests/responses
- Error code reference
- Authentication guide

**2. Service Documentation:**
- CurrencyService architecture
- Integration patterns
- Testing guide
- Troubleshooting

**3. Database Documentation:**
- Schema diagrams
- Table relationships
- Index strategies
- Query optimization

---

## Post-Migration Validation

### Week 1: Hyper-Care Period

**Daily Tasks:**
- Review error logs for currency-related issues
- Monitor conversion accuracy (sample 100 conversions)
- Check for orphaned records
- Review user feedback from support tickets

**Validation Queries:**
```sql
-- Daily validation query
WITH daily_stats AS (
    SELECT 
        DATE_TRUNC('day', conversion_date) AS day,
        COUNT(*) AS total_conversions,
        COUNT(DISTINCT from_currency || '-' || to_currency) AS currency_pairs,
        AVG(rate_used) AS avg_rate,
        COUNT(CASE WHEN exchange_rate_id IS NULL THEN 1 END) AS orphaned
    FROM payroll.currency_conversion
    WHERE conversion_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('day', conversion_date)
)
SELECT * FROM daily_stats ORDER BY day DESC;
```

### Week 2-4: Stabilization

**Weekly Tasks:**
- Performance review (response times, cache hit rates)
- Data quality audit (orphaned records, missing rates)
- User feedback analysis
- Feature usage metrics

**Success Criteria:**
- Error rate < 0.1%
- Cache hit rate > 90%
- No orphaned records
- User satisfaction > 4.5/5

---

## Contingency Plans

### Scenario 1: Exchange Rate Provider Failure

**Symptoms:** Automated rate updates fail

**Response:**
1. Switch to backup provider (if configured)
2. Notify admins to manually enter rates
3. Use last known good rates with expiration warnings
4. Monitor provider status page

**Resolution:** Wait for provider restoration or use manual rates

---

### Scenario 2: Performance Degradation

**Symptoms:** API response times > 500ms

**Response:**
1. Check database query performance
2. Verify cache is working (Redis)
3. Review recent code changes
4. Scale horizontally if needed

**Resolution:** Optimize slow queries, increase cache TTL, add read replicas

---

### Scenario 3: Data Integrity Issues

**Symptoms:** Orphaned conversion records, missing rates

**Response:**
1. Identify affected conversions
2. Disable feature flag if widespread
3. Run data repair scripts
4. Investigate root cause

**Resolution:** Fix data, implement additional validation

---

## Lessons Learned Template

### Post-Deployment Review (1 week after launch)

**Date:** [To be filled]  
**Attendees:** [Development team, QA, Product, Support]

**What Went Well:**
- [To be filled]

**What Didn't Go Well:**
- [To be filled]

**Action Items:**
- [To be filled]

**Metrics Achieved:**
- Error rate: [To be filled]
- Performance: [To be filled]
- User satisfaction: [To be filled]

---

**Status:** Ready for execution pending approval  
**Next Review:** Pre-deployment final review  
**Approvals Required:** CTO, Product Lead, DevOps Lead
