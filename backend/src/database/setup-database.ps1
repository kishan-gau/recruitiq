# ============================================================================
# RecruitIQ Database Setup Script (PowerShell)
# ============================================================================

param(
    [switch]$DropExisting = $false,
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

# Drop existing database if requested
if ($DropExisting) {
    Write-Host "[WARNING] Dropping existing database: $DBName" -ForegroundColor Yellow
    & $psql -h $DBHost -p $DBPort -U $DBUser -d postgres -c "DROP DATABASE IF EXISTS $DBName;" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Database dropped" -ForegroundColor Green
    }
    Write-Host ""
}

# Create database if it doesn't exist
Write-Host "[*] Creating database: $DBName" -ForegroundColor Yellow
& $psql -h $DBHost -p $DBPort -U $DBUser -d postgres -c "CREATE DATABASE $DBName;" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Database created" -ForegroundColor Green
} else {
    Write-Host "[INFO] Database already exists (this is ok)" -ForegroundColor Cyan
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
Write-Host "[*] Creating License Manager tables..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

& $psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f schema-license-manager.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error creating License Manager tables" -ForegroundColor Red
    exit 1
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

# Clean up environment variable
Remove-Item Env:\PGPASSWORD

# Summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "[OK] Database setup complete!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Database: $DBName" -ForegroundColor White
Write-Host "[INFO] Default Users:" -ForegroundColor White
Write-Host "   - admin@recruitiq.com (Super Admin)" -ForegroundColor White
Write-Host "   - license@recruitiq.com (License Admin)" -ForegroundColor White
Write-Host "   - security@recruitiq.com (Security Admin)" -ForegroundColor White
Write-Host "   Password: Admin123!" -ForegroundColor Yellow
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
Write-Host "   .\setup-database.ps1 -DropExisting" -ForegroundColor Gray
Write-Host "   .\setup-database.ps1 -DBUser myuser -DBPassword mypass" -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Gray
Write-Host ""
