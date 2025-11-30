/**
 * Migration: Add forfait rule support to pay components
 * 
 * Adds:
 * - has_forfait_rule flag to pay_components
 * - forfait_component_id reference to link component with its forfait
 * - catalog_value to track official tax catalog values
 */

export async function up(knex) {
  // Add forfait rule columns to pay_components table
  await knex.schema.table('pay_components', (table) => {
    // Flag indicating if this component triggers forfait creation
    table.boolean('has_forfait_rule').defaultTo(false).notNullable();
    
    // Reference to the forfait component that should be created
    table.uuid('forfait_component_id')
      .references('id')
      .inTable('pay_components')
      .onDelete('SET NULL')
      .nullable();
    
    // Official tax catalog value for reporting
    table.string('catalog_value', 50).nullable();
    
    // Add comment for documentation
    table.comment('Forfait rule: has_forfait_rule determines if forfait is created, forfait_component_id specifies which one');
  });

  // Create index for forfait lookups
  await knex.schema.raw(`
    CREATE INDEX idx_pay_components_forfait_rule 
    ON pay_components(has_forfait_rule, forfait_component_id) 
    WHERE has_forfait_rule = true AND deleted_at IS NULL
  `);
}

export async function down(knex) {
  // Drop index first
  await knex.schema.raw('DROP INDEX IF EXISTS idx_pay_components_forfait_rule');
  
  // Remove columns
  await knex.schema.table('pay_components', (table) => {
    table.dropColumn('has_forfait_rule');
    table.dropColumn('forfait_component_id');
    table.dropColumn('catalog_value');
  });
}
