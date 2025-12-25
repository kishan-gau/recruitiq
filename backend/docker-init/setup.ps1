# RecruitIQ Docker Database Setup Script
# This script helps set up the development environment with automatic database initialization

param(
    [string]$LicenseId = "",
    [string]$CustomerId = "",
    [string]$CustomerEmail = "",
    [string]$CustomerName = "",
    [string]$OrgName = "DevCorp Solutions",
    [string]$AdminEmail = "admin@devcorp.local",
    [string]$Tier = "starter",
    [string]$Country = "SR",
    [switch]$Reset
)

Write-Host "RecruitIQ Database Auto-Initialization Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Change to root directory to access main docker-compose.yml with all services
Set-Location $PSScriptRoot\..\..

if ($Reset) {
    Write-Host "Resetting database and volumes..." -ForegroundColor Yellow
    docker-compose down -v
    Write-Host "Reset complete" -ForegroundColor Green
}

# Create/Update .env file from template in backend directory
Write-Host "Creating .env file from template..." -ForegroundColor Yellow
if (Test-Path "backend\.env.example") {
    Copy-Item "backend\.env.example" "backend\.env" -Force
} else {
    Write-Host "Warning: backend\.env.example not found, creating basic .env" -ForegroundColor Yellow
    # Create a basic .env with required variables
    $basicEnv = @'
NODE_ENV=development
PORT=3001
POSTGRES_USER=postgres
POSTGRES_DB=recruitiq_dev
POSTGRES_PORT=5432
REDIS_PORT=6379
DEFAULT_ORG_NAME=DevCorp Solutions
DEFAULT_ADMIN_EMAIL=admin@devcorp.local
DEFAULT_TIER=starter
DEFAULT_COUNTRY=SR
DEFAULT_LICENSE_ID=
DEFAULT_CUSTOMER_ID=
DEFAULT_CUSTOMER_EMAIL=
DEFAULT_CUSTOMER_NAME=
'@
    Set-Content "backend\.env" $basicEnv
}

# Update .env with provided values
$envContent = Get-Content "backend\.env" -Raw
if ($LicenseId) { $envContent = $envContent -replace 'DEFAULT_LICENSE_ID=', "DEFAULT_LICENSE_ID=$LicenseId" }
if ($CustomerId) { $envContent = $envContent -replace 'DEFAULT_CUSTOMER_ID=', "DEFAULT_CUSTOMER_ID=$CustomerId" }
if ($CustomerEmail) { $envContent = $envContent -replace 'DEFAULT_CUSTOMER_EMAIL=', "DEFAULT_CUSTOMER_EMAIL=$CustomerEmail" }
if ($CustomerName) { $envContent = $envContent -replace 'DEFAULT_CUSTOMER_NAME=', "DEFAULT_CUSTOMER_NAME=$CustomerName" }
$envContent = $envContent -replace 'DEFAULT_ORG_NAME=DevCorp Solutions', "DEFAULT_ORG_NAME=$OrgName"
$envContent = $envContent -replace 'DEFAULT_ADMIN_EMAIL=admin@devcorp.local', "DEFAULT_ADMIN_EMAIL=$AdminEmail"
$envContent = $envContent -replace 'DEFAULT_TIER=starter', "DEFAULT_TIER=$Tier"
$envContent = $envContent -replace 'DEFAULT_COUNTRY=SR', "DEFAULT_COUNTRY=$Country"

# Generate a secure postgres password (avoiding shell-problematic characters)
$postgresPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 24 | ForEach-Object {[char]$_})
# Set passwords (same for both postgres and redis for simplicity)
$envContent = $envContent -replace '<GENERATE_WITH_OPENSSL_RAND_BASE64_32>', $postgresPassword
$envContent = $envContent -replace '<POSTGRES_PASSWORD>', $postgresPassword

# Add REDIS_PASSWORD if not present
if ($envContent -notmatch 'REDIS_PASSWORD=') {
    $envContent += "`nREDIS_PASSWORD=$postgresPassword`n"
} else {
    $envContent = $envContent -replace 'REDIS_PASSWORD=.*', "REDIS_PASSWORD=$postgresPassword"
}

# Add JWT secrets if not present
if ($envContent -notmatch 'JWT_SECRET=') {
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $envContent += "JWT_SECRET=$jwtSecret`n"
}
if ($envContent -notmatch 'JWT_REFRESH_SECRET=') {
    $jwtRefreshSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $envContent += "JWT_REFRESH_SECRET=$jwtRefreshSecret`n"
}

# Add ENCRYPTION_KEY if missing
if ($envContent -notmatch 'ENCRYPTION_KEY=') {
    $encryptionKey = -join ((48..57) + (65..70) | Get-Random -Count 128 | ForEach-Object {[char]$_})  # Hex chars only: 0-9, A-F
    $envContent += "ENCRYPTION_KEY=$encryptionKey`n"
    $envContent += "ENCRYPTION_MASTER_KEY=$encryptionKey`n"
}

# Add SESSION_SECRET if missing
if ($envContent -notmatch 'SESSION_SECRET=') {
    $sessionSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    $envContent += "SESSION_SECRET=$sessionSecret`n"
}

