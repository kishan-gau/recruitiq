# Product Features System Migration Plan

**Document Version:** 1.0  
**Created:** November 9, 2025  
**Status:** Planning Phase  
**Target Completion:** February 2026 (3 months)

---

## Executive Summary

### Purpose
Migrate from the legacy `product_features` table and API system to the new comprehensive `features` and `organization_feature_grants` system.

### Why Migrate?
- **Legacy System Limitations**: Simple feature toggles without advanced capabilities
- **New System Advantages**: 
  - Granular feature grants per organization
  - Usage tracking and limits
  - Tier-based access control
  - Add-on feature purchases
  - Feature dependencies and conflicts
  - Rollout percentage for gradual releases
  - Billing integration
  - Multi-layer caching

### Migration Approach
**Zero-downtime migration** with backward compatibility layer during transition period.

### Timeline
- **Week 1-2**: Assessment & Data Migration
- **Week 2-3**: API Compatibility Layer
- **Week 3-4**: Frontend Migration
- **Week 5-12**: Deprecation Notice Period (60 days)
- **Week 13**: Final Removal

### Key Stakeholders
- Backend Engineering Team
- Frontend Engineering Team
- DevOps/Infrastructure Team
- Product Management
- QA Team

---

## Current State Analysis

### Legacy System Components

**Database:**
- Table: `product_features`
- 16 SQL references found in codebase

**Backend Code:**
- Controller: `backend/src/products/nexus/controllers/productFeatureController.js`
- Service: `backend/src/products/nexus/services/productFeatureService.js`
- Repository: `backend/src/products/nexus/repositories/productFeatureRepository.js`
- Model: `backend/src/products/nexus/models/ProductFeature.js`
- Routes: `backend/src/products/nexus/routes/productFeatureRoutes.js`

**API Endpoints (11 endpoints):**
```
GET    /api/products/:productId/features
GET    /api/products/:productId/features/available
GET    /api/products/:productId/features/stats
GET    /api/products/:productId/features/:featureKey
GET    /api/products/:productId/features/:featureKey/check
POST   /api/products/:productId/features
PATCH  /api/products/:productId/features/:featureKey
PATCH  /api/products/:productId/features/:featureKey/rollout
POST   /api/products/:productId/features/:featureKey/enable
POST   /api/products/:productId/features/:featureKey/disable
DELETE /api/products/:productId/features/:featureKey
```

**Frontend Usage:**
- Portal application product management pages
- Feature catalog UI components

### New System Components

**Database:**
- Table: `features` - Central feature registry linked to products
- Table: `organization_feature_grants` - Granular feature access control

**Backend Code:**
- Repository: `backend/src/repositories/FeatureRepository.js` ✅ Tested
- Repository: `backend/src/repositories/FeatureGrantRepository.js` ✅ Tested
- Service: `backend/src/services/FeatureAccessService.js` ✅ Tested

**API Endpoints:**
```
GET    /api/features
POST   /api/admin/features
GET    /api/admin/features/:id
PATCH  /api/admin/features/:id
DELETE /api/admin/features/:id
```

**Test Coverage:**
- ✅ `FeatureRepository.test.js` - Comprehensive unit tests
- ✅ `FeatureGrantRepository.test.js` - Comprehensive unit tests
- ✅ `FeatureAccessService.test.js` - Comprehensive unit tests
- ✅ `license-restrictions.test.js` - Integration tests

---

## Phase 1: Assessment & Data Audit

**Duration:** 1-2 days  
**Owner:** Backend Engineering Team  
**Risk Level:** Low

### Objectives
1. Understand existing data in `product_features` table
2. Identify all consumers of old API endpoints
3. Validate data compatibility with new system
4. Create data migration mapping

### Tasks

#### 1.1 Database Data Audit

**Run Audit Queries:**

```sql
-- Check total records in product_features
SELECT COUNT(*) as total_features FROM product_features;

-- Check features per product
SELECT 
  p.name as product_name,
  p.slug as product_slug,
  COUNT(*) as feature_count,
  COUNT(CASE WHEN pf.status = 'stable' THEN 1 END) as stable_count,
  COUNT(CASE WHEN pf.status = 'beta' THEN 1 END) as beta_count,
  COUNT(CASE WHEN pf.status = 'deprecated' THEN 1 END) as deprecated_count
FROM product_features pf
JOIN products p ON pf.product_id = p.id
GROUP BY p.id, p.name, p.slug
ORDER BY p.name;

-- List all features with details
SELECT 
  p.name as product_name,
  pf.feature_key,
  pf.feature_name,
  pf.status,
  pf.is_default,
  pf.min_tier,
  pf.rollout_percentage,
  pf.created_at
FROM product_features pf
JOIN products p ON pf.product_id = p.id
ORDER BY p.name, pf.feature_key;

-- Check for features NOT in new system
SELECT 
  p.name as product_name,
  pf.feature_key,
  pf.feature_name,
  pf.status,
  'MISSING IN NEW SYSTEM' as migration_status
FROM product_features pf
JOIN products p ON pf.product_id = p.id
LEFT JOIN features f ON (f.product_id = pf.product_id AND f.feature_key = pf.feature_key)
WHERE f.id IS NULL;

-- Check for duplicate feature keys (should not exist)
SELECT 
  product_id,
  feature_key,
  COUNT(*) as duplicate_count
FROM product_features
GROUP BY product_id, feature_key
HAVING COUNT(*) > 1;
```

**Output to File:**

```bash
# Run queries and save results
cd c:\RecruitIQ\backend
node -e "
const pool = require('./src/config/database.js');
const fs = require('fs');

async function auditData() {
  const results = {};
  
  // Run each query and save results
  results.totalCount = await pool.query('SELECT COUNT(*) FROM product_features');
  results.perProduct = await pool.query('...');
  
  fs.writeFileSync('migration-audit.json', JSON.stringify(results, null, 2));
  console.log('Audit complete - see migration-audit.json');
  
  await pool.end();
}

auditData().catch(console.error);
"
```

#### 1.2 API Usage Analysis

**Analyze API Logs:**

```powershell
# Check last 30 days of logs for old endpoint usage
cd c:\RecruitIQ\backend
Get-ChildItem logs -Filter "*.log" | 
  Select-String -Pattern "/api/products/.*/features" | 
  Group-Object Pattern | 
  Select-Object Count, Name | 
  Sort-Object Count -Descending | 
  Out-File migration-api-usage.txt

# Detailed analysis with timestamps
Get-ChildItem logs -Filter "*.log" | 
  Select-String -Pattern "/api/products/.*/features" |
  ForEach-Object {
    [PSCustomObject]@{
      Timestamp = $_.Line.Substring(0, 24)
      Endpoint = ($_.Line -replace '.*(/api/products/[^/]+/features[^\s]*).*', '$1')
      Method = ($_.Line -replace '.*"(GET|POST|PATCH|DELETE).*', '$1')
    }
  } | 
  Export-Csv migration-endpoint-usage.csv -NoTypeInformation
```

**Check Frontend Code:**

```bash
# Search Portal code for old API usage
cd c:\RecruitIQ\apps\portal
Select-String -Path "src\**\*.{js,jsx,ts,tsx}" -Pattern "/products/.*/features" -List

# List files that need updating
Select-String -Path "src\**\*.{js,jsx,ts,tsx}" -Pattern "getProductFeatures|createFeature|updateFeature" -List
```

#### 1.3 Data Compatibility Verification

**Check Schema Compatibility:**

```sql
-- Compare schemas
SELECT 
  'product_features' as source_table,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'product_features'
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 
  'features' as target_table,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'features'
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Create Mapping Document:**

| product_features Column | features Column | Mapping Notes |
|------------------------|----------------|---------------|
| id | id | New UUID generated |
| product_id | product_id | Direct mapping |
| feature_key | feature_key | Direct mapping |
| feature_name | feature_name | Direct mapping |
| description | description | Direct mapping |
| status | status | Direct mapping |
| is_default | is_add_on | Inverse (NOT is_default) |
| min_tier | min_tier | Direct mapping |
| requires_features | required_features | Renamed field |
| config_schema | config_schema | Direct mapping |
| default_config | default_config | Direct mapping |
| rollout_percentage | rollout_percentage | Direct mapping |
| target_organizations | target_organizations | Direct mapping |
| created_at | created_at | Direct mapping |
| updated_at | updated_at | Direct mapping |
| created_by | created_by | Direct mapping |
| N/A | category | Default: 'general' |
| N/A | deprecated_at | NULL |
| N/A | deprecation_message | NULL |
| N/A | pricing | Default: {} |
| N/A | conflicting_features | Default: [] |
| N/A | has_usage_limit | Default: FALSE |
| N/A | default_usage_limit | NULL |
| N/A | usage_limit_unit | NULL |

### Deliverables

- [ ] `migration-audit.json` - Complete data inventory
- [ ] `migration-api-usage.txt` - API endpoint usage statistics
- [ ] `migration-endpoint-usage.csv` - Detailed endpoint access logs
- [ ] `migration-frontend-files.txt` - List of frontend files to update
- [ ] `migration-data-mapping.md` - Field mapping documentation
- [ ] Assessment report with recommendations

### Success Criteria

- ✅ All data in `product_features` catalogued
- ✅ All API consumers identified
- ✅ Data mapping validated
- ✅ No blocking issues identified
- ✅ Go/No-Go decision made

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Unknown API consumers | High | Extended monitoring period |
| Incompatible data types | Medium | Manual data cleanup before migration |
| Large dataset | Low | Batch migration with checkpoints |

---

## Phase 2: Data Migration

**Duration:** 2-3 days  
**Owner:** Backend Engineering + Database Team  
**Risk Level:** Medium

### Objectives
1. Migrate all data from `product_features` to `features` table
2. Preserve data integrity and relationships
3. Create rollback mechanism
4. Validate migration success

### Tasks

#### 2.1 Create Migration Script

**File:** `backend/scripts/migrations/001-migrate-product-features.sql`

```sql
-- ============================================================================
-- Migration: product_features → features
-- Date: 2025-11-09
-- Author: Engineering Team
-- Purpose: Migrate legacy product_features to new features system
-- ============================================================================

