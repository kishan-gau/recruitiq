/**
 * Migration: Add forfait rules to pay_components
 * Allows components to define automatic forfait generation rules
 */

export async function up(knex) {
  // Add forfait rule columns to payroll.pay_component
  await knex.schema.withSchema('payroll').table('pay_component', (table) => {
    table.boolean('has_forfait_rule').defaultTo(false).notNullable()
      .comment('Whether this component triggers forfait creation');
    
    table.uuid('forfait_component_id')
      .references('id')
      .inTable('payroll.pay_component')
      .onDelete('SET NULL')
      .comment('The forfait component to create when this component is used');
    
    table.string('forfait_catalog_value', 100)
      .comment('The catalog value for forfait tax calculation (e.g., mobiliteit_13_cents_per_km)');
    
    // Index for efficient lookup
    table.index(['has_forfait_rule', 'organization_id'], 'idx_components_forfait_rule');
    table.index('forfait_component_id', 'idx_components_forfait_component');
  });

  // Add comment to table
  await knex.raw(`
    COMMENT ON COLUMN payroll.pay_component.has_forfait_rule IS
    'Indicates that using this component should automatically create a forfait component in the payroll run'
  `);
  
  await knex.raw(`
    COMMENT ON COLUMN payroll.pay_component.forfait_component_id IS 
    'References the forfait pay component that should be automatically created (e.g., Forfaitaire bijtelling)'
  `);
  
  await knex.raw(`
    COMMENT ON COLUMN payroll.pay_component.forfait_catalog_value IS 
    'The catalog value used to calculate forfait percentage (e.g., mobiliteit_13_cents_per_km, lease_5_percent)'
  `);
}

export async function down(knex) {
  await knex.schema.withSchema('payroll').table('pay_component', (table) => {
    table.dropColumn('has_forfait_rule');
    table.dropColumn('forfait_component_id');
    table.dropColumn('forfait_catalog_value');
  });
}
