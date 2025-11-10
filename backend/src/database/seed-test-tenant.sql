-- ============================================================================
-- Seed Test Organization and Tenant User for Paylinq Development
-- ============================================================================

-- Create a test organization for Paylinq testing
INSERT INTO organizations (
  name,
  slug,
  tier,
  subscription_status,
  deployment_model,
  created_at
) VALUES (
  'Test Company Ltd',
  'test-company',
  'enterprise',
  'active',
  'shared',
  NOW()
) ON CONFLICT (slug) DO NOTHING
RETURNING id;

-- Create a tenant admin user for the test organization
-- Password: Admin123!
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- Get the test organization ID
  SELECT id INTO org_id FROM organizations WHERE slug = 'test-company';
  
  -- Insert tenant admin user into hris.user_account
  INSERT INTO hris.user_account (
    email,
    password_hash,
    organization_id,
    enabled_products,
    product_roles,
    email_verified,
    is_active,
    created_at
  ) VALUES (
    'tenant@testcompany.com',
    '$2a$10$bJj0F63g2bnq9tL52p65e.ynUaBcXg340tgzV4m5.ImdFkOupxvuO', -- Admin123!
    org_id,
    '["recruitiq", "nexus", "paylinq", "schedulehub"]'::jsonb,
    '{"recruitiq": "admin", "nexus": "admin", "paylinq": "admin", "schedulehub": "admin"}'::jsonb,
    true,
    true,
    NOW()
  ) ON CONFLICT (organization_id, email) DO NOTHING;
  
  RAISE NOTICE '[OK] Test organization and tenant user created successfully!';
  RAISE NOTICE '[INFO] Organization: Test Company Ltd (test-company)';
  RAISE NOTICE '[INFO] Tenant User: tenant@testcompany.com';
  RAISE NOTICE '[INFO] Password: Admin123!';
  RAISE NOTICE '[INFO] You can now login with this user to access Paylinq features';
END $$;

-- Create a payroll manager user for the test organization
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- Get the test organization ID
  SELECT id INTO org_id FROM organizations WHERE slug = 'test-company';
  
  -- Insert payroll manager user
  INSERT INTO hris.user_account (
    email,
    password_hash,
    organization_id,
    enabled_products,
    product_roles,
    email_verified,
    is_active,
    created_at
  ) VALUES (
    'payroll@testcompany.com',
    '$2a$10$bJj0F63g2bnq9tL52p65e.ynUaBcXg340tgzV4m5.ImdFkOupxvuO', -- Admin123!
    org_id,
    '["paylinq"]'::jsonb,
    '{"paylinq": "payroll_manager"}'::jsonb,
    true,
    true,
    NOW()
  ) ON CONFLICT (organization_id, email) DO NOTHING;
  
  RAISE NOTICE '[INFO] Payroll Manager: payroll@testcompany.com';
  RAISE NOTICE '[INFO] Password: Admin123!';
END $$;

-- Create an employee self-service user
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- Get the test organization ID
  SELECT id INTO org_id FROM organizations WHERE slug = 'test-company';
  
  -- Insert employee user
  INSERT INTO hris.user_account (
    email,
    password_hash,
    organization_id,
    enabled_products,
    product_roles,
    email_verified,
    is_active,
    created_at
  ) VALUES (
    'employee@testcompany.com',
    '$2a$10$bJj0F63g2bnq9tL52p65e.ynUaBcXg340tgzV4m5.ImdFkOupxvuO', -- Admin123!
    org_id,
    '["nexus"]'::jsonb,
    '{"nexus": "employee"}'::jsonb,
    true,
    true,
    NOW()
  ) ON CONFLICT (organization_id, email) DO NOTHING;
  
  RAISE NOTICE '[INFO] Employee: employee@testcompany.com';
  RAISE NOTICE '[INFO] Password: Admin123!';
END $$;

-- Summary
SELECT 
  '============================================' as "====================";
SELECT 'Test Organization and Users Created' as "Status";
SELECT 
  '============================================' as "====================";
SELECT '' as "Separator";
SELECT 'Organization Details:' as "Section";
SELECT '  Name: Test Company Ltd' as "Info";
SELECT '  Slug: test-company' as "Info";
SELECT '  Tier: Enterprise' as "Info";
SELECT '  Status: Active' as "Info";
SELECT '' as "Separator";
SELECT 'Test Users Created:' as "Section";
SELECT '  1. tenant@testcompany.com (Owner)' as "Info";
SELECT '  2. payroll@testcompany.com (Payroll Manager)' as "Info";
SELECT '  3. employee@testcompany.com (Employee)' as "Info";
SELECT '  Password for all: Admin123!' as "Info";
SELECT '' as "Separator";
SELECT 'Usage:' as "Section";
SELECT '  1. Login with tenant@testcompany.com to access Paylinq' as "Info";
SELECT '  2. Dashboard and all Paylinq features will be available' as "Info";
SELECT '  3. Use payroll@testcompany.com for payroll management' as "Info";
SELECT '  4. Use employee@testcompany.com to test employee portal' as "Info";

-- ============================================================================
-- Grant Product Permissions to Test Organization
-- ============================================================================

DO $$
DECLARE
  test_org_id UUID;
BEGIN
  -- Get test organization ID
  SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-company';
  
  IF test_org_id IS NOT NULL THEN
    -- Grant all products to test organization (Enterprise tier)
    INSERT INTO product_permissions (
      organization_id, product_id, is_enabled, access_level,
      enabled_features, granted_at
    )
    SELECT 
      test_org_id,
      p.id,
      TRUE,
      'full',
      p.default_features,
      NOW()
    FROM products p
    ON CONFLICT (organization_id, product_id) DO NOTHING;
    
    RAISE NOTICE '[OK] Product permissions granted to test organization';
  END IF;
END $$;
