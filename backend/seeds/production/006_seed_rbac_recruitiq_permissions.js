/**
 * Seed: RecruitIQ (ATS) Product Permissions
 * Source: seed-rbac-recruitiq-permissions.sql
 * 
 * Seeds permissions for RecruitIQ applicant tracking system:
 * - Job Management
 * - Candidate Management
 * - Application Management
 * - Interview Management
 * - Offer Management
 * - Pipeline Management
 * - Communication
 * - Career Site
 * - Reports & Analytics
 * - Settings & Configuration
 */

export async function seed(knex) {
  // ============================================================================
  // RECRUITIQ PRODUCT PERMISSIONS
  // ============================================================================

  const recruitiqPermissions = [
    // Job Management
    { product: 'recruitiq', name: 'jobs:create', display_name: 'Create Jobs', description: 'Create job postings', category: 'jobs' },
    { product: 'recruitiq', name: 'jobs:read', display_name: 'View Jobs', description: 'View job information', category: 'jobs' },
    { product: 'recruitiq', name: 'jobs:update', display_name: 'Update Jobs', description: 'Update job postings', category: 'jobs' },
    { product: 'recruitiq', name: 'jobs:delete', display_name: 'Delete Jobs', description: 'Delete job postings', category: 'jobs' },
    { product: 'recruitiq', name: 'jobs:publish', display_name: 'Publish Jobs', description: 'Publish jobs to career site', category: 'jobs' },
    { product: 'recruitiq', name: 'jobs:close', display_name: 'Close Jobs', description: 'Close job postings', category: 'jobs' },

    // Candidate Management
    { product: 'recruitiq', name: 'candidates:create', display_name: 'Create Candidates', description: 'Create candidate profiles', category: 'candidates' },
    { product: 'recruitiq', name: 'candidates:read', display_name: 'View Candidates', description: 'View candidate information', category: 'candidates' },
    { product: 'recruitiq', name: 'candidates:update', display_name: 'Update Candidates', description: 'Update candidate profiles', category: 'candidates' },
    { product: 'recruitiq', name: 'candidates:delete', display_name: 'Delete Candidates', description: 'Delete candidate records', category: 'candidates' },
    { product: 'recruitiq', name: 'candidates:import', display_name: 'Import Candidates', description: 'Import candidate data', category: 'candidates' },
    { product: 'recruitiq', name: 'candidates:export', display_name: 'Export Candidates', description: 'Export candidate data', category: 'candidates' },

    // Application Management
    { product: 'recruitiq', name: 'applications:create', display_name: 'Create Applications', description: 'Create job applications', category: 'applications' },
    { product: 'recruitiq', name: 'applications:read', display_name: 'View Applications', description: 'View application information', category: 'applications' },
    { product: 'recruitiq', name: 'applications:update', display_name: 'Update Applications', description: 'Update application status', category: 'applications' },
    { product: 'recruitiq', name: 'applications:delete', display_name: 'Delete Applications', description: 'Delete applications', category: 'applications' },
    { product: 'recruitiq', name: 'applications:review', display_name: 'Review Applications', description: 'Review and screen applications', category: 'applications' },
    { product: 'recruitiq', name: 'applications:reject', display_name: 'Reject Applications', description: 'Reject applications', category: 'applications' },

    // Interview Management
    { product: 'recruitiq', name: 'interviews:create', display_name: 'Schedule Interviews', description: 'Schedule candidate interviews', category: 'interviews' },
    { product: 'recruitiq', name: 'interviews:read', display_name: 'View Interviews', description: 'View interview information', category: 'interviews' },
    { product: 'recruitiq', name: 'interviews:update', display_name: 'Update Interviews', description: 'Update interview details', category: 'interviews' },
    { product: 'recruitiq', name: 'interviews:delete', display_name: 'Cancel Interviews', description: 'Cancel scheduled interviews', category: 'interviews' },
    { product: 'recruitiq', name: 'interviews:feedback', display_name: 'Provide Feedback', description: 'Provide interview feedback', category: 'interviews' },
    { product: 'recruitiq', name: 'interviews:manage', display_name: 'Manage Interviews', description: 'Full interview management', category: 'interviews' },

    // Offer Management
    { product: 'recruitiq', name: 'offers:create', display_name: 'Create Offers', description: 'Create job offers', category: 'offers' },
    { product: 'recruitiq', name: 'offers:read', display_name: 'View Offers', description: 'View offer information', category: 'offers' },
    { product: 'recruitiq', name: 'offers:update', display_name: 'Update Offers', description: 'Update offer details', category: 'offers' },
    { product: 'recruitiq', name: 'offers:delete', display_name: 'Delete Offers', description: 'Delete offers', category: 'offers' },
    { product: 'recruitiq', name: 'offers:approve', display_name: 'Approve Offers', description: 'Approve offers for sending', category: 'offers' },
    { product: 'recruitiq', name: 'offers:send', display_name: 'Send Offers', description: 'Send offers to candidates', category: 'offers' },

    // Pipeline Management
    { product: 'recruitiq', name: 'pipeline:view', display_name: 'View Pipeline', description: 'View recruitment pipeline', category: 'pipeline' },
    { product: 'recruitiq', name: 'pipeline:manage', display_name: 'Manage Pipeline', description: 'Manage pipeline stages', category: 'pipeline' },
    { product: 'recruitiq', name: 'pipeline:move', display_name: 'Move Candidates', description: 'Move candidates through pipeline', category: 'pipeline' },

    // Communication
    { product: 'recruitiq', name: 'communication:send', display_name: 'Send Messages', description: 'Send messages to candidates', category: 'communication' },
    { product: 'recruitiq', name: 'communication:templates', display_name: 'Manage Templates', description: 'Manage email templates', category: 'communication' },
    { product: 'recruitiq', name: 'communication:history', display_name: 'View History', description: 'View communication history', category: 'communication' },

    // Career Site
    { product: 'recruitiq', name: 'career-site:view', display_name: 'View Career Site', description: 'View career site content', category: 'career-site' },
    { product: 'recruitiq', name: 'career-site:manage', display_name: 'Manage Career Site', description: 'Manage career site settings', category: 'career-site' },
    { product: 'recruitiq', name: 'career-site:publish', display_name: 'Publish Content', description: 'Publish career site content', category: 'career-site' },

    // Reports & Analytics
    { product: 'recruitiq', name: 'reports:view', display_name: 'View Reports', description: 'View recruitment reports', category: 'reports' },
    { product: 'recruitiq', name: 'reports:export', display_name: 'Export Reports', description: 'Export report data', category: 'reports' },
    { product: 'recruitiq', name: 'reports:pipeline', display_name: 'View Pipeline Reports', description: 'View pipeline analytics', category: 'reports' },
    { product: 'recruitiq', name: 'reports:source', display_name: 'View Source Reports', description: 'View candidate source analytics', category: 'reports' },
    { product: 'recruitiq', name: 'reports:time-to-hire', display_name: 'View Time-to-Hire', description: 'View hiring speed analytics', category: 'reports' },

    // Settings & Configuration
    { product: 'recruitiq', name: 'settings:view', display_name: 'View Settings', description: 'View RecruitIQ settings', category: 'settings' },
    { product: 'recruitiq', name: 'settings:update', display_name: 'Update Settings', description: 'Update RecruitIQ configuration', category: 'settings' },
    { product: 'recruitiq', name: 'settings:manage', display_name: 'Manage Settings', description: 'Full settings management', category: 'settings' }
  ];

  // Insert all permissions
  for (const permission of recruitiqPermissions) {
    await knex('permissions')
      .insert(permission)
      .onConflict(['product', 'name'])
      .ignore();
  }

  console.log('[OK] RecruitIQ ATS permissions seeded successfully!');
  console.log('Categories:');
  console.log('  - jobs (6 permissions)');
  console.log('  - candidates (6 permissions)');
  console.log('  - applications (6 permissions)');
  console.log('  - interviews (6 permissions)');
  console.log('  - offers (6 permissions)');
  console.log('  - pipeline (3 permissions)');
  console.log('  - communication (3 permissions)');
  console.log('  - career-site (3 permissions)');
  console.log('  - reports (5 permissions)');
  console.log('  - settings (3 permissions)');
}
