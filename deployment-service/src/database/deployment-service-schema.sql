-- ============================================================================
-- Deployment Service Schema
-- ============================================================================
-- Purpose: VPS provisioning approval workflow for TransIP integration
-- Created: 2025-11-07
-- ============================================================================

-- Create deployment schema
CREATE SCHEMA IF NOT EXISTS deployment;

-- Set search path
SET search_path TO deployment, public;

-- ============================================================================
-- Table: vps_provision_requests
-- Purpose: Store VPS provisioning requests requiring approval
-- ============================================================================
CREATE TABLE IF NOT EXISTS deployment.vps_provision_requests (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) UNIQUE NOT NULL, -- Human-readable request ID (e.g., VPS-2025-0001)
    
    -- Requester information
    requester_id UUID NOT NULL,
    requester_email VARCHAR(255) NOT NULL,
    requester_name VARCHAR(255) NOT NULL,
    organization_id UUID, -- Optional: link to customer organization
    
    -- Request details
    instance_id VARCHAR(100), -- License manager instance ID (if applicable)
    customer_id VARCHAR(100),
    customer_name VARCHAR(255) NOT NULL,
    
    -- VPS specifications
    product_name VARCHAR(100) NOT NULL, -- TransIP product (e.g., 'vps-bladevps-x4')
    vps_name VARCHAR(100) NOT NULL, -- Desired VPS name
    hostname VARCHAR(255), -- Desired hostname
    domain VARCHAR(255), -- Domain for the instance
    region VARCHAR(50) DEFAULT 'ams0', -- TransIP region
    operating_system VARCHAR(100) DEFAULT 'ubuntu-22.04',
    
    -- Application configuration
    license_key TEXT,
    license_tier VARCHAR(50), -- professional, enterprise, etc.
    admin_email VARCHAR(255),
    
    -- Approval workflow
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, provisioning, completed, failed, cancelled
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    
    -- Approval tracking
    approved_by_id UUID,
    approved_by_email VARCHAR(255),
    approved_by_name VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    rejected_by_id UUID,
    rejected_by_email VARCHAR(255),
    rejected_by_name VARCHAR(255),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Provisioning tracking
    deployment_job_id VARCHAR(255), -- Bull queue job ID
    vps_created_at TIMESTAMP WITH TIME ZONE,
    vps_ip_address VARCHAR(45), -- IPv4 or IPv6
    transip_vps_name VARCHAR(100), -- Actual name in TransIP (may differ from requested)
    
    -- Cost estimation
    estimated_monthly_cost DECIMAL(10, 2),
    estimated_setup_cost DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Business justification
    business_justification TEXT,
    project_code VARCHAR(100),
    cost_center VARCHAR(100),
    
    -- Additional metadata
    tags JSONB DEFAULT '[]'::jsonb,
    custom_config JSONB DEFAULT '{}'::jsonb, -- Additional cloud-init or configuration
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'approved', 'rejected', 'provisioning', 
        'completed', 'failed', 'cancelled'
    )),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CONSTRAINT approved_requires_approver CHECK (
        (status = 'approved' AND approved_by_id IS NOT NULL) OR status != 'approved'
    ),
    CONSTRAINT rejected_requires_rejector CHECK (
        (status = 'rejected' AND rejected_by_id IS NOT NULL) OR status != 'rejected'
    )
);

-- Indexes for vps_provision_requests
CREATE INDEX idx_vps_requests_status ON deployment.vps_provision_requests(status);
CREATE INDEX idx_vps_requests_requester ON deployment.vps_provision_requests(requester_id);
CREATE INDEX idx_vps_requests_organization ON deployment.vps_provision_requests(organization_id);
CREATE INDEX idx_vps_requests_created_at ON deployment.vps_provision_requests(created_at DESC);
CREATE INDEX idx_vps_requests_customer ON deployment.vps_provision_requests(customer_id);
CREATE INDEX idx_vps_requests_priority_status ON deployment.vps_provision_requests(priority, status);

-- ============================================================================
-- Table: vps_provision_approvers
-- Purpose: Define who can approve VPS provisioning requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS deployment.vps_provision_approvers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Approver information
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    
    -- Approval permissions
    role VARCHAR(50) NOT NULL, -- admin, manager, finance
    can_approve_all BOOLEAN DEFAULT false,
    max_monthly_cost DECIMAL(10, 2), -- Maximum cost they can approve
    
    -- Restrictions
    allowed_products TEXT[], -- Specific products they can approve (null = all)
    allowed_regions TEXT[], -- Specific regions they can approve (null = all)
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_approver_role CHECK (role IN ('admin', 'manager', 'finance', 'operations'))
);

