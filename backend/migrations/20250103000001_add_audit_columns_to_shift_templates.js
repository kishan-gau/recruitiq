/**
 * Migration: Add missing audit columns to shift_templates table
 * 
 * This migration adds the deleted_at and deleted_by columns to the shift_templates table
 * to comply with RecruitIQ coding standards requiring all tables to have complete audit columns.
 * 
 * Date: 2025-01-03
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  console.log('Adding missing audit columns to shift_templates table...');
  
  // Helper function to check if column exists
  const hasColumn = async (schema, table, column) => {
    const result = await knex.raw(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = ? AND table_name = ? AND column_name = ?
      ) as exists
    `, [schema, table, column]);
    return result.rows[0].exists;
  };
  
  // Add missing audit columns to scheduling.shift_templates
  console.log('Processing shift_templates table...');
  
  if (!(await hasColumn('scheduling', 'shift_templates', 'deleted_at'))) {
    await knex.raw('ALTER TABLE scheduling.shift_templates ADD COLUMN deleted_at timestamptz');
    console.log('  ✅ Added deleted_at column');
  }
  
  if (!(await hasColumn('scheduling', 'shift_templates', 'deleted_by'))) {
    await knex.raw('ALTER TABLE scheduling.shift_templates ADD COLUMN deleted_by uuid REFERENCES hris.user_account(id)');
    console.log('  ✅ Added deleted_by column');
  }
  
  // Add performance index for soft delete queries
  console.log('Adding performance index...');
  
  // Check if index doesn't already exist before creating
  const hasIndex = async (schema, table, indexName) => {
    const result = await knex.raw(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = ? AND tablename = ? AND indexname = ?
      ) as exists
    `, [schema, table, indexName]);
    return result.rows[0].exists;
  };
  
  if (!(await hasIndex('scheduling', 'shift_templates', 'idx_shift_templates_deleted_at'))) {
    await knex.raw('CREATE INDEX idx_shift_templates_deleted_at ON scheduling.shift_templates(deleted_at) WHERE deleted_at IS NULL');
    console.log('  ✅ Added deleted_at index for performance');
  }
  
  console.log('✅ shift_templates audit columns migration completed successfully');
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  console.log('Removing audit columns from shift_templates table...');
  
  // Drop index first
  await knex.raw('DROP INDEX IF EXISTS scheduling.idx_shift_templates_deleted_at');
  console.log('  ✅ Removed deleted_at index');
  
  // Remove columns
  await knex.raw('ALTER TABLE scheduling.shift_templates DROP COLUMN IF EXISTS deleted_by');
  console.log('  ✅ Removed deleted_by column');
  
  await knex.raw('ALTER TABLE scheduling.shift_templates DROP COLUMN IF EXISTS deleted_at');
  console.log('  ✅ Removed deleted_at column');
  
  console.log('✅ shift_templates audit columns rollback completed');
}