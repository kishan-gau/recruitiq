#!/bin/bash

# RecruitIQ Database Initialization
# This script runs during PostgreSQL container startup
# It ONLY creates database extensions - schema is handled by Knex migrations

set -e

echo "=========================================="
echo "RecruitIQ Database Initialization"
echo "Database: $POSTGRES_DB"
echo "User: $POSTGRES_USER"
echo "=========================================="

# PostgreSQL is already ready when docker-entrypoint-initdb.d scripts run
echo "[OK] PostgreSQL is ready (running in initdb context)"

# Detect the correct SQL scripts path based on mounted volumes
if [ -d "/backend/docker-init" ]; then
    SQL_SCRIPTS_DIR="/backend/docker-init"
    echo "[INFO] Using SQL scripts from: $SQL_SCRIPTS_DIR (root docker-compose mount)"
elif [ -d "/docker-init" ]; then
    SQL_SCRIPTS_DIR="/docker-init"
    echo "[INFO] Using SQL scripts from: $SQL_SCRIPTS_DIR (backend docker-compose mount)"
else
    echo "[ERROR] Cannot find SQL scripts directory!"
    echo "   Checked: /backend/docker-init and /docker-init"
    exit 1
fi

# Phase 1: Create extensions only
echo ""
echo "=========================================="
echo "Phase 1: Creating Database Extensions"
echo "=========================================="

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$SQL_SCRIPTS_DIR/01-create-schema.sql"

if [ $? -eq 0 ]; then
    echo "[OK] Phase 1 Complete: Database extensions created"
else
    echo "[ERROR] Phase 1 Failed: Extension creation failed"
    exit 1
fi

# ============================================================================
# IMPORTANT: Phase 2 (Seeds) and Phase 3 (Tenant Creation) are DISABLED
# ============================================================================
#
# Database schema and seeds are managed ENTIRELY by Knex migrations
# running in the backend container via startup.sh.
#
# Why?
# 1. Single source of truth for database schema (Knex migrations)
# 2. Proper migration tracking in knex_migrations table
# 3. Consistent schema between development and production
# 4. No "relation already exists" errors on startup
# 5. Better control over schema versioning and rollbacks
#
# How it works:
# 1. PostgreSQL starts -> this script creates ONLY extensions
# 2. Backend starts -> startup.sh runs npm run migrate:latest
# 3. Knex creates all tables via migrations/
# 4. Seeds run if needed via seeds/production/
#
# Files involved:
# - backend/migrations/*.js (schema definitions)
# - backend/seeds/production/*.js (seed data)
# - backend/scripts/startup.sh (orchestration)
# ============================================================================

echo ""
echo "=========================================="
echo "Phase 2 and 3: SKIPPED"
echo "=========================================="
echo "[INFO] Schema creation delegated to Knex migrations"
echo "[INFO] Backend startup.sh will run: npm run migrate:latest"
echo ""
echo "=========================================="
echo "Database Initialization Complete!"
echo "=========================================="
echo ""
echo "[INFO] PostgreSQL is ready with extensions:"
echo "       - uuid-ossp (UUID generation)"
echo "       - pgcrypto (cryptographic functions)"
echo ""
echo "[INFO] Waiting for backend container to run Knex migrations..."
echo "=========================================="
