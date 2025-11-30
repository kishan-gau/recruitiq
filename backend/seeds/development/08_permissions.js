/**
 * Seed file for permissions
 * 
 * Populates the permissions table with all available system permissions
 * organized by module/category and product
 */

export async function seed(knex) {
  // Delete existing entries
  await knex('permissions').del();

  // Define permissions grouped by product and category
  const permissions = [
    // ============================================================================
    // CORE PLATFORM PERMISSIONS
    // ============================================================================
    { product: 'core', name: 'users.view', display_name: 'View Users', description: 'View user profiles and lists', category: 'User Management' },
    { product: 'core', name: 'users.create', display_name: 'Create Users', description: 'Create new user accounts', category: 'User Management' },
    { product: 'core', name: 'users.update', display_name: 'Update Users', description: 'Edit user information', category: 'User Management' },
    { product: 'core', name: 'users.delete', display_name: 'Delete Users', description: 'Delete user accounts', category: 'User Management' },
    { product: 'core', name: 'users.manage_roles', display_name: 'Manage User Roles', description: 'Assign and modify user roles', category: 'User Management' },

    { product: 'core', name: 'roles.view', display_name: 'View Roles', description: 'View role definitions', category: 'Role Management' },
    { product: 'core', name: 'roles.create', display_name: 'Create Roles', description: 'Create new roles', category: 'Role Management' },
    { product: 'core', name: 'roles.update', display_name: 'Update Roles', description: 'Edit role definitions', category: 'Role Management' },
    { product: 'core', name: 'roles.delete', display_name: 'Delete Roles', description: 'Delete roles', category: 'Role Management' },
    { product: 'core', name: 'roles.manage_permissions', display_name: 'Manage Role Permissions', description: 'Assign permissions to roles', category: 'Role Management' },

    { product: 'core', name: 'organizations.view', display_name: 'View Organization', description: 'View organization information', category: 'Organization Management' },
    { product: 'core', name: 'organizations.update', display_name: 'Update Organization', description: 'Edit organization settings', category: 'Organization Management' },
    { product: 'core', name: 'organizations.manage_settings', display_name: 'Manage Organization Settings', description: 'Configure organization-wide settings', category: 'Organization Management' },

    // ============================================================================
    // NEXUS (HRIS) PERMISSIONS
    // ============================================================================
    { product: 'nexus', name: 'employees.view', display_name: 'View Employees', description: 'View employee records', category: 'Employee Management' },
    { product: 'nexus', name: 'employees.create', display_name: 'Create Employees', description: 'Create new employee records', category: 'Employee Management' },
    { product: 'nexus', name: 'employees.update', display_name: 'Update Employees', description: 'Edit employee information', category: 'Employee Management' },
    { product: 'nexus', name: 'employees.delete', display_name: 'Delete Employees', description: 'Delete employee records', category: 'Employee Management' },
    { product: 'nexus', name: 'employees.terminate', display_name: 'Terminate Employees', description: 'Terminate employee contracts', category: 'Employee Management' },
    { product: 'nexus', name: 'employees.view_sensitive', display_name: 'View Sensitive Employee Data', description: 'Access sensitive employee information (SSN, salary)', category: 'Employee Management' },

    { product: 'nexus', name: 'departments.view', display_name: 'View Departments', description: 'View department information', category: 'Department Management' },
    { product: 'nexus', name: 'departments.create', display_name: 'Create Departments', description: 'Create new departments', category: 'Department Management' },
    { product: 'nexus', name: 'departments.update', display_name: 'Update Departments', description: 'Edit department information', category: 'Department Management' },
    { product: 'nexus', name: 'departments.delete', display_name: 'Delete Departments', description: 'Delete departments', category: 'Department Management' },

    { product: 'nexus', name: 'locations.view', display_name: 'View Locations', description: 'View office locations', category: 'Location Management' },
    { product: 'nexus', name: 'locations.create', display_name: 'Create Locations', description: 'Create new locations', category: 'Location Management' },
    { product: 'nexus', name: 'locations.update', display_name: 'Update Locations', description: 'Edit location information', category: 'Location Management' },
    { product: 'nexus', name: 'locations.delete', display_name: 'Delete Locations', description: 'Delete locations', category: 'Location Management' },

    { product: 'nexus', name: 'timeoff.view', display_name: 'View Time-Off', description: 'View time-off requests', category: 'Time-Off Management' },
    { product: 'nexus', name: 'timeoff.request', display_name: 'Request Time-Off', description: 'Submit time-off requests', category: 'Time-Off Management' },
    { product: 'nexus', name: 'timeoff.approve', display_name: 'Approve Time-Off', description: 'Approve or reject time-off requests', category: 'Time-Off Management' },
    { product: 'nexus', name: 'timeoff.cancel', display_name: 'Cancel Time-Off', description: 'Cancel approved time-off', category: 'Time-Off Management' },

    { product: 'nexus', name: 'attendance.view', display_name: 'View Attendance', description: 'View attendance records', category: 'Attendance Management' },
    { product: 'nexus', name: 'attendance.record', display_name: 'Record Attendance', description: 'Clock in/out and record attendance', category: 'Attendance Management' },
    { product: 'nexus', name: 'attendance.approve', display_name: 'Approve Attendance', description: 'Approve attendance records', category: 'Attendance Management' },
    { product: 'nexus', name: 'attendance.manage', display_name: 'Manage Attendance', description: 'Edit and manage all attendance records', category: 'Attendance Management' },

    // ============================================================================
    // PAYLINQ (PAYROLL) PERMISSIONS
    // ============================================================================
    { product: 'paylinq', name: 'payroll.view', display_name: 'View Payroll', description: 'View payroll information', category: 'Payroll Management' },
    { product: 'paylinq', name: 'payroll.process', display_name: 'Process Payroll', description: 'Run payroll processing', category: 'Payroll Management' },
    { product: 'paylinq', name: 'payroll.approve', display_name: 'Approve Payroll', description: 'Approve payroll runs', category: 'Payroll Management' },
    { product: 'paylinq', name: 'payroll.finalize', display_name: 'Finalize Payroll', description: 'Finalize payroll for payment', category: 'Payroll Management' },
    { product: 'paylinq', name: 'payroll.view_all', display_name: 'View All Payroll', description: 'View payroll for all employees', category: 'Payroll Management' },

    // ============================================================================
    // SCHEDULEHUB PERMISSIONS
    // ============================================================================
    { product: 'schedulehub', name: 'schedules.view', display_name: 'View Schedules', description: 'View work schedules', category: 'Scheduling' },
    { product: 'schedulehub', name: 'schedules.create', display_name: 'Create Schedules', description: 'Create work schedules', category: 'Scheduling' },
    { product: 'schedulehub', name: 'schedules.update', display_name: 'Update Schedules', description: 'Edit work schedules', category: 'Scheduling' },
    { product: 'schedulehub', name: 'schedules.delete', display_name: 'Delete Schedules', description: 'Delete work schedules', category: 'Scheduling' },
    { product: 'schedulehub', name: 'schedules.publish', display_name: 'Publish Schedules', description: 'Publish schedules to employees', category: 'Scheduling' },

    { product: 'schedulehub', name: 'stations.view', display_name: 'View Stations', description: 'View work stations', category: 'Station Management' },
    { product: 'schedulehub', name: 'stations.create', display_name: 'Create Stations', description: 'Create work stations', category: 'Station Management' },
    { product: 'schedulehub', name: 'stations.update', display_name: 'Update Stations', description: 'Edit work stations', category: 'Station Management' },
    { product: 'schedulehub', name: 'stations.delete', display_name: 'Delete Stations', description: 'Delete work stations', category: 'Station Management' },

    // ============================================================================
    // RECRUITIQ (ATS) PERMISSIONS
    // ============================================================================
    { product: 'recruitiq', name: 'jobs.view', display_name: 'View Jobs', description: 'View job postings', category: 'Job Management' },
    { product: 'recruitiq', name: 'jobs.create', display_name: 'Create Jobs', description: 'Create new job postings', category: 'Job Management' },
    { product: 'recruitiq', name: 'jobs.update', display_name: 'Update Jobs', description: 'Edit job postings', category: 'Job Management' },
    { product: 'recruitiq', name: 'jobs.delete', display_name: 'Delete Jobs', description: 'Delete job postings', category: 'Job Management' },
    { product: 'recruitiq', name: 'jobs.publish', display_name: 'Publish Jobs', description: 'Publish job postings', category: 'Job Management' },

    { product: 'recruitiq', name: 'candidates.view', display_name: 'View Candidates', description: 'View candidate profiles', category: 'Candidate Management' },
    { product: 'recruitiq', name: 'candidates.create', display_name: 'Create Candidates', description: 'Add new candidates', category: 'Candidate Management' },
    { product: 'recruitiq', name: 'candidates.update', display_name: 'Update Candidates', description: 'Edit candidate information', category: 'Candidate Management' },
    { product: 'recruitiq', name: 'candidates.delete', display_name: 'Delete Candidates', description: 'Delete candidate records', category: 'Candidate Management' },

    { product: 'recruitiq', name: 'applications.view', display_name: 'View Applications', description: 'View job applications', category: 'Application Management' },
    { product: 'recruitiq', name: 'applications.review', display_name: 'Review Applications', description: 'Review and evaluate applications', category: 'Application Management' },
    { product: 'recruitiq', name: 'applications.approve', display_name: 'Approve Applications', description: 'Approve applications for next stage', category: 'Application Management' },
    { product: 'recruitiq', name: 'applications.reject', display_name: 'Reject Applications', description: 'Reject applications', category: 'Application Management' },

    { product: 'recruitiq', name: 'interviews.view', display_name: 'View Interviews', description: 'View interview schedules', category: 'Interview Management' },
    { product: 'recruitiq', name: 'interviews.schedule', display_name: 'Schedule Interviews', description: 'Schedule interviews', category: 'Interview Management' },
    { product: 'recruitiq', name: 'interviews.conduct', display_name: 'Conduct Interviews', description: 'Conduct and evaluate interviews', category: 'Interview Management' },
    { product: 'recruitiq', name: 'interviews.cancel', display_name: 'Cancel Interviews', description: 'Cancel scheduled interviews', category: 'Interview Management' },

    // ============================================================================
    // REPORTING & ANALYTICS (CROSS-PRODUCT)
    // ============================================================================
    { product: 'core', name: 'reports.view', display_name: 'View Reports', description: 'Access reporting features', category: 'Reporting' },
    { product: 'core', name: 'reports.create', display_name: 'Create Reports', description: 'Generate custom reports', category: 'Reporting' },
    { product: 'core', name: 'reports.export', display_name: 'Export Reports', description: 'Export reports to various formats', category: 'Reporting' },
    { product: 'core', name: 'analytics.view', display_name: 'View Analytics', description: 'Access analytics dashboards', category: 'Analytics' },

    // ============================================================================
    // SYSTEM ADMINISTRATION
    // ============================================================================
    { product: 'core', name: 'system.view_logs', display_name: 'View System Logs', description: 'Access system audit logs', category: 'System Administration' },
    { product: 'core', name: 'system.manage_settings', display_name: 'Manage System Settings', description: 'Configure system-wide settings', category: 'System Administration' },
    { product: 'core', name: 'system.manage_integrations', display_name: 'Manage Integrations', description: 'Configure third-party integrations', category: 'System Administration' },
    { product: 'core', name: 'system.manage_products', display_name: 'Manage Products', description: 'Enable/disable products for organization', category: 'System Administration' },
  ];

  // Insert permissions
  await knex('permissions').insert(permissions);

  console.log(`✅ Seeded ${permissions.length} permissions`);
};