-- Indexes for vps_provision_approvers
CREATE INDEX idx_vps_approvers_user ON deployment.vps_provision_approvers(user_id);
CREATE INDEX idx_vps_approvers_active ON deployment.vps_provision_approvers(is_active);

-- ============================================================================
-- Table: vps_provision_comments
-- Purpose: Track comments and communication on provision requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS deployment.vps_provision_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationship
    request_id UUID NOT NULL REFERENCES deployment.vps_provision_requests(id) ON DELETE CASCADE,
    
    -- Comment details
    user_id UUID NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    comment_text TEXT NOT NULL,
    
    -- Metadata
    is_internal BOOLEAN DEFAULT false, -- Internal notes vs visible to requester
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for vps_provision_comments
CREATE INDEX idx_vps_comments_request ON deployment.vps_provision_comments(request_id, created_at);
CREATE INDEX idx_vps_comments_user ON deployment.vps_provision_comments(user_id);

-- ============================================================================
-- Table: vps_provision_audit_log
-- Purpose: Comprehensive audit trail for all actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS deployment.vps_provision_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationship
    request_id UUID REFERENCES deployment.vps_provision_requests(id) ON DELETE CASCADE,
    
    -- Action details
    action VARCHAR(100) NOT NULL, -- created, approved, rejected, provisioning_started, completed, etc.
    actor_id UUID,
    actor_email VARCHAR(255),
    actor_name VARCHAR(255),
    
    -- Change tracking
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changes JSONB, -- Full change set
    
    -- Context
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for vps_provision_audit_log
CREATE INDEX idx_vps_audit_request ON deployment.vps_provision_audit_log(request_id, created_at DESC);
CREATE INDEX idx_vps_audit_action ON deployment.vps_provision_audit_log(action);
CREATE INDEX idx_vps_audit_actor ON deployment.vps_provision_audit_log(actor_id);

-- ============================================================================
-- Table: transip_vps_inventory
-- Purpose: Track all VPS instances managed by the system
-- ============================================================================
CREATE TABLE IF NOT EXISTS deployment.transip_vps_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- VPS identification
    vps_name VARCHAR(100) UNIQUE NOT NULL, -- TransIP VPS name
    provision_request_id UUID REFERENCES deployment.vps_provision_requests(id),
    
    -- VPS details
    product_name VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    operating_system VARCHAR(100),
    ip_address VARCHAR(45),
    ipv6_address VARCHAR(45),
    
    -- Customer linkage
    customer_id VARCHAR(100),
    customer_name VARCHAR(255),
    organization_id UUID,
    instance_id VARCHAR(100), -- License manager instance ID
    
    -- Status
    status VARCHAR(50) NOT NULL, -- running, stopped, installing, locked, etc.
    is_locked BOOLEAN DEFAULT false,
    is_blocked BOOLEAN DEFAULT false,
    
    -- Configuration
    hostname VARCHAR(255),
    domain VARCHAR(255),
    fqdn VARCHAR(512), -- Fully qualified domain name
    
    -- Resources
    cpu_cores INTEGER,
    memory_mb INTEGER,
    disk_gb INTEGER,
    
    -- Snapshots
    has_snapshots BOOLEAN DEFAULT false,
    snapshot_count INTEGER DEFAULT 0,
    last_snapshot_at TIMESTAMP WITH TIME ZONE,
    
    -- Cost tracking
    monthly_cost DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'EUR',
    billing_cycle VARCHAR(20), -- monthly, yearly
    
    -- Lifecycle dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    provisioned_at TIMESTAMP WITH TIME ZONE,
    last_synced_at TIMESTAMP WITH TIME ZONE, -- Last sync with TransIP API
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
    
    -- Metadata
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_vps_status CHECK (status IN (
        'running', 'stopped', 'installing', 'locked', 'blocked', 'unknown'
    ))
);

