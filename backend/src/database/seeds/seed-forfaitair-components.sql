/**
 * Forfaitair Components Library - Based on Surinamese Wet Loonbelasting
 * 
 * Implements forfaitaire (flat-rate) benefits as defined in the Surinamese tax law.
 * These components calculate taxable benefits automatically based on legal formulas.
 * 
 * Legal References:
 * - Article 4: Forfaitaire valuations for benefits-in-kind
 * - Article 10: Exclusions from taxable income
 * - Article 11: Valuation of non-cash benefits
 * 
 * Component Types:
 * 1. Company Car Benefits (Article 4.1) - 2% annual catalog value
 * 2. Free Medical Treatment (Article 4.3) - 3% salary, max SRD 200/year
 * 3. Free Housing (Article 4.4) - 7.5% annual salary
 * 4. Meal Benefits (Article 4.5-7) - Fixed daily rates
 * 5. Utilities (Article 4.8) - Actual costs
 * 
 * Architecture:
 * - Components use formula-based calculation (automatic)
 * - Formulas reference employee variables (annual_salary, car_value, etc.)
 * - Configuration JSONB allows employee-specific overrides when needed
 * - No custom_amount required at assignment (calculated at payroll run)
 * 
 * Usage:
 *   Run during database setup - creates components for test organization
 *   Components are organization-specific templates
 *   Organizations can clone and customize as needed
 */

BEGIN;