-- Start transaction for safety
BEGIN;

-- Create backup of current state
CREATE TABLE IF NOT EXISTS product_features_backup_20251109 AS 
SELECT *, NOW() as backup_created_at FROM product_features;

CREATE TABLE IF NOT EXISTS features_backup_20251109 AS 
SELECT *, NOW() as backup_created_at FROM features;

-- Log pre-migration counts
DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count FROM product_features;
  SELECT COUNT(*) INTO new_count FROM features;
  
  RAISE NOTICE 'Pre-migration: product_features = %, features = %', old_count, new_count;
END $$;

-- ============================================================================
-- Main Migration
-- ============================================================================

-- Insert features from product_features that don't exist in features table
INSERT INTO features (
  id,
  product_id,
  feature_key,
  feature_name,
  description,
  category,
  status,
  deprecated_at,
  deprecation_message,
  min_tier,
  is_add_on,
  pricing,
  required_features,
  conflicting_features,
  config_schema,
  default_config,
  has_usage_limit,
  default_usage_limit,
  usage_limit_unit,
  rollout_percentage,
  target_organizations,
  created_at,
  updated_at,
  created_by
)
SELECT 
  uuid_generate_v4(),                                    -- new UUID
  pf.product_id,                                         -- direct
  pf.feature_key,                                        -- direct
  pf.feature_name,                                       -- direct
  pf.description,                                        -- direct
  'general'::VARCHAR(100),                               -- default category
  pf.status,                                             -- direct
  NULL::TIMESTAMPTZ,                                     -- no deprecation date
  NULL::TEXT,                                            -- no deprecation message
  pf.min_tier,                                           -- direct
  (pf.is_default = FALSE)::BOOLEAN,                      -- inverse logic
  '{}'::JSONB,                                           -- empty pricing
  COALESCE(pf.requires_features, '[]'::JSONB),          -- renamed field
  '[]'::JSONB,                                           -- no conflicts
  COALESCE(pf.config_schema, '{}'::JSONB),              -- direct
  COALESCE(pf.default_config, '{}'::JSONB),             -- direct
  FALSE::BOOLEAN,                                        -- no usage limit
  NULL::INTEGER,                                         -- no default limit
  NULL::VARCHAR(50),                                     -- no limit unit
  COALESCE(pf.rollout_percentage, 100),                 -- default 100%
  COALESCE(pf.target_organizations, '[]'::JSONB),       -- direct
  pf.created_at,                                         -- direct
  pf.updated_at,                                         -- direct
  pf.created_by                                          -- direct
FROM product_features pf
LEFT JOIN features f ON (
  f.product_id = pf.product_id 
  AND f.feature_key = pf.feature_key
)
WHERE f.id IS NULL                                       -- only insert new ones
  AND pf.product_id IS NOT NULL;                        -- ensure valid product

-- Log migration results
DO $$
DECLARE
  migrated_count INTEGER;
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count FROM product_features;
  SELECT COUNT(*) INTO new_count FROM features;
  
  -- Count how many were migrated (features that match product_features)
  SELECT COUNT(*) INTO migrated_count
  FROM product_features pf
  INNER JOIN features f ON (
    f.product_id = pf.product_id 
    AND f.feature_key = pf.feature_key
  );
  
  RAISE NOTICE 'Post-migration: product_features = %, features = %, migrated = %', 
    old_count, new_count, migrated_count;
END $$;

-- ============================================================================
-- Validation Queries
-- ============================================================================

-- Check for any features that failed to migrate
SELECT 
  p.name as product_name,
  pf.feature_key,
  pf.feature_name,
  'FAILED TO MIGRATE' as status
FROM product_features pf
JOIN products p ON pf.product_id = p.id
LEFT JOIN features f ON (
  f.product_id = pf.product_id 
  AND f.feature_key = pf.feature_key
)
WHERE f.id IS NULL;

-- Verify feature counts per product match
SELECT 
  p.name as product_name,
  COUNT(DISTINCT pf.feature_key) as old_system_count,
  COUNT(DISTINCT f.feature_key) as new_system_count,
  CASE 
    WHEN COUNT(DISTINCT pf.feature_key) = COUNT(DISTINCT f.feature_key) 
    THEN 'MATCH' 
    ELSE 'MISMATCH' 
  END as validation_status
FROM product_features pf
JOIN products p ON pf.product_id = p.id
LEFT JOIN features f ON (
  f.product_id = pf.product_id 
  AND f.feature_key = pf.feature_key
)
GROUP BY p.id, p.name
ORDER BY p.name;

-- Show sample of migrated features for manual verification
SELECT 
  p.name as product_name,
  f.feature_key,
  f.feature_name,
  f.status,
  f.category,
  f.is_add_on,
  f.min_tier
FROM features f
JOIN products p ON f.product_id = p.id
WHERE f.created_at >= (NOW() - INTERVAL '1 hour')
ORDER BY p.name, f.feature_key
LIMIT 20;

-- If validation looks good, COMMIT
-- If any issues, ROLLBACK
COMMIT;

-- After successful commit, create migration log entry
INSERT INTO schema_migrations (version, description, executed_at)
VALUES ('001', 'Migrate product_features to features table', NOW());
```

#### 2.2 Create Rollback Script

**File:** `backend/scripts/migrations/001-rollback-product-features.sql`

```sql
-- ============================================================================
-- Rollback: features → product_features
-- Date: 2025-11-09
-- Purpose: Rollback migration if issues discovered
-- ============================================================================

BEGIN;

-- Delete features that were migrated
DELETE FROM features f
WHERE EXISTS (
  SELECT 1 FROM product_features pf
  WHERE pf.product_id = f.product_id
    AND pf.feature_key = f.feature_key
);

-- Restore from backup if needed
-- (Only use if backups exist and migration went very wrong)
-- DELETE FROM features;
-- INSERT INTO features SELECT * FROM features_backup_20251109 WHERE backup_created_at IS NOT NULL;

-- Log rollback
RAISE NOTICE 'Rollback completed';

-- Remove migration log entry
DELETE FROM schema_migrations WHERE version = '001';

COMMIT;
```

#### 2.3 Testing on Development Environment

**Steps:**

```bash
# 1. Backup development database
cd c:\RecruitIQ\backend
psql -U postgres -d recruitiq_dev -c "
  CREATE DATABASE recruitiq_dev_backup_20251109 
  WITH TEMPLATE recruitiq_dev;
"

# 2. Run migration
psql -U postgres -d recruitiq_dev -f scripts/migrations/001-migrate-product-features.sql

# 3. Run validation queries
psql -U postgres -d recruitiq_dev -c "
  SELECT COUNT(*) as features_count FROM features;
  SELECT COUNT(*) as product_features_count FROM product_features;
"

# 4. Test application
npm run dev

# 5. Run test suite
npm test

# 6. If issues found, rollback
psql -U postgres -d recruitiq_dev -f scripts/migrations/001-rollback-product-features.sql
```

#### 2.4 Testing on Staging Environment

**Pre-Migration Checklist:**
- [ ] Database backup completed
- [ ] Migration script reviewed by 2+ engineers
- [ ] Rollback script tested
- [ ] Monitoring dashboard prepared
- [ ] Stakeholders notified

**Execution Steps:**

```bash
# 1. Create backup
pg_dump -U postgres -h staging-db.example.com -d recruitiq_staging > \
  recruitiq_staging_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migration with monitoring
psql -U postgres -h staging-db.example.com -d recruitiq_staging \
  -f scripts/migrations/001-migrate-product-features.sql | \
  tee migration-staging-output.log

