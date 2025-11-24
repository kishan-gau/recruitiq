# Knex.js Migration Setup - Implementation Plan

**Version:** 1.0  
**Date:** November 22, 2025  
**Status:** Planning Phase

---

## Executive Summary

This document outlines the comprehensive plan to migrate RecruitIQ's database schema management from PowerShell-based SQL scripts to **Knex.js migrations**. This migration will provide versioned, trackable, and production-safe database schema management.

### Current State Problems

1. **Data Loss Risk**: `setup-database.ps1` always drops the database
2. **No Versioning**: Cannot track which schemas have been applied
3. **No Rollback**: Impossible to undo schema changes
4. **Manual Execution**: Requires manual script execution
5. **Not Docker-Friendly**: PowerShell scripts don't integrate with containers
6. **Seed Data Mixed with Schema**: Hard to separate structure from data

### Target State Benefits

✅ **Safe Migrations**: Only applies new changes, preserves data  
✅ **Version Tracking**: Full history of all schema changes  
✅ **Rollback Support**: Undo migrations with one command  
✅ **Docker Integration**: Automatic migrations on deployment  
✅ **Zero-Downtime**: Migrations run before app starts  
✅ **Team Collaboration**: Clear migration order, no conflicts  
✅ **Multi-Environment**: Same migrations for dev/test/staging/prod  

---

## Implementation Phases

### Phase 1: Preparation (Week 1)
- Install and configure Knex.js
- Create directory structure
- Set up configuration files
- Document migration conventions

**Deliverables:**
- `backend/knexfile.js` - Knex configuration
- `backend/migrations/` - Migration directory structure
- Updated `package.json` with migration scripts
- Developer documentation

### Phase 2: Migration Conversion (Weeks 2-3)
- Convert existing SQL schemas to Knex migrations
- Organize by product (core, nexus, paylinq, schedulehub, recruitiq)
- Separate schema from seed data
- Create migration templates

**Deliverables:**
- Core platform migrations (organizations, users, RBAC)
- Product-specific migrations (Nexus, PayLinQ, ScheduleHub, RecruitIQ)
- Deployment service migrations
- Seed data migrations

### Phase 3: Docker Integration (Week 4)
- Update Dockerfile to include migrations
- Create migration init container
- Update docker-compose files
- Create migration scripts

**Deliverables:**
- Updated `Dockerfile.backend`
- Migration init container in `docker-compose.production.yml`
- Migration execution scripts
- Health check integration

### Phase 4: Production Deployment (Week 5)
- Update deployment scripts
- Create rollback procedures
- Document production workflow
- Create monitoring and alerting

**Deliverables:**
- Updated `scripts/deploy.sh`
- Production migration procedures
- Rollback and recovery guide
- Monitoring setup

### Phase 5: Testing & Validation (Week 6)
- Test migrations on fresh database
- Test rollback procedures
- Validate data integrity
- Load testing with migrations

**Deliverables:**
- Test suite for migrations
- Migration validation scripts
- Performance benchmarks
- Documentation updates

---

## Migration File Structure

