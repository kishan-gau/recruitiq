# Database Seeds

This directory contains all database seed files organized by feature/domain.

## 📂 Seed Files

### Platform Infrastructure

| File | Purpose | Run Order | Dependencies |
|------|---------|-----------|--------------|
| `seed-rbac-platform.sql` | Platform roles & permissions (Super Admin, License Admin, etc.) | 4 | RBAC migration |
| `seed-admin-users.sql` | Default platform admin users | 5 | RBAC platform |
| `seed-products.sql` | Product metadata (Nexus, PayLinQ, ScheduleHub, RecruitIQ) | 6 | Base schema |
| `seed-features.sql` | Feature flags & tier access | 7 | Products |

### Test Data

| File | Purpose | Run Order | Dependencies |
|------|---------|-----------|--------------|
| `seed-test-tenant.sql` | Test Company Ltd organization + 3 test users | 10 | All product schemas |

### PayLinQ (Payroll) Seeds

| File | Purpose | Run Order | Dependencies |
|------|---------|-----------|--------------|
| `seed-formula-templates.sql` | Payroll formula template library (14 templates) | 9 | PayLinQ schema |
| `seed-suriname-tax-rules.sql` | Suriname tax law (2023-2025) | 11 | PayLinQ schema |
| `seed-payroll-run-types.sql` | Payroll run type templates (7 types) | 12 | PayLinQ schema |
| `seed-worker-types.sql` | Employment type templates (7 types) | 13 | PayLinQ schema |
| `seed-allowances.sql` | Tax-free allowance caps (Surinamese law) | 14 | PayLinQ schema |
| `seed-vakantiegeld-components.sql` | Holiday allowance components | 15 | PayLinQ schema |

## 🔄 Execution Order

Seeds are executed in this order by `setup-database.ps1`:

```
1. Base schema (schema.sql)
2. Product schemas (nexus-hris-schema.sql, paylinq-schema.sql, etc.)
3. RBAC migration (20250122000000_create_centralized_rbac_system.sql)
4. seed-rbac-platform.sql      ← Platform roles
5. seed-admin-users.sql         ← Platform admins
6. seed-products.sql            ← Products metadata
7. seed-features.sql            ← Feature flags
8. seedFeatures.js (Node.js)    ← Dynamic features
9. seed-formula-templates.sql   ← Payroll formulas
10. seed-test-tenant.sql        ← Test organization
11. seed-suriname-tax-rules.sql ← Tax rules
12. seed-payroll-run-types.sql  ← Payroll types
13. seed-worker-types.sql       ← Employment types
14. seed-allowances.sql         ← Allowance caps
```

## 📝 Seed File Standards

### File Naming
- Prefix: `seed-`
- Kebab-case: `seed-feature-name.sql`
- Descriptive: Clearly indicates what is being seeded

### File Structure
```sql
-- ============================================================================
-- Seed [Feature Name]
-- Brief description of what this seeds
-- ============================================================================

-- Optional: Drop existing data (if re-running)
-- DELETE FROM table WHERE condition;

-- Insert seed data
INSERT INTO table (columns) VALUES (values)
ON CONFLICT (unique_column) DO NOTHING;  -- Idempotent!

-- Success messages
DO $$
BEGIN
  RAISE NOTICE '[OK] Feature seeded successfully!';
  RAISE NOTICE '[INFO] Additional information';
END $$;
```

### Best Practices

1. **Idempotent Operations**
   ```sql
   -- Always use ON CONFLICT DO NOTHING or DO UPDATE
   INSERT INTO table (...) VALUES (...) ON CONFLICT DO NOTHING;
   ```

2. **Success Messages**
   ```sql
   RAISE NOTICE '[OK] Success message';
   RAISE NOTICE '[INFO] Informational message';
   RAISE NOTICE '[WARNING] Warning message';
   ```

