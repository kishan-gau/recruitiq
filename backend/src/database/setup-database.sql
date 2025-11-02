-- ============================================================================
-- RecruitIQ Database Setup Script
-- Run this to create a fresh database with unified authentication
-- ============================================================================

-- Drop existing databases if they exist (optional - be careful in production!)
-- DROP DATABASE IF EXISTS recruitiq_dev;
-- DROP DATABASE IF EXISTS license_manager_db;

-- Create main database (if it doesn't exist)
-- CREATE DATABASE recruitiq_dev;

-- Connect to the database
\c recruitiq_dev

-- ============================================================================
-- Step 1: Run main schema
-- ============================================================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📋 Creating main schema...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\i schema.sql

-- ============================================================================
-- Step 2: Add License Manager tables
-- ============================================================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📦 Creating License Manager tables...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\i schema-license-manager.sql

-- ============================================================================
-- Step 3: Seed permissions and roles
-- ============================================================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔐 Seeding permissions and roles...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\i seed-permissions-roles.sql

-- ============================================================================
-- Step 4: Seed sample data (optional)
-- ============================================================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📝 Seeding sample data (optional)...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
-- Uncomment the next line if you want sample data
-- \i seed-sample-data.sql

-- ============================================================================
-- Summary
-- ============================================================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✅ Database setup complete!'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '📊 Database: recruitiq_dev'
\echo '🔑 Default Users:'
\echo '   • admin@recruitiq.com (Super Admin)'
\echo '   • license@recruitiq.com (License Admin)'
\echo '   • security@recruitiq.com (Security Admin)'
\echo '   Password: Admin123!'
\echo ''
\echo '⚠️  IMPORTANT:'
\echo '   1. Change default passwords immediately'
\echo '   2. Update backend/.env with database credentials'
\echo '   3. Run: npm run migrate (if you have migrations)'
\echo ''
\echo '📖 Next steps:'
\echo '   cd backend'
\echo '   node src/server.js'
\echo ''
