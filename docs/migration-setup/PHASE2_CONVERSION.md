# Phase 2: Schema Conversion - SQL to Knex Migrations

**Status:** Ready for Implementation  
**Duration:** Weeks 2-3 (10 working days)  
**Prerequisites:** Phase 1 completed

---

## Overview

Phase 2 converts all existing SQL schema files to Knex.js migrations. This is the most critical phase as it requires careful analysis of dependencies and proper ordering.

---

## Conversion Strategy

### Approach: Incremental Product-by-Product

1. **Core Platform First** (3 days)
   - Organizations, licenses, users, RBAC
   - Foundation for all products

2. **One Product Proof of Concept** (2 days)
   - Choose RecruitIQ (smallest, 10 tables)
   - Validate conversion approach

3. **Remaining Products** (5 days)
   - PayLinQ (largest, 27 tables)
   - Nexus HRIS (15 tables)
   - ScheduleHub (16 tables)
   - Deployment Service (5 tables)

---

## Day 1-3: Core Platform Migration

### Step 1: Analyze Dependencies

Read existing schema files and map dependencies:

```bash
# View current schema files
Get-ChildItem c:\RecruitIQ\backend\src\database\*.sql

# Existing files:
# - schema.sql (core platform)
# - nexus-hris-schema.sql
# - paylinq-schema.sql
# - schedulehub-schema.sql
# - recruitiq-schema.sql
# - deployment-service-schema.sql
```

### Step 2: Extract Core Tables from schema.sql

Analyze `backend/src/database/schema.sql` and identify tables:

**Core Tables (in dependency order):**
1. `organizations` (no dependencies)
2. `licenses` (depends on organizations)
3. `hris.user_account` (depends on organizations)
4. `platform_roles` (no dependencies)
5. `platform_permissions` (no dependencies)
6. `platform_role_permissions` (depends on roles, permissions)
7. `platform_user_roles` (depends on users, roles)
8. `products` (no dependencies)
9. `product_features` (depends on products)
10. `organization_licenses` (depends on organizations, licenses, products)
11. `organization_feature_usage` (depends on organizations, features)
12. `audit_logs` (depends on organizations, users)

### Step 3: Create Core Migrations

Create `migrations/core/20250122000001_create_organizations.js`:

```javascript
/**
 * Migration: Create Organizations Table
 * 
 * @description Creates the core organizations table for multi-tenant architecture
 */
export async function up(knex) {
  await knex.schema.createTable('organizations', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Business Columns
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.string('email', 255).nullable();
    table.string('phone', 50).nullable();
    table.text('address').nullable();
    table.string('city', 100).nullable();
    table.string('state', 100).nullable();
    table.string('country', 100).notNullable().defaultTo('Suriname');
    table.string('postal_code', 20).nullable();
    table.string('website', 255).nullable();
    table.string('industry', 100).nullable();
    table.integer('employee_count').nullable();
    table.string('tax_id', 100).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.jsonb('settings').defaultTo('{}');
    table.jsonb('branding').defaultTo('{}');
    
    // Audit Columns
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index(['slug']);
    table.index(['is_active', 'deleted_at']);
    table.index(['country', 'is_active']);
  });
  
  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE organizations IS 'Multi-tenant organization records';
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('organizations');
}
```

Create `migrations/core/20250122000002_create_licenses.js`:

```javascript
/**
 * Migration: Create Licenses Table
 */
export async function up(knex) {
  await knex.schema.createTable('licenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.string('slug', 50).notNullable().unique();
    table.text('description').nullable();
    table.string('tier', 50).notNullable(); // 'starter', 'professional', 'enterprise'
    table.decimal('monthly_price', 10, 2).notNullable().defaultTo(0);
    table.decimal('yearly_price', 10, 2).notNullable().defaultTo(0);
    table.integer('max_users').nullable();
    table.integer('max_employees').nullable();
    table.jsonb('features').defaultTo('[]');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('trial_days').notNullable().defaultTo(14);
    
    // Audit columns
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index(['tier', 'is_active']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('licenses');
}
```

**Continue for all core tables...**

### Step 4: Test Core Migrations

```bash
# Run core migrations
pnpm run migrate:latest

# Verify in database
psql -d recruitiq_dev -c "\dt"

# Check migration status
pnpm run migrate:status

# Test rollback
pnpm run migrate:rollback

# Re-run
pnpm run migrate:latest
```

---

## Day 4-5: RecruitIQ Product (Proof of Concept)

### Step 1: Analyze recruitiq-schema.sql

Tables in RecruitIQ ATS:
1. `jobs`
2. `job_skills`
3. `candidates`
4. `applications`
5. `interviews`
6. `interview_participants`
7. `offer_letters`
8. `job_templates`
9. `email_templates`
10. `candidate_documents`