# 3. Validate
psql -U postgres -h staging-db.example.com -d recruitiq_staging \
  -f scripts/migrations/001-validate-migration.sql

# 4. Test API endpoints
curl -X GET "https://staging-api.example.com/api/features" | jq .
curl -X GET "https://staging-api.example.com/api/products/nexus-id/features" | jq .

# 5. Run automated tests
npm run test:integration
npm run test:e2e
```

**Post-Migration Validation:**
- [ ] Feature counts match between tables
- [ ] No NULL product_ids in features table
- [ ] All feature_keys unique per product
- [ ] API endpoints return correct data
- [ ] Portal UI loads correctly
- [ ] No errors in application logs
- [ ] Performance benchmarks met

#### 2.5 Production Migration

**Migration Window:** Off-peak hours (e.g., Sunday 2 AM - 4 AM)

**Team Required:**
- Database Administrator (on-call)
- Backend Engineer (on-call)
- DevOps Engineer (on-call)
- QA Engineer (monitoring)

**Execution Checklist:**

```markdown
Pre-Migration (T-1 hour):
- [ ] Announce maintenance window to users
- [ ] Enable read-only mode (if possible)
- [ ] Take full database backup
- [ ] Verify backup integrity
- [ ] Team in position on video call

Migration (T-0):
- [ ] Begin transaction
- [ ] Run migration script
- [ ] Review validation output
- [ ] Check for errors
- [ ] Verify row counts
- [ ] Sample data spot-checks
- [ ] Commit transaction (if all checks pass)

Post-Migration (T+30 minutes):
- [ ] Restart application servers
- [ ] Run smoke tests
- [ ] Check API endpoints
- [ ] Monitor error logs
- [ ] Test Portal UI
- [ ] Verify feature access
- [ ] Monitor database performance
- [ ] Announce completion

Rollback Decision Point (T+1 hour):
- [ ] If issues persist, execute rollback
- [ ] If stable, proceed to Phase 3
```

### Deliverables

- [ ] `001-migrate-product-features.sql` - Migration script
- [ ] `001-rollback-product-features.sql` - Rollback script
- [ ] `001-validate-migration.sql` - Validation queries
- [ ] `migration-staging-output.log` - Staging migration log
- [ ] `migration-production-output.log` - Production migration log
- [ ] Migration completion report

### Success Criteria

- ✅ All features migrated without data loss
- ✅ Validation queries pass 100%
- ✅ No application errors
- ✅ Performance within acceptable range
- ✅ Rollback script tested and ready

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data corruption | Critical | Transaction-based migration + backups |
| Long migration time | High | Optimize queries, off-peak window |
| Unique constraint violations | Medium | Pre-migration duplicate detection |
| Application downtime | Medium | Read-only mode during migration |

---

## Phase 3: API Compatibility Layer

**Duration:** 3-4 days  
**Owner:** Backend Engineering Team  
**Risk Level:** Medium

### Objectives
1. Create compatibility service to route old API calls to new system
2. Maintain backward compatibility during transition
3. Add deprecation warnings and headers
4. Enable monitoring of legacy endpoint usage

### Tasks

#### 3.1 Create Compatibility Service

**File:** `backend/src/services/ProductFeatureCompatibilityService.js`

```javascript
/**
 * Product Feature Compatibility Service
 * 
 * Provides backward compatibility for legacy product_features API
 * Routes old API calls to new features system
 * 
 * @deprecated This service exists only for backward compatibility
 * Will be removed after deprecation period (January 2026)
 */

import FeatureRepository from '../repositories/FeatureRepository.js';
import FeatureGrantRepository from '../repositories/FeatureGrantRepository.js';
import logger from '../utils/logger.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

export class ProductFeatureCompatibilityService {
  constructor() {
    this.featureRepo = new FeatureRepository();
    this.grantRepo = new FeatureGrantRepository();
    this.logger = logger;
    
    this.logger.warn(
      'ProductFeatureCompatibilityService initialized - ' +
      'this is a deprecated compatibility layer'
    );
  }

  /**
   * Log deprecation warning
   * @private
   */
  _logDeprecation(method, newMethod) {
    this.logger.warn({
      message: 'Deprecated API method called',
      deprecatedMethod: method,
      replacement: newMethod,
      sunsetDate: '2026-01-01',
      stack: new Error().stack
    });
  }

  /**
   * Get all features for a product
   * @deprecated Use FeatureRepository.findByProduct() directly
   */
  async getProductFeatures(productId, filters = {}) {
    this._logDeprecation(
      'getProductFeatures',
      'FeatureRepository.findByProduct()'
    );

    return await this.featureRepo.findByProduct(productId, filters);
  }

  /**
   * Get single feature
   * @deprecated Use FeatureRepository.findByKey() directly
   */
  async getFeature(productId, featureKey) {
    this._logDeprecation(
      'getFeature',
      'FeatureRepository.findByKey()'
    );

    const feature = await this.featureRepo.findByKey(productId, featureKey);
    if (!feature) {
      throw new NotFoundError(`Feature '${featureKey}' not found for product '${productId}'`);
    }

    return feature;
  }

  /**
   * Get default features
   * @deprecated Use FeatureRepository.findByProduct() with filters
   */
  async getDefaultFeatures(productId) {
    this._logDeprecation(
      'getDefaultFeatures',
      'FeatureRepository.findByProduct({ isAddOn: false })'
    );

    return await this.featureRepo.findByProduct(productId, { isAddOn: false });
  }

  /**
   * Get features by status
   * @deprecated Use FeatureRepository.findByProduct() with filters
   */
  async getFeaturesByStatus(productId, status) {
    this._logDeprecation(
      'getFeaturesByStatus',
      'FeatureRepository.findByProduct({ status })'
    );

    return await this.featureRepo.findByProduct(productId, { status });
  }

  /**
   * Get available features for organization tier
   * @deprecated Use FeatureRepository.findByProduct() with tier filter
   */
  async getAvailableFeatures(productId, tier) {
    this._logDeprecation(
      'getAvailableFeatures',
      'FeatureRepository.findByProduct({ minTier: tier })'
    );

    // Tier hierarchy
    const tierOrder = { starter: 1, professional: 2, enterprise: 3 };
    const tierLevel = tierOrder[tier] || 0;

    const allFeatures = await this.featureRepo.findByProduct(productId);
    
    return allFeatures.filter(feature => {
      const featureTierLevel = tierOrder[feature.minTier] || 0;
      return featureTierLevel <= tierLevel;
    });
  }

  /**
   * Check if feature is available
   * @deprecated Use FeatureAccessService.hasFeature()
   */
  async isFeatureAvailable(productId, featureKey, organizationId, tier) {
    this._logDeprecation(
      'isFeatureAvailable',
      'FeatureAccessService.hasFeature()'
    );

    const feature = await this.featureRepo.findByKey(productId, featureKey);
    if (!feature) return false;

    // Check tier requirement
    const tierOrder = { starter: 1, professional: 2, enterprise: 3 };
    const orgTierLevel = tierOrder[tier] || 0;
    const requiredTierLevel = tierOrder[feature.minTier] || 0;

    if (requiredTierLevel > orgTierLevel) return false;

    // Check if organization has grant
    if (organizationId) {
      const grant = await this.grantRepo.findActiveGrantByKey(
        organizationId,
        featureKey,
        productId
      );
      return !!grant;
    }

    return true;
  }

  /**
   * Get feature statistics
   * @deprecated Use FeatureRepository methods with aggregation
   */
  async getFeatureStats(productId) {
    this._logDeprecation(
      'getFeatureStats',
      'Custom aggregation on FeatureRepository'
    );

    const allFeatures = await this.featureRepo.findByProduct(productId);

    return {
      total: allFeatures.length,
      byStatus: {
        alpha: allFeatures.filter(f => f.status === 'alpha').length,
        beta: allFeatures.filter(f => f.status === 'beta').length,
        stable: allFeatures.filter(f => f.status === 'stable').length,
        deprecated: allFeatures.filter(f => f.status === 'deprecated').length,
        disabled: allFeatures.filter(f => f.status === 'disabled').length,
      },
      byTier: {
        starter: allFeatures.filter(f => f.minTier === 'starter').length,
        professional: allFeatures.filter(f => f.minTier === 'professional').length,
        enterprise: allFeatures.filter(f => f.minTier === 'enterprise').length,
      },
      addOns: allFeatures.filter(f => f.isAddOn).length,
    };
  }

  /**
   * Create feature
   * @deprecated Use FeatureRepository.create() directly
   */
  async createFeature(featureData, userId) {
    this._logDeprecation(
      'createFeature',
      'FeatureRepository.create()'
    );

    // Validate required fields
    if (!featureData.productId || !featureData.featureKey || !featureData.featureName) {
      throw new ValidationError('Missing required fields: productId, featureKey, featureName');
    }

    return await this.featureRepo.create(featureData);
  }

