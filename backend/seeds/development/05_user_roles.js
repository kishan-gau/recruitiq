/**
 * Development Seed: User Roles
 * Assigns roles to test users
 */

export async function seed(knex) {
  // Delete existing user_roles
  await knex('user_roles').del();

  // Get organizations
  const testOrg = await knex('organizations').where('slug', 'test-org').first();
  const demoOrg = await knex('organizations').where('slug', 'demo-company').first();

  // Get roles
  const ownerRole = await knex('roles')
    .where({ organization_id: testOrg.id, name: 'owner' })
    .first();
  
  const managerRole = await knex('roles')
    .where({ organization_id: testOrg.id, name: 'manager' })
    .first();
  
  const demoOwnerRole = await knex('roles')
    .where({ organization_id: demoOrg.id, name: 'owner' })
    .first();

  // Get users
  const adminUser = await knex.withSchema('hris').from('user_account')
    .where('email', 'admin@testorg.com')
    .first();
  
  const managerUser = await knex.withSchema('hris').from('user_account')
    .where('email', 'manager@testorg.com')
    .first();
  
  const demoUser = await knex.withSchema('hris').from('user_account')
    .where('email', 'admin@democompany.com')
    .first();

  // Assign roles
  await knex('user_roles').insert([
    {
      id: knex.raw('uuid_generate_v4()'),
      user_id: adminUser.id,
      role_id: ownerRole.id,
      created_at: knex.fn.now()
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      user_id: managerUser.id,
      role_id: managerRole.id,
      created_at: knex.fn.now()
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      user_id: demoUser.id,
      role_id: demoOwnerRole.id,
      created_at: knex.fn.now()
    }
  ]);
}
