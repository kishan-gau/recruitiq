/**
 * Development Seed: Users
 * Creates test users with hashed passwords
 */

import bcrypt from 'bcrypt';

export async function seed(knex) {
  // Hash passwords
  const passwordHash = await bcrypt.hash('Admin123!', 12);

  // Delete existing entries
  await knex.withSchema('hris').from('user_account').del();

  // Insert test users
  await knex.withSchema('hris').table('user_account').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      organization_id: '9ee50aee-76c3-46ce-87ed-005c6dd893ef',
      email: 'admin@testorg.com',
      password_hash: passwordHash,
      email_verified: true,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      organization_id: '9ee50aee-76c3-46ce-87ed-005c6dd893ef',
      email: 'manager@testorg.com',
      password_hash: passwordHash,
      email_verified: true,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      organization_id: '8dd50aee-76c3-46ce-87ed-005c6dd893ef',
      email: 'admin@democompany.com',
      password_hash: passwordHash,
      email_verified: true,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      organization_id: '7cc50aee-76c3-46ce-87ed-005c6dd893ef',
      email: 'tenant@testcompany.com',
      password_hash: passwordHash,
      enabled_products: JSON.stringify(['recruitiq', 'nexus', 'paylinq', 'schedulehub']),
      product_roles: JSON.stringify({
        recruitiq: 'admin',
        nexus: 'admin',
        paylinq: 'admin',
        schedulehub: 'admin'
      }),
      email_verified: true,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      organization_id: '7cc50aee-76c3-46ce-87ed-005c6dd893ef',
      email: 'payroll@testcompany.com',
      password_hash: passwordHash,
      enabled_products: JSON.stringify(['paylinq']),
      product_roles: JSON.stringify({
        paylinq: 'payroll_manager'
      }),
      email_verified: true,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440005',
      organization_id: '7cc50aee-76c3-46ce-87ed-005c6dd893ef',
      email: 'employee@testcompany.com',
      password_hash: passwordHash,
      enabled_products: JSON.stringify(['nexus']),
      product_roles: JSON.stringify({
        nexus: 'employee'
      }),
      email_verified: true,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
}
