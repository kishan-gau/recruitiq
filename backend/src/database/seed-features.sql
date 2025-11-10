-- ============================================================================
-- Feature Management Seed Data
-- Populate the features table with initial features for each product
-- ============================================================================

-- Get product IDs for reference
DO $$
DECLARE
  nexus_id UUID;
  recruitiq_id UUID;
  paylinq_id UUID;
  schedulehub_id UUID;
BEGIN
  SELECT id INTO nexus_id FROM products WHERE slug = 'nexus';
  SELECT id INTO recruitiq_id FROM products WHERE slug = 'recruitiq';
  SELECT id INTO paylinq_id FROM products WHERE slug = 'paylinq';
  SELECT id INTO schedulehub_id FROM products WHERE slug = 'schedulehub';

  -- ============================================================================
  -- NEXUS FEATURES (HR Management)
  -- ============================================================================
  
  INSERT INTO features (
    product_id, feature_key, feature_name, description, category,
    status, min_tier, is_add_on, has_usage_limit
  ) VALUES
  -- Core Features (Starter tier)
  (nexus_id, 'employees', 'Employee Management', 'Core employee records and profiles', 'core', 'stable', 'starter', FALSE, FALSE),
  (nexus_id, 'departments', 'Department Management', 'Organizational structure and departments', 'core', 'stable', 'starter', FALSE, FALSE),
  
  -- Professional Features
  (nexus_id, 'attendance', 'Attendance Tracking', 'Time and attendance management', 'time_management', 'stable', 'professional', FALSE, FALSE),
  (nexus_id, 'leave', 'Leave Management', 'Leave requests and approvals', 'time_management', 'stable', 'professional', FALSE, FALSE),
  (nexus_id, 'documents', 'Document Management', 'Employee document storage and management', 'documents', 'stable', 'professional', FALSE, FALSE),
  
  -- Enterprise Features
  (nexus_id, 'performance', 'Performance Management', 'Performance reviews and goal tracking', 'performance', 'stable', 'enterprise', FALSE, FALSE),
  (nexus_id, 'benefits', 'Benefits Administration', 'Employee benefits and compensation management', 'compensation', 'stable', 'enterprise', FALSE, FALSE),
  (nexus_id, 'contracts', 'Contract Management', 'Employment contracts and agreements', 'legal', 'beta', 'enterprise', FALSE, FALSE);

  -- ============================================================================
  -- RECRUITIQ FEATURES (ATS)
  -- ============================================================================
  
  -- Features without usage limits
  INSERT INTO features (
    product_id, feature_key, feature_name, description, category,
    status, min_tier, is_add_on
  ) VALUES
  (recruitiq_id, 'applications', 'Application Tracking', 'Track and manage job applications', 'recruitment', 'stable', 'professional', FALSE),
  (recruitiq_id, 'interviews', 'Interview Scheduling', 'Schedule and manage interviews', 'recruitment', 'stable', 'professional', FALSE),
  (recruitiq_id, 'pipelines', 'Pipeline Management', 'Custom recruitment pipelines', 'recruitment', 'stable', 'professional', FALSE),
  (recruitiq_id, 'public_portal', 'Public Career Portal', 'Public-facing job portal', 'recruitment', 'stable', 'professional', FALSE),
  (recruitiq_id, 'flow_templates', 'Hiring Flow Templates', 'Automated hiring workflows', 'automation', 'stable', 'enterprise', FALSE),
  (recruitiq_id, 'analytics', 'Recruitment Analytics', 'Advanced recruitment analytics and reports', 'analytics', 'stable', 'enterprise', FALSE);
  
  -- Features with usage limits
  INSERT INTO features (
    product_id, feature_key, feature_name, description, category,
    status, min_tier, is_add_on, has_usage_limit, default_usage_limit, usage_limit_unit
  ) VALUES
  (recruitiq_id, 'jobs', 'Job Posting', 'Create and manage job postings', 'recruitment', 'stable', 'professional', FALSE, TRUE, 50, 'active_jobs'),
  (recruitiq_id, 'candidates', 'Candidate Management', 'Manage candidate profiles and applications', 'recruitment', 'stable', 'professional', FALSE, TRUE, 500, 'active_candidates'),
  (recruitiq_id, 'communications', 'Email Communications', 'Send emails to candidates', 'communication', 'stable', 'professional', FALSE, TRUE, 1000, 'emails_per_month'),
  (recruitiq_id, 'api_access', 'API Access', 'Programmatic access to recruitment data', 'integration', 'beta', 'enterprise', FALSE, TRUE, 10000, 'api_calls_per_month');

  -- ============================================================================
  -- PAYLINQ FEATURES (Payroll)
  -- ============================================================================
  
  INSERT INTO features (
    product_id, feature_key, feature_name, description, category,
    status, min_tier, is_add_on, pricing, has_usage_limit
  ) VALUES
  -- Core Features (Enterprise only)
  (paylinq_id, 'basic_payroll', 'Basic Payroll Processing', 'Core payroll calculation and processing', 'payroll', 'stable', 'enterprise', FALSE, NULL, FALSE),
  (paylinq_id, 'timesheets', 'Timesheet Management', 'Manage employee timesheets', 'time_management', 'stable', 'enterprise', FALSE, NULL, FALSE),
  (paylinq_id, 'direct_deposit', 'Direct Deposit', 'Electronic payment processing', 'payments', 'stable', 'enterprise', FALSE, NULL, FALSE),
  
  -- Advanced Features
  (paylinq_id, 'multi_currency', 'Multi-Currency Support', 'Support for multiple currencies in payroll', 'payroll', 'stable', 'enterprise', FALSE, NULL, FALSE),
  (paylinq_id, 'advanced_tax', 'Advanced Tax Calculation', 'Complex tax calculations and compliance', 'tax', 'beta', 'enterprise', FALSE, NULL, FALSE),
  (paylinq_id, 'custom_pay_components', 'Custom Pay Components', 'Define custom earnings and deductions', 'payroll', 'stable', 'enterprise', FALSE, NULL, FALSE),
  
  -- Add-on Features
  (paylinq_id, 'formula_engine', 'Formula Engine', 'Advanced formula-based calculations', 'calculation', 'beta', 'enterprise', TRUE, '{"monthly": 50, "annual": 500}'::jsonb, FALSE),
  (paylinq_id, 'bank_integration', 'Bank Integration', 'Direct integration with banking systems', 'integration', 'alpha', 'enterprise', TRUE, '{"monthly": 100, "annual": 1000}'::jsonb, FALSE),
  (paylinq_id, 'compliance_reports', 'Compliance Reporting', 'Automated compliance and audit reports', 'reporting', 'beta', 'enterprise', TRUE, '{"monthly": 75, "annual": 750}'::jsonb, FALSE);

  -- ============================================================================
  -- SCHEDULEHUB FEATURES (Scheduling)
  -- ============================================================================
  
  INSERT INTO features (
    product_id, feature_key, feature_name, description, category,
    status, min_tier, is_add_on, has_usage_limit
  ) VALUES
  -- Core Features (Professional tier)
  (schedulehub_id, 'schedules', 'Schedule Management', 'Create and manage work schedules', 'scheduling', 'stable', 'professional', FALSE, FALSE),
  (schedulehub_id, 'shifts', 'Shift Planning', 'Plan and assign shifts to workers', 'scheduling', 'stable', 'professional', FALSE, FALSE),
  (schedulehub_id, 'time_off', 'Time Off Requests', 'Manage time off requests and approvals', 'time_management', 'stable', 'professional', FALSE, FALSE),
  (schedulehub_id, 'workers', 'Worker Management', 'Manage workforce and worker profiles', 'workforce', 'stable', 'professional', FALSE, FALSE),
  
  -- Advanced Features (Professional+)
  (schedulehub_id, 'shift_swaps', 'Shift Swap Marketplace', 'Allow workers to swap shifts', 'scheduling', 'stable', 'professional', FALSE, FALSE),
  (schedulehub_id, 'roles', 'Role Management', 'Define and assign worker roles', 'workforce', 'stable', 'professional', FALSE, FALSE),
  (schedulehub_id, 'stations', 'Station Management', 'Manage work stations and locations', 'locations', 'stable', 'professional', FALSE, FALSE),
  
  -- Enterprise Features
  (schedulehub_id, 'notifications', 'Push Notifications', 'Real-time shift and schedule notifications', 'communication', 'beta', 'enterprise', FALSE, FALSE),
  (schedulehub_id, 'reports', 'Advanced Reports', 'Comprehensive scheduling analytics', 'analytics', 'stable', 'enterprise', FALSE, FALSE),
  (schedulehub_id, 'integrations', 'Third-party Integrations', 'Connect with Slack, Teams, etc.', 'integration', 'beta', 'enterprise', FALSE, FALSE);

  -- Log completion
  RAISE NOTICE 'Feature seed data inserted successfully';
  
