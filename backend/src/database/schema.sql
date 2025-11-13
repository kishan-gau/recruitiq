-- ============================================================================
-- RecruitIQ Database Schema
-- Single source of truth for database structure
-- Last updated: 2025-10-28
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop all tables (for clean reset) - in reverse dependency order
-- Drop license manager tables first
DROP TABLE IF EXISTS license_audit_log CASCADE;
DROP TABLE IF EXISTS tier_migrations CASCADE;
DROP TABLE IF EXISTS usage_events CASCADE;
DROP TABLE IF EXISTS instances CASCADE;
DROP TABLE IF EXISTS licenses CASCADE;
DROP TABLE IF EXISTS tier_presets CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Drop product management tables
DROP MATERIALIZED VIEW IF EXISTS feature_usage_summary CASCADE;
DROP VIEW IF EXISTS active_feature_grants CASCADE;
DROP TABLE IF EXISTS feature_audit_log CASCADE;
DROP TABLE IF EXISTS feature_usage_events CASCADE;
DROP TABLE IF EXISTS organization_feature_grants CASCADE;
DROP TABLE IF EXISTS features CASCADE;
DROP TABLE IF EXISTS product_features CASCADE;
DROP TABLE IF EXISTS product_configs CASCADE;
DROP TABLE IF EXISTS product_permissions CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Drop main application tables
DROP TABLE IF EXISTS communications CASCADE;
DROP TABLE IF EXISTS interview_interviewers CASCADE;
DROP TABLE IF EXISTS interviews CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS flow_templates CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop central logging tables
DROP TABLE IF EXISTS security_alerts CASCADE;
DROP TABLE IF EXISTS security_events CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;

-- Drop deployment tables
DROP TABLE IF EXISTS instance_deployments CASCADE;
DROP TABLE IF EXISTS vps_instances CASCADE;

-- Drop views
DROP VIEW IF EXISTS customer_usage_summary CASCADE;
DROP VIEW IF EXISTS expiring_licenses CASCADE;
DROP VIEW IF EXISTS active_licenses CASCADE;
DROP VIEW IF EXISTS active_threats CASCADE;
DROP VIEW IF EXISTS security_summary_by_tenant CASCADE;
DROP VIEW IF EXISTS recent_errors_by_tenant CASCADE;

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  
  -- License & Subscription
  tier VARCHAR(50) NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter', 'professional', 'enterprise')),
  license_key VARCHAR(500),
  license_expires_at TIMESTAMPTZ,
  subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'suspended')),
  subscription_id VARCHAR(255),
  
  -- Limits
  max_users INTEGER DEFAULT 10,
  max_workspaces INTEGER DEFAULT 1,
  max_jobs INTEGER,
  max_candidates INTEGER,
  
  -- Session Policy Configuration
  session_policy VARCHAR(50) DEFAULT 'multiple' CHECK (session_policy IN ('single', 'multiple')),
  max_sessions_per_user INTEGER DEFAULT 5,
  concurrent_login_detection BOOLEAN DEFAULT FALSE,
  
  -- MFA Security Policy
  mfa_required BOOLEAN DEFAULT FALSE,
  mfa_enforcement_date TIMESTAMPTZ,
  
  -- Deployment Configuration
  deployment_model VARCHAR(50) NOT NULL DEFAULT 'shared' CHECK (deployment_model IN ('shared', 'dedicated')),
  vps_id UUID,  -- References vps_instances(id), added later with FK
  
  -- Timezone Configuration
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  
  -- Organization Contact Information
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  logo_url TEXT,
  
  -- Settings
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_tier ON organizations(tier);
CREATE INDEX idx_organizations_deployment ON organizations(deployment_model);

COMMENT ON COLUMN organizations.session_policy IS 'Session policy: "single" = one session per user (license enforcement), "multiple" = allow multiple devices (default)';
COMMENT ON COLUMN organizations.max_sessions_per_user IS 'Maximum concurrent sessions per user when session_policy = "multiple"';
COMMENT ON COLUMN organizations.concurrent_login_detection IS 'Enable detection of simultaneous logins from different IPs/locations';
COMMENT ON COLUMN organizations.mfa_required IS 'Whether MFA is mandatory for all users in this organization (cannot be disabled by users). TRUE for shared deployments for security.';
COMMENT ON COLUMN organizations.mfa_enforcement_date IS 'Date when MFA became mandatory. Users without MFA enabled after this date will be prompted to set it up.';

-- ============================================================================
-- EMAIL_SETTINGS TABLE - Organization-wide email configuration (used by all products)
-- ============================================================================
CREATE TABLE email_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Provider configuration
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('smtp', 'sendgrid', 'ses')),
  
  -- Common settings (used by all providers)
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) NOT NULL,
  reply_to_email VARCHAR(255),
  
  -- SMTP settings (used when provider = 'smtp')
  smtp_host VARCHAR(255),
  smtp_port INTEGER,
  smtp_username VARCHAR(255),
  smtp_password TEXT, -- Encrypted
  smtp_secure VARCHAR(10) CHECK (smtp_secure IN ('tls', 'ssl', 'none')),
  
  -- SendGrid settings (used when provider = 'sendgrid')
  sendgrid_api_key TEXT, -- Encrypted
  
  -- AWS SES settings (used when provider = 'ses')
  aws_region VARCHAR(50),
  aws_access_key_id VARCHAR(255),
  aws_secret_access_key TEXT, -- Encrypted
  
  -- Status tracking
  is_configured BOOLEAN DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  
  -- Audit fields
  created_by UUID, -- References users(id)
  updated_by UUID, -- References users(id)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT unique_organization_email_settings UNIQUE(organization_id)
);

