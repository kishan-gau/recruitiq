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
-- Step 2: Add Nexus (HRIS) schema
-- ============================================================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '👥 Creating Nexus HRIS schema...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\i nexus-hris-schema.sql

-- ============================================================================
-- Step 3: Add Paylinq (Payroll) schema
-- ============================================================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '💰 Creating Paylinq payroll schema...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\i paylinq-schema.sql

-- ============================================================================
-- Step 4: Add ScheduleHub (Scheduling) schema
-- ============================================================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📅 Creating ScheduleHub scheduling schema...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\i schedulehub-schema.sql

-- ============================================================================
-- Step 5: Seed permissions and roles
-- ============================================================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔐 Seeding permissions and roles...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\i seed-permissions-roles.sql

-- ============================================================================
-- Step 6: Seed sample data (optional)
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
\echo '📂 Schemas: public, hris, payroll, scheduling'
\echo '👥🔑 Default Users:'
\echo '   • admin@recruitiq.com (Super Admin)'
\echo '   • license@recruitiq.com (License Admin)'
\echo '   • security@recruitiq.com (Security Admin)'
\echo '   Password: Admin123!'
\echo ''
\echo '� Nexus HRIS: Employee lifecycle management'
\echo '   • Employee records & contracts'
\echo '   • Performance reviews & goals'
\echo '   • Benefits administration'
\echo '   • Time-off & attendance'
\echo ''
\echo '💰 Paylinq: Payroll processing'
\echo '   • Employee payroll records'
\echo '   • Compensation & deductions'
\echo '   • Time tracking & paychecks'
\echo '   • Tax calculation & payments'
\echo ''
\echo '📅 ScheduleHub: Workforce scheduling'
\echo '   • Shift scheduling & management'
\echo '   • Worker availability tracking'
\echo '   • Shift swapping marketplace'
\echo '   • Demand forecasting & optimization'
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
