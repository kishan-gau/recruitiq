-- RecruitIQ License Manager Database Schema
-- Purpose: Centralized license management for all deployment types

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CUSTOMERS (Client Organizations)
-- ============================================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  company_size VARCHAR(50),
  
  -- Deployment info
  deployment_type VARCHAR(50) NOT NULL CHECK (deployment_type IN ('cloud-shared', 'cloud-dedicated', 'on-premise')),
  
  -- Contract info
  contract_start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  contract_end_date TIMESTAMP NOT NULL,
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual', 'one-time')),
  payment_method VARCHAR(50) DEFAULT 'invoice',
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'churned')),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT unique_email UNIQUE (contact_email)
);

CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_deployment_type ON customers(deployment_type);
CREATE INDEX idx_customers_contract_end ON customers(contract_end_date);

-- ============================================================================
-- INSTANCES (Each Deployment)
-- ============================================================================
CREATE TABLE instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Instance identification
  instance_key VARCHAR(255) UNIQUE NOT NULL,
  instance_url VARCHAR(500),
  
  -- Database connection (for telemetry collection if needed)
  database_host VARCHAR(255),
  database_name VARCHAR(255),
  database_port INTEGER DEFAULT 5432,
  
  -- Version tracking
  app_version VARCHAR(50),
  last_heartbeat TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'maintenance', 'offline')),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_instances_customer_id ON instances(customer_id);
CREATE INDEX idx_instances_instance_key ON instances(instance_key);
CREATE INDEX idx_instances_last_heartbeat ON instances(last_heartbeat);

-- ============================================================================
-- TIER PRESETS (Versioned Tier Configurations)
-- ============================================================================
CREATE TABLE tier_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Tier identification
  tier_name VARCHAR(50) NOT NULL CHECK (tier_name IN ('starter', 'professional', 'enterprise', 'custom')),
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Limits (NULL = unlimited)
  max_users INTEGER,
  max_workspaces INTEGER,
  max_jobs INTEGER,
  max_candidates INTEGER,
  
  -- Features (JSON array)
  features JSONB DEFAULT '[]'::jsonb,
  
  -- Pricing (informational)
  monthly_price_per_user DECIMAL(10, 2),
  annual_price_per_user DECIMAL(10, 2),
  base_price DECIMAL(10, 2),
  
  -- Version control
  effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  -- Change tracking
  description TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint: one active version per tier
  CONSTRAINT unique_active_tier UNIQUE NULLS NOT DISTINCT (tier_name, is_active, effective_until),
  CONSTRAINT unique_tier_version UNIQUE (tier_name, version)
);

CREATE INDEX idx_tier_presets_tier_name ON tier_presets(tier_name);
CREATE INDEX idx_tier_presets_active ON tier_presets(is_active);
CREATE INDEX idx_tier_presets_effective ON tier_presets(effective_from, effective_until);

-- ============================================================================
-- TIER MIGRATIONS (Track Tier Version Migrations)
-- ============================================================================
CREATE TABLE tier_migrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What changed
  from_preset_id UUID REFERENCES tier_presets(id) ON DELETE SET NULL,
  to_preset_id UUID NOT NULL REFERENCES tier_presets(id) ON DELETE CASCADE,
  
  -- Migration scope
  migration_type VARCHAR(50) NOT NULL CHECK (migration_type IN ('automatic', 'manual', 'selective')),
  affected_customers INTEGER DEFAULT 0,
  migrated_customers INTEGER DEFAULT 0,
  
  -- Filters used for selective migration
  filter_criteria JSONB,
  
  -- Execution
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'failed')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  
  -- Tracking
  executed_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tier_migrations_status ON tier_migrations(status);
CREATE INDEX idx_tier_migrations_preset ON tier_migrations(to_preset_id);

-- ============================================================================
-- LICENSES (One per Customer)
-- ============================================================================
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,
  
  -- License key (for API validation)
  license_key VARCHAR(500) UNIQUE NOT NULL,
  
  -- Tier & Features
  tier VARCHAR(50) NOT NULL CHECK (tier IN ('starter', 'professional', 'enterprise')),
  
  -- Limits (NULL = unlimited)
  max_users INTEGER,
  max_workspaces INTEGER,
  max_jobs INTEGER,
  max_candidates INTEGER,
  
  -- Features (JSON array)
  features JSONB DEFAULT '[]'::jsonb,
  
  -- Tier preset versioning
  tier_preset_id UUID REFERENCES tier_presets(id) ON DELETE SET NULL,
  tier_version INTEGER DEFAULT 1,
  auto_upgrade BOOLEAN DEFAULT true,
  
  -- Validity
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'revoked')),
  
  -- For on-premise: .lic file content
  license_file JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_licenses_customer_id ON licenses(customer_id);
