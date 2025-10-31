-- ============================================================================
-- License Manager Tables
-- Add to main recruitiq_dev database (no longer separate database)
-- ============================================================================

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Customer Details
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  
  -- License & Tier
  tier VARCHAR(50) NOT NULL CHECK (tier IN ('starter', 'professional', 'enterprise')),
  
  -- Deployment
  deployment_type VARCHAR(50) NOT NULL CHECK (deployment_type IN ('cloud', 'self-hosted')),
  instance_key VARCHAR(100) UNIQUE NOT NULL,
  instance_url VARCHAR(500),
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'canceled')),
  
  -- Contract
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  
  -- Instance Info
  app_version VARCHAR(50),
  last_heartbeat TIMESTAMP,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_customers_tier ON customers(tier);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_instance_key ON customers(instance_key);
CREATE INDEX idx_customers_deployment_type ON customers(deployment_type);

-- ============================================================================
-- TIER PRESETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tier_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Tier Info
  tier_name VARCHAR(50) NOT NULL CHECK (tier_name IN ('starter', 'professional', 'enterprise')),
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Limits
  max_users INTEGER NOT NULL,
  max_workspaces INTEGER NOT NULL,
  max_jobs INTEGER,
  max_candidates INTEGER,
  
  -- Features
  features JSONB DEFAULT '[]',
  
  -- Status
  is_active BOOLEAN DEFAULT FALSE,
  effective_date DATE,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tier_name, version)
);

CREATE INDEX idx_tier_presets_tier ON tier_presets(tier_name);
CREATE INDEX idx_tier_presets_active ON tier_presets(is_active);

-- ============================================================================
-- LICENSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- License Details
  license_key VARCHAR(500) UNIQUE NOT NULL,
  tier VARCHAR(50) NOT NULL CHECK (tier IN ('starter', 'professional', 'enterprise')),
  tier_preset_id UUID REFERENCES tier_presets(id),
  
  -- Validity
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
  
  -- Features & Limits (from tier preset at time of issuance)
  max_users INTEGER NOT NULL,
  max_workspaces INTEGER NOT NULL,
  max_jobs INTEGER,
  max_candidates INTEGER,
  features JSONB DEFAULT '[]',
  
  -- Instance Binding
  instance_key VARCHAR(100),
  instance_fingerprint VARCHAR(255),
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_licenses_customer ON licenses(customer_id);
CREATE INDEX idx_licenses_license_key ON licenses(license_key);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_expires_at ON licenses(expires_at);
CREATE INDEX idx_licenses_tier ON licenses(tier);

