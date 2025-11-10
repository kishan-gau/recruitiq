-- ============================================================================
-- Product Management Seed Data
-- Initializes the multi-product architecture with core products
-- ============================================================================

-- ============================================================================
-- SEED PRODUCTS
-- ============================================================================

-- Core Product: Nexus (HR Management Platform)
INSERT INTO products (
  name, display_name, description, slug, version,
  status, is_core, requires_license,
  base_path, api_prefix,
  min_tier, features, default_features,
  icon, color, ui_config
) VALUES (
  'nexus',
  'Nexus HR',
  'Core HR management platform with employee records, departments, and organizational structure',
  'nexus',
  '1.0.0',
  'active',
  TRUE, -- Core product
  FALSE, -- Nexus is always available
  '/nexus',
  '/api/nexus',
  'starter',
  '["employees", "departments", "attendance", "leave", "performance", "documents", "benefits", "contracts"]',
  '["employees", "departments"]',
  'building-2',
  '#6366f1',
  '{"theme": "indigo", "showInNav": true, "priority": 1}'
);

-- Add-on Product: RecruitIQ (Recruitment & ATS)
INSERT INTO products (
  name, display_name, description, slug, version,
  npm_package, repository_url,
  status, is_core, requires_license,
  base_path, api_prefix,
  min_tier, features, default_features,
  icon, color, ui_config
) VALUES (
  'recruitiq',
  'RecruitIQ',
  'Applicant Tracking System with job postings, candidate management, and interview scheduling',
  'recruitiq',
  '2.0.0',
  '@recruitiq/core',
  'https://github.com/kishan-gau/recruitiq',
  'active',
  FALSE, -- Add-on product
  TRUE,
  '/recruitiq',
  '/api/recruitiq',
  'professional',
  '["jobs", "candidates", "applications", "interviews", "communications", "pipelines", "analytics", "email_integration"]',
  '["jobs", "candidates", "applications", "interviews"]',
  'briefcase',
  '#10b981',
  '{"theme": "green", "showInNav": true, "priority": 2}'
);

-- Add-on Product: ScheduleHub (Workforce Scheduling)
INSERT INTO products (
  name, display_name, description, slug, version,
  npm_package, repository_url,
  status, is_core, requires_license,
  base_path, api_prefix,
  min_tier, features, default_features,
  icon, color, ui_config
) VALUES (
  'schedulehub',
  'ScheduleHub',
  'Workforce scheduling and time management with shift planning, time-off requests, and shift swaps',
  'schedulehub',
  '1.0.0',
  '@recruitiq/schedulehub',
  'https://github.com/kishan-gau/recruitiq',
  'active',
  FALSE, -- Add-on product
  TRUE,
  '/schedulehub',
  '/api/schedulehub',
  'professional',
  '["schedules", "shifts", "time_off", "shift_swaps", "workers", "roles", "stations", "notifications", "reports"]',
  '["schedules", "shifts", "time_off", "workers"]',
  'calendar',
  '#f59e0b',
  '{"theme": "amber", "showInNav": true, "priority": 3}'
);

-- Add-on Product: PayLinQ (Payroll Management)
INSERT INTO products (
  name, display_name, description, slug, version,
  npm_package, repository_url,
  status, is_core, requires_license,
  base_path, api_prefix,
  min_tier, features, default_features,
  icon, color, ui_config
) VALUES (
  'paylinq',
  'PayLinQ',
  'Comprehensive payroll management with multi-currency support, tax calculations, and payment processing',
  'paylinq',
  '1.0.0',
  '@recruitiq/paylinq',
  'https://github.com/kishan-gau/recruitiq',
  'active', -- Changed from beta to active
  FALSE, -- Add-on product
  TRUE,
  '/paylinq',
  '/api/paylinq',
  'enterprise', -- Enterprise only
  '["payroll", "payments", "tax_calc", "multi_currency", "deductions", "bonuses", "reports", "bank_integration", "compliance"]',
  '["payroll", "payments"]',
  'dollar-sign',
  '#8b5cf6',
  '{"theme": "purple", "showInNav": true, "priority": 4}'
);

