/**
 * Seed: Nexus (HRIS) Product Permissions
 * Source: seed-rbac-nexus-permissions.sql
 * 
 * Seeds permissions for Nexus HRIS product:
 * - Employee Management
 * - Location Management
 * - Department Management
 * - Contract Management
 * - Time-Off Management
 * - Attendance Management
 * - Benefits Management
 * - Performance Management
 * - Document Management
 * - Reports & Analytics
 * - Settings & Configuration
 */

export async function seed(knex) {
  // ============================================================================
  // NEXUS PRODUCT PERMISSIONS
  // ============================================================================

  const nexusPermissions = [
    // Employee Management
    { product: 'nexus', name: 'employees:create', display_name: 'Create Employees', description: 'Create new employee records', category: 'employees' },
    { product: 'nexus', name: 'employees:read', display_name: 'View Employees', description: 'View employee information', category: 'employees' },
    { product: 'nexus', name: 'employees:update', display_name: 'Update Employees', description: 'Update employee information', category: 'employees' },
    { product: 'nexus', name: 'employees:delete', display_name: 'Delete Employees', description: 'Delete employee records', category: 'employees' },
    { product: 'nexus', name: 'employees:terminate', display_name: 'Terminate Employees', description: 'Terminate employee contracts', category: 'employees' },
    { product: 'nexus', name: 'employees:export', display_name: 'Export Employees', description: 'Export employee data', category: 'employees' },
    { product: 'nexus', name: 'employees:import', display_name: 'Import Employees', description: 'Import employee data', category: 'employees' },

    // Location Management
    { product: 'nexus', name: 'locations:create', display_name: 'Create Locations', description: 'Create new work locations', category: 'locations' },
    { product: 'nexus', name: 'locations:read', display_name: 'View Locations', description: 'View location information', category: 'locations' },
    { product: 'nexus', name: 'locations:update', display_name: 'Update Locations', description: 'Update location information', category: 'locations' },
    { product: 'nexus', name: 'locations:delete', display_name: 'Delete Locations', description: 'Delete location records', category: 'locations' },
    { product: 'nexus', name: 'locations:manage', display_name: 'Manage Locations', description: 'Full location management', category: 'locations' },

    // Department Management
    { product: 'nexus', name: 'departments:create', display_name: 'Create Departments', description: 'Create new departments', category: 'departments' },
    { product: 'nexus', name: 'departments:read', display_name: 'View Departments', description: 'View department information', category: 'departments' },
    { product: 'nexus', name: 'departments:update', display_name: 'Update Departments', description: 'Update department information', category: 'departments' },
    { product: 'nexus', name: 'departments:delete', display_name: 'Delete Departments', description: 'Delete department records', category: 'departments' },
    { product: 'nexus', name: 'departments:manage', display_name: 'Manage Departments', description: 'Full department management', category: 'departments' },

    // Contract Management
    { product: 'nexus', name: 'contracts:create', display_name: 'Create Contracts', description: 'Create employment contracts', category: 'contracts' },
    { product: 'nexus', name: 'contracts:read', display_name: 'View Contracts', description: 'View contract information', category: 'contracts' },
    { product: 'nexus', name: 'contracts:update', display_name: 'Update Contracts', description: 'Update contract information', category: 'contracts' },
    { product: 'nexus', name: 'contracts:delete', display_name: 'Delete Contracts', description: 'Delete contract records', category: 'contracts' },
    { product: 'nexus', name: 'contracts:approve', display_name: 'Approve Contracts', description: 'Approve contract changes', category: 'contracts' },
    { product: 'nexus', name: 'contracts:sign', display_name: 'Sign Contracts', description: 'Sign contracts electronically', category: 'contracts' },

    // Time-Off Management
    { product: 'nexus', name: 'timeoff:create', display_name: 'Create Time-Off Requests', description: 'Create time-off requests', category: 'timeoff' },
    { product: 'nexus', name: 'timeoff:read', display_name: 'View Time-Off Requests', description: 'View time-off information', category: 'timeoff' },
    { product: 'nexus', name: 'timeoff:update', display_name: 'Update Time-Off Requests', description: 'Update time-off requests', category: 'timeoff' },
    { product: 'nexus', name: 'timeoff:delete', display_name: 'Delete Time-Off Requests', description: 'Delete time-off requests', category: 'timeoff' },
    { product: 'nexus', name: 'timeoff:approve', display_name: 'Approve Time-Off', description: 'Approve/reject time-off requests', category: 'timeoff' },
    { product: 'nexus', name: 'timeoff:manage', display_name: 'Manage Time-Off', description: 'Full time-off management', category: 'timeoff' },

    // Attendance Management
    { product: 'nexus', name: 'attendance:create', display_name: 'Create Attendance Records', description: 'Create attendance records', category: 'attendance' },
    { product: 'nexus', name: 'attendance:read', display_name: 'View Attendance', description: 'View attendance records', category: 'attendance' },
    { product: 'nexus', name: 'attendance:update', display_name: 'Update Attendance', description: 'Update attendance records', category: 'attendance' },
    { product: 'nexus', name: 'attendance:delete', display_name: 'Delete Attendance', description: 'Delete attendance records', category: 'attendance' },
    { product: 'nexus', name: 'attendance:approve', display_name: 'Approve Attendance', description: 'Approve attendance records', category: 'attendance' },

    // Benefits Management
    { product: 'nexus', name: 'benefits:create', display_name: 'Create Benefits', description: 'Create benefit plans', category: 'benefits' },
    { product: 'nexus', name: 'benefits:read', display_name: 'View Benefits', description: 'View benefit information', category: 'benefits' },
    { product: 'nexus', name: 'benefits:update', display_name: 'Update Benefits', description: 'Update benefit plans', category: 'benefits' },
    { product: 'nexus', name: 'benefits:delete', display_name: 'Delete Benefits', description: 'Delete benefit plans', category: 'benefits' },
    { product: 'nexus', name: 'benefits:enroll', display_name: 'Enroll in Benefits', description: 'Enroll employees in benefits', category: 'benefits' },
    { product: 'nexus', name: 'benefits:manage', display_name: 'Manage Benefits', description: 'Full benefits administration', category: 'benefits' },

    // Performance Management
    { product: 'nexus', name: 'performance:create', display_name: 'Create Performance Reviews', description: 'Create performance reviews', category: 'performance' },
    { product: 'nexus', name: 'performance:read', display_name: 'View Performance Reviews', description: 'View performance information', category: 'performance' },
    { product: 'nexus', name: 'performance:update', display_name: 'Update Performance Reviews', description: 'Update performance reviews', category: 'performance' },
    { product: 'nexus', name: 'performance:delete', display_name: 'Delete Performance Reviews', description: 'Delete performance reviews', category: 'performance' },
    { product: 'nexus', name: 'performance:approve', display_name: 'Approve Performance Reviews', description: 'Approve performance reviews', category: 'performance' },
    { product: 'nexus', name: 'performance:goals', display_name: 'Manage Goals', description: 'Manage employee goals', category: 'performance' },

    // Document Management
    { product: 'nexus', name: 'documents:create', display_name: 'Upload Documents', description: 'Upload employee documents', category: 'documents' },
    { product: 'nexus', name: 'documents:read', display_name: 'View Documents', description: 'View employee documents', category: 'documents' },
    { product: 'nexus', name: 'documents:update', display_name: 'Update Documents', description: 'Update document information', category: 'documents' },
    { product: 'nexus', name: 'documents:delete', display_name: 'Delete Documents', description: 'Delete documents', category: 'documents' },
    { product: 'nexus', name: 'documents:download', display_name: 'Download Documents', description: 'Download employee documents', category: 'documents' },
    { product: 'nexus', name: 'documents:sign', display_name: 'Request Signatures', description: 'Request document signatures', category: 'documents' },

    // Reports & Analytics
    { product: 'nexus', name: 'reports:view', display_name: 'View Reports', description: 'View HRIS reports', category: 'reports' },
    { product: 'nexus', name: 'reports:export', display_name: 'Export Reports', description: 'Export report data', category: 'reports' },
    { product: 'nexus', name: 'reports:headcount', display_name: 'View Headcount Reports', description: 'View headcount analytics', category: 'reports' },
    { product: 'nexus', name: 'reports:turnover', display_name: 'View Turnover Reports', description: 'View turnover analytics', category: 'reports' },
    { product: 'nexus', name: 'reports:attendance', display_name: 'View Attendance Reports', description: 'View attendance analytics', category: 'reports' },

    // Settings & Configuration
    { product: 'nexus', name: 'settings:view', display_name: 'View Settings', description: 'View Nexus settings', category: 'settings' },
    { product: 'nexus', name: 'settings:update', display_name: 'Update Settings', description: 'Update Nexus configuration', category: 'settings' },
    { product: 'nexus', name: 'settings:manage', display_name: 'Manage Settings', description: 'Full settings management', category: 'settings' }
  ];

  // Insert all permissions
  for (const permission of nexusPermissions) {
    await knex('permissions')
      .insert(permission)
      .onConflict(['product', 'name'])
      .ignore();
  }

  console.log('[OK] Nexus HRIS permissions seeded successfully!');
  console.log('Categories:');
  console.log('  - employees (7 permissions)');
  console.log('  - locations (5 permissions)');
  console.log('  - departments (5 permissions)');
  console.log('  - contracts (6 permissions)');
  console.log('  - timeoff (6 permissions)');
  console.log('  - attendance (5 permissions)');
  console.log('  - benefits (6 permissions)');
  console.log('  - performance (6 permissions)');
  console.log('  - documents (6 permissions)');
  console.log('  - reports (5 permissions)');
  console.log('  - settings (3 permissions)');
}
