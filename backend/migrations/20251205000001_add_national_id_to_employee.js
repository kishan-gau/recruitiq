/**
 * Migration: Add national_id to hris.employee table
 * 
 * National ID is a personal identification field that belongs in HRIS,
 * not in payroll configuration. This migration adds the field to the
 * employee table where it logically belongs.
 * 
 * Created: December 5, 2025
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').table('employee', (table) => {
    // Add national_id field
    table.string('national_id', 50).nullable();
  });

  // Add index for faster lookups (national_id may be used for verification)
  await knex.raw(`
    CREATE INDEX idx_employee_national_id 
    ON hris.employee(national_id) 
    WHERE national_id IS NOT NULL AND deleted_at IS NULL
  `);

  // Add column comment
  await knex.raw(`
    COMMENT ON COLUMN hris.employee.national_id IS 
    'National identification number (SSN, National ID Card, etc.). Used for identity verification and legal compliance.'
  `);

  console.log('✅ Added national_id column to hris.employee table');
}

export async function down(knex) {
  // Drop index first
  await knex.raw('DROP INDEX IF EXISTS hris.idx_employee_national_id');
  
  // Drop column
  await knex.schema.withSchema('hris').table('employee', (table) => {
    table.dropColumn('national_id');
  });

  console.log('✅ Removed national_id column from hris.employee table');
}
