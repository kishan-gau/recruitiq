# Validation script for ngrok development setup

Write-Host "[Validating] ngrok Development Setup" -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

# Check 1: ngrok installed
Write-Host "1. Checking ngrok installation..." -NoNewline
try {
    $ngrokVersion = & ngrok version 2>&1
    if ($ngrokVersion -match "ngrok version") {
        Write-Host " [OK]" -ForegroundColor Green
    } else {
        Write-Host " [ERROR]" -ForegroundColor Red
        Write-Host "   ngrok is not installed. Install with: winget install --id ngrok.ngrok" -ForegroundColor Yellow
        $errors++
    }
} catch {
    Write-Host " [ERROR]" -ForegroundColor Red
    Write-Host "   ngrok is not installed. Install with: winget install --id ngrok.ngrok" -ForegroundColor Yellow
    $errors++
}

# Check 2: ngrok configured (project ngrok.yml has authtoken)
Write-Host "2. Checking ngrok configuration..." -NoNewline
if (Test-Path "$PSScriptRoot\ngrok.yml") {
    $ngrokYml = Get-Content "$PSScriptRoot\ngrok.yml" -Raw
    if ($ngrokYml -match "YOUR_AUTH_TOKEN_HERE") {
        Write-Host " [ERROR]" -ForegroundColor Red
        Write-Host "   ngrok.yml still has placeholder token. Run: .\setup-ngrok.ps1" -ForegroundColor Yellow
        $errors++
    } else {
        Write-Host " [OK]" -ForegroundColor Green
    }
} else {
    Write-Host " [ERROR]" -ForegroundColor Red
    Write-Host "   ngrok.yml not found. Run: .\setup-ngrok.ps1" -ForegroundColor Yellow
    $errors++
}

# Check 3: Backend .env configured
Write-Host "3. Checking backend .env configuration..." -NoNewline
if (Test-Path "$PSScriptRoot\backend\.env") {
    $envContent = Get-Content "$PSScriptRoot\backend\.env" -Raw
    if ($envContent -match "ngrok\.app" -or $envContent -match "COOKIE_DOMAIN") {
        Write-Host " [OK]" -ForegroundColor Green
    } else {
        Write-Host " [WARNING]" -ForegroundColor Yellow
        Write-Host "   backend/.env may not be configured for ngrok. Check ALLOWED_ORIGINS and COOKIE_DOMAIN." -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host " [ERROR]" -ForegroundColor Red
    Write-Host "   backend/.env not found. Copy from backend/.env.ngrok and customize." -ForegroundColor Yellow
    $errors++
}

# Check 4: Node.js installed
Write-Host "4. Checking Node.js..." -NoNewline
try {
    $nodeVersion = & node --version 2>&1
    if ($nodeVersion) {
        Write-Host " [OK] $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host " [ERROR]" -ForegroundColor Red
        Write-Host "   Node.js not found. Install from https://nodejs.org" -ForegroundColor Yellow
        $errors++
    }
} catch {
    Write-Host " [ERROR]" -ForegroundColor Red
    Write-Host "   Node.js not found. Install from https://nodejs.org" -ForegroundColor Yellow
    $errors++
}

# Check 5: npm packages installed
Write-Host "5. Checking npm packages..." -NoNewline
$packagesOk = $true
$folders = @("backend", "apps\nexus", "apps\paylinq", "apps\recruitiq", "apps\portal")
foreach ($folder in $folders) {
    if (-not (Test-Path "$PSScriptRoot\$folder\node_modules")) {
        $packagesOk = $false
        break
    }
}
if ($packagesOk) {
    Write-Host " [OK]" -ForegroundColor Green
} else {
    Write-Host " [WARNING]" -ForegroundColor Yellow
    Write-Host "   Some node_modules folders missing. Run: pnpm install" -ForegroundColor Yellow
    $warnings++
}

# Check 6: PostgreSQL running
Write-Host "6. Checking PostgreSQL..." -NoNewline
try {
    $pgCheck = & pg_isready -h localhost -p 5432 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
    } else {
        Write-Host " [WARNING]" -ForegroundColor Yellow
        Write-Host "   PostgreSQL may not be running. Start it before running the app." -ForegroundColor Yellow
        $warnings++
    }
} catch {
    Write-Host " [WARNING]" -ForegroundColor Yellow
    Write-Host "   Could not check PostgreSQL. Ensure it's running before starting." -ForegroundColor Yellow
    $warnings++
}

# Check 7: Ports available
Write-Host "7. Checking required ports..." -NoNewline
$requiredPorts = @(4000, 5173, 5174, 5175, 5176)
$portsInUse = @()
foreach ($port in $requiredPorts) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($connection) {
        $portsInUse += $port
    }
}
if ($portsInUse.Count -eq 0) {
    Write-Host " [OK]" -ForegroundColor Green
} else {
    Write-Host " [WARNING]" -ForegroundColor Yellow
    Write-Host "   Ports in use: $($portsInUse -join ', '). Stop services using these ports." -ForegroundColor Yellow
    $warnings++
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "   All checks passed!" -ForegroundColor Green
    Write-Host "   Ready to start: .\start-dev.ps1" -ForegroundColor Green
    exit 0
} elseif ($errors -eq 0) {
    Write-Host "   Setup complete with $warnings warning(s)" -ForegroundColor Yellow
    Write-Host "   You can proceed: .\start-dev.ps1" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "   Setup incomplete: $errors error(s), $warnings warning(s)" -ForegroundColor Red
    Write-Host "   Fix errors before starting" -ForegroundColor Red
    exit 1
}
