/**
 * Seed: Products
 * Seeds platform products metadata
 */

export async function seed(knex) {
  console.log('📦 Seeding products...');

  await knex('products').insert([
    {
      name: 'recruitiq',
      display_name: 'RecruitIQ',
      slug: 'recruitiq',
      version: '1.0.0',
      description: 'Applicant Tracking System - Streamline your recruitment process',
      icon: 'briefcase',
      color: '#3B82F6',
      status: 'active',
      is_core: false,
      requires_license: true,
      min_tier: 'starter',
      api_prefix: '/api/products/recruitiq',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'paylinq',
      display_name: 'PayLinQ',
      slug: 'paylinq',
      version: '1.0.0',
      description: 'Payroll Management System - Automated payroll processing',
      icon: 'wallet',
      color: '#10B981',
      status: 'active',
      is_core: false,
      requires_license: true,
      min_tier: 'professional',
      api_prefix: '/api/products/paylinq',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'nexus',
      display_name: 'Nexus',
      slug: 'nexus',
      version: '1.0.0',
      description: 'HRIS - Human Resource Information System',
      icon: 'users',
      color: '#8B5CF6',
      status: 'active',
      is_core: false,
      requires_license: true,
      min_tier: 'professional',
      api_prefix: '/api/products/nexus',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'schedulehub',
      display_name: 'ScheduleHub',
      slug: 'schedulehub',
      version: '1.0.0',
      description: 'Workforce Scheduling - Manage shifts and stations',
      icon: 'calendar',
      color: '#F59E0B',
      status: 'active',
      is_core: false,
      requires_license: true,
      min_tier: 'enterprise',
      api_prefix: '/api/products/schedulehub',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]).onConflict('slug').merge({
    display_name: knex.raw('EXCLUDED.display_name'),
    description: knex.raw('EXCLUDED.description'),
    icon: knex.raw('EXCLUDED.icon'),
    color: knex.raw('EXCLUDED.color'),
    status: knex.raw('EXCLUDED.status'),
    version: knex.raw('EXCLUDED.version'),
    updated_at: knex.fn.now()
  });

  const count = await knex('products').count('* as count').first();
  console.log(`✅ ${count.count} products seeded`);
}
