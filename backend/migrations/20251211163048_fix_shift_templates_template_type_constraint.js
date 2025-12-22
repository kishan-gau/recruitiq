/**
 * Migration to fix the template_type constraint in shift_templates table
 * 
 * The original constraint was malformed and checking if template_type equals 
 * the entire array as text instead of being IN the array of valid values.
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.withSchema('scheduling').alterTable('shift_templates', function(table) {
    // Drop the malformed constraint
    table.dropChecks('shift_templates_template_type_check');
  }).then(() => {
    // Add the correct constraint using raw SQL
    return knex.raw(`
      ALTER TABLE scheduling.shift_templates 
      ADD CONSTRAINT shift_templates_template_type_check 
      CHECK (template_type IN ('regular', 'overtime', 'on_call', 'training'))
    `);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.withSchema('scheduling').alterTable('shift_templates', function(table) {
    // Drop the correct constraint
    table.dropChecks('shift_templates_template_type_check');
  }).then(() => {
    // Re-add the malformed constraint (for rollback purposes)
    return knex.raw(`
      ALTER TABLE scheduling.shift_templates 
      ADD CONSTRAINT shift_templates_template_type_check 
      CHECK (((template_type)::text = '{\"regular\",\"overtime\",\"on_call\",\"training\"}'::text))
    `);
  });
};
