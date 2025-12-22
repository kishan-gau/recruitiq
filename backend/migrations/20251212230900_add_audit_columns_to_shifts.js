/**
 * Migration: Add missing audit columns to shifts table
 * 
 * This migration adds the required audit column that was missed in the original
 * shifts table creation:
 * - deleted_at (timestamp for soft deletes)
 * 
 * The shifts table already has created_by and updated_by, but is missing deleted_at
 * which is required by RecruitIQ database standards for all tables.
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  console.log('Adding missing deleted_at column to shifts table...');
  
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
  
  // Add missing deleted_at column to scheduling.shifts
  console.log('Processing shifts table...');
  if (!(await hasColumn('scheduling', 'shifts', 'deleted_at'))) {
    await knex.raw('ALTER TABLE scheduling.shifts ADD COLUMN deleted_at timestamptz');
    console.log('  ✅ Added deleted_at column to shifts table');
  } else {
    console.log('  ⏭️  deleted_at column already exists on shifts table');
  }
  
  // Add useful index for performance on soft deletes
  console.log('Adding index for performance...');
  
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
  
  // Index for shifts soft delete queries
  if (!(await hasIndex('scheduling', 'shifts', 'idx_shifts_deleted_at'))) {
    await knex.raw('CREATE INDEX idx_shifts_deleted_at ON scheduling.shifts(deleted_at) WHERE deleted_at IS NULL');
    console.log('  ✅ Added index idx_shifts_deleted_at for performance');
  } else {
    console.log('  ⏭️  Index idx_shifts_deleted_at already exists');
  }
  
  console.log('✅ Migration completed successfully');
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  console.log('Removing audit columns from shifts table...');
  
  // Drop index first
  await knex.raw('DROP INDEX IF EXISTS scheduling.idx_shifts_deleted_at');
  console.log('  ✅ Dropped index idx_shifts_deleted_at');
  
  // Remove deleted_at column from shifts
  await knex.raw('ALTER TABLE scheduling.shifts DROP COLUMN IF EXISTS deleted_at');
  console.log('  ✅ Dropped deleted_at column from shifts table');
  
  console.log('✅ Rollback completed');
}