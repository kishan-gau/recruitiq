/**
 * Fix min_proficiency constraint in shift_template_roles table
 * The previous constraint was incorrectly checking for array equality
 * instead of checking if value is IN the allowed values array
 */

export const up = async (knex) => {
  console.log('🔧 Fixing min_proficiency constraint in shift_template_roles...');
  
  // Drop the broken constraint
  await knex.raw(`
    ALTER TABLE scheduling.shift_template_roles
    DROP CONSTRAINT IF EXISTS shift_template_roles_min_proficiency_check
  `);
  
  // Add the correct constraint using IN clause
  await knex.raw(`
    ALTER TABLE scheduling.shift_template_roles
    ADD CONSTRAINT shift_template_roles_min_proficiency_check
    CHECK (min_proficiency IN ('trainee', 'competent', 'proficient', 'expert'))
  `);
  
  console.log('✅ min_proficiency constraint fixed - now properly checks if value is in allowed list');
};

export const down = async (knex) => {
  console.log('🔄 Reverting min_proficiency constraint fix...');
  
  // Drop the correct constraint
  await knex.raw(`
    ALTER TABLE scheduling.shift_template_roles
    DROP CONSTRAINT IF EXISTS shift_template_roles_min_proficiency_check
  `);
  
  // Restore the original broken constraint (for rollback purposes)
  await knex.raw(`
    ALTER TABLE scheduling.shift_template_roles
    ADD CONSTRAINT shift_template_roles_min_proficiency_check
    CHECK (((min_proficiency)::text = '{"trainee","competent","proficient","expert"}'::text))
  `);
  
  console.log('⚠️ Reverted to original broken constraint');
};