-- Get the test organization ID
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get test organization
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'test-company';
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Test organization not found. Run seed-test-tenant.sql first.';
  END IF;

  -- ================================================================
  -- 1. COMPANY CAR BENEFIT (Article 4.1)
  -- "Auto van de zaak: 2% van de cataloguswaarde per jaar"
  -- ================================================================

  INSERT INTO payroll.pay_component (
    id,
    organization_id,
    component_code,
    component_name,
    component_type,
    category,
    calculation_type,
    formula,
    is_taxable,
    is_recurring,
    is_system_component,
    gaap_category,
    default_currency,
    description,
    metadata,
    status
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    'FORFAIT_COMPANY_CAR',
    'Auto van de Zaak (2% Forfait)',
    'earning',
    'benefit_forfait',
    'formula',
    'car_catalog_value * 0.02 / 12', -- Monthly: 2% annually ÷ 12
    true, -- Taxable
    true, -- Recurring monthly
    true, -- System component
    'benefits',
    'SRD',
    'Company car benefit - 2% annual catalog value per Surinamese tax law Article 4.1. Monthly taxable benefit calculated automatically.',
    jsonb_build_object(
      'legal_reference', 'Wet Loonbelasting Article 4.1',
      'forfait_type', 'company_car',
      'annual_rate', 0.02,
      'calculation_basis', 'catalog_value',
      'required_variables', jsonb_build_array('car_catalog_value'),
      'example', 'Car value SRD 200,000 → Monthly benefit: SRD 333.33',
      'assignment_note', 'Assign to employee and set car_catalog_value in configuration JSONB'
    ),
    'active'
  );

  -- ================================================================
  -- 2. FREE MEDICAL TREATMENT (Article 4.3)
  -- "Vrije geneeskundige behandeling: 3% van jaarloon, max SRD 200/jaar"
  -- ================================================================

  INSERT INTO payroll.pay_component (
    id,
    organization_id,
    component_code,
    component_name,
    component_type,
    category,
    calculation_type,
    formula,
    is_taxable,
    is_recurring,
    is_system_component,
    gaap_category,
    default_currency,
    description,
    metadata,
    status
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    'FORFAIT_MEDICAL_TREATMENT',
    'Vrije Geneeskundige Behandeling (3% Forfait)',
    'earning',
    'benefit_forfait',
    'formula',
    'MIN(annual_salary * 0.03, 200) / 12', -- Monthly: capped at SRD 200/year
    true,
    true,
    true,
    'benefits',
    'SRD',
    'Free medical treatment benefit - 3% of annual salary, capped at SRD 200/year per Article 4.3. Auto-calculates from employee salary.',
    jsonb_build_object(
      'legal_reference', 'Wet Loonbelasting Article 4.3',
      'forfait_type', 'medical_treatment',
      'annual_rate', 0.03,
      'annual_cap', 200,
      'calculation_basis', 'annual_salary',
      'required_variables', jsonb_build_array('annual_salary'),
      'example', 'Salary SRD 60,000/year → 3% = SRD 1,800 → Capped at SRD 200 → Monthly: SRD 16.67',
      'assignment_note', 'No custom amount needed - automatically calculated from employee base salary'
    ),
    'active'
  );

  -- ================================================================
  -- 3. FREE HOUSING (Article 4.4)
  -- "Vrije woning: 7.5% van jaarloon"
  -- ================================================================

  INSERT INTO payroll.pay_component (
    id,
    organization_id,
    component_code,
    component_name,
    component_type,
    category,
    calculation_type,
    formula,
    is_taxable,
    is_recurring,
    is_system_component,
    gaap_category,
    default_currency,
    description,
    metadata,
    status
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    'FORFAIT_FREE_HOUSING',
    'Vrije Woning (7.5% Forfait)',
    'earning',
    'benefit_forfait',
    'formula',
    'annual_salary * 0.075 / 12', -- Monthly: 7.5% annually ÷ 12
    true,
    true,
    true,
    'benefits',
    'SRD',
    'Free housing benefit - 7.5% of annual salary per Article 4.4. Auto-calculates from employee salary.',
    jsonb_build_object(
      'legal_reference', 'Wet Loonbelasting Article 4.4',
      'forfait_type', 'free_housing',
      'annual_rate', 0.075,
      'calculation_basis', 'annual_salary',
      'required_variables', jsonb_build_array('annual_salary'),
      'example', 'Salary SRD 60,000/year → 7.5% = SRD 4,500/year → Monthly: SRD 375',
      'assignment_note', 'No custom amount needed - automatically calculated from employee base salary'
    ),
    'active'
  );

  -- ================================================================
  -- 4. MEAL BENEFITS (Article 4.5-7)
  -- "Kost en inwoning: SRD 10/dag"
  -- "Inwoning alleen: SRD 5/dag"
  -- "Warme maaltijd: SRD 5"
  -- "Broodmaaltijd: SRD 1.50"
  -- ================================================================

  -- Full Board (meals + lodging)
  INSERT INTO payroll.pay_component (
    id,
    organization_id,
    component_code,
    component_name,
    component_type,
    category,
    calculation_type,
    formula,
    is_taxable,
    is_recurring,
    is_system_component,
    gaap_category,
    default_currency,
    description,
    metadata,
    status
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    'FORFAIT_FULL_BOARD',
    'Kost en Inwoning (SRD 10/dag)',
    'earning',
    'benefit_forfait',
    'formula',
    'days_with_board * 10', -- Per day rate × days
    true,
    false, -- Not automatically recurring (usage-based)
    true,
    'benefits',
    'SRD',
    'Full board (meals + lodging) - SRD 10 per day per Article 4.5. Calculate based on actual days.',
    jsonb_build_object(
      'legal_reference', 'Wet Loonbelasting Article 4.5',
      'forfait_type', 'full_board',
      'daily_rate', 10.00,
      'calculation_basis', 'days_provided',
      'required_variables', jsonb_build_array('days_with_board'),
      'example', '20 days × SRD 10 = SRD 200/month',
      'assignment_note', 'Set days_with_board in configuration JSONB (typically work days in month)'
    ),
    'active'
  );

  -- Lodging Only
  INSERT INTO payroll.pay_component (
    id,
    organization_id,
    component_code,
    component_name,
    component_type,
    category,
    calculation_type,
    formula,
    is_taxable,
    is_recurring,
    is_system_component,
    gaap_category,
    default_currency,
    description,
    metadata,
    status
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    'FORFAIT_LODGING',
    'Inwoning (SRD 5/dag)',
    'earning',
    'benefit_forfait',
    'formula',
    'days_with_lodging * 5', -- Per day rate × days
    true,
    false,
    true,
    'benefits',
    'SRD',
    'Lodging only (no meals) - SRD 5 per day per Article 4.6. Calculate based on actual days.',
    jsonb_build_object(
      'legal_reference', 'Wet Loonbelasting Article 4.6',
      'forfait_type', 'lodging_only',
      'daily_rate', 5.00,
      'calculation_basis', 'days_provided',
      'required_variables', jsonb_build_array('days_with_lodging'),
      'example', '20 days × SRD 5 = SRD 100/month'
    ),
    'active'
  );

  -- Hot Meal (Warme maaltijd)
  INSERT INTO payroll.pay_component (
    id,
    organization_id,
    component_code,
    component_name,
    component_type,
    category,
    calculation_type,
    formula,
    is_taxable,
    is_recurring,
    is_system_component,
    gaap_category,
    default_currency,
    description,
    metadata,
    status
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    'FORFAIT_HOT_MEAL',
    'Warme Maaltijd (SRD 5)',
    'earning',
    'benefit_forfait',
    'formula',
    'meal_count * 5', -- Per meal rate × count
    true,
    false,
    true,
    'benefits',
    'SRD',
    'Hot meal benefit - SRD 5 per meal per Article 4.7. Calculate based on actual meals provided.',
    jsonb_build_object(
      'legal_reference', 'Wet Loonbelasting Article 4.7',
      'forfait_type', 'hot_meal',
      'per_meal_rate', 5.00,
      'calculation_basis', 'meals_provided',
      'required_variables', jsonb_build_array('meal_count'),
      'example', '20 meals × SRD 5 = SRD 100/month'
    ),
    'active'
  );

  -- Cold Meal (Broodmaaltijd)
  INSERT INTO payroll.pay_component (
    id,
    organization_id,
    component_code,
    component_name,
    component_type,
    category,
    calculation_type,
    formula,
    is_taxable,
    is_recurring,
    is_system_component,
    gaap_category,
    default_currency,
    description,
    metadata,
    status
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    'FORFAIT_COLD_MEAL',
    'Broodmaaltijd (SRD 1.50)',
    'earning',
    'benefit_forfait',
    'formula',
    'meal_count * 1.5', -- Per meal rate × count
    true,
    false,
    true,
    'benefits',
    'SRD',
    'Cold meal/sandwich benefit - SRD 1.50 per meal per Article 4.7. Calculate based on actual meals provided.',
    jsonb_build_object(
      'legal_reference', 'Wet Loonbelasting Article 4.7',
      'forfait_type', 'cold_meal',
      'per_meal_rate', 1.50,
      'calculation_basis', 'meals_provided',
      'required_variables', jsonb_build_array('meal_count'),
      'example', '20 meals × SRD 1.50 = SRD 30/month'
    ),
    'active'
  );

  -- ================================================================
  -- 5. UTILITIES (Article 4.8)
  -- "Gas, licht, water: werkelijke kosten"
  -- ================================================================

  INSERT INTO payroll.pay_component (
    id,
    organization_id,
    component_code,
    component_name,
    component_type,
    category,
    calculation_type,
    formula,
    is_taxable,
    is_recurring,
    is_system_component,
    gaap_category,
    default_currency,
    description,
    metadata,
    status
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    'FORFAIT_UTILITIES',
    'Gas, Licht, Water (Werkelijke Kosten)',
    'earning',
    'benefit_forfait',
    'formula',
    'utility_cost', -- Actual monthly cost
    true,
    true,
    true,
    'benefits',
    'SRD',
    'Utilities benefit (gas, electricity, water) - actual cost per Article 4.8. Set actual monthly cost in configuration.',
    jsonb_build_object(
      'legal_reference', 'Wet Loonbelasting Article 4.8',
      'forfait_type', 'utilities',
      'calculation_basis', 'actual_cost',
      'required_variables', jsonb_build_array('utility_cost'),
      'example', 'Actual utility bill SRD 150/month',
      'assignment_note', 'Set utility_cost in configuration JSONB based on actual bills'
    ),
    'active'
  );


  RAISE NOTICE 'Successfully seeded % forfaitaire components for organization %', 
    (SELECT COUNT(*) FROM payroll.pay_component WHERE organization_id = v_org_id AND metadata->>'forfait_type' IS NOT NULL),
    (SELECT name FROM organizations WHERE id = v_org_id);

