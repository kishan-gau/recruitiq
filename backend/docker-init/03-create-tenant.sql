-- RecruitIQ Conditional Tenant Creation
-- This script creates a default tenant if environment variables are provided

-- Function to create a tenant organization
DO $$
DECLARE
    default_license_id TEXT := current_setting('myapp.default_license_id', true);
    default_customer_id TEXT := current_setting('myapp.default_customer_id', true);
    default_customer_email TEXT := current_setting('myapp.default_customer_email', true);
    default_customer_name TEXT := current_setting('myapp.default_customer_name', true);
    org_id UUID;
    user_id UUID;
    workspace_id UUID;
    admin_password TEXT := 'Admin123!';  -- Default admin password
BEGIN
    -- Check if tenant creation variables are provided
    IF default_license_id IS NOT NULL AND default_customer_id IS NOT NULL 
       AND default_customer_email IS NOT NULL AND default_customer_name IS NOT NULL THEN
        
        RAISE NOTICE 'Creating tenant organization: %', default_customer_name;
        RAISE NOTICE 'License ID: %', default_license_id;
        RAISE NOTICE 'Customer ID: %', default_customer_id;
        
        -- Generate UUIDs
        org_id := uuid_generate_v4();
        user_id := uuid_generate_v4();
        workspace_id := uuid_generate_v4();
        
        -- Create organization (with duplicate handling)
        INSERT INTO organizations (
            id,
            name,
            slug,
            domain,
            settings,
            created_at
        ) VALUES (
            org_id,
            default_customer_name,
            lower(regexp_replace(default_customer_name, '[^a-zA-Z0-9]', '', 'g')),
            NULL,
            json_build_object(
                'license_id', default_license_id,
                'customer_id', default_customer_id,
                'type', 'tenant',
                'features', '["basic"]'
            ),
            CURRENT_TIMESTAMP
        ) ON CONFLICT (slug) DO NOTHING;        -- Create admin user for the organization (with duplicate handling)
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
            user_id,
            org_id,
            default_customer_email,
            crypt(admin_password, gen_salt('bf')),
            split_part(default_customer_name, ' ', 1),  -- First part as first name
            CASE
                WHEN position(' ' in default_customer_name) > 0
                THEN substring(default_customer_name from position(' ' in default_customer_name) + 1)
                ELSE ''
            END,
            'admin',
            true,
            true,
            CURRENT_TIMESTAMP
        ) ON CONFLICT (email, organization_id) DO NOTHING;
        
        -- Create default workspace for the organization (with duplicate handling)
        INSERT INTO workspaces (
            id,
            organization_id,
            name,
            description,
            is_active,
            created_at
        ) VALUES (
            workspace_id,
            org_id,
            default_customer_name || ' Workspace',
            'Default workspace for ' || default_customer_name,
            true,
            CURRENT_TIMESTAMP
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Tenant created successfully!';
        RAISE NOTICE 'Organization: % (ID: %)', default_customer_name, org_id;
        RAISE NOTICE 'Admin User: % (ID: %)', default_customer_email, user_id;
        RAISE NOTICE 'Workspace: % (ID: %)', default_customer_name || ' Workspace', workspace_id;
        RAISE NOTICE 'Admin Password: %', admin_password;
        
    ELSE
        RAISE NOTICE 'No tenant creation parameters provided. Skipping tenant creation.';
        RAISE NOTICE 'To create a tenant, provide: DEFAULT_LICENSE_ID, DEFAULT_CUSTOMER_ID, DEFAULT_CUSTOMER_EMAIL, DEFAULT_CUSTOMER_NAME';
    END IF;
END $$;

NOTIFY system;