### Step 2: Create RecruitIQ Migrations

Create `migrations/products/recruitiq/20250122400001_create_recruitiq_jobs.js`:

```javascript
/**
 * Migration: Create RecruitIQ Jobs Tables
 */
export async function up(knex) {
  // Create jobs table
  await knex.schema.createTable('jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('workspace_id').notNullable();
    
    table.string('title', 255).notNullable();
    table.text('description').notNullable();
    table.string('department', 100).nullable();
    table.string('location', 255).nullable();
    table.string('employment_type', 50).notNullable();
    table.integer('salary_min').nullable();
    table.integer('salary_max').nullable();
    table.string('salary_currency', 10).defaultTo('SRD');
    table.string('experience_level', 50).nullable();
    table.string('education_level', 100).nullable();
    table.jsonb('requirements').defaultTo('[]');
    table.jsonb('responsibilities').defaultTo('[]');
    table.jsonb('benefits').defaultTo('[]');
    table.string('status', 50).notNullable().defaultTo('draft');
    table.boolean('is_published').notNullable().defaultTo(false);
    table.date('published_at').nullable();
    table.date('closes_at').nullable();
    table.integer('views_count').notNullable().defaultTo(0);
    table.integer('applications_count').notNullable().defaultTo(0);
    table.jsonb('custom_fields').defaultTo('{}');
    
    // Audit columns
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable()
      .references('id').inTable('hris.user_account');
    table.uuid('updated_by').nullable()
      .references('id').inTable('hris.user_account');
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index(['organization_id', 'deleted_at']);
    table.index(['status', 'is_published']);
    table.index(['employment_type', 'organization_id']);
  });
  
  // Create job_skills junction table
  await knex.schema.createTable('job_skills', (table) => {
    table.uuid('job_id').notNullable()
      .references('id').inTable('jobs').onDelete('CASCADE');
    table.string('skill', 100).notNullable();
    table.string('proficiency_level', 50).notNullable().defaultTo('required');
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    
    table.primary(['job_id', 'skill']);
    table.index(['organization_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('job_skills');
  await knex.schema.dropTableIfExists('jobs');
}
```

**Continue for remaining RecruitIQ tables...**

### Step 3: Test RecruitIQ Migrations

```bash
# Run migrations
pnpm run migrate:latest

# Verify schema
psql -d recruitiq_dev -c "\d+ jobs"

# Verify foreign keys
psql -d recruitiq_dev -c "SELECT conname, conrelid::regclass, confrelid::regclass FROM pg_constraint WHERE contype = 'f' AND conrelid::regclass::text = 'jobs';"
```

---

## Day 6-10: Remaining Products

### Day 6-7: PayLinQ Payroll (27 tables)

Group into logical migrations:

1. **20250122200001_create_paylinq_core.js**
   - `payroll_employees`
   - `worker_types`
   - `worker_type_templates`

2. **20250122200002_create_paylinq_payroll.js**
   - `payroll_runs`
   - `payroll_run_types`
   - `paycheck`

3. **20250122200003_create_paylinq_components.js**
   - `pay_components`
   - `run_components`
   - `paycheck_components`

4. **20250122200004_create_paylinq_tax.js**
   - `tax_rules`
   - `tax_brackets`
   - `tax_calculations`

5. **20250122200005_create_paylinq_formula.js**
   - `formula_templates`
   - `formula_library`

6. **20250122200006_create_paylinq_allowances.js**
   - `allowances`
   - `allowance_usage`

### Day 8: Nexus HRIS (15 tables)

Group into migrations:

1. **20250122100001_create_nexus_core.js**
   - `hris.employees`
   - `hris.departments`
   - `hris.locations`

2. **20250122100002_create_nexus_hr.js**
   - `hris.employment_contracts`
   - `hris.employment_history`
   - `hris.terminations`

3. **20250122100003_create_nexus_time_off.js**
   - `hris.time_off_policies`
   - `hris.time_off_requests`
   - `hris.time_off_balances`

4. **20250122100004_create_nexus_performance.js**
   - `hris.performance_reviews`
   - `hris.goals`

5. **20250122100005_create_nexus_benefits.js**
   - `hris.benefit_plans`
   - `hris.employee_benefits`

6. **20250122100006_create_nexus_documents.js**
   - `hris.documents`
   - `hris.document_signatures`

### Day 9: ScheduleHub (16 tables)

Create migrations for scheduling system.

### Day 10: Deployment Service (5 tables)

Create migrations for deployment approval workflow.

---

## Seed Data Conversion

### Strategy: Seed Data as Migrations

