/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // SEED ALLOWANCES (Tax-Free Caps per Surinamese Wage Tax Law)
  // 
  // Key Legal References:
  // - Article 10 lid 1 letter i: Holiday allowance (vakantiegeld) up to 1 month salary, max SRD 10,016/year
  // - Article 10 lid 1 letter j: Bonus/gratuity (bonus/gratificatie), max SRD 10,016/year
  // - Article 13 lid 1 letter b: Tax-free sum SRD 108,000/year for Suriname residents (SRD 9,000/month)
  //
  // MULTI-TENANT: Seeds allowances for EACH organization (tenant isolation)

  const organizations = await knex('organizations').select('id');

  if (organizations.length === 0) {
    console.log('⚠️  No organizations found. Skipping allowances seed.');
    return;
  }

  const allowances = [
    {
      allowance_type: 'holiday_allowance',
      allowance_name: 'Vakantiegeld Tax-Free Cap',
      amount: 10016.00,
      description: 'Tax-free holiday allowance cap per Article 10 lid 1 letter i - up to 1 month salary, maximum SRD 10,016 per year'
    },
    {
      allowance_type: 'bonus_gratuity',
      allowance_name: 'Bonus/Gratuity Tax-Free Cap',
      amount: 10016.00,
      description: 'Tax-free bonus/gratuity cap per Article 10 lid 1 letter j - maximum SRD 10,016 per year'
    },
    {
      allowance_type: 'tax_free_sum_monthly',
      allowance_name: 'Monthly Tax-Free Sum (Residents)',
      amount: 9000.00,
      description: 'Monthly tax-free sum for Suriname residents per Article 13 lid 1 letter b - SRD 108,000/year ÷ 12 = SRD 9,000/month'
    }
  ];

  const allowanceRecords = [];
  for (const org of organizations) {
    for (const allowance of allowances) {
      allowanceRecords.push({
        organization_id: org.id,
        allowance_type: allowance.allowance_type,
        allowance_name: allowance.allowance_name,
        country: 'SR',
        amount: allowance.amount,
        is_percentage: false,
        effective_from: new Date('2025-01-01'),
        is_active: true,
        description: allowance.description,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }
  }

  // Insert allowances (skip duplicates)
  for (const record of allowanceRecords) {
    const exists = await knex('payroll.allowance')
      .where({
        organization_id: record.organization_id,
        allowance_type: record.allowance_type
      })
      .first();

    if (!exists) {
      await knex('payroll.allowance').insert(record);
    }
  }

  console.log(`✅ Seeded ${allowanceRecords.length} allowances for ${organizations.length} organization(s)`);
};