-- Admin Portal (Platform Management)
INSERT INTO products (
  name, display_name, description, slug, version,
  status, is_core, requires_license,
  base_path, api_prefix,
  min_tier, features, default_features,
  icon, color, ui_config
) VALUES (
  'portal',
  'Admin Portal',
  'Platform administration and license management portal',
  'portal',
  '1.0.0',
  'active',
  TRUE, -- Core platform tool
  FALSE,
  '/portal',
  '/api/portal',
  'starter',
  '["license_management", "customer_management", "usage_monitoring", "system_logs", "security_alerts"]',
  '["license_management", "customer_management"]',
  'shield',
  '#ef4444',
  '{"theme": "red", "showInNav": false, "platformOnly": true}'
);

-- ============================================================================
-- SEED PRODUCT FEATURES (ScheduleHub Example)
-- ============================================================================

-- Get ScheduleHub product ID for feature insertion
DO $$
DECLARE
  schedulehub_id UUID;
BEGIN
  SELECT id INTO schedulehub_id FROM products WHERE slug = 'schedulehub';
  
  -- Basic Features (Included in all tiers)
  INSERT INTO product_features (
    product_id, feature_key, feature_name, description,
    status, is_default, min_tier, rollout_percentage
  ) VALUES
  (schedulehub_id, 'schedules', 'Schedule Management', 'Create and manage work schedules', 'stable', TRUE, 'starter', 100),
  (schedulehub_id, 'shifts', 'Shift Planning', 'Plan and assign shifts to workers', 'stable', TRUE, 'starter', 100),
  (schedulehub_id, 'time_off', 'Time Off Requests', 'Manage employee time off requests and approvals', 'stable', TRUE, 'starter', 100),
  (schedulehub_id, 'workers', 'Worker Management', 'Manage workforce and worker profiles', 'stable', TRUE, 'starter', 100);
  
  -- Advanced Features (Professional tier and above)
  INSERT INTO product_features (
    product_id, feature_key, feature_name, description,
    status, is_default, min_tier, rollout_percentage
  ) VALUES
  (schedulehub_id, 'shift_swaps', 'Shift Swap Marketplace', 'Allow workers to swap shifts through marketplace', 'stable', FALSE, 'professional', 100),
  (schedulehub_id, 'roles', 'Role Management', 'Define and assign worker roles', 'stable', FALSE, 'professional', 100),
  (schedulehub_id, 'stations', 'Station Management', 'Manage work stations and locations', 'stable', FALSE, 'professional', 100),
  (schedulehub_id, 'notifications', 'Push Notifications', 'Real-time shift and schedule notifications', 'beta', FALSE, 'professional', 50);
  
  -- Enterprise Features
  INSERT INTO product_features (
    product_id, feature_key, feature_name, description,
    status, is_default, min_tier, rollout_percentage,
    config_schema
  ) VALUES
  (schedulehub_id, 'reports', 'Advanced Reports', 'Comprehensive scheduling analytics and reports', 'stable', FALSE, 'enterprise', 100, 
   '{"type": "object", "properties": {"exportFormats": {"type": "array", "items": {"enum": ["pdf", "excel", "csv"]}}, "customReports": {"type": "boolean"}}}'),
  (schedulehub_id, 'api_access', 'API Access', 'Programmatic access to scheduling data', 'stable', FALSE, 'enterprise', 100,
   '{"type": "object", "properties": {"rateLimit": {"type": "integer", "default": 1000}, "webhooks": {"type": "boolean"}}}'),
  (schedulehub_id, 'integrations', 'Third-party Integrations', 'Connect with external systems (Slack, Teams, etc.)', 'beta', FALSE, 'enterprise', 80,
   '{"type": "object", "properties": {"slack": {"type": "boolean"}, "teams": {"type": "boolean"}, "customWebhooks": {"type": "boolean"}}}');
  
