-- =====================================================
-- VIP Employee Permissions Seed
-- Adds permissions for VIP employee management
-- =====================================================

-- Insert VIP permissions for Nexus product
INSERT INTO public.permissions (name, display_name, description, resource, action, product_slug)
VALUES
  ('vip:read', 'View VIP Employees', 'View VIP employee status and access controls', 'vip', 'read', 'nexus'),
  ('vip:manage', 'Manage VIP Employees', 'Mark employees as VIP, configure restrictions and access controls', 'vip', 'manage', 'nexus')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  resource = EXCLUDED.resource,
  action = EXCLUDED.action,
  product_slug = EXCLUDED.product_slug;

-- Add VIP permissions to org_admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'org_admin'
  AND p.name IN ('vip:read', 'vip:manage')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Add VIP permissions to hr_manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'hr_manager'
  AND p.name IN ('vip:read', 'vip:manage')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Add vip:read permission to manager role (can view VIP status but not manage)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'manager'
  AND p.name = 'vip:read'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Output added permissions for verification
SELECT p.name, p.display_name, p.description
FROM public.permissions p
WHERE p.name IN ('vip:read', 'vip:manage');