Convert seed files to data migrations in `migrations/data/`:

1. **20250122900001_seed_rbac_platform.js**
2. **20250122900002_seed_admin_users.js**
3. **20250122900003_seed_products.js**
4. **20250122900004_seed_features.js**
5. **20250122900005_seed_formula_templates.js**
6. **20250122900006_seed_suriname_tax_rules.js**
7. **20250122900007_seed_payroll_run_types.js**
8. **20250122900008_seed_worker_types.js**
9. **20250122900009_seed_allowances.js**
10. **20250122900010_seed_test_tenant.js** (only for dev/test)

### Example Seed Migration

Create `migrations/data/20250122900001_seed_rbac_platform.js`:

```javascript
/**
 * Migration: Seed RBAC Platform Roles
 */
export async function up(knex) {
  // Insert platform roles
  await knex('platform_roles').insert([
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Super Admin',
      slug: 'super-admin',
      description: 'Full system access across all organizations',
      is_platform_role: true,
      created_at: knex.fn.now()
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'License Admin',
      slug: 'license-admin',
      description: 'Manages licenses and subscriptions',
      is_platform_role: true,
      created_at: knex.fn.now()
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Security Admin',
      slug: 'security-admin',
      description: 'Manages security and compliance',
      is_platform_role: true,
      created_at: knex.fn.now()
    }
  ]);
  
  // Insert platform permissions
  const permissions = [
    { resource: 'organizations', action: 'create', description: 'Create organizations' },
    { resource: 'organizations', action: 'read', description: 'View organizations' },
    { resource: 'organizations', action: 'update', description: 'Update organizations' },
    { resource: 'organizations', action: 'delete', description: 'Delete organizations' },
    // ... more permissions
  ];
  
  await knex('platform_permissions').insert(
    permissions.map(p => ({
      id: knex.raw('gen_random_uuid()'),
      resource: p.resource,
      action: p.action,
      description: p.description,
      created_at: knex.fn.now()
    }))
  );
}

export async function down(knex) {
  await knex('platform_role_permissions').del();
  await knex('platform_user_roles').del();
  await knex('platform_permissions').del();
  await knex('platform_roles').del();
}
```

---

## Validation Process

### Step 1: Fresh Database Test

```bash
# Drop and recreate test database
psql -U postgres -c "DROP DATABASE IF EXISTS recruitiq_migration_test;"
psql -U postgres -c "CREATE DATABASE recruitiq_migration_test;"

# Set test database
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/recruitiq_migration_test"

# Run all migrations
pnpm run migrate:latest

# Verify all tables exist
psql -d recruitiq_migration_test -c "\dt"
psql -d recruitiq_migration_test -c "\dt hris.*"

# Count tables (should match original)
psql -d recruitiq_migration_test -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

### Step 2: Compare Schemas

```bash
# Export original schema
pg_dump -s -d recruitiq_dev > original_schema.sql

# Export migrated schema
pg_dump -s -d recruitiq_migration_test > migrated_schema.sql

# Compare (should be identical)
diff original_schema.sql migrated_schema.sql
```

### Step 3: Test Rollback

```bash
# Rollback all migrations
pnpm run migrate:rollback:all

# Verify database is empty
psql -d recruitiq_migration_test -c "\dt"

# Re-run migrations
pnpm run migrate:latest
```

---

## Conversion Checklist

For each table converted:

- [ ] Table structure matches original SQL
- [ ] All columns present with correct types
- [ ] Primary keys defined
- [ ] Foreign keys defined with correct references
- [ ] Indexes created for FK columns
- [ ] Audit columns included (created_at, updated_at, deleted_at)
- [ ] organization_id included for tenant isolation
- [ ] Table comments added
- [ ] Migration has down() function
- [ ] Migration tested with up and down
- [ ] No hardcoded UUIDs (except seed data)

---

## Success Criteria

Phase 2 is complete when:

- [ ] All core platform tables migrated
- [ ] All product tables migrated (Nexus, PayLinQ, ScheduleHub, RecruitIQ)
- [ ] Deployment service tables migrated
- [ ] All seed data converted to migrations
- [ ] Fresh database migrates successfully
- [ ] Schema comparison shows no differences
- [ ] All migrations rollback successfully
- [ ] Documentation updated

**Estimated Time:** 2 weeks (10 working days)  
**Actual Time:** _________  
**Blockers:** _________  
**Notes:** _________

---

## Next Steps

Once Phase 2 is complete:

1. ✅ **Phase 2 Complete**: All schemas converted to Knex migrations
2. ➡️ **Start Phase 3**: Integrate migrations with Docker
3. 📚 **Read Next**: [PHASE3_DOCKER.md](./PHASE3_DOCKER.md)
