-- ============================================================================
-- Seed Default Platform Admin Users
-- Run this AFTER RBAC migration to create default admin users
-- ============================================================================

-- Create default admin users for platform management
-- These are platform users (Portal access), not tenant users

DO $$
DECLARE
  admin_user_id UUID;
  license_user_id UUID;
  security_user_id UUID;
  super_admin_role_id UUID;
  license_admin_role_id UUID;
  security_admin_role_id UUID;
BEGIN
  -- Get role IDs (these should be created by RBAC migration or separate seed)
  SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'super_admin' AND organization_id IS NULL LIMIT 1;
  SELECT id INTO license_admin_role_id FROM public.roles WHERE name = 'license_admin' AND organization_id IS NULL LIMIT 1;
  SELECT id INTO security_admin_role_id FROM public.roles WHERE name = 'security_admin' AND organization_id IS NULL LIMIT 1;

  -- Only create users if roles exist
  IF super_admin_role_id IS NOT NULL THEN
    -- Create Super Admin user
    INSERT INTO public.platform_users (
      id, email, password_hash, name, is_active, created_at
    ) VALUES (
      uuid_generate_v4(),
      'admin@recruitiq.com',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7WBLFBqHxO', -- Admin123!
      'Super Administrator',
      true,
      NOW()
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO admin_user_id;

    -- Assign super_admin role
    IF admin_user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id, created_by)
      VALUES (admin_user_id, super_admin_role_id, admin_user_id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END IF;

  IF license_admin_role_id IS NOT NULL THEN
    -- Create License Admin user
    INSERT INTO public.platform_users (
      id, email, password_hash, name, is_active, created_at
    ) VALUES (
      uuid_generate_v4(),
      'license@recruitiq.com',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7WBLFBqHxO', -- Admin123!
      'License Administrator',
      true,
      NOW()
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO license_user_id;

    -- Assign license_admin role
    IF license_user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id, created_by)
      VALUES (license_user_id, license_admin_role_id, license_user_id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END IF;

  IF security_admin_role_id IS NOT NULL THEN
    -- Create Security Admin user
    INSERT INTO public.platform_users (
      id, email, password_hash, name, is_active, created_at
    ) VALUES (
      uuid_generate_v4(),
      'security@recruitiq.com',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7WBLFBqHxO', -- Admin123!
      'Security Administrator',
      true,
      NOW()
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO security_user_id;

    -- Assign security_admin role
    IF security_user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id, created_by)
      VALUES (security_user_id, security_admin_role_id, security_user_id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END IF;

  -- Success message
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '[OK] Default admin users seeded successfully!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Platform Admin Users Created:';
  RAISE NOTICE '  - admin@recruitiq.com (Super Admin)';
  RAISE NOTICE '  - license@recruitiq.com (License Admin)';
  RAISE NOTICE '  - security@recruitiq.com (Security Admin)';
  RAISE NOTICE '';
  RAISE NOTICE 'Password for all: Admin123!';
  RAISE NOTICE '';
  RAISE NOTICE '[WARNING] Remember to change these passwords in production!';
  RAISE NOTICE '================================================================';
END;
$$;
