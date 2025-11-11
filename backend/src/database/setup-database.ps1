# ============================================================================
# RecruitIQ Database Setup Script (PowerShell)
# ============================================================================

param(
    [string]$DBName = "recruitiq_dev",
    [string]$DBUser = "postgres",
    [string]$DBPassword = "postgres",
    [string]$DBHost = "localhost",
    [int]$DBPort = 5432
)

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  RecruitIQ Database Setup" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Find psql executable on Windows
$psqlPaths = @(
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe",
    "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files\PostgreSQL\13\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\14\bin\psql.exe"
)

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    foreach ($path in $psqlPaths) {
        if (Test-Path $path) {
            $psql = $path
            Write-Host "[INFO] Found PostgreSQL at: $path" -ForegroundColor Cyan
            break
        }
    }
    
    if (-not $psql) {
        Write-Host "[ERROR] PostgreSQL (psql) not found!" -ForegroundColor Red
        Write-Host "   Please install PostgreSQL or add it to your PATH" -ForegroundColor Yellow
        Write-Host "   Common locations checked:" -ForegroundColor Yellow
        foreach ($path in $psqlPaths) {
            Write-Host "   - $path" -ForegroundColor Gray
        }
        exit 1
    }
} else {
    $psql = "psql"
}

# Set password environment variable
$env:PGPASSWORD = $DBPassword

# Check if PostgreSQL is running
Write-Host "[*] Checking PostgreSQL connection..." -ForegroundColor Yellow
$testConnection = & $psql -h $DBHost -p $DBPort -U $DBUser -d postgres -c "SELECT version();" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Cannot connect to PostgreSQL" -ForegroundColor Red
    Write-Host "   Host: $DBHost" -ForegroundColor Red
    Write-Host "   Port: $DBPort" -ForegroundColor Red
    Write-Host "   User: $DBUser" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Make sure PostgreSQL is running and credentials are correct." -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Connected to PostgreSQL" -ForegroundColor Green
Write-Host ""

# Always drop existing database for clean reset
Write-Host "[WARNING] Dropping existing database: $DBName" -ForegroundColor Yellow
Write-Host "   This will delete all data!" -ForegroundColor Red

# Terminate existing connections to the database
& $psql -h $DBHost -p $DBPort -U $DBUser -d postgres -c @"
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DBName'
AND pid <> pg_backend_pid();
"@ 2>&1 | Out-Null

# Drop the database
& $psql -h $DBHost -p $DBPort -U $DBUser -d postgres -c "DROP DATABASE IF EXISTS $DBName;" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Database dropped" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to drop database" -ForegroundColor Red
    exit 1
}

# Create fresh database
Write-Host "[*] Creating database: $DBName" -ForegroundColor Yellow
& $psql -h $DBHost -p $DBPort -U $DBUser -d postgres -c "CREATE DATABASE $DBName;" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Database created" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to create database" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Change to database directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Run schema files
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Creating schema..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f schema.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error creating schema" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Creating Nexus HRIS schema..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f nexus-hris-schema.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error creating Nexus HRIS schema" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Creating Paylinq payroll schema..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f paylinq-schema.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error creating Paylinq schema" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Creating ScheduleHub scheduling schema..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f schedulehub-schema.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error creating ScheduleHub schema" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Creating RecruitIQ ATS schema..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f recruitiq-schema.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error creating RecruitIQ schema" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Creating Deployment Service schema..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Check if deployment service schema file exists in deployment-service directory
$deploymentSchemaPath = "..\..\deployment-service\src\database\deployment-service-schema.sql"
if (Test-Path $deploymentSchemaPath) {
    & $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f $deploymentSchemaPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Error creating Deployment Service schema" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[WARNING] Deployment Service schema not found, skipping..." -ForegroundColor Yellow
    Write-Host "   Expected at: $deploymentSchemaPath" -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding permissions and roles..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seed-permissions-roles.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding permissions" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding products and features..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seed-products.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding products" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding feature management system..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Run Node.js seed script for features
$seedScriptPath = "..\..\scripts\seeds\seedFeatures.js"
if (Test-Path $seedScriptPath) {
    # Temporarily set database connection info for the seed script
    $env:DATABASE_URL = "postgresql://${DBUser}:${DBPassword}@${DBHost}:${DBPort}/${DBName}"
    
    node $seedScriptPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Error seeding features" -ForegroundColor Red
        Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
        exit 1
    }
    
    Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
} else {
    Write-Host "[WARNING] Feature seed script not found, skipping..." -ForegroundColor Yellow
    Write-Host "   Expected at: $seedScriptPath" -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Creating formula template library..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f formula-templates-seed.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error creating formula templates" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Creating test organization and tenant users..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seed-test-tenant.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error creating test tenant" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding Suriname tax rules..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seed-suriname-tax-rules.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding Suriname tax rules" -ForegroundColor Red
    exit 1
}

# Clean up environment variable
Remove-Item Env:\PGPASSWORD

# Summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "[OK] Database setup complete!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Database: $DBName" -ForegroundColor White
Write-Host "[INFO] Schemas: public, hris, payroll, scheduling, deployment" -ForegroundColor White
Write-Host ""
Write-Host "[INFO] Platform Admin Users:" -ForegroundColor White
Write-Host "   - admin@recruitiq.com (Super Admin)" -ForegroundColor White
Write-Host "   - license@recruitiq.com (License Admin)" -ForegroundColor White
Write-Host "   - security@recruitiq.com (Security Admin)" -ForegroundColor White
Write-Host "   Password: Admin123!" -ForegroundColor Yellow
Write-Host ""
Write-Host "[INFO] Test Organization: Test Company Ltd" -ForegroundColor Cyan
Write-Host "[INFO] Tenant Users (for Paylinq access):" -ForegroundColor Cyan
Write-Host "   - tenant@testcompany.com (Owner)" -ForegroundColor Cyan
Write-Host "   - payroll@testcompany.com (Payroll Manager)" -ForegroundColor Cyan
Write-Host "   - employee@testcompany.com (Employee)" -ForegroundColor Cyan
Write-Host "   Password: Admin123!" -ForegroundColor Yellow
Write-Host ""
Write-Host "[INFO] Nexus HRIS: Employee lifecycle management" -ForegroundColor Cyan
Write-Host "   - Employee records & contracts" -ForegroundColor Gray
Write-Host "   - Performance reviews & goals" -ForegroundColor Gray
Write-Host "   - Benefits administration" -ForegroundColor Gray
Write-Host "   - Time-off & attendance" -ForegroundColor Gray
Write-Host "   - Document management" -ForegroundColor Gray
Write-Host ""
Write-Host "[INFO] Paylinq: 26 payroll tables created" -ForegroundColor Cyan
Write-Host "   - Employee records & compensation" -ForegroundColor Gray
Write-Host "   - Time & attendance tracking" -ForegroundColor Gray
Write-Host "   - Payroll processing & paychecks" -ForegroundColor Gray
Write-Host "   - Tax calculation & compliance" -ForegroundColor Gray
Write-Host "   - Payment processing & reconciliation" -ForegroundColor Gray
Write-Host "   - Formula engine & template library" -ForegroundColor Gray
Write-Host ""
Write-Host "[INFO] Formula Templates: 14 global templates seeded" -ForegroundColor Cyan
Write-Host "   - 5 Earnings templates (percentage, overtime, daily rate)" -ForegroundColor Gray
Write-Host "   - 2 Deduction templates (fixed, percentage)" -ForegroundColor Gray
Write-Host "   - 4 Conditional templates (tiered bonus, conditional OT)" -ForegroundColor Gray
Write-Host "   - 3 Advanced templates (safe division, capped, pro-rata)" -ForegroundColor Gray
Write-Host ""
Write-Host "[INFO] Feature Management: 38 features seeded" -ForegroundColor Cyan
Write-Host "   - Nexus ATS: 15 features (analytics, AI, integrations)" -ForegroundColor Gray
Write-Host "   - Paylinq Payroll: 12 features (payments, time, compliance)" -ForegroundColor Gray
Write-Host "   - Portal Platform: 11 features (branding, SSO, analytics)" -ForegroundColor Gray
Write-Host "   - Tier-based access control (Starter/Professional/Enterprise)" -ForegroundColor Gray
Write-Host "   - Usage tracking & limits for metered features" -ForegroundColor Gray
Write-Host ""
Write-Host "[INFO] ScheduleHub: 16 scheduling tables created" -ForegroundColor Cyan
Write-Host "   - Worker & role management" -ForegroundColor Gray
Write-Host "   - Shift scheduling & stations" -ForegroundColor Gray
Write-Host "   - Availability tracking" -ForegroundColor Gray
Write-Host "   - Time-off requests" -ForegroundColor Gray
Write-Host "   - Shift swapping marketplace" -ForegroundColor Gray
Write-Host "   - Demand forecasting & optimization" -ForegroundColor Gray
Write-Host ""
Write-Host "[INFO] Deployment Service: 5 tables created" -ForegroundColor Cyan
Write-Host "   - VPS provisioning approval workflow" -ForegroundColor Gray
Write-Host "   - TransIP VPS inventory tracking" -ForegroundColor Gray
Write-Host "   - Approver management & permissions" -ForegroundColor Gray
Write-Host "   - Request comments & collaboration" -ForegroundColor Gray
Write-Host "   - Comprehensive audit logging" -ForegroundColor Gray
Write-Host ""
Write-Host "[WARNING] IMPORTANT:" -ForegroundColor Yellow
Write-Host "   1. Change default passwords immediately" -ForegroundColor Yellow
Write-Host "   2. Update backend/.env with:" -ForegroundColor Yellow
Write-Host "      DATABASE_URL=postgresql://${DBUser}:${DBPassword}@${DBHost}:${DBPort}/${DBName}" -ForegroundColor Cyan
Write-Host ""
Write-Host "[INFO] Next steps:" -ForegroundColor White
Write-Host "   cd ..\.." -ForegroundColor Cyan
Write-Host "   node src/server.js" -ForegroundColor Cyan
Write-Host ""

# Usage instructions
Write-Host "================================================================" -ForegroundColor Gray
Write-Host "[INFO] Usage examples:" -ForegroundColor Gray
Write-Host "   .\setup-database.ps1" -ForegroundColor Gray
Write-Host "   .\setup-database.ps1 -DBUser myuser -DBPassword mypass" -ForegroundColor Gray
Write-Host "   .\setup-database.ps1 -DBName recruitiq_prod" -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Gray
Write-Host ""
Write-Host "[INFO] Note: This script always drops and recreates the database!" -ForegroundColor Yellow
Write-Host ""
