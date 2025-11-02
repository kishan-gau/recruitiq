param(
    [switch]$JestOnly,
    [switch]$BDDOnly,
    [switch]$SkipBDD,
    [switch]$SkipIntegration
)

$jestPassed = $false
$bddPassed = $false
$integrationPassed = $false
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

# Run Integration Tests (Security Headers)
if (-not $BDDOnly -and -not $SkipIntegration) {
    Write-Host ""
    Write-Host "Phase 1.5: Running Security Headers Integration Test..." -ForegroundColor Cyan
    Write-Host "This test verifies security headers in actual HTTP responses" -ForegroundColor Yellow
    
    node scripts/test-security-headers.js
    
    if ($LASTEXITCODE -eq 0) {
        $integrationPassed = $true
        Write-Host "Security headers integration test PASSED" -ForegroundColor Green
    } else {
        Write-Host "Security headers integration test FAILED" -ForegroundColor Red
    }
}

# Run BDD tests
if (-not $JestOnly -and -not $SkipBDD) {
    Write-Host ""
    Write-Host "Phase 2: Running BDD E2E Tests..." -ForegroundColor Cyan
    Write-Host "Checking and preparing prerequisites..." -ForegroundColor Yellow
    
    # Check if server is running
    $serverRunning = $false
    $serverJob = $null
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
        $serverRunning = $true
        Write-Host "✓ Server is already running" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Server is not running - starting it now..." -ForegroundColor Yellow
        
        # Start the server in background
        try {
            $serverJob = Start-Job -ScriptBlock {
                param($backendPath)
                Set-Location $backendPath
                npm run dev
            } -ArgumentList $backendDir
            
            Write-Host "Waiting for server to start (up to 30 seconds)..." -ForegroundColor Yellow
            
            # Wait for server to be ready
            $maxAttempts = 30
            $attempt = 0
            $serverStarted = $false
            
            while ($attempt -lt $maxAttempts -and -not $serverStarted) {
                Start-Sleep -Seconds 1
                $attempt++
                try {
                    $null = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 2 -ErrorAction Stop
                    $serverStarted = $true
                    $serverRunning = $true
                    Write-Host "✓ Server started successfully" -ForegroundColor Green
                }
                catch {
                    # Still waiting...
                }
            }
            
            if (-not $serverStarted) {
                Write-Host "✗ Server failed to start within 30 seconds" -ForegroundColor Red
                if ($serverJob) {
                    Stop-Job -Job $serverJob
                    Remove-Job -Job $serverJob
                }
            }
        }
        catch {
            Write-Host "✗ Error starting server: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Check database connectivity
    $dbAvailable = $false
    if ($serverRunning) {
        try {
            $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
            if ($healthResponse.database -eq "connected" -or $healthResponse.db -eq "healthy" -or $healthResponse.status -eq "ok") {
                $dbAvailable = $true
                Write-Host "✓ Database is available" -ForegroundColor Green
            } else {
                Write-Host "✗ Database is not connected" -ForegroundColor Red
                Write-Host "  Please ensure PostgreSQL is running and connection settings are correct" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "✗ Database connectivity check failed" -ForegroundColor Red
        }
    }
    
    # Check Redis (optional)
    if ($serverRunning) {
        try {
            $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
            if ($healthResponse.redis -eq "connected" -or $healthResponse.cache -eq "healthy") {
                Write-Host "✓ Redis is available" -ForegroundColor Green
            } else {
                Write-Host "⚠ Redis is not available (tests will run without caching)" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "⚠ Redis check skipped (optional)" -ForegroundColor Yellow
        }
    }
    
    # Proceed with tests if prerequisites are met
    if ($serverRunning -and $dbAvailable) {
        $bddScript = Join-Path $backendDir "tests\test-all-bdd.ps1"
        if (Test-Path $bddScript) {
            Write-Host ""
            Write-Host "All prerequisites met. Starting BDD tests..." -ForegroundColor Green
            & $bddScript
            if ($LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE) {
                $bddPassed = $true
                Write-Host "BDD tests PASSED" -ForegroundColor Green
            } else {
                Write-Host "BDD tests FAILED" -ForegroundColor Red
            }
        }
        
        # Clean up: Stop the server if we started it
        if ($serverJob) {
            Write-Host ""
            Write-Host "Stopping auto-started server..." -ForegroundColor Yellow
            Stop-Job -Job $serverJob -ErrorAction SilentlyContinue
            Remove-Job -Job $serverJob -ErrorAction SilentlyContinue
            Write-Host "✓ Server stopped" -ForegroundColor Green
        }
    }
    else {
        Write-Host ""
        Write-Host "Prerequisites not met. Cannot run BDD tests." -ForegroundColor Red
        Write-Host "Issues found:" -ForegroundColor Yellow
        if (-not $serverRunning) {
            Write-Host "  • Server could not be started automatically" -ForegroundColor Yellow
            Write-Host "    Manual action: npm run dev" -ForegroundColor Yellow
        }
        if (-not $dbAvailable) {
            Write-Host "  • Database is not available" -ForegroundColor Yellow
            Write-Host "    Manual action: Ensure PostgreSQL is running" -ForegroundColor Yellow
        }
        $bddPassed = $false
        
        # Clean up failed server start attempt
        if ($serverJob) {
            Stop-Job -Job $serverJob -ErrorAction SilentlyContinue
            Remove-Job -Job $serverJob -ErrorAction SilentlyContinue
        }
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

if (-not $BDDOnly -and -not $SkipIntegration) {
    if ($integrationPassed) {
        Write-Host "Security Headers Integration: PASSED" -ForegroundColor Green
    } else {
        Write-Host "Security Headers Integration: FAILED" -ForegroundColor Red
    }
}

if (-not $JestOnly -and -not $SkipBDD) {
    if ($bddPassed) {
        Write-Host "BDD Tests: PASSED" -ForegroundColor Green
    } else {
        Write-Host "BDD Tests: FAILED" -ForegroundColor Red
    }
}

$allPassed = ($BDDOnly -or $jestPassed) -and ($BDDOnly -or $SkipIntegration -or $integrationPassed) -and ($JestOnly -or $SkipBDD -or $bddPassed)
if ($allPassed) {
    Write-Host ""
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "SOME TESTS FAILED" -ForegroundColor Red
    exit 1
}