CREATE INDEX idx_email_settings_organization ON email_settings(organization_id);
CREATE INDEX idx_email_settings_provider ON email_settings(provider);
CREATE INDEX idx_email_settings_deleted ON email_settings(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE email_settings IS 'Organization-wide email configuration shared across all products (Paylinq, Nexus, RecruitIQ, etc.)';
COMMENT ON COLUMN email_settings.provider IS 'Email service provider: smtp, sendgrid, or ses';
COMMENT ON COLUMN email_settings.smtp_password IS 'Encrypted SMTP password';
COMMENT ON COLUMN email_settings.sendgrid_api_key IS 'Encrypted SendGrid API key';
COMMENT ON COLUMN email_settings.aws_secret_access_key IS 'Encrypted AWS secret access key';
COMMENT ON COLUMN email_settings.is_configured IS 'Whether email settings have been configured and tested';

-- ============================================================================
-- PRODUCTS TABLE - Multi-Product Architecture Registry
-- ============================================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Product Identification
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(100) NOT NULL UNIQUE,
  
  -- Product Metadata
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  npm_package VARCHAR(255), -- NPM package name for dynamic loading
  repository_url VARCHAR(500),
  documentation_url VARCHAR(500),
  
  -- Product Configuration
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'beta', 'deprecated', 'disabled')),
  is_core BOOLEAN DEFAULT FALSE, -- Core products (Nexus) vs add-on products
  requires_license BOOLEAN DEFAULT TRUE,
  
  -- Technical Details
  base_path VARCHAR(100), -- e.g., '/recruitiq', '/schedulehub', '/paylinq'
  api_prefix VARCHAR(100), -- e.g., '/api/recruitiq', '/api/schedulehub'
  default_port INTEGER,
  
  -- Resource Requirements
  min_tier VARCHAR(50) DEFAULT 'starter', -- Minimum subscription tier required
  resource_requirements JSONB DEFAULT '{}', -- CPU, memory, storage requirements
  
  -- Feature Flags
  features JSONB DEFAULT '[]', -- List of available features for this product
  default_features JSONB DEFAULT '[]', -- Features enabled by default
  
  -- UI Configuration
  icon VARCHAR(100), -- Icon identifier
  color VARCHAR(50), -- Brand color
  ui_config JSONB DEFAULT '{}', -- Product-specific UI settings
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- References users(id)
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_is_core ON products(is_core);

COMMENT ON TABLE products IS 'Registry of all available products in the multi-product platform';
COMMENT ON COLUMN products.npm_package IS 'NPM package name for dynamic product loading (e.g., "@recruitiq/schedulehub")';
COMMENT ON COLUMN products.is_core IS 'Core products are always available, add-ons require explicit enablement';
COMMENT ON COLUMN products.base_path IS 'URL base path for product routing';
COMMENT ON COLUMN products.min_tier IS 'Minimum subscription tier required to access this product';

-- ============================================================================
-- PRODUCT_PERMISSIONS TABLE - Define which organizations can access products
-- ============================================================================
CREATE TABLE product_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Access Control
  is_enabled BOOLEAN DEFAULT TRUE,
  access_level VARCHAR(50) DEFAULT 'full' CHECK (access_level IN ('none', 'read', 'write', 'full', 'admin')),
  
  -- License & Limits
  license_key VARCHAR(500), -- Product-specific license key
  license_expires_at TIMESTAMPTZ,
  max_users INTEGER, -- Max users for this product in this org
  max_resources INTEGER, -- Product-specific resource limit
  
  -- Feature Overrides
  enabled_features JSONB DEFAULT '[]', -- Features enabled for this org
  disabled_features JSONB DEFAULT '[]', -- Features explicitly disabled
  
  -- Usage Tracking
  users_count INTEGER DEFAULT 0,
  resources_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  
  -- Metadata
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID, -- References users(id)
  revoked_at TIMESTAMPTZ,
  revoked_by UUID, -- References users(id)
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, product_id)
);

CREATE INDEX idx_product_permissions_org ON product_permissions(organization_id);
CREATE INDEX idx_product_permissions_product ON product_permissions(product_id);
CREATE INDEX idx_product_permissions_enabled ON product_permissions(is_enabled);
CREATE INDEX idx_product_permissions_expires ON product_permissions(license_expires_at);

COMMENT ON TABLE product_permissions IS 'Defines which organizations have access to which products';
COMMENT ON COLUMN product_permissions.access_level IS 'Granular access control: none, read (view only), write (use features), full (all features), admin (manage product settings)';
COMMENT ON COLUMN product_permissions.enabled_features IS 'Product features enabled for this organization (overrides product defaults)';

-- ============================================================================
-- PRODUCT_CONFIGS TABLE - Organization-specific product configurations
-- ============================================================================
CREATE TABLE product_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Configuration
  config_key VARCHAR(255) NOT NULL,
  config_value JSONB NOT NULL,
  config_type VARCHAR(50) DEFAULT 'custom' CHECK (config_type IN ('default', 'custom', 'override')),
  
  -- Validation
  is_encrypted BOOLEAN DEFAULT FALSE,
  is_sensitive BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID, -- References users(id)
  
  UNIQUE(organization_id, product_id, config_key)
);

