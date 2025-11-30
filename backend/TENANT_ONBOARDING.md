# Tenant Onboarding Guide

## Overview

RecruitIQ is a multi-tenant SaaS platform. Each tenant (organization) gets:
- Complete data isolation (enforced at database and application layers)
- Own set of RBAC roles and permissions
- Own product configurations (worker types, payroll structures, etc.)
- Own users and feature grants

## Tenant Creation Methods

### Method 1: Via API (Production)

```javascript
// POST /api/admin/organizations
{
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "tier": "enterprise",
  "enabled_products": ["recruitiq", "paylinq", "nexus", "schedulehub"],
  "admin_user": {
    "email": "admin@acme.com",
    "password": "SecurePassword123!",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

The API will automatically:
1. Create organization record
2. Create admin user in `hris.user_account`
3. Create default tenant roles (Owner, Admin, Manager, User, Viewer)
4. Assign admin user to Owner role
5. Seed product-specific data (worker types, payroll configs, etc.)

### Method 2: Via Knex Seeds (Development/Testing)

Use the seed system to create complete tenant environments with test data.

## Seed File Architecture

### Execution Order

Seeds must run in this order due to foreign key dependencies:

```
Development Seeds (seeds/development/):
├── 01_organizations.js          # Organizations/tenants
├── 02_products.js               # Platform products metadata
├── 03_features.js               # Platform features
├── 04_rbac_platform.js          # Platform-level permissions & roles
├── 05_rbac_nexus.js             # Nexus product permissions
├── 06_rbac_paylinq.js           # PayLinQ product permissions
├── 07_rbac_recruitiq.js         # RecruitIQ product permissions
├── 08_rbac_schedulehub.js       # ScheduleHub product permissions
├── 09_users.js                  # Test users in hris.user_account
├── 10_rbac_tenant_roles.js      # Org-specific roles with permissions
├── 11_user_role_assignments.js  # Assign users to roles
├── 12_worker_types.js           # HRIS worker types (per org)
├── 13_payroll_run_types.js      # Payroll run type templates (per org)
├── 14_pay_components.js         # Standard pay components (per org)
├── 15_suriname_tax_rules.js     # Tax rules (for Suriname orgs)
└── 16_allowances.js             # Tax-free allowances (per org)
```

### Run All Seeds

```bash
# Development environment
npx knex seed:run

# Specific seed file
npx knex seed:run --specific=development/09_users.js
```

## Creating Seeds from Existing SQL Files

Your existing SQL files in `src/database/seeds/` need to be converted to Knex format:

### Conversion Pattern

```javascript
// OLD: seed-worker-types.sql
DO $$
DECLARE org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    INSERT INTO hris.worker_type (...) VALUES (...);
  END LOOP;
END $$;

// NEW: seeds/development/12_worker_types.js
export async function seed(knex) {
  // Get all organizations
  const orgs = await knex('organizations').select('id', 'name');
  
  for (const org of orgs) {
    // Insert worker types for this org
    await knex('hris.worker_type').insert([
      {
        id: knex.raw('gen_random_uuid()'),
        organization_id: org.id,
        code: 'FT',
        name: 'Full-Time',
        // ... other fields
      }
    ]).onConflict(['organization_id', 'code']).ignore();
  }
}
```

## Tenant-Specific Data Requirements

When creating a new tenant, seed these entities:

### 1. Core Platform (public schema)
- ✅ Organization record
- ✅ Feature grants (via API or seed)
- ✅ Platform admin user (optional)

### 2. RBAC (public schema)
- ✅ Tenant roles (Owner, Admin, Manager, User, Viewer)
- ✅ Role-permission mappings
- ✅ User-role assignments

### 3. HRIS (hris schema)
- ✅ Admin user account (hris.user_account)
- ✅ Admin employee record (hris.employee)
- ✅ Worker types (hris.worker_type) - 7 standard types
- ✅ Departments (optional)
- ✅ Locations (optional)

### 4. Payroll (payroll schema) - If PayLinQ enabled
- ✅ Payroll run types (7 standard types)
- ✅ Pay components (earnings, deductions, benefits)
- ✅ Tax rules (country-specific)
- ✅ Allowances (tax-free caps)

### 5. Scheduling (scheduling schema) - If ScheduleHub enabled
- ✅ Scheduling roles
- ✅ Stations (optional)

## Production Tenant Onboarding API

### Endpoint: `POST /api/admin/organizations/onboard`

```javascript
// backend/src/controllers/admin/organizationController.js

