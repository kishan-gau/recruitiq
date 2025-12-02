/**
 * Seed: Products
 * Source: seed-products.sql
 * 
 * Seeds core products and their features:
 * - Nexus (HR Management Platform) - Core
 * - RecruitIQ (Recruitment & ATS) - Add-on
 * - ScheduleHub (Workforce Scheduling) - Add-on
 * - PayLinQ (Payroll Management) - Add-on
 * - Portal (Admin Portal) - Core
 */

export async function seed(knex) {
  // ============================================================================
  // SEED PRODUCTS
  // ============================================================================

  // Core Product: Nexus (HR Management Platform)
  await knex('products').insert({
    name: 'nexus',
    display_name: 'Nexus HR',
    description: 'Core HR management platform with employee records, departments, and organizational structure',
    slug: 'nexus',
    version: '1.0.0',
    status: 'active',
    is_core: true,
    requires_license: false, // Nexus is always available
    base_path: '/nexus',
    api_prefix: '/api/nexus',
    min_tier: 'starter',
    features: JSON.stringify(['employees', 'departments', 'attendance', 'leave', 'performance', 'documents', 'benefits', 'contracts']),
    default_features: JSON.stringify(['employees', 'departments']),
    icon: 'building-2',
    color: '#6366f1',
    ui_config: JSON.stringify({ theme: 'indigo', showInNav: true, priority: 1 })
  }).onConflict('slug').ignore();

  // Add-on Product: RecruitIQ (Recruitment & ATS)
  await knex('products').insert({
    name: 'recruitiq',
    display_name: 'RecruitIQ',
    description: 'Applicant Tracking System with job postings, candidate management, and interview scheduling',
    slug: 'recruitiq',
    version: '2.0.0',
    npm_package: '@recruitiq/core',
    repository_url: 'https://github.com/kishan-gau/recruitiq',
    status: 'active',
    is_core: false, // Add-on product
    requires_license: true,
    base_path: '/recruitiq',
    api_prefix: '/api/recruitiq',
    min_tier: 'professional',
    features: JSON.stringify(['jobs', 'candidates', 'applications', 'interviews', 'communications', 'pipelines', 'analytics', 'email_integration']),
    default_features: JSON.stringify(['jobs', 'candidates', 'applications', 'interviews']),
    icon: 'briefcase',
    color: '#10b981',
    ui_config: JSON.stringify({ theme: 'green', showInNav: true, priority: 2 })
  }).onConflict('slug').ignore();

  // Add-on Product: ScheduleHub (Workforce Scheduling)
  await knex('products').insert({
    name: 'schedulehub',
    display_name: 'ScheduleHub',
    description: 'Workforce scheduling and time management with shift planning, time-off requests, and shift swaps',
    slug: 'schedulehub',
    version: '1.0.0',
    npm_package: '@recruitiq/schedulehub',
    repository_url: 'https://github.com/kishan-gau/recruitiq',
    status: 'active',
    is_core: false, // Add-on product
    requires_license: true,
    base_path: '/schedulehub',
    api_prefix: '/api/schedulehub',
    min_tier: 'professional',
    features: JSON.stringify(['schedules', 'shifts', 'time_off', 'shift_swaps', 'workers', 'roles', 'stations', 'notifications', 'reports']),
    default_features: JSON.stringify(['schedules', 'shifts', 'time_off', 'workers']),
    icon: 'calendar',
    color: '#f59e0b',
    ui_config: JSON.stringify({ theme: 'amber', showInNav: true, priority: 3 })
  }).onConflict('slug').ignore();

  // Add-on Product: PayLinQ (Payroll Management)
  await knex('products').insert({
    name: 'paylinq',
    display_name: 'PayLinQ',
    description: 'Comprehensive payroll management with multi-currency support, tax calculations, and payment processing',
    slug: 'paylinq',
    version: '1.0.0',
    npm_package: '@recruitiq/paylinq',
    repository_url: 'https://github.com/kishan-gau/recruitiq',
    status: 'active',
    is_core: false, // Add-on product
    requires_license: true,
    base_path: '/paylinq',
    api_prefix: '/api/paylinq',
    min_tier: 'enterprise', // Enterprise only
    features: JSON.stringify(['payroll', 'payments', 'tax_calc', 'multi_currency', 'deductions', 'bonuses', 'reports', 'bank_integration', 'compliance']),
    default_features: JSON.stringify(['payroll', 'payments']),
    icon: 'dollar-sign',
    color: '#8b5cf6',
    ui_config: JSON.stringify({ theme: 'purple', showInNav: true, priority: 4 })
  }).onConflict('slug').ignore();

  // Admin Portal (Platform Management)
  await knex('products').insert({
    name: 'portal',
    display_name: 'Admin Portal',
    description: 'Platform administration and license management portal',
    slug: 'portal',
    version: '1.0.0',
    status: 'active',
    is_core: true, // Core platform tool
    requires_license: false,
    base_path: '/portal',
    api_prefix: '/api/portal',
    min_tier: 'starter',
    features: JSON.stringify(['license_management', 'customer_management', 'usage_monitoring', 'system_logs', 'security_alerts']),
    default_features: JSON.stringify(['license_management', 'customer_management']),
    icon: 'shield',
    color: '#ef4444',
    ui_config: JSON.stringify({ theme: 'red', showInNav: false, platformOnly: true })
  }).onConflict('slug').ignore();

  // ============================================================================
  // SEED PRODUCT FEATURES (ScheduleHub)
  // ============================================================================
  const schedulehubProduct = await knex('products').where('slug', 'schedulehub').first();
  
  if (schedulehubProduct) {
    const schedulehubId = schedulehubProduct.id;
    
    // Basic Features (Included in all tiers)
    await knex('product_features').insert([
      { product_id: schedulehubId, feature_key: 'schedules', feature_name: 'Schedule Management', description: 'Create and manage work schedules', status: 'stable', is_default: true, min_tier: 'starter', rollout_percentage: 100 },
      { product_id: schedulehubId, feature_key: 'shifts', feature_name: 'Shift Planning', description: 'Plan and assign shifts to workers', status: 'stable', is_default: true, min_tier: 'starter', rollout_percentage: 100 },
      { product_id: schedulehubId, feature_key: 'time_off', feature_name: 'Time Off Requests', description: 'Manage employee time off requests and approvals', status: 'stable', is_default: true, min_tier: 'starter', rollout_percentage: 100 },
      { product_id: schedulehubId, feature_key: 'workers', feature_name: 'Worker Management', description: 'Manage workforce and worker profiles', status: 'stable', is_default: true, min_tier: 'starter', rollout_percentage: 100 }
    ]).onConflict(['product_id', 'feature_key']).ignore();

    // Advanced Features (Professional tier and above)
    await knex('product_features').insert([
      { product_id: schedulehubId, feature_key: 'shift_swaps', feature_name: 'Shift Swap Marketplace', description: 'Allow workers to swap shifts through marketplace', status: 'stable', is_default: false, min_tier: 'professional', rollout_percentage: 100 },
      { product_id: schedulehubId, feature_key: 'roles', feature_name: 'Role Management', description: 'Define and assign worker roles', status: 'stable', is_default: false, min_tier: 'professional', rollout_percentage: 100 },
      { product_id: schedulehubId, feature_key: 'stations', feature_name: 'Station Management', description: 'Manage work stations and locations', status: 'stable', is_default: false, min_tier: 'professional', rollout_percentage: 100 },
      { product_id: schedulehubId, feature_key: 'notifications', feature_name: 'Push Notifications', description: 'Real-time shift and schedule notifications', status: 'beta', is_default: false, min_tier: 'professional', rollout_percentage: 50 }
    ]).onConflict(['product_id', 'feature_key']).ignore();

    // Enterprise Features
    await knex('product_features').insert([
      { product_id: schedulehubId, feature_key: 'reports', feature_name: 'Advanced Reports', description: 'Comprehensive scheduling analytics and reports', status: 'stable', is_default: false, min_tier: 'enterprise', rollout_percentage: 100, config_schema: JSON.stringify({ type: 'object', properties: { exportFormats: { type: 'array', items: { enum: ['pdf', 'excel', 'csv'] } }, customReports: { type: 'boolean' } } }) },
      { product_id: schedulehubId, feature_key: 'api_access', feature_name: 'API Access', description: 'Programmatic access to scheduling data', status: 'stable', is_default: false, min_tier: 'enterprise', rollout_percentage: 100, config_schema: JSON.stringify({ type: 'object', properties: { rateLimit: { type: 'integer', default: 1000 }, webhooks: { type: 'boolean' } } }) },
      { product_id: schedulehubId, feature_key: 'integrations', feature_name: 'Third-party Integrations', description: 'Connect with external systems (Slack, Teams, etc.)', status: 'beta', is_default: false, min_tier: 'enterprise', rollout_percentage: 80, config_schema: JSON.stringify({ type: 'object', properties: { slack: { type: 'boolean' }, teams: { type: 'boolean' }, customWebhooks: { type: 'boolean' } } }) }
    ]).onConflict(['product_id', 'feature_key']).ignore();
  }

  // ============================================================================
  // SEED PRODUCT FEATURES (PayLinQ)
  // ============================================================================
  const paylinqProduct = await knex('products').where('slug', 'paylinq').first();
  
  if (paylinqProduct) {
    const paylinqId = paylinqProduct.id;
    
    // Core Features
    await knex('product_features').insert([
      { product_id: paylinqId, feature_key: 'payroll', feature_name: 'Payroll Processing', description: 'Core payroll calculation and processing', status: 'stable', is_default: true, min_tier: 'enterprise', rollout_percentage: 100 },
      { product_id: paylinqId, feature_key: 'payments', feature_name: 'Payment Management', description: 'Manage and process employee payments', status: 'stable', is_default: true, min_tier: 'enterprise', rollout_percentage: 100 },
      { product_id: paylinqId, feature_key: 'multi_currency', feature_name: 'Multi-Currency Support', description: 'Support for multiple currencies in payroll', status: 'beta', is_default: true, min_tier: 'enterprise', rollout_percentage: 100 },
      { product_id: paylinqId, feature_key: 'tax_calc', feature_name: 'Tax Calculations', description: 'Automated tax calculations and compliance', status: 'beta', is_default: false, min_tier: 'enterprise', rollout_percentage: 80 },
      { product_id: paylinqId, feature_key: 'deductions', feature_name: 'Deductions Management', description: 'Manage payroll deductions and benefits', status: 'beta', is_default: false, min_tier: 'enterprise', rollout_percentage: 100 },
      { product_id: paylinqId, feature_key: 'bank_integration', feature_name: 'Bank Integration', description: 'Direct bank integration for payments', status: 'alpha', is_default: false, min_tier: 'enterprise', rollout_percentage: 30 },
      { product_id: paylinqId, feature_key: 'compliance', feature_name: 'Compliance Reports', description: 'Generate compliance and audit reports', status: 'beta', is_default: false, min_tier: 'enterprise', rollout_percentage: 50 }
    ]).onConflict(['product_id', 'feature_key']).ignore();
  }

  // ============================================================================
  // SEED DEFAULT PRODUCT PERMISSIONS FOR EXISTING ORGANIZATIONS
  // ============================================================================
  
  // Get all organizations and products
  const organizations = await knex('organizations').select('id', 'tier');
  const nexusProduct = await knex('products').where('slug', 'nexus').first();
  const recruitiqProduct = await knex('products').where('slug', 'recruitiq').first();
  
  for (const org of organizations) {
    // Grant Nexus (core product) access to all organizations
    if (nexusProduct) {
      await knex('product_permissions').insert({
        organization_id: org.id,
        product_id: nexusProduct.id,
        is_enabled: true,
        access_level: 'full',
        enabled_features: nexusProduct.default_features,
        granted_at: knex.fn.now()
      }).onConflict(['organization_id', 'product_id']).ignore();
    }

    // Grant RecruitIQ access to professional+ organizations
    if (recruitiqProduct && ['professional', 'enterprise'].includes(org.tier)) {
      await knex('product_permissions').insert({
        organization_id: org.id,
        product_id: recruitiqProduct.id,
        is_enabled: true,
        access_level: 'full',
        enabled_features: recruitiqProduct.default_features,
        granted_at: knex.fn.now()
      }).onConflict(['organization_id', 'product_id']).ignore();
    }

    // Grant ScheduleHub access to professional+ organizations
    if (schedulehubProduct && ['professional', 'enterprise'].includes(org.tier)) {
      await knex('product_permissions').insert({
        organization_id: org.id,
        product_id: schedulehubProduct.id,
        is_enabled: true,
        access_level: 'full',
        enabled_features: schedulehubProduct.default_features,
        granted_at: knex.fn.now()
      }).onConflict(['organization_id', 'product_id']).ignore();
    }

    // Grant PayLinQ access to enterprise organizations only
    if (paylinqProduct && org.tier === 'enterprise') {
      await knex('product_permissions').insert({
        organization_id: org.id,
        product_id: paylinqProduct.id,
        is_enabled: true,
        access_level: 'full',
        enabled_features: paylinqProduct.default_features,
        granted_at: knex.fn.now()
      }).onConflict(['organization_id', 'product_id']).ignore();
    }
  }

  console.log('[OK] Products seed completed successfully');
}
