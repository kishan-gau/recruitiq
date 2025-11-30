/**
 * Seed Features for All Products
 * Populates the features table with initial features for each product
 * Run this AFTER products have been seeded
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  console.log('\n================================================================');
  console.log('[INFO] Seeding product features...');
  console.log('================================================================\n');

  // Get product IDs
  const products = await knex('public.products')
    .select('id', 'slug')
    .whereIn('slug', ['nexus', 'recruitiq', 'paylinq', 'schedulehub']);

  const productMap = {};
  products.forEach(p => { productMap[p.slug] = p.id; });

  // Verify all products exist
  const requiredProducts = ['nexus', 'recruitiq', 'paylinq', 'schedulehub'];
  for (const slug of requiredProducts) {
    if (!productMap[slug]) {
      console.log(`[ERROR] Product '${slug}' not found - please run product seeds first`);
      return;
    }
  }

  // ============================================================================
  // NEXUS FEATURES (HR Management)
  // ============================================================================
  
  const nexusFeatures = [
    // Core Features (Starter tier)
    {
      product_id: productMap.nexus,
      code: 'employees',
      name: 'Employee Management',
      description: 'Core employee records and profiles',
      category: 'core',
      tier_required: 'starter',
      is_core: true
    },
    {
      product_id: productMap.nexus,
      code: 'departments',
      name: 'Department Management',
      description: 'Organizational structure and departments',
      category: 'core',
      tier_required: 'starter',
      },
    // Professional Features
    {
      product_id: productMap.nexus,
      code: 'attendance',
      name: 'Attendance Tracking',
      description: 'Time and attendance management',
      category: 'time_management',
      tier_required: 'professional',
      },
    {
      product_id: productMap.nexus,
      code: 'leave',
      name: 'Leave Management',
      description: 'Leave requests and approvals',
      category: 'time_management',
      tier_required: 'professional',
      },
    {
      product_id: productMap.nexus,
      code: 'documents',
      name: 'Document Management',
      description: 'Employee document storage and management',
      category: 'documents',
      tier_required: 'professional',
      },
    // Enterprise Features
    {
      product_id: productMap.nexus,
      code: 'performance',
      name: 'Performance Management',
      description: 'Performance reviews and goal tracking',
      category: 'performance',
      tier_required: 'enterprise',
      },
    {
      product_id: productMap.nexus,
      code: 'benefits',
      name: 'Benefits Administration',
      description: 'Employee benefits and compensation management',
      category: 'compensation',
      tier_required: 'enterprise',
      },
    {
      product_id: productMap.nexus,
      code: 'contracts',
      name: 'Contract Management',
      description: 'Employment contracts and agreements',
      category: 'legal',
      tier_required: 'enterprise',
      }
  ];

  // ============================================================================
  // RECRUITIQ FEATURES (ATS)
  // ============================================================================
  
  const recruitiqFeatures = [
    // Features without usage limits
    {
      product_id: productMap.recruitiq,
      code: 'applications',
      name: 'Application Tracking',
      description: 'Track and manage job applications',
      category: 'recruitment',
      tier_required: 'professional',
      },
    {
      product_id: productMap.recruitiq,
      code: 'interviews',
      name: 'Interview Scheduling',
      description: 'Schedule and manage interviews',
      category: 'recruitment',
      tier_required: 'professional',
      },
    {
      product_id: productMap.recruitiq,
      code: 'pipelines',
      name: 'Pipeline Management',
      description: 'Custom recruitment pipelines',
      category: 'recruitment',
      tier_required: 'professional',
      },
    {
      product_id: productMap.recruitiq,
      code: 'public_portal',
      name: 'Public Career Portal',
      description: 'Public-facing job portal',
      category: 'recruitment',
      tier_required: 'professional',
      },
    {
      product_id: productMap.recruitiq,
      code: 'flow_templates',
      name: 'Hiring Flow Templates',
      description: 'Automated hiring workflows',
      category: 'automation',
      tier_required: 'enterprise',
      },
    {
      product_id: productMap.recruitiq,
      code: 'analytics',
      name: 'Recruitment Analytics',
      description: 'Advanced recruitment analytics and reports',
      category: 'analytics',
      tier_required: 'enterprise',
      },
    // Features with usage limits
    {
      product_id: productMap.recruitiq,
      code: 'jobs',
      name: 'Job Posting',
      description: 'Create and manage job postings',
      category: 'recruitment',
      tier_required: 'professional',
      },
    {
      product_id: productMap.recruitiq,
      code: 'candidates',
      name: 'Candidate Management',
      description: 'Manage candidate profiles and applications',
      category: 'recruitment',
      tier_required: 'professional',
      },
    {
      product_id: productMap.recruitiq,
      code: 'communications',
      name: 'Email Communications',
      description: 'Send emails to candidates',
      category: 'communication',
      tier_required: 'professional',
      },
    {
      product_id: productMap.recruitiq,
      code: 'api_access',
      name: 'API Access',
      description: 'Programmatic access to recruitment data',
      category: 'integration',
      tier_required: 'enterprise',
      }
  ];

  // ============================================================================
  // PAYLINQ FEATURES (Payroll)
  // ============================================================================
  
  const paylinqFeatures = [
    // Core Features (Enterprise only)
    {
      product_id: productMap.paylinq,
      code: 'basic_payroll',
      name: 'Basic Payroll Processing',
      description: 'Core payroll calculation and processing',
      category: 'payroll',
      tier_required: 'enterprise',
      },
    {
      product_id: productMap.paylinq,
      code: 'timesheets',
      name: 'Timesheet Management',
      description: 'Manage employee timesheets',
      category: 'time_management',
      tier_required: 'enterprise',
      },
    {
      product_id: productMap.paylinq,
      code: 'direct_deposit',
      name: 'Direct Deposit',
      description: 'Electronic payment processing',
      category: 'payments',
      tier_required: 'enterprise',
      },
    // Advanced Features
    {
      product_id: productMap.paylinq,
      code: 'multi_currency',
      name: 'Multi-Currency Support',
      description: 'Support for multiple currencies in payroll',
      category: 'payroll',
      tier_required: 'enterprise',
      },
    {
      product_id: productMap.paylinq,
      code: 'advanced_tax',
      name: 'Advanced Tax Calculation',
      description: 'Complex tax calculations and compliance',
      category: 'tax',
      tier_required: 'enterprise',
      },
    {
      product_id: productMap.paylinq,
      code: 'custom_pay_components',
      name: 'Custom Pay Components',
      description: 'Define custom earnings and deductions',
      category: 'payroll',
      tier_required: 'enterprise',
      },
    // Add-on Features
    {
      product_id: productMap.paylinq,
      code: 'formula_engine',
      name: 'Formula Engine',
      description: 'Advanced formula-based calculations',
      category: 'calculation',
      tier_required: 'enterprise',
      },
    {
      product_id: productMap.paylinq,
      code: 'bank_integration',
      name: 'Bank Integration',
      description: 'Direct integration with banking systems',
      category: 'integration',
      tier_required: 'enterprise',
      },
    {
      product_id: productMap.paylinq,
      code: 'compliance_reports',
      name: 'Compliance Reporting',
      description: 'Automated compliance and audit reports',
      category: 'reporting',
      tier_required: 'enterprise',
      }
  ];

  // ============================================================================
  // SCHEDULEHUB FEATURES (Scheduling)
  // ============================================================================
  
  const schedulehubFeatures = [
    // Core Features (Professional tier)
    {
      product_id: productMap.schedulehub,
      code: 'schedules',
      name: 'Schedule Management',
      description: 'Create and manage work schedules',
      category: 'scheduling',
      tier_required: 'professional',
      },
    {
      product_id: productMap.schedulehub,
      code: 'shifts',
      name: 'Shift Planning',
      description: 'Plan and assign shifts to workers',
      category: 'scheduling',
      tier_required: 'professional',
      },
    {
      product_id: productMap.schedulehub,
      code: 'time_off',
      name: 'Time Off Requests',
      description: 'Manage time off requests and approvals',
      category: 'time_management',
      tier_required: 'professional',
      },
    {
      product_id: productMap.schedulehub,
      code: 'workers',
      name: 'Worker Management',
      description: 'Manage workforce and worker profiles',
      category: 'workforce',
      tier_required: 'professional',
      },
    // Advanced Features (Professional+)
    {
      product_id: productMap.schedulehub,
      code: 'shift_swaps',
      name: 'Shift Swap Marketplace',
      description: 'Allow workers to swap shifts',
      category: 'scheduling',
      tier_required: 'professional',
      },
    {
      product_id: productMap.schedulehub,
      code: 'roles',
      name: 'Role Management',
      description: 'Define and assign worker roles',
      category: 'workforce',
      tier_required: 'professional',
      },
    {
      product_id: productMap.schedulehub,
      code: 'stations',
      name: 'Station Management',
      description: 'Manage work stations and locations',
      category: 'locations',
      tier_required: 'professional',
      },
    // Enterprise Features
    {
      product_id: productMap.schedulehub,
      code: 'notifications',
      name: 'Push Notifications',
      description: 'Real-time shift and schedule notifications',
      category: 'communication',
      tier_required: 'enterprise',
      },
    {
      product_id: productMap.schedulehub,
      code: 'reports',
      name: 'Advanced Reports',
      description: 'Comprehensive scheduling analytics',
      category: 'analytics',
      tier_required: 'enterprise',
      },
    {
      product_id: productMap.schedulehub,
      code: 'integrations',
      name: 'Third-party Integrations',
      description: 'Connect with Slack, Teams, etc.',
      category: 'integration',
      tier_required: 'enterprise',
      }
  ];

  // Combine all features
  const allFeatures = [
    ...nexusFeatures,
    ...recruitiqFeatures,
    ...paylinqFeatures,
    ...schedulehubFeatures
  ];

  // Insert features with conflict handling
  let insertedCount = 0;
  for (const feature of allFeatures) {
    const [inserted] = await knex('public.features')
      .insert(feature)
      .onConflict(['product_id', 'code'])
      .ignore()
      .returning('id');

    if (inserted) {
      insertedCount++;
      console.log(`[OK] Feature: ${feature.name} (${feature.code})`);
    }
  }

  console.log(`\n[INFO] Inserted ${insertedCount} new features`);

  // ============================================================================
  // Grant core features to existing organizations
  // ============================================================================
  
  console.log('\n[INFO] Granting core features to organizations...\n');

  const organizations = await knex('public.organizations').select('id', 'tier');

  if (organizations.length > 0) {
    // Grant Nexus core features to all organizations
    const nexusCoreFeatures = await knex('public.features')
      .where({ product_id: productMap.nexus })
      .whereIn('code', ['employees', 'departments'])
      .select('id');

    for (const org of organizations) {
      for (const feature of nexusCoreFeatures) {
        await knex('public.organization_feature_grants')
          .insert({
            organization_id: org.id,
            feature_id: feature.id,
            grant_type: 'tier_included'
          })
          .onConflict(['organization_id', 'feature_id'])
          .ignore();
      }
    }

    console.log(`[OK] Granted Nexus core features to ${organizations.length} organizations`);

    // Grant RecruitIQ professional features to professional+ orgs
    const professionalOrgs = organizations.filter(o => 
      ['professional', 'enterprise'].includes(o.tier)
    );

    if (professionalOrgs.length > 0) {
      const recruitiqProfessionalFeatures = await knex('public.features')
        .where({ product_id: productMap.recruitiq, tier_required: 'professional' })
        .select('id');

      for (const org of professionalOrgs) {
        for (const feature of recruitiqProfessionalFeatures) {
          await knex('public.organization_feature_grants')
            .insert({
              organization_id: org.id,
              feature_id: feature.id,
              grant_type: 'tier_included'
            })
            .onConflict(['organization_id', 'feature_id'])
            .ignore();
        }
      }

      console.log(`[OK] Granted RecruitIQ features to ${professionalOrgs.length} professional+ organizations`);
    }
  }

  console.log('\n================================================================');
  console.log('[OK] Features seeded successfully!');
  console.log('================================================================');
  console.log(`Total features: ${allFeatures.length}`);
  console.log(`- Nexus: ${nexusFeatures.length} features`);
  console.log(`- RecruitIQ: ${recruitiqFeatures.length} features`);
  console.log(`- PayLinQ: ${paylinqFeatures.length} features`);
  console.log(`- ScheduleHub: ${schedulehubFeatures.length} features`);
  console.log('================================================================\n');
};