```
backend/
├── knexfile.js                    # Knex configuration
├── package.json                   # Migration scripts
├── migrations/                    # All migrations (timestamped)
│   ├── core/                      # Platform tables
│   │   ├── 20250122000001_create_organizations.js
│   │   ├── 20250122000002_create_licenses.js
│   │   ├── 20250122000003_create_users.js
│   │   ├── 20250122000004_create_rbac_system.js
│   │   ├── 20250122000005_create_features.js
│   │   └── 20250122000006_create_audit_logs.js
│   │
│   ├── products/                  # Product schemas
│   │   ├── nexus/                 # Nexus HRIS (15 tables)
│   │   │   ├── 20250122100001_create_nexus_core.js
│   │   │   ├── 20250122100002_create_nexus_hr.js
│   │   │   ├── 20250122100003_create_nexus_performance.js
│   │   │   ├── 20250122100004_create_nexus_benefits.js
│   │   │   ├── 20250122100005_create_nexus_documents.js
│   │   │   └── 20250122100006_create_nexus_attendance.js
│   │   │
│   │   ├── paylinq/               # PayLinQ Payroll (27 tables)
│   │   │   ├── 20250122200001_create_paylinq_core.js
│   │   │   ├── 20250122200002_create_paylinq_payroll.js
│   │   │   ├── 20250122200003_create_paylinq_components.js
│   │   │   ├── 20250122200004_create_paylinq_tax.js
│   │   │   ├── 20250122200005_create_paylinq_formula.js
│   │   │   └── 20250122200006_create_paylinq_payments.js
│   │   │
│   │   ├── schedulehub/           # ScheduleHub (16 tables)
│   │   │   ├── 20250122300001_create_schedulehub_core.js
│   │   │   ├── 20250122300002_create_schedulehub_shifts.js
│   │   │   ├── 20250122300003_create_schedulehub_demand.js
│   │   │   └── 20250122300004_create_schedulehub_marketplace.js
│   │   │
│   │   └── recruitiq/             # RecruitIQ ATS
│   │       ├── 20250122400001_create_recruitiq_jobs.js
│   │       ├── 20250122400002_create_recruitiq_candidates.js
│   │       └── 20250122400003_create_recruitiq_interviews.js
│   │
│   ├── deployment/                # Deployment service
│   │   └── 20250122600001_create_deployment_service.js
│   │
│   └── data/                      # Seed data as migrations
│       ├── 20250122900001_seed_rbac_platform.js
│       ├── 20250122900002_seed_admin_users.js
│       ├── 20250122900003_seed_products.js
│       ├── 20250122900004_seed_features.js
│       ├── 20250122900005_seed_formula_templates.js
│       ├── 20250122900006_seed_suriname_tax_rules.js
│       ├── 20250122900007_seed_payroll_run_types.js
│       ├── 20250122900008_seed_worker_types.js
│       ├── 20250122900009_seed_allowances.js
│       └── 20250122900010_seed_test_tenant.js
│
├── scripts/
│   └── migrations/
│       ├── run-migrations.sh      # Run pending migrations
│       ├── rollback.sh            # Rollback last batch
│       ├── status.sh              # Check migration status
│       └── validate.sh            # Validate migrations
│
└── tests/
    └── migrations/
        ├── migration-integrity.test.js
        └── rollback.test.js
```

---

## Naming Conventions

### Migration File Names

```
YYYYMMDDHHMMSS_descriptive_name.js

Examples:
20250122000001_create_organizations.js
20250122100001_create_nexus_employees.js
20250122200001_create_paylinq_payroll_runs.js
20250122900001_seed_rbac_platform.js
```

**Rules:**
1. **Timestamp**: YYYYMMDDhhmmss (sortable chronologically)
2. **Prefix by Category**:
   - `000xxx` - Core platform (organizations, users, RBAC)
   - `100xxx` - Nexus HRIS
   - `200xxx` - PayLinQ Payroll
   - `300xxx` - ScheduleHub
   - `400xxx` - RecruitIQ
   - `500xxx` - Reserved
   - `600xxx` - Deployment Service
   - `900xxx` - Seed data
3. **Action Verbs**: `create_`, `add_`, `alter_`, `drop_`, `seed_`
4. **Descriptive**: Clear what the migration does

### Table Naming Standards

From `DATABASE_STANDARDS.md`:
- **snake_case**: All tables and columns
- **Plural resource names**: `organizations`, `users`, `payroll_runs`
- **Schema-qualified**: `hris.user_account`, `payroll.payroll_runs`

---

## Migration Template Structure

### Schema Migration Template

```javascript
/**
 * Migration: Create Organizations Table
 * 
 * @description Creates the core organizations table for multi-tenant isolation
 * @author DevTeam
 * @date 2025-01-22
 */

export async function up(knex) {
  await knex.schema.createTable('organizations', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Business Columns
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.string('domain', 255).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    
    // Audit Columns (REQUIRED)
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index(['slug']);
    table.index(['is_active', 'deleted_at']);
  });
  
  // Add comments
  await knex.raw(`
    COMMENT ON TABLE organizations IS 'Multi-tenant organization records';
    COMMENT ON COLUMN organizations.slug IS 'URL-safe organization identifier';
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('organizations');
}
```

### Data Migration Template

```javascript
/**
 * Migration: Seed RBAC Platform Roles
 * 
 * @description Seeds platform-level roles and permissions
 * @author DevTeam
 * @date 2025-01-22
 */

