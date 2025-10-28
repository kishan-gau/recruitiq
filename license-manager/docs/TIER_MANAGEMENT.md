# Tier Management & Versioning System

## Overview

The RecruitIQ License Manager includes a sophisticated tier management system with **versioning** and **backwards compatibility**. This allows you to:

1. **Update tier limits** (e.g., increase Starter from 10 to 12 users)
2. **Choose migration strategy**: Apply changes to all customers, only new customers, or selectively
3. **Maintain audit trail**: Track all tier changes and customer migrations
4. **Preview impact**: See which customers will be affected before making changes

---

## Architecture

### Database Tables

#### `tier_presets`
Stores versioned tier configurations:
```sql
- id (UUID)
- tier_name (starter, professional, enterprise, custom)
- version (integer, auto-incremented per tier)
- max_users, max_workspaces, max_jobs, max_candidates
- features (JSONB array)
- pricing fields
- effective_from, effective_until (date ranges)
- is_active (boolean)
- description (change notes)
- created_by, created_at
```

#### `tier_migrations`
Audit log of tier changes and customer migrations:
```sql
- id (UUID)
- from_preset_id, to_preset_id
- migration_type (automatic, manual, selective)
- affected_customers, migrated_customers
- filter_criteria (JSONB - which customers to migrate)
- status, started_at, completed_at
- error_message
- executed_by
```

#### Updated `licenses` table
```sql
- tier_preset_id (FK to tier_presets)
- tier_version (integer)
- auto_upgrade (boolean) - whether to auto-upgrade to new versions
```

---

## Tier Versioning Workflow

### Scenario: Increasing Starter Tier from 10 to 12 Users

#### Step 1: Create New Version
```javascript
POST /api/tiers/create-version
{
  "tierName": "starter",
  "maxUsers": 12,  // Changed from 10
  "maxWorkspaces": 1,
  "maxJobs": 50,
  "maxCandidates": 500,
  "features": ["basic_support", "email_notifications"],
  "monthlyPricePerUser": 49.00,
  "description": "Increased user limit from 10 to 12",
  "createdBy": "admin@recruitiq.com",
  "autoMigrate": false  // Don't auto-migrate yet
}
```

**Response:**
```json
{
  "success": true,
  "preset": {
    "id": "uuid-...",
    "tier_name": "starter",
    "version": 2,
    "max_users": 12,
    "is_active": true
  },
  "migration": {
    "id": "migration-uuid",
    "status": "pending"
  },
  "affectedCustomers": 45,
  "willAutoMigrate": false
}
```

**What Happens:**
- ✅ New version (v2) of Starter tier is created
- ✅ Previous version (v1) is marked `is_active = false`, `effective_until = NOW()`
- ✅ Migration record is created in `pending` status
- ❌ Existing customers on v1 are NOT automatically migrated

---

#### Step 2: Preview Migration Impact

Before migrating customers, preview what will change:

```javascript
POST /api/tiers/starter/preview-migration
{
  "status": ["active"],           // Only active customers
  "deploymentType": ["cloud-dedicated"],  // Optional filter
  "autoUpgrade": true             // Only customers with auto_upgrade=true
}
```

**Response:**
```json
{
  "success": true,
  "tierName": "starter",
  "newPreset": { /* v2 details */ },
  "totalCustomers": 45,
  "customersWithChanges": 45,
  "customers": [
    {
      "customerId": "uuid-1",
      "customerName": "Acme Corp",
      "status": "active",
      "autoUpgrade": true,
      "currentVersion": 1,
      "newVersion": 2,
      "willChange": true,
      "changes": [
        {
          "field": "max_users",
          "from": 10,
          "to": 12,
          "change": "increased"
        }
      ]
    },
    // ... more customers
  ]
}
```

---

#### Step 3: Execute Migration (Selective)

You have three migration strategies:

##### **Option A: Automatic (All Customers with `auto_upgrade=true`)**
```javascript
POST /api/tiers/create-version
{
  // ... tier data
  "autoMigrate": true  // ← This triggers automatic migration
}
```

**Result:** All customers with `licenses.auto_upgrade = true` are immediately upgraded to v2.

---

