-- ================================================================
-- SEED VAKANTIEGELD COMPONENT EXAMPLES
-- ================================================================
--
-- Seeds VAKANTIEGELD pay components with different calculation methods
-- Each organization configures their own calculation approach
-- Calculation rules stored in metadata JSONB field
--
-- MULTI-TENANT: Each organization gets its own component configuration
-- ================================================================

-- ================================================================
-- EXAMPLE ORGANIZATION A: 8% of Base Salary (Semi-Annual)
-- ================================================================
-- 
-- Business Rule: 8% of base salary paid twice per year (January & September)
-- Tax Treatment: Holiday allowance (SRD 10,016/year cap)
-- Calculation: base_salary × 8% × 6 months
--
-- Test Case:
--   Employee: Base salary SRD 15,000/month
--   January payment: 15,000 × 8% × 6 = SRD 7,200
--   September payment: 15,000 × 8% × 6 = SRD 7,200
--   Total: SRD 14,400/year
--   Tax-free: SRD 10,016
--   Taxable: SRD 4,384
--
-- ================================================================

INSERT INTO payroll.pay_component 
  (organization_id, component_code, component_name, component_type, category,
   calculation_type, default_rate, 
   is_taxable, is_recurring, is_system_component,
   metadata, description, status)
SELECT 
  o.id as organization_id,
  'VAKANTIEGELD',
  'Holiday Allowance',
  'earning',
  'special_payment',
  'percentage',  -- Uses percentage calculation type
  8.0,          -- 8% rate
  true,         -- Is taxable (but with allowance cap)
  false,        -- Not recurring (semi-annual)
  false,        -- Not system component (org-specific)
  jsonb_build_object(
    'calculation_method', 'percentage',
    'percentage', 8.0,
    'basis', 'base_salary',
    'multiplier', 6,  -- 6 months accumulation
    'accumulation_period', 'semi_annual',
    'payment_months', ARRAY[1, 9],  -- January, September
    'allowance_type', 'holiday_allowance',
    'notes', '8% of base salary accumulated over 6 months'
  ),
  '8% of base salary paid semi-annually (January and September)',
  'active'
FROM organizations o
WHERE o.name = 'Organization A' -- Replace with actual org identifier
  AND NOT EXISTS (
    SELECT 1 FROM payroll.pay_component pc
    WHERE pc.organization_id = o.id 
      AND pc.component_code = 'VAKANTIEGELD'
  );

-- ================================================================
-- EXAMPLE ORGANIZATION B: Fixed Amount (Bi-Annual)
-- ================================================================
--
-- Business Rule: Fixed SRD 5,000 paid twice per year (June & December)
-- Tax Treatment: Holiday allowance (SRD 10,016/year cap)
-- Calculation: Fixed SRD 5,000 per payment
--
-- Test Case:
--   June payment: SRD 5,000
--   December payment: SRD 5,000
--   Total: SRD 10,000/year
--   Tax-free: SRD 10,000 (within cap)
--   Taxable: SRD 0
--
-- ================================================================

INSERT INTO payroll.pay_component 
  (organization_id, component_code, component_name, component_type, category,
   calculation_type, default_amount,
   is_taxable, is_recurring, is_system_component,
   metadata, description, status)
SELECT 
  o.id as organization_id,
  'VAKANTIEGELD',
  'Holiday Allowance',
  'earning',
  'special_payment',
  'fixed_amount',  -- Uses fixed amount calculation type
  5000.00,        -- Fixed SRD 5,000
  true,
  false,
  false,
  jsonb_build_object(
    'calculation_method', 'fixed_amount',
    'amount', 5000.00,
    'payment_months', ARRAY[6, 12],  -- June, December
    'allowance_type', 'holiday_allowance',
    'notes', 'Fixed SRD 5,000 paid twice per year'
  ),
  'Fixed SRD 5,000 paid bi-annually (June and December)',
  'active'
FROM organizations o
WHERE o.name = 'Organization B' -- Replace with actual org identifier
  AND NOT EXISTS (
    SELECT 1 FROM payroll.pay_component pc
    WHERE pc.organization_id = o.id 
      AND pc.component_code = 'VAKANTIEGELD'
  );

