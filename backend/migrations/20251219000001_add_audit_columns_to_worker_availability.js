/**
 * Migration: Add audit columns to worker_availability table
 * 
 * This migration adds the missing audit columns (created_by, updated_by) 
 * to the scheduling.worker_availability table to comply with RecruitIQ 
 * database standards as defined in DATABASE_STANDARDS.md.
 * 
 * All tables MUST have audit columns per the coding standards:
 * - created_by UUID REFERENCES users(id)
 * - updated_by UUID REFERENCES users(id)
 */

export const up = async function(knex) {
  // Add audit columns to worker_availability table
  await knex.schema.withSchema('scheduling').alterTable('worker_availability', function(table) {
    // Add audit columns (REQUIRED per DATABASE_STANDARDS.md)
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    
    // Add indexes for performance (audit queries)
    table.index('created_by', 'idx_worker_availability_created_by');
    table.index('updated_by', 'idx_worker_availability_updated_by');
  });
  
  console.log('✅ Added audit columns (created_by, updated_by) to scheduling.worker_availability');
};

export const down = async function(knex) {
  // Remove audit columns
  await knex.schema.withSchema('scheduling').alterTable('worker_availability', function(table) {
    table.dropIndex('created_by', 'idx_worker_availability_created_by');
    table.dropIndex('updated_by', 'idx_worker_availability_updated_by');
    table.dropColumn('created_by');
    table.dropColumn('updated_by');
  });
  
  console.log('✅ Removed audit columns from scheduling.worker_availability');
};