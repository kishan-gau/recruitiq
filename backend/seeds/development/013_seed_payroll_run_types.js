/**
 * Seed: Payroll Run Types
 * Source: seed-payroll-run-types.sql
 * 
 * Seeds 7 default payroll run types with explicit component configuration:
 * - Regular Payroll
 * - Holiday Allowance (Vakantiegeld)
 * - Bonus Payment
 * - 13th Month Salary
 * - Adjustment
 * - Final Settlement
 * - Commission Payment
 * 
 * MULTI-TENANT: Seeds run types for EACH organization (tenant isolation)
 * Organizations can modify or add custom run types
 */

export async function seed(knex) {
  // Check if payroll schema exists
  const payrollSchemaExists = await knex.raw(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'payroll'
  `);

  if (payrollSchemaExists.rows.length === 0) {
    console.log('[SKIP] Payroll schema not found. Skipping payroll run types seed.');
    return;
  }

  // Get all organizations
  const organizations = await knex('organizations').select('id');

  // Define run types
  const runTypes = [
    // 1. Regular Payroll
    {
      type_code: 'REGULAR',
      type_name: 'Regular Payroll',
      description: 'Standard monthly payroll with salary, overtime, and deductions',
      allowed_components: JSON.stringify(['REGULAR_SALARY', 'OVERTIME', 'DEDUCTIONS']),
      display_order: 1,
      icon: 'calendar',
      color: '#10b981'
    },
    // 2. Holiday Allowance (Vakantiegeld)
    {
      type_code: 'VAKANTIEGELD',
      type_name: 'Holiday Allowance',
      description: '8% semi-annual payment (January/September). Only vakantiegeld component included. Tax-free up to SRD 10,016/year.',
      allowed_components: JSON.stringify(['VAKANTIEGELD']),
      display_order: 2,
      icon: 'gift',
      color: '#f59e0b'
    },
    // 3. Bonus Payment
    {
      type_code: 'BONUS',
      type_name: 'Bonus Payment',
      description: 'Performance bonuses and gratifications. Tax-free up to SRD 10,016/year per Article 10 lid 1 letter j.',
      allowed_components: JSON.stringify(['BONUS', 'GRATUITY']),
      display_order: 3,
      icon: 'award',
      color: '#8b5cf6'
    },
    // 4. 13th Month
    {
      type_code: 'THIRTEENTH_MONTH',
      type_name: '13th Month Salary',
      description: '13th month salary payment (annual). Also known as "dertiende maand".',
      allowed_components: JSON.stringify(['THIRTEENTH_MONTH']),
      display_order: 4,
      icon: 'calendar-check',
      color: '#06b6d4'
    },
    // 5. Adjustment
    {
      type_code: 'ADJUSTMENT',
      type_name: 'Adjustment',
      description: 'Corrections, back pay, and payroll adjustments',
      allowed_components: JSON.stringify(['ADJUSTMENT', 'BACK_PAY', 'CORRECTION']),
      display_order: 5,
      icon: 'edit',
      color: '#6b7280'
    },
    // 6. Final Pay
    {
      type_code: 'FINAL_PAY',
      type_name: 'Final Settlement',
      description: 'Termination pay and final settlements including accrued leave',
      allowed_components: JSON.stringify(['FINAL_PAY', 'SEVERANCE', 'ACCRUED_LEAVE']),
      display_order: 6,
      icon: 'user-x',
      color: '#ef4444'
    },
    // 7. Commission
    {
      type_code: 'COMMISSION',
      type_name: 'Commission Payment',
      description: 'Sales commission payments',
      allowed_components: JSON.stringify(['COMMISSION']),
      display_order: 7,
      icon: 'trending-up',
      color: '#059669'
    }
  ];

  for (const org of organizations) {
    const orgId = org.id;

    for (const runType of runTypes) {
      // Check if run type already exists
      const existingResult = await knex.raw(`
        SELECT 1 FROM payroll.payroll_run_type 
        WHERE organization_id = ? AND type_code = ?
      `, [orgId, runType.type_code]);

      if (existingResult.rows.length === 0) {
        await knex.raw(`
          INSERT INTO payroll.payroll_run_type (
            organization_id, type_code, type_name, description,
            component_override_mode, allowed_components, is_system_default,
            display_order, icon, color, is_active
          ) VALUES (?, ?, ?, ?, 'explicit', ?::jsonb, false, ?, ?, ?, true)
        `, [
          orgId,
          runType.type_code,
          runType.type_name,
          runType.description,
          runType.allowed_components,
          runType.display_order,
          runType.icon,
          runType.color
        ]);
      }
    }

    console.log(`[OK] Payroll run types seeded for organization: ${orgId}`);
  }

  console.log('');
  console.log('================================================================');
  console.log('[OK] Payroll run types seeded successfully!');
  console.log('================================================================');
  console.log('');
  console.log('MULTI-TENANT ISOLATION:');
  console.log('  - Each organization gets its OWN copy of these run types');
  console.log('  - No shared data between tenants');
  console.log('  - Organizations can modify/delete their run types');
  console.log('  - Organizations can create additional custom run types');
  console.log('');
  console.log('Component Override Modes:');
  console.log('  - template: Uses components from linked pay_structure_template');
  console.log('  - explicit: Uses allowed_components array (what we\'re using here)');
  console.log('  - hybrid: Uses template + allows overrides');
  console.log('');
  console.log('Vakantiegeld & Bonus Tax Treatment:');
  console.log('  - Both subject to SRD 10,016/year tax-free cap');
  console.log('  - Tracked in employee_allowance_usage table');
  console.log('  - Calculation methods configured in pay_component.calculation_metadata');
  console.log('================================================================');
}
