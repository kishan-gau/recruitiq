-- ============================================================================
-- Migration: Enhanced RBAC System
-- Description: Adds organization-scoped roles and user_roles table for dynamic RBAC
-- Author: RecruitIQ Team
-- Date: 2025-11-22
-- Version: 1.0
-- ============================================================================

-- This migration enhances the existing RBAC system to support:
-- 1. Organization-scoped roles (not just platform roles)
-- 2. Product-specific role assignments
-- 3. Dynamic user-role assignments (replaces product_roles JSONB)
-- 4. Audit trail for role changes
-- 5. Backward compatibility with existing system

-- NOTE: No transaction wrapper - each operation handles errors independently

-- ============================================================================
-- 1. ENHANCE PERMISSIONS TABLE
-- ============================================================================

-- Add product column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'permissions' AND column_name = 'product'
    ) THEN
        ALTER TABLE permissions ADD COLUMN product VARCHAR(50);
    END IF;
END $$;

-- Add is_system flag if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'permissions' AND column_name = 'is_system'
    ) THEN
        ALTER TABLE permissions ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- Add display_order if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'permissions' AND column_name = 'display_order'
    ) THEN
        ALTER TABLE permissions ADD COLUMN display_order INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add is_active if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'permissions' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE permissions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- Add updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'permissions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE permissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add constraint for product values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_permissions_product'
    ) THEN
        ALTER TABLE permissions ADD CONSTRAINT check_permissions_product 
        CHECK (product IS NULL OR product IN ('paylinq', 'nexus', 'schedulehub', 'recruitiq', 'global'));
    END IF;
END $$;

-- ============================================================================
-- 2. ENHANCE ROLES TABLE
-- ============================================================================

-- Add organization_id column if it doesn't exist (NULL for platform roles)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE roles ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE '[OK] Added organization_id column to roles table';
    ELSE
        RAISE NOTICE '[SKIP] organization_id column already exists in roles table';
    END IF;
END $$;

-- Add product column if it doesn't exist (NULL for global roles)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'product'
    ) THEN
        ALTER TABLE roles ADD COLUMN product VARCHAR(50);
        RAISE NOTICE '[OK] Added product column to roles table';
    ELSE
        RAISE NOTICE '[SKIP] product column already exists in roles table';
    END IF;
END $$;

-- Add is_system flag if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'is_system'
    ) THEN
        ALTER TABLE roles ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add is_active flag if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE roles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- Add soft delete columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE roles ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE roles ADD COLUMN created_by UUID REFERENCES hris.user_account(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE roles ADD COLUMN updated_by UUID REFERENCES hris.user_account(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'deleted_by'
    ) THEN
        ALTER TABLE roles ADD COLUMN deleted_by UUID REFERENCES hris.user_account(id);
    END IF;
END $$;

-- Add product constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_roles_product'
    ) THEN
        ALTER TABLE roles ADD CONSTRAINT check_roles_product 
        CHECK (product IS NULL OR product IN ('paylinq', 'nexus', 'schedulehub', 'recruitiq'));
    END IF;
END $$;

-- ============================================================================
-- 3. ENHANCE ROLE_PERMISSIONS TABLE
-- ============================================================================

-- Add created_by if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'role_permissions' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE role_permissions ADD COLUMN created_by UUID REFERENCES hris.user_account(id);
    END IF;
END $$;