  /**
   * Update feature
   * @deprecated Use FeatureRepository.update() directly
   */
  async updateFeature(productId, featureKey, updateData, userId) {
    this._logDeprecation(
      'updateFeature',
      'FeatureRepository.update()'
    );

    const feature = await this.featureRepo.findByKey(productId, featureKey);
    if (!feature) {
      throw new NotFoundError(`Feature '${featureKey}' not found`);
    }

    return await this.featureRepo.update(feature.id, updateData);
  }

  /**
   * Update rollout percentage
   * @deprecated Use FeatureRepository.update() directly
   */
  async updateRollout(productId, featureKey, rolloutPercentage, userId) {
    this._logDeprecation(
      'updateRollout',
      'FeatureRepository.update({ rolloutPercentage })'
    );

    return await this.updateFeature(productId, featureKey, { rolloutPercentage }, userId);
  }

  /**
   * Enable feature
   * @deprecated Use FeatureRepository.update({ status: 'stable' })
   */
  async enableFeature(productId, featureKey, userId) {
    this._logDeprecation(
      'enableFeature',
      'FeatureRepository.update({ status: "stable" })'
    );

    return await this.updateFeature(productId, featureKey, { status: 'stable' }, userId);
  }

  /**
   * Disable feature
   * @deprecated Use FeatureRepository.update({ status: 'disabled' })
   */
  async disableFeature(productId, featureKey, userId) {
    this._logDeprecation(
      'disableFeature',
      'FeatureRepository.update({ status: "disabled" })'
    );

    return await this.updateFeature(productId, featureKey, { status: 'disabled' }, userId);
  }

  /**
   * Delete feature
   * @deprecated Use FeatureRepository.delete() directly
   */
  async deleteFeature(productId, featureKey, userId) {
    this._logDeprecation(
      'deleteFeature',
      'FeatureRepository.delete()'
    );

    const feature = await this.featureRepo.findByKey(productId, featureKey);
    if (!feature) {
      throw new NotFoundError(`Feature '${featureKey}' not found`);
    }

    await this.featureRepo.delete(feature.id);
  }
}

export default new ProductFeatureCompatibilityService();
```

#### 3.2 Update Product Feature Controller

**File:** `backend/src/products/nexus/controllers/productFeatureController.js`

```javascript
/**
 * Product Feature Controller
 * 
 * @deprecated This controller exists only for backward compatibility
 * Use FeatureController (/api/features) instead
 * Sunset date: January 1, 2026
 */

import productFeatureCompatService from '../../../services/ProductFeatureCompatibilityService.js';

class ProductFeatureController {
  constructor() {
    this.compatService = productFeatureCompatService;
  }

  /**
   * Add deprecation headers to response
   * @private
   */
  _addDeprecationHeaders(res, alternateEndpoint) {
    res.set({
      'Warning': '299 - "This API endpoint is deprecated and will be removed on 2026-01-01"',
      'Deprecation': 'true',
      'Sunset': 'Wed, 01 Jan 2026 00:00:00 GMT',
      'Link': `<${alternateEndpoint}>; rel="alternate"`,
      'X-API-Deprecated': 'true',
      'X-API-Sunset-Date': '2026-01-01',
      'X-API-Migration-Guide': 'https://docs.example.com/api-migration'
    });
  }