END $$;

-- ============================================================================
-- SEED PRODUCT FEATURES (PayLinQ Example)
-- ============================================================================

DO $$
DECLARE
  paylinq_id UUID;
BEGIN
  SELECT id INTO paylinq_id FROM products WHERE slug = 'paylinq';
  
  -- Core Features
  INSERT INTO product_features (
    product_id, feature_key, feature_name, description,
    status, is_default, min_tier, rollout_percentage
  ) VALUES
  (paylinq_id, 'payroll', 'Payroll Processing', 'Core payroll calculation and processing', 'stable', TRUE, 'enterprise', 100),
  (paylinq_id, 'payments', 'Payment Management', 'Manage and process employee payments', 'stable', TRUE, 'enterprise', 100),
  (paylinq_id, 'multi_currency', 'Multi-Currency Support', 'Support for multiple currencies in payroll', 'beta', TRUE, 'enterprise', 100),
  (paylinq_id, 'tax_calc', 'Tax Calculations', 'Automated tax calculations and compliance', 'beta', FALSE, 'enterprise', 80),
  (paylinq_id, 'deductions', 'Deductions Management', 'Manage payroll deductions and benefits', 'beta', FALSE, 'enterprise', 100),
  (paylinq_id, 'bank_integration', 'Bank Integration', 'Direct bank integration for payments', 'alpha', FALSE, 'enterprise', 30),
  (paylinq_id, 'compliance', 'Compliance Reports', 'Generate compliance and audit reports', 'beta', FALSE, 'enterprise', 50);
  
END $$;

-- ============================================================================
-- SEED DEFAULT PRODUCT PERMISSIONS FOR EXISTING ORGANIZATIONS
-- ============================================================================

-- Grant Nexus (core product) access to all organizations
INSERT INTO product_permissions (
  organization_id, product_id, is_enabled, access_level,
  enabled_features, granted_at
)
SELECT 
  o.id,
  p.id,
  TRUE,
  'full',
  p.default_features,
  NOW()
FROM organizations o
CROSS JOIN products p
WHERE p.slug = 'nexus'
ON CONFLICT (organization_id, product_id) DO NOTHING;

-- Grant RecruitIQ access to professional+ organizations
INSERT INTO product_permissions (
  organization_id, product_id, is_enabled, access_level,
  enabled_features, granted_at
)
SELECT 
  o.id,
  p.id,
  TRUE,
  'full',
  p.default_features,
  NOW()
FROM organizations o
CROSS JOIN products p
WHERE p.slug = 'recruitiq'
  AND o.tier IN ('professional', 'enterprise')
ON CONFLICT (organization_id, product_id) DO NOTHING;

-- Grant ScheduleHub access to professional+ organizations
INSERT INTO product_permissions (
  organization_id, product_id, is_enabled, access_level,
  enabled_features, granted_at
)
SELECT 
  o.id,
  p.id,
  TRUE,
  'full',
  p.default_features,
  NOW()
FROM organizations o
CROSS JOIN products p
WHERE p.slug = 'schedulehub'
  AND o.tier IN ('professional', 'enterprise')
ON CONFLICT (organization_id, product_id) DO NOTHING;

-- Grant PayLinQ access to enterprise organizations only
INSERT INTO product_permissions (
  organization_id, product_id, is_enabled, access_level,
  enabled_features, granted_at
)
SELECT 
  o.id,
  p.id,
  TRUE,
  'full',
  p.default_features,
  NOW()
FROM organizations o
CROSS JOIN products p
WHERE p.slug = 'paylinq'
  AND o.tier = 'enterprise'
ON CONFLICT (organization_id, product_id) DO NOTHING;

COMMENT ON TABLE products IS 'Multi-product architecture: Seeded with Nexus, RecruitIQ, ScheduleHub, PayLinQ, and Admin Portal';
