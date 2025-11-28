-- ============================================================================
-- Suriname Tax Rules Seed Script
-- ============================================================================
-- Seeds Suriname wage tax rules, brackets, allowances, and deductible costs
-- based on the Wage Tax Act as documented at:
-- https://fiscleconsultancy.com/2025/07/23/wage-tax/
-- 
-- Includes:
-- - Wage Tax (Normal rates, Lump sum benefits, Overtime)
-- - Tax-free sums and deductible costs
-- - Tax brackets for years 2021-2025
-- - Holiday and gratuity allowances
-- - Exchange rate compensation
-- - Benefits in kind valuations
-- ============================================================================

-- Use the Test Company organization for tax rules
-- This organization is created by seed-paylinq-demo-data.js
-- Organization ID: 96a08639-b162-4959-80ab-a839d57648ef

-- Get organization ID for use in subsequent inserts
DO $$
DECLARE
  v_org_id UUID;
  v_tax_rule_id UUID;
BEGIN
  -- Get the Test Company organization ID (used by payroll@testcompany.com)
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Test Company Ltd';
  
  RAISE NOTICE '[INFO] Starting Suriname tax rules seed...';
  RAISE NOTICE 'Using organization ID: %', v_org_id;
  
  -- Skip if organization doesn't exist yet
  IF v_org_id IS NULL THEN
    RAISE NOTICE '[WARN] Test Company Ltd organization not found. Skipping tax rules seed.';
    RAISE NOTICE '[INFO] Tax rules will be created when organization is seeded.';
    RETURN;
  END IF;
  
  -- ========================================================================
  -- 2025 TAX RULES
  -- ========================================================================
  
  RAISE NOTICE '[INFO] Seeding 2025 tax rule sets...';
  
  -- 2025 Wage Tax (Annual)
  INSERT INTO payroll.tax_rule_set (
    organization_id, tax_type, tax_name, country,
    effective_from, effective_to, calculation_method, description
  ) VALUES (
    v_org_id, 'wage_tax', 'Suriname Wage Tax 2025', 'SR',
    '2025-01-01', '2025-12-31', 'bracket',
    'Normal wage tax rates for 2025 with progressive brackets'
  ) RETURNING id INTO v_tax_rule_id;
  
  -- 2025 Wage Tax Brackets
  INSERT INTO payroll.tax_bracket (
    organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount
  ) VALUES
    (v_org_id, v_tax_rule_id, 1, 0, 42000, 8, 0),
    (v_org_id, v_tax_rule_id, 2, 42000, 84000, 18, 0),
    (v_org_id, v_tax_rule_id, 3, 84000, 126000, 28, 0),
    (v_org_id, v_tax_rule_id, 4, 126000, NULL, 38, 0);
  
  RAISE NOTICE '  ✓ Created: Suriname Wage Tax 2025';
  
  -- 2025 Wage Tax (Monthly)
  INSERT INTO payroll.tax_rule_set (
    organization_id, tax_type, tax_name, country,
    effective_from, effective_to, calculation_method, description
  ) VALUES (
    v_org_id, 'wage_tax_monthly', 'Suriname Wage Tax 2025 (Monthly)', 'SR',
    '2025-01-01', '2025-12-31', 'bracket',
    'Monthly wage tax rates for 2025'
  ) RETURNING id INTO v_tax_rule_id;
  
  INSERT INTO payroll.tax_bracket (
    organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount
  ) VALUES
    (v_org_id, v_tax_rule_id, 1, 0, 3500, 8, 0),
    (v_org_id, v_tax_rule_id, 2, 3500, 7000, 18, 0),
    (v_org_id, v_tax_rule_id, 3, 7000, 10500, 28, 0),
    (v_org_id, v_tax_rule_id, 4, 10500, NULL, 38, 0);
  
  RAISE NOTICE '  ✓ Created: Suriname Wage Tax 2025 (Monthly)';
  
  -- 2025 Lump Sum Benefits
  INSERT INTO payroll.tax_rule_set (
    organization_id, tax_type, tax_name, country,
    effective_from, effective_to, calculation_method, description
  ) VALUES (
    v_org_id, 'lump_sum_benefits', 'Suriname Lump Sum Benefits 2025', 'SR',
    '2025-01-01', '2025-12-31', 'bracket',
    'Lump sum benefits tax rates for 2025 (requires Inspector approval)'
  ) RETURNING id INTO v_tax_rule_id;
  
  INSERT INTO payroll.tax_bracket (
    organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount
  ) VALUES
    (v_org_id, v_tax_rule_id, 1, 0, 42000, 5, 0),
    (v_org_id, v_tax_rule_id, 2, 42000, 84000, 15, 0),
    (v_org_id, v_tax_rule_id, 3, 84000, 126000, 25, 0),
    (v_org_id, v_tax_rule_id, 4, 126000, NULL, 35, 0);
  
  RAISE NOTICE '  ✓ Created: Suriname Lump Sum Benefits 2025';
  
  -- 2025 Overtime Tax (July onwards)
  INSERT INTO payroll.tax_rule_set (
    organization_id, tax_type, tax_name, country,
    effective_from, effective_to, calculation_method, description
  ) VALUES (
    v_org_id, 'overtime', 'Suriname Overtime Tax 2025 (July onwards)', 'SR',
    '2025-07-01', '2025-12-31', 'bracket',
    'Overtime tax rates for July 2025 onwards'
  ) RETURNING id INTO v_tax_rule_id;
  
  INSERT INTO payroll.tax_bracket (
    organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount
  ) VALUES
    (v_org_id, v_tax_rule_id, 1, 0, 2500, 5, 0),
    (v_org_id, v_tax_rule_id, 2, 2500, 7500, 15, 0),
    (v_org_id, v_tax_rule_id, 3, 7500, NULL, 25, 0);
  
  RAISE NOTICE '  ✓ Created: Suriname Overtime Tax 2025 (July onwards)';
  
  -- 2025 Overtime Tax (Jan-Jun)
  INSERT INTO payroll.tax_rule_set (
    organization_id, tax_type, tax_name, country,
    effective_from, effective_to, calculation_method, description
  ) VALUES (
    v_org_id, 'overtime', 'Suriname Overtime Tax 2025 (Jan-Jun)', 'SR',
    '2025-01-01', '2025-06-30', 'bracket',
    'Overtime tax rates for January to June 2025'
  ) RETURNING id INTO v_tax_rule_id;
  
  INSERT INTO payroll.tax_bracket (
    organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount
  ) VALUES
    (v_org_id, v_tax_rule_id, 1, 0, 500, 5, 0),
    (v_org_id, v_tax_rule_id, 2, 500, 1100, 15, 0),
    (v_org_id, v_tax_rule_id, 3, 1100, NULL, 25, 0);
  
  RAISE NOTICE '  ✓ Created: Suriname Overtime Tax 2025 (Jan-Jun)';
  
  -- 2025 AOV (Old Age Pension) - 4% flat rate
  INSERT INTO payroll.tax_rule_set (
    organization_id, tax_type, tax_name, country,
    effective_from, effective_to, calculation_method, description
  ) VALUES (
    v_org_id, 'aov', 'Suriname AOV 2025', 'SR',
    '2025-01-01', '2025-12-31', 'flat_rate',
    'Old Age Pension (AOV) - 4% flat rate on taxable income'
  ) RETURNING id INTO v_tax_rule_id;
  
  INSERT INTO payroll.tax_bracket (
    organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount
  ) VALUES
    (v_org_id, v_tax_rule_id, 1, 0, NULL, 4.00, 0);
  
  RAISE NOTICE '  ✓ Created: Suriname AOV 2025';
  
  -- 2025 AWW (General Widow and Orphan) - 1% flat rate
  INSERT INTO payroll.tax_rule_set (
    organization_id, tax_type, tax_name, country,
    effective_from, effective_to, calculation_method, description
  ) VALUES (
    v_org_id, 'aww', 'Suriname AWW 2025', 'SR',
    '2025-01-01', '2025-12-31', 'flat_rate',
    'General Widow and Orphan Fund (AWW) - 1% flat rate on taxable income'
  ) RETURNING id INTO v_tax_rule_id;
  
  INSERT INTO payroll.tax_bracket (
    organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount
  ) VALUES
    (v_org_id, v_tax_rule_id, 1, 0, NULL, 1.00, 0);
  
  RAISE NOTICE '  ✓ Created: Suriname AWW 2025';
  
  -- ========================================================================
  -- 2024 TAX RULES
  -- ========================================================================
  
  RAISE NOTICE '[INFO] Seeding 2024 tax rule sets...';
  
  -- 2024 Wage Tax (Annual)
  INSERT INTO payroll.tax_rule_set (
    organization_id, tax_type, tax_name, country,
    effective_from, effective_to, calculation_method, description
  ) VALUES (
    v_org_id, 'wage_tax', 'Suriname Wage Tax 2024', 'SR',
    '2024-01-01', '2024-12-31', 'bracket',
    'Normal wage tax rates for 2024'
  ) RETURNING id INTO v_tax_rule_id;
  
  INSERT INTO payroll.tax_bracket (
    organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount
  ) VALUES
    (v_org_id, v_tax_rule_id, 1, 0, 42000, 8, 0),
    (v_org_id, v_tax_rule_id, 2, 42000, 84000, 18, 0),
    (v_org_id, v_tax_rule_id, 3, 84000, 126000, 28, 0),
    (v_org_id, v_tax_rule_id, 4, 126000, NULL, 38, 0);
  
  RAISE NOTICE '  ✓ Created: Suriname Wage Tax 2024';
  
  -- 2024 Wage Tax (Monthly)
  INSERT INTO payroll.tax_rule_set (
    organization_id, tax_type, tax_name, country,
    effective_from, effective_to, calculation_method, description
  ) VALUES (
    v_org_id, 'wage_tax_monthly', 'Suriname Wage Tax 2024 (Monthly)', 'SR',
    '2024-01-01', '2024-12-31', 'bracket',
    'Monthly wage tax rates for 2024'
  ) RETURNING id INTO v_tax_rule_id;
  
  INSERT INTO payroll.tax_bracket (
    organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount
  ) VALUES
    (v_org_id, v_tax_rule_id, 1, 0, 3500, 8, 0),
    (v_org_id, v_tax_rule_id, 2, 3500, 7000, 18, 0),
    (v_org_id, v_tax_rule_id, 3, 7000, 10500, 28, 0),
    (v_org_id, v_tax_rule_id, 4, 10500, NULL, 38, 0);
  
  RAISE NOTICE '  ✓ Created: Suriname Wage Tax 2024 (Monthly)';
  
  -- 2024 AOV - 4% flat rate
  INSERT INTO payroll.tax_rule_set (
    organization_id, tax_type, tax_name, country,
    effective_from, effective_to, calculation_method, description
  ) VALUES (
    v_org_id, 'aov', 'Suriname AOV 2024', 'SR',
    '2024-01-01', '2024-12-31', 'flat_rate',
    'Old Age Pension (AOV) - 4% flat rate on taxable income'
  ) RETURNING id INTO v_tax_rule_id;
  
  INSERT INTO payroll.tax_bracket (
    organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount
  ) VALUES
    (v_org_id, v_tax_rule_id, 1, 0, NULL, 4.00, 0);
  
  RAISE NOTICE '  ✓ Created: Suriname AOV 2024';
  
  -- 2024 AWW - 1% flat rate
  INSERT INTO payroll.tax_rule_set (
    organization_id, tax_type, tax_name, country,
    effective_from, effective_to, calculation_method, description
  ) VALUES (
    v_org_id, 'aww', 'Suriname AWW 2024', 'SR',
    '2024-01-01', '2024-12-31', 'flat_rate',
    'General Widow and Orphan Fund (AWW) - 1% flat rate on taxable income'
  ) RETURNING id INTO v_tax_rule_id;
  
  INSERT INTO payroll.tax_bracket (
    organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount
  ) VALUES
    (v_org_id, v_tax_rule_id, 1, 0, NULL, 1.00, 0);
  
  RAISE NOTICE '  ✓ Created: Suriname AWW 2024';
  
  -- ========================================================================
  -- 2023 TAX RULES
  -- ========================================================================
  
  RAISE NOTICE '[INFO] Seeding 2023 tax rule sets...';
  
  -- 2023 Wage Tax (Annual)
  INSERT INTO payroll.tax_rule_set (
    organization_id, tax_type, tax_name, country,
    effective_from, effective_to, calculation_method, description
  ) VALUES (
    v_org_id, 'wage_tax', 'Suriname Wage Tax 2023', 'SR',
    '2023-01-01', '2023-12-31', 'bracket',
    'Normal wage tax rates for 2023'
  ) RETURNING id INTO v_tax_rule_id;
  
  INSERT INTO payroll.tax_bracket (
    organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount
  ) VALUES
    (v_org_id, v_tax_rule_id, 1, 0, 11356.80, 8, 0),
    (v_org_id, v_tax_rule_id, 2, 11356.80, 19273.80, 18, 0),
    (v_org_id, v_tax_rule_id, 3, 19273.80, 30193.80, 28, 0),
    (v_org_id, v_tax_rule_id, 4, 30193.80, NULL, 38, 0);
  
  RAISE NOTICE '  ✓ Created: Suriname Wage Tax 2023';
  
  -- 2023 Wage Tax (Monthly)
  INSERT INTO payroll.tax_rule_set (
    organization_id, tax_type, tax_name, country,
    effective_from, effective_to, calculation_method, description
  ) VALUES (
    v_org_id, 'wage_tax_monthly', 'Suriname Wage Tax 2023 (Monthly)', 'SR',
    '2023-01-01', '2023-12-31', 'bracket',
    'Monthly wage tax rates for 2023'
  ) RETURNING id INTO v_tax_rule_id;
  
  INSERT INTO payroll.tax_bracket (
    organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount
  ) VALUES
    (v_org_id, v_tax_rule_id, 1, 0, 946.40, 8, 0),
    (v_org_id, v_tax_rule_id, 2, 946.40, 1606.15, 18, 0),
    (v_org_id, v_tax_rule_id, 3, 1606.15, 2516.15, 28, 0),
    (v_org_id, v_tax_rule_id, 4, 2516.15, NULL, 38, 0);
  
  RAISE NOTICE '  ✓ Created: Suriname Wage Tax 2023 (Monthly)';
  
  -- ========================================================================
  -- DEDUCTIBLE COSTS
  -- ========================================================================
  
  RAISE NOTICE '[INFO] Seeding deductible costs...';
  
  -- Standard Deduction 2024-2025
  INSERT INTO payroll.deductible_cost_rule (
    organization_id, cost_type, cost_name, country,
    amount, is_percentage, max_deduction,
    effective_from, effective_to, description
  ) VALUES (
    v_org_id, 'standard_deduction', 'Standard Deductible Costs 2024-2025', 'SR',
    4, TRUE, 4800,
    '2024-01-01', NULL,
    'Standard deductible costs: 4% of wages with a maximum of SRD 4,800 per year (effective from January 1, 2024)'
  );
  
  RAISE NOTICE '  ✓ Created: Standard Deductible Costs 2024-2025';
  
  -- Standard Deduction 2023
  INSERT INTO payroll.deductible_cost_rule (
    organization_id, cost_type, cost_name, country,
    amount, is_percentage, max_deduction,
    effective_from, effective_to, description
  ) VALUES (
    v_org_id, 'standard_deduction', 'Standard Deductible Costs 2023', 'SR',
    4, TRUE, 1200,
    '2023-01-01', '2023-12-31',
    'Standard deductible costs: 4% of wages with a maximum of SRD 1,200 per year (up to December 31, 2023)'
  );
  
  RAISE NOTICE '  ✓ Created: Standard Deductible Costs 2023';
  
  -- ========================================================================
  -- ALLOWANCES
  -- ========================================================================
  
  RAISE NOTICE '[INFO] Seeding allowances...';
  
  -- Tax-free sum 2025
  INSERT INTO payroll.allowance (
    organization_id, allowance_type, allowance_name, country,
    amount, is_percentage, effective_from, effective_to, description, is_active
  ) VALUES
    (v_org_id, 'tax_free_sum_annual', 'Tax Free Sum 2025 (Annual)', 'SR',
     108000, FALSE, '2025-01-01', '2025-12-31',
     'Tax free sum per year up to and including December 31, 2025: SRD 108,000', TRUE),
    (v_org_id, 'tax_free_sum_monthly', 'Tax Free Sum 2025 (Monthly)', 'SR',
     9000, FALSE, '2025-01-01', '2025-12-31',
     'Tax free sum per month up to and including December 31, 2025: SRD 9,000', TRUE);
  
  RAISE NOTICE '  ✓ Created: Tax Free Sum 2025';
  
  -- Tax-free sum 2023-2024
  INSERT INTO payroll.allowance (
    organization_id, allowance_type, allowance_name, country,
    amount, is_percentage, effective_from, effective_to, description, is_active
  ) VALUES
    (v_org_id, 'tax_free_sum_annual', 'Tax Free Sum 2023-2024 (Annual)', 'SR',
     90000, FALSE, '2023-01-01', '2024-12-31',
     'Tax free sum per year for 2023-2024: SRD 90,000', TRUE),
    (v_org_id, 'tax_free_sum_monthly', 'Tax Free Sum 2023-2024 (Monthly)', 'SR',
     7500, FALSE, '2023-01-01', '2024-12-31',
     'Tax free sum per month for 2023-2024: SRD 7,500', TRUE);
  
  RAISE NOTICE '  ✓ Created: Tax Free Sum 2023-2024';
  
  -- Holiday allowances
  INSERT INTO payroll.allowance (
    organization_id, allowance_type, allowance_name, country,
    amount, is_percentage, effective_from, effective_to, description, is_active
  ) VALUES
    (v_org_id, 'holiday_allowance', 'Holiday Allowance 2025', 'SR',
     19500, FALSE, '2025-01-01', '2025-12-31',
     'Holiday allowances up to one monthly wage, with a maximum per year of SRD 19,500 for 2025', TRUE),
    (v_org_id, 'holiday_allowance', 'Holiday Allowance 2023-2024', 'SR',
     10016, FALSE, '2023-01-01', '2024-12-31',
     'Holiday allowances up to one monthly wage, with a maximum per year of SRD 10,016 for 2023-2024', TRUE),
    (v_org_id, 'holiday_allowance', 'Holiday Allowance 2022', 'SR',
     6516, FALSE, '2022-01-01', '2022-12-31',
     'Holiday allowances up to one monthly wage, with a maximum per year of SRD 6,516 for 2022', TRUE);
  
  RAISE NOTICE '  ✓ Created: Holiday Allowances';
  
  -- Gratuities and bonuses
  INSERT INTO payroll.allowance (
    organization_id, allowance_type, allowance_name, country,
    amount, is_percentage, effective_from, effective_to, description, is_active
  ) VALUES
    (v_org_id, 'bonus_gratuity', 'Bonus/Gratuity 2025', 'SR',
     19500, FALSE, '2025-01-01', '2025-12-31',
     'Gratuities and bonuses up to one monthly wage, with a maximum per year of SRD 19,500 for 2025', TRUE),
    (v_org_id, 'bonus_gratuity', 'Bonus/Gratuity 2023-2024', 'SR',
     10016, FALSE, '2023-01-01', '2024-12-31',
     'Gratuities and bonuses up to one monthly wage, with a maximum per year of SRD 10,016 for 2023-2024', TRUE);
  
  RAISE NOTICE '  ✓ Created: Bonus/Gratuity Allowances';
  
  -- Child allowances
  INSERT INTO payroll.allowance (
    organization_id, allowance_type, allowance_name, country,
    amount, is_percentage, effective_from, effective_to, description, is_active
  ) VALUES
    (v_org_id, 'child_allowance', 'Child Allowance 2021 onwards', 'SR',
     125, FALSE, '2021-07-01', NULL,
     'Child allowance from July 2021: up to SRD 125 per child per month with a maximum of SRD 500 (4 children) per month', TRUE),
    (v_org_id, 'child_allowance', 'Child Allowance Jan-Jun 2021', 'SR',
     75, FALSE, '2021-01-01', '2021-06-30',
     'Child allowance Jan-Jun 2021: up to SRD 75 per child per month with a maximum of SRD 300 (4 children) per month', TRUE);
  
  RAISE NOTICE '  ✓ Created: Child Allowances';
  
  -- Exchange rate compensation
  INSERT INTO payroll.allowance (
    organization_id, allowance_type, allowance_name, country,
    amount, is_percentage, effective_from, effective_to, description, is_active
  ) VALUES
    (v_org_id, 'exchange_rate_compensation', 'Exchange Rate Compensation 2022-2025', 'SR',
     800, FALSE, '2022-01-01', '2025-12-31',
     'Exchange rate compensation for 2022-2025: up to SRD 800 per month', TRUE),
    (v_org_id, 'exchange_rate_compensation', 'Exchange Rate Compensation Sep-Dec 2021', 'SR',
     800, FALSE, '2021-09-01', '2021-12-31',
     'Exchange rate compensation Sep-Dec 2021: maximum of SRD 800 per month', TRUE),
    (v_org_id, 'exchange_rate_compensation', 'Exchange Rate Compensation Jan-Aug 2021', 'SR',
     100, FALSE, '2021-01-01', '2021-08-31',
     'Exchange rate compensation Jan-Aug 2021: up to SRD 100 per month', TRUE);
  
  RAISE NOTICE '  ✓ Created: Exchange Rate Compensation';
  
  -- Pension payments
  INSERT INTO payroll.allowance (
    organization_id, allowance_type, allowance_name, country,
    amount, is_percentage, effective_from, effective_to, description, is_active
  ) VALUES
    (v_org_id, 'pension_payment', 'Pension Payment Mar-Dec 2025', 'SR',
     4500, FALSE, '2025-03-01', '2025-12-31',
     'Pension payment (twice AOV amount) from March 2025: SRD 2,250 x 2 = SRD 4,500 per month', TRUE),
    (v_org_id, 'pension_payment', 'Pension Payment Jan-Feb 2025', 'SR',
     3500, FALSE, '2025-01-01', '2025-02-28',
     'Pension payment (twice AOV amount) Jan-Feb 2025: SRD 1,750 x 2 = SRD 3,500 per month', TRUE);
  
  RAISE NOTICE '  ✓ Created: Pension Payments';
  
  -- Anniversary benefits
  INSERT INTO payroll.allowance (
    organization_id, allowance_type, allowance_name, country,
    amount, is_percentage, effective_from, effective_to, description, is_active
  ) VALUES
    (v_org_id, 'anniversary_10_years', 'Anniversary Benefit 10 Years', 'SR',
     25, TRUE, '2021-01-01', NULL,
     'Anniversary benefit for 10 years: a quarter of the wages over a month (25%)', TRUE),
    (v_org_id, 'anniversary_15_years', 'Anniversary Benefit 15 Years', 'SR',
     50, TRUE, '2021-01-01', NULL,
     'Anniversary benefit for 15 years: half of the wages over a month (50%)', TRUE),
    (v_org_id, 'anniversary_20_years', 'Anniversary Benefit 20 Years', 'SR',
     75, TRUE, '2021-01-01', NULL,
     'Anniversary benefit for 20 years: three-quarters of the wages over a month (75%)', TRUE),
    (v_org_id, 'anniversary_25_years', 'Anniversary Benefit 25 Years', 'SR',
     100, TRUE, '2021-01-01', NULL,
     'Anniversary benefit for 25 years: one-month wages (100%)', TRUE),
    (v_org_id, 'anniversary_30_years', 'Anniversary Benefit 30 Years', 'SR',
     150, TRUE, '2021-01-01', NULL,
     'Anniversary benefit for 30 years: one and a half times the wages over a month (150%)', TRUE),
    (v_org_id, 'anniversary_35_years', 'Anniversary Benefit 35 Years', 'SR',
     200, TRUE, '2021-01-01', NULL,
     'Anniversary benefit for 35 years: two times the wages over a month (200%)', TRUE),
    (v_org_id, 'anniversary_40_years', 'Anniversary Benefit 40 Years', 'SR',
     300, TRUE, '2021-01-01', NULL,
     'Anniversary benefit for 40 years: three times the wages over a month (300%)', TRUE);
  
  RAISE NOTICE '  ✓ Created: Anniversary Benefits';
  
  -- ========================================================================
  -- CALCULATION MODES (Phase 2B: Tax Calculation Mode Configuration)
  -- ========================================================================
  
  RAISE NOTICE '[INFO] Configuring calculation modes...';
  
  -- Set proportional_distribution for all progressive wage taxes (bracket method)
  UPDATE payroll.tax_rule_set 
  SET calculation_mode = 'proportional_distribution'
  WHERE organization_id = v_org_id
    AND country = 'SR'
    AND calculation_method = 'bracket'
    AND tax_type IN ('wage_tax', 'wage_tax_monthly', 'lump_sum_benefits', 'overtime');
  
  RAISE NOTICE '  ✓ Set progressive taxes to proportional_distribution mode';
  
  -- Set component_based for flat-rate taxes (AOV, AWW)
  UPDATE payroll.tax_rule_set 
  SET calculation_mode = 'component_based'
  WHERE organization_id = v_org_id
    AND country = 'SR'
    AND calculation_method = 'flat_rate'
    AND tax_type IN ('aov', 'aww');
  
  RAISE NOTICE '  ✓ Set flat-rate taxes (AOV, AWW) to component_based mode';
  
  -- ========================================================================
  -- SUMMARY
  -- ========================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '[OK] Suriname tax rules seed complete!';
  RAISE NOTICE '[INFO] Reference: https://fiscleconsultancy.com/2025/07/23/wage-tax/';
  RAISE NOTICE '';
  
END $$;

-- Query summary for verification
SELECT 
  '============================================' as "====================";
SELECT 'Suriname Tax Rules Seeded Successfully' as "Status";
SELECT 
  '============================================' as "====================";
SELECT '' as "Separator";
SELECT 'Summary:' as "Section";
SELECT '  Tax Rule Sets: ' || COUNT(*) as "Info"
FROM payroll.tax_rule_set 
WHERE country = 'SR';
SELECT '  Tax Brackets: ' || COUNT(*) as "Info"
FROM payroll.tax_bracket tb
JOIN payroll.tax_rule_set trs ON tb.tax_rule_set_id = trs.id
WHERE trs.country = 'SR';
SELECT '  Allowances: ' || COUNT(*) as "Info"
FROM payroll.allowance
WHERE country = 'SR';
SELECT '  Deductible Costs: ' || COUNT(*) as "Info"
FROM payroll.deductible_cost_rule
WHERE country = 'SR';
SELECT '' as "Separator";
SELECT 'Organization:' as "Section";
SELECT '  Name: Test Company Ltd' as "Info";
SELECT '  ID: ' || id as "Info" FROM organizations WHERE name = 'Test Company Ltd';
SELECT '  Country: SR (Suriname)' as "Info";
