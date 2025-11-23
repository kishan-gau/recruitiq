-- ============================================================================
-- Migration: Add Foreign Worker Compliance Features
-- Date: 2025-11-23
-- Description: Adds tables and fields to support compliance tracking for
--              foreign workers, contractors, and offshore workers in 
--              multinational companies (e.g., Total Energies Suriname)
-- ============================================================================

-- ================================================================
-- WORK PERMIT TRACKING
-- ================================================================

-- Work permits for foreign workers
CREATE TABLE IF NOT EXISTS payroll.work_permit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.user_account(id),
  
  -- Permit details
  permit_number VARCHAR(100) NOT NULL,
  permit_type VARCHAR(50) NOT NULL, -- 'work_permit', 'residence_permit', 'combined'
  issuing_country VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2 country code
  issuing_authority VARCHAR(200),
  
  -- Validity period
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  renewal_date DATE, -- Date when permit was last renewed
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'revoked', 'pending_renewal')),
  
  -- Additional details
  restrictions TEXT, -- Any restrictions on the permit
  sponsor VARCHAR(200), -- Company or entity sponsoring the permit
  notes TEXT,
  
  -- Document storage
  document_url VARCHAR(500), -- URL to stored permit document
  
  -- Alerts
  alert_days_before_expiry INTEGER DEFAULT 90, -- Days before expiry to send alert
  last_alert_sent_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(organization_id, employee_id, permit_number),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.user_account(id)
);

