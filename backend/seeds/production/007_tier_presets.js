/**
 * Seed file for tier_presets table
 * Creates default tier presets for starter, professional, and enterprise tiers
 */

export async function seed(knex) {
  // Delete all existing entries
  await knex('tier_presets').del()

  // Insert seed entries
  await knex('tier_presets').insert([
    {
      id: knex.raw('uuid_generate_v4()'),
      tier_name: 'starter',
      version: 1,
      max_users: 5,
      max_workspaces: 1,
      max_jobs: 25,
      max_candidates: 100,
      features: JSON.stringify(['basic']),
      monthly_price_per_user: 15.00,
      annual_price_per_user: 150.00,
      base_price: 49.00,
      description: 'Perfect for small teams getting started with recruitment',
      is_active: true,
      effective_from: new Date(),
      effective_until: null,
      notes: 'Starter tier for small teams'
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      tier_name: 'professional',
      version: 1,
      max_users: 25,
      max_workspaces: 5,
      max_jobs: 100,
      max_candidates: 1000,
      features: JSON.stringify(['basic', 'analytics', 'api']),
      monthly_price_per_user: 25.00,
      annual_price_per_user: 250.00,
      base_price: 199.00,
      description: 'Advanced features for growing recruitment teams',
      is_active: true,
      effective_from: new Date(),
      effective_until: null,
      notes: 'Professional tier for growing teams'
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      tier_name: 'enterprise',
      version: 1,
      max_users: 100,
      max_workspaces: 20,
      max_jobs: null, // unlimited
      max_candidates: null, // unlimited
      features: JSON.stringify([
        'basic',
        'analytics',
        'api',
        'customBranding',
        'mfa',
        'sso',
        'integration',
        'advancedReporting',
        'prioritySupport'
      ]),
      monthly_price_per_user: 45.00,
      annual_price_per_user: 450.00,
      base_price: 999.00,
      description: 'Enterprise-grade solution with unlimited features and priority support',
      is_active: true,
      effective_from: new Date(),
      effective_until: null,
      notes: 'Enterprise tier with unlimited features'
    }
  ])
}
