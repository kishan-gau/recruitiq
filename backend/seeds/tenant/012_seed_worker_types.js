/**
 * Seed: Worker Types (HRIS)
 * Source: seed-worker-types.sql
 * 
 * Seeds standard worker types into hris.worker_type for all organizations:
 * - Full-Time (FT)
 * - Part-Time (PT)
 * - Contractor (CTR)
 * - Temporary (TMP)
 * - Intern (INT)
 * - Freelance (FRL)
 * - Seasonal (SEA)
 */

export async function seed(knex) {
  // Check if hris schema exists
  const hrisSchemaExists = await knex.raw(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'hris'
  `);

  if (hrisSchemaExists.rows.length === 0) {
    console.log('[SKIP] HRIS schema not found. Skipping worker types seed.');
    return;
  }

  // Check if payroll schema exists
  const payrollSchemaExists = await knex.raw(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'payroll'
  `);

  // Get all organizations
  const organizations = await knex('organizations').select('id');

  for (const org of organizations) {
    const orgId = org.id;

    // Get first user for this organization (for created_by audit)
    // May be NULL if users haven't been created yet (during initial seed)
    const userResult = await knex.raw(`
      SELECT id FROM hris.user_account 
      WHERE organization_id = ? 
      LIMIT 1
    `, [orgId]);
    const adminUserId = userResult.rows[0]?.id || null;

    // Insert worker types into HRIS (created_by may be NULL during seed)
    await knex.raw(`
      INSERT INTO hris.worker_type (
        id, organization_id, code, name, description,
        benefits_eligible, pto_eligible, sick_leave_eligible, vacation_accrual_rate,
        is_active, created_by
      ) VALUES
        -- Full-Time
        (gen_random_uuid(), ?, 'FT', 'Full-Time', 
         'Full-time employees working standard 40 hours per week',
         true, true, true, 3.33, true, ?),
        
        -- Part-Time
        (gen_random_uuid(), ?, 'PT', 'Part-Time',
         'Part-time employees working less than 40 hours per week',
         false, true, true, 1.67, true, ?),
        
        -- Contractor
        (gen_random_uuid(), ?, 'CTR', 'Contractor',
         'Independent contractors paid per project or hourly',
         false, false, false, 0, true, ?),
        
        -- Temporary
        (gen_random_uuid(), ?, 'TMP', 'Temporary',
         'Temporary workers for short-term assignments',
         false, false, true, 0, true, ?),
        
        -- Intern
        (gen_random_uuid(), ?, 'INT', 'Intern',
         'Interns and trainees (paid or unpaid)',
         false, false, false, 0, true, ?),
        
        -- Freelance
        (gen_random_uuid(), ?, 'FRL', 'Freelance',
         'Freelance workers paid per project or deliverable',
         false, false, false, 0, true, ?),
        
        -- Seasonal
        (gen_random_uuid(), ?, 'SEA', 'Seasonal',
         'Seasonal workers for peak periods',
         false, true, false, 0, true, ?)
      ON CONFLICT (organization_id, code) DO NOTHING
    `, [
      orgId, adminUserId,
      orgId, adminUserId,
      orgId, adminUserId,
      orgId, adminUserId,
      orgId, adminUserId,
      orgId, adminUserId,
      orgId, adminUserId
    ]);

    // Get worker type IDs for pay config
    const workerTypes = await knex.raw(`
      SELECT id, code FROM hris.worker_type 
      WHERE organization_id = ?
    `, [orgId]);

    const workerTypeMap = {};
    for (const wt of workerTypes.rows) {
      workerTypeMap[wt.code] = wt.id;
    }

    // Insert payroll-specific configurations if payroll schema exists
    if (payrollSchemaExists.rows.length > 0 && Object.keys(workerTypeMap).length > 0) {
      const payConfigs = [
        { code: 'FT', pay_frequency: 'monthly', payment_method: 'direct_deposit', overtime_eligible: false },
        { code: 'PT', pay_frequency: 'monthly', payment_method: 'direct_deposit', overtime_eligible: true },
        { code: 'CTR', pay_frequency: 'monthly', payment_method: 'direct_deposit', overtime_eligible: false },
        { code: 'TMP', pay_frequency: 'weekly', payment_method: 'direct_deposit', overtime_eligible: false },
        { code: 'INT', pay_frequency: 'monthly', payment_method: 'direct_deposit', overtime_eligible: false },
        { code: 'FRL', pay_frequency: 'monthly', payment_method: 'check', overtime_eligible: false },
        { code: 'SEA', pay_frequency: 'weekly', payment_method: 'direct_deposit', overtime_eligible: false }
      ];

      for (const config of payConfigs) {
        const workerTypeId = workerTypeMap[config.code];
        if (workerTypeId) {
          await knex.raw(`
            INSERT INTO payroll.worker_type_pay_config (
              id, organization_id, worker_type_id,
              pay_structure_template_code, default_pay_frequency, default_payment_method,
              overtime_eligible, is_active, created_by
            ) VALUES (
              gen_random_uuid(), ?, ?,
              NULL, ?, ?,
              ?, true, ?
            )
            ON CONFLICT (organization_id, worker_type_id) DO NOTHING
          `, [orgId, workerTypeId, config.pay_frequency, config.payment_method, config.overtime_eligible, adminUserId]);
        }
      }
    }

    console.log(`[OK] Worker types seeded for organization: ${orgId}`);
  }

  console.log('[OK] Worker types seeded successfully for all organizations');
}
