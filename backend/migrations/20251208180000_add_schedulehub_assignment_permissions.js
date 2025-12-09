/**
 * Migration: Add ScheduleHub Assignment Permissions
 * 
 * This migration adds the missing assignment permissions that are required
 * by the ScheduleHub station assignment routes but were not included in
 * the original ScheduleHub permissions seed.
 * 
 * Permissions Added:
 * - scheduling:assignments:create - Assign workers to stations
 * - scheduling:assignments:read - View station assignment information  
 * - scheduling:assignments:delete - Remove workers from station assignments
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex('permissions').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      product: 'schedulehub',
      name: 'scheduling:assignments:create',
      display_name: 'Create Station Assignments',
      description: 'Assign workers to stations',
      category: 'assignments',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      product: 'schedulehub',
      name: 'scheduling:assignments:read',
      display_name: 'View Station Assignments',
      description: 'View station assignment information',
      category: 'assignments',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      product: 'schedulehub',
      name: 'scheduling:assignments:delete',
      display_name: 'Remove Station Assignments',
      description: 'Remove workers from station assignments',
      category: 'assignments',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex('permissions')
    .whereIn('name', [
      'scheduling:assignments:create',
      'scheduling:assignments:read', 
      'scheduling:assignments:delete'
    ])
    .andWhere('product', 'schedulehub')
    .del();
}