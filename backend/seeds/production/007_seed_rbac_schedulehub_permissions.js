/**
 * Seed: ScheduleHub (Scheduling) Product Permissions
 * Source: seed-rbac-schedulehub-permissions.sql
 * 
 * Seeds permissions for ScheduleHub scheduling product:
 * - Schedule Management
 * - Shift Management
 * - Shift Template Management
 * - Station Management
 * - Assignment Management
 * - Worker Management
 * - Availability Management
 * - Time-Off Management
 * - Shift Swap Marketplace
 * - Role Management
 * - Statistics & Analytics
 */

export async function seed(knex) {
  // ============================================================================
  // SCHEDULEHUB PRODUCT PERMISSIONS
  // ============================================================================
  // NOTE: Using 'scheduling:' prefix to match route permissions

  const schedulehubPermissions = [
    // Schedule Management
    { product: 'schedulehub', name: 'scheduling:schedules:create', display_name: 'Create Schedules', description: 'Create work schedules', category: 'schedules' },
    { product: 'schedulehub', name: 'scheduling:schedules:read', display_name: 'View Schedules', description: 'View schedule information', category: 'schedules' },
    { product: 'schedulehub', name: 'scheduling:schedules:publish', display_name: 'Publish Schedules', description: 'Publish schedules to workers', category: 'schedules' },

    // Shift Management
    { product: 'schedulehub', name: 'scheduling:shifts:create', display_name: 'Create Shifts', description: 'Create shift assignments', category: 'shifts' },
    { product: 'schedulehub', name: 'scheduling:shifts:read', display_name: 'View Shifts', description: 'View shift information', category: 'shifts' },
    { product: 'schedulehub', name: 'scheduling:shifts:update', display_name: 'Update Shifts', description: 'Update shift assignments', category: 'shifts' },
    { product: 'schedulehub', name: 'scheduling:shifts:delete', display_name: 'Delete Shifts', description: 'Cancel shift assignments', category: 'shifts' },
    { product: 'schedulehub', name: 'scheduling:shifts:assign', display_name: 'Assign Shifts', description: 'Assign/unassign workers to shifts', category: 'shifts' },
    { product: 'schedulehub', name: 'scheduling:shifts:clock', display_name: 'Clock In/Out', description: 'Clock in/out of shifts', category: 'shifts' },

    // Shift Template Management
    { product: 'schedulehub', name: 'scheduling:shift_templates:manage', display_name: 'Manage Shift Templates', description: 'Create, update, delete, and manage reusable shift templates', category: 'shift_templates' },

    // Station Management
    { product: 'schedulehub', name: 'scheduling:stations:create', display_name: 'Create Stations', description: 'Create work stations', category: 'stations' },
    { product: 'schedulehub', name: 'scheduling:stations:read', display_name: 'View Stations', description: 'View station information and requirements', category: 'stations' },
    { product: 'schedulehub', name: 'scheduling:stations:update', display_name: 'Update Stations', description: 'Update station information and requirements', category: 'stations' },

    // Station Assignment Management
    { product: 'schedulehub', name: 'scheduling:assignments:create', display_name: 'Create Assignments', description: 'Create worker station assignments', category: 'assignments' },
    { product: 'schedulehub', name: 'scheduling:assignments:read', display_name: 'View Assignments', description: 'View station assignments and coverage', category: 'assignments' },
    { product: 'schedulehub', name: 'scheduling:assignments:update', display_name: 'Update Assignments', description: 'Update station assignments', category: 'assignments' },
    { product: 'schedulehub', name: 'scheduling:assignments:delete', display_name: 'Delete Assignments', description: 'Remove station assignments', category: 'assignments' },
    { product: 'schedulehub', name: 'scheduling:assignments:assign', display_name: 'Assign Workers', description: 'Assign/unassign workers to stations', category: 'assignments' },

    // Worker Management
    { product: 'schedulehub', name: 'scheduling:workers:create', display_name: 'Create Workers', description: 'Create worker profiles', category: 'workers' },
    { product: 'schedulehub', name: 'scheduling:workers:read', display_name: 'View Workers', description: 'View worker information', category: 'workers' },
    { product: 'schedulehub', name: 'scheduling:workers:update', display_name: 'Update Workers', description: 'Update worker profiles', category: 'workers' },
    { product: 'schedulehub', name: 'scheduling:workers:delete', display_name: 'Delete Workers', description: 'Terminate worker profiles', category: 'workers' },

    // Availability Management
    { product: 'schedulehub', name: 'scheduling:availability:create', display_name: 'Create Availability', description: 'Set worker availability and default schedules', category: 'availability' },
    { product: 'schedulehub', name: 'scheduling:availability:read', display_name: 'View Availability', description: 'View worker availability and check availability', category: 'availability' },
    { product: 'schedulehub', name: 'scheduling:availability:update', display_name: 'Update Availability', description: 'Update availability settings', category: 'availability' },
    { product: 'schedulehub', name: 'scheduling:availability:delete', display_name: 'Delete Availability', description: 'Delete availability records', category: 'availability' },

    // Time-Off Management
    { product: 'schedulehub', name: 'scheduling:time_off:create', display_name: 'Create Time-Off Requests', description: 'Create time-off requests', category: 'time_off' },
    { product: 'schedulehub', name: 'scheduling:time_off:read', display_name: 'View Time-Off Requests', description: 'View time-off information', category: 'time_off' },
    { product: 'schedulehub', name: 'scheduling:time_off:delete', display_name: 'Cancel Time-Off', description: 'Cancel time-off requests', category: 'time_off' },
    { product: 'schedulehub', name: 'scheduling:time_off:approve', display_name: 'Approve Time-Off', description: 'Review and approve/reject time-off requests', category: 'time_off' },

    // Shift Swap Marketplace
    { product: 'schedulehub', name: 'scheduling:shift_swaps:create', display_name: 'Create Swap Requests', description: 'Create shift swap offers and requests', category: 'shift_swaps' },
    { product: 'schedulehub', name: 'scheduling:shift_swaps:read', display_name: 'View Swap Requests', description: 'View swap marketplace and offers', category: 'shift_swaps' },
    { product: 'schedulehub', name: 'scheduling:shift_swaps:approve', display_name: 'Approve Swaps', description: 'Approve/accept shift swap requests', category: 'shift_swaps' },
    { product: 'schedulehub', name: 'scheduling:shift_swaps:delete', display_name: 'Cancel Swaps', description: 'Cancel swap offers', category: 'shift_swaps' },

    // Role Management
    { product: 'schedulehub', name: 'scheduling:roles:create', display_name: 'Create Roles', description: 'Create worker roles', category: 'roles' },
    { product: 'schedulehub', name: 'scheduling:roles:read', display_name: 'View Roles', description: 'View role information and assignments', category: 'roles' },
    { product: 'schedulehub', name: 'scheduling:roles:update', display_name: 'Update Roles', description: 'Update role information', category: 'roles' },
    { product: 'schedulehub', name: 'scheduling:roles:assign', display_name: 'Assign Roles', description: 'Assign/remove workers from roles', category: 'roles' },

    // Statistics & Analytics
    { product: 'schedulehub', name: 'scheduling:stats:read', display_name: 'View Statistics', description: 'View scheduling statistics and dashboard', category: 'stats' }
  ];

  // Insert all permissions
  for (const permission of schedulehubPermissions) {
    await knex('permissions')
      .insert(permission)
      .onConflict(['product', 'name'])
      .ignore();
  }

  console.log('[OK] ScheduleHub permissions seeded successfully!');
  console.log('Total: 38 permissions (matching all route requirements)');
  console.log('');
  console.log('Categories:');
  console.log('  - schedules (3 permissions)');
  console.log('  - shifts (6 permissions)');
  console.log('  - stations (3 permissions)');
  console.log('  - assignments (5 permissions)');
  console.log('  - workers (4 permissions)');
  console.log('  - availability (4 permissions)');
  console.log('  - time_off (4 permissions)');
  console.log('  - shift_swaps (4 permissions)');
  console.log('  - roles (4 permissions)');
  console.log('  - stats (1 permission)');
  console.log('');
  console.log('All permissions use "scheduling:" prefix to match routes');
}
