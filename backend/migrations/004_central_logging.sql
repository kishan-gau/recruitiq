/**
 * Database Migration: Central Logging Tables
 * 
 * Creates tables for centralized logging from cloud instances.
 * Used by the portal to view logs from all cloud tenants.
 */

-- ============================================================================
-- SYSTEM LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_logs (
  id BIGSERIAL PRIMARY KEY,
  
  -- Timestamp
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Log details
  level VARCHAR(10) NOT NULL,           -- 'info', 'warn', 'error', 'debug'
  message TEXT NOT NULL,
  
  -- Multi-tenant/instance identification
  tenant_id VARCHAR(50) NOT NULL,       -- Which cloud tenant
  instance_id VARCHAR(50),              -- Which cloud instance
  
  -- Request context
  request_id VARCHAR(50),
  user_id INTEGER,
  ip_address INET,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  
  -- Error details
  error_stack TEXT,
  error_code VARCHAR(50),
  
  -- Additional metadata
  metadata JSONB,
  
  -- Indexes for fast queries
  CONSTRAINT system_logs_level_check CHECK (level IN ('info', 'warn', 'error', 'debug'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_tenant_id ON system_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_request_id ON system_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_tenant_timestamp ON system_logs(tenant_id, timestamp DESC);

-- Create index on metadata JSONB for common queries
CREATE INDEX IF NOT EXISTS idx_system_logs_metadata ON system_logs USING GIN (metadata);

-- ============================================================================
-- SECURITY EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
  id BIGSERIAL PRIMARY KEY,
  
  -- Timestamp
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Event details
  event_type VARCHAR(50) NOT NULL,      -- 'failed_login', 'brute_force_detected', etc.
  severity VARCHAR(20) NOT NULL,        -- 'info', 'warning', 'error', 'critical'
  description TEXT,
  
  -- Multi-tenant/instance identification
  tenant_id VARCHAR(50) NOT NULL,
  instance_id VARCHAR(50),
  
  -- User/source information
  user_id INTEGER,
  username VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  
  -- Additional metadata
  metadata JSONB,
  
  -- Alert information
  alert_sent BOOLEAN DEFAULT FALSE,
  alert_channels TEXT[],
  
  -- Constraints
  CONSTRAINT security_events_severity_check CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_id ON security_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_timestamp ON security_events(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity_timestamp ON security_events(severity, timestamp DESC);

-- Create index on metadata JSONB
CREATE INDEX IF NOT EXISTS idx_security_events_metadata ON security_events USING GIN (metadata);

-- ============================================================================
-- SECURITY ALERTS TABLE (for alert history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_alerts (
  id BIGSERIAL PRIMARY KEY,
  
  -- Timestamp
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Alert details
  alert_id VARCHAR(100) UNIQUE NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  
  -- Source
  tenant_id VARCHAR(50) NOT NULL,
  instance_id VARCHAR(50),
  
  -- Related event
  security_event_id BIGINT REFERENCES security_events(id),
  
  -- Alert delivery
  channels_sent TEXT[],
  delivery_status JSONB,                -- Status for each channel
  
  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by INTEGER,
  resolution_notes TEXT,
  
  -- Metadata
  metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_security_alerts_timestamp ON security_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_tenant_id ON security_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_alert_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);

-- ============================================================================
-- LOG RETENTION POLICY (automatic cleanup)
-- ============================================================================

-- Function to clean up old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- Delete system logs older than 90 days
  DELETE FROM system_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Delete security events older than 1 year (keep longer for compliance)
  DELETE FROM security_events
  WHERE timestamp < NOW() - INTERVAL '1 year'
  AND severity NOT IN ('critical', 'error');  -- Keep critical/error events longer
  
  -- Delete resolved alerts older than 6 months
  DELETE FROM security_alerts
  WHERE timestamp < NOW() - INTERVAL '6 months'
  AND resolved = TRUE;
  
  RAISE NOTICE 'Old logs cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job (requires pg_cron extension)
-- Uncomment if pg_cron is available
-- SELECT cron.schedule('cleanup-old-logs', '0 2 * * 0', 'SELECT cleanup_old_logs()');

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Recent errors by tenant
CREATE OR REPLACE VIEW recent_errors_by_tenant AS
SELECT 
  tenant_id,
  COUNT(*) as error_count,
  MAX(timestamp) as last_error,
  array_agg(DISTINCT error_code) as error_codes
FROM system_logs
WHERE level = 'error'
AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY tenant_id;

-- Security event summary by tenant
CREATE OR REPLACE VIEW security_summary_by_tenant AS
SELECT 
  tenant_id,
  event_type,
  severity,
  COUNT(*) as event_count,
  MAX(timestamp) as last_occurrence
FROM security_events
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY tenant_id, event_type, severity;

-- Active threats (unresolved critical alerts)
CREATE OR REPLACE VIEW active_threats AS
SELECT 
  a.*,
  e.ip_address,
  e.username,
  e.metadata as event_metadata
FROM security_alerts a
LEFT JOIN security_events e ON a.security_event_id = e.id
WHERE a.resolved = FALSE
AND a.severity IN ('critical', 'error')
ORDER BY a.timestamp DESC;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant permissions to portal application user
-- GRANT SELECT ON system_logs, security_events, security_alerts TO portal_app;
-- GRANT SELECT ON recent_errors_by_tenant, security_summary_by_tenant, active_threats TO portal_app;

-- Grant insert permissions to cloud instances
-- GRANT INSERT ON system_logs, security_events TO cloud_instance;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE system_logs IS 'Centralized system logs from all cloud instances';
COMMENT ON TABLE security_events IS 'Security events tracked across all cloud instances';
COMMENT ON TABLE security_alerts IS 'Security alerts generated and sent to administrators';
COMMENT ON COLUMN system_logs.tenant_id IS 'Identifier for the cloud tenant (for multi-tenant SaaS)';
COMMENT ON COLUMN system_logs.instance_id IS 'Identifier for the cloud instance (if multiple regions/instances)';
COMMENT ON COLUMN security_events.alert_sent IS 'Whether an alert was sent for this event';
COMMENT ON COLUMN security_alerts.delivery_status IS 'JSON object tracking delivery status for each channel';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('system_logs', 'security_events', 'security_alerts');
  
  IF table_count = 3 THEN
    RAISE NOTICE 'Migration successful: All 3 tables created';
  ELSE
    RAISE WARNING 'Migration incomplete: Only % tables created', table_count;
  END IF;
END $$;