-- ============================================================================
-- INSTANCES TABLE (RecruitIQ Installations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Instance Details
  instance_key VARCHAR(100) UNIQUE NOT NULL,
  instance_url VARCHAR(500),
  instance_fingerprint VARCHAR(255),
  
  -- Version & Status
  app_version VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  
  -- Heartbeat
  last_heartbeat TIMESTAMP,
  last_heartbeat_ip VARCHAR(50),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_instances_customer ON instances(customer_id);
CREATE INDEX idx_instances_instance_key ON instances(instance_key);
CREATE INDEX idx_instances_status ON instances(status);
CREATE INDEX idx_instances_last_heartbeat ON instances(last_heartbeat);

-- ============================================================================
-- USAGE EVENTS TABLE (Telemetry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_events (
  id BIGSERIAL PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  instance_key VARCHAR(100),
  
  -- Event Details
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}',
  
  -- Metrics
  users_count INTEGER,
  workspaces_count INTEGER,
  jobs_count INTEGER,
  candidates_count INTEGER,
  
  -- Timestamp
  timestamp TIMESTAMP DEFAULT NOW(),
  
  -- Metadata
  app_version VARCHAR(50),
  ip_address VARCHAR(50)
);

CREATE INDEX idx_usage_events_customer ON usage_events(customer_id);
CREATE INDEX idx_usage_events_instance ON usage_events(instance_key);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_timestamp ON usage_events(timestamp DESC);
CREATE INDEX idx_usage_events_customer_timestamp ON usage_events(customer_id, timestamp DESC);

-- ============================================================================
-- TIER MIGRATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tier_migrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Migration Details
  tier_name VARCHAR(50) NOT NULL,
  from_preset_id UUID REFERENCES tier_presets(id),
  to_preset_id UUID REFERENCES tier_presets(id),
  
  -- Migration Type
  migration_type VARCHAR(50) CHECK (migration_type IN ('manual', 'automatic', 'scheduled')),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  affected_customers INTEGER DEFAULT 0,
  migrated_customers INTEGER DEFAULT 0,
  
  -- Execution
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Error Handling
  errors JSONB DEFAULT '[]',
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tier_migrations_tier ON tier_migrations(tier_name);
CREATE INDEX idx_tier_migrations_status ON tier_migrations(status);
CREATE INDEX idx_tier_migrations_created_at ON tier_migrations(created_at DESC);

-- ============================================================================
-- AUDIT LOG TABLE (License Manager specific)
-- ============================================================================
CREATE TABLE IF NOT EXISTS license_audit_log (
  id BIGSERIAL PRIMARY KEY,
  
  -- User who performed the action
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),
  
  -- Action Details
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Request Context
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  -- Timestamp
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON license_audit_log(user_id);
CREATE INDEX idx_audit_log_action ON license_audit_log(action);
CREATE INDEX idx_audit_log_resource ON license_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_timestamp ON license_audit_log(timestamp DESC);

-- ============================================================================
-- Views for Quick Access
-- ============================================================================

-- Active licenses with customer info
CREATE OR REPLACE VIEW active_licenses AS
SELECT 
  l.*,
  c.name as customer_name,
  c.contact_email,
  c.status as customer_status,
  c.instance_url
FROM licenses l
JOIN customers c ON l.customer_id = c.id
WHERE l.status = 'active'
AND c.status = 'active'
AND l.expires_at > NOW();

-- Expiring licenses (within 60 days)
CREATE OR REPLACE VIEW expiring_licenses AS
SELECT 
  l.*,
  c.name as customer_name,
  c.contact_email,
  c.instance_url,
  (l.expires_at - NOW()) as time_until_expiry
FROM licenses l
JOIN customers c ON l.customer_id = c.id
WHERE l.status = 'active'
AND l.expires_at BETWEEN NOW() AND NOW() + INTERVAL '60 days'
ORDER BY l.expires_at ASC;

-- Customer usage summary
CREATE OR REPLACE VIEW customer_usage_summary AS
SELECT 
  c.id,
  c.name,
  c.tier,
  c.status,
  i.app_version,
  i.last_heartbeat,
  l.max_users,
  l.max_workspaces,
  l.max_jobs,
  l.max_candidates,
  l.expires_at as license_expires_at,
  (
    SELECT MAX(users_count) 
    FROM usage_events 
    WHERE customer_id = c.id 
    AND timestamp > NOW() - INTERVAL '30 days'
  ) as current_users,
  (
    SELECT MAX(workspaces_count) 
    FROM usage_events 
    WHERE customer_id = c.id 
    AND timestamp > NOW() - INTERVAL '30 days'
  ) as current_workspaces,
  (
    SELECT MAX(jobs_count) 
    FROM usage_events 
    WHERE customer_id = c.id 
    AND timestamp > NOW() - INTERVAL '30 days'
  ) as current_jobs,
  (
    SELECT MAX(candidates_count) 
    FROM usage_events 
    WHERE customer_id = c.id 
    AND timestamp > NOW() - INTERVAL '30 days'
  ) as current_candidates
FROM customers c
LEFT JOIN instances i ON c.instance_key = i.instance_key
LEFT JOIN licenses l ON c.id = l.customer_id AND l.status = 'active'
WHERE c.status = 'active';

-- ============================================================================
-- Grant Permissions
-- ============================================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ License Manager tables created successfully!';
  RAISE NOTICE '📊 Tables: customers, tier_presets, licenses, instances, usage_events, tier_migrations, license_audit_log';
  RAISE NOTICE '📈 Views: active_licenses, expiring_licenses, customer_usage_summary';
END $$;