  /**
   * GET /api/products/:productId/features
   * @deprecated Use GET /api/features?productId={id}
   */
  async getProductFeatures(req, res) {
    try {
      this._addDeprecationHeaders(res, `/api/features?productId=${req.params.productId}`);
      
      const { productId } = req.params;
      const { status, tier } = req.query;

      let features;
      if (status) {
        features = await this.compatService.getFeaturesByStatus(productId, status);
      } else if (tier) {
        features = await this.compatService.getAvailableFeatures(productId, tier);
      } else {
        features = await this.compatService.getProductFeatures(productId);
      }

      res.json({
        features,
        _deprecation: {
          message: 'This endpoint is deprecated',
          sunsetDate: '2026-01-01',
          alternateEndpoint: `/api/features?productId=${productId}`,
          migrationGuide: 'https://docs.example.com/api-migration'
        }
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * GET /api/products/:productId/features/:featureKey
   * @deprecated Use GET /api/features/{id}
   */
  async getFeature(req, res) {
    try {
      this._addDeprecationHeaders(res, `/api/features/{id}`);
      
      const { productId, featureKey } = req.params;
      const feature = await this.compatService.getFeature(productId, featureKey);

      res.json({
        feature,
        _deprecation: {
          message: 'This endpoint is deprecated',
          sunsetDate: '2026-01-01',
          alternateEndpoint: `/api/features/{id}`,
          migrationGuide: 'https://docs.example.com/api-migration'
        }
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  // ... similar updates for all other methods
  // Each adds deprecation headers and routes to compatibility service
}

export default new ProductFeatureController();
```

#### 3.3 Add Deprecation Monitoring

**File:** `backend/src/middleware/deprecationMonitor.js`

```javascript
/**
 * Deprecation Monitoring Middleware
 * Tracks usage of deprecated API endpoints
 */

import logger from '../utils/logger.js';

export function trackDeprecatedEndpoint(req, res, next) {
  // Check if this is a deprecated endpoint
  const deprecatedEndpoints = [
    { pattern: /^\/api\/products\/[^/]+\/features/, replacement: '/api/features' },
  ];

  const match = deprecatedEndpoints.find(endpoint => 
    endpoint.pattern.test(req.path)
  );

  if (match) {
    // Log to monitoring system
    logger.warn({
      type: 'deprecated_api_usage',
      endpoint: req.path,
      method: req.method,
      replacement: match.replacement,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      organizationId: req.user?.organizationId,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    // Optionally send to external monitoring (DataDog, New Relic, etc.)
    // metrics.increment('api.deprecated.calls', 1, {
    //   endpoint: req.path,
    //   method: req.method
    // });
  }

  next();
}
```

**Register in server.js:**

```javascript
// backend/src/server.js
import { trackDeprecatedEndpoint } from './middleware/deprecationMonitor.js';

// Add after authentication middleware
app.use('/api', authenticate, trackDeprecatedEndpoint);
```

### Deliverables

- [ ] `ProductFeatureCompatibilityService.js` - Compatibility service
- [ ] Updated `productFeatureController.js` - With deprecation headers
- [ ] `deprecationMonitor.js` - Monitoring middleware
- [ ] Unit tests for compatibility service
- [ ] Integration tests for deprecated endpoints
- [ ] API migration guide documentation

### Success Criteria

- ✅ All old endpoints work via compatibility layer
- ✅ Deprecation warnings logged
- ✅ Deprecation headers present in responses
- ✅ Monitoring captures usage statistics
- ✅ No breaking changes for existing clients
- ✅ Tests pass for both old and new APIs

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Compatibility bugs | High | Comprehensive testing, gradual rollout |
| Performance degradation | Medium | Monitor latency, optimize if needed |
| Incomplete compatibility | Medium | Test all endpoint variations |

---

## Phase 4: Frontend Migration

**Duration:** 3-5 days  
**Owner:** Frontend Engineering Team  
**Risk Level:** Medium

### Objectives
1. Update Portal application to use new API endpoints
2. Update API service layer
3. Test all feature management UI flows
4. Deploy to staging and production

### Tasks

#### 4.1 Update API Service Layer

**File:** `apps/portal/src/services/apiService.js` (or similar)

**Before:**
```javascript
// OLD API calls
async getProductFeatures(productId) {
  const response = await api.get(`/products/${productId}/features`);
  return response.data;
}

async createFeature(productId, featureData) {
  const response = await api.post(`/products/${productId}/features`, featureData);
  return response.data;
}

async updateFeature(productId, featureKey, updateData) {
  const response = await api.patch(
    `/products/${productId}/features/${featureKey}`,
    updateData
  );
  return response.data;
}

async deleteFeature(productId, featureKey) {
  await api.delete(`/products/${productId}/features/${featureKey}`);
}
```

**After:**
```javascript
// NEW API calls
async getProductFeatures(productId, filters = {}) {
  const params = new URLSearchParams({ productId, ...filters });
  const response = await api.get(`/features?${params}`);
  return response.data;
}

async getFeature(featureId) {
  const response = await api.get(`/admin/features/${featureId}`);
  return response.data;
}

async createFeature(featureData) {
  const response = await api.post('/admin/features', featureData);
  return response.data;
}

async updateFeature(featureId, updateData) {
  const response = await api.patch(`/admin/features/${featureId}`, updateData);
  return response.data;
}

async deleteFeature(featureId) {
  await api.delete(`/admin/features/${featureId}`);
}

async deprecateFeature(featureId, message) {
  const response = await api.post(`/admin/features/${featureId}/deprecate`, {
    deprecationMessage: message
  });
  return response.data;
}

async getFeatureOrganizations(featureId, options = {}) {
  const params = new URLSearchParams(options);
  const response = await api.get(`/admin/features/${featureId}/organizations?${params}`);
  return response.data;
}

async getFeatureAnalytics(featureId, options = {}) {
  const params = new URLSearchParams(options);
  const response = await api.get(`/admin/features/${featureId}/analytics?${params}`);
  return response.data;
}
```

#### 4.2 Update Feature Management Components

**Files to Update:**
- `apps/portal/src/pages/features/FeatureCatalog.jsx`
- `apps/portal/src/pages/features/FeatureDetail.jsx`
- `apps/portal/src/pages/features/FeatureForm.jsx`
- `apps/portal/src/pages/products/ProductManagement.jsx`
- `apps/portal/src/pages/products/ProductDetail.jsx`

**Example Update - FeatureCatalog.jsx:**

```javascript
// Before
const fetchFeatures = async () => {
  try {
    setLoading(true);
    const data = await apiService.getProductFeatures(selectedProduct);
    setFeatures(data.features);
  } catch (error) {
    toast.error('Failed to load features');
  } finally {
    setLoading(false);
  }
};

// After
const fetchFeatures = async () => {
  try {
    setLoading(true);
    const filters = {
      productId: selectedProduct,
      status: selectedStatus,
      category: selectedCategory
    };
    const data = await apiService.getProductFeatures(selectedProduct, filters);
    setFeatures(data.features);
  } catch (error) {
    toast.error('Failed to load features');
    console.error('Feature fetch error:', error);
  } finally {
    setLoading(false);
  }
};
```

**Example Update - FeatureForm.jsx:**

```javascript
// Before
const handleSubmit = async (formData) => {
  try {
    if (isEditing) {
      await apiService.updateFeature(
        feature.productId,
        feature.featureKey,
        formData
      );
    } else {
      await apiService.createFeature(selectedProduct, formData);
    }
    toast.success(`Feature ${isEditing ? 'updated' : 'created'} successfully`);
    onSuccess();
  } catch (error) {
    toast.error(`Failed to ${isEditing ? 'update' : 'create'} feature`);
  }
};

// After
const handleSubmit = async (formData) => {
  try {
    if (isEditing) {
      await apiService.updateFeature(feature.id, formData);
    } else {
      await apiService.createFeature({
        ...formData,
        productId: selectedProduct
      });
    }
    toast.success(`Feature ${isEditing ? 'updated' : 'created'} successfully`);
    onSuccess();
  } catch (error) {
    toast.error(`Failed to ${isEditing ? 'update' : 'create'} feature`);
    console.error('Feature submission error:', error);
  }
};
```

#### 4.3 Update Data Models/Types

**File:** `apps/portal/src/types/feature.types.js` (if TypeScript)

```typescript
// Update feature interface to match new system
export interface Feature {
  id: string;                          // UUID
  productId: string;                   // Product reference
  productName?: string;                // Joined from products table
  productSlug?: string;                // Joined from products table
  featureKey: string;                  // Unique within product
  featureName: string;                 // Display name
  description?: string;
  category?: string;                   // NEW: Feature category
  status: 'alpha' | 'beta' | 'stable' | 'deprecated' | 'disabled';
  deprecatedAt?: string;               // NEW: Deprecation timestamp
  deprecationMessage?: string;         // NEW: Migration message
  minTier?: 'starter' | 'professional' | 'enterprise';
  isAddOn: boolean;                    // NEW: Can be purchased separately
  pricing?: {                          // NEW: Pricing information
    monthly?: number;
    annual?: number;
    currency?: string;
  };
  requiredFeatures?: string[];         // RENAMED from requires_features
  conflictingFeatures?: string[];      // NEW: Mutually exclusive features
  configSchema?: object;
  defaultConfig?: object;
  hasUsageLimit: boolean;              // NEW: Whether feature has limits
  defaultUsageLimit?: number;          // NEW: Default limit value
  usageLimitUnit?: string;             // NEW: e.g., 'requests', 'users'
  rolloutPercentage?: number;
  targetOrganizations?: string[];
  organizationsUsing?: number;         // NEW: Count of active grants
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}
```

#### 4.4 Add Migration Banner

**File:** `apps/portal/src/components/MigrationBanner.jsx`

```javascript
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function MigrationBanner({ onDismiss }) {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            API Migration in Progress
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              We're migrating to a new feature management system. Some features may
              behave differently. Please report any issues to the engineering team.
            </p>
            <p className="mt-2">
              <a
                href="/docs/api-migration"
                className="font-medium underline hover:text-yellow-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Migration Guide →
              </a>
            </p>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={onDismiss}
            className="inline-flex rounded-md p-1.5 text-yellow-500 hover:bg-yellow-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 4.5 Testing Checklist

**Manual Testing:**

```markdown
Feature Catalog Page:
- [ ] Features load correctly
- [ ] Filtering by product works
- [ ] Filtering by status works
- [ ] Filtering by category works
- [ ] Search functionality works
- [ ] Pagination works
- [ ] Feature count displays correctly

Feature Detail Page:
- [ ] Feature details load correctly
- [ ] Organization list displays
- [ ] Analytics data shows
- [ ] Deprecate action works
- [ ] Edit button navigates correctly

Feature Form (Create):
- [ ] Form loads with correct fields
- [ ] Product selection works
- [ ] All fields editable
- [ ] Validation works
- [ ] Submit creates feature
- [ ] Success toast appears
- [ ] Redirects to feature detail

Feature Form (Edit):
- [ ] Form pre-fills with existing data
- [ ] All fields editable
- [ ] Can update each field type
- [ ] Submit updates feature
- [ ] Success toast appears
- [ ] Changes reflected immediately

Feature Deletion:
- [ ] Confirmation dialog appears
- [ ] Delete action works
- [ ] Success toast appears
- [ ] Redirects to catalog
- [ ] Feature removed from list

Product Management:
- [ ] Product list loads
- [ ] Feature count per product correct
- [ ] Click product shows features
- [ ] Create feature from product works
```

**Automated Testing:**

```javascript
// Example test file: FeatureCatalog.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureCatalog } from './FeatureCatalog';
import * as apiService from '../../services/apiService';

jest.mock('../../services/apiService');

describe('FeatureCatalog', () => {
  const mockFeatures = [
    {
      id: 'feature-1',
      productId: 'product-1',
      featureKey: 'advanced_reporting',
      featureName: 'Advanced Reporting',
      status: 'stable',
      category: 'analytics'
    }
  ];

  beforeEach(() => {
    apiService.getProductFeatures.mockResolvedValue({
      features: mockFeatures
    });
  });

  it('loads and displays features', async () => {
    render(<FeatureCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Advanced Reporting')).toBeInTheDocument();
    });
  });

  it('calls new API endpoint with correct params', async () => {
    render(<FeatureCatalog />);

    await waitFor(() => {
      expect(apiService.getProductFeatures).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          productId: expect.any(String)
        })
      );
    });
  });

  // Add more tests...
});
```

### Deliverables

- [ ] Updated `apiService.js` with new endpoints
- [ ] Updated all feature management components
- [ ] Updated TypeScript types/interfaces
- [ ] Migration banner component
- [ ] Updated unit tests
- [ ] Updated integration tests
- [ ] Manual testing checklist completed
- [ ] Staging deployment successful
- [ ] Production deployment successful

### Success Criteria

- ✅ All Portal pages load without errors
- ✅ All feature management operations work
- ✅ No console errors
- ✅ UI tests pass
- ✅ Staging environment validated
- ✅ Production smoke tests pass

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking UI changes | High | Thorough testing, staged rollout |
| Type mismatches | Medium | Update TypeScript types, add runtime validation |
| Missing API features | Medium | Feature parity checklist |
| User confusion | Low | Migration banner, documentation |

---

## Phase 5: Deprecation Notice Period

**Duration:** 60 days (8-10 weeks)  
**Owner:** Product Management + Engineering  
**Risk Level:** Low

### Objectives
1. Notify all stakeholders about deprecation
2. Monitor usage of deprecated endpoints
3. Assist teams with migration
4. Ensure zero usage before removal

### Tasks

#### 5.1 Stakeholder Communication

**Week 0 - Initial Announcement:**

**Email Template:**

```markdown
Subject: [ACTION REQUIRED] Product Features API Migration - Deprecation Notice

Dear Team,

We are deprecating the legacy product_features API endpoints and migrating to a
new, more powerful features management system.

DEPRECATION DETAILS:
- Deprecated Endpoints: /api/products/:productId/features/*
- Sunset Date: January 1, 2026 (60 days from today)
- Replacement: /api/features and /api/admin/features

WHY WE'RE DOING THIS:
The new system provides:
- Granular feature grants per organization
- Usage tracking and limits
- Better performance with caching
- Tier-based access control
- Add-on feature management

WHAT YOU NEED TO DO:
1. Review the migration guide: [link]
2. Update your code to use new endpoints
3. Test your integration in staging
4. Deploy to production before December 15, 2025

TIMELINE:
- Now - Dec 15: Migration period (support available)
- Dec 15 - Jan 1: Final testing period
- Jan 1, 2026: Old endpoints removed

MIGRATION GUIDE:
[Link to comprehensive migration guide]

NEED HELP?
- Slack: #api-migration-help
- Email: engineering@example.com
- Office Hours: Tuesdays 2-3 PM

Thank you for your cooperation!

Engineering Team
```

**Week 2 - Reminder:**
- Check monitoring logs for API usage
- Email teams still using old endpoints
- Offer 1-on-1 migration assistance

**Week 4 - Progress Update:**
- Send progress report to stakeholders
- Highlight teams that have migrated successfully
- Remind remaining teams of deadline

**Week 6 - Final Warning:**
- Send urgent notice to teams still using old API
- Escalate to management if needed
- Offer emergency migration support

**Week 8 - Last Call:**
- Final 7-day warning
- Daily reminders to non-compliant teams
- Prepare for endpoint shutdown

#### 5.2 Documentation

**Create Migration Guide:**

**File:** `docs/API_MIGRATION_GUIDE.md`

```markdown
# API Migration Guide: product_features → features

## Overview

This guide helps you migrate from the deprecated `/api/products/:productId/features`
endpoints to the new `/api/features` system.

## Breaking Changes

### Endpoint Changes

| Old Endpoint | New Endpoint | Notes |
|-------------|--------------|-------|
| GET /api/products/:productId/features | GET /api/features?productId={id} | Product ID now a query param |
| GET /api/products/:productId/features/:key | GET /api/admin/features/:id | Use feature ID, not key |
| POST /api/products/:productId/features | POST /api/admin/features | Include productId in body |
| PATCH /api/products/:productId/features/:key | PATCH /api/admin/features/:id | Use feature ID |
| DELETE /api/products/:productId/features/:key | DELETE /api/admin/features/:id | Use feature ID |

### Response Format Changes

**OLD Response:**
```json
{
  "features": [
    {
      "feature_key": "advanced_reporting",
      "feature_name": "Advanced Reporting",
      "is_default": true
    }
  ]
}
```

**NEW Response:**
```json
{
  "features": [
    {
      "id": "uuid-here",
      "featureKey": "advanced_reporting",
      "featureName": "Advanced Reporting",
      "isAddOn": false,
      "category": "analytics",
      "hasUsageLimit": true
    }
  ]
}
```

### Field Renaming

| Old Field | New Field |
|-----------|-----------|
| feature_key | featureKey (camelCase) |
| feature_name | featureName (camelCase) |
| is_default | isAddOn (inverted logic!) |
| requires_features | requiredFeatures |

## Migration Steps

### Step 1: Update API Client

**Before:**
```javascript
const features = await api.get(`/products/${productId}/features`);
```

**After:**
```javascript
const features = await api.get(`/features?productId=${productId}`);
```

### Step 2: Handle Feature Identification

**Before:** Features identified by `productId` + `featureKey`
**After:** Features identified by `id` (UUID)

You'll need to:
1. Look up feature by key to get ID
2. Store feature IDs instead of keys
3. Update all references

**Example:**
```javascript
// Lookup feature ID
const feature = await api.get(`/features?productId=${productId}&featureKey=${key}`);
const featureId = feature.features[0].id;

// Then use ID for updates
await api.patch(`/admin/features/${featureId}`, updateData);
```

### Step 3: Update Response Handling

**Before:**
```javascript
features.forEach(f => {
  console.log(f.feature_key, f.is_default);
});
```

**After:**
```javascript
features.forEach(f => {
  console.log(f.featureKey, !f.isAddOn); // Note: inverted logic!
});
```

### Step 4: Test in Staging

1. Deploy your changes to staging
2. Run your test suite
3. Manually test feature operations
4. Verify no errors in logs

### Step 5: Deploy to Production

1. Schedule deployment during low-traffic period
2. Monitor error rates
3. Check application logs
4. Validate feature functionality

## Common Migration Patterns

### Pattern 1: List Features

**Before:**
```javascript
async function getProductFeatures(productId) {
  return await api.get(`/products/${productId}/features`);
}
```

**After:**
```javascript
async function getProductFeatures(productId) {
  return await api.get(`/features?productId=${productId}`);
}
```

### Pattern 2: Create Feature

**Before:**
```javascript
async function createFeature(productId, featureData) {
  return await api.post(`/products/${productId}/features`, featureData);
}
```

**After:**
```javascript
async function createFeature(featureData) {
  // productId now in request body
  return await api.post('/admin/features', {
    ...featureData,
    productId: featureData.productId
  });
}
```

### Pattern 3: Update Feature

**Before:**
```javascript
async function updateFeature(productId, featureKey, updates) {
  return await api.patch(
    `/products/${productId}/features/${featureKey}`,
    updates
  );
}
```

**After:**
```javascript
async function updateFeature(featureId, updates) {
  // Need feature ID instead of productId + key
  return await api.patch(`/admin/features/${featureId}`, updates);
}

// Helper to get feature ID if you only have key
async function getFeatureId(productId, featureKey) {
  const result = await api.get(
    `/features?productId=${productId}&featureKey=${featureKey}`
  );
  return result.features[0]?.id;
}
```

## Troubleshooting

### Issue: "Feature not found"

**Cause:** Using feature key instead of feature ID

**Solution:** Look up feature by key first, then use ID

### Issue: "Product ID required"

**Cause:** Not including productId in query params or request body

**Solution:** Ensure productId is always provided

### Issue: Field name errors

**Cause:** Using snake_case instead of camelCase

**Solution:** Update field names to camelCase

## Support

- **Slack:** #api-migration-help
- **Email:** engineering@example.com
- **Office Hours:** Tuesdays 2-3 PM
- **Documentation:** https://docs.example.com/api

## FAQ

**Q: Do I need to migrate immediately?**
A: You have until January 1, 2026, but we recommend migrating ASAP.

**Q: Will old endpoints stop working?**
A: They work now with deprecation warnings, but will be removed Jan 1, 2026.

**Q: What happens if I don't migrate?**
A: Your application will break when old endpoints are removed.

**Q: Can I use both old and new APIs during migration?**
A: Yes, but old APIs will be slower and log deprecation warnings.

**Q: How do I test my migration?**
A: Use our staging environment and run your full test suite.
```

#### 5.3 Monitoring Dashboard

**Create monitoring queries for:**

```sql
-- Daily usage of deprecated endpoints (from logs)
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as deprecated_api_calls,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT organization_id) as unique_orgs
FROM api_logs
WHERE endpoint LIKE '/api/products/%/features%'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Top consumers of deprecated API
SELECT 
  organization_id,
  organization_name,
  COUNT(*) as call_count,
  MAX(timestamp) as last_used
FROM api_logs
WHERE endpoint LIKE '/api/products/%/features%'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY organization_id, organization_name
ORDER BY call_count DESC
LIMIT 20;

-- Endpoint breakdown
SELECT 
  method,
  endpoint,
  COUNT(*) as calls
FROM api_logs
WHERE endpoint LIKE '/api/products/%/features%'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY method, endpoint
ORDER BY calls DESC;
```

**Monitoring Dashboard (Grafana/DataDog):**

```markdown
Dashboard: Legacy API Deprecation

Panel 1: Daily Deprecated API Calls (Line Chart)
- Metric: count of /api/products/*/features* calls
- Goal: Trend to zero by Jan 1, 2026

Panel 2: Unique Organizations Using Deprecated API (Bar Chart)
- Shows which orgs still need to migrate
- Color-coded by urgency

Panel 3: Endpoint Breakdown (Pie Chart)
- Shows which specific endpoints still used
- Helps identify patterns

Panel 4: Migration Progress (Gauge)
- % of organizations migrated
- Target: 100% by Dec 15, 2025

Panel 5: Time to Sunset (Counter)
- Days remaining until Jan 1, 2026
- Alert if < 14 days with non-zero usage
```

#### 5.4 Weekly Progress Reports

**Template:**

```markdown
# API Migration Weekly Report - Week X

**Date:** [Date]
**Status:** [On Track / At Risk / Behind Schedule]

## Key Metrics

- Deprecated API calls this week: [number] ([±X%] from last week)
- Organizations still using old API: [number]
- Migration completion: [X%]
- Days until sunset: [number]

## Progress This Week

- [Team/Org Name] completed migration ✅
- [Team/Org Name] completed migration ✅
- [Number] new migrations started

## Organizations Still Migrating

| Organization | Last Used | Call Count | Status | Contact |
|--------------|-----------|------------|--------|---------|
| Org A | 2 days ago | 150/day | In Progress | @person |
| Org B | 1 day ago | 50/day | Not Started | @person |

## Blockers & Issues

- [Issue 1]: Resolution plan
- [Issue 2]: Owner assigned

## Next Week Actions

- Follow up with Org A and Org B
- Send 30-day warning email
- Office hours on Tuesday 2 PM

## Risks

- [Risk if any organizations don't migrate in time]
```

### Deliverables

- [ ] Initial announcement email sent
- [ ] Migration guide published
- [ ] Monitoring dashboard created
- [ ] Weekly progress reports started
- [ ] Support channels established
- [ ] Reminder emails sent (Week 2, 4, 6, 8)
- [ ] Final 7-day warning sent
- [ ] Zero usage confirmed

### Success Criteria

- ✅ All stakeholders notified
- ✅ Migration guide accessible
- ✅ < 5% of traffic on deprecated endpoints by Week 6
- ✅ Zero usage of deprecated endpoints by Week 8
- ✅ All teams confirmed migrated

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Teams ignore notices | High | Executive escalation, daily reminders |
| Complex migrations | Medium | Dedicated support, code review help |
| Unknown integrations | Medium | Extended monitoring, API keys tracking |

---

## Phase 6: Final Removal

**Duration:** 1 day  
**Owner:** Backend Engineering + DevOps  
**Risk Level:** Low (if Phase 5 successful)

### Objectives
1. Remove deprecated code safely
2. Drop old database table
3. Update documentation
4. Verify system stability

### Prerequisites

**CRITICAL - All must be TRUE before proceeding:**

- [ ] Zero usage of deprecated endpoints for 30+ consecutive days
- [ ] All stakeholders confirmed migrated
- [ ] Rollback plan documented and tested
- [ ] Database backup completed
- [ ] Team on-call during removal

### Tasks

#### 6.1 Pre-Removal Verification

**Final Checks:**

```bash
# 1. Verify zero API usage (last 30 days)
cd c:\RecruitIQ\backend
Get-Content logs/*.log | 
  Select-String "/api/products/.*/features" | 
  Measure-Object

# Should return Count: 0

# 2. Check database for orphaned references
psql -U postgres -d recruitiq_production -c "
  SELECT COUNT(*) FROM product_features;
"

# 3. Verify all features migrated
psql -U postgres -d recruitiq_production -c "
  SELECT 
    (SELECT COUNT(*) FROM product_features) as old_count,
    (SELECT COUNT(*) FROM features) as new_count;
"

# 4. Send final notification
# Email all stakeholders: "Legacy API removal scheduled for [date]"
```

#### 6.2 Code Removal

**Step 1: Create Removal Branch**

```bash
git checkout -b remove-legacy-product-features
git pull origin main
```

**Step 2: Remove Files**

```bash
# Backend files to delete
Remove-Item backend/src/products/nexus/controllers/productFeatureController.js
Remove-Item backend/src/products/nexus/services/productFeatureService.js
Remove-Item backend/src/products/nexus/repositories/productFeatureRepository.js
Remove-Item backend/src/products/nexus/models/ProductFeature.js
Remove-Item backend/src/products/nexus/routes/productFeatureRoutes.js
Remove-Item backend/src/services/ProductFeatureCompatibilityService.js

# Remove tests (if any)
Remove-Item backend/tests/**/*productFeature*.test.js -ErrorAction SilentlyContinue
```

**Step 3: Update Route Registrations**

**File:** `backend/src/products/nexus/routes/productManagementRoutes.js`

```javascript
// REMOVE these lines:
// import productFeatureRoutes from './productFeatureRoutes.js';
// router.use('/', productFeatureRoutes);
```

**File:** `backend/src/products/nexus/controllers/index.js`

```javascript
// REMOVE these lines:
// export { default as productFeatureController } from './productFeatureController.js';
```

**File:** `backend/src/products/nexus/services/index.js`

```javascript
// REMOVE these lines:
// export { default as productFeatureService } from './productFeatureService.js';
```

**File:** `backend/src/products/nexus/repositories/index.js`

```javascript
// REMOVE these lines:
// import productFeatureRepository from './productFeatureRepository.js';
// export { productFeatureRepository };
```

**Step 4: Remove Deprecation Middleware**

**File:** `backend/src/middleware/deprecationMonitor.js`

```javascript
// Either remove entirely or update to remove product_features pattern
const deprecatedEndpoints = [
  // REMOVE: { pattern: /^\/api\/products\/[^/]+\/features/, replacement: '/api/features' },
];
```

**Step 5: Run Tests**

```bash
cd c:\RecruitIQ\backend
npm test

# Should pass with no errors
```

**Step 6: Commit Changes**

```bash
git add .
git commit -m "Remove legacy product_features API system

- Removed productFeatureController, Service, Repository
- Removed ProductFeatureCompatibilityService
- Updated route registrations
- Updated export statements
- Removed deprecation monitoring for old endpoints

All teams confirmed migrated to new /api/features endpoints.
Fixes #[ticket-number]"

git push origin remove-legacy-product-features
```

#### 6.3 Database Cleanup

**File:** `backend/scripts/cleanup/drop-product-features-table.sql`

```sql
-- ============================================================================
-- Drop product_features table (Legacy System Removal)
-- Date: 2026-01-01
-- ============================================================================

-- WARNING: This is a destructive operation
-- Ensure all data has been migrated and old API has zero usage

BEGIN;

-- Step 1: Archive old table (just in case)
CREATE TABLE IF NOT EXISTS product_features_archived AS 
SELECT 
  *,
  NOW() as archived_at,
  'Archived during legacy system removal' as archive_reason
FROM product_features;

-- Verify archive
DO $$
DECLARE
  old_count INTEGER;
  archived_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count FROM product_features;
  SELECT COUNT(*) INTO archived_count FROM product_features_archived 
    WHERE archived_at > NOW() - INTERVAL '1 minute';
  
  IF old_count != archived_count THEN
    RAISE EXCEPTION 'Archive verification failed: % rows vs % archived', 
      old_count, archived_count;
  END IF;
  
  RAISE NOTICE 'Archive verified: % rows archived', archived_count;
END $$;

-- Step 2: Drop dependent views (if any)
DROP VIEW IF EXISTS product_features_summary CASCADE;
DROP VIEW IF EXISTS product_features_with_products CASCADE;

-- Step 3: Drop indexes
DROP INDEX IF EXISTS idx_product_features_product;
DROP INDEX IF EXISTS idx_product_features_key;
DROP INDEX IF EXISTS idx_product_features_status;
DROP INDEX IF EXISTS idx_product_features_default;

-- Step 4: Drop the table
DROP TABLE IF EXISTS product_features CASCADE;

-- Step 5: Verify removal
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'product_features' AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Table product_features still exists!';
  END IF;
  
  RAISE NOTICE 'Table product_features successfully removed';
END $$;

-- Step 6: Log the removal
INSERT INTO schema_migrations (version, description, executed_at)
VALUES ('002', 'Drop legacy product_features table', NOW());

-- Step 7: Add comment to archive table
COMMENT ON TABLE product_features_archived IS 
  'Archived data from legacy product_features table. ' ||
  'Removed as part of migration to new features system on 2026-01-01. ' ||
  'Can be safely deleted after 90 days if no issues found.';

COMMIT;

-- Final verification query
SELECT 
  'product_features_archived' as table_name,
  COUNT(*) as row_count,
  MAX(archived_at) as archived_at,
  'Keep for 90 days then delete' as retention_policy
FROM product_features_archived;
```

**Execution:**

```bash
# 1. Backup database first
pg_dump -U postgres -d recruitiq_production > \
  recruitiq_prod_backup_before_cleanup_$(date +%Y%m%d).sql

# 2. Run cleanup script in staging first
psql -U postgres -h staging-db -d recruitiq_staging \
  -f scripts/cleanup/drop-product-features-table.sql

# 3. Test staging thoroughly
# Run full test suite
# Check application functionality
# Verify no errors

# 4. Run cleanup script in production (off-peak hours)
psql -U postgres -h prod-db -d recruitiq_production \
  -f scripts/cleanup/drop-product-features-table.sql | \
  tee cleanup-production-output.log
```

#### 6.4 Documentation Updates

**Files to Update:**

1. **API Documentation**

```markdown
# File: docs/API_REFERENCE.md

## ~~Product Features~~ (REMOVED - Jan 1, 2026)

**REMOVED:** The legacy `/api/products/:productId/features` endpoints have been removed.

**Use instead:** `/api/features` and `/api/admin/features`

See: [Features API Documentation](./FEATURES_API.md)
```

2. **Architecture Documentation**

```markdown
# File: ARCHITECTURE.md

## Feature Management System

The platform uses a comprehensive feature management system based on:
- `features` table: Central feature registry
- `organization_feature_grants` table: Granular access control

~~Legacy `product_features` table was removed on January 1, 2026.~~
```

3. **CHANGELOG.md**

```markdown
# Changelog

## [2.0.0] - 2026-01-01

### BREAKING CHANGES
- **Removed legacy product_features API endpoints**
  - `/api/products/:productId/features/*` endpoints no longer exist
  - Use `/api/features` and `/api/admin/features` instead
  - See migration guide: docs/API_MIGRATION_GUIDE.md

### Changed
- Deprecated `product_features` database table removed
- Archived old data to `product_features_archived` table (90-day retention)

### Migration
- All existing features migrated to new `features` table
- No data loss - all historical data archived
```

4. **README.md**

Update any references to old system.

#### 6.5 Post-Removal Monitoring

**Monitor for 7 days:**

```markdown
Daily Checklist:

Day 1 (Removal Day):
- [ ] Application servers healthy
- [ ] No 404 errors for /api/products/*/features
- [ ] All feature operations working
- [ ] Database performance normal
- [ ] Error rates within normal range
- [ ] User reports monitored

Day 2-7:
- [ ] No regression issues reported
- [ ] Feature access working correctly
- [ ] Portal UI functioning normally
- [ ] No unusual error patterns
- [ ] Performance metrics stable
```

**Monitoring Queries:**

```sql
-- Check for any remaining references (should be 0)
SELECT 
  schemaname,
  tablename,
  attname as column_name
FROM pg_attribute
JOIN pg_class ON pg_attribute.attrelid = pg_class.oid
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE attname LIKE '%product_feature%'
  AND pg_namespace.nspname = 'public';

-- Verify archived data is safe
SELECT 
  COUNT(*) as archived_rows,
  MIN(archived_at) as first_archived,
  MAX(archived_at) as last_archived
FROM product_features_archived;

-- Check new system is being used
SELECT 
  DATE(created_at) as date,
  COUNT(*) as features_created
FROM features
WHERE created_at >= '2026-01-01'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### 6.6 Rollback Plan (Emergency Only)

**If critical issues discovered:**

```sql
-- Emergency Rollback Script
-- Only use if critical production issue found

BEGIN;

-- Restore table from archive
CREATE TABLE product_features AS
SELECT 
  id, product_id, feature_key, feature_name, description,
  status, is_default, min_tier, requires_features,
  config_schema, default_config, rollout_percentage,
  target_organizations, created_at, updated_at, created_by
FROM product_features_archived;

-- Recreate indexes
CREATE INDEX idx_product_features_product ON product_features(product_id);
CREATE INDEX idx_product_features_key ON product_features(feature_key);
CREATE INDEX idx_product_features_status ON product_features(status);
CREATE INDEX idx_product_features_default ON product_features(is_default);

-- Log rollback
RAISE NOTICE 'Emergency rollback completed - product_features restored';

COMMIT;

-- Then redeploy old code from backup/previous version
```

### Deliverables

- [ ] All deprecated code removed
- [ ] Route registrations updated
- [ ] Database table dropped and archived
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Production monitoring shows stability
- [ ] Team confirmed successful removal

### Success Criteria

- ✅ No references to product_features in codebase
- ✅ Application running without errors
- ✅ All tests passing
- ✅ Database cleanup completed
- ✅ Documentation reflects current state
- ✅ 7 days of stable operation post-removal

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missed dependency | Critical | Comprehensive code search, rollback ready |
| Data loss | Critical | Archived table, full backups |
| Unknown integrations | High | 30-day zero-usage requirement |
| Production issues | High | On-call team, rollback plan tested |

---

## Appendices

### Appendix A: Complete File Checklist

**Files to Create:**
- [ ] `backend/scripts/migrations/001-migrate-product-features.sql`
- [ ] `backend/scripts/migrations/001-rollback-product-features.sql`
- [ ] `backend/scripts/migrations/001-validate-migration.sql`
- [ ] `backend/scripts/cleanup/drop-product-features-table.sql`
- [ ] `backend/src/services/ProductFeatureCompatibilityService.js`
- [ ] `backend/src/middleware/deprecationMonitor.js`
- [ ] `apps/portal/src/components/MigrationBanner.jsx`
- [ ] `docs/API_MIGRATION_GUIDE.md`
- [ ] `migration-audit.json` (output)
- [ ] `migration-api-usage.txt` (output)
- [ ] `migration-endpoint-usage.csv` (output)

**Files to Modify:**
- [ ] `backend/src/products/nexus/controllers/productFeatureController.js`
- [ ] `backend/src/products/nexus/routes/productManagementRoutes.js`
- [ ] `backend/src/server.js`
- [ ] `apps/portal/src/services/apiService.js`
- [ ] `apps/portal/src/pages/features/FeatureCatalog.jsx`
- [ ] `apps/portal/src/pages/features/FeatureDetail.jsx`
- [ ] `apps/portal/src/pages/features/FeatureForm.jsx`
- [ ] `apps/portal/src/pages/products/ProductManagement.jsx`
- [ ] `docs/API_REFERENCE.md`
- [ ] `ARCHITECTURE.md`
- [ ] `CHANGELOG.md`
- [ ] `README.md`

**Files to Delete (Phase 6):**
- [ ] `backend/src/products/nexus/controllers/productFeatureController.js`
- [ ] `backend/src/products/nexus/services/productFeatureService.js`
- [ ] `backend/src/products/nexus/repositories/productFeatureRepository.js`
- [ ] `backend/src/products/nexus/models/ProductFeature.js`
- [ ] `backend/src/products/nexus/routes/productFeatureRoutes.js`
- [ ] `backend/src/services/ProductFeatureCompatibilityService.js`

### Appendix B: Testing Checklist

**Unit Tests:**
- [ ] ProductFeatureCompatibilityService tests
- [ ] Updated FeatureRepository tests
- [ ] Updated FeatureGrantRepository tests

**Integration Tests:**
- [ ] Old API endpoints (with deprecation)
- [ ] New API endpoints
- [ ] Data migration scripts
- [ ] Portal UI component tests

**E2E Tests:**
- [ ] Feature CRUD operations via Portal
- [ ] Product management flows
- [ ] Feature access checks
- [ ] Error handling

**Performance Tests:**
- [ ] API response times
- [ ] Database query performance
- [ ] Caching effectiveness

**Security Tests:**
- [ ] Authentication on new endpoints
- [ ] Authorization checks
- [ ] Input validation

### Appendix C: Rollback Procedures

**If Migration Fails (Phase 2):**
```bash
cd c:\RecruitIQ\backend
psql -U postgres -d recruitiq_[env] \
  -f scripts/migrations/001-rollback-product-features.sql
```

**If Code Deployment Fails (Phase 3-4):**
```bash
# Revert to previous version
git revert [commit-hash]
git push origin main

# Redeploy previous version
./deploy.sh
```

**If Critical Issues Found (Phase 6):**
```bash
# Emergency restoration
psql -U postgres -d recruitiq_production \
  -c "$(cat emergency-restore-product-features.sql)"

# Redeploy previous version with old code
git checkout [previous-tag]
./deploy.sh
```

### Appendix D: Contact Information

**Migration Team:**
- **Lead Engineer:** [Name] - [email] - [phone]
- **Database Admin:** [Name] - [email] - [phone]
- **Frontend Lead:** [Name] - [email] - [phone]
- **DevOps Lead:** [Name] - [email] - [phone]
- **Product Manager:** [Name] - [email] - [phone]

**Escalation:**
- **Engineering Manager:** [Name] - [email] - [phone]
- **CTO:** [Name] - [email] - [phone]

**Support Channels:**
- **Slack:** #api-migration-help
- **Email:** engineering@example.com
- **Emergency:** [on-call number]

---

## Timeline Summary

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Phase 1: Assessment | 1-2 days | Nov 11 | Nov 13 | Not Started |
| Phase 2: Data Migration | 2-3 days | Nov 13 | Nov 16 | Not Started |
| Phase 3: Compatibility Layer | 3-4 days | Nov 16 | Nov 20 | Not Started |
| Phase 4: Frontend Migration | 3-5 days | Nov 20 | Nov 25 | Not Started |
| Phase 5: Deprecation Period | 60 days | Nov 25 | Jan 24 | Not Started |
| Phase 6: Final Removal | 1 day | Jan 24 | Jan 24 | Not Started |

**Total Duration:** ~3 months (including 60-day deprecation period)

---

## Sign-off

**Document Approved By:**

- [ ] Engineering Manager: _________________ Date: _______
- [ ] Database Admin: _________________ Date: _______
- [ ] Product Manager: _________________ Date: _______
- [ ] Security Team: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______

**Migration Go/No-Go Decision:**

After Phase 1 completion:
- [ ] GO: Proceed with migration
- [ ] NO-GO: Address issues and reassess

Approved by: _________________ Date: _______

---

**Document End**

*Last Updated: November 9, 2025*  
*Version: 1.0*  
*Next Review: After Phase 1 Completion*