CREATE INDEX idx_product_configs_org ON product_configs(organization_id);
CREATE INDEX idx_product_configs_product ON product_configs(product_id);
CREATE INDEX idx_product_configs_key ON product_configs(config_key);
CREATE INDEX idx_product_configs_sensitive ON product_configs(is_sensitive);

COMMENT ON TABLE product_configs IS 'Organization-specific configuration overrides for products';
COMMENT ON COLUMN product_configs.config_type IS 'default (from product), custom (org-specific), override (admin override)';
COMMENT ON COLUMN product_configs.is_encrypted IS 'Whether the config_value is encrypted at rest';
COMMENT ON COLUMN product_configs.is_sensitive IS 'Whether this config contains sensitive data (API keys, credentials)';

-- ============================================================================
-- PRODUCT_FEATURES TABLE - Feature flag management per product
-- ============================================================================
CREATE TABLE product_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Feature Details
  feature_key VARCHAR(255) NOT NULL,
  feature_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Feature Status
  status VARCHAR(50) DEFAULT 'beta' CHECK (status IN ('alpha', 'beta', 'stable', 'deprecated', 'disabled')),
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Requirements
  min_tier VARCHAR(50), -- Minimum tier required for this feature
  requires_features JSONB DEFAULT '[]', -- List of feature_keys this depends on
  
  -- Configuration
  config_schema JSONB DEFAULT '{}', -- JSON schema for feature configuration
  default_config JSONB DEFAULT '{}', -- Default configuration values
  
  -- Rollout Control
  rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_organizations JSONB DEFAULT '[]', -- Specific orgs for targeted rollout
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- References users(id)
  
  UNIQUE(product_id, feature_key)
);

CREATE INDEX idx_product_features_product ON product_features(product_id);
CREATE INDEX idx_product_features_key ON product_features(feature_key);
CREATE INDEX idx_product_features_status ON product_features(status);
CREATE INDEX idx_product_features_default ON product_features(is_default);

COMMENT ON TABLE product_features IS 'Feature flags and toggles for gradual rollout and A/B testing';
COMMENT ON COLUMN product_features.rollout_percentage IS 'Percentage of organizations that should have this feature enabled (0-100)';
COMMENT ON COLUMN product_features.requires_features IS 'List of feature_keys that must be enabled before this feature';
COMMENT ON COLUMN product_features.config_schema IS 'JSON Schema defining valid configuration for this feature';

-- ============================================================================
-- FEATURES TABLE - Central feature registry (replaces/extends product_features)
-- ============================================================================
CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Feature Identity
  feature_key VARCHAR(255) NOT NULL,
  feature_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Feature Status & Lifecycle
  status VARCHAR(50) DEFAULT 'beta' CHECK (status IN ('alpha', 'beta', 'stable', 'deprecated', 'disabled')),
  deprecated_at TIMESTAMPTZ,
  deprecation_message TEXT,
  
  -- Tier & Pricing
  min_tier VARCHAR(50), -- Minimum tier required (starter, professional, enterprise)
  is_add_on BOOLEAN DEFAULT FALSE, -- Whether this is a paid add-on
  pricing JSONB DEFAULT '{}', -- { "monthly": 50, "annual": 500, "currency": "USD" }
  
  -- Feature Dependencies
  required_features JSONB DEFAULT '[]', -- Array of feature_keys that must be active
  conflicting_features JSONB DEFAULT '[]', -- Array of feature_keys that cannot be active simultaneously
  
  -- Configuration
  config_schema JSONB DEFAULT '{}', -- JSON schema for feature configuration
  default_config JSONB DEFAULT '{}', -- Default configuration values
  
  -- Usage Limits
  has_usage_limit BOOLEAN DEFAULT FALSE,
  default_usage_limit INTEGER,
  usage_limit_unit VARCHAR(50), -- e.g., "requests", "users", "records"
  
  -- Rollout Control
  rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_organizations JSONB DEFAULT '[]', -- Specific org IDs for targeted rollout
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- References users(id)
  
  UNIQUE(product_id, feature_key)
);

CREATE INDEX idx_features_product ON features(product_id);
CREATE INDEX idx_features_key ON features(feature_key);
CREATE INDEX idx_features_status ON features(status);
CREATE INDEX idx_features_category ON features(category);
CREATE INDEX idx_features_add_on ON features(is_add_on);
CREATE INDEX idx_features_tier ON features(min_tier);
CREATE INDEX idx_features_rollout ON features(rollout_percentage) WHERE rollout_percentage < 100;

COMMENT ON TABLE features IS 'Central registry of all features across products with granular access control';
COMMENT ON COLUMN features.is_add_on IS 'If true, this feature can be purchased separately regardless of tier';
COMMENT ON COLUMN features.required_features IS 'Features that must be enabled before this feature can be activated';
COMMENT ON COLUMN features.conflicting_features IS 'Features that cannot be active when this feature is active';

