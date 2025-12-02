/**
 * Seed: Suriname Tax Rules
 * Source: seed-suriname-tax-rules.sql
 * 
 * Seeds Suriname wage tax rules, brackets, allowances, and deductible costs
 * based on the Wage Tax Act:
 * 
 * Includes:
 * - Wage Tax (Normal rates, Lump sum benefits, Overtime)
 * - Tax-free sums and deductible costs
 * - Tax brackets for years 2021-2025
 * - Holiday and gratuity allowances
 * - Exchange rate compensation
 * - Benefits in kind valuations
 * - AOV (Old Age Pension) - 4% flat rate
 * - AWW (General Widow and Orphan) - 1% flat rate
 * 
 * Reference: https://fiscleconsultancy.com/2025/07/23/wage-tax/
 */

export async function seed(knex) {
  // Check if payroll schema exists
  const payrollSchemaExists = await knex.raw(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'payroll'
  `);

  if (payrollSchemaExists.rows.length === 0) {
    console.log('[SKIP] Payroll schema not found. Skipping Suriname tax rules seed.');
    return;
  }

  // Get the Test Company organization ID (used by payroll@testcompany.com)
  const org = await knex('organizations').where('name', 'Test Company Ltd').first();
  
  if (!org) {
    console.log('[WARN] Test Company Ltd organization not found. Skipping tax rules seed.');
    console.log('[INFO] Tax rules will be created when organization is seeded.');
    return;
  }

  const orgId = org.id;
  console.log('[INFO] Starting Suriname tax rules seed...');
  console.log(`Using organization ID: ${orgId}`);

  // ============================================================================
  // 2025 TAX RULES
  // ============================================================================
  
  console.log('[INFO] Seeding 2025 tax rule sets...');

  // 2025 Wage Tax (Annual)
  let taxRuleId;
  const wageTax2025Result = await knex.raw(`
    INSERT INTO payroll.tax_rule_set (
      organization_id, tax_type, tax_name, country,
      effective_from, effective_to, calculation_method, description
    ) VALUES (?, 'wage_tax', 'Suriname Wage Tax 2025', 'SR',
      '2025-01-01', '2025-12-31', 'bracket',
      'Normal wage tax rates for 2025 with progressive brackets')
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId]);

  taxRuleId = wageTax2025Result.rows[0]?.id;
  if (taxRuleId) {
    await knex.raw(`
      INSERT INTO payroll.tax_bracket (organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount) VALUES
        (?, ?, 1, 0, 42000, 8, 0),
        (?, ?, 2, 42000, 84000, 18, 0),
        (?, ?, 3, 84000, 126000, 28, 0),
        (?, ?, 4, 126000, NULL, 38, 0)
    `, [orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId]);
    console.log('  ✓ Created: Suriname Wage Tax 2025');
  }

  // 2025 Wage Tax (Monthly)
  const wageTaxMonthly2025Result = await knex.raw(`
    INSERT INTO payroll.tax_rule_set (
      organization_id, tax_type, tax_name, country,
      effective_from, effective_to, calculation_method, description
    ) VALUES (?, 'wage_tax_monthly', 'Suriname Wage Tax 2025 (Monthly)', 'SR',
      '2025-01-01', '2025-12-31', 'bracket',
      'Monthly wage tax rates for 2025')
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId]);

  taxRuleId = wageTaxMonthly2025Result.rows[0]?.id;
  if (taxRuleId) {
    await knex.raw(`
      INSERT INTO payroll.tax_bracket (organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount) VALUES
        (?, ?, 1, 0, 3500, 8, 0),
        (?, ?, 2, 3500, 7000, 18, 0),
        (?, ?, 3, 7000, 10500, 28, 0),
        (?, ?, 4, 10500, NULL, 38, 0)
    `, [orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId]);
    console.log('  ✓ Created: Suriname Wage Tax 2025 (Monthly)');
  }

  // 2025 Lump Sum Benefits
  const lumpSum2025Result = await knex.raw(`
    INSERT INTO payroll.tax_rule_set (
      organization_id, tax_type, tax_name, country,
      effective_from, effective_to, calculation_method, description
    ) VALUES (?, 'lump_sum_benefits', 'Suriname Lump Sum Benefits 2025', 'SR',
      '2025-01-01', '2025-12-31', 'bracket',
      'Lump sum benefits tax rates for 2025 (requires Inspector approval)')
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId]);

  taxRuleId = lumpSum2025Result.rows[0]?.id;
  if (taxRuleId) {
    await knex.raw(`
      INSERT INTO payroll.tax_bracket (organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount) VALUES
        (?, ?, 1, 0, 42000, 5, 0),
        (?, ?, 2, 42000, 84000, 15, 0),
        (?, ?, 3, 84000, 126000, 25, 0),
        (?, ?, 4, 126000, NULL, 35, 0)
    `, [orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId]);
    console.log('  ✓ Created: Suriname Lump Sum Benefits 2025');
  }

  // 2025 Overtime Tax (July onwards)
  const overtime2025JulyResult = await knex.raw(`
    INSERT INTO payroll.tax_rule_set (
      organization_id, tax_type, tax_name, country,
      effective_from, effective_to, calculation_method, description
    ) VALUES (?, 'overtime', 'Suriname Overtime Tax 2025 (July onwards)', 'SR',
      '2025-07-01', '2025-12-31', 'bracket',
      'Overtime tax rates for July 2025 onwards')
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId]);

  taxRuleId = overtime2025JulyResult.rows[0]?.id;
  if (taxRuleId) {
    await knex.raw(`
      INSERT INTO payroll.tax_bracket (organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount) VALUES
        (?, ?, 1, 0, 2500, 5, 0),
        (?, ?, 2, 2500, 7500, 15, 0),
        (?, ?, 3, 7500, NULL, 25, 0)
    `, [orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId]);
    console.log('  ✓ Created: Suriname Overtime Tax 2025 (July onwards)');
  }

  // 2025 Overtime Tax (Jan-Jun)
  const overtime2025JanResult = await knex.raw(`
    INSERT INTO payroll.tax_rule_set (
      organization_id, tax_type, tax_name, country,
      effective_from, effective_to, calculation_method, description
    ) VALUES (?, 'overtime', 'Suriname Overtime Tax 2025 (Jan-Jun)', 'SR',
      '2025-01-01', '2025-06-30', 'bracket',
      'Overtime tax rates for January to June 2025')
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId]);

  taxRuleId = overtime2025JanResult.rows[0]?.id;
  if (taxRuleId) {
    await knex.raw(`
      INSERT INTO payroll.tax_bracket (organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount) VALUES
        (?, ?, 1, 0, 500, 5, 0),
        (?, ?, 2, 500, 1100, 15, 0),
        (?, ?, 3, 1100, NULL, 25, 0)
    `, [orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId]);
    console.log('  ✓ Created: Suriname Overtime Tax 2025 (Jan-Jun)');
  }

  // 2025 AOV (Old Age Pension) - 4% flat rate
  const aov2025Result = await knex.raw(`
    INSERT INTO payroll.tax_rule_set (
      organization_id, tax_type, tax_name, country,
      effective_from, effective_to, calculation_method, description
    ) VALUES (?, 'aov', 'Suriname AOV 2025', 'SR',
      '2025-01-01', '2025-12-31', 'flat_rate',
      'Old Age Pension (AOV) - 4% flat rate on taxable income')
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId]);

  taxRuleId = aov2025Result.rows[0]?.id;
  if (taxRuleId) {
    await knex.raw(`
      INSERT INTO payroll.tax_bracket (organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount) VALUES
        (?, ?, 1, 0, NULL, 4.00, 0)
    `, [orgId, taxRuleId]);
    console.log('  ✓ Created: Suriname AOV 2025');
  }

  // 2025 AWW (General Widow and Orphan) - 1% flat rate
  const aww2025Result = await knex.raw(`
    INSERT INTO payroll.tax_rule_set (
      organization_id, tax_type, tax_name, country,
      effective_from, effective_to, calculation_method, description
    ) VALUES (?, 'aww', 'Suriname AWW 2025', 'SR',
      '2025-01-01', '2025-12-31', 'flat_rate',
      'General Widow and Orphan Fund (AWW) - 1% flat rate on taxable income')
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId]);

  taxRuleId = aww2025Result.rows[0]?.id;
  if (taxRuleId) {
    await knex.raw(`
      INSERT INTO payroll.tax_bracket (organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount) VALUES
        (?, ?, 1, 0, NULL, 1.00, 0)
    `, [orgId, taxRuleId]);
    console.log('  ✓ Created: Suriname AWW 2025');
  }

  // ============================================================================
  // 2024 TAX RULES
  // ============================================================================
  
  console.log('[INFO] Seeding 2024 tax rule sets...');

  // 2024 Wage Tax (Annual)
  const wageTax2024Result = await knex.raw(`
    INSERT INTO payroll.tax_rule_set (
      organization_id, tax_type, tax_name, country,
      effective_from, effective_to, calculation_method, description
    ) VALUES (?, 'wage_tax', 'Suriname Wage Tax 2024', 'SR',
      '2024-01-01', '2024-12-31', 'bracket',
      'Normal wage tax rates for 2024')
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId]);

  taxRuleId = wageTax2024Result.rows[0]?.id;
  if (taxRuleId) {
    await knex.raw(`
      INSERT INTO payroll.tax_bracket (organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount) VALUES
        (?, ?, 1, 0, 42000, 8, 0),
        (?, ?, 2, 42000, 84000, 18, 0),
        (?, ?, 3, 84000, 126000, 28, 0),
        (?, ?, 4, 126000, NULL, 38, 0)
    `, [orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId]);
    console.log('  ✓ Created: Suriname Wage Tax 2024');
  }

  // 2024 Wage Tax (Monthly)
  const wageTaxMonthly2024Result = await knex.raw(`
    INSERT INTO payroll.tax_rule_set (
      organization_id, tax_type, tax_name, country,
      effective_from, effective_to, calculation_method, description
    ) VALUES (?, 'wage_tax_monthly', 'Suriname Wage Tax 2024 (Monthly)', 'SR',
      '2024-01-01', '2024-12-31', 'bracket',
      'Monthly wage tax rates for 2024')
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId]);

  taxRuleId = wageTaxMonthly2024Result.rows[0]?.id;
  if (taxRuleId) {
    await knex.raw(`
      INSERT INTO payroll.tax_bracket (organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount) VALUES
        (?, ?, 1, 0, 3500, 8, 0),
        (?, ?, 2, 3500, 7000, 18, 0),
        (?, ?, 3, 7000, 10500, 28, 0),
        (?, ?, 4, 10500, NULL, 38, 0)
    `, [orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId]);
    console.log('  ✓ Created: Suriname Wage Tax 2024 (Monthly)');
  }

  // 2024 AOV - 4% flat rate
  const aov2024Result = await knex.raw(`
    INSERT INTO payroll.tax_rule_set (
      organization_id, tax_type, tax_name, country,
      effective_from, effective_to, calculation_method, description
    ) VALUES (?, 'aov', 'Suriname AOV 2024', 'SR',
      '2024-01-01', '2024-12-31', 'flat_rate',
      'Old Age Pension (AOV) - 4% flat rate on taxable income')
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId]);

  taxRuleId = aov2024Result.rows[0]?.id;
  if (taxRuleId) {
    await knex.raw(`
      INSERT INTO payroll.tax_bracket (organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount) VALUES
        (?, ?, 1, 0, NULL, 4.00, 0)
    `, [orgId, taxRuleId]);
    console.log('  ✓ Created: Suriname AOV 2024');
  }

  // 2024 AWW - 1% flat rate
  const aww2024Result = await knex.raw(`
    INSERT INTO payroll.tax_rule_set (
      organization_id, tax_type, tax_name, country,
      effective_from, effective_to, calculation_method, description
    ) VALUES (?, 'aww', 'Suriname AWW 2024', 'SR',
      '2024-01-01', '2024-12-31', 'flat_rate',
      'General Widow and Orphan Fund (AWW) - 1% flat rate on taxable income')
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId]);

  taxRuleId = aww2024Result.rows[0]?.id;
  if (taxRuleId) {
    await knex.raw(`
      INSERT INTO payroll.tax_bracket (organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount) VALUES
        (?, ?, 1, 0, NULL, 1.00, 0)
    `, [orgId, taxRuleId]);
    console.log('  ✓ Created: Suriname AWW 2024');
  }

  // ============================================================================
  // 2023 TAX RULES
  // ============================================================================
  
  console.log('[INFO] Seeding 2023 tax rule sets...');

  // 2023 Wage Tax (Annual)
  const wageTax2023Result = await knex.raw(`
    INSERT INTO payroll.tax_rule_set (
      organization_id, tax_type, tax_name, country,
      effective_from, effective_to, calculation_method, description
    ) VALUES (?, 'wage_tax', 'Suriname Wage Tax 2023', 'SR',
      '2023-01-01', '2023-12-31', 'bracket',
      'Normal wage tax rates for 2023')
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId]);

  taxRuleId = wageTax2023Result.rows[0]?.id;
  if (taxRuleId) {
    await knex.raw(`
      INSERT INTO payroll.tax_bracket (organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount) VALUES
        (?, ?, 1, 0, 11356.80, 8, 0),
        (?, ?, 2, 11356.80, 19273.80, 18, 0),
        (?, ?, 3, 19273.80, 30193.80, 28, 0),
        (?, ?, 4, 30193.80, NULL, 38, 0)
    `, [orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId]);
    console.log('  ✓ Created: Suriname Wage Tax 2023');
  }

  // 2023 Wage Tax (Monthly)
  const wageTaxMonthly2023Result = await knex.raw(`
    INSERT INTO payroll.tax_rule_set (
      organization_id, tax_type, tax_name, country,
      effective_from, effective_to, calculation_method, description
    ) VALUES (?, 'wage_tax_monthly', 'Suriname Wage Tax 2023 (Monthly)', 'SR',
      '2023-01-01', '2023-12-31', 'bracket',
      'Monthly wage tax rates for 2023')
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId]);

  taxRuleId = wageTaxMonthly2023Result.rows[0]?.id;
  if (taxRuleId) {
    await knex.raw(`
      INSERT INTO payroll.tax_bracket (organization_id, tax_rule_set_id, bracket_order, income_min, income_max, rate_percentage, fixed_amount) VALUES
        (?, ?, 1, 0, 946.40, 8, 0),
        (?, ?, 2, 946.40, 1606.15, 18, 0),
        (?, ?, 3, 1606.15, 2516.15, 28, 0),
        (?, ?, 4, 2516.15, NULL, 38, 0)
    `, [orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId, orgId, taxRuleId]);
    console.log('  ✓ Created: Suriname Wage Tax 2023 (Monthly)');
  }

  // ============================================================================
  // DEDUCTIBLE COSTS
  // ============================================================================
  
  console.log('[INFO] Seeding deductible costs...');

  // Check if deductible_cost_rule table exists
  const deductibleTableExists = await knex.raw(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'payroll' AND table_name = 'deductible_cost_rule'
  `);

  if (deductibleTableExists.rows.length > 0) {
    // Standard Deduction 2024-2025
    await knex.raw(`
      INSERT INTO payroll.deductible_cost_rule (
        organization_id, cost_type, cost_name, country,
        amount, is_percentage, max_deduction,
        effective_from, effective_to, description
      ) VALUES (?, 'standard_deduction', 'Standard Deductible Costs 2024-2025', 'SR',
        4, TRUE, 4800,
        '2024-01-01', NULL,
        'Standard deductible costs: 4% of wages with a maximum of SRD 4,800 per year (effective from January 1, 2024)')
      ON CONFLICT DO NOTHING
    `, [orgId]);
    console.log('  ✓ Created: Standard Deductible Costs 2024-2025');

    // Standard Deduction 2023
    await knex.raw(`
      INSERT INTO payroll.deductible_cost_rule (
        organization_id, cost_type, cost_name, country,
        amount, is_percentage, max_deduction,
        effective_from, effective_to, description
      ) VALUES (?, 'standard_deduction', 'Standard Deductible Costs 2023', 'SR',
        4, TRUE, 1200,
        '2023-01-01', '2023-12-31',
        'Standard deductible costs: 4% of wages with a maximum of SRD 1,200 per year (up to December 31, 2023)')
      ON CONFLICT DO NOTHING
    `, [orgId]);
    console.log('  ✓ Created: Standard Deductible Costs 2023');
  }

  // ============================================================================
  // ALLOWANCES
  // ============================================================================
  
  console.log('[INFO] Seeding allowances...');

  // Check if allowance table exists
  const allowanceTableExists = await knex.raw(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'payroll' AND table_name = 'allowance'
  `);

  if (allowanceTableExists.rows.length > 0) {
    // Tax-free sum 2025
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'tax_free_sum_annual', 'Tax Free Sum 2025 (Annual)', 'SR',
         108000, FALSE, '2025-01-01', '2025-12-31',
         'Tax free sum per year up to and including December 31, 2025: SRD 108,000', TRUE),
        (?, 'tax_free_sum_monthly', 'Tax Free Sum 2025 (Monthly)', 'SR',
         9000, FALSE, '2025-01-01', '2025-12-31',
         'Tax free sum per month up to and including December 31, 2025: SRD 9,000', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId, orgId]);
    console.log('  ✓ Created: Tax Free Sum 2025');

    // Tax-free sum 2023-2024
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'tax_free_sum_annual', 'Tax Free Sum 2023-2024 (Annual)', 'SR',
         90000, FALSE, '2023-01-01', '2024-12-31',
         'Tax free sum per year for 2023-2024: SRD 90,000', TRUE),
        (?, 'tax_free_sum_monthly', 'Tax Free Sum 2023-2024 (Monthly)', 'SR',
         7500, FALSE, '2023-01-01', '2024-12-31',
         'Tax free sum per month for 2023-2024: SRD 7,500', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId, orgId]);
    console.log('  ✓ Created: Tax Free Sum 2023-2024');

    // Holiday allowances
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'holiday_allowance', 'Holiday Allowance 2025', 'SR',
         19500, FALSE, '2025-01-01', '2025-12-31',
         'Holiday allowances up to one monthly wage, with a maximum per year of SRD 19,500 for 2025', TRUE),
        (?, 'holiday_allowance', 'Holiday Allowance 2023-2024', 'SR',
         10016, FALSE, '2023-01-01', '2024-12-31',
         'Holiday allowances up to one monthly wage, with a maximum per year of SRD 10,016 for 2023-2024', TRUE),
        (?, 'holiday_allowance', 'Holiday Allowance 2022', 'SR',
         6516, FALSE, '2022-01-01', '2022-12-31',
         'Holiday allowances up to one monthly wage, with a maximum per year of SRD 6,516 for 2022', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId, orgId, orgId]);
    console.log('  ✓ Created: Holiday Allowances');

    // Gratuities and bonuses
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'bonus_gratuity', 'Bonus/Gratuity 2025', 'SR',
         19500, FALSE, '2025-01-01', '2025-12-31',
         'Gratuities and bonuses up to one monthly wage, with a maximum per year of SRD 19,500 for 2025', TRUE),
        (?, 'bonus_gratuity', 'Bonus/Gratuity 2023-2024', 'SR',
         10016, FALSE, '2023-01-01', '2024-12-31',
         'Gratuities and bonuses up to one monthly wage, with a maximum per year of SRD 10,016 for 2023-2024', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId, orgId]);
    console.log('  ✓ Created: Bonus/Gratuity Allowances');

    // Child allowances
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'child_allowance', 'Child Allowance 2021 onwards', 'SR',
         125, FALSE, '2021-07-01', NULL,
         'Child allowance from July 2021: up to SRD 125 per child per month with a maximum of SRD 500 (4 children) per month', TRUE),
        (?, 'child_allowance', 'Child Allowance Jan-Jun 2021', 'SR',
         75, FALSE, '2021-01-01', '2021-06-30',
         'Child allowance Jan-Jun 2021: up to SRD 75 per child per month with a maximum of SRD 300 (4 children) per month', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId, orgId]);
    console.log('  ✓ Created: Child Allowances');

    // Exchange rate compensation
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'exchange_rate_compensation', 'Exchange Rate Compensation 2022-2025', 'SR',
         800, FALSE, '2022-01-01', '2025-12-31',
         'Exchange rate compensation for 2022-2025: up to SRD 800 per month', TRUE),
        (?, 'exchange_rate_compensation', 'Exchange Rate Compensation Sep-Dec 2021', 'SR',
         800, FALSE, '2021-09-01', '2021-12-31',
         'Exchange rate compensation Sep-Dec 2021: maximum of SRD 800 per month', TRUE),
        (?, 'exchange_rate_compensation', 'Exchange Rate Compensation Jan-Aug 2021', 'SR',
         100, FALSE, '2021-01-01', '2021-08-31',
         'Exchange rate compensation Jan-Aug 2021: up to SRD 100 per month', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId, orgId, orgId]);
    console.log('  ✓ Created: Exchange Rate Compensation');

    // Pension payments
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'pension_payment', 'Pension Payment Mar-Dec 2025', 'SR',
         4500, FALSE, '2025-03-01', '2025-12-31',
         'Pension payment (twice AOV amount) from March 2025: SRD 2,250 x 2 = SRD 4,500 per month', TRUE),
        (?, 'pension_payment', 'Pension Payment Jan-Feb 2025', 'SR',
         3500, FALSE, '2025-01-01', '2025-02-28',
         'Pension payment (twice AOV amount) Jan-Feb 2025: SRD 1,750 x 2 = SRD 3,500 per month', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId, orgId]);
    console.log('  ✓ Created: Pension Payments');

    // Anniversary benefits
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'anniversary_10_years', 'Anniversary Benefit 10 Years', 'SR',
         25, TRUE, '2021-01-01', NULL,
         'Anniversary benefit for 10 years: a quarter of the wages over a month (25%)', TRUE),
        (?, 'anniversary_15_years', 'Anniversary Benefit 15 Years', 'SR',
         50, TRUE, '2021-01-01', NULL,
         'Anniversary benefit for 15 years: half of the wages over a month (50%)', TRUE),
        (?, 'anniversary_20_years', 'Anniversary Benefit 20 Years', 'SR',
         75, TRUE, '2021-01-01', NULL,
         'Anniversary benefit for 20 years: three-quarters of the wages over a month (75%)', TRUE),
        (?, 'anniversary_25_years', 'Anniversary Benefit 25 Years', 'SR',
         100, TRUE, '2021-01-01', NULL,
         'Anniversary benefit for 25 years: one-month wages (100%)', TRUE),
        (?, 'anniversary_30_years', 'Anniversary Benefit 30 Years', 'SR',
         150, TRUE, '2021-01-01', NULL,
         'Anniversary benefit for 30 years: one and a half times the wages over a month (150%)', TRUE),
        (?, 'anniversary_35_years', 'Anniversary Benefit 35 Years', 'SR',
         200, TRUE, '2021-01-01', NULL,
         'Anniversary benefit for 35 years: two times the wages over a month (200%)', TRUE),
        (?, 'anniversary_40_years', 'Anniversary Benefit 40 Years', 'SR',
         300, TRUE, '2021-01-01', NULL,
         'Anniversary benefit for 40 years: three times the wages over a month (300%)', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId, orgId, orgId, orgId, orgId, orgId, orgId]);
    console.log('  ✓ Created: Anniversary Benefits');
  }

  // ============================================================================
  // SET CALCULATION MODES
  // ============================================================================
  
  console.log('[INFO] Configuring calculation modes...');

  // Set proportional_distribution for all progressive wage taxes (bracket method)
  await knex.raw(`
    UPDATE payroll.tax_rule_set 
    SET calculation_mode = 'proportional_distribution'
    WHERE organization_id = ?
      AND country = 'SR'
      AND calculation_method = 'bracket'
      AND tax_type IN ('wage_tax', 'wage_tax_monthly', 'lump_sum_benefits', 'overtime')
  `, [orgId]);
  console.log('  ✓ Set progressive taxes to proportional_distribution mode');

  // Set component_based for flat-rate taxes (AOV, AWW)
  await knex.raw(`
    UPDATE payroll.tax_rule_set 
    SET calculation_mode = 'component_based'
    WHERE organization_id = ?
      AND country = 'SR'
      AND calculation_method = 'flat_rate'
      AND tax_type IN ('aov', 'aww')
  `, [orgId]);
  console.log('  ✓ Set flat-rate taxes (AOV, AWW) to component_based mode');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  
  console.log('');
  console.log('[OK] Suriname tax rules seed complete!');
  console.log('[INFO] Reference: https://fiscleconsultancy.com/2025/07/23/wage-tax/');
  console.log('');
}
