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
Write-Host "[*] RBAC system already included in schema.sql" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[OK] RBAC system created with tenant-level roles and permissions" -ForegroundColor Green

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding RBAC platform roles and permissions..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-rbac-platform.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding RBAC platform" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding product permissions..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

Write-Host "[*] Seeding Nexus HRIS permissions..." -ForegroundColor Yellow
& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-rbac-nexus-permissions.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding Nexus permissions" -ForegroundColor Red
    exit 1
}

Write-Host "[*] Seeding PayLinQ payroll permissions..." -ForegroundColor Yellow
& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-rbac-paylinq-permissions.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding PayLinQ permissions" -ForegroundColor Red
    exit 1
}

Write-Host "[*] Seeding ScheduleHub scheduling permissions..." -ForegroundColor Yellow
& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-rbac-schedulehub-permissions.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding ScheduleHub permissions" -ForegroundColor Red
    exit 1
}

Write-Host "[*] Seeding RecruitIQ ATS permissions..." -ForegroundColor Yellow
& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-rbac-recruitiq-permissions.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding RecruitIQ permissions" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding platform admin users..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-admin-users.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding admin users" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding products and features..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-products.sql

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

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-formula-templates.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error creating formula templates" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Creating test organization and tenant users..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-test-tenant.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error creating test organization" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding default tenant roles (requires test org)..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-rbac-tenant-roles.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding tenant roles" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Assigning roles to test users..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-test-user-roles.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error assigning user roles" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding Suriname tax rules..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-suriname-tax-rules.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding Suriname tax rules" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding payroll run types..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-payroll-run-types.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding payroll run types" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding worker type templates..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-worker-types.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding worker types" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding tax-free allowances..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-allowances.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding allowances" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Seeding forfaitair benefits component library..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f seeds/seed-forfaitair-components.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error seeding forfaitair components" -ForegroundColor Red
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
Write-Host "[INFO] Paylinq: 27 payroll tables created" -ForegroundColor Cyan
Write-Host "   - Employee records & compensation" -ForegroundColor Gray
Write-Host "   - Time & attendance tracking" -ForegroundColor Gray
Write-Host "   - Payroll processing & paychecks" -ForegroundColor Gray
Write-Host "   - Tax calculation & compliance (Surinamese law)" -ForegroundColor Gray
Write-Host "   - Component-based payroll architecture" -ForegroundColor Gray
Write-Host "   - Tax-free allowances & run types" -ForegroundColor Gray
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
Write-Host "[INFO] Enhanced RBAC System: Tenant-level organization-scoped roles" -ForegroundColor Cyan
Write-Host "   - Platform roles (6): super_admin, platform_admin, license_admin, etc." -ForegroundColor Gray
Write-Host "   - Tenant roles (9): org_admin, hr_manager, payroll_admin, etc." -ForegroundColor Gray
Write-Host "   - Product permissions seeded:" -ForegroundColor Gray
Write-Host "     * Nexus HRIS: 60 permissions across 11 categories" -ForegroundColor Gray
Write-Host "     * PayLinQ Payroll: 59 permissions across 11 categories" -ForegroundColor Gray
Write-Host "     * ScheduleHub: 48 permissions across 10 categories" -ForegroundColor Gray
Write-Host "     * RecruitIQ ATS: 47 permissions across 10 categories" -ForegroundColor Gray
Write-Host "   - Custom roles: Organizations can create their own roles" -ForegroundColor Gray
Write-Host "   - Role-permission mapping with audit trail" -ForegroundColor Gray
Write-Host "   - User-role assignments per organization" -ForegroundColor Gray
Write-Host "   - Each tenant app manages its own RBAC via Settings page" -ForegroundColor Gray
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
Write-Host "[INFO] Payroll Run Types: 7 default types seeded" -ForegroundColor Cyan
Write-Host "   - REGULAR: Standard monthly payroll" -ForegroundColor Gray
Write-Host "   - VAKANTIEGELD: Holiday allowance (8% semi-annual)" -ForegroundColor Gray
Write-Host "   - BONUS: Performance bonuses & gratuities" -ForegroundColor Gray
Write-Host "   - THIRTEENTH_MONTH: 13th month salary" -ForegroundColor Gray
Write-Host "   - ADJUSTMENT: Corrections & back pay" -ForegroundColor Gray
Write-Host "   - FINAL_PAY: Termination settlements" -ForegroundColor Gray
Write-Host "   - COMMISSION: Sales commissions" -ForegroundColor Gray
Write-Host ""
Write-Host "[INFO] Worker Type Templates: 7 employment types seeded" -ForegroundColor Cyan
Write-Host "   - Full-Time: Standard 40 hours/week employees" -ForegroundColor Gray
Write-Host "   - Part-Time: Reduced hours employees" -ForegroundColor Gray
Write-Host "   - Contractor: Independent contractors" -ForegroundColor Gray
Write-Host "   - Temporary: Fixed-term workers" -ForegroundColor Gray
Write-Host "   - Intern: Training program participants" -ForegroundColor Gray
Write-Host "   - Seasonal: Peak period workers" -ForegroundColor Gray
Write-Host "   - Freelance: Project-based workers" -ForegroundColor Gray
Write-Host ""
Write-Host "[INFO] Tax-Free Allowances: Surinamese law caps seeded" -ForegroundColor Cyan
Write-Host "   - Holiday allowance: SRD 10,016/year (Article 10i)" -ForegroundColor Gray
Write-Host "   - Bonus/gratuity: SRD 10,016/year (Article 10j)" -ForegroundColor Gray
Write-Host "   - Monthly tax-free sum: SRD 9,000/month (Article 13)" -ForegroundColor Gray
Write-Host "   - Yearly usage tracked per employee" -ForegroundColor Gray
Write-Host ""
Write-Host "[INFO] Forfaitair Benefits Component Library: 21 global components seeded" -ForegroundColor Cyan
Write-Host "   - Company Car Benefits: 2% standard, 3% luxury, usage-based" -ForegroundColor Gray
Write-Host "   - Housing Benefits: 7.5% standard, progressive rates, fixed allowance" -ForegroundColor Gray
Write-Host "   - Meal Benefits: Hot meals, cold meals, full board" -ForegroundColor Gray
Write-Host "   - Medical Coverage: Health insurance, comprehensive plans" -ForegroundColor Gray
Write-Host "   - Transport Benefits: Fuel allowance, public transport subsidy" -ForegroundColor Gray
Write-Host "   - Communication: Phone/mobile and internet allowances" -ForegroundColor Gray
Write-Host "   - Clothing: Uniform/professional attire allowance" -ForegroundColor Gray
Write-Host "   - Tax Deductions: 25% forfaitair deductible costs" -ForegroundColor Gray
Write-Host "   - Available to ALL organizations (global library)" -ForegroundColor Gray
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
