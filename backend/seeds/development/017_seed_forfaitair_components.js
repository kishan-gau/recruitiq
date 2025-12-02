/**
 * Seed: Forfaitair Components (Default Pay Components)
 * Source: seed-forfaitair-components.sql
 * 
 * Seeds default forfaitair (fixed/standard) pay components for PayLinQ:
 * - Loonplichtig (Gross Taxable)
 * - Netto Loon (Net Salary)
 * - Belastbaar Loon (Taxable Wage)
 * - Loonbelasting (Wage Tax)
 * - AOV (Old Age Pension)
 * - AWW (Widow/Orphan)
 * - Pensioen (Pension)
 * - Zorgverzekering (Health Insurance)
 * - Common deductions and allowances
 * 
 * MULTI-TENANT: Seeds components for EACH organization
 */

export async function seed(knex) {
  // Check if payroll schema exists
  const payrollSchemaExists = await knex.raw(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'payroll'
  `);

  if (payrollSchemaExists.rows.length === 0) {
    console.log('[SKIP] Payroll schema not found. Skipping forfaitair components seed.');
    return;
  }

  // Check if pay_component table exists
  const componentTableExists = await knex.raw(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'payroll' AND table_name = 'pay_component'
  `);

  if (componentTableExists.rows.length === 0) {
    console.log('[SKIP] Pay component table not found. Skipping forfaitair components seed.');
    return;
  }

  // Get all organizations
  const organizations = await knex('organizations').select('id', 'name');

  // Define default forfaitair components
  const forfaitairComponents = [
    // ============================================================================
    // EARNINGS COMPONENTS
    // ============================================================================
    {
      component_code: 'BASIC_SALARY',
      component_name: 'Basic Salary',
      component_type: 'earning',
      category: 'salary',
      description: 'Base monthly salary',
      is_taxable: true,
      is_recurring: true,
      is_system: true,
      display_order: 1
    },
    {
      component_code: 'OVERTIME_15X',
      component_name: 'Overtime (1.5x)',
      component_type: 'earning',
      category: 'overtime',
      description: 'Overtime at 150% rate',
      is_taxable: true,
      is_recurring: false,
      is_system: true,
      display_order: 2
    },
    {
      component_code: 'OVERTIME_20X',
      component_name: 'Overtime (2x)',
      component_type: 'earning',
      category: 'overtime',
      description: 'Overtime at 200% rate (holidays/weekends)',
      is_taxable: true,
      is_recurring: false,
      is_system: true,
      display_order: 3
    },
    {
      component_code: 'VAKANTIEGELD',
      component_name: 'Holiday Allowance (Vakantiegeld)',
      component_type: 'earning',
      category: 'allowance',
      description: '8% holiday allowance, tax-free up to SRD 10,016/year',
      is_taxable: true,
      is_recurring: false,
      is_system: true,
      display_order: 4
    },
    {
      component_code: 'THIRTEENTH_MONTH',
      component_name: '13th Month Salary',
      component_type: 'earning',
      category: 'bonus',
      description: 'Annual 13th month salary payment',
      is_taxable: true,
      is_recurring: false,
      is_system: true,
      display_order: 5
    },
    {
      component_code: 'BONUS',
      component_name: 'Performance Bonus',
      component_type: 'earning',
      category: 'bonus',
      description: 'Performance-based bonus payment',
      is_taxable: true,
      is_recurring: false,
      is_system: false,
      display_order: 6
    },
    {
      component_code: 'GRATUITY',
      component_name: 'Gratuity',
      component_type: 'earning',
      category: 'bonus',
      description: 'Gratuity payment, tax-free up to SRD 10,016/year',
      is_taxable: true,
      is_recurring: false,
      is_system: false,
      display_order: 7
    },
    {
      component_code: 'TRANSPORT_ALLOWANCE',
      component_name: 'Transport Allowance',
      component_type: 'earning',
      category: 'allowance',
      description: 'Monthly transport/commute allowance',
      is_taxable: false,
      is_recurring: true,
      is_system: false,
      display_order: 8
    },
    {
      component_code: 'MEAL_ALLOWANCE',
      component_name: 'Meal Allowance',
      component_type: 'earning',
      category: 'allowance',
      description: 'Monthly meal allowance',
      is_taxable: false,
      is_recurring: true,
      is_system: false,
      display_order: 9
    },
    {
      component_code: 'HOUSING_ALLOWANCE',
      component_name: 'Housing Allowance',
      component_type: 'earning',
      category: 'allowance',
      description: 'Monthly housing allowance',
      is_taxable: true,
      is_recurring: true,
      is_system: false,
      display_order: 10
    },
    {
      component_code: 'TELEPHONE_ALLOWANCE',
      component_name: 'Telephone Allowance',
      component_type: 'earning',
      category: 'allowance',
      description: 'Monthly telephone/communication allowance',
      is_taxable: false,
      is_recurring: true,
      is_system: false,
      display_order: 11
    },
    {
      component_code: 'CHILD_ALLOWANCE',
      component_name: 'Child Allowance',
      component_type: 'earning',
      category: 'allowance',
      description: 'Child allowance SRD 125/child, max SRD 500 (4 children)',
      is_taxable: false,
      is_recurring: true,
      is_system: true,
      display_order: 12
    },
    {
      component_code: 'EXCHANGE_RATE_COMP',
      component_name: 'Exchange Rate Compensation',
      component_type: 'earning',
      category: 'allowance',
      description: 'Exchange rate compensation up to SRD 800/month',
      is_taxable: false,
      is_recurring: true,
      is_system: true,
      display_order: 13
    },

    // ============================================================================
    // DEDUCTION COMPONENTS - STATUTORY
    // ============================================================================
    {
      component_code: 'LOONBELASTING',
      component_name: 'Wage Tax (Loonbelasting)',
      component_type: 'deduction',
      category: 'tax',
      description: 'Progressive wage tax (8-38%)',
      is_taxable: false,
      is_recurring: true,
      is_system: true,
      display_order: 101
    },
    {
      component_code: 'AOV',
      component_name: 'AOV (Old Age Pension)',
      component_type: 'deduction',
      category: 'statutory',
      description: 'Old Age Pension - 4% flat rate',
      is_taxable: false,
      is_recurring: true,
      is_system: true,
      display_order: 102
    },
    {
      component_code: 'AWW',
      component_name: 'AWW (Widow/Orphan)',
      component_type: 'deduction',
      category: 'statutory',
      description: 'General Widow and Orphan Fund - 1% flat rate',
      is_taxable: false,
      is_recurring: true,
      is_system: true,
      display_order: 103
    },
    {
      component_code: 'PENSION_EMPLOYEE',
      component_name: 'Pension (Employee Contribution)',
      component_type: 'deduction',
      category: 'pension',
      description: 'Employee pension contribution (typically 5-7%)',
      is_taxable: false,
      is_recurring: true,
      is_system: true,
      display_order: 104
    },
    {
      component_code: 'HEALTH_INSURANCE',
      component_name: 'Health Insurance',
      component_type: 'deduction',
      category: 'benefits',
      description: 'Health insurance premium deduction',
      is_taxable: false,
      is_recurring: true,
      is_system: false,
      display_order: 105
    },

    // ============================================================================
    // DEDUCTION COMPONENTS - VOLUNTARY
    // ============================================================================
    {
      component_code: 'LOAN_REPAYMENT',
      component_name: 'Loan Repayment',
      component_type: 'deduction',
      category: 'voluntary',
      description: 'Employee loan repayment',
      is_taxable: false,
      is_recurring: true,
      is_system: false,
      display_order: 110
    },
    {
      component_code: 'ADVANCE_RECOVERY',
      component_name: 'Advance Recovery',
      component_type: 'deduction',
      category: 'voluntary',
      description: 'Recovery of salary advance',
      is_taxable: false,
      is_recurring: false,
      is_system: false,
      display_order: 111
    },
    {
      component_code: 'UNION_DUES',
      component_name: 'Union Dues',
      component_type: 'deduction',
      category: 'voluntary',
      description: 'Trade union membership dues',
      is_taxable: false,
      is_recurring: true,
      is_system: false,
      display_order: 112
    },
    {
      component_code: 'GARNISHMENT',
      component_name: 'Wage Garnishment',
      component_type: 'deduction',
      category: 'legal',
      description: 'Court-ordered wage garnishment',
      is_taxable: false,
      is_recurring: true,
      is_system: false,
      display_order: 113
    },

    // ============================================================================
    // EMPLOYER CONTRIBUTION COMPONENTS
    // ============================================================================
    {
      component_code: 'PENSION_EMPLOYER',
      component_name: 'Pension (Employer Contribution)',
      component_type: 'employer_contribution',
      category: 'pension',
      description: 'Employer pension contribution (typically 10-12%)',
      is_taxable: false,
      is_recurring: true,
      is_system: true,
      display_order: 201
    },
    {
      component_code: 'HEALTH_INSURANCE_EMPLOYER',
      component_name: 'Health Insurance (Employer)',
      component_type: 'employer_contribution',
      category: 'benefits',
      description: 'Employer health insurance contribution',
      is_taxable: false,
      is_recurring: true,
      is_system: false,
      display_order: 202
    }
  ];

  for (const org of organizations) {
    const orgId = org.id;

    console.log(`[INFO] Seeding forfaitair components for: ${org.name}`);

    for (const component of forfaitairComponents) {
      // Check if component already exists
      const existingResult = await knex.raw(`
        SELECT 1 FROM payroll.pay_component 
        WHERE organization_id = ? AND component_code = ?
      `, [orgId, component.component_code]);

      if (existingResult.rows.length === 0) {
        await knex.raw(`
          INSERT INTO payroll.pay_component (
            organization_id, component_code, component_name, component_type,
            category, description, is_taxable, is_recurring, is_system,
            display_order, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)
        `, [
          orgId,
          component.component_code,
          component.component_name,
          component.component_type,
          component.category,
          component.description,
          component.is_taxable,
          component.is_recurring,
          component.is_system,
          component.display_order
        ]);
      }
    }

    console.log(`  ✓ Seeded ${forfaitairComponents.length} components for ${org.name}`);
  }

  console.log('');
  console.log('================================================================');
  console.log('[OK] Forfaitair components seeded successfully!');
  console.log('================================================================');
  console.log('');
  console.log('Components by Category:');
  console.log('  Earnings:');
  console.log('    - BASIC_SALARY (Basic Salary)');
  console.log('    - OVERTIME_15X, OVERTIME_20X (Overtime rates)');
  console.log('    - VAKANTIEGELD (Holiday Allowance)');
  console.log('    - THIRTEENTH_MONTH (13th Month)');
  console.log('    - BONUS, GRATUITY (Bonuses)');
  console.log('    - Transport, Meal, Housing, Telephone allowances');
  console.log('    - CHILD_ALLOWANCE, EXCHANGE_RATE_COMP');
  console.log('');
  console.log('  Deductions (Statutory):');
  console.log('    - LOONBELASTING (Wage Tax 8-38%)');
  console.log('    - AOV (4% Old Age Pension)');
  console.log('    - AWW (1% Widow/Orphan)');
  console.log('    - PENSION_EMPLOYEE (Employee pension)');
  console.log('    - HEALTH_INSURANCE');
  console.log('');
  console.log('  Deductions (Voluntary):');
  console.log('    - LOAN_REPAYMENT, ADVANCE_RECOVERY');
  console.log('    - UNION_DUES, GARNISHMENT');
  console.log('');
  console.log('  Employer Contributions:');
  console.log('    - PENSION_EMPLOYER (Employer pension)');
  console.log('    - HEALTH_INSURANCE_EMPLOYER');
  console.log('================================================================');
}
