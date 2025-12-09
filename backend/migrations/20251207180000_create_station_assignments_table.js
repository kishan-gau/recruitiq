/**
 * Migration: Create station_assignments table
 * Purpose: Track employee assignments to specific stations in ScheduleHub
 * Date: December 7, 2025
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create station_assignments table in scheduling schema
  await knex.schema.withSchema('scheduling').createTable('station_assignments', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Organization isolation (multi-tenant support)
    table.uuid('organization_id').notNullable();
    
    // Assignment relationships
    table.uuid('station_id').notNullable().comment('Reference to the station');
    table.uuid('employee_id').notNullable().comment('Reference to the assigned employee');
    
    // Assignment metadata
    table.timestamp('assigned_at', { useTz: true }).defaultTo(knex.fn.now()).comment('When the assignment was made');
    table.uuid('assigned_by').notNullable().comment('User who made the assignment');
    table.text('notes').comment('Optional notes about the assignment');
    
    // Soft delete support
    table.timestamp('deleted_at', { useTz: true }).comment('Soft delete timestamp');
    
    // Audit timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    
    // Foreign key constraints
    table.foreign('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
    
    table.foreign('station_id')
      .references('id')
      .inTable('scheduling.stations')
      .onDelete('CASCADE');
    
    table.foreign('employee_id')
      .references('id')
      .inTable('hris.employee')
      .onDelete('CASCADE');
    
    table.foreign('assigned_by')
      .references('id')
      .inTable('hris.user_account')
      .onDelete('CASCADE');
    
    // Performance indexes
    table.index(['station_id', 'deleted_at'], 'idx_station_assignments_station_active');
    table.index(['employee_id', 'deleted_at'], 'idx_station_assignments_employee_active');
    table.index(['organization_id', 'deleted_at'], 'idx_station_assignments_org_active');
    table.index(['assigned_at'], 'idx_station_assignments_assigned_at');
    
    // Unique constraint to prevent duplicate active assignments
    // (same employee cannot be assigned to same station multiple times while active)
    table.unique(['station_id', 'employee_id', 'deleted_at'], {
      indexName: 'unique_active_station_assignment'
    });
    
    // Composite index for common queries
    table.index(['organization_id', 'station_id', 'deleted_at'], 'idx_station_assignments_org_station_active');
  });
  
  console.log('✅ Created station_assignments table in scheduling schema');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop the station_assignments table
  await knex.schema.withSchema('scheduling').dropTableIfExists('station_assignments');
  
  console.log('✅ Dropped station_assignments table from scheduling schema');
};