-- ============================================================================
-- ORGANIZATION_FEATURE_GRANTS TABLE - Track which features are granted to which orgs
-- ============================================================================
CREATE TABLE organization_feature_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  
  -- Grant Details
  granted_via VARCHAR(50) NOT NULL CHECK (granted_via IN ('tier_included', 'add_on_purchase', 'manual_grant', 'trial', 'promotional')),
  granted_reason TEXT,
  
  -- Grant Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Configuration Override
  config JSONB DEFAULT '{}', -- Organization-specific feature configuration
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT FALSE,
  
  -- Usage Limits
  usage_limit INTEGER, -- Override default usage limit
  current_usage INTEGER DEFAULT 0,
  last_usage_at TIMESTAMPTZ,
  usage_reset_at TIMESTAMPTZ, -- When usage counter resets (e.g., monthly)
  
  -- Billing
  billing_status VARCHAR(50) CHECK (billing_status IN ('active', 'past_due', 'canceled', 'trial')),
  subscription_id VARCHAR(255),
  
  -- Metadata
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID, -- References users(id)
  revoked_at TIMESTAMPTZ,
  revoked_by UUID, -- References users(id)
  revoked_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, feature_id)
);

CREATE INDEX idx_org_feature_grants_org ON organization_feature_grants(organization_id);
CREATE INDEX idx_org_feature_grants_feature ON organization_feature_grants(feature_id);
CREATE INDEX idx_org_feature_grants_active ON organization_feature_grants(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_org_feature_grants_expires ON organization_feature_grants(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_org_feature_grants_granted_via ON organization_feature_grants(granted_via);
CREATE INDEX idx_org_feature_grants_billing ON organization_feature_grants(billing_status);
CREATE INDEX idx_org_feature_grants_usage ON organization_feature_grants(organization_id, feature_id, current_usage);

COMMENT ON TABLE organization_feature_grants IS 'Tracks which organizations have access to which features and how they were granted';
COMMENT ON COLUMN organization_feature_grants.granted_via IS 'How the feature was granted: tier (included in tier), add_on (purchased), manual (admin granted), trial, promotional';
COMMENT ON COLUMN organization_feature_grants.current_usage IS 'Current usage count for features with usage limits';
COMMENT ON COLUMN organization_feature_grants.usage_reset_at IS 'When the usage counter resets (typically monthly)';

-- ============================================================================
-- FEATURE_USAGE_EVENTS TABLE - Track feature usage for analytics and billing
-- Partitioned by month for performance
-- ============================================================================
CREATE TABLE feature_usage_events (
  id UUID DEFAULT uuid_generate_v4(),
  
  -- References
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  user_id UUID, -- References users(id), nullable for system usage
  
  -- Event Details
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('access', 'usage', 'limit_exceeded', 'trial_started', 'trial_ended')),
  event_data JSONB DEFAULT '{}', -- Additional event metadata
  
  -- Usage Tracking
  usage_count INTEGER DEFAULT 1,
  
  -- Request Context
  ip_address INET,
  user_agent TEXT,
  request_path VARCHAR(500),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partitions (last 3 months, current month, next 3 months)
CREATE TABLE feature_usage_events_2025_08 PARTITION OF feature_usage_events
  FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE feature_usage_events_2025_09 PARTITION OF feature_usage_events
  FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE feature_usage_events_2025_10 PARTITION OF feature_usage_events
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE feature_usage_events_2025_11 PARTITION OF feature_usage_events
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE feature_usage_events_2025_12 PARTITION OF feature_usage_events
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE feature_usage_events_2026_01 PARTITION OF feature_usage_events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE feature_usage_events_2026_02 PARTITION OF feature_usage_events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE INDEX idx_feature_usage_org ON feature_usage_events(organization_id, created_at DESC);
CREATE INDEX idx_feature_usage_feature ON feature_usage_events(feature_id, created_at DESC);
CREATE INDEX idx_feature_usage_user ON feature_usage_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_feature_usage_event_type ON feature_usage_events(event_type, created_at DESC);

COMMENT ON TABLE feature_usage_events IS 'Time-series data for feature usage tracking, analytics, and billing (partitioned by month)';
COMMENT ON COLUMN feature_usage_events.event_type IS 'Type of usage event: access (feature checked), usage (feature used), limit_exceeded, trial events';
COMMENT ON COLUMN feature_usage_events.usage_count IS 'Number of usage units consumed in this event';

-- ============================================================================
-- FEATURE_AUDIT_LOG TABLE - Immutable audit trail for feature changes
-- ============================================================================
CREATE TABLE feature_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What Changed
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('feature', 'grant', 'config')),
  entity_id UUID NOT NULL,
  
  -- Action
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'granted', 'revoked', 'expired', 'usage_limit_exceeded')),
  
  -- Changes
  changes JSONB NOT NULL DEFAULT '{}', -- What changed
  old_values JSONB DEFAULT '{}', -- Previous values
  new_values JSONB DEFAULT '{}', -- New values
  
  -- Context
  organization_id UUID, -- References organizations(id)
  feature_id UUID, -- References features(id)
  
  -- Actor
  performed_by UUID, -- References users(id), null for system actions
  performed_by_type VARCHAR(50) DEFAULT 'user' CHECK (performed_by_type IN ('user', 'system', 'api', 'scheduled_job')),
  
  -- Request Context
  ip_address INET,
  user_agent TEXT,
  
  -- Metadata
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_audit_entity ON feature_audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_feature_audit_action ON feature_audit_log(action, created_at DESC);
CREATE INDEX idx_feature_audit_org ON feature_audit_log(organization_id, created_at DESC) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_feature_audit_feature ON feature_audit_log(feature_id, created_at DESC) WHERE feature_id IS NOT NULL;
CREATE INDEX idx_feature_audit_performed_by ON feature_audit_log(performed_by, created_at DESC) WHERE performed_by IS NOT NULL;
CREATE INDEX idx_feature_audit_created_at ON feature_audit_log(created_at DESC);