##### **Option B: Manual (Selected Customers)**
```javascript
POST /api/tiers/migrations/{migrationId}/execute
{
  "status": ["active"],               // Only active customers
  "deploymentType": ["cloud-dedicated"],  // Only cloud-dedicated
  "autoUpgrade": true                 // Only those with auto_upgrade enabled
}
```

**Result:** Only customers matching filters are migrated.

---

##### **Option C: Individual Customer Upgrade**
```javascript
// Update specific license
PUT /api/admin/licenses/{licenseId}
{
  "tierPresetId": "new-preset-uuid",
  "tierVersion": 2
}
```

**Result:** Only that customer is upgraded.

---

### Step 4: Monitor Migration

```javascript
GET /api/tiers/migrations/history?tierName=starter
```

**Response:**
```json
{
  "history": [
    {
      "id": "migration-uuid",
      "tier_name": "starter",
      "version": 2,
      "migration_type": "selective",
      "affected_customers": 45,
      "migrated_customers": 30,
      "status": "completed",
      "started_at": "2025-10-28T10:00:00Z",
      "completed_at": "2025-10-28T10:05:00Z",
      "executed_by": "admin@recruitiq.com",
      "filter_criteria": {
        "status": ["active"],
        "autoUpgrade": true
      }
    }
  ]
}
```

---

## Backwards Compatibility

### New Customers
- **Always get the latest version** of the tier
- When you create a new customer, the system automatically assigns the active preset

### Existing Customers
You control when they upgrade:

1. **`auto_upgrade = true`**: Customer automatically gets new limits when tier is upgraded
2. **`auto_upgrade = false`**: Customer stays on their current version until you manually migrate them

**Use Cases:**

| Scenario | `auto_upgrade` | Result |
|----------|----------------|--------|
| SaaS customer on monthly billing | `true` | Gets improvements automatically |
| Enterprise customer with fixed contract | `false` | Stays on contracted terms |
| Customer who's been grandfathered in | `false` | Keeps legacy limits |

---

## API Endpoints

### Tier Management

```
GET    /api/tiers                          # Get all active tiers
GET    /api/tiers/:tierName/history        # Get version history
GET    /api/tiers/stats                    # Usage statistics per tier
GET    /api/tiers/compare?presetId1=&presetId2=  # Compare versions
POST   /api/tiers/create-version           # Create new tier version
```

### Migration Management

```
POST   /api/tiers/:tierName/preview-migration   # Preview migration impact
POST   /api/tiers/migrations/:id/execute        # Execute migration
GET    /api/tiers/migrations/history            # Migration audit log
GET    /api/tiers/preset/:id/customers          # Who's using this version?
```

### Pre-Action Checks (for RecruitIQ)

```
POST   /api/validate/check-limit           # Check if action is allowed
POST   /api/validate/validate              # Validate license
GET    /api/validate/details/:customerId   # Get full license details
```

---

## Example Scenarios

### Scenario 1: Increase Limits for Active Customers Only

```javascript
// Step 1: Create new version
const result = await fetch('/api/tiers/create-version', {
  method: 'POST',
  body: JSON.stringify({
    tierName: 'professional',
    maxUsers: 100,  // Up from 50
    maxWorkspaces: 10,  // Up from 5
    // ... other fields
    description: 'Doubled limits for Professional tier',
    autoMigrate: false
  })
})

// Step 2: Preview who will be affected
const preview = await fetch('/api/tiers/professional/preview-migration', {
  method: 'POST',
  body: JSON.stringify({
    status: ['active']  // Only active customers
  })
})

// Step 3: Execute migration
const migration = await fetch(`/api/tiers/migrations/${result.migration.id}/execute`, {
  method: 'POST',
  body: JSON.stringify({
    status: ['active']
  })
})
```

---

### Scenario 2: Grandfathered Pricing

Customer has legacy pricing with higher limits:

```javascript
// Option 1: Create custom tier version for that customer
POST /api/tiers/create-version
{
  "tierName": "custom",
  "maxUsers": 200,
  "maxWorkspaces": 20,
  // ... custom limits
  "description": "Custom plan for Enterprise Customer X",
  "autoMigrate": false
}

// Option 2: Set auto_upgrade=false for that customer
PUT /api/admin/licenses/{customerId}
{
  "autoUpgrade": false
}
```

