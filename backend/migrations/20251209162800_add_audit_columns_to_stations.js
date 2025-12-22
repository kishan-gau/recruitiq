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

  console.log('Checking and adding missing audit columns to scheduling.stations table...');

  // Add missing audit columns to stations table
  await knex.schema.withSchema('scheduling').alterTable('stations', async function(table) {
    // Check and add deleted_at column
    if (!(await hasColumn('scheduling', 'stations', 'deleted_at'))) {
      table.timestamp('deleted_at').nullable();
      console.log('  ✅ Added deleted_at column');
    } else {
      console.log('  ⏭️  deleted_at column already exists');
    }
    
    // Check and add deleted_by column
    if (!(await hasColumn('scheduling', 'stations', 'deleted_by'))) {
      table.uuid('deleted_by').nullable()
        .references('id').inTable('hris.user_account')
        .onDelete('SET NULL');
      console.log('  ✅ Added deleted_by column');
    } else {
      console.log('  ⏭️  deleted_by column already exists');
    }
    
    // Check and add created_by column
    if (!(await hasColumn('scheduling', 'stations', 'created_by'))) {
      table.uuid('created_by').nullable()
        .references('id').inTable('hris.user_account')
        .onDelete('SET NULL');
      console.log('  ✅ Added created_by column');
    } else {
      console.log('  ⏭️  created_by column already exists');
    }
    
    // Check and add updated_by column
    if (!(await hasColumn('scheduling', 'stations', 'updated_by'))) {
      table.uuid('updated_by').nullable()
        .references('id').inTable('hris.user_account')
        .onDelete('SET NULL');
      console.log('  ✅ Added updated_by column');
    } else {
      console.log('  ⏭️  updated_by column already exists');
    }
  });

  // Create index on deleted_at for performance if it doesn't exist
  if (!(await hasIndex('scheduling', 'idx_stations_deleted_at'))) {
    await knex.schema.withSchema('scheduling').table('stations', function(table) {
      table.index('deleted_at', 'idx_stations_deleted_at');
    });
    console.log('  ✅ Added index on deleted_at column');
  } else {
    console.log('  ⏭️  Index on deleted_at already exists');
  }

  console.log('✅ Migration completed successfully for scheduling.stations table');
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Remove the audit columns
  await knex.schema.withSchema('scheduling').alterTable('stations', function(table) {
    table.dropIndex('deleted_at', 'idx_stations_deleted_at');
    table.dropColumn('deleted_at');
    table.dropColumn('deleted_by');
    table.dropColumn('created_by');
    table.dropColumn('updated_by');
  });

  console.log('Removed audit columns from scheduling.stations table');
}