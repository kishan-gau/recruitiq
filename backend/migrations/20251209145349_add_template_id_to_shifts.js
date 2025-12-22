/**
 * Migration: Add template_id to shifts table
 * 
 * This migration adds a reference to shift_templates in the shifts table
 * to link actual shifts with their reusable shift definitions.
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  // Add template_id column to shifts table
  await knex.schema.withSchema('scheduling').table('shifts', function(table) {
    table.uuid('template_id').references('id').inTable('scheduling.shift_templates').onDelete('SET NULL');
    table.index('template_id', 'idx_shifts_template_id');
  });

  // Add comment to explain the column
  await knex.raw(`
    COMMENT ON COLUMN scheduling.shifts.template_id IS 'Optional reference to the shift template this shift was created from'
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  // Remove the template_id column and its index
  await knex.schema.withSchema('scheduling').table('shifts', function(table) {
    table.dropIndex('template_id', 'idx_shifts_template_id');
    table.dropColumn('template_id');
  });
};