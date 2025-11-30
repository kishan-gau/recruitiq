/**
 * Development Seed: Organizations
 * Creates test organizations for development
 * 
 * Schema Reference: 20251128000001_create_core_tables.js
 */

export async function seed(knex) {
  console.log('🏢 Seeding organizations...');

  // Delete existing entries
  await knex('organizations').del();

  // Insert test organizations
  await knex('organizations').insert([
    {
      id: '9ee50aee-76c3-46ce-87ed-005c6dd893ef',
      name: 'Test Organization',
      slug: 'test-org',
      description: 'Test organization for development and testing',
      
      // Subscription & Billing
      tier: 'enterprise',
      subscription_status: 'active',
      subscription_start_date: knex.fn.now(),
      subscription_end_date: knex.raw("NOW() + INTERVAL '1 year'"),
      trial_days_remaining: 0,
      
      // Deployment Configuration
      deployment_model: 'shared',
      deployment_config: JSON.stringify({ region: 'us-east-1' }),
      
      // Contact Information
      primary_contact_name: 'Admin User',
      primary_contact_email: 'admin@testorg.com',
      primary_contact_phone: '+1-555-0100',
      address: '123 Test Street',
      city: 'Test City',
      state: 'TC',
      country: 'United States',
      postal_code: '12345',
      
      // Feature Flags (array of feature codes)
      enabled_features: JSON.stringify([
        'multi_product_access',
        'sso',
        'api_access',
        'advanced_reporting',
        'job_posting',
        'candidate_management',
        'interview_scheduling',
        'payroll_processing',
        'tax_calculation',
        'multi_currency',
        'employee_records',
        'time_off_management',
        'performance_reviews',
        'shift_scheduling',
        'time_tracking'
      ]),
      
      // Feature Limits (enterprise tier limits)
      feature_limits: JSON.stringify({
        max_users: 50,
        max_jobs: 100,
        max_candidates: 1000,
        max_employees: 100,
        max_payroll_runs_per_month: 12,
        storage_gb: 100,
        api_calls_per_day: 10000
      }),
      
      // Session Management
      session_policy: 'multiple',
      max_sessions_per_user: 5,
      concurrent_login_detection: false,
      
      // MFA Configuration
      mfa_required: false,
      
      // Usage Tracking
      user_count: 2,
      active_user_count: 2,
      usage_stats: JSON.stringify({
        last_activity: new Date().toISOString(),
        total_logins: 0
      }),
      
      // Settings
      settings: JSON.stringify({
        timezone: 'America/New_York',
        date_format: 'MM/DD/YYYY',
        time_format: '12h',
        currency: 'USD'
      }),
      
      // Audit Fields
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: '8dd50aee-76c3-46ce-87ed-005c6dd893ef',
      name: 'Demo Company',
      slug: 'demo-company',
      description: 'Demo organization for showcasing features',
      
      // Subscription & Billing
      tier: 'professional',
      subscription_status: 'trial',
      trial_start_date: knex.fn.now(),
      trial_end_date: knex.raw("NOW() + INTERVAL '30 days'"),
      trial_days_remaining: 30,
      
      // Deployment Configuration
      deployment_model: 'shared',
      deployment_config: JSON.stringify({ region: 'us-east-1' }),
      
      // Contact Information
      primary_contact_name: 'Demo Admin',
      primary_contact_email: 'admin@democompany.com',
      primary_contact_phone: '+1-555-0200',
      address: '456 Demo Avenue',
      city: 'Demo City',
      state: 'DC',
      country: 'United States',
      postal_code: '67890',
      
      // Feature Flags (limited to professional tier)
      enabled_features: JSON.stringify([
        'multi_product_access',
        'sso',
        'job_posting',
        'candidate_management',
        'payroll_processing',
        'tax_calculation',
        'employee_records'
      ]),
      
      // Feature Limits (professional tier limits)
      feature_limits: JSON.stringify({
        max_users: 20,
        max_jobs: 50,
        max_candidates: 500,
        max_employees: 50,
        max_payroll_runs_per_month: 12,
        storage_gb: 25,
        api_calls_per_day: 1000
      }),
      
      // Session Management
      session_policy: 'multiple',
      max_sessions_per_user: 3,
      concurrent_login_detection: false,
      
      // MFA Configuration
      mfa_required: false,
      
      // Usage Tracking
      user_count: 1,
      active_user_count: 1,
      usage_stats: JSON.stringify({
        last_activity: new Date().toISOString(),
        total_logins: 0
      }),
      
      // Settings
      settings: JSON.stringify({
        timezone: 'America/New_York',
        date_format: 'MM/DD/YYYY',
        time_format: '12h',
        currency: 'USD'
      }),
      
      // Audit Fields
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: '7cc50aee-76c3-46ce-87ed-005c6dd893ef',
      name: 'Test Company Ltd',
      slug: 'test-company',
      description: 'Test organization with tenant admin user for development',
      
      // Subscription & Billing
      tier: 'enterprise',
      subscription_status: 'active',
      subscription_start_date: knex.fn.now(),
      subscription_end_date: knex.raw("NOW() + INTERVAL '1 year'"),
      trial_days_remaining: 0,
      
      // Deployment Configuration
      deployment_model: 'shared',
      deployment_config: JSON.stringify({ region: 'us-east-1' }),
      
      // Contact Information
      primary_contact_name: 'Tenant Administrator',
      primary_contact_email: 'tenant@testcompany.com',
      primary_contact_phone: '+1-555-0300',
      address: '789 Tenant Boulevard',
      city: 'Test City',
      state: 'TC',
      country: 'United States',
      postal_code: '54321',
      
      // Feature Flags (full enterprise features)
      enabled_features: JSON.stringify([
        'multi_product_access',
        'sso',
        'api_access',
        'advanced_reporting',
        'job_posting',
        'candidate_management',
        'interview_scheduling',
        'payroll_processing',
        'tax_calculation',
        'multi_currency',
        'employee_records',
        'time_off_management',
        'performance_reviews',
        'shift_scheduling',
        'time_tracking',
        'rbac_management',
        'audit_logs'
      ]),
      
      // Feature Limits (enterprise tier limits)
      feature_limits: JSON.stringify({
        max_users: 100,
        max_jobs: 200,
        max_candidates: 2000,
        max_employees: 200,
        max_payroll_runs_per_month: 12,
        storage_gb: 200,
        api_calls_per_day: 20000
      }),
      
      // Session Management
      session_policy: 'multiple',
      max_sessions_per_user: 5,
      concurrent_login_detection: false,
      
      // MFA Configuration
      mfa_required: false,
      
      // Usage Tracking
      user_count: 3,
      active_user_count: 3,
      usage_stats: JSON.stringify({
        last_activity: new Date().toISOString(),
        total_logins: 0
      }),
      
      // Settings
      settings: JSON.stringify({
        timezone: 'America/New_York',
        date_format: 'MM/DD/YYYY',
        time_format: '12h',
        currency: 'SRD'
      }),
      
      // Audit Fields
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);

  const count = await knex('organizations').count('* as count').first();
  console.log(`✅ ${count.count} organizations seeded`);
}