COMMENT ON TABLE feature_audit_log IS 'Immutable audit trail of all changes to features, grants, and configurations';
COMMENT ON COLUMN feature_audit_log.entity_type IS 'Type of entity that changed: feature, grant, or config';
COMMENT ON COLUMN feature_audit_log.changes IS 'Summary of what changed in human-readable format';
COMMENT ON COLUMN feature_audit_log.performed_by_type IS 'Whether change was made by user, system, API call, or scheduled job';

-- ============================================================================
-- HELPER VIEWS FOR FEATURE MANAGEMENT
-- ============================================================================

-- View: Active feature grants with feature details
CREATE VIEW active_feature_grants AS
SELECT 
  ofg.id AS grant_id,
  ofg.organization_id,
  o.name AS organization_name,
  f.id AS feature_id,
  f.feature_key,
  f.feature_name,
  f.product_id,
  p.name AS product_name,
  ofg.granted_via,
  ofg.is_active,
  ofg.expires_at,
  ofg.usage_limit,
  ofg.current_usage,
  CASE 
    WHEN ofg.usage_limit IS NOT NULL 
    THEN ofg.usage_limit - ofg.current_usage 
    ELSE NULL 
  END AS remaining_usage,
  ofg.granted_at,
  ofg.granted_by
FROM organization_feature_grants ofg
JOIN features f ON ofg.feature_id = f.id
JOIN products p ON f.product_id = p.id
JOIN organizations o ON ofg.organization_id = o.id
WHERE ofg.is_active = TRUE
  AND (ofg.expires_at IS NULL OR ofg.expires_at > NOW())
  AND (ofg.usage_limit IS NULL OR ofg.current_usage < ofg.usage_limit);

COMMENT ON VIEW active_feature_grants IS 'All currently active and usable feature grants with remaining usage';

-- View: Feature usage summary (materialized for performance)
CREATE MATERIALIZED VIEW feature_usage_summary AS
SELECT 
  f.id AS feature_id,
  f.feature_key,
  f.feature_name,
  f.product_id,
  p.name AS product_name,
  COUNT(DISTINCT ofg.organization_id) AS organizations_using,
  COUNT(DISTINCT fue.user_id) AS unique_users,
  SUM(fue.usage_count) AS total_usage_last_30_days,
  MAX(fue.created_at) AS last_used_at
FROM features f
JOIN products p ON f.product_id = p.id
LEFT JOIN organization_feature_grants ofg ON f.id = ofg.feature_id AND ofg.is_active = TRUE
LEFT JOIN feature_usage_events fue ON f.id = fue.feature_id AND fue.created_at >= NOW() - INTERVAL '30 days'
GROUP BY f.id, f.feature_key, f.feature_name, f.product_id, p.name;

CREATE UNIQUE INDEX idx_feature_usage_summary_feature ON feature_usage_summary(feature_id);

COMMENT ON MATERIALIZED VIEW feature_usage_summary IS 'Aggregated feature usage statistics (refresh periodically)';

-- ============================================================================
-- TRIGGERS FOR FEATURE MANAGEMENT
-- ============================================================================

