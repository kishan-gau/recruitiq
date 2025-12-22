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

  console.log('Checking and adding missing audit columns to scheduling.roles table...');

  // Check and add created_by column if it doesn't exist
  if (!(await hasColumn('scheduling', 'roles', 'created_by'))) {
    await knex.schema.withSchema('scheduling').alterTable('roles', (table) => {
      table.uuid('created_by').nullable().references('id').inTable('hris.user_account');
    });
    console.log('  ✅ Added created_by column');
  } else {
    console.log('  ⏭️  created_by column already exists');
  }

  // Check and add updated_by column if it doesn't exist
  if (!(await hasColumn('scheduling', 'roles', 'updated_by'))) {
    await knex.schema.withSchema('scheduling').alterTable('roles', (table) => {
      table.uuid('updated_by').nullable().references('id').inTable('hris.user_account');
    });
    console.log('  ✅ Added updated_by column');
  } else {
    console.log('  ⏭️  updated_by column already exists');
  }

  // Check and add indexes if they don't exist
  if (!(await hasIndex('scheduling', 'idx_roles_created_by'))) {
    await knex.schema.withSchema('scheduling').alterTable('roles', (table) => {
      table.index(['created_by'], 'idx_roles_created_by');
    });
    console.log('  ✅ Added index on created_by');
  } else {
    console.log('  ⏭️  Index on created_by already exists');
  }

  if (!(await hasIndex('scheduling', 'idx_roles_updated_by'))) {
    await knex.schema.withSchema('scheduling').alterTable('roles', (table) => {
      table.index(['updated_by'], 'idx_roles_updated_by');
    });
    console.log('  ✅ Added index on updated_by');
  } else {
    console.log('  ⏭️  Index on updated_by already exists');
  }

  console.log('✅ Migration completed successfully for scheduling.roles table');
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.withSchema('scheduling').alterTable('roles', (table) => {
    // Remove indexes first
    table.dropIndex(['created_by'], 'idx_roles_created_by');
    table.dropIndex(['updated_by'], 'idx_roles_updated_by');
    
    // Remove audit columns
    table.dropColumn('created_by');
    table.dropColumn('updated_by');
  });
}