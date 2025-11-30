/**
 * Consolidated Schema Migration - Tables
 * Part 1: Core table definitions
 */
export async function up(knex) {
  // Core schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS hris');
  await knex.raw('CREATE SCHEMA IF NOT EXISTS payroll');
  await knex.raw('CREATE SCHEMA IF NOT EXISTS scheduling');
  await knex.raw('CREATE SCHEMA IF NOT EXISTS recruitment');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');

  // Organizations table
  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 255).notNullable();
    table.string('domain', 255).unique();
    table.string('slug', 100).unique().notNullable();
    table.string('industry', 100);
    table.string('country', 2).defaultTo('SR');
    table.string('timezone', 50).defaultTo('America/Paramaribo');
    table.string('currency', 3).defaultTo('SRD');
    table.string('language', 10).defaultTo('nl');
    table.jsonb('settings').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at');
    table.uuid('deleted_by');
  });

  // Features table
  await knex.schema.createTable('features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('feature_code', 50).unique().notNullable();
    table.string('feature_name', 100).notNullable();
    table.text('description');
    table.string('category', 50);
    table.boolean('is_core').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // License Plans table
  await knex.schema.createTable('license_plans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('plan_name', 100).notNullable();
    table.text('description');
    table.integer('max_users');
    table.integer('max_workspaces');
    table.decimal('monthly_price', 10, 2);
    table.decimal('annual_price', 10, 2);
    table.jsonb('features').defaultTo('[]');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Organization Licenses table
  await knex.schema.createTable('organization_licenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations');
    table.uuid('plan_id').references('id').inTable('license_plans');
    table.timestamp('valid_from').notNullable();
    table.timestamp('valid_until').notNullable();
    table.integer('licensed_users').defaultTo(0);
    table.boolean('is_trial').defaultTo(false);
    table.string('status', 20).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Organization Features table
  await knex.schema.createTable('organization_features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations');
    table.uuid('feature_id').notNullable().references('id').inTable('features');
    table.boolean('is_enabled').defaultTo(true);
    table.timestamp('enabled_at').defaultTo(knex.fn.now());
    table.uuid('enabled_by');
    table.unique(['organization_id', 'feature_id']);
  });

  // Workspaces table
  await knex.schema.createTable('workspaces', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations');
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable();
    table.text('description');
    table.jsonb('settings').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at');
    table.uuid('deleted_by');
    table.unique(['organization_id', 'slug']);
  });

  // User Account table (HRIS schema)
  await knex.schema.withSchema('hris').createTable('user_account', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations');
    table.string('email', 255).notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('name', 255).notNullable();
    table.string('phone', 20);
    table.boolean('is_active').defaultTo(true);
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('last_login');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'email']);
  });

  // User Roles table
  await knex.schema.withSchema('hris').createTable('user_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations');
    table.string('role_name', 100).notNullable();
    table.text('description');
    table.jsonb('permissions').defaultTo('[]');
    table.boolean('is_system_role').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['organization_id', 'role_name']);
  });

  // User Role Assignments table
  await knex.schema.withSchema('hris').createTable('user_role_assignments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('hris.user_account');
    table.uuid('role_id').notNullable().references('id').inTable('hris.user_roles');
    table.uuid('workspace_id').references('id').inTable('workspaces');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.uuid('assigned_by');
    table.unique(['user_id', 'role_id', 'workspace_id']);
  });

  // Workspace Memberships table
  await knex.schema.createTable('workspace_memberships', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces');
    table.uuid('user_id').notNullable().references('id').inTable('hris.user_account');
    table.string('role', 50).defaultTo('member');
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.unique(['workspace_id', 'user_id']);
  });

  // Locations table (HRIS)
  await knex.schema.withSchema('hris').createTable('locations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations');
    table.string('name', 255).notNullable();
    table.string('code', 50);
    table.string('address', 500);
    table.string('city', 100);
    table.string('state', 100);
    table.string('postal_code', 20);
    table.string('country', 2).defaultTo('SR');
    table.string('phone', 20);
    table.string('timezone', 50);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.timestamp('deleted_at');
  });

  // Departments table (HRIS)
  await knex.schema.withSchema('hris').createTable('departments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations');
    table.string('name', 255).notNullable();
    table.string('code', 50);
    table.text('description');
    table.uuid('parent_department_id').references('id').inTable('hris.departments');
    table.uuid('manager_id').references('id').inTable('hris.user_account');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.timestamp('deleted_at');
  });

  // Employees table (HRIS)
  await knex.schema.withSchema('hris').createTable('employees', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations');
    table.uuid('user_id').references('id').inTable('hris.user_account');
    table.string('employee_number', 50).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('email', 255);
    table.string('phone', 20);
    table.date('date_of_birth');
    table.string('gender', 20);
    table.string('nationality', 50);
    table.string('marital_status', 20);
    table.uuid('department_id').references('id').inTable('hris.departments');
    table.uuid('location_id').references('id').inTable('hris.locations');
    table.string('job_title', 255);
    table.date('hire_date');
    table.string('employment_type', 50);
    table.string('employee_status', 50).defaultTo('active');
    table.uuid('manager_id').references('id').inTable('hris.employees');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'employee_number']);
  });

  // Add indexes
  await knex.raw('CREATE INDEX idx_organizations_slug ON organizations(slug)');
  await knex.raw('CREATE INDEX idx_organizations_domain ON organizations(domain)');
  await knex.raw('CREATE INDEX idx_user_account_email ON hris.user_account(email)');
  await knex.raw('CREATE INDEX idx_user_account_org ON hris.user_account(organization_id)');
  await knex.raw('CREATE INDEX idx_employees_org ON hris.employees(organization_id)');
  await knex.raw('CREATE INDEX idx_employees_dept ON hris.employees(department_id)');
  await knex.raw('CREATE INDEX idx_workspaces_org ON workspaces(organization_id)');
}

export async function down(knex) {
  // Drop tables in reverse order
  await knex.schema.withSchema('hris').dropTableIfExists('employees');
  await knex.schema.withSchema('hris').dropTableIfExists('departments');
  await knex.schema.withSchema('hris').dropTableIfExists('locations');
  await knex.schema.dropTableIfExists('workspace_memberships');
  await knex.schema.withSchema('hris').dropTableIfExists('user_role_assignments');
  await knex.schema.withSchema('hris').dropTableIfExists('user_roles');
  await knex.schema.withSchema('hris').dropTableIfExists('user_account');
  await knex.schema.dropTableIfExists('workspaces');
  await knex.schema.dropTableIfExists('organization_features');
  await knex.schema.dropTableIfExists('organization_licenses');
  await knex.schema.dropTableIfExists('license_plans');
  await knex.schema.dropTableIfExists('features');
  await knex.schema.dropTableIfExists('organizations');
  await knex.raw('DROP SCHEMA IF EXISTS recruitment CASCADE');
  await knex.raw('DROP SCHEMA IF EXISTS scheduling CASCADE');
  await knex.raw('DROP SCHEMA IF EXISTS payroll CASCADE');
  await knex.raw('DROP SCHEMA IF EXISTS hris CASCADE');
}
