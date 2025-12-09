/**
 * Migration: Create station_role_requirements table
 * Purpose: Track role requirements for specific stations in ScheduleHub
 * Date: December 8, 2025
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Create station_role_requirements table in scheduling schema
  await knex.schema.withSchema('scheduling').createTable('station_role_requirements', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Organization isolation (multi-tenant support)
    table.uuid('organization_id').notNullable();
    
    // Requirement relationships
    table.uuid('station_id').notNullable().comment('Reference to the station');
    table.uuid('role_id').notNullable().comment('Reference to the required role');
    
    // Requirement metadata
    table.integer('required_count').defaultTo(1).notNullable().comment('Number of employees with this role required');
    table.integer('priority').defaultTo(1).notNullable().comment('Priority level (1=highest, 5=lowest)');
    table.boolean('is_mandatory').defaultTo(true).notNullable().comment('Whether this role is mandatory for the station');
    table.text('notes').comment('Optional notes about the requirement');
    
    // Audit columns
    table.uuid('created_by').notNullable().comment('User who created the requirement');
    table.uuid('updated_by').comment('User who last updated the requirement');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    
    // Soft delete support
    table.timestamp('deleted_at', { useTz: true }).comment('Soft delete timestamp');
    table.uuid('deleted_by').comment('User who deleted the requirement');
    
    // Foreign key constraints
    table.foreign('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
    
    table.foreign('station_id')
      .references('id')
      .inTable('scheduling.stations')
      .onDelete('CASCADE');
    
    table.foreign('role_id')
      .references('id')
      .inTable('hris.roles')
      .onDelete('CASCADE');
    
    table.foreign('created_by')
      .references('id')
      .inTable('hris.user_account')
      .onDelete('CASCADE');
    
    table.foreign('updated_by')
      .references('id')
      .inTable('hris.user_account')
      .onDelete('CASCADE');
    
    table.foreign('deleted_by')
      .references('id')
      .inTable('hris.user_account')
      .onDelete('CASCADE');
    
    // Performance indexes
    table.index(['station_id', 'deleted_at'], 'idx_station_role_requirements_station_active');
    table.index(['role_id', 'deleted_at'], 'idx_station_role_requirements_role_active');
    table.index(['organization_id', 'deleted_at'], 'idx_station_role_requirements_org_active');
    table.index(['priority', 'deleted_at'], 'idx_station_role_requirements_priority_active');
    
    // Unique constraint to prevent duplicate active requirements
    // (same role cannot be required multiple times for same station while active)
    table.unique(['station_id', 'role_id', 'deleted_at'], {
      indexName: 'unique_active_station_role_requirement'
    });
    
    // Composite index for common queries
    table.index(['organization_id', 'station_id', 'deleted_at'], 'idx_station_role_requirements_org_station_active');
    table.index(['station_id', 'priority', 'deleted_at'], 'idx_station_role_requirements_station_priority_active');
  });
  
  console.log('✅ Created station_role_requirements table in scheduling schema');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Drop the station_role_requirements table
  await knex.schema.withSchema('scheduling').dropTableIfExists('station_role_requirements');
  
  console.log('✅ Dropped station_role_requirements table from scheduling schema');
}