/**
 * Migration: Add cost_center column to hris.department table
 * 
 * Cost centers are essential for:
 * - Financial tracking and budgeting
 * - Expense allocation across departments
 * - Reporting and analytics
 * - Integration with accounting systems
 */

export async function up(knex) {
  // Add cost_center column to hris.department table
  await knex.schema.withSchema('hris').alterTable('department', function(table) {
    table.string('cost_center', 50).nullable().comment('Cost center code for financial tracking');
  });
  
  console.log('✅ Added cost_center column to hris.department table');
}

export async function down(knex) {
  // Remove cost_center column
  await knex.schema.withSchema('hris').alterTable('department', function(table) {
    table.dropColumn('cost_center');
  });
  
  console.log('✅ Removed cost_center column from hris.department table');
}