3. **Error Handling**
   ```sql
   DO $$
   BEGIN
     -- Seed logic here
   EXCEPTION WHEN OTHERS THEN
     RAISE NOTICE '[ERROR] Seeding failed: %', SQLERRM;
   END $$;
   ```

4. **Test Data Isolation**
   - Test data should be clearly marked
   - Use recognizable identifiers (e.g., "Test Company Ltd")
   - Document test credentials

## 🔐 Default Credentials

### Platform Admin Users (Portal Access)
Created by `seed-admin-users.sql`:

```
admin@recruitiq.com      → Super Administrator
license@recruitiq.com    → License Administrator
security@recruitiq.com   → Security Administrator

Password (all): Admin123!
```

### Test Tenant Users (App Access)
Created by `seed-test-tenant.sql`:

```
Organization: Test Company Ltd (test-company)

tenant@testcompany.com     → Owner (full access)
payroll@testcompany.com    → Payroll Manager
employee@testcompany.com   → Employee (self-service)

Password (all): Admin123!
```

⚠️ **IMPORTANT:** Change these passwords in production!

## 🎯 Adding New Seeds

### 1. Create Seed File
```powershell
# Create new seed file
New-Item -Path "backend/src/database/seeds/seed-my-feature.sql" -ItemType File
```

### 2. Write Seed Content
```sql
-- ============================================================================
-- Seed My Feature
-- Description of what this seeds
-- ============================================================================

DO $$
BEGIN
  -- Insert seed data
  INSERT INTO my_table (columns) VALUES (values)
  ON CONFLICT DO NOTHING;

  -- Success message
  RAISE NOTICE '[OK] My feature seeded successfully!';
END $$;
```

### 3. Add to Setup Script
Edit `setup-database.ps1`:

```powershell
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding my feature..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-my-feature.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding my feature" -ForegroundColor Red
    exit 1
}
```

### 4. Test
```powershell
cd backend/src/database
.\setup-database.ps1 -DBName recruitiq_test
```

## 🔍 Troubleshooting

### Seed Fails with "relation does not exist"
- **Cause:** Seed runs before required migration/schema
- **Fix:** Check execution order in `setup-database.ps1`

### Duplicate Key Errors
- **Cause:** Missing `ON CONFLICT` clause
- **Fix:** Add `ON CONFLICT (unique_column) DO NOTHING`

### Foreign Key Violations
- **Cause:** Referenced record doesn't exist yet
- **Fix:** Run dependent seeds first or add existence checks

### Seed Data Not Appearing
- **Cause:** May be in wrong schema or organization
- **Fix:** Check `organization_id` filters and schema qualifiers

## 📊 Seed Data Volumes

| Seed File | Records Created | Notes |
|-----------|----------------|-------|
| seed-rbac-platform.sql | 40+ permissions, 6 roles | Platform-wide |
| seed-admin-users.sql | 3 admin users | Platform users |
| seed-products.sql | 4 products + features | Platform metadata |
| seed-test-tenant.sql | 1 org + 3 users | Test organization |
| seed-suriname-tax-rules.sql | 13 rule sets, 38 brackets, 23 allowances | Per organization |
| seed-payroll-run-types.sql | 7 run types | Per organization |
| seed-worker-types.sql | 7 employment types | Per organization |
| seed-formula-templates.sql | 14 global templates | Platform-wide |
| seed-allowances.sql | 3 allowance caps | Per organization |

## 🏗️ Architecture Notes

### Schema Location
- **Platform Infrastructure:** `public` schema (organizations, products, RBAC)
- **Product Data:** Dedicated schemas (hris, payroll, scheduling, etc.)

### Tenant Isolation
- Platform seeds: `organization_id IS NULL`
- Tenant seeds: `organization_id = <org_uuid>`

### Idempotency
All seeds use `ON CONFLICT` clauses to allow re-running without errors.

---

**Last Updated:** November 22, 2025  
**Maintained by:** Backend Team  
**Related:** [SEEDS_REFACTORING.md](../SEEDS_REFACTORING.md)
