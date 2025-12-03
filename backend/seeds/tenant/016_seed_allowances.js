/**
 * Seed: Allowances
 * Source: seed-allowances.sql
 * 
 * Seeds Suriname tax-free allowances and deductions:
 * - Tax-free sums (annual and monthly)
 * - Holiday allowances (vakantiegeld)
 * - Bonus/Gratuity allowances
 * - Child allowances
 * - Exchange rate compensation
 * - Pension payments
 * - Anniversary benefits
 * - Deductible costs (standard deduction)
 */

export async function seed(knex) {
  // Check if payroll schema exists
  const payrollSchemaExists = await knex.raw(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'payroll'
  `);

  if (payrollSchemaExists.rows.length === 0) {
    console.log('[SKIP] Payroll schema not found. Skipping allowances seed.');
    return;
  }

  // Get all organizations
  const organizations = await knex('organizations').select('id', 'name');

  for (const org of organizations) {
    const orgId = org.id;

    console.log(`[INFO] Seeding allowances for organization: ${org.name}`);

    // Check if allowance table exists
    const allowanceTableExists = await knex.raw(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'payroll' AND table_name = 'allowance'
    `);

    if (allowanceTableExists.rows.length === 0) {
      console.log('[WARN] Allowance table not found. Skipping allowances.');
      continue;
    }

    // ============================================================================
    // TAX-FREE SUMS
    // ============================================================================
    
    // Tax-free sum 2025
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'tax_free_sum_annual', 'Tax Free Sum 2025 (Annual)', 'SR',
         108000, FALSE, '2025-01-01', '2025-12-31',
         'Tax free sum per year: SRD 108,000', TRUE),
        (?, 'tax_free_sum_monthly', 'Tax Free Sum 2025 (Monthly)', 'SR',
         9000, FALSE, '2025-01-01', '2025-12-31',
         'Tax free sum per month: SRD 9,000', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId, orgId]);

    // Tax-free sum 2024
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'tax_free_sum_annual', 'Tax Free Sum 2024 (Annual)', 'SR',
         90000, FALSE, '2024-01-01', '2024-12-31',
         'Tax free sum per year: SRD 90,000', TRUE),
        (?, 'tax_free_sum_monthly', 'Tax Free Sum 2024 (Monthly)', 'SR',
         7500, FALSE, '2024-01-01', '2024-12-31',
         'Tax free sum per month: SRD 7,500', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId, orgId]);

    // ============================================================================
    // HOLIDAY ALLOWANCES
    // ============================================================================
    
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'holiday_allowance', 'Holiday Allowance 2025', 'SR',
         19500, FALSE, '2025-01-01', '2025-12-31',
         'Holiday allowances up to one monthly wage, max SRD 19,500/year', TRUE),
        (?, 'holiday_allowance', 'Holiday Allowance 2024', 'SR',
         10016, FALSE, '2024-01-01', '2024-12-31',
         'Holiday allowances up to one monthly wage, max SRD 10,016/year', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId, orgId]);

    // ============================================================================
    // BONUS/GRATUITY ALLOWANCES
    // ============================================================================
    
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'bonus_gratuity', 'Bonus/Gratuity 2025', 'SR',
         19500, FALSE, '2025-01-01', '2025-12-31',
         'Gratuities and bonuses up to one monthly wage, max SRD 19,500/year', TRUE),
        (?, 'bonus_gratuity', 'Bonus/Gratuity 2024', 'SR',
         10016, FALSE, '2024-01-01', '2024-12-31',
         'Gratuities and bonuses up to one monthly wage, max SRD 10,016/year', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId, orgId]);

    // ============================================================================
    // CHILD ALLOWANCES
    // ============================================================================
    
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'child_allowance', 'Child Allowance', 'SR',
         125, FALSE, '2021-07-01', NULL,
         'Child allowance: SRD 125/child/month, max SRD 500 (4 children)', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId]);

    // ============================================================================
    // EXCHANGE RATE COMPENSATION
    // ============================================================================
    
    await knex.raw(`
      INSERT INTO payroll.allowance (
        organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, effective_to, description, is_active
      ) VALUES
        (?, 'exchange_rate_compensation', 'Exchange Rate Compensation', 'SR',
         800, FALSE, '2022-01-01', '2025-12-31',
         'Exchange rate compensation: up to SRD 800/month', TRUE)
      ON CONFLICT DO NOTHING
    `, [orgId]);

    console.log(`  ✓ Allowances seeded for ${org.name}`);
  }

  // ============================================================================
  // DEDUCTIBLE COSTS (GLOBAL FOR ALL ORGANIZATIONS)
  // ============================================================================
  
  console.log('[INFO] Seeding deductible costs...');

  // Check if deductible_cost_rule table exists
  const deductibleTableExists = await knex.raw(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'payroll' AND table_name = 'deductible_cost_rule'
  `);

  if (deductibleTableExists.rows.length > 0) {
    for (const org of organizations) {
      const orgId = org.id;

      // Standard Deduction 2024-2025
      await knex.raw(`
        INSERT INTO payroll.deductible_cost_rule (
          organization_id, cost_type, cost_name, country,
          amount, is_percentage, max_deduction,
          effective_from, effective_to, description
        ) VALUES (?, 'standard_deduction', 'Standard Deductible Costs 2024-2025', 'SR',
          4, TRUE, 4800,
          '2024-01-01', NULL,
          'Standard deductible costs: 4% of wages with max SRD 4,800/year')
        ON CONFLICT DO NOTHING
      `, [orgId]);

      // Standard Deduction 2023
      await knex.raw(`
        INSERT INTO payroll.deductible_cost_rule (
          organization_id, cost_type, cost_name, country,
          amount, is_percentage, max_deduction,
          effective_from, effective_to, description
        ) VALUES (?, 'standard_deduction', 'Standard Deductible Costs 2023', 'SR',
          4, TRUE, 1200,
          '2023-01-01', '2023-12-31',
          'Standard deductible costs: 4% of wages with max SRD 1,200/year')
        ON CONFLICT DO NOTHING
      `, [orgId]);
    }

    console.log('  ✓ Deductible costs seeded for all organizations');
  }

  console.log('[OK] Allowances seed completed successfully');
}
