/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // Get all organizations
  const organizations = await knex('organizations').select('id');
  
  // Standard worker types configuration
  const workerTypes = [
    {
      code: 'FT',
      name: 'Full-Time Employee',
      description: 'Regular full-time employee with benefits',
      benefits_eligible: true,
      pto_eligible: true,
      sick_leave_eligible: true,
      vacation_accrual_rate: 6.67, // ~80 hours/year (40hr/week * 52 weeks / 12 months / 2 weeks vacation)
      is_active: true
    },
    {
      code: 'PT',
      name: 'Part-Time Employee',
      description: 'Part-time employee with pro-rated benefits',
      benefits_eligible: true,
      pto_eligible: true,
      sick_leave_eligible: true,
      vacation_accrual_rate: 3.33, // Pro-rated for part-time
      is_active: true
    },
    {
      code: 'CTR',
      name: 'Contractor',
      description: 'Independent contractor (no benefits)',
      benefits_eligible: false,
      pto_eligible: false,
      sick_leave_eligible: false,
      vacation_accrual_rate: 0,
      is_active: true
    },
    {
      code: 'TMP',
      name: 'Temporary Worker',
      description: 'Temporary/seasonal worker',
      benefits_eligible: false,
      pto_eligible: false,
      sick_leave_eligible: false,
      vacation_accrual_rate: 0,
      is_active: true
    },
    {
      code: 'INT',
      name: 'Intern',
      description: 'Student intern or trainee',
      benefits_eligible: false,
      pto_eligible: true,
      sick_leave_eligible: true,
      vacation_accrual_rate: 2.0, // Limited vacation
      is_active: true
    },
    {
      code: 'FRL',
      name: 'Freelancer',
      description: 'Project-based freelancer',
      benefits_eligible: false,
      pto_eligible: false,
      sick_leave_eligible: false,
      vacation_accrual_rate: 0,
      is_active: true
    },
    {
      code: 'SEA',
      name: 'Seasonal Worker',
      description: 'Seasonal/agricultural worker',
      benefits_eligible: false,
      pto_eligible: false,
      sick_leave_eligible: false,
      vacation_accrual_rate: 0,
      is_active: true
    }
  ];

  // Get first user for each organization (for created_by audit)
  for (const org of organizations) {
    const [adminUser] = await knex.withSchema('hris').from('user_account')
      .where('organization_id', org.id)
      .limit(1)
      .select('id');

    // Insert worker types for this organization
    for (const workerType of workerTypes) {
      await knex.withSchema('hris').table('worker_type')
        .insert({
          organization_id: org.id,
          code: workerType.code,
          name: workerType.name,
          description: workerType.description,
          benefits_eligible: workerType.benefits_eligible,
          pto_eligible: workerType.pto_eligible,
          sick_leave_eligible: workerType.sick_leave_eligible,
          vacation_accrual_rate: workerType.vacation_accrual_rate,
          is_active: workerType.is_active,
          created_by: adminUser?.id || null
        })
        .onConflict(['organization_id', 'code'])
        .ignore();
    }

    console.log(`[OK] Worker types seeded for organization: ${org.id}`);
  }

  console.log('[OK] Worker types seeded successfully for all organizations');
};