export async function up(knex) {
  const platformRoles = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Super Admin',
      slug: 'super-admin',
      description: 'Full system access',
      is_platform_role: true,
      created_at: knex.fn.now()
    },
    // More roles...
  ];
  
  await knex('platform_roles').insert(platformRoles);
}

export async function down(knex) {
  await knex('platform_roles')
    .whereIn('slug', ['super-admin', 'license-admin', 'security-admin'])
    .del();
}
```

---

## Risk Assessment

### High Risk Areas

1. **Data Loss During Conversion**
   - **Risk**: Converting existing schemas incorrectly
   - **Mitigation**: Test on fresh database, backup production before migration

2. **Broken Foreign Keys**
   - **Risk**: Migration order causes FK constraint violations
   - **Mitigation**: Strict ordering, use transactions, test thoroughly

3. **Production Downtime**
   - **Risk**: Long-running migrations block deployment
   - **Mitigation**: Test migration speed, use blue-green deployment

4. **Failed Rollback**
   - **Risk**: Cannot undo migration in production
   - **Mitigation**: Test rollback in staging, keep database backups

### Medium Risk Areas

1. **Docker Build Time**
   - **Risk**: Including migrations increases build time
   - **Mitigation**: Multi-stage builds, optimize layers

2. **Team Adoption**
   - **Risk**: Developers continue using SQL scripts
   - **Mitigation**: Clear documentation, code reviews, CI checks

---

## Success Criteria

### Phase 1 Success
- [ ] Knex.js installed and configured
- [ ] Migration directory structure created
- [ ] Sample migration runs successfully
- [ ] Documentation complete

### Phase 2 Success
- [ ] All existing schemas converted to migrations
- [ ] Fresh database migrates successfully
- [ ] All seed data migrates successfully
- [ ] No manual SQL scripts required

### Phase 3 Success
- [ ] Docker builds include migrations
- [ ] Migrations run automatically on container start
- [ ] Health checks verify migration success
- [ ] Docker Compose tested locally

### Phase 4 Success
- [ ] Production deployment tested in staging
- [ ] Rollback procedures documented and tested
- [ ] Zero-downtime deployment verified
- [ ] Monitoring and alerting configured

### Phase 5 Success
- [ ] All tests passing
- [ ] Performance benchmarks acceptable
- [ ] Documentation complete
- [ ] Team trained on new workflow

---

## Timeline

```
Week 1: Preparation
  ├── Install Knex.js
  ├── Configure environments
  ├── Create directory structure
  └── Document conventions

Week 2-3: Migration Conversion
  ├── Convert core schemas
  ├── Convert product schemas
  ├── Convert seed data
  └── Test on fresh database

Week 4: Docker Integration
  ├── Update Dockerfile
  ├── Create init containers
  ├── Update docker-compose
  └── Test in Docker

Week 5: Production Deployment
  ├── Update deployment scripts
  ├── Test in staging
  ├── Create rollback procedures
  └── Document production workflow

Week 6: Testing & Validation
  ├── Integration tests
  ├── Performance tests
  ├── Rollback tests
  └── Final documentation
```

---

## Next Steps

1. **Review this plan** with the team
2. **Start Phase 1**: Install and configure Knex.js
3. **Create sample migration** to validate approach
4. **Convert one product** (e.g., RecruitIQ) as proof of concept
5. **Document lessons learned** before scaling to all products

---

## Related Documents

- [Phase 1: Preparation Guide](./PHASE1_PREPARATION.md)
- [Phase 2: Migration Conversion Guide](./PHASE2_CONVERSION.md)
- [Phase 3: Docker Integration Guide](./PHASE3_DOCKER.md)
- [Phase 4: Production Deployment Guide](./PHASE4_PRODUCTION.md)
- [Phase 5: Testing Guide](./PHASE5_TESTING.md)
- [Migration Templates](./TEMPLATES.md)
- [Rollback Procedures](./ROLLBACK_PROCEDURES.md)
- [FAQ](./FAQ.md)

---

## References

- **Knex.js Documentation**: https://knexjs.org/
- **Database Standards**: [../../DATABASE_STANDARDS.md](../DATABASE_STANDARDS.md)
- **Backend Standards**: [../../BACKEND_STANDARDS.md](../BACKEND_STANDARDS.md)
- **Testing Standards**: [../../TESTING_STANDARDS.md](../TESTING_STANDARDS.md)