END $$;

COMMIT;

-- ================================================================
-- VERIFICATION & SUMMARY
-- ================================================================

DO $$
DECLARE
  v_org_id UUID;
  v_component_count INTEGER;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'test-company';
  
  SELECT COUNT(*) INTO v_component_count 
  FROM payroll.pay_component 
  WHERE organization_id = v_org_id 
    AND metadata->>'forfait_type' IS NOT NULL;

  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'FORFAITAIRE COMPONENTS SEEDED SUCCESSFULLY';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Organization: %', (SELECT name FROM organizations WHERE id = v_org_id);
  RAISE NOTICE 'Total Components: %', v_component_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Components by Category:';
  RAISE NOTICE '  1. Company Car (Article 4.1)         : 1 component';
  RAISE NOTICE '  2. Medical Treatment (Article 4.3)   : 1 component';
  RAISE NOTICE '  3. Free Housing (Article 4.4)        : 1 component';
  RAISE NOTICE '  4. Meal Benefits (Article 4.5-7)     : 4 components';
  RAISE NOTICE '  5. Utilities (Article 4.8)           : 1 component';
  RAISE NOTICE '';
  RAISE NOTICE 'Key Features:';
  RAISE NOTICE '  ✓ Formula-based automatic calculation';
  RAISE NOTICE '  ✓ No custom_amount required at assignment';
  RAISE NOTICE '  ✓ References employee salary/variables from JSONB';
  RAISE NOTICE '  ✓ Legal compliance with Wet Loonbelasting';
  RAISE NOTICE '  ✓ System-protected components (cant be deleted)';
  RAISE NOTICE '';
  RAISE NOTICE 'Assignment Instructions:';
  RAISE NOTICE '  1. Assign component to employee via employee_pay_component_assignment';
  RAISE NOTICE '  2. Set required variables in configuration JSONB if needed';
  RAISE NOTICE '  3. Payroll run will calculate amount automatically';
  RAISE NOTICE '';
  RAISE NOTICE 'Example Assignment (Company Car):';
  RAISE NOTICE '  INSERT INTO payroll.employee_pay_component_assignment (';
  RAISE NOTICE '    employee_id, component_id, component_code,';
  RAISE NOTICE '    configuration, effective_from';
  RAISE NOTICE '  ) VALUES (';
  RAISE NOTICE '    ''employee-uuid'',';
  RAISE NOTICE '    (SELECT id FROM payroll.pay_component WHERE component_code = ''FORFAIT_COMPANY_CAR''),';
  RAISE NOTICE '    ''FORFAIT_COMPANY_CAR'',';
  RAISE NOTICE '    ''{"car_catalog_value": 250000}''::jsonb,';
  RAISE NOTICE '    ''2025-01-01''';
  RAISE NOTICE '  );';
  RAISE NOTICE '';
  RAISE NOTICE 'Example Assignment (Medical - No Config Needed):';
  RAISE NOTICE '  INSERT INTO payroll.employee_pay_component_assignment (';
  RAISE NOTICE '    employee_id, component_id, component_code,';
  RAISE NOTICE '    configuration, effective_from';
  RAISE NOTICE '  ) VALUES (';
  RAISE NOTICE '    ''employee-uuid'',';
  RAISE NOTICE '    (SELECT id FROM payroll.pay_component WHERE component_code = ''FORFAIT_MEDICAL_TREATMENT''),';
  RAISE NOTICE '    ''FORFAIT_MEDICAL_TREATMENT'',';
  RAISE NOTICE '    ''{}''::jsonb,  -- Empty - uses employee base_salary';
  RAISE NOTICE '    ''2025-01-01''';
  RAISE NOTICE '  );';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
END $$;

-- List all seeded components
SELECT 
  component_code,
  component_name,
  calculation_type,
  formula,
  metadata->>'legal_reference' as law_reference,
  metadata->>'forfait_type' as benefit_type,
  is_recurring
FROM payroll.pay_component
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'test-company')
  AND metadata->>'forfait_type' IS NOT NULL
ORDER BY 
  CASE 
    WHEN component_code LIKE '%CAR%' THEN 1
    WHEN component_code LIKE '%MEDICAL%' THEN 2
    WHEN component_code LIKE '%HOUSING%' THEN 3
    WHEN component_code LIKE '%BOARD%' OR component_code LIKE '%MEAL%' OR component_code LIKE '%LODGING%' THEN 4
    WHEN component_code LIKE '%UTILITIES%' THEN 5
    ELSE 6
  END,
  component_code;
