/**
 * Migration: Add audit columns to existing station_role_requirements table
 * Purpose: Add missing audit columns (updated_at, deleted_at, created_by, updated_by, deleted_by) to existing table
 * Date: December 8, 2025
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Helper function to check if a column exists
  const hasColumn = async (schema, table, column) => {
    const result = await knex.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = ? AND table_name = ? AND column_name = ?
    `, [schema, table, column]);
    return result.rows.length > 0;
  };

  // Helper function to check if an index exists
  const hasIndex = async (schema, indexName) => {
    const result = await knex.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = ? AND indexname = ?
    `, [schema, indexName]);
    return result.rows.length > 0;
  };

  console.log('Checking and adding missing audit columns to scheduling.station_role_requirements table...');

  // Check and add created_by column if it doesn't exist
  if (!(await hasColumn('scheduling', 'station_role_requirements', 'created_by'))) {
    await knex.schema.withSchema('scheduling').alterTable('station_role_requirements', (table) => {
      table.uuid('created_by').comment('User who created the requirement');
      table.foreign('created_by')
        .references('id')
        .inTable('hris.user_account')
        .onDelete('SET NULL');
    });
    console.log('  ✅ Added created_by column');
  } else {
    console.log('  ⏭️  created_by column already exists');
  }

  // Check and add updated_by column if it doesn't exist
  if (!(await hasColumn('scheduling', 'station_role_requirements', 'updated_by'))) {
    await knex.schema.withSchema('scheduling').alterTable('station_role_requirements', (table) => {
      table.uuid('updated_by').comment('User who last updated the requirement');
      table.foreign('updated_by')
        .references('id')
        .inTable('hris.user_account')
        .onDelete('SET NULL');
    });
    console.log('  ✅ Added updated_by column');
  } else {
    console.log('  ⏭️  updated_by column already exists');
  }

  // Check and add updated_at column if it doesn't exist
  if (!(await hasColumn('scheduling', 'station_role_requirements', 'updated_at'))) {
    await knex.schema.withSchema('scheduling').alterTable('station_role_requirements', (table) => {
      table.timestamp('updated_at', { useTz: true });
    });
    console.log('  ✅ Added updated_at column');
  } else {
    console.log('  ⏭️  updated_at column already exists');
  }

  // Check and add deleted_at column if it doesn't exist
  if (!(await hasColumn('scheduling', 'station_role_requirements', 'deleted_at'))) {
    await knex.schema.withSchema('scheduling').alterTable('station_role_requirements', (table) => {
      table.timestamp('deleted_at', { useTz: true }).comment('Soft delete timestamp');
    });
    console.log('  ✅ Added deleted_at column');
  } else {
    console.log('  ⏭️  deleted_at column already exists');
  }

  // Check and add deleted_by column if it doesn't exist
  if (!(await hasColumn('scheduling', 'station_role_requirements', 'deleted_by'))) {
    await knex.schema.withSchema('scheduling').alterTable('station_role_requirements', (table) => {
      table.uuid('deleted_by').comment('User who deleted the requirement');
      table.foreign('deleted_by')
        .references('id')
        .inTable('hris.user_account')
        .onDelete('SET NULL');
    });
    console.log('  ✅ Added deleted_by column');
  } else {
    console.log('  ⏭️  deleted_by column already exists');
  }

  // Add performance indexes that depend on deleted_at column if they don't exist
  const indexesToAdd = [
    { columns: ['station_id', 'deleted_at'], name: 'idx_station_role_requirements_station_active' },
    { columns: ['role_id', 'deleted_at'], name: 'idx_station_role_requirements_role_active' },
    { columns: ['organization_id', 'deleted_at'], name: 'idx_station_role_requirements_org_active' },
    { columns: ['priority', 'deleted_at'], name: 'idx_station_role_requirements_priority_active' },
    { columns: ['organization_id', 'station_id', 'deleted_at'], name: 'idx_station_role_requirements_org_station_active' },
    { columns: ['station_id', 'priority', 'deleted_at'], name: 'idx_station_role_requirements_station_priority_active' }
  ];

  for (const idx of indexesToAdd) {
    if (!(await hasIndex('scheduling', idx.name))) {
      await knex.schema.withSchema('scheduling').alterTable('station_role_requirements', (table) => {
        table.index(idx.columns, idx.name);
      });
      console.log(`  ✅ Added index ${idx.name}`);
    } else {
      console.log(`  ⏭️  Index ${idx.name} already exists`);
    }
  }
  
  console.log('✅ Migration completed successfully for scheduling.station_role_requirements table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Drop the indexes first
  await knex.schema.withSchema('scheduling').alterTable('station_role_requirements', (table) => {
    table.dropIndex(['station_id', 'deleted_at'], 'idx_station_role_requirements_station_active');
    table.dropIndex(['role_id', 'deleted_at'], 'idx_station_role_requirements_role_active');
    table.dropIndex(['organization_id', 'deleted_at'], 'idx_station_role_requirements_org_active');
    table.dropIndex(['priority', 'deleted_at'], 'idx_station_role_requirements_priority_active');
    table.dropIndex(['organization_id', 'station_id', 'deleted_at'], 'idx_station_role_requirements_org_station_active');
    table.dropIndex(['station_id', 'priority', 'deleted_at'], 'idx_station_role_requirements_station_priority_active');
  });

  // Drop the audit columns that were added
  await knex.schema.withSchema('scheduling').alterTable('station_role_requirements', (table) => {
    // Drop foreign key constraints first
    table.dropForeign(['created_by']);
    table.dropForeign(['updated_by']);
    table.dropForeign(['deleted_by']);
    
    // Drop the columns
    table.dropColumn('created_by');
    table.dropColumn('updated_by');
    table.dropColumn('updated_at');
    table.dropColumn('deleted_at');
    table.dropColumn('deleted_by');
  });
  
  console.log('✅ Removed audit columns and indexes from station_role_requirements table in scheduling schema');
}