-- ================================================================
-- EXAMPLE ORGANIZATION C: One Month Salary (Annual)
-- ================================================================
--
-- Business Rule: One full month salary paid once per year (December)
-- Tax Treatment: Holiday allowance (SRD 10,016/year cap)
-- Calculation: base_salary × 1
--
-- Test Case:
--   Employee: Base salary SRD 15,000/month
--   December payment: SRD 15,000
--   Total: SRD 15,000/year
--   Tax-free: SRD 10,016 (cap reached)
--   Taxable: SRD 4,984
--
-- ================================================================

INSERT INTO payroll.pay_component 
  (organization_id, component_code, component_name, component_type, category,
   calculation_type, formula,
   is_taxable, is_recurring, is_system_component,
   metadata, description, status)
SELECT 
  o.id as organization_id,
  'VAKANTIEGELD',
  'Holiday Allowance',
  'earning',
  'special_payment',
  'formula',          -- Uses formula calculation type
  'base_salary * 1',  -- Simple formula: one month salary
  true,
  false,
  false,
  jsonb_build_object(
    'calculation_method', 'one_month_salary',
    'payment_months', ARRAY[12],  -- December only
    'allowance_type', 'holiday_allowance',
    'notes', 'Full month salary paid annually in December'
  ),
  'One month salary paid annually in December',
  'active'
FROM organizations o
WHERE o.name = 'Organization C' -- Replace with actual org identifier
  AND NOT EXISTS (
    SELECT 1 FROM payroll.pay_component pc
    WHERE pc.organization_id = o.id 
      AND pc.component_code = 'VAKANTIEGELD'
  );

-- ================================================================
-- NOTES
-- ================================================================
--
-- Calculation Type Mapping:
-- - 'percentage': Uses default_rate field (8.0 = 8%)
-- - 'fixed_amount': Uses default_amount field (5000.00)
-- - 'formula': Uses formula field ('base_salary * 1')
--
-- Metadata Structure:
-- {
--   calculation_method: 'percentage' | 'fixed_amount' | 'one_month_salary',
--   percentage?: number (for percentage method),
--   amount?: number (for fixed_amount method),
--   basis?: string (for percentage method - what to calculate % of),
--   multiplier?: number (accumulation period multiplier),
--   accumulation_period?: 'semi_annual' | 'annual',
--   payment_months: number[] (which months to pay),
--   allowance_type: 'holiday_allowance',
--   notes?: string
-- }
--
-- PayStructureService.calculateComponent() reads:
-- 1. calculation_type → Determines which calculation method to use
-- 2. default_rate/default_amount/formula → Gets the value/formula
-- 3. metadata → Additional context for calculation
--
-- PayrollService sets allowanceType:
-- 1. Checks component_code === 'VAKANTIEGELD'
-- 2. Sets allowanceType = 'holiday_allowance'
-- 3. Passes to TaxCalculationService
--
-- TaxCalculationService applies cap:
-- 1. Calls AllowanceService.applyAllowance('holiday_allowance')
-- 2. Checks employee_allowance_usage.used_amount
-- 3. Deducts up to SRD 10,016/year tax-free
-- 4. Remainder is taxable
--
-- ================================================================

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- List all VAKANTIEGELD components by organization
/*
SELECT 
  o.name as organization_name,
  pc.component_code,
  pc.component_name,
  pc.calculation_type,
  pc.default_rate,
  pc.default_amount,
  pc.formula,
  pc.metadata->>'calculation_method' as calculation_method,
  pc.metadata->>'payment_months' as payment_months,
  pc.status
FROM payroll.pay_component pc
JOIN organizations o ON o.id = pc.organization_id
WHERE pc.component_code = 'VAKANTIEGELD'
ORDER BY o.name;
*/

-- Check component configuration for specific organization
/*
SELECT 
  component_code,
  component_name,
  calculation_type,
  CASE 
    WHEN calculation_type = 'percentage' THEN 'Rate: ' || default_rate || '%'
    WHEN calculation_type = 'fixed_amount' THEN 'Amount: SRD ' || default_amount
    WHEN calculation_type = 'formula' THEN 'Formula: ' || formula
  END as calculation_details,
  metadata
FROM payroll.pay_component
WHERE organization_id = '{organization_id}'
  AND component_code = 'VAKANTIEGELD';
*/

-- ================================================================