CREATE INDEX idx_licenses_license_key ON licenses(license_key);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_expires_at ON licenses(expires_at);
CREATE INDEX idx_licenses_tier_preset ON licenses(tier_preset_id);

-- ============================================================================
-- USAGE EVENTS (Telemetry from All Instances)
-- ============================================================================
CREATE TABLE usage_events (
  id BIGSERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  
  -- Resource counts (snapshot at time of event)
  user_count INTEGER,
  workspace_count INTEGER,
  job_count INTEGER,
  candidate_count INTEGER,
  
  -- Timestamp
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_events_customer_id ON usage_events(customer_id);
CREATE INDEX idx_usage_events_instance_id ON usage_events(instance_id);
CREATE INDEX idx_usage_events_timestamp ON usage_events(timestamp);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_customer_timestamp ON usage_events(customer_id, timestamp);

-- ============================================================================
-- ADMIN USERS (License Manager Admins)
-- ============================================================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- Role-based access
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support', 'viewer')),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Tracking
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- ============================================================================
-- AUDIT LOG (Track Admin Actions)
-- ============================================================================
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  
  -- Action details
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  
  -- Details
  details JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin_user_id ON audit_log(admin_user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- ============================================================================
-- VALIDATION LOGS (Track License Validation Requests)
-- ============================================================================
CREATE TABLE validation_logs (
  id BIGSERIAL PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
  license_key VARCHAR(500),
  
  -- Validation result
  is_valid BOOLEAN NOT NULL,
  validation_message TEXT,
  
  -- Request info
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_validation_logs_customer_id ON validation_logs(customer_id);
CREATE INDEX idx_validation_logs_instance_id ON validation_logs(instance_id);
CREATE INDEX idx_validation_logs_timestamp ON validation_logs(timestamp);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instances_updated_at BEFORE UPDATE ON instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON licenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA (Default Admin User)
-- ============================================================================

-- Default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash generated with bcryptjs
INSERT INTO admin_users (email, password_hash, name, role) VALUES
('admin@recruitiq.com', '$2a$10$YourHashedPasswordHere', 'Admin User', 'super_admin');

-- ============================================================================
-- VIEWS (Useful Queries)
-- ============================================================================

-- Active customers with their instance info
CREATE VIEW active_customers_view AS
SELECT 
  c.id,
  c.name,
  c.contact_email,
  c.deployment_type,
  c.status,
  c.contract_end_date,
  i.instance_key,
  i.instance_url,
  i.last_heartbeat,
  l.tier,
  l.license_key,
  l.max_users,
  l.max_workspaces
FROM customers c
LEFT JOIN instances i ON c.id = i.customer_id
LEFT JOIN licenses l ON c.id = l.customer_id
WHERE c.status = 'active';

-- Usage summary by customer
CREATE VIEW customer_usage_summary AS
SELECT 
  c.id as customer_id,
  c.name,
  COUNT(DISTINCT ue.id) as total_events,
  MAX(ue.user_count) as max_users,
  MAX(ue.workspace_count) as max_workspaces,
  MAX(ue.job_count) as max_jobs,
  MAX(ue.candidate_count) as max_candidates,
  MAX(ue.timestamp) as last_activity
FROM customers c
LEFT JOIN usage_events ue ON c.id = ue.customer_id
WHERE ue.timestamp > NOW() - INTERVAL '30 days'
GROUP BY c.id, c.name;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE customers IS 'Client organizations using RecruitIQ';
COMMENT ON TABLE instances IS 'Individual deployments (cloud or on-premise)';
COMMENT ON TABLE tier_presets IS 'Versioned tier configurations with backwards compatibility support';
COMMENT ON TABLE tier_migrations IS 'Audit log of tier preset changes and customer migrations';
COMMENT ON TABLE licenses IS 'License records with tiers and limits';
COMMENT ON TABLE usage_events IS 'Telemetry data from customer instances';
COMMENT ON TABLE admin_users IS 'License Manager admin accounts';
COMMENT ON TABLE audit_log IS 'Track all admin actions';
COMMENT ON TABLE validation_logs IS 'Track license validation attempts';

COMMENT ON COLUMN licenses.tier_preset_id IS 'Links to the tier preset configuration version';
COMMENT ON COLUMN licenses.tier_version IS 'Version number of the tier when license was issued/updated';
COMMENT ON COLUMN licenses.auto_upgrade IS 'If true, customer automatically gets new tier features/limits when tier is upgraded';
