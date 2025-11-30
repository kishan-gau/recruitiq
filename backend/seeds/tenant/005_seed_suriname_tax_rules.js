/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Suriname Tax Rules Seed
  // Seeds wage tax rules, brackets, allowances for years 2023-2025
  // Based on Surinamese Wage Tax Act: https://fiscleconsultancy.com/2025/07/23/wage-tax/
  //
  // MULTI-TENANT: Seeds tax rules for EACH organization (tenant isolation)

  const organizations = await knex('organizations').select('id', 'name');

  if (organizations.length === 0) {
    console.log('⚠️  No organizations found. Skipping Suriname tax rules seed.');
    return;
  }

  console.log(`[INFO] Seeding Suriname tax rules for ${organizations.length} organization(s)...`);

  for (const org of organizations) {
    console.log(`\n[INFO] Processing organization: ${org.name} (${org.id})`);

    // ========================================================================
    // 2025 TAX RULES
    // ========================================================================
    console.log('[INFO] Seeding 2025 tax rule sets...');

    // 2025 Wage Tax (Annual)
    const [taxRule2025Annual] = await knex('payroll.tax_rule_set')
      .insert({
        organization_id: org.id,
        tax_type: 'wage_tax',
        tax_name: 'Suriname Wage Tax 2025',
        country: 'SR',
        effective_from: new Date('2025-01-01'),
        effective_to: new Date('2025-12-31'),
        calculation_method: 'bracket',
        description: 'Normal wage tax rates for 2025 with progressive brackets',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('id')
      .onConflict(['organization_id', 'tax_type', 'effective_from'])
      .ignore();

    if (taxRule2025Annual) {
      await knex('payroll.tax_bracket').insert([
        { organization_id: org.id, tax_rule_set_id: taxRule2025Annual.id, bracket_order: 1, income_min: 0, income_max: 42000, rate_percentage: 8, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2025Annual.id, bracket_order: 2, income_min: 42000, income_max: 84000, rate_percentage: 18, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2025Annual.id, bracket_order: 3, income_min: 84000, income_max: 126000, rate_percentage: 28, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2025Annual.id, bracket_order: 4, income_min: 126000, income_max: null, rate_percentage: 38, fixed_amount: 0 }
      ]);
      console.log('  ✓ Created: Suriname Wage Tax 2025 (Annual)');
    }

    // 2025 Wage Tax (Monthly)
    const [taxRule2025Monthly] = await knex('payroll.tax_rule_set')
      .insert({
        organization_id: org.id,
        tax_type: 'wage_tax_monthly',
        tax_name: 'Suriname Wage Tax 2025 (Monthly)',
        country: 'SR',
        effective_from: new Date('2025-01-01'),
        effective_to: new Date('2025-12-31'),
        calculation_method: 'bracket',
        description: 'Monthly wage tax rates for 2025',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('id')
      .onConflict(['organization_id', 'tax_type', 'effective_from'])
      .ignore();

    if (taxRule2025Monthly) {
      await knex('payroll.tax_bracket').insert([
        { organization_id: org.id, tax_rule_set_id: taxRule2025Monthly.id, bracket_order: 1, income_min: 0, income_max: 3500, rate_percentage: 8, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2025Monthly.id, bracket_order: 2, income_min: 3500, income_max: 7000, rate_percentage: 18, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2025Monthly.id, bracket_order: 3, income_min: 7000, income_max: 10500, rate_percentage: 28, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2025Monthly.id, bracket_order: 4, income_min: 10500, income_max: null, rate_percentage: 38, fixed_amount: 0 }
      ]);
      console.log('  ✓ Created: Suriname Wage Tax 2025 (Monthly)');
    }

    // 2025 Lump Sum Benefits
    const [taxRule2025Lump] = await knex('payroll.tax_rule_set')
      .insert({
        organization_id: org.id,
        tax_type: 'lump_sum_benefits',
        tax_name: 'Suriname Lump Sum Benefits 2025',
        country: 'SR',
        effective_from: new Date('2025-01-01'),
        effective_to: new Date('2025-12-31'),
        calculation_method: 'bracket',
        description: 'Lump sum benefits tax rates for 2025 (requires Inspector approval)',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('id')
      .onConflict(['organization_id', 'tax_type', 'effective_from'])
      .ignore();

    if (taxRule2025Lump) {
      await knex('payroll.tax_bracket').insert([
        { organization_id: org.id, tax_rule_set_id: taxRule2025Lump.id, bracket_order: 1, income_min: 0, income_max: 42000, rate_percentage: 5, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2025Lump.id, bracket_order: 2, income_min: 42000, income_max: 84000, rate_percentage: 15, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2025Lump.id, bracket_order: 3, income_min: 84000, income_max: 126000, rate_percentage: 25, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2025Lump.id, bracket_order: 4, income_min: 126000, income_max: null, rate_percentage: 35, fixed_amount: 0 }
      ]);
      console.log('  ✓ Created: Suriname Lump Sum Benefits 2025');
    }

    // 2025 Overtime Tax (July onwards)
    const [taxRule2025OTJul] = await knex('payroll.tax_rule_set')
      .insert({
        organization_id: org.id,
        tax_type: 'overtime',
        tax_name: 'Suriname Overtime Tax 2025 (July onwards)',
        country: 'SR',
        effective_from: new Date('2025-07-01'),
        effective_to: new Date('2025-12-31'),
        calculation_method: 'bracket',
        description: 'Overtime tax rates for July 2025 onwards',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('id')
      .onConflict(['organization_id', 'tax_type', 'effective_from'])
      .ignore();

    if (taxRule2025OTJul) {
      await knex('payroll.tax_bracket').insert([
        { organization_id: org.id, tax_rule_set_id: taxRule2025OTJul.id, bracket_order: 1, income_min: 0, income_max: 2500, rate_percentage: 5, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2025OTJul.id, bracket_order: 2, income_min: 2500, income_max: 7500, rate_percentage: 15, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2025OTJul.id, bracket_order: 3, income_min: 7500, income_max: null, rate_percentage: 25, fixed_amount: 0 }
      ]);
      console.log('  ✓ Created: Suriname Overtime Tax 2025 (July onwards)');
    }

    // 2025 Overtime Tax (Jan-Jun)
    const [taxRule2025OTJan] = await knex('payroll.tax_rule_set')
      .insert({
        organization_id: org.id,
        tax_type: 'overtime',
        tax_name: 'Suriname Overtime Tax 2025 (Jan-Jun)',
        country: 'SR',
        effective_from: new Date('2025-01-01'),
        effective_to: new Date('2025-06-30'),
        calculation_method: 'bracket',
        description: 'Overtime tax rates for January to June 2025',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('id')
      .onConflict(['organization_id', 'tax_type', 'effective_from'])
      .ignore();

    if (taxRule2025OTJan) {
      await knex('payroll.tax_bracket').insert([
        { organization_id: org.id, tax_rule_set_id: taxRule2025OTJan.id, bracket_order: 1, income_min: 0, income_max: 500, rate_percentage: 5, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2025OTJan.id, bracket_order: 2, income_min: 500, income_max: 1100, rate_percentage: 15, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2025OTJan.id, bracket_order: 3, income_min: 1100, income_max: null, rate_percentage: 25, fixed_amount: 0 }
      ]);
      console.log('  ✓ Created: Suriname Overtime Tax 2025 (Jan-Jun)');
    }

    // 2025 AOV (Old Age Pension) - 4% flat rate
    const [taxRule2025AOV] = await knex('payroll.tax_rule_set')
      .insert({
        organization_id: org.id,
        tax_type: 'aov',
        tax_name: 'Suriname AOV 2025',
        country: 'SR',
        effective_from: new Date('2025-01-01'),
        effective_to: new Date('2025-12-31'),
        calculation_method: 'flat_rate',
        description: 'Old Age Pension (AOV) - 4% flat rate on taxable income',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('id')
      .onConflict(['organization_id', 'tax_type', 'effective_from'])
      .ignore();

    if (taxRule2025AOV) {
      await knex('payroll.tax_bracket').insert([
        { organization_id: org.id, tax_rule_set_id: taxRule2025AOV.id, bracket_order: 1, income_min: 0, income_max: null, rate_percentage: 4.00, fixed_amount: 0 }
      ]);
      console.log('  ✓ Created: Suriname AOV 2025');
    }

    // 2025 AWW (General Widow and Orphan) - 1% flat rate
    const [taxRule2025AWW] = await knex('payroll.tax_rule_set')
      .insert({
        organization_id: org.id,
        tax_type: 'aww',
        tax_name: 'Suriname AWW 2025',
        country: 'SR',
        effective_from: new Date('2025-01-01'),
        effective_to: new Date('2025-12-31'),
        calculation_method: 'flat_rate',
        description: 'General Widow and Orphan Fund (AWW) - 1% flat rate on taxable income',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('id')
      .onConflict(['organization_id', 'tax_type', 'effective_from'])
      .ignore();

    if (taxRule2025AWW) {
      await knex('payroll.tax_bracket').insert([
        { organization_id: org.id, tax_rule_set_id: taxRule2025AWW.id, bracket_order: 1, income_min: 0, income_max: null, rate_percentage: 1.00, fixed_amount: 0 }
      ]);
      console.log('  ✓ Created: Suriname AWW 2025');
    }

    // ========================================================================
    // 2024 TAX RULES (abbreviated for brevity - same structure)
    // ========================================================================
    console.log('[INFO] Seeding 2024 tax rule sets...');

    // 2024 Wage Tax (Annual)
    const [taxRule2024Annual] = await knex('payroll.tax_rule_set')
      .insert({
        organization_id: org.id,
        tax_type: 'wage_tax',
        tax_name: 'Suriname Wage Tax 2024',
        country: 'SR',
        effective_from: new Date('2024-01-01'),
        effective_to: new Date('2024-12-31'),
        calculation_method: 'bracket',
        description: 'Normal wage tax rates for 2024',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('id')
      .onConflict(['organization_id', 'tax_type', 'effective_from'])
      .ignore();

    if (taxRule2024Annual) {
      await knex('payroll.tax_bracket').insert([
        { organization_id: org.id, tax_rule_set_id: taxRule2024Annual.id, bracket_order: 1, income_min: 0, income_max: 42000, rate_percentage: 8, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2024Annual.id, bracket_order: 2, income_min: 42000, income_max: 84000, rate_percentage: 18, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2024Annual.id, bracket_order: 3, income_min: 84000, income_max: 126000, rate_percentage: 28, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2024Annual.id, bracket_order: 4, income_min: 126000, income_max: null, rate_percentage: 38, fixed_amount: 0 }
      ]);
      console.log('  ✓ Created: Suriname Wage Tax 2024 (Annual)');
    }

    // 2024 Wage Tax (Monthly)
    const [taxRule2024Monthly] = await knex('payroll.tax_rule_set')
      .insert({
        organization_id: org.id,
        tax_type: 'wage_tax_monthly',
        tax_name: 'Suriname Wage Tax 2024 (Monthly)',
        country: 'SR',
        effective_from: new Date('2024-01-01'),
        effective_to: new Date('2024-12-31'),
        calculation_method: 'bracket',
        description: 'Monthly wage tax rates for 2024',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('id')
      .onConflict(['organization_id', 'tax_type', 'effective_from'])
      .ignore();

    if (taxRule2024Monthly) {
      await knex('payroll.tax_bracket').insert([
        { organization_id: org.id, tax_rule_set_id: taxRule2024Monthly.id, bracket_order: 1, income_min: 0, income_max: 3500, rate_percentage: 8, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2024Monthly.id, bracket_order: 2, income_min: 3500, income_max: 7000, rate_percentage: 18, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2024Monthly.id, bracket_order: 3, income_min: 7000, income_max: 10500, rate_percentage: 28, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2024Monthly.id, bracket_order: 4, income_min: 10500, income_max: null, rate_percentage: 38, fixed_amount: 0 }
      ]);
      console.log('  ✓ Created: Suriname Wage Tax 2024 (Monthly)');
    }

    // 2024 AOV - 4% flat rate
    const [taxRule2024AOV] = await knex('payroll.tax_rule_set')
      .insert({
        organization_id: org.id,
        tax_type: 'aov',
        tax_name: 'Suriname AOV 2024',
        country: 'SR',
        effective_from: new Date('2024-01-01'),
        effective_to: new Date('2024-12-31'),
        calculation_method: 'flat_rate',
        description: 'Old Age Pension (AOV) - 4% flat rate on taxable income',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('id')
      .onConflict(['organization_id', 'tax_type', 'effective_from'])
      .ignore();

    if (taxRule2024AOV) {
      await knex('payroll.tax_bracket').insert([
        { organization_id: org.id, tax_rule_set_id: taxRule2024AOV.id, bracket_order: 1, income_min: 0, income_max: null, rate_percentage: 4.00, fixed_amount: 0 }
      ]);
      console.log('  ✓ Created: Suriname AOV 2024');
    }

    // 2024 AWW - 1% flat rate
    const [taxRule2024AWW] = await knex('payroll.tax_rule_set')
      .insert({
        organization_id: org.id,
        tax_type: 'aww',
        tax_name: 'Suriname AWW 2024',
        country: 'SR',
        effective_from: new Date('2024-01-01'),
        effective_to: new Date('2024-12-31'),
        calculation_method: 'flat_rate',
        description: 'General Widow and Orphan Fund (AWW) - 1% flat rate on taxable income',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('id')
      .onConflict(['organization_id', 'tax_type', 'effective_from'])
      .ignore();

    if (taxRule2024AWW) {
      await knex('payroll.tax_bracket').insert([
        { organization_id: org.id, tax_rule_set_id: taxRule2024AWW.id, bracket_order: 1, income_min: 0, income_max: null, rate_percentage: 1.00, fixed_amount: 0 }
      ]);
      console.log('  ✓ Created: Suriname AWW 2024');
    }

    // ========================================================================
    // 2023 TAX RULES
    // ========================================================================
    console.log('[INFO] Seeding 2023 tax rule sets...');

    // 2023 Wage Tax (Annual)
    const [taxRule2023Annual] = await knex('payroll.tax_rule_set')
      .insert({
        organization_id: org.id,
        tax_type: 'wage_tax',
        tax_name: 'Suriname Wage Tax 2023',
        country: 'SR',
        effective_from: new Date('2023-01-01'),
        effective_to: new Date('2023-12-31'),
        calculation_method: 'bracket',
        description: 'Normal wage tax rates for 2023',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('id')
      .onConflict(['organization_id', 'tax_type', 'effective_from'])
      .ignore();

    if (taxRule2023Annual) {
      await knex('payroll.tax_bracket').insert([
        { organization_id: org.id, tax_rule_set_id: taxRule2023Annual.id, bracket_order: 1, income_min: 0, income_max: 11356.80, rate_percentage: 8, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2023Annual.id, bracket_order: 2, income_min: 11356.80, income_max: 19273.80, rate_percentage: 18, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2023Annual.id, bracket_order: 3, income_min: 19273.80, income_max: 30193.80, rate_percentage: 28, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2023Annual.id, bracket_order: 4, income_min: 30193.80, income_max: null, rate_percentage: 38, fixed_amount: 0 }
      ]);
      console.log('  ✓ Created: Suriname Wage Tax 2023 (Annual)');
    }

    // 2023 Wage Tax (Monthly)
    const [taxRule2023Monthly] = await knex('payroll.tax_rule_set')
      .insert({
        organization_id: org.id,
        tax_type: 'wage_tax_monthly',
        tax_name: 'Suriname Wage Tax 2023 (Monthly)',
        country: 'SR',
        effective_from: new Date('2023-01-01'),
        effective_to: new Date('2023-12-31'),
        calculation_method: 'bracket',
        description: 'Monthly wage tax rates for 2023',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('id')
      .onConflict(['organization_id', 'tax_type', 'effective_from'])
      .ignore();

    if (taxRule2023Monthly) {
      await knex('payroll.tax_bracket').insert([
        { organization_id: org.id, tax_rule_set_id: taxRule2023Monthly.id, bracket_order: 1, income_min: 0, income_max: 946.40, rate_percentage: 8, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2023Monthly.id, bracket_order: 2, income_min: 946.40, income_max: 1606.15, rate_percentage: 18, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2023Monthly.id, bracket_order: 3, income_min: 1606.15, income_max: 2516.15, rate_percentage: 28, fixed_amount: 0 },
        { organization_id: org.id, tax_rule_set_id: taxRule2023Monthly.id, bracket_order: 4, income_min: 2516.15, income_max: null, rate_percentage: 38, fixed_amount: 0 }
      ]);
      console.log('  ✓ Created: Suriname Wage Tax 2023 (Monthly)');
    }
  }

  console.log(`\n✅ Completed Suriname tax rules seed for ${organizations.length} organization(s)`);
};
