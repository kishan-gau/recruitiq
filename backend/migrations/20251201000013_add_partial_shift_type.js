/**
 * Migration: Add 'partial' shift_type to scheduling.shifts check constraint
 * 
 * This migration updates the check_shift_type constraint to allow 'partial' shift types
 * which are needed for partial time coverage functionality.
 * 
 * @param {Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
  console.log('Adding partial shift type to scheduling.shifts constraint...');

  // Drop the existing constraint
  await knex.raw(`
    ALTER TABLE scheduling.shifts
    DROP CONSTRAINT IF EXISTS check_shift_type
  `);

  // Add the updated constraint with 'partial' included
  await knex.raw(`
    ALTER TABLE scheduling.shifts
    ADD CONSTRAINT check_shift_type
    CHECK (shift_type IN ('regular', 'overtime', 'on_call', 'training', 'partial'))
  `);

  console.log('✅ Added partial shift type to constraint successfully');
}

/**
 * Rollback migration
 * 
 * @param {Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
  console.log('Removing partial shift type from scheduling.shifts constraint...');

  // Drop the constraint with 'partial'
  await knex.raw(`
    ALTER TABLE scheduling.shifts
    DROP CONSTRAINT IF EXISTS check_shift_type
  `);

  // Restore the original constraint without 'partial'
  await knex.raw(`
    ALTER TABLE scheduling.shifts
    ADD CONSTRAINT check_shift_type
    CHECK (shift_type IN ('regular', 'overtime', 'on_call', 'training'))
  `);

  console.log('✅ Removed partial shift type from constraint');
}