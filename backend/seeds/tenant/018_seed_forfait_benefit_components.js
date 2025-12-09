/**
 * Seed: Forfait Benefit Components
 * 
 * Seeds pay components specifically for Dutch forfait regulations.
 * These components enable calculation of benefit-in-kind values
 * using standardized forfait rates as per Dutch tax law.
 * 
 * Components seeded:
 * 1. Company car forfait (2% rule)
 * 2. Fuel forfait 
 * 3. Phone forfait
 * 4. Meal forfait
 * 5. Internet forfait
 * 6. Parking forfait
 * 
 * All components use category 'benefit_forfait' to match frontend filtering.
 */

export async function seed(knex) {
  // Check if payroll schema exists
  const payrollSchemaExists = await knex.raw(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'payroll'
  `);

  if (payrollSchemaExists.rows.length === 0) {
    console.log('[SKIP] Payroll schema not found. Skipping forfait benefit components seed.');
    return;
  }

  // Check if pay_component table exists
  const payComponentTableExists = await knex.raw(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'payroll' AND table_name = 'pay_component'
  `);

  if (payComponentTableExists.rows.length === 0) {
    console.log('[SKIP] Pay component table not found. Skipping forfait benefit components seed.');
    return;
  }

  // Get all organizations
  const organizations = await knex('organizations').select('id', 'name');

  if (organizations.length === 0) {
    console.log('[SKIP] No organizations found. Skipping forfait benefit components seed.');
    return;
  }

  console.log(`[INFO] Seeding forfait benefit components for ${organizations.length} organization(s)...`);

  // Forfait benefit components data
  const forfaitComponents = [
    {
      component_code: 'FORFAIT_CAR',
      component_name: 'Company Car Forfait',
      component_type: 'benefit',
      category: 'benefit_forfait',
      description: 'Forfait calculation for company car benefit-in-kind (2% rule)',
      calculation_base: 'fixed_amount',
      is_taxable: true,
      is_mandatory: false,
      effective_from: new Date('2024-01-01'),
      effective_to: null,
      sort_order: 100,
      is_active: true,
      has_forfait_rule: true,
      forfait_component_id: null, // Self-reference for forfait components
      forfait_catalog_value: {
        type: 'percentage',
        base_percentage: 2.0,
        description: 'Dutch forfait: 2% of catalog value per month',
        regulation_reference: 'Article 13b Wet LB 1964',
        calculation_period: 'monthly'
      }
    },
    {
      component_code: 'FORFAIT_FUEL',
      component_name: 'Fuel Forfait',
      component_type: 'benefit',
      category: 'benefit_forfait',
      description: 'Forfait calculation for fuel benefit provided by employer',
      calculation_base: 'fixed_amount',
      is_taxable: true,
      is_mandatory: false,
      effective_from: new Date('2024-01-01'),
      effective_to: null,
      sort_order: 101,
      is_active: true,
      has_forfait_rule: true,
      forfait_component_id: null,
      forfait_catalog_value: {
        type: 'fixed_amount',
        monthly_amount: 25.0,
        description: 'Standard forfait for private fuel usage',
        regulation_reference: 'Besluit forfaitaire WKR 2015',
        calculation_period: 'monthly'
      }
    },
    {
      component_code: 'FORFAIT_PHONE',
      component_name: 'Mobile Phone Forfait',
      component_type: 'benefit',
      category: 'benefit_forfait',
      description: 'Forfait calculation for mobile phone benefit-in-kind',
      calculation_base: 'fixed_amount',
      is_taxable: true,
      is_mandatory: false,
      effective_from: new Date('2024-01-01'),
      effective_to: null,
      sort_order: 102,
      is_active: true,
      has_forfait_rule: true,
      forfait_component_id: null,
      forfait_catalog_value: {
        type: 'fixed_amount',
        monthly_amount: 15.0,
        description: 'Standard forfait for private mobile phone usage',
        regulation_reference: 'Besluit forfaitaire WKR 2015',
        calculation_period: 'monthly'
      }
    },
    {
      component_code: 'FORFAIT_MEAL',
      component_name: 'Meal Forfait',
      component_type: 'benefit',
      category: 'benefit_forfait',
      description: 'Forfait calculation for meal benefits provided by employer',
      calculation_base: 'fixed_amount',
      is_taxable: true,
      is_mandatory: false,
      effective_from: new Date('2024-01-01'),
      effective_to: null,
      sort_order: 103,
      is_active: true,
      has_forfait_rule: true,
      forfait_component_id: null,
      forfait_catalog_value: {
        type: 'per_occurrence',
        amount_per_meal: 5.75,
        description: 'Forfait per meal provided by employer',
        regulation_reference: 'Besluit forfaitaire WKR 2015',
        calculation_period: 'per_occurrence',
        max_per_month: 20
      }
    },
    {
      component_code: 'FORFAIT_INTERNET',
      component_name: 'Internet Forfait',
      component_type: 'benefit',
      category: 'benefit_forfait',
      description: 'Forfait calculation for internet connection benefit-in-kind',
      calculation_base: 'fixed_amount',
      is_taxable: true,
      is_mandatory: false,
      effective_from: new Date('2024-01-01'),
      effective_to: null,
      sort_order: 104,
      is_active: true,
      has_forfait_rule: true,
      forfait_component_id: null,
      forfait_catalog_value: {
        type: 'fixed_amount',
        monthly_amount: 20.0,
        description: 'Standard forfait for private internet usage at home',
        regulation_reference: 'Besluit forfaitaire WKR 2015',
        calculation_period: 'monthly'
      }
    },
    {
      component_code: 'FORFAIT_PARKING',
      component_name: 'Parking Forfait',
      component_type: 'benefit',
      category: 'benefit_forfait',
      description: 'Forfait calculation for parking space benefit provided by employer',
      calculation_base: 'fixed_amount',
      is_taxable: true,
      is_mandatory: false,
      effective_from: new Date('2024-01-01'),
      effective_to: null,
      sort_order: 105,
      is_active: true,
      has_forfait_rule: true,
      forfait_component_id: null,
      forfait_catalog_value: {
        type: 'fixed_amount',
        monthly_amount: 30.0,
        description: 'Standard forfait for employer-provided parking space',
        regulation_reference: 'Besluit forfaitaire WKR 2015',
        calculation_period: 'monthly'
      }
    }
  ];

  // Seed components for each organization
  for (const org of organizations) {
    const orgId = org.id;
    console.log(`[INFO] Seeding forfait benefit components for organization: ${org.name} (${orgId})`);

    for (const component of forfaitComponents) {
      try {
        // Check if component already exists for this organization
        const existing = await knex('payroll.pay_component')
          .where({
            organization_id: orgId,
            component_code: component.component_code
          })
          .first();

        if (existing) {
          console.log(`[SKIP] Component ${component.component_code} already exists for organization ${org.name}`);
          continue;
        }

        // Insert the component
        await knex('payroll.pay_component').insert({
          id: knex.raw('gen_random_uuid()'),
          organization_id: orgId,
          component_code: component.component_code,
          component_name: component.component_name,
          component_type: component.component_type,
          category: component.category,
          description: component.description,
          calculation_base: component.calculation_base,
          is_taxable: component.is_taxable,
          is_mandatory: component.is_mandatory,
          effective_from: component.effective_from,
          effective_to: component.effective_to,
          sort_order: component.sort_order,
          status: 'active',
          is_active: component.is_active,
          has_forfait_rule: component.has_forfait_rule,
          forfait_component_id: component.forfait_component_id,
          forfait_catalog_value: JSON.stringify(component.forfait_catalog_value),
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        });

        console.log(`[SUCCESS] ✓ ${component.component_code}: ${component.component_name}`);

      } catch (error) {
        console.error(`[ERROR] Failed to seed ${component.component_code} for organization ${org.name}:`, error.message);
        throw error;
      }
    }

    console.log(`[OK] Completed seeding forfait benefit components for organization: ${org.name}`);
  }

  console.log('[OK] Forfait benefit components seed completed successfully for all organizations');
}