CREATE INDEX IF NOT EXISTS idx_work_permit_employee ON payroll.work_permit(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_permit_organization ON payroll.work_permit(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_permit_expiry ON payroll.work_permit(expiry_date) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_work_permit_status ON payroll.work_permit(status) WHERE deleted_at IS NULL;

COMMENT ON TABLE payroll.work_permit IS 'Work permits and residence permits for foreign workers';

-- ================================================================
-- VISA STATUS TRACKING
-- ================================================================

-- Visa status for foreign workers
CREATE TABLE IF NOT EXISTS payroll.visa_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.user_account(id),
  
  -- Visa details
  visa_number VARCHAR(100) NOT NULL,
  visa_type VARCHAR(50) NOT NULL, -- 'work_visa', 'business_visa', 'dependent_visa'
  issuing_country VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2 country code
  destination_country VARCHAR(2) NOT NULL, -- Country where visa is valid
  
  -- Validity period
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  entry_date DATE, -- Date of entry into destination country
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  
  -- Entry restrictions
  max_stay_days INTEGER, -- Maximum days allowed in country
  entries_allowed VARCHAR(20), -- 'single', 'multiple'
  
  -- Additional details
  notes TEXT,
  document_url VARCHAR(500),
  
  -- Alerts
  alert_days_before_expiry INTEGER DEFAULT 60,
  last_alert_sent_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(organization_id, employee_id, visa_number),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.user_account(id)
);

CREATE INDEX IF NOT EXISTS idx_visa_status_employee ON payroll.visa_status(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visa_status_organization ON payroll.visa_status(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visa_status_expiry ON payroll.visa_status(expiry_date) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_visa_status_status ON payroll.visa_status(status) WHERE deleted_at IS NULL;

COMMENT ON TABLE payroll.visa_status IS 'Visa status tracking for foreign workers';

-- ================================================================
-- TAX RESIDENCY CONFIGURATION
-- ================================================================

-- Tax residency for employees (determines tax treatment)
CREATE TABLE IF NOT EXISTS payroll.tax_residency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.user_account(id),
  
  -- Residency details
  country VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2 country code
  tax_identification_number VARCHAR(100), -- TIN/SSN/Tax ID
  residency_type VARCHAR(50) NOT NULL, -- 'resident', 'non_resident', 'dual_resident'
  
  -- Validity period
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_current BOOLEAN DEFAULT true,
  
  -- Tax treaty considerations
  treaty_country VARCHAR(2), -- Country with which tax treaty exists
  treaty_article VARCHAR(50), -- Applicable treaty article
  withholding_rate NUMERIC(5, 2), -- Custom withholding rate if applicable
  
  -- Additional details
  days_in_country INTEGER, -- Days present in country (for 183-day rule)
  permanent_establishment BOOLEAN DEFAULT false, -- Has permanent home in country
  center_of_vital_interests BOOLEAN DEFAULT false, -- Main economic ties in country
  notes TEXT,
  
  -- Document storage
  certificate_url VARCHAR(500), -- Tax residency certificate
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.user_account(id)
);

CREATE INDEX IF NOT EXISTS idx_tax_residency_employee ON payroll.tax_residency(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tax_residency_organization ON payroll.tax_residency(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tax_residency_current ON payroll.tax_residency(employee_id, is_current) WHERE deleted_at IS NULL;

COMMENT ON TABLE payroll.tax_residency IS 'Tax residency status for employees across jurisdictions';

-- ================================================================
-- ENHANCE WORKER TYPE TEMPLATE WITH COMPLIANCE FIELDS
-- ================================================================

-- Add compliance-related fields to worker_type_template
ALTER TABLE payroll.worker_type_template 
  ADD COLUMN IF NOT EXISTS requires_work_permit BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_visa_tracking BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_tax_residency BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_contractor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_offshore_worker BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS compliance_category VARCHAR(50);

COMMENT ON COLUMN payroll.worker_type_template.requires_work_permit IS 'Whether this worker type requires work permit tracking';
COMMENT ON COLUMN payroll.worker_type_template.requires_visa_tracking IS 'Whether this worker type requires visa status tracking';
COMMENT ON COLUMN payroll.worker_type_template.requires_tax_residency IS 'Whether this worker type requires tax residency configuration';
COMMENT ON COLUMN payroll.worker_type_template.is_contractor IS 'Whether this is a contractor/consultant worker type';
COMMENT ON COLUMN payroll.worker_type_template.is_offshore_worker IS 'Whether this is an offshore/oil platform worker type';
COMMENT ON COLUMN payroll.worker_type_template.compliance_category IS 'Compliance category: local, foreign, contractor, offshore';

-- ================================================================
-- COMPLIANCE AUDIT LOG
-- ================================================================

-- Audit log for compliance-related events
CREATE TABLE IF NOT EXISTS payroll.compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES hris.user_account(id),
  
  -- Event details
  event_type VARCHAR(100) NOT NULL, -- 'permit_expiring', 'visa_expired', 'permit_renewed', etc.
  event_category VARCHAR(50) NOT NULL, -- 'work_permit', 'visa', 'tax_residency', 'alert'
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- Event data
  description TEXT NOT NULL,
  event_data JSONB, -- Additional structured data about the event
  
  -- Related records
  work_permit_id UUID REFERENCES payroll.work_permit(id),
  visa_status_id UUID REFERENCES payroll.visa_status(id),
  tax_residency_id UUID REFERENCES payroll.tax_residency(id),
  
  -- Action taken
  action_taken TEXT,
  action_taken_by UUID REFERENCES hris.user_account(id),
  action_taken_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES hris.user_account(id),
  resolution_notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_employee ON payroll.compliance_audit_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_organization ON payroll.compliance_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_event_type ON payroll.compliance_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_status ON payroll.compliance_audit_log(status);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_severity ON payroll.compliance_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_created ON payroll.compliance_audit_log(created_at DESC);

COMMENT ON TABLE payroll.compliance_audit_log IS 'Audit trail for compliance-related events and alerts';

-- ================================================================
-- VIEWS FOR COMPLIANCE MONITORING
-- ================================================================

-- View for expiring work permits (next 90 days)
CREATE OR REPLACE VIEW payroll.expiring_work_permits AS
SELECT 
  wp.id,
  wp.organization_id,
  wp.employee_id,
  wp.permit_number,
  wp.permit_type,
  wp.expiry_date,
  wp.status,
  (wp.expiry_date - CURRENT_DATE) as days_until_expiry,
  e.first_name,
  e.last_name,
  e.email
FROM payroll.work_permit wp
JOIN hris.user_account e ON wp.employee_id = e.id
WHERE wp.deleted_at IS NULL
  AND wp.status = 'active'
  AND wp.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
  AND wp.expiry_date >= CURRENT_DATE
ORDER BY wp.expiry_date ASC;

COMMENT ON VIEW payroll.expiring_work_permits IS 'Work permits expiring within next 90 days';

-- View for expired work permits
CREATE OR REPLACE VIEW payroll.expired_work_permits AS
SELECT 
  wp.id,
  wp.organization_id,
  wp.employee_id,
  wp.permit_number,
  wp.permit_type,
  wp.expiry_date,
  (CURRENT_DATE - wp.expiry_date) as days_since_expiry,
  e.first_name,
  e.last_name,
  e.email
FROM payroll.work_permit wp
JOIN hris.user_account e ON wp.employee_id = e.id
WHERE wp.deleted_at IS NULL
  AND wp.status = 'active'
  AND wp.expiry_date < CURRENT_DATE
ORDER BY wp.expiry_date DESC;

COMMENT ON VIEW payroll.expired_work_permits IS 'Work permits that have expired';

-- View for expiring visas (next 60 days)
CREATE OR REPLACE VIEW payroll.expiring_visas AS
SELECT 
  vs.id,
  vs.organization_id,
  vs.employee_id,
  vs.visa_number,
  vs.visa_type,
  vs.expiry_date,
  vs.destination_country,
  (vs.expiry_date - CURRENT_DATE) as days_until_expiry,
  e.first_name,
  e.last_name,
  e.email
FROM payroll.visa_status vs
JOIN hris.user_account e ON vs.employee_id = e.id
WHERE vs.deleted_at IS NULL
  AND vs.status = 'active'
  AND vs.expiry_date <= CURRENT_DATE + INTERVAL '60 days'
  AND vs.expiry_date >= CURRENT_DATE
ORDER BY vs.expiry_date ASC;

COMMENT ON VIEW payroll.expiring_visas IS 'Visas expiring within next 60 days';

-- View for compliance summary by organization
CREATE OR REPLACE VIEW payroll.compliance_summary AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  COUNT(DISTINCT wp.employee_id) as employees_with_work_permits,
  COUNT(DISTINCT vs.employee_id) as employees_with_visas,
  COUNT(DISTINCT tr.employee_id) as employees_with_tax_residency,
  COUNT(DISTINCT CASE WHEN wp.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN wp.id END) as permits_expiring_soon,
  COUNT(DISTINCT CASE WHEN wp.expiry_date < CURRENT_DATE THEN wp.id END) as permits_expired,
  COUNT(DISTINCT CASE WHEN vs.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN vs.id END) as visas_expiring_soon,
  COUNT(DISTINCT CASE WHEN vs.expiry_date < CURRENT_DATE THEN vs.id END) as visas_expired
FROM organizations o
LEFT JOIN payroll.work_permit wp ON o.id = wp.organization_id AND wp.deleted_at IS NULL
LEFT JOIN payroll.visa_status vs ON o.id = vs.organization_id AND vs.deleted_at IS NULL
LEFT JOIN payroll.tax_residency tr ON o.id = tr.organization_id AND tr.deleted_at IS NULL
GROUP BY o.id, o.name;

COMMENT ON VIEW payroll.compliance_summary IS 'Compliance metrics summary by organization';

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

-- Grant permissions on new tables (assuming payroll schema already has proper permissions)
-- These would be set according to your RBAC setup

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE '[OK] Foreign worker compliance migration completed successfully';
  RAISE NOTICE '[INFO] Added tables: work_permit, visa_status, tax_residency, compliance_audit_log';
  RAISE NOTICE '[INFO] Enhanced worker_type_template with compliance fields';
  RAISE NOTICE '[INFO] Created compliance monitoring views';
END $$;
