/**
 * Migration: Add missing audit columns to ScheduleHub tables
 * 
 * This migration adds the audit columns required by RecruitIQ standards:
 * - created_by, updated_by (UUID references to hris.user_account)
 * - deleted_at (timestamp for soft deletes)
 * 
 * Only adds columns that don't already exist to avoid conflicts.
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  console.log('Adding missing audit columns to ScheduleHub tables...');
  
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
  
  // Add missing audit columns to scheduling.stations
  console.log('Processing stations table...');
  if (!(await hasColumn('scheduling', 'stations', 'created_by'))) {
    await knex.raw('ALTER TABLE scheduling.stations ADD COLUMN created_by uuid REFERENCES hris.user_account(id)');
    console.log('  ✅ Added created_by column');
  }
  if (!(await hasColumn('scheduling', 'stations', 'updated_by'))) {
    await knex.raw('ALTER TABLE scheduling.stations ADD COLUMN updated_by uuid REFERENCES hris.user_account(id)');
    console.log('  ✅ Added updated_by column');
  }
  if (!(await hasColumn('scheduling', 'stations', 'deleted_at'))) {
    await knex.raw('ALTER TABLE scheduling.stations ADD COLUMN deleted_at timestamptz');
    console.log('  ✅ Added deleted_at column');
  }
  
  // Add missing audit columns to scheduling.roles
  console.log('Processing roles table...');
  if (!(await hasColumn('scheduling', 'roles', 'created_by'))) {
    await knex.raw('ALTER TABLE scheduling.roles ADD COLUMN created_by uuid REFERENCES hris.user_account(id)');
    console.log('  ✅ Added created_by column');
  }
  if (!(await hasColumn('scheduling', 'roles', 'updated_by'))) {
    await knex.raw('ALTER TABLE scheduling.roles ADD COLUMN updated_by uuid REFERENCES hris.user_account(id)');
    console.log('  ✅ Added updated_by column');
  }
  if (!(await hasColumn('scheduling', 'roles', 'deleted_at'))) {
    await knex.raw('ALTER TABLE scheduling.roles ADD COLUMN deleted_at timestamptz');
    console.log('  ✅ Added deleted_at column');
  }
  
  // Add missing audit columns to scheduling.station_assignments
  console.log('Processing station_assignments table...');
  if (!(await hasColumn('scheduling', 'station_assignments', 'created_by'))) {
    await knex.raw('ALTER TABLE scheduling.station_assignments ADD COLUMN created_by uuid REFERENCES hris.user_account(id)');
    console.log('  ✅ Added created_by column');
  }
  if (!(await hasColumn('scheduling', 'station_assignments', 'updated_by'))) {
    await knex.raw('ALTER TABLE scheduling.station_assignments ADD COLUMN updated_by uuid REFERENCES hris.user_account(id)');
    console.log('  ✅ Added updated_by column');
  }
  
  // Note: station_role_requirements already has all required audit columns
  console.log('Skipping station_role_requirements - already compliant');
  
  // Add useful indexes for performance
  console.log('Adding indexes for performance...');
  
  // Check if indexes don't already exist before creating
  const hasIndex = async (schema, table, indexName) => {
    const result = await knex.raw(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = ? AND tablename = ? AND indexname = ?
      ) as exists
    `, [schema, table, indexName]);
    return result.rows[0].exists;
  };
  
  // Indexes for stations
  if (!(await hasIndex('scheduling', 'stations', 'idx_stations_deleted_at'))) {
    await knex.raw('CREATE INDEX idx_stations_deleted_at ON scheduling.stations(deleted_at) WHERE deleted_at IS NULL');
  }
  
  // Indexes for roles
  if (!(await hasIndex('scheduling', 'roles', 'idx_roles_deleted_at'))) {
    await knex.raw('CREATE INDEX idx_roles_deleted_at ON scheduling.roles(deleted_at) WHERE deleted_at IS NULL');
  }
  
  console.log('✅ Migration completed successfully');
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  console.log('Removing audit columns from ScheduleHub tables...');
  
  // Drop indexes first
  await knex.raw('DROP INDEX IF EXISTS scheduling.idx_stations_deleted_at');
  await knex.raw('DROP INDEX IF EXISTS scheduling.idx_roles_deleted_at');
  
  // Remove columns from stations
  await knex.raw('ALTER TABLE scheduling.stations DROP COLUMN IF EXISTS deleted_at');
  await knex.raw('ALTER TABLE scheduling.stations DROP COLUMN IF EXISTS updated_by');
  await knex.raw('ALTER TABLE scheduling.stations DROP COLUMN IF EXISTS created_by');
  
  // Remove columns from roles
  await knex.raw('ALTER TABLE scheduling.roles DROP COLUMN IF EXISTS deleted_at');
  await knex.raw('ALTER TABLE scheduling.roles DROP COLUMN IF EXISTS updated_by');
  await knex.raw('ALTER TABLE scheduling.roles DROP COLUMN IF EXISTS created_by');
  
  // Remove columns from station_assignments
  await knex.raw('ALTER TABLE scheduling.station_assignments DROP COLUMN IF EXISTS updated_by');
  await knex.raw('ALTER TABLE scheduling.station_assignments DROP COLUMN IF EXISTS created_by');
  
  console.log('✅ Rollback completed');
}