They'll stay on their current version forever unless manually migrated.

---

### Scenario 3: Beta Feature Rollout

Add a new feature to Professional tier, test with a few customers first:

```javascript
// Step 1: Create new version with beta feature
POST /api/tiers/create-version
{
  "tierName": "professional",
  "features": [
    "analytics",
    "api_access",
    "beta_advanced_search"  // ← New feature
  ],
  "description": "Added advanced search beta feature",
  "autoMigrate": false
}

// Step 2: Migrate only beta testers
POST /api/tiers/migrations/{migrationId}/execute
{
  "deploymentType": ["cloud-dedicated"],
  // Or use a custom filter in the database query
}

// Step 3: Once stable, enable auto_upgrade for everyone
UPDATE licenses
SET auto_upgrade = true
WHERE tier = 'professional'
```

---

## UI Integration

### Admin Dashboard: Tier Management Page

**Features:**
- View all tier versions (current and historical)
- Compare versions side-by-side
- See customer distribution per version
- Create new versions with form
- Preview migration impact with filters
- Execute migrations with confirmation
- View migration history and audit logs

**Coming Soon:** Frontend implementation in `license-manager/frontend`

---

## Database Migration Script

To deploy this system:

```bash
cd license-manager/backend
psql -U postgres -d recruitiq_licenses -f database/migrations/002_tier_presets.sql
```

This will:
1. Create `tier_presets` table
2. Create `tier_migrations` table
3. Add columns to `licenses` table
4. Seed initial tier configurations (Starter v1, Professional v1, Enterprise v1)

---

## Testing

### Test Tier Version Creation

```bash
curl -X POST http://localhost:5000/api/tiers/create-version \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tierName": "starter",
    "maxUsers": 12,
    "maxWorkspaces": 1,
    "maxJobs": 50,
    "maxCandidates": 500,
    "features": ["basic_support"],
    "description": "Increased user limit",
    "autoMigrate": false
  }'
```

### Test Migration Preview

```bash
curl -X POST http://localhost:5000/api/tiers/starter/preview-migration \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": ["active"]
  }'
```

---

## Best Practices

### 1. Always Preview Before Migrating
Use the preview endpoint to understand impact before executing migrations.

### 2. Use Descriptive Version Descriptions
```javascript
{
  "description": "Increased user limit from 10 to 12 based on Q4 customer feedback"
}
```

### 3. Set `auto_upgrade` Appropriately
- SaaS customers with monthly billing: `auto_upgrade = true`
- Enterprise with fixed contracts: `auto_upgrade = false`
- Beta testers: `auto_upgrade = false` (manual control)

### 4. Filter Migrations Carefully
```javascript
{
  "status": ["active"],  // Don't migrate churned customers
  "autoUpgrade": true    // Only those who opted in
}
```

### 5. Monitor Migration Status
Check `/api/tiers/migrations/history` to ensure migrations completed successfully.

---

## Troubleshooting

### Migration Failed
Check the error message in `tier_migrations.error_message`:
```sql
SELECT error_message FROM tier_migrations WHERE id = 'migration-uuid';
```

### Customer Not Migrated
Check their `auto_upgrade` flag:
```sql
SELECT auto_upgrade FROM licenses WHERE customer_id = 'customer-uuid';
```

### Rollback a Migration
Create a new version with the old limits and migrate customers back:
```javascript
POST /api/tiers/create-version
{
  "tierName": "starter",
  "maxUsers": 10,  // Revert to old limit
  "description": "Rolled back to v1 limits",
  "autoMigrate": true
}
```

---

## Future Enhancements

- [ ] Scheduled migrations (effective_from in the future)
- [ ] Rollback functionality (one-click revert)
- [ ] Email notifications to customers when their tier is upgraded
- [ ] Slack/webhook integrations for migration events
- [ ] Customer self-service tier selection in RecruitIQ UI

---

## Related Documentation

- [RecruitIQ Integration Guide](./RECRUITIQ_INTEGRATION.md) - How RecruitIQ enforces limits
- [API Documentation](./API.md) - Full API reference
- [Database Schema](../database/schema.sql) - Complete database structure
