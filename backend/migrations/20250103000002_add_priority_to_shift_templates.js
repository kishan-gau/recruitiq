/**
 * Migration: Add priority column to shift_templates
 * Description: Adds missing priority field for ordering shift templates
 * Date: 2025-12-11
 */

export const up = async function(knex) {
  // Add priority column to shift_templates table
  await knex.schema.withSchema('scheduling').alterTable('shift_templates', function(table) {
    table.integer('priority').defaultTo(5); // Default priority of 5 (1-10 scale)
  });

  // Add check constraint using raw SQL to avoid naming issues
  await knex.raw(`
    ALTER TABLE scheduling.shift_templates 
    ADD CONSTRAINT chk_shift_templates_priority 
    CHECK (priority >= 1 AND priority <= 10)
  `);
  
  // Create index for priority-based ordering
  await knex.schema.raw('CREATE INDEX idx_shift_templates_priority ON scheduling.shift_templates(priority)');
  
  console.log('✅ Added priority column to shift_templates table');
  console.log('✅ Added priority range check constraint (1-10)');
  console.log('✅ Added priority index for performance');
};

export const down = async function(knex) {
  // Remove index first
  await knex.schema.raw('DROP INDEX IF EXISTS scheduling.idx_shift_templates_priority');
  
  // Remove check constraint first
  await knex.raw('ALTER TABLE scheduling.shift_templates DROP CONSTRAINT IF EXISTS chk_shift_templates_priority');
  
  // Remove priority column
  await knex.schema.withSchema('scheduling').alterTable('shift_templates', function(table) {
    table.dropColumn('priority');
  });
  
  console.log('✅ Removed priority column from shift_templates table');
  console.log('✅ Removed priority constraint and index');
};