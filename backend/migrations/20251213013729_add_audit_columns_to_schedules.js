/**
 * Migration: Add audit columns to scheduling.schedules table
 * 
 * This migration adds the missing deleted_at audit column to the schedules table
 * to comply with RecruitIQ database standards and enable soft delete functionality.
 * 
 * The schedules table was missing the deleted_at column which caused errors in
 * schedule regeneration queries that use "deleted_at IS NULL" for active records.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // First add the column and comment in a transaction
  await knex.schema.raw(`
    -- Add deleted_at audit column to schedules table
    ALTER TABLE scheduling.schedules 
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
    
    -- Add comment for documentation
    COMMENT ON COLUMN scheduling.schedules.deleted_at IS 'Soft delete timestamp - NULL for active records';
  `);
  
  // Then add the index outside transaction (CONCURRENTLY requires no transaction)
  await knex.schema.raw(`
    -- Add performance index for soft delete queries
    -- This optimizes queries using "WHERE deleted_at IS NULL"
    CREATE INDEX IF NOT EXISTS idx_schedules_active_records 
    ON scheduling.schedules (id, organization_id) 
    WHERE deleted_at IS NULL;
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.schema.raw(`
    -- Remove the performance index
    DROP INDEX IF EXISTS scheduling.idx_schedules_active_records;
    
    -- Remove the deleted_at column
    ALTER TABLE scheduling.schedules 
    DROP COLUMN IF EXISTS deleted_at;
  `);
}