Set-Content "backend\.env" $envContent
    
    Write-Host ".env file created with:" -ForegroundColor Green
    if ($LicenseId -and $CustomerId -and $CustomerEmail -and $CustomerName) {
        Write-Host "   License ID: $LicenseId" -ForegroundColor Gray
        Write-Host "   Customer ID: $CustomerId" -ForegroundColor Gray
        Write-Host "   Customer Email: $CustomerEmail" -ForegroundColor Gray
        Write-Host "   Customer Name: $CustomerName" -ForegroundColor Gray
        Write-Host "   Organization: $OrgName" -ForegroundColor Gray
        Write-Host "   Admin Email: $AdminEmail" -ForegroundColor Gray
        Write-Host "   Tier: $Tier" -ForegroundColor Gray
        Write-Host "   Country: $Country" -ForegroundColor Gray
        Write-Host "   Generated secure PostgreSQL password" -ForegroundColor Gray
        Write-Host "   Generated Redis password" -ForegroundColor Gray  
        Write-Host "   Generated JWT secrets" -ForegroundColor Gray
        Write-Host "   Generated encryption key" -ForegroundColor Gray
        Write-Host "   Generated session secret" -ForegroundColor Gray
        Write-Host "" 
        Write-Host "   Tenant creation will be automatic" -ForegroundColor Green
    } else {
        Write-Host "   Organization: $OrgName" -ForegroundColor Gray
        Write-Host "   Admin Email: $AdminEmail" -ForegroundColor Gray
        Write-Host "   Tier: $Tier" -ForegroundColor Gray
        Write-Host "   Generated secure PostgreSQL password" -ForegroundColor Gray
        Write-Host "   Generated Redis password" -ForegroundColor Gray  
        Write-Host "   Generated JWT secrets" -ForegroundColor Gray
        Write-Host "   Generated encryption key" -ForegroundColor Gray
        Write-Host "   Generated session secret" -ForegroundColor Gray
        Write-Host "" 
        Write-Host "   Tenant creation will be skipped (missing tenant parameters)" -ForegroundColor Yellow
        if ($LicenseId -or $CustomerId -or $CustomerEmail -or $CustomerName) {
            Write-Host "   For tenant creation, provide all 4 parameters: LicenseId, CustomerId, CustomerEmail, CustomerName" -ForegroundColor Cyan
        }
    }
    Write-Host ""
    Write-Host "IMPORTANT: Edit .env file to customize other settings if needed" -ForegroundColor Yellow

Write-Host ""
Write-Host "Starting Docker containers..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Setup complete!" -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host "Your RecruitIQ development environment is starting up." -ForegroundColor White
    Write-Host ""
    Write-Host "Database initialization will happen automatically in the background." -ForegroundColor White
    Write-Host "This includes:" -ForegroundColor White
    Write-Host "  Database schema creation (35+ migrations)" -ForegroundColor Gray
    Write-Host "  Production seeds (platform data, RBAC)" -ForegroundColor Gray
    if ($LicenseId -and $CustomerId -and $CustomerEmail -and $CustomerName) {
        Write-Host "  Default tenant creation enabled" -ForegroundColor Gray
    } else {
        Write-Host "  Tenant creation (skipped - requires all 4 parameters: LicenseId, CustomerId, CustomerEmail, CustomerName)" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "To monitor initialization progress:" -ForegroundColor White
    Write-Host "  docker-compose logs -f postgres" -ForegroundColor Cyan
    Write-Host ""
    if ($LicenseId -and $CustomerId -and $CustomerEmail -and $CustomerName) {
        Write-Host "Once complete, your tenant details:" -ForegroundColor White
        Write-Host "  Organization: $OrgName" -ForegroundColor Gray
        Write-Host "  Admin Email: $CustomerEmail" -ForegroundColor Gray
        Write-Host "  Customer Name: $CustomerName" -ForegroundColor Gray
        Write-Host "  License ID: $($LicenseId.Substring(0,8))..." -ForegroundColor Gray
        Write-Host "  Customer ID: $($CustomerId.Substring(0,8))..." -ForegroundColor Gray
        Write-Host "  Login URL: http://localhost:3001/login" -ForegroundColor Gray
        Write-Host ""
        Write-Host "The admin password will be shown in the PostgreSQL logs." -ForegroundColor Yellow
    } else {
        Write-Host "To create a tenant after database setup:" -ForegroundColor White
        Write-Host "  node scripts/onboard-tenant.js --license-id=<uuid> --customer-id=<uuid> --email=admin@example.com --name=<company>" -ForegroundColor Gray
    }
    Write-Host "====================================" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Failed to start containers. Check the error messages above." -ForegroundColor Red
}

# Display available commands
Write-Host ""
Write-Host "Available commands:" -ForegroundColor White
Write-Host "  .\setup.ps1 -LicenseId <uuid> -CustomerId <uuid> -CustomerEmail <email> -CustomerName <name>" -ForegroundColor Gray
Write-Host "  .\setup.ps1 -Reset" -ForegroundColor Gray
Write-Host "  docker-compose logs -f postgres" -ForegroundColor Gray
Write-Host "  node scripts/onboard-tenant.js --help" -ForegroundColor Gray
Write-Host "  docker-compose down -v" -ForegroundColor Gray