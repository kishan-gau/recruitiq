/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.withSchema('scheduling').alterTable('roles', (table) => {
    // Add audit columns that are missing from the roles table
    // These are required by roleService.js for tracking who created/updated records
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account');
    
    // Add index for performance on audit queries
    table.index(['created_by'], 'idx_roles_created_by');
    table.index(['updated_by'], 'idx_roles_updated_by');
  });
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