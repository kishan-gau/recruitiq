#!/bin/bash

# RecruitIQ Pure SQL Database Initialization
# This script runs during PostgreSQL container startup using only SQL scripts
# No Node.js installation required - everything runs with psql

set -e

echo "🚀 Starting RecruitIQ Database Initialization (SQL Mode)..."
echo "Database: $POSTGRES_DB"
echo "User: $POSTGRES_USER"
echo "=========================================="

# Note: PostgreSQL is already ready when docker-entrypoint-initdb.d scripts run
# No need to wait - the database is guaranteed to be ready at this point
echo "✅ PostgreSQL is ready (running in initdb context)!"

# Set PostgreSQL configuration variables for tenant creation
echo "🔧 Setting up tenant creation variables..."

if [ -n "$DEFAULT_LICENSE_ID" ] && [ -n "$DEFAULT_CUSTOMER_ID" ] && [ -n "$DEFAULT_CUSTOMER_EMAIL" ] && [ -n "$DEFAULT_CUSTOMER_NAME" ]; then
    echo "📋 Tenant creation parameters found:"
    echo "   License ID: $DEFAULT_LICENSE_ID"
    echo "   Customer ID: $DEFAULT_CUSTOMER_ID" 
    echo "   Customer Email: $DEFAULT_CUSTOMER_EMAIL"
    echo "   Customer Name: $DEFAULT_CUSTOMER_NAME"
    
    # Set configuration variables for PostgreSQL session
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        ALTER DATABASE "$POSTGRES_DB" SET myapp.default_license_id = '$DEFAULT_LICENSE_ID';
        ALTER DATABASE "$POSTGRES_DB" SET myapp.default_customer_id = '$DEFAULT_CUSTOMER_ID';
        ALTER DATABASE "$POSTGRES_DB" SET myapp.default_customer_email = '$DEFAULT_CUSTOMER_EMAIL';
        ALTER DATABASE "$POSTGRES_DB" SET myapp.default_customer_name = '$DEFAULT_CUSTOMER_NAME';
EOSQL
    
    echo "✅ Tenant variables configured"
else
    echo "ℹ️  No tenant creation parameters provided"
    echo "   To create a default tenant, set: DEFAULT_LICENSE_ID, DEFAULT_CUSTOMER_ID, DEFAULT_CUSTOMER_EMAIL, DEFAULT_CUSTOMER_NAME"
fi

echo "📦 Phase 1: Creating Database Schema..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /docker-init/01-create-schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Phase 1 Complete: Database schema created successfully"
else
    echo "❌ Phase 1 Failed: Schema creation failed"
    exit 1
fi

echo "🌱 Phase 2: Loading Production Seeds..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /docker-init/02-production-seeds.sql

if [ $? -eq 0 ]; then
    echo "✅ Phase 2 Complete: Production seeds loaded successfully"
else
    echo "❌ Phase 2 Failed: Seeds loading failed"
    exit 1
fi

echo "🏢 Phase 3: Creating Default Tenant (if configured)..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /docker-init/03-create-tenant.sql

if [ $? -eq 0 ]; then
    echo "✅ Phase 3 Complete: Tenant creation completed"
else
    echo "❌ Phase 3 Failed: Tenant creation failed"
    exit 1
fi

echo ""
echo "🎉 RecruitIQ Database Initialization Complete!"
echo "======================================="

if [ -n "$DEFAULT_LICENSE_ID" ]; then
    echo "🏢 Created tenant organization: $DEFAULT_CUSTOMER_NAME"
    echo "📧 Admin email: $DEFAULT_CUSTOMER_EMAIL"
    echo "🔑 Generated admin password has been displayed above"
    echo "🌐 You can now start the backend server and login"
else
    echo "ℹ️  No default tenant was created"
    echo "   Run the setup script with tenant parameters to create one"
fi

echo ""
echo "🚀 Ready for development!"
echo "======================================="