/**
 * Seed file for Nexus HRIS permissions
 * Environment: Production
 */

export async function seed(knex) {
  const tableName = 'hris.permissions';

  console.log('→ Seeding Nexus HRIS permissions...');

  const nexusPermissions = [
    // ========================================
    // Employee Management
    // ========================================
    {
      code: 'nexus.employees.view',
      name: 'View Employees',
      description: 'View employee profiles and information',
      category: 'employees',
      is_system: false,
    },
    {
      code: 'nexus.employees.create',
      name: 'Create Employees',
      description: 'Create new employee records',
      category: 'employees',
      is_system: false,
    },
    {
      code: 'nexus.employees.update',
      name: 'Update Employees',
      description: 'Update employee information',
      category: 'employees',
      is_system: false,
    },
    {
      code: 'nexus.employees.delete',
      name: 'Delete Employees',
      description: 'Delete employee records',
      category: 'employees',
      is_system: false,
    },
    {
      code: 'nexus.employees.terminate',
      name: 'Terminate Employees',
      description: 'Terminate employee contracts',
      category: 'employees',
      is_system: false,
    },

    // ========================================
    // Department Management
    // ========================================
    {
      code: 'nexus.departments.view',
      name: 'View Departments',
      description: 'View department information',
      category: 'departments',
      is_system: false,
    },
    {
      code: 'nexus.departments.create',
      name: 'Create Departments',
      description: 'Create new departments',
      category: 'departments',
      is_system: false,
    },
    {
      code: 'nexus.departments.update',
      name: 'Update Departments',
      description: 'Update department information',
      category: 'departments',
      is_system: false,
    },
    {
      code: 'nexus.departments.delete',
      name: 'Delete Departments',
      description: 'Delete departments',
      category: 'departments',
      is_system: false,
    },

    // ========================================
    // Location Management
    // ========================================
    {
      code: 'nexus.locations.view',
      name: 'View Locations',
      description: 'View office locations',
      category: 'locations',
      is_system: false,
    },
    {
      code: 'nexus.locations.create',
      name: 'Create Locations',
      description: 'Create new office locations',
      category: 'locations',
      is_system: false,
    },
    {
      code: 'nexus.locations.update',
      name: 'Update Locations',
      description: 'Update location information',
      category: 'locations',
      is_system: false,
    },
    {
      code: 'nexus.locations.delete',
      name: 'Delete Locations',
      description: 'Delete office locations',
      category: 'locations',
      is_system: false,
    },

    // ========================================
    // Time-Off Management
    // ========================================
    {
      code: 'nexus.timeoff.view',
      name: 'View Time-Off',
      description: 'View time-off requests',
      category: 'timeoff',
      is_system: false,
    },
    {
      code: 'nexus.timeoff.request',
      name: 'Request Time-Off',
      description: 'Submit time-off requests',
      category: 'timeoff',
      is_system: false,
    },
    {
      code: 'nexus.timeoff.approve',
      name: 'Approve Time-Off',
      description: 'Approve or reject time-off requests',
      category: 'timeoff',
      is_system: false,
    },
    {
      code: 'nexus.timeoff.cancel',
      name: 'Cancel Time-Off',
      description: 'Cancel approved time-off',
      category: 'timeoff',
      is_system: false,
    },

    // ========================================
    // Attendance Management
    // ========================================
    {
      code: 'nexus.attendance.view',
      name: 'View Attendance',
      description: 'View attendance records',
      category: 'attendance',
      is_system: false,
    },
    {
      code: 'nexus.attendance.record',
      name: 'Record Attendance',
      description: 'Record attendance (clock in/out)',
      category: 'attendance',
      is_system: false,
    },
    {
      code: 'nexus.attendance.manage',
      name: 'Manage Attendance',
      description: 'Edit and manage attendance records',
      category: 'attendance',
      is_system: false,
    },

    // ========================================
    // Benefits Management
    // ========================================
    {
      code: 'nexus.benefits.view',
      name: 'View Benefits',
      description: 'View benefits information',
      category: 'benefits',
      is_system: false,
    },
    {
      code: 'nexus.benefits.manage',
      name: 'Manage Benefits',
      description: 'Manage employee benefits',
      category: 'benefits',
      is_system: false,
    },
    {
      code: 'nexus.benefits.enroll',
      name: 'Enroll in Benefits',
      description: 'Enroll employees in benefit plans',
      category: 'benefits',
      is_system: false,
    },

    // ========================================
    // Performance Management
    // ========================================
    {
      code: 'nexus.performance.view',
      name: 'View Performance',
      description: 'View performance reviews',
      category: 'performance',
      is_system: false,
    },
    {
      code: 'nexus.performance.create',
      name: 'Create Reviews',
      description: 'Create performance reviews',
      category: 'performance',
      is_system: false,
    },
    {
      code: 'nexus.performance.manage',
      name: 'Manage Reviews',
      description: 'Manage performance reviews',
      category: 'performance',
      is_system: false,
    },

    // ========================================
    // Documents Management
    // ========================================
    {
      code: 'nexus.documents.view',
      name: 'View Documents',
      description: 'View employee documents',
      category: 'documents',
      is_system: false,
    },
    {
      code: 'nexus.documents.upload',
      name: 'Upload Documents',
      description: 'Upload employee documents',
      category: 'documents',
      is_system: false,
    },
    {
      code: 'nexus.documents.delete',
      name: 'Delete Documents',
      description: 'Delete employee documents',
      category: 'documents',
      is_system: false,
    },

    // ========================================
    // Contracts Management
    // ========================================
    {
      code: 'nexus.contracts.view',
      name: 'View Contracts',
      description: 'View employment contracts',
      category: 'contracts',
      is_system: false,
    },
    {
      code: 'nexus.contracts.create',
      name: 'Create Contracts',
      description: 'Create employment contracts',
      category: 'contracts',
      is_system: false,
    },
    {
      code: 'nexus.contracts.manage',
      name: 'Manage Contracts',
      description: 'Manage employment contracts',
      category: 'contracts',
      is_system: false,
    },
  ];

  await knex(tableName).insert(nexusPermissions);

  console.log(`✓ Seeded ${nexusPermissions.length} Nexus HRIS permissions`);
}