END $$;

-- Create a few sample feature grants for testing (optional)
-- This grants all Nexus core features to existing organizations
INSERT INTO organization_feature_grants (
  organization_id,
  feature_id,
  granted_via,
  granted_reason,
  is_active
)
SELECT 
  o.id,
  f.id,
  'tier_included',
  'Included in core platform',
  TRUE
FROM organizations o
CROSS JOIN features f
WHERE f.product_id = (SELECT id FROM products WHERE slug = 'nexus')
  AND f.feature_key IN ('employees', 'departments')
ON CONFLICT (organization_id, feature_id) DO NOTHING;

-- Grant RecruitIQ features to professional+ organizations
INSERT INTO organization_feature_grants (
  organization_id,
  feature_id,
  granted_via,
  granted_reason,
  is_active
)
SELECT 
  o.id,
  f.id,
  'tier_included',
  'Included in tier',
  TRUE
FROM organizations o
CROSS JOIN features f
WHERE f.product_id = (SELECT id FROM products WHERE slug = 'recruitiq')
  AND o.tier IN ('professional', 'enterprise')
  AND f.min_tier = 'professional'
ON CONFLICT (organization_id, feature_id) DO NOTHING;

COMMENT ON TABLE features IS 'Feature catalog seeded with initial features for all products';
