/**
 * Seed: Features
 * Source: seed-features.sql
 * 
 * Seeds feature catalog for each product:
 * - Nexus features (HR Management)
 * - RecruitIQ features (ATS)
 * - PayLinQ features (Payroll)
 * - ScheduleHub features (Scheduling)
 */

export async function seed(knex) {
  // Get product IDs for reference
  const nexusProduct = await knex('products').where('slug', 'nexus').first();
  const recruitiqProduct = await knex('products').where('slug', 'recruitiq').first();
  const paylinqProduct = await knex('products').where('slug', 'paylinq').first();
  const schedulehubProduct = await knex('products').where('slug', 'schedulehub').first();

  // ============================================================================
  // NEXUS FEATURES (HR Management)
  // ============================================================================
  if (nexusProduct) {
    const nexusId = nexusProduct.id;

    // Core Features (Starter tier)
    await knex('features').insert([
      { product_id: nexusId, feature_key: 'employees', feature_name: 'Employee Management', description: 'Core employee records and profiles', category: 'core', status: 'stable', min_tier: 'starter', is_add_on: false, has_usage_limit: false },
      { product_id: nexusId, feature_key: 'departments', feature_name: 'Department Management', description: 'Organizational structure and departments', category: 'core', status: 'stable', min_tier: 'starter', is_add_on: false, has_usage_limit: false }
    ]).onConflict(['product_id', 'feature_key']).ignore();

    // Professional Features
    await knex('features').insert([
      { product_id: nexusId, feature_key: 'attendance', feature_name: 'Attendance Tracking', description: 'Time and attendance management', category: 'time_management', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false },
      { product_id: nexusId, feature_key: 'leave', feature_name: 'Leave Management', description: 'Leave requests and approvals', category: 'time_management', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false },
      { product_id: nexusId, feature_key: 'documents', feature_name: 'Document Management', description: 'Employee document storage and management', category: 'documents', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false }
    ]).onConflict(['product_id', 'feature_key']).ignore();

    // Enterprise Features
    await knex('features').insert([
      { product_id: nexusId, feature_key: 'performance', feature_name: 'Performance Management', description: 'Performance reviews and goal tracking', category: 'performance', status: 'stable', min_tier: 'enterprise', is_add_on: false, has_usage_limit: false },
      { product_id: nexusId, feature_key: 'benefits', feature_name: 'Benefits Administration', description: 'Employee benefits and compensation management', category: 'compensation', status: 'stable', min_tier: 'enterprise', is_add_on: false, has_usage_limit: false },
      { product_id: nexusId, feature_key: 'contracts', feature_name: 'Contract Management', description: 'Employment contracts and agreements', category: 'legal', status: 'beta', min_tier: 'enterprise', is_add_on: false, has_usage_limit: false }
    ]).onConflict(['product_id', 'feature_key']).ignore();
  }

  // ============================================================================
  // RECRUITIQ FEATURES (ATS)
  // ============================================================================
  if (recruitiqProduct) {
    const recruitiqId = recruitiqProduct.id;

    // Features without usage limits
    await knex('features').insert([
      { product_id: recruitiqId, feature_key: 'applications', feature_name: 'Application Tracking', description: 'Track and manage job applications', category: 'recruitment', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false },
      { product_id: recruitiqId, feature_key: 'interviews', feature_name: 'Interview Scheduling', description: 'Schedule and manage interviews', category: 'recruitment', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false },
      { product_id: recruitiqId, feature_key: 'pipelines', feature_name: 'Pipeline Management', description: 'Custom recruitment pipelines', category: 'recruitment', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false },
      { product_id: recruitiqId, feature_key: 'public_portal', feature_name: 'Public Career Portal', description: 'Public-facing job portal', category: 'recruitment', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false },
      { product_id: recruitiqId, feature_key: 'flow_templates', feature_name: 'Hiring Flow Templates', description: 'Automated hiring workflows', category: 'automation', status: 'stable', min_tier: 'enterprise', is_add_on: false, has_usage_limit: false },
      { product_id: recruitiqId, feature_key: 'analytics', feature_name: 'Recruitment Analytics', description: 'Advanced recruitment analytics and reports', category: 'analytics', status: 'stable', min_tier: 'enterprise', is_add_on: false, has_usage_limit: false }
    ]).onConflict(['product_id', 'feature_key']).ignore();

    // Features with usage limits
    await knex('features').insert([
      { product_id: recruitiqId, feature_key: 'jobs', feature_name: 'Job Posting', description: 'Create and manage job postings', category: 'recruitment', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: true, default_usage_limit: 50, usage_limit_unit: 'active_jobs' },
      { product_id: recruitiqId, feature_key: 'candidates', feature_name: 'Candidate Management', description: 'Manage candidate profiles and applications', category: 'recruitment', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: true, default_usage_limit: 500, usage_limit_unit: 'active_candidates' },
      { product_id: recruitiqId, feature_key: 'communications', feature_name: 'Email Communications', description: 'Send emails to candidates', category: 'communication', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: true, default_usage_limit: 1000, usage_limit_unit: 'emails_per_month' },
      { product_id: recruitiqId, feature_key: 'api_access', feature_name: 'API Access', description: 'Programmatic access to recruitment data', category: 'integration', status: 'beta', min_tier: 'enterprise', is_add_on: false, has_usage_limit: true, default_usage_limit: 10000, usage_limit_unit: 'api_calls_per_month' }
    ]).onConflict(['product_id', 'feature_key']).ignore();
  }

  // ============================================================================
  // PAYLINQ FEATURES (Payroll)
  // ============================================================================
  if (paylinqProduct) {
    const paylinqId = paylinqProduct.id;

    // Core Features (Enterprise only)
    await knex('features').insert([
      { product_id: paylinqId, feature_key: 'basic_payroll', feature_name: 'Basic Payroll Processing', description: 'Core payroll calculation and processing', category: 'payroll', status: 'stable', min_tier: 'enterprise', is_add_on: false, pricing: null, has_usage_limit: false },
      { product_id: paylinqId, feature_key: 'timesheets', feature_name: 'Timesheet Management', description: 'Manage employee timesheets', category: 'time_management', status: 'stable', min_tier: 'enterprise', is_add_on: false, pricing: null, has_usage_limit: false },
      { product_id: paylinqId, feature_key: 'direct_deposit', feature_name: 'Direct Deposit', description: 'Electronic payment processing', category: 'payments', status: 'stable', min_tier: 'enterprise', is_add_on: false, pricing: null, has_usage_limit: false }
    ]).onConflict(['product_id', 'feature_key']).ignore();

    // Advanced Features
    await knex('features').insert([
      { product_id: paylinqId, feature_key: 'multi_currency', feature_name: 'Multi-Currency Support', description: 'Support for multiple currencies in payroll', category: 'payroll', status: 'stable', min_tier: 'enterprise', is_add_on: false, pricing: null, has_usage_limit: false },
      { product_id: paylinqId, feature_key: 'advanced_tax', feature_name: 'Advanced Tax Calculation', description: 'Complex tax calculations and compliance', category: 'tax', status: 'beta', min_tier: 'enterprise', is_add_on: false, pricing: null, has_usage_limit: false },
      { product_id: paylinqId, feature_key: 'custom_pay_components', feature_name: 'Custom Pay Components', description: 'Define custom earnings and deductions', category: 'payroll', status: 'stable', min_tier: 'enterprise', is_add_on: false, pricing: null, has_usage_limit: false }
    ]).onConflict(['product_id', 'feature_key']).ignore();

    // Add-on Features
    await knex('features').insert([
      { product_id: paylinqId, feature_key: 'formula_engine', feature_name: 'Formula Engine', description: 'Advanced formula-based calculations', category: 'calculation', status: 'beta', min_tier: 'enterprise', is_add_on: true, pricing: JSON.stringify({ monthly: 50, annual: 500 }), has_usage_limit: false },
      { product_id: paylinqId, feature_key: 'bank_integration', feature_name: 'Bank Integration', description: 'Direct integration with banking systems', category: 'integration', status: 'alpha', min_tier: 'enterprise', is_add_on: true, pricing: JSON.stringify({ monthly: 100, annual: 1000 }), has_usage_limit: false },
      { product_id: paylinqId, feature_key: 'compliance_reports', feature_name: 'Compliance Reporting', description: 'Automated compliance and audit reports', category: 'reporting', status: 'beta', min_tier: 'enterprise', is_add_on: true, pricing: JSON.stringify({ monthly: 75, annual: 750 }), has_usage_limit: false }
    ]).onConflict(['product_id', 'feature_key']).ignore();
  }

  // ============================================================================
  // SCHEDULEHUB FEATURES (Scheduling)
  // ============================================================================
  if (schedulehubProduct) {
    const schedulehubId = schedulehubProduct.id;

    // Core Features (Professional tier)
    await knex('features').insert([
      { product_id: schedulehubId, feature_key: 'schedules', feature_name: 'Schedule Management', description: 'Create and manage work schedules', category: 'scheduling', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false },
      { product_id: schedulehubId, feature_key: 'shifts', feature_name: 'Shift Planning', description: 'Plan and assign shifts to workers', category: 'scheduling', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false },
      { product_id: schedulehubId, feature_key: 'time_off', feature_name: 'Time Off Requests', description: 'Manage time off requests and approvals', category: 'time_management', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false },
      { product_id: schedulehubId, feature_key: 'workers', feature_name: 'Worker Management', description: 'Manage workforce and worker profiles', category: 'workforce', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false }
    ]).onConflict(['product_id', 'feature_key']).ignore();

    // Advanced Features (Professional+)
    await knex('features').insert([
      { product_id: schedulehubId, feature_key: 'shift_swaps', feature_name: 'Shift Swap Marketplace', description: 'Allow workers to swap shifts', category: 'scheduling', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false },
      { product_id: schedulehubId, feature_key: 'roles', feature_name: 'Role Management', description: 'Define and assign worker roles', category: 'workforce', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false },
      { product_id: schedulehubId, feature_key: 'stations', feature_name: 'Station Management', description: 'Manage work stations and locations', category: 'locations', status: 'stable', min_tier: 'professional', is_add_on: false, has_usage_limit: false }
    ]).onConflict(['product_id', 'feature_key']).ignore();

    // Enterprise Features
    await knex('features').insert([
      { product_id: schedulehubId, feature_key: 'notifications', feature_name: 'Push Notifications', description: 'Real-time shift and schedule notifications', category: 'communication', status: 'beta', min_tier: 'enterprise', is_add_on: false, has_usage_limit: false },
      { product_id: schedulehubId, feature_key: 'reports', feature_name: 'Advanced Reports', description: 'Comprehensive scheduling analytics', category: 'analytics', status: 'stable', min_tier: 'enterprise', is_add_on: false, has_usage_limit: false },
      { product_id: schedulehubId, feature_key: 'integrations', feature_name: 'Third-party Integrations', description: 'Connect with Slack, Teams, etc.', category: 'integration', status: 'beta', min_tier: 'enterprise', is_add_on: false, has_usage_limit: false }
    ]).onConflict(['product_id', 'feature_key']).ignore();
  }

  // ============================================================================
  // SEED SAMPLE FEATURE GRANTS FOR TESTING
  // ============================================================================
  
  // Grant all Nexus core features to existing organizations
  const organizations = await knex('organizations').select('id', 'tier');
  const nexusFeatures = await knex('features')
    .where('product_id', nexusProduct?.id)
    .whereIn('feature_key', ['employees', 'departments']);

  for (const org of organizations) {
    for (const feature of nexusFeatures) {
      await knex('organization_feature_grants').insert({
        organization_id: org.id,
        feature_id: feature.id,
        granted_via: 'tier_included',
        granted_reason: 'Included in core platform',
        is_active: true
      }).onConflict(['organization_id', 'feature_id']).ignore();
    }

    // Grant RecruitIQ features to professional+ organizations
    if (['professional', 'enterprise'].includes(org.tier) && recruitiqProduct) {
      const recruitiqFeatures = await knex('features')
        .where('product_id', recruitiqProduct.id)
        .where('min_tier', 'professional');

      for (const feature of recruitiqFeatures) {
        await knex('organization_feature_grants').insert({
          organization_id: org.id,
          feature_id: feature.id,
          granted_via: 'tier_included',
          granted_reason: 'Included in tier',
          is_active: true
        }).onConflict(['organization_id', 'feature_id']).ignore();
      }
    }
  }

  console.log('[OK] Features seed completed successfully');
}
