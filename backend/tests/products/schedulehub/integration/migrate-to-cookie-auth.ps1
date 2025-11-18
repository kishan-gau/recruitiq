# Migration script: Convert ScheduleHub integration tests from Bearer token to cookie-based auth
# This script updates all test files in the integration directory

$testFiles = @(
    "availability.test.js",
    "roles.test.js",
    "schedules.test.js",
    "shiftswaps.test.js",
    "stations.test.js",
    "timeoff.test.js"
)

foreach ($file in $testFiles) {
    $filePath = ".\$file"
    Write-Host "Migrating $file..." -ForegroundColor Cyan
    
    $content = Get-Content $filePath -Raw
    
    # Remove describe.skip and enable tests
    $content = $content -replace 'describe\.skip\(', 'describe('
    
    # Update API paths from /api/schedulehub/ to /api/products/schedulehub/
    $content = $content -replace "'/api/schedulehub/", "'/api/products/schedulehub/"
    $content = $content -replace '`/api/schedulehub/', '`/api/products/schedulehub/'
    
    # Replace request(app) with agent
    $content = $content -replace 'request\(app\)\s*\r?\n\s*\.', 'agent.'
    
    # Remove Bearer token auth lines
    $content = $content -replace '\s*\.set\(''Authorization'', ``Bearer \$\{token\}``\)\r?\n', ''
    
    # Add CSRF token to POST/PATCH/DELETE requests that have .send(
    $content = $content -replace '(agent\.(post|patch|delete)\([^\)]+\))\s*\r?\n\s*(\.send\()', "`$1`r`n        .set('X-CSRF-Token', csrfToken)`r`n        `$3"
    
    # Update imports - remove request/app, these are not needed with agent
    # Keep pool import
    
    Set-Content $filePath $content -NoNewline
    
    Write-Host "✓ Migrated $file" -ForegroundColor Green
}

Write-Host "`nAll files migrated successfully!" -ForegroundColor Green
Write-Host "Note: The setup.js file was already migrated manually." -ForegroundColor Yellow
