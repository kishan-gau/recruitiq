/**
 * Migration: Add organization_id to deductions table
 * Date: 2025-01-27
 */

export function up(knex) {
  return knex.schema.alterTable('deductions', (table) => {
    // Add organization_id column with foreign key
    table
      .uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .index();
  });
}

export function down(knex) {
  return knex.schema.alterTable('deductions', (table) => {
    table.dropColumn('organization_id');
  });
}