-- Trigger: Audit feature grant changes
CREATE OR REPLACE FUNCTION audit_feature_grant_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO feature_audit_log (
      entity_type,
      entity_id,
      action,
      organization_id,
      feature_id,
      new_values,
      performed_by,
      performed_by_type
    ) VALUES (
      'grant',
      NEW.id,
      'granted',
      NEW.organization_id,
      NEW.feature_id,
      to_jsonb(NEW),
      NEW.granted_by,
      'user'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if significant fields changed
    IF (OLD.is_active != NEW.is_active OR 
        OLD.expires_at IS DISTINCT FROM NEW.expires_at OR
        OLD.usage_limit IS DISTINCT FROM NEW.usage_limit OR
        OLD.config IS DISTINCT FROM NEW.config) THEN
      
      INSERT INTO feature_audit_log (
        entity_type,
        entity_id,
        action,
        organization_id,
        feature_id,
        old_values,
        new_values,
        changes,
        performed_by,
        performed_by_type
      ) VALUES (
        'grant',
        NEW.id,
        CASE 
          WHEN OLD.is_active = TRUE AND NEW.is_active = FALSE THEN 'revoked'
          WHEN OLD.is_active = FALSE AND NEW.is_active = TRUE THEN 'granted'
          ELSE 'updated'
        END,
        NEW.organization_id,
        NEW.feature_id,
        to_jsonb(OLD),
        to_jsonb(NEW),
        jsonb_build_object(
          'is_active_changed', OLD.is_active != NEW.is_active,
          'expires_at_changed', OLD.expires_at IS DISTINCT FROM NEW.expires_at,
          'usage_limit_changed', OLD.usage_limit IS DISTINCT FROM NEW.usage_limit
        ),
        NEW.updated_at,
        'user'
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO feature_audit_log (
      entity_type,
      entity_id,
      action,
      organization_id,
      feature_id,
      old_values,
      performed_by_type
    ) VALUES (
      'grant',
      OLD.id,
      'deleted',
      OLD.organization_id,
      OLD.feature_id,
      to_jsonb(OLD),
      'system'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_feature_grants
  AFTER INSERT OR UPDATE OR DELETE ON organization_feature_grants
  FOR EACH ROW EXECUTE FUNCTION audit_feature_grant_changes();

COMMENT ON FUNCTION audit_feature_grant_changes IS 'Automatically logs all feature grant changes to audit trail';

-- ============================================================================
-- HELPER FUNCTIONS FOR FEATURE MANAGEMENT
-- ============================================================================

-- Function: Check if organization has feature access
CREATE OR REPLACE FUNCTION has_feature_access(
  p_organization_id UUID,
  p_feature_key VARCHAR,
  p_product_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM organization_feature_grants ofg
    JOIN features f ON ofg.feature_id = f.id
    WHERE ofg.organization_id = p_organization_id
      AND f.feature_key = p_feature_key
      AND (p_product_id IS NULL OR f.product_id = p_product_id)
      AND ofg.is_active = TRUE
      AND (ofg.expires_at IS NULL OR ofg.expires_at > NOW())
      AND (ofg.usage_limit IS NULL OR ofg.current_usage < ofg.usage_limit)
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION has_feature_access IS 'Quick check if an organization has active access to a feature';

-- Function: Auto-expire feature grants
CREATE OR REPLACE FUNCTION expire_feature_grants()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE organization_feature_grants
    SET is_active = FALSE,
        revoked_at = NOW(),
        revoked_reason = 'Expired automatically'
    WHERE is_active = TRUE
      AND expires_at IS NOT NULL
      AND expires_at <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired_count FROM expired;
  
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_feature_grants IS 'Deactivates expired feature grants (run via scheduled job)';

-- Function: Reset usage counters (for monthly limits)
CREATE OR REPLACE FUNCTION reset_usage_counters()
RETURNS INTEGER AS $$
DECLARE
  v_reset_count INTEGER;
BEGIN
  WITH reset AS (
    UPDATE organization_feature_grants
    SET current_usage = 0,
        usage_reset_at = NOW() + INTERVAL '1 month'
    WHERE usage_limit IS NOT NULL
      AND usage_reset_at <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_reset_count FROM reset;
  
  RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_usage_counters IS 'Resets usage counters for features with monthly limits (run via scheduled job)';

-- ============================================================================
-- PERMISSIONS TABLE - Define all available system permissions
-- ============================================================================
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Permission details
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_name ON permissions(name);

COMMENT ON TABLE permissions IS 'System-wide permissions for granular access control';
COMMENT ON COLUMN permissions.name IS 'Unique permission identifier (e.g., "license.create", "vps.provision")';
COMMENT ON COLUMN permissions.category IS 'Permission category (e.g., "license", "portal", "security", "vps")';

-- ============================================================================
-- ROLES TABLE - Define platform-level and tenant-level roles
-- ============================================================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Role details
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Role type
  role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('platform', 'tenant')),
  
  -- Role level
  level INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_type ON roles(role_type);

COMMENT ON TABLE roles IS 'System roles with hierarchical levels';
COMMENT ON COLUMN roles.role_type IS 'Platform roles for admin panel/license manager, Tenant roles for RecruitIQ instances';
COMMENT ON COLUMN roles.level IS 'Role hierarchy level - higher numbers have more privileges';

-- ============================================================================
-- ROLE_PERMISSIONS TABLE - Map permissions to roles
-- ============================================================================
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- ============================================================================
-- PLATFORM USERS TABLE - Platform Administrators Only
-- ============================================================================
-- Platform users access: Portal app, License Manager, Admin Panel
-- NOT for tenant/product users (those are in hris.user_account)
-- ============================================================================
CREATE TABLE platform_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Auth
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  
  -- Profile
  name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url VARCHAR(500),
  phone VARCHAR(50),
  timezone VARCHAR(100) DEFAULT 'UTC',
  
  -- Platform Roles (no organization_id - platform users are global)
  -- super_admin: Full platform control
  -- admin: Product/feature/organization management
  -- support: View + support functions
  -- viewer: Read-only access
  role VARCHAR(50) NOT NULL DEFAULT 'viewer' 
    CHECK (role IN ('super_admin', 'admin', 'support', 'viewer')),
  
  -- Additional permissions beyond role (JSON array of permission strings)
  permissions JSONB DEFAULT '[]',
  
  -- Security
  last_login_at TIMESTAMPTZ,
  last_login_ip VARCHAR(50),
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  password_reset_token VARCHAR(255),
  password_reset_expires_at TIMESTAMPTZ,
  
  -- MFA (Multi-Factor Authentication)
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  mfa_backup_codes JSONB DEFAULT '[]',
  mfa_backup_codes_used INTEGER DEFAULT 0,
  mfa_enabled_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_platform_users_email ON platform_users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_platform_users_role ON platform_users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_platform_users_is_active ON platform_users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_platform_users_last_login ON platform_users(last_login_at DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE platform_users IS 'Platform administrators for Portal app, License Manager, and Admin Panel. Tenant users are in hris.user_account.';
COMMENT ON COLUMN platform_users.role IS 'Platform role: super_admin (full control), admin (product/org management), support (view + support), viewer (read-only)';
COMMENT ON COLUMN platform_users.permissions IS 'JSONB array of additional permission strings beyond role permissions';
COMMENT ON COLUMN platform_users.email IS 'Unique email address for platform login. Platform users do not belong to any organization.';
COMMENT ON COLUMN platform_users.is_active IS 'Whether user account is enabled. Inactive users cannot log in.';

-- ============================================================================
-- PLATFORM REFRESH TOKENS TABLE - Session Management for Platform Users
-- ============================================================================
CREATE TABLE platform_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  
  -- Device/Session Tracking
  user_agent TEXT,
  ip_address VARCHAR(45),
  device_fingerprint VARCHAR(32),
  device_name VARCHAR(100),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Token Rotation Support
  replaced_by_token VARCHAR(255)
);

CREATE INDEX idx_platform_refresh_tokens_user_id ON platform_refresh_tokens(user_id);
CREATE INDEX idx_platform_refresh_tokens_token ON platform_refresh_tokens(token);
CREATE INDEX idx_platform_refresh_tokens_user_active ON platform_refresh_tokens(user_id, revoked_at, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_platform_refresh_tokens_device_fingerprint ON platform_refresh_tokens(device_fingerprint);
CREATE INDEX idx_platform_refresh_tokens_expires_at ON platform_refresh_tokens(expires_at);

COMMENT ON TABLE platform_refresh_tokens IS 'Refresh tokens for platform user sessions. Separate from tenant tokens in hris schema.';
COMMENT ON COLUMN platform_refresh_tokens.user_agent IS 'Full User-Agent string from client';
COMMENT ON COLUMN platform_refresh_tokens.ip_address IS 'IP address of the client (IPv4 or IPv6)';
COMMENT ON COLUMN platform_refresh_tokens.device_fingerprint IS 'SHA-256 hash of device characteristics';
COMMENT ON COLUMN platform_refresh_tokens.device_name IS 'Human-readable device name (e.g., "iPhone", "Windows PC")';
COMMENT ON COLUMN platform_refresh_tokens.last_used_at IS 'Timestamp of last token usage for session tracking';
COMMENT ON COLUMN platform_refresh_tokens.replaced_by_token IS 'Token that replaced this one during rotation';

-- ============================================================================
-- WORKSPACES TABLE (RecruitIQ-specific - TODO: Move to recruitiq schema)
-- ============================================================================
-- COMMENTED OUT: References old users table, needs refactoring
-- Will be moved to recruitiq schema with proper hris.user_account references
/*
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Metadata
  created_by UUID, -- TODO: Reference hris.user_account(id)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_workspaces_organization_id ON workspaces(organization_id);
*/

-- ============================================================================
-- RECRUITIQ APPLICATION TABLES
-- ============================================================================
-- TODO: Move to recruitiq schema with proper hris.user_account references
-- These tables are commented out during authentication refactoring
-- They will be recreated in a recruitiq-specific schema
/*
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Role in workspace
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  
  -- Metadata
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
*/

-- ============================================================================
-- RECRUITIQ APPLICATION TABLES
-- ============================================================================
-- Note: RecruitIQ tables have been moved to recruitiq-schema.sql
-- They are loaded separately by setup-database.ps1

-- ============================================================================
-- CENTRAL LOGGING TABLES (for cloud instances)
-- ============================================================================

-- System Logs Table
CREATE TABLE system_logs (
  id BIGSERIAL PRIMARY KEY,
  
  -- Timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Log details
  level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  
  -- Multi-tenant/instance identification
  tenant_id VARCHAR(50) NOT NULL,
  instance_id VARCHAR(50),
  
  -- Request context
  request_id VARCHAR(50),
  user_id UUID,
  ip_address INET,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  
  -- Error details
  error_stack TEXT,
  error_code VARCHAR(50),
  
  -- Additional metadata
  metadata JSONB
);

CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX idx_system_logs_tenant_id ON system_logs(tenant_id);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_request_id ON system_logs(request_id);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_tenant_timestamp ON system_logs(tenant_id, timestamp DESC);
CREATE INDEX idx_system_logs_metadata ON system_logs USING GIN (metadata);

COMMENT ON TABLE system_logs IS 'Centralized system logs from all cloud instances';
COMMENT ON COLUMN system_logs.tenant_id IS 'Identifier for the cloud tenant (for multi-tenant SaaS)';
COMMENT ON COLUMN system_logs.instance_id IS 'Identifier for the cloud instance (if multiple regions/instances)';

-- Security Events Table
CREATE TABLE security_events (
  id BIGSERIAL PRIMARY KEY,
  
  -- Timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Event details
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  description TEXT,
  
  -- Multi-tenant/instance identification
  tenant_id VARCHAR(50) NOT NULL,
  instance_id VARCHAR(50),
  
  -- User/source information
  user_id UUID,
  username VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  
  -- Additional metadata
  metadata JSONB,
  
  -- Alert information
  alert_sent BOOLEAN DEFAULT FALSE,
  alert_channels TEXT[]
);

CREATE INDEX idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX idx_security_events_tenant_id ON security_events(tenant_id);
CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX idx_security_events_tenant_timestamp ON security_events(tenant_id, timestamp DESC);
CREATE INDEX idx_security_events_severity_timestamp ON security_events(severity, timestamp DESC);
CREATE INDEX idx_security_events_metadata ON security_events USING GIN (metadata);

COMMENT ON TABLE security_events IS 'Security events tracked across all cloud instances';
COMMENT ON COLUMN security_events.alert_sent IS 'Whether an alert was sent for this event';

-- Security Alerts Table
CREATE TABLE security_alerts (
  id BIGSERIAL PRIMARY KEY,
  
  -- Timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
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
  delivery_status JSONB,
  
  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  
  -- Metadata
  metadata JSONB
);

CREATE INDEX idx_security_alerts_timestamp ON security_alerts(timestamp DESC);
CREATE INDEX idx_security_alerts_tenant_id ON security_alerts(tenant_id);
CREATE INDEX idx_security_alerts_alert_type ON security_alerts(alert_type);
CREATE INDEX idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_security_alerts_resolved ON security_alerts(resolved);

COMMENT ON TABLE security_alerts IS 'Security alerts generated and sent to administrators';
COMMENT ON COLUMN security_alerts.delivery_status IS 'JSON object tracking delivery status for each channel';

-- Log Retention Function
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- Delete system logs older than 90 days
  DELETE FROM system_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Delete security events older than 1 year (keep longer for compliance)
  DELETE FROM security_events
  WHERE timestamp < NOW() - INTERVAL '1 year'
  AND severity NOT IN ('critical', 'error');
  
  -- Delete resolved alerts older than 6 months
  DELETE FROM security_alerts
  WHERE timestamp < NOW() - INTERVAL '6 months'
  AND resolved = TRUE;
  
  RAISE NOTICE 'Old logs cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

-- Views for Common Queries
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
-- VPS INSTANCES TABLE
-- ============================================================================
CREATE TABLE vps_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- VPS identification
  vps_name VARCHAR(255) NOT NULL UNIQUE,
  vps_ip VARCHAR(50) NOT NULL,
  hostname VARCHAR(255),
  
  -- VPS type
  deployment_type VARCHAR(20) NOT NULL CHECK (deployment_type IN ('shared', 'dedicated')),
  
  -- Dedicated VPS links to one organization
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Location & Provider
  location VARCHAR(100),
  provider VARCHAR(50) DEFAULT 'transip',
  
  -- Specs
  cpu_cores INTEGER,
  memory_mb INTEGER,
  disk_gb INTEGER,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active' 
    CHECK (status IN ('provisioning', 'active', 'maintenance', 'offline', 'decommissioned')),
  
  -- Capacity management (for shared VPS)
  max_tenants INTEGER DEFAULT 20,
  current_tenants INTEGER DEFAULT 0,
  
  -- Resource usage metrics (updated periodically)
  cpu_usage_percent DECIMAL(5,2),
  memory_usage_percent DECIMAL(5,2),
  disk_usage_percent DECIMAL(5,2),
  last_health_check TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vps_deployment_type ON vps_instances(deployment_type);
CREATE INDEX idx_vps_status ON vps_instances(status);
CREATE INDEX idx_vps_organization ON vps_instances(organization_id);

-- Add foreign key to organizations table
ALTER TABLE organizations 
  ADD CONSTRAINT fk_organizations_vps 
  FOREIGN KEY (vps_id) REFERENCES vps_instances(id) ON DELETE SET NULL;

CREATE INDEX idx_organizations_vps ON organizations(vps_id);

-- ============================================================================
-- INSTANCE DEPLOYMENTS TABLE
-- ============================================================================
CREATE TABLE instance_deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Deployment configuration
  deployment_model VARCHAR(20) NOT NULL CHECK (deployment_model IN ('shared', 'dedicated')),
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'provisioning',
  -- Statuses: provisioning, creating_vps, configuring, active, failed, paused, deleted
  
  -- Instance details
  subdomain VARCHAR(100) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  
  -- VPS reference
  vps_id UUID REFERENCES vps_instances(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Error handling
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_deployments_org ON instance_deployments(organization_id);
CREATE INDEX idx_deployments_status ON instance_deployments(status);
CREATE INDEX idx_deployments_vps ON instance_deployments(vps_id);

-- ============================================================================
-- LICENSE MANAGER TABLES
-- ============================================================================

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link to organization (if applicable)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
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
  last_heartbeat TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_customers_organization ON customers(organization_id);
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
  created_by UUID, -- References platform_users(id)
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
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
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
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
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  last_heartbeat TIMESTAMPTZ,
  last_heartbeat_ip VARCHAR(50),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
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
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Error Handling
  errors JSONB DEFAULT '[]',
  
  -- Metadata
  created_by UUID REFERENCES platform_users(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  user_id UUID REFERENCES platform_users(id),
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
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON license_audit_log(user_id);
CREATE INDEX idx_audit_log_action ON license_audit_log(action);
CREATE INDEX idx_audit_log_resource ON license_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_timestamp ON license_audit_log(timestamp DESC);

-- ============================================================================
-- LICENSE MANAGER VIEWS
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant Data Isolation at Database Level
-- ============================================================================

-- Helper function to get current organization from session variable
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get from session variable set by application
  org_id := current_setting('app.current_organization_id', true)::UUID;
  
  -- If not set, return NULL (will deny access in RLS policies)
  RETURN org_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_current_organization_id() IS 
  'Returns the current organization_id from session variable for RLS policies';

-- ================================================================
-- RLS: EMAIL SETTINGS
-- ================================================================

ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_settings_tenant_isolation ON email_settings
  USING (organization_id = get_current_organization_id());

CREATE POLICY email_settings_tenant_isolation_insert ON email_settings
  FOR INSERT
  WITH CHECK (organization_id = get_current_organization_id());

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant all privileges to the database user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
