# Database Management Guide

## Overview
The RecruitIQ database uses a **single source of truth** approach for schema management. No migration files - just one comprehensive schema file.

## Files

### 1. `schema.sql` - Single Source of Truth
- **Purpose**: Complete database schema definition
- **Location**: `backend/src/database/schema.sql`
- **What it contains**:
  - All table definitions
  - Indexes
  - Foreign key relationships
  - Check constraints
  - Default values

### 2. `reset-schema.js` - Schema Reset Script  
- **Purpose**: Drop all tables and recreate from `schema.sql`
- **Usage**: `node src/database/reset-schema.js`
- **When to use**:
  - After modifying `schema.sql`
  - When schema gets out of sync
  - Starting fresh development

### 3. `purge-database.js` - Data Deletion Script
- **Purpose**: Delete ALL data but keep schema intact
- **Usage**: `node src/database/purge-database.js`
- **When to use**:
  - Before reseeding test data
  - Cleaning up development data

### 4. `seed-test-data.js` - Test Data Seeder
- **Purpose**: Create test user and sample data for E2E tests
- **Usage**: `node src/database/seed-test-data.js`
- **Creates**:
  - Test organization (ID: `123e4567-e89b-12d3-a456-426614174001`)
  - Test user (`test@recruitiq.com` / `TestPassword123!`)
  - Test workspace (ID: `123e4567-e89b-12d3-a456-426614174002`)
  - 3 flow templates

## Common Workflows

### Fresh Start (Schema + Data)
```bash
cd backend
node src/database/reset-schema.js   # Recreate tables
node src/database/seed-test-data.js  # Add test data
```

### Reseed Data Only
```bash
cd backend
node src/database/purge-database.js  # Delete data
node src/database/seed-test-data.js  # Add fresh test data
```

### Update Schema
1. Edit `backend/src/database/schema.sql`
2. Run `node src/database/reset-schema.js`
3. Run `node src/database/seed-test-data.js`

## Test Credentials

After seeding, use these credentials for testing:

- **Email**: `test@recruitiq.com`
- **Password**: `TestPassword123!`
- **User ID**: `123e4567-e89b-12d3-a456-426614174000`
- **Organization ID**: `123e4567-e89b-12d3-a456-426614174001`
- **Workspace ID**: `123e4567-e89b-12d3-a456-426614174002`

## Database Tables

Current schema includes:
- `organizations` - Multi-tenant organization data
- `users` - User accounts with auth
- `refresh_tokens` - JWT refresh token storage
- `workspaces` - Organization workspaces
- `workspace_members` - Workspace memberships
- `flow_templates` - Hiring flow templates
- `jobs` - Job postings
- `candidates` - Candidate profiles
- `applications` - Job applications
- `interviews` - Interview scheduling

## Why No Migrations?

**During development**:
- Schema changes frequently
- Migrations create complexity
- Single file is easier to understand
- Faster iteration

**Before production**:
- We'll add proper migration system
- Version control for schema changes
- Rollback capabilities

## Important Notes

⚠️ **Never edit migration files** - They don't exist! Edit `schema.sql` instead.

⚠️ **Always reset schema after changing it** - Otherwise your code and database will be out of sync.

✅ **Schema is source of truth** - If something doesn't work, check `schema.sql` first.
