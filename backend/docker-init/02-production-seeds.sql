-- RecruitIQ Basic Production Seeds
-- This script creates essential seed data for the application

-- Insert default organization (system/platform organization)
INSERT INTO organizations (id, name, slug, domain, settings, created_at) 
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'RecruitIQ Platform',
    'platform',
    'recruitiq.com',
    '{"type": "platform", "features": ["all"]}',
    CURRENT_TIMESTAMP
) ON CONFLICT (slug) DO NOTHING;

-- Insert platform admin user
INSERT INTO users (
    id, 
    organization_id, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    is_active, 
    email_verified,
    created_at
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'admin@recruitiq.com',
    crypt('admin123', gen_salt('bf')),  -- Default admin password (should be changed)
    'Platform',
    'Administrator',
    'admin',
    true,
    true,
    CURRENT_TIMESTAMP
) ON CONFLICT (email, organization_id) DO NOTHING;

-- Insert default workspace for platform
INSERT INTO workspaces (
    id,
    organization_id,
    name,
    description,
    is_active,
    created_at
) VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Platform Workspace',
    'Default workspace for platform administration',
    true,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

NOTIFY system, 'Production seeds inserted successfully';