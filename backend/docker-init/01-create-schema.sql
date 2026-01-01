-- RecruitIQ Database Extensions
-- This script ONLY creates PostgreSQL extensions.
-- All tables are created by Knex migrations (single source of truth).

-- Create extensions required by the application
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- NOTE: Tables are NOT created here.
-- Knex migrations handle all schema creation:
--   - migrations/20251201000001_create_base_schema.js
--   - migrations/20251201000002_create_core_tables.js
--   - etc.
--
-- Seeds are handled by Knex seed files:
--   - seeds/production/ (product-based seeds)
--   - seeds/development/ (development data)

NOTIFY system, 'PostgreSQL extensions created successfully';