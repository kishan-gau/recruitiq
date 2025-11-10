-- ============================================================================
-- Central Logging Schema for Portal
-- ============================================================================
-- This schema is used by platform admins to monitor all tenant instances.
-- In production, this would be in a separate centralized database.
-- For development/testing, it's in the same database as the tenant data.
-- ============================================================================

-- ============================================================================
-- SYSTEM LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Log level
  level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  
  -- Message
  message TEXT NOT NULL,
  
  -- Tenant/Instance info
  tenant_id VARCHAR(255),
  instance_id VARCHAR(255),
  
  -- Request context
  request_id VARCHAR(255),
  user_id UUID,
  ip_address VARCHAR(45),
  endpoint VARCHAR(500),
  method VARCHAR(10),
  
  -- Error details
  error_stack TEXT,
  error_code VARCHAR(100),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_tenant ON system_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_instance ON system_logs(instance_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_user ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_message ON system_logs USING gin(to_tsvector('english', message));
CREATE INDEX IF NOT EXISTS idx_system_logs_metadata ON system_logs USING gin(metadata);

COMMENT ON TABLE system_logs IS 'Centralized system logs from all tenant instances';
COMMENT ON COLUMN system_logs.tenant_id IS 'Identifier for the tenant organization';
COMMENT ON COLUMN system_logs.instance_id IS 'Identifier for the specific instance/server';
COMMENT ON COLUMN system_logs.metadata IS 'Additional structured log data';

-- ============================================================================
-- SECURITY EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Event details
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  
  -- Tenant/Instance info
  tenant_id VARCHAR(255),
  instance_id VARCHAR(255),
  
  -- User/Actor info
  user_id UUID,
  user_email VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Event context
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  action VARCHAR(100),
  result VARCHAR(50),
  
  -- Request context
  request_id VARCHAR(255),
  endpoint VARCHAR(500),
  method VARCHAR(10),
  
  -- Additional details
  details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_tenant ON security_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_events_instance ON security_events(instance_id);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_details ON security_events USING gin(details);
CREATE INDEX IF NOT EXISTS idx_security_events_metadata ON security_events USING gin(metadata);

COMMENT ON TABLE security_events IS 'Security events and audit trail from all tenant instances';
COMMENT ON COLUMN security_events.event_type IS 'Type of security event (login_failure, unauthorized_access, etc.)';
COMMENT ON COLUMN security_events.severity IS 'Severity level of the security event';
COMMENT ON COLUMN security_events.details IS 'Event-specific structured data';

-- ============================================================================
-- Sample Data for Testing (Optional)
-- ============================================================================
-- Uncomment to insert sample data for development/testing

-- INSERT INTO system_logs (level, message, tenant_id, instance_id) VALUES
--   ('info', 'Application started', 'tenant-123', 'instance-1'),
--   ('error', 'Database connection failed', 'tenant-123', 'instance-1'),
--   ('warn', 'High memory usage detected', 'tenant-456', 'instance-2');

-- INSERT INTO security_events (event_type, severity, tenant_id, instance_id, user_email) VALUES
--   ('login_success', 'info', 'tenant-123', 'instance-1', 'user@example.com'),
--   ('unauthorized_access', 'warning', 'tenant-123', 'instance-1', 'attacker@example.com'),
--   ('data_breach_attempt', 'critical', 'tenant-456', 'instance-2', 'malicious@example.com');
