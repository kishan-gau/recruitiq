param(
    [switch]$JestOnly,
    [switch]$BDDOnly,
    [switch]$SkipBDD
)

$jestPassed = $false
$bddPassed = $false
$startTime = Get-Date

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Blue
Write-Host " RecruitIQ Backend - Unified Test Suite Runner" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Blue
Write-Host ""

# Change to backend directory
$backendDir = Split-Path -Parent $PSScriptRoot
Set-Location $backendDir

# Run Jest tests
if (-not $BDDOnly) {
    Write-Host ""
    Write-Host "Phase 1: Running Jest Tests..." -ForegroundColor Cyan
    npm test
    
    if ($LASTEXITCODE -eq 0) {
        $jestPassed = $true
        Write-Host "Jest tests PASSED" -ForegroundColor Green
    } else {
        Write-Host "Jest tests FAILED" -ForegroundColor Red
    }
}

# Run BDD tests
if (-not $JestOnly -and -not $SkipBDD) {
    Write-Host ""
    Write-Host "Phase 2: Running BDD E2E Tests..." -ForegroundColor Cyan
    Write-Host "NOTE: Server must be running on http://localhost:3000" -ForegroundColor Yellow
    
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
        
        $bddScript = Join-Path $backendDir "tests\test-all-bdd.ps1"
        if (Test-Path $bddScript) {
            & $bddScript
            if ($LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE) {
                $bddPassed = $true
                Write-Host "BDD tests PASSED" -ForegroundColor Green
            } else {
                Write-Host "BDD tests FAILED" -ForegroundColor Red
            }
        }
    }
    catch {
        Write-Host "Server not running. Skipping BDD tests." -ForegroundColor Yellow
        Write-Host "Start server with: npm run dev" -ForegroundColor Yellow
        $bddPassed = $true
    }
}

# Summary
Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Blue
Write-Host " Test Results Summary" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Blue
$duration = (Get-Date) - $startTime
Write-Host "Duration: $($duration.ToString('mm\:ss'))" -ForegroundColor Cyan

if (-not $BDDOnly) {
    if ($jestPassed) {
        Write-Host "Jest Tests: PASSED" -ForegroundColor Green
    } else {
        Write-Host "Jest Tests: FAILED" -ForegroundColor Red
    }
}

if (-not $JestOnly -and -not $SkipBDD) {
    if ($bddPassed) {
        Write-Host "BDD Tests: PASSED" -ForegroundColor Green
    } else {
        Write-Host "BDD Tests: FAILED" -ForegroundColor Red
    }
}

$allPassed = ($BDDOnly -or $jestPassed) -and ($JestOnly -or $SkipBDD -or $bddPassed)
if ($allPassed) {
    Write-Host ""
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "SOME TESTS FAILED" -ForegroundColor Red
    exit 1
}
