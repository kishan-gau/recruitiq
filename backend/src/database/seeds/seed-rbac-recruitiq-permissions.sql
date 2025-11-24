-- ============================================================================
-- Seed RecruitIQ (ATS) Product Permissions
-- ============================================================================
-- Description: Seeds permissions for RecruitIQ applicant tracking system
-- Run this AFTER platform RBAC migration
-- ============================================================================

-- ============================================================================
-- RECRUITIQ PRODUCT PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (product, name, display_name, description, category) VALUES
-- Job Management
('recruitiq', 'jobs:create', 'Create Jobs', 'Create job postings', 'jobs'),
('recruitiq', 'jobs:read', 'View Jobs', 'View job information', 'jobs'),
('recruitiq', 'jobs:update', 'Update Jobs', 'Update job postings', 'jobs'),
('recruitiq', 'jobs:delete', 'Delete Jobs', 'Delete job postings', 'jobs'),
('recruitiq', 'jobs:publish', 'Publish Jobs', 'Publish jobs to career site', 'jobs'),
('recruitiq', 'jobs:close', 'Close Jobs', 'Close job postings', 'jobs'),

-- Candidate Management
('recruitiq', 'candidates:create', 'Create Candidates', 'Create candidate profiles', 'candidates'),
('recruitiq', 'candidates:read', 'View Candidates', 'View candidate information', 'candidates'),
('recruitiq', 'candidates:update', 'Update Candidates', 'Update candidate profiles', 'candidates'),
('recruitiq', 'candidates:delete', 'Delete Candidates', 'Delete candidate records', 'candidates'),
('recruitiq', 'candidates:import', 'Import Candidates', 'Import candidate data', 'candidates'),
('recruitiq', 'candidates:export', 'Export Candidates', 'Export candidate data', 'candidates'),

-- Application Management
('recruitiq', 'applications:create', 'Create Applications', 'Create job applications', 'applications'),
('recruitiq', 'applications:read', 'View Applications', 'View application information', 'applications'),
('recruitiq', 'applications:update', 'Update Applications', 'Update application status', 'applications'),
('recruitiq', 'applications:delete', 'Delete Applications', 'Delete applications', 'applications'),
('recruitiq', 'applications:review', 'Review Applications', 'Review and screen applications', 'applications'),
('recruitiq', 'applications:reject', 'Reject Applications', 'Reject applications', 'applications'),

-- Interview Management
('recruitiq', 'interviews:create', 'Schedule Interviews', 'Schedule candidate interviews', 'interviews'),
('recruitiq', 'interviews:read', 'View Interviews', 'View interview information', 'interviews'),
('recruitiq', 'interviews:update', 'Update Interviews', 'Update interview details', 'interviews'),
('recruitiq', 'interviews:delete', 'Cancel Interviews', 'Cancel scheduled interviews', 'interviews'),
('recruitiq', 'interviews:feedback', 'Provide Feedback', 'Provide interview feedback', 'interviews'),
('recruitiq', 'interviews:manage', 'Manage Interviews', 'Full interview management', 'interviews'),

-- Offer Management
('recruitiq', 'offers:create', 'Create Offers', 'Create job offers', 'offers'),
('recruitiq', 'offers:read', 'View Offers', 'View offer information', 'offers'),
('recruitiq', 'offers:update', 'Update Offers', 'Update offer details', 'offers'),
('recruitiq', 'offers:delete', 'Delete Offers', 'Delete offers', 'offers'),
('recruitiq', 'offers:approve', 'Approve Offers', 'Approve offers for sending', 'offers'),
('recruitiq', 'offers:send', 'Send Offers', 'Send offers to candidates', 'offers'),

-- Pipeline Management
('recruitiq', 'pipeline:view', 'View Pipeline', 'View recruitment pipeline', 'pipeline'),
('recruitiq', 'pipeline:manage', 'Manage Pipeline', 'Manage pipeline stages', 'pipeline'),
('recruitiq', 'pipeline:move', 'Move Candidates', 'Move candidates through pipeline', 'pipeline'),

-- Communication
('recruitiq', 'communication:send', 'Send Messages', 'Send messages to candidates', 'communication'),
('recruitiq', 'communication:templates', 'Manage Templates', 'Manage email templates', 'communication'),
('recruitiq', 'communication:history', 'View History', 'View communication history', 'communication'),

-- Career Site
('recruitiq', 'career-site:view', 'View Career Site', 'View career site content', 'career-site'),
('recruitiq', 'career-site:manage', 'Manage Career Site', 'Manage career site settings', 'career-site'),
('recruitiq', 'career-site:publish', 'Publish Content', 'Publish career site content', 'career-site'),

-- Reports & Analytics
('recruitiq', 'reports:view', 'View Reports', 'View recruitment reports', 'reports'),
('recruitiq', 'reports:export', 'Export Reports', 'Export report data', 'reports'),
('recruitiq', 'reports:pipeline', 'View Pipeline Reports', 'View pipeline analytics', 'reports'),
('recruitiq', 'reports:source', 'View Source Reports', 'View candidate source analytics', 'reports'),
('recruitiq', 'reports:time-to-hire', 'View Time-to-Hire', 'View hiring speed analytics', 'reports'),

-- Settings & Configuration
('recruitiq', 'settings:view', 'View Settings', 'View RecruitIQ settings', 'settings'),
('recruitiq', 'settings:update', 'Update Settings', 'Update RecruitIQ configuration', 'settings'),
('recruitiq', 'settings:manage', 'Manage Settings', 'Full settings management', 'settings')

ON CONFLICT (product, name) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '[OK] RecruitIQ ATS permissions seeded successfully!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Categories:';
  RAISE NOTICE '  - jobs (6 permissions)';
  RAISE NOTICE '  - candidates (6 permissions)';
  RAISE NOTICE '  - applications (6 permissions)';
  RAISE NOTICE '  - interviews (6 permissions)';
  RAISE NOTICE '  - offers (6 permissions)';
  RAISE NOTICE '  - pipeline (3 permissions)';
  RAISE NOTICE '  - communication (3 permissions)';
  RAISE NOTICE '  - career-site (3 permissions)';
  RAISE NOTICE '  - reports (5 permissions)';
  RAISE NOTICE '  - settings (3 permissions)';
  RAISE NOTICE '================================================================';
END;
$$;
