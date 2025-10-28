-- Seed database with sample data for testing

-- Sample customers with different tiers and deployment types
DO $$
DECLARE
  customer_id UUID;
  instance_id UUID;
  license_key TEXT;
  starter_preset_id UUID;
  professional_preset_id UUID;
  enterprise_preset_id UUID;
BEGIN
  -- Get tier preset IDs
  SELECT id INTO starter_preset_id FROM tier_presets WHERE tier_name = 'starter' AND is_active = true LIMIT 1;
  SELECT id INTO professional_preset_id FROM tier_presets WHERE tier_name = 'professional' AND is_active = true LIMIT 1;
  SELECT id INTO enterprise_preset_id FROM tier_presets WHERE tier_name = 'enterprise' AND is_active = true LIMIT 1;

  -- 1. Acme Corp (Enterprise, Cloud Dedicated)
  INSERT INTO customers (
    name, contact_email, contact_name, deployment_type,
    contract_start_date, contract_end_date, billing_cycle, status
  ) VALUES (
    'Acme Corporation',
    'admin@acmecorp.com',
    'Sarah Johnson',
    'cloud-dedicated',
    NOW() - INTERVAL '3 months',
    NOW() + INTERVAL '9 months',
    'annual',
    'active'
  ) RETURNING id INTO customer_id;

  INSERT INTO instances (
    customer_id, instance_key, instance_url, app_version, status
  ) VALUES (
    customer_id,
    'acme-corp-prod',
    'https://acme.recruitiq.app',
    '2.1.0',
    'active'
  ) RETURNING id INTO instance_id;

  INSERT INTO licenses (
    customer_id, instance_id, license_key, tier,
    tier_preset_id, tier_version, auto_upgrade,
    max_users, max_workspaces, max_jobs, max_candidates,
    features, expires_at, status
  ) VALUES (
    customer_id,
    instance_id,
    'LIC-ENT-ACME-' || EXTRACT(EPOCH FROM NOW())::bigint,
    'enterprise',
    enterprise_preset_id, 1, true,
    NULL, NULL, NULL, NULL,
    '["analytics", "api_access", "sso", "saml", "white_label", "dedicated_support", "custom_integrations", "advanced_workflows"]'::jsonb,
    NOW() + INTERVAL '9 months',
    'active'
  );

  -- Add usage data
  INSERT INTO usage_events (
    customer_id, instance_id, event_type,
    user_count, workspace_count, job_count, candidate_count,
    timestamp
  ) VALUES
    (customer_id, instance_id, 'heartbeat', 45, 8, 230, 4500, NOW() - INTERVAL '1 hour'),
    (customer_id, instance_id, 'job_created', 45, 8, 231, 4500, NOW() - INTERVAL '2 hours'),
    (customer_id, instance_id, 'candidate_added', 45, 8, 231, 4501, NOW() - INTERVAL '3 hours');

  -- 2. TechStart Inc (Professional, Cloud Shared)
  INSERT INTO customers (
    name, contact_email, contact_name, deployment_type,
    contract_start_date, contract_end_date, billing_cycle, status
  ) VALUES (
    'TechStart Inc',
    'hr@techstart.io',
    'Mike Chen',
    'cloud-shared',
    NOW() - INTERVAL '6 months',
    NOW() + INTERVAL '6 months',
    'annual',
    'active'
  ) RETURNING id INTO customer_id;

  INSERT INTO instances (
    customer_id, instance_key, instance_url, app_version, status
  ) VALUES (
    customer_id,
    'techstart-prod',
    'https://techstart.recruitiq.app',
    '2.0.5',
    'active'
  ) RETURNING id INTO instance_id;

  INSERT INTO licenses (
    customer_id, instance_id, license_key, tier,
    tier_preset_id, tier_version, auto_upgrade,
    max_users, max_workspaces, max_jobs, max_candidates,
    features, expires_at, status
  ) VALUES (
    customer_id,
    instance_id,
    'LIC-PRO-TECH-' || EXTRACT(EPOCH FROM NOW())::bigint,
    'professional',
    professional_preset_id, 1, true,
    50, 5, NULL, 5000,
    '["analytics", "api_access", "priority_support", "email_notifications", "slack_integration"]'::jsonb,
    NOW() + INTERVAL '6 months',
    'active'
  );

  INSERT INTO usage_events (
    customer_id, instance_id, event_type,
    user_count, workspace_count, job_count, candidate_count,
    timestamp
  ) VALUES
    (customer_id, instance_id, 'heartbeat', 18, 3, 85, 1200, NOW() - INTERVAL '30 minutes');

  -- 3. Global Industries (Enterprise, On-Premise)
  INSERT INTO customers (
    name, contact_email, contact_name, deployment_type,
    contract_start_date, contract_end_date, billing_cycle, status
  ) VALUES (
    'Global Industries Ltd',
    'it@globalind.com',
    'Robert Smith',
    'on-premise',
    NOW() - INTERVAL '1 month',
    NOW() + INTERVAL '11 months',
    'annual',
    'active'
  ) RETURNING id INTO customer_id;

  INSERT INTO instances (
    customer_id, instance_key, instance_url, 
    database_host, database_name, app_version, status
  ) VALUES (
    customer_id,
    'global-onprem',
    'https://recruit.globalind.com',
    'db-internal.globalind.com',
    'recruitiq_prod',
    '2.1.0',
    'active'
  ) RETURNING id INTO instance_id;

  INSERT INTO licenses (
    customer_id, instance_id, license_key, tier,
    tier_preset_id, tier_version, auto_upgrade,
    max_users, max_workspaces, max_jobs, max_candidates,
    features, expires_at, status
  ) VALUES (
    customer_id,
    instance_id,
    'LIC-ENT-GLOBAL-' || EXTRACT(EPOCH FROM NOW())::bigint,
    'enterprise',
    enterprise_preset_id, 1, false,
    NULL, NULL, NULL, NULL,
    '["analytics", "api_access", "sso", "saml", "white_label", "dedicated_support", "custom_integrations", "advanced_workflows", "ldap_integration"]'::jsonb,
    NOW() + INTERVAL '11 months',
    'active'
  );

  -- 4. StartupXYZ (Starter, Cloud Shared) - Expiring soon
  INSERT INTO customers (
    name, contact_email, contact_name, deployment_type,
    contract_start_date, contract_end_date, billing_cycle, status
  ) VALUES (
    'StartupXYZ',
    'founder@startupxyz.com',
    'Emily Davis',
    'cloud-shared',
    NOW() - INTERVAL '11 months',
    NOW() + INTERVAL '1 month',
    'annual',
    'active'
  ) RETURNING id INTO customer_id;

  INSERT INTO instances (
    customer_id, instance_key, instance_url, app_version, status
  ) VALUES (
    customer_id,
    'startupxyz-prod',
    'https://startupxyz.recruitiq.app',
    '2.0.3',
    'active'
  ) RETURNING id INTO instance_id;

  INSERT INTO licenses (
    customer_id, instance_id, license_key, tier,
    tier_preset_id, tier_version, auto_upgrade,
    max_users, max_workspaces, max_jobs, max_candidates,
    features, expires_at, status
  ) VALUES (
    customer_id,
    instance_id,
    'LIC-START-XYZ-' || EXTRACT(EPOCH FROM NOW())::bigint,
    'starter',
    starter_preset_id, 1, true,
    10, 1, 50, 500,
    '["basic_support", "email_notifications"]'::jsonb,
    NOW() + INTERVAL '1 month',
    'active'
  );

  -- 5. Suspended Customer
  INSERT INTO customers (
    name, contact_email, contact_name, deployment_type,
    contract_start_date, contract_end_date, billing_cycle, status
  ) VALUES (
    'Overdue Corp',
    'billing@overduecorp.com',
    'Tom Wilson',
    'cloud-shared',
    NOW() - INTERVAL '8 months',
    NOW() + INTERVAL '4 months',
    'annual',
    'suspended'
  ) RETURNING id INTO customer_id;

  INSERT INTO instances (
    customer_id, instance_key, instance_url, status
  ) VALUES (
    customer_id,
    'overdue-prod',
    'https://overdue.recruitiq.app',
    'suspended'
  ) RETURNING id INTO instance_id;

  INSERT INTO licenses (
    customer_id, instance_id, license_key, tier,
    tier_preset_id, tier_version, auto_upgrade,
    max_users, max_workspaces, max_jobs, max_candidates,
    features, expires_at, status
  ) VALUES (
    customer_id,
    instance_id,
    'LIC-PRO-OVERDUE-' || EXTRACT(EPOCH FROM NOW())::bigint,
    'professional',
    professional_preset_id, 1, true,
    50, 5, NULL, 5000,
    '["analytics", "api_access", "priority_support", "email_notifications", "slack_integration"]'::jsonb,
    NOW() + INTERVAL '4 months',
    'suspended'
  );

  RAISE NOTICE 'Sample data seeded successfully!';
  RAISE NOTICE '   - 5 customers created (4 active, 1 suspended)';
  RAISE NOTICE '   - Multiple deployment types represented';
  RAISE NOTICE '   - Expiring licenses included for testing';
END $$;

-- Display summary
SELECT 
  'Seed data loaded!' as status,
  COUNT(*) as total_customers
FROM customers;

SELECT 
  tier,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE status = 'active') as active
FROM licenses
GROUP BY tier
ORDER BY tier;
