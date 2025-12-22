/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.withSchema('scheduling').createTable('shift_template_stations', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('shift_template_id').notNullable();
    table.uuid('station_id').notNullable();
    table.uuid('organization_id').notNullable();
    
    // Audit columns
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.uuid('created_by');
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    table.uuid('updated_by');
    table.timestamp('deleted_at');
    table.uuid('deleted_by');
    
    // Foreign keys
    table.foreign('shift_template_id').references('id').inTable('scheduling.shift_templates').onDelete('CASCADE');
    table.foreign('station_id').references('id').inTable('scheduling.stations').onDelete('CASCADE');
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.foreign('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.foreign('deleted_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    // Indexes
    table.index(['shift_template_id']);
    table.index(['station_id']);
    table.index(['organization_id']);
    table.index(['deleted_at']);
    
    // Composite unique index to prevent duplicate assignments
    table.unique(['shift_template_id', 'station_id'], 'unique_template_station');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.withSchema('scheduling').dropTable('shift_template_stations');
};