export async function onboardOrganization(req, res) {
  const { 
    organization, 
    admin_user, 
    products,
    country = 'SR' // Default to Suriname
  } = req.body;

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Create organization
    const org = await OrganizationService.create(organization);

    // 2. Create admin user
    const user = await UserService.createAdminUser({
      ...admin_user,
      organization_id: org.id
    });

    // 3. Create default roles
    await RoleService.createDefaultTenantRoles(org.id);

    // 4. Assign user to Owner role
    const ownerRole = await RoleService.findByName('owner', org.id);
    await UserService.assignRole(user.id, ownerRole.id);

    // 5. Seed product-specific data
    if (products.includes('nexus')) {
      await WorkerTypeService.seedDefaults(org.id, user.id);
    }

    if (products.includes('paylinq')) {
      await PayrollRunTypeService.seedDefaults(org.id, user.id);
      await PayComponentService.seedDefaults(org.id, user.id);
      
      if (country === 'SR') {
        await TaxRuleService.seedSuriname(org.id, user.id);
        await AllowanceService.seedSuriname(org.id, user.id);
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      organization: org,
      admin_user: user,
      message: 'Organization onboarded successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## Data Isolation Rules

### ALWAYS Filter by organization_id

```javascript
// ❌ WRONG: No tenant isolation
await knex('hris.employee').where({ id: employeeId });

// ✅ CORRECT: Enforces tenant isolation
await knex('hris.employee')
  .where({ 
    id: employeeId,
    organization_id: organizationId 
  });
```

### Seed Data Must Be Tenant-Specific

```javascript
// ✅ CORRECT: Seeds for each organization
const orgs = await knex('organizations').select('id');

for (const org of orgs) {
  await knex('hris.worker_type').insert({
    organization_id: org.id, // Tenant isolation
    code: 'FT',
    name: 'Full-Time'
  });
}

// ❌ WRONG: Shared data across tenants (breaks isolation)
await knex('hris.worker_type').insert({
  organization_id: null, // DON'T DO THIS!
  code: 'FT',
  name: 'Full-Time'
});
```

## Migration Strategy for Existing SQL Seeds

1. **Create Knex seed files** in `seeds/development/`
2. **Convert SQL to Knex queries** using the pattern above
3. **Test on fresh database**:
   ```bash
   node scripts/test-migrations-fresh-db.js
   npx knex seed:run
   ```
4. **Verify tenant isolation** - query data for specific org_id
5. **Delete old SQL files** once verified

## Seed Development Workflow

```bash
# 1. Create migration
npx knex migrate:make create_my_table

# 2. Run migration
npx knex migrate:latest

# 3. Create seed
npx knex seed:make 17_my_seed --knexfile knexfile.js

# 4. Write seed logic (see templates below)

# 5. Run seeds
npx knex seed:run

# 6. Verify
psql -U postgres -d recruitiq_dev -c "SELECT * FROM my_table"
```

## Seed Templates

### Template: Organization-Scoped Seed

```javascript
/**
 * Seed: My Entity
 * Seeds data for each organization (tenant isolation)
 */

export async function seed(knex) {
  console.log('📦 Seeding my_entity...');

  // Get all organizations
  const orgs = await knex('organizations').select('id', 'name');
  
  let totalCount = 0;

  for (const org of orgs) {
    console.log(`  Seeding for ${org.name}...`);
    
    await knex('my_schema.my_entity').insert([
      {
        id: knex.raw('gen_random_uuid()'),
        organization_id: org.id,
        name: 'Item 1',
        created_at: knex.fn.now()
      },
      {
        id: knex.raw('gen_random_uuid()'),
        organization_id: org.id,
        name: 'Item 2',
        created_at: knex.fn.now()
      }
    ]).onConflict(['organization_id', 'name']).ignore();
    
    totalCount += 2;
  }

  console.log(`✅ Seeded ${totalCount} items across ${orgs.length} organizations`);
}
```

### Template: Platform-Level Seed (No Org Scope)

```javascript
/**
 * Seed: Platform Permissions
 * Seeds platform-wide permissions (no organization_id)
 */

export async function seed(knex) {
  console.log('🔐 Seeding platform permissions...');

  await knex('permissions').insert([
    {
      product: 'platform',
      name: 'admin:access',
      display_name: 'Admin Access',
      description: 'Access admin portal',
      category: 'platform'
    }
  ]).onConflict(['product', 'name']).ignore();

  console.log('✅ Platform permissions seeded');
}
```

## Next Steps

1. Convert all SQL seeds in `src/database/seeds/` to Knex format
2. Place in `seeds/development/` with proper numbering
3. Update seed template in `seeds/tenant/template.js`
4. Create API endpoint for production tenant onboarding
5. Document tenant creation in user manual

## See Also

- [CODING_STANDARDS.md](../docs/CODING_STANDARDS.md) - Multi-tenant data isolation rules
- [BACKEND_STANDARDS.md](../docs/BACKEND_STANDARDS.md) - Service layer patterns
- [TESTING_STANDARDS.md](../docs/TESTING_STANDARDS.md) - Testing tenant isolation
