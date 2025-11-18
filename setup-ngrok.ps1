# ngrok Initial Setup Helper
# Guides you through the initial ngrok configuration

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "                                                                " -ForegroundColor Cyan
Write-Host "        RecruitIQ Enterprise Development Setup                  " -ForegroundColor Cyan
Write-Host "        ngrok Configuration Assistant                           " -ForegroundColor Cyan
Write-Host "                                                                " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will guide you through setting up ngrok for development." -ForegroundColor White
Write-Host ""

# Step 1: Check if ngrok is installed
Write-Host "Step 1: Checking ngrok installation..." -ForegroundColor Yellow
try {
    $null = & ngrok version 2>&1
    Write-Host "[OK] ngrok is installed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] ngrok is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installing ngrok..." -ForegroundColor Yellow
    winget install --id ngrok.ngrok
    
    # Refresh PATH to pick up new installation
    Write-Host "Refreshing environment..." -ForegroundColor Yellow
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # Verify installation
    try {
        $null = & ngrok version 2>&1
        Write-Host "[OK] ngrok installed and ready" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Please restart PowerShell and run this script again" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "Step 2: ngrok Account Setup" -ForegroundColor Yellow
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "You need an ngrok account with Pro plan to use reserved domains." -ForegroundColor White
Write-Host ""
Write-Host "Actions required:" -ForegroundColor Cyan
Write-Host "  1. Sign up at: https://dashboard.ngrok.com/signup" -ForegroundColor White
Write-Host "  2. Upgrade to Pro (`$8/month): https://dashboard.ngrok.com/billing/subscription" -ForegroundColor White
Write-Host "  3. Reserve 4 domains: https://dashboard.ngrok.com/cloud-edge/domains" -ForegroundColor White
Write-Host "     Suggested names:" -ForegroundColor White
Write-Host "       - nexus-dev" -ForegroundColor Gray
Write-Host "       - paylinq-dev" -ForegroundColor Gray
Write-Host "       - recruitiq-dev" -ForegroundColor Gray
Write-Host "       - portal-dev" -ForegroundColor Gray
Write-Host ""

$continue = Read-Host "Have you completed the above steps? (y/N)"
if ($continue -ne 'y' -and $continue -ne 'Y') {
    Write-Host ""
    Write-Host "Please complete the signup and domain reservation, then run this script again." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Step 3: Get Your Auth Token" -ForegroundColor Yellow
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "Visit: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Cyan
Write-Host ""

$authToken = Read-Host "Paste your auth token here"

if ([string]::IsNullOrWhiteSpace($authToken)) {
    Write-Host "[ERROR] No token provided. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Configuring ngrok..." -NoNewline
& ngrok config add-authtoken $authToken 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host " [OK]" -ForegroundColor Green
} else {
    Write-Host " [ERROR]" -ForegroundColor Red
    Write-Host "Failed to configure ngrok. Please check your token and try again." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Update Project Configuration" -ForegroundColor Yellow
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

# Update ngrok.yml
Write-Host "What are your reserved domain names?" -ForegroundColor Cyan
Write-Host "(Just the prefix, without .ngrok.app)" -ForegroundColor Gray
Write-Host ""

$nexusDomain = Read-Host "Nexus domain prefix (default: nexus-dev)"
$paylinqDomain = Read-Host "PayLinQ domain prefix (default: paylinq-dev)"
$recruitiqDomain = Read-Host "RecruitIQ domain prefix (default: recruitiq-dev)"
$portalDomain = Read-Host "Portal domain prefix (default: portal-dev)"

# Use defaults if empty
if ([string]::IsNullOrWhiteSpace($nexusDomain)) { $nexusDomain = "nexus-dev" }
if ([string]::IsNullOrWhiteSpace($paylinqDomain)) { $paylinqDomain = "paylinq-dev" }
if ([string]::IsNullOrWhiteSpace($recruitiqDomain)) { $recruitiqDomain = "recruitiq-dev" }
if ([string]::IsNullOrWhiteSpace($portalDomain)) { $portalDomain = "portal-dev" }

# Update ngrok.yml
$ngrokYmlPath = "$PSScriptRoot\ngrok.yml"
$ngrokYml = Get-Content $ngrokYmlPath -Raw

$ngrokYml = $ngrokYml -replace 'authtoken: YOUR_AUTH_TOKEN_HERE', "authtoken: $authToken"
$ngrokYml = $ngrokYml -replace 'hostname: nexus-dev\.ngrok\.app', "hostname: $nexusDomain.ngrok.app"
$ngrokYml = $ngrokYml -replace 'hostname: paylinq-dev\.ngrok\.app', "hostname: $paylinqDomain.ngrok.app"
$ngrokYml = $ngrokYml -replace 'hostname: recruitiq-dev\.ngrok\.app', "hostname: $recruitiqDomain.ngrok.app"
$ngrokYml = $ngrokYml -replace 'hostname: portal-dev\.ngrok\.app', "hostname: $portalDomain.ngrok.app"

Set-Content -Path $ngrokYmlPath -Value $ngrokYml

Write-Host "[OK] Updated ngrok.yml" -ForegroundColor Green

# Update backend .env
Write-Host ""
Write-Host "Updating backend configuration..." -NoNewline

$backendEnvPath = "$PSScriptRoot\backend\.env"
$envNgrokPath = "$PSScriptRoot\backend\.env.ngrok"

if (Test-Path $envNgrokPath) {
    Copy-Item $envNgrokPath $backendEnvPath -Force
    
    $backendEnv = Get-Content $backendEnvPath -Raw
    $backendEnv = $backendEnv -replace 'nexus-dev\.ngrok\.app', "$nexusDomain.ngrok.app"
    $backendEnv = $backendEnv -replace 'paylinq-dev\.ngrok\.app', "$paylinqDomain.ngrok.app"
    $backendEnv = $backendEnv -replace 'recruitiq-dev\.ngrok\.app', "$recruitiqDomain.ngrok.app"
    $backendEnv = $backendEnv -replace 'portal-dev\.ngrok\.app', "$portalDomain.ngrok.app"
    
    Set-Content -Path $backendEnvPath -Value $backendEnv
    Write-Host " [OK]" -ForegroundColor Green
} else {
    Write-Host " [WARNING]" -ForegroundColor Yellow
    Write-Host "Warning: .env.ngrok template not found. You'll need to update .env manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "                                                                " -ForegroundColor Green
Write-Host "                    Setup Complete!                             " -ForegroundColor Green
Write-Host "                                                                " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Your ngrok domains:" -ForegroundColor Cyan
Write-Host "  - Nexus:     https://$nexusDomain.ngrok.app" -ForegroundColor White
Write-Host "  - PayLinQ:   https://$paylinqDomain.ngrok.app" -ForegroundColor White
Write-Host "  - RecruitIQ: https://$recruitiqDomain.ngrok.app" -ForegroundColor White
Write-Host "  - Portal:    https://$portalDomain.ngrok.app" -ForegroundColor White
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Validate setup: .\validate-setup.ps1" -ForegroundColor White
Write-Host "  2. Start environment: .\start-dev.ps1" -ForegroundColor White
Write-Host "  3. Open your Nexus domain in browser" -ForegroundColor White
Write-Host ""

Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  - Quick Start: NGROK_QUICK_START.md" -ForegroundColor White
Write-Host "  - Full Guide: docs/NGROK_SETUP.md" -ForegroundColor White
Write-Host ""

$startNow = Read-Host "Would you like to start the development environment now? (y/N)"
if ($startNow -eq 'y' -or $startNow -eq 'Y') {
    Write-Host ""
    Write-Host "Starting development environment..." -ForegroundColor Cyan
    & "$PSScriptRoot\start-dev.ps1"
} else {
    Write-Host ""
    Write-Host "Run .\start-dev.ps1 when ready to start!" -ForegroundColor Cyan
}