-- ============================================================================
-- 4. CREATE USER_ROLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
    -- Composite Key
    user_id UUID NOT NULL REFERENCES hris.user_account(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    
    -- Product Context (optional - for product-specific role assignments)
    product VARCHAR(50),
    
    -- Audit
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES hris.user_account(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES hris.user_account(id),
    
    -- Constraints
    CONSTRAINT check_user_roles_product CHECK (
        product IS NULL OR product IN ('paylinq', 'nexus', 'schedulehub', 'recruitiq')
    ),
    
    -- Unique constraint (user can have same role in different products, but not twice in same product)
    CONSTRAINT user_roles_unique UNIQUE (user_id, role_id, product)
);

-- Comments
COMMENT ON TABLE user_roles IS 'Assigns roles to users with product context';
COMMENT ON COLUMN user_roles.product IS 'Product context for role assignment (NULL for global roles)';
COMMENT ON COLUMN user_roles.revoked_at IS 'Soft delete - allows role history tracking';

-- ============================================================================
-- 5. CREATE ROLE_AUDIT_LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_audit_log (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Audit Context
    organization_id UUID REFERENCES organizations(id),
    entity_type VARCHAR(50) NOT NULL,            -- 'role', 'permission', 'user_role'
    entity_id UUID NOT NULL,                     -- ID of the entity changed
    action VARCHAR(50) NOT NULL,                 -- 'create', 'update', 'delete', 'assign', 'revoke'
    
    -- Change Details
    changes JSONB,                               -- Before/after values
    
    -- User Context
    performed_by UUID REFERENCES hris.user_account(id),
    ip_address INET,                             -- IP address of user
    user_agent TEXT,                             -- Browser/client info
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_audit_entity_type CHECK (
        entity_type IN ('role', 'permission', 'role_permission', 'user_role')
    ),
    CONSTRAINT check_audit_action CHECK (
        action IN ('create', 'update', 'delete', 'assign', 'revoke', 'activate', 'deactivate')
    )
);

COMMENT ON TABLE role_audit_log IS 'Audit trail for all RBAC changes';

-- ============================================================================
-- 6. CREATE INDEXES
-- ============================================================================

-- Permissions indexes (only if columns exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='permissions' AND column_name='product') THEN
        CREATE INDEX IF NOT EXISTS idx_permissions_product ON permissions(product) WHERE is_active = true;
        CREATE INDEX IF NOT EXISTS idx_permissions_product_category ON permissions(product, category) WHERE is_active = true;
    END IF;
END $$;

-- Roles indexes (only if columns exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='roles' AND column_name='organization_id') THEN
        CREATE INDEX IF NOT EXISTS idx_roles_organization ON roles(organization_id) WHERE deleted_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(organization_id, is_active) WHERE deleted_at IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='roles' AND column_name='product') THEN
        CREATE INDEX IF NOT EXISTS idx_roles_product ON roles(product) WHERE deleted_at IS NULL AND product IS NOT NULL;
    END IF;
END $$;

-- User roles indexes (table should exist by now)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name='user_roles') THEN
        CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id) WHERE revoked_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id) WHERE revoked_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_user_roles_product ON user_roles(user_id, product) WHERE revoked_at IS NULL;
    END IF;
END $$;

-- Audit log indexes (table should exist by now)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name='role_audit_log') THEN
        CREATE INDEX IF NOT EXISTS idx_role_audit_log_org_date ON role_audit_log(organization_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_role_audit_log_entity ON role_audit_log(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_role_audit_log_user ON role_audit_log(performed_by, created_at DESC);
    END IF;
END $$;

-- ============================================================================
-- DOWN MIGRATION (for rollback)
-- ============================================================================
-- To rollback this migration, run:
-- DROP TABLE IF EXISTS role_audit_log CASCADE;
-- DROP TABLE IF NOT EXISTS user_roles CASCADE;
-- ALTER TABLE role_permissions DROP COLUMN IF EXISTS created_by;
-- ALTER TABLE roles DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE roles DROP COLUMN IF EXISTS product;
-- ALTER TABLE roles DROP COLUMN IF EXISTS is_system;
-- ALTER TABLE roles DROP COLUMN IF EXISTS is_active;
-- ALTER TABLE roles DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE roles DROP COLUMN IF EXISTS created_by;
-- ALTER TABLE roles DROP COLUMN IF EXISTS updated_by;
-- ALTER TABLE roles DROP COLUMN IF EXISTS deleted_by;
-- ALTER TABLE permissions DROP COLUMN IF EXISTS product;
-- ALTER TABLE permissions DROP COLUMN IF EXISTS is_system;
-- ALTER TABLE permissions DROP COLUMN IF EXISTS display_order;
-- ALTER TABLE permissions DROP COLUMN IF EXISTS is_active;
-- ALTER TABLE permissions DROP COLUMN IF EXISTS updated_at;
-- COMMIT;
