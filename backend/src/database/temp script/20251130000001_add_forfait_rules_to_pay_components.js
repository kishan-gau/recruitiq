/**
 * Migration: Add forfait rules to pay_components table
 * 
 * Adds columns to track which components trigger forfait creation
 * and which forfait component should be used.
 */

export function up(knex) {
  return knex.schema.table('pay_components', (table) => {
    // Whether this component triggers forfait creation
    table.boolean('has_forfait_rule').defaultTo(false).notNullable();
    
    // Reference to the forfait component to use
    table.uuid('forfait_component_id').nullable();
    table.foreign('forfait_component_id')
      .references('id')
      .inTable('pay_components')
      .onDelete('SET NULL');
    
    // Catalog value for this component (used in calculations)
    table.decimal('catalog_value', 10, 2).nullable();
    
    // Indexes for performance
    table.index('has_forfait_rule');
    table.index('forfait_component_id');
  });
}

export function down(knex) {
  return knex.schema.table('pay_components', (table) => {
    table.dropForeign('forfait_component_id');
    table.dropColumn('has_forfait_rule');
    table.dropColumn('forfait_component_id');
    table.dropColumn('catalog_value');
  });
}