-- Indexes for transip_vps_inventory
CREATE INDEX idx_vps_inventory_status ON deployment.transip_vps_inventory(status);
CREATE INDEX idx_vps_inventory_customer ON deployment.transip_vps_inventory(customer_id);
CREATE INDEX idx_vps_inventory_organization ON deployment.transip_vps_inventory(organization_id);
CREATE INDEX idx_vps_inventory_request ON deployment.transip_vps_inventory(provision_request_id);
CREATE INDEX idx_vps_inventory_deleted ON deployment.transip_vps_inventory(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION deployment.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_vps_requests_updated_at
    BEFORE UPDATE ON deployment.vps_provision_requests
    FOR EACH ROW
    EXECUTE FUNCTION deployment.update_updated_at_column();

CREATE TRIGGER update_vps_approvers_updated_at
    BEFORE UPDATE ON deployment.vps_provision_approvers
    FOR EACH ROW
    EXECUTE FUNCTION deployment.update_updated_at_column();

CREATE TRIGGER update_vps_comments_updated_at
    BEFORE UPDATE ON deployment.vps_provision_comments
    FOR EACH ROW
    EXECUTE FUNCTION deployment.update_updated_at_column();

-- Function: Generate request number
CREATE OR REPLACE FUNCTION deployment.generate_request_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_num INTEGER;
    request_num TEXT;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(request_number FROM 'VPS-' || year_part || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM deployment.vps_provision_requests
    WHERE request_number LIKE 'VPS-' || year_part || '-%';
    
    request_num := 'VPS-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN request_num;
END;
$$ LANGUAGE plpgsql;

-- Function: Create audit log entry
CREATE OR REPLACE FUNCTION deployment.log_request_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log on updates (INSERT and DELETE are handled separately)
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO deployment.vps_provision_audit_log (
            request_id,
            action,
            old_status,
            new_status,
            changes
        ) VALUES (
            NEW.id,
            'status_changed',
            OLD.status,
            NEW.status,
            jsonb_build_object(
                'old', row_to_json(OLD),
                'new', row_to_json(NEW)
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for audit logging
CREATE TRIGGER log_vps_request_changes
    AFTER UPDATE ON deployment.vps_provision_requests
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION deployment.log_request_change();

-- ============================================================================
-- Views
-- ============================================================================

-- View: Pending requests with requester info
CREATE OR REPLACE VIEW deployment.pending_requests AS
SELECT 
    r.id,
    r.request_number,
    r.customer_name,
    r.product_name,
    r.vps_name,
    r.priority,
    r.estimated_monthly_cost,
    r.currency,
    r.business_justification,
    r.requester_name,
    r.requester_email,
    r.created_at,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - r.created_at))/3600 AS hours_pending
FROM deployment.vps_provision_requests r
WHERE r.status = 'pending'
ORDER BY 
    CASE r.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
    END,
    r.created_at ASC;

-- View: Active VPS inventory
CREATE OR REPLACE VIEW deployment.active_vps_summary AS
SELECT 
    v.id,
    v.vps_name,
    v.customer_name,
    v.status,
    v.ip_address,
    v.product_name,
    v.region,
    v.monthly_cost,
    v.currency,
    v.provisioned_at,
    v.last_synced_at,
    r.request_number
FROM deployment.transip_vps_inventory v
LEFT JOIN deployment.vps_provision_requests r ON v.provision_request_id = r.id
WHERE v.deleted_at IS NULL
ORDER BY v.provisioned_at DESC;

-- View: Request statistics
CREATE OR REPLACE VIEW deployment.request_statistics AS
SELECT 
    status,
    COUNT(*) AS count,
    SUM(estimated_monthly_cost) AS total_estimated_cost,
    AVG(estimated_monthly_cost) AS avg_estimated_cost,
    MIN(created_at) AS oldest_request,
    MAX(created_at) AS newest_request
FROM deployment.vps_provision_requests
GROUP BY status;

-- ============================================================================
-- Seed Data: Initial approvers (optional - can be done via API)
-- ============================================================================

-- Insert a default admin approver (update with real data in production)
-- This is commented out - should be created through the application
/*
INSERT INTO deployment.vps_provision_approvers (
    user_id,
    email,
    name,
    role,
    can_approve_all,
    max_monthly_cost,
    is_active
) VALUES (
    gen_random_uuid(),
    'admin@recruitiq.com',
    'System Administrator',
    'admin',
    true,
    NULL, -- No limit
    true
) ON CONFLICT (email) DO NOTHING;
*/

-- ============================================================================
-- Grants (adjust based on your security model)
-- ============================================================================

-- Grant usage on schema
-- GRANT USAGE ON SCHEMA deployment TO your_app_user;

-- Grant permissions on tables
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA deployment TO your_app_user;

-- Grant sequence permissions
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA deployment TO your_app_user;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON SCHEMA deployment IS 'VPS provisioning and approval workflow for TransIP integration';
COMMENT ON TABLE deployment.vps_provision_requests IS 'VPS provisioning requests requiring approval';
COMMENT ON TABLE deployment.vps_provision_approvers IS 'Users authorized to approve VPS provisioning requests';
COMMENT ON TABLE deployment.vps_provision_comments IS 'Comments and communication on provision requests';
COMMENT ON TABLE deployment.vps_provision_audit_log IS 'Comprehensive audit trail for all provisioning actions';
COMMENT ON TABLE deployment.transip_vps_inventory IS 'Inventory of all VPS instances managed by the system';

-- ============================================================================
-- Completion Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Deployment Service schema created successfully';
    RAISE NOTICE '   - 5 tables created in deployment schema';
    RAISE NOTICE '   - Approval workflow ready';
    RAISE NOTICE '   - Audit logging enabled';
    RAISE NOTICE '   - VPS inventory tracking configured';
END $$;
