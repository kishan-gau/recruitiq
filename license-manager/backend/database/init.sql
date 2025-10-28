-- Initialize database script
-- Run this after creating schema.sql

-- ============================================================================
-- TIER PRESETS: Initial Configuration
-- ============================================================================

-- Starter Tier v1
INSERT INTO tier_presets (
  tier_name, version, 
  max_users, max_workspaces, max_jobs, max_candidates,
  features,
  monthly_price_per_user, annual_price_per_user,
  description, created_by
) VALUES (
  'starter', 1,
  10, 1, 50, 500,
  '["basic_support", "email_notifications"]'::jsonb,
  49.00, 40.00,
  'Initial Starter tier configuration',
  'system'
);

-- Professional Tier v1
INSERT INTO tier_presets (
  tier_name, version,
  max_users, max_workspaces, max_jobs, max_candidates,
  features,
  monthly_price_per_user, annual_price_per_user,
  description, created_by
) VALUES (
  'professional', 1,
  50, 5, NULL, 5000,
  '["analytics", "api_access", "priority_support", "email_notifications", "slack_integration"]'::jsonb,
  99.00, 80.00,
  'Initial Professional tier configuration',
  'system'
);

-- Enterprise Tier v1
INSERT INTO tier_presets (
  tier_name, version,
  max_users, max_workspaces, max_jobs, max_candidates,
  features,
  monthly_price_per_user, base_price,
  description, created_by
) VALUES (
  'enterprise', 1,
  NULL, NULL, NULL, NULL,
  '["analytics", "api_access", "sso", "saml", "white_label", "dedicated_support", "custom_integrations", "advanced_workflows"]'::jsonb,
  NULL, 5000.00,
  'Initial Enterprise tier configuration - unlimited everything',
  'system'
);

-- ============================================================================
-- ADMIN USERS: Default Super Admin
-- ============================================================================

-- Create default super admin user
-- Password: admin123 (change this after first login!)
INSERT INTO admin_users (email, password_hash, name, role)
VALUES (
  'admin@recruitiq.com',
  '$2a$10$xQKj8fP7EZnF9K.9Q3ZXHuVYvL5qK7DQXhB8gGGqR5TK9yHHLFVZG', -- admin123
  'System Administrator',
  'super_admin'
)
ON CONFLICT (email) DO NOTHING;

-- Create demo customer
DO $$
DECLARE
  customer_id UUID;
  instance_id UUID;
BEGIN
  -- Insert customer
  INSERT INTO customers (
    name, contact_email, contact_name, deployment_type,
    contract_start_date, contract_end_date, status
  ) VALUES (
    'Demo Company',
    'demo@example.com',
    'John Demo',
    'cloud-shared',
    NOW(),
    NOW() + INTERVAL '12 months',
    'active'
  )
  RETURNING id INTO customer_id;

  -- Insert instance
  INSERT INTO instances (
    customer_id, instance_key, instance_url, status
  ) VALUES (
    customer_id,
    'demo-company-prod',
    'https://demo.recruitiq.app',
    'active'
  )
  RETURNING id INTO instance_id;

  -- Insert license
  INSERT INTO licenses (
    customer_id, instance_id, license_key, tier,
    max_users, max_workspaces, max_jobs, max_candidates,
    features, expires_at, status
  ) VALUES (
    customer_id,
    instance_id,
    'LIC-DEMO-12345678-' || EXTRACT(EPOCH FROM NOW())::bigint,
    'professional',
    25, 5, NULL, NULL,
    '["advanced_search", "custom_workflows", "email_integration", "api_access"]'::jsonb,
    NOW() + INTERVAL '12 months',
    'active'
  );

  RAISE NOTICE 'Demo customer created successfully!';
END $$;

-- Display initial setup info
SELECT 
  'Database initialized!' as status,
  'admin@recruitiq.com' as admin_email,
  'admin123' as admin_password,
  'CHANGE PASSWORD IMMEDIATELY!' as warning;
