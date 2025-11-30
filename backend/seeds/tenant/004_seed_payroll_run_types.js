/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Seed 7 default payroll run types with explicit component configuration
  // MULTI-TENANT: Seeds run types for EACH organization (tenant isolation)
  
  const organizations = await knex('organizations').select('id');

  if (organizations.length === 0) {
    console.log('⚠️  No organizations found. Skipping payroll run types seed.');
    return;
  }

  const runTypes = [
    {
      type_code: 'REGULAR',
      type_name: 'Regular Payroll',
      description: 'Standard monthly payroll with salary, overtime, and deductions',
      allowed_components: ['BASE_SALARY', 'OVERTIME', 'TAX', 'PENSION', 'HEALTH_INSURANCE'],
      display_order: 1,
      icon: 'calendar',
      color: '#3B82F6'
    },
    {
      type_code: 'BONUS',
      type_name: 'Bonus Payment',
      description: 'Bonus payments (performance, annual, etc.) with applicable taxes',
      allowed_components: ['BONUS', 'TAX'],
      display_order: 2,
      icon: 'gift',
      color: '#10B981'
    },
    {
      type_code: 'COMMISSION',
      type_name: 'Commission Payment',
      description: 'Sales commissions and incentives',
      allowed_components: ['COMMISSION', 'TAX'],
      display_order: 3,
      icon: 'trending-up',
      color: '#8B5CF6'
    },
    {
      type_code: 'THIRTEENTH_MONTH',
      type_name: '13th Month Salary',
      description: 'Year-end 13th month salary payment',
      allowed_components: ['THIRTEENTH_MONTH', 'TAX'],
      display_order: 4,
      icon: 'star',
      color: '#F59E0B'
    },
    {
      type_code: 'ADJUSTMENT',
      type_name: 'Payroll Adjustment',
      description: 'Corrections to previous payroll runs (arrears, overpayments)',
      allowed_components: ['ADJUSTMENT_POSITIVE', 'ADJUSTMENT_NEGATIVE', 'TAX'],
      display_order: 5,
      icon: 'edit',
      color: '#EF4444'
    },
    {
      type_code: 'FINAL_PAYMENT',
      type_name: 'Final Payment',
      description: 'Final payment upon termination (severance, unused leave, etc.)',
      allowed_components: ['SEVERANCE', 'UNUSED_LEAVE', 'FINAL_BONUS', 'TAX'],
      display_order: 6,
      icon: 'user-x',
      color: '#6B7280'
    },
    {
      type_code: 'ADVANCE',
      type_name: 'Salary Advance',
      description: 'Advance payment to be deducted from future payroll',
      allowed_components: ['ADVANCE'],
      display_order: 7,
      icon: 'dollar-sign',
      color: '#EC4899'
    }
  ];

  const runTypeRecords = [];
  for (const org of organizations) {
    for (const runType of runTypes) {
      runTypeRecords.push({
        organization_id: org.id,
        type_code: runType.type_code,
        type_name: runType.type_name,
        description: runType.description,
        component_override_mode: 'explicit',
        allowed_components: JSON.stringify(runType.allowed_components),
        is_system_default: false,
        display_order: runType.display_order,
        icon: runType.icon,
        color: runType.color,
        is_active: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }
  }

  // Insert all run types
  await knex('payroll.payroll_run_type')
    .insert(runTypeRecords)
    .onConflict(['organization_id', 'type_code'])
    .ignore();

  console.log(`✅ Seeded ${runTypeRecords.length} payroll run types for ${organizations.length} organization(s)`);
};
