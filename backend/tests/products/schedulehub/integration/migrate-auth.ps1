# Migration script for ScheduleHub integration tests
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
    
    # Remove describe.skip
    $content = $content -replace 'describe\.skip\(', 'describe('
    
    # Update API paths
    $content = $content -replace "'/api/schedulehub/", "'/api/products/schedulehub/"
    $content = $content -replace '`/api/schedulehub/', '`/api/products/schedulehub/'
    
    # Replace request(app) with agent
    $content = $content -replace 'request\(app\)\s*\r?\n\s*\.', 'agent.'
    
    # Remove Bearer token
    $content = $content -replace '\s*\.set\(''Authorization'', `Bearer \$\{token\}`\)\r?\n', ''
    
    # Add CSRF token to write operations
    $content = $content -replace '(agent\.(post|patch|delete)\([^\)]+\))\s*\r?\n\s*(\.send\()', "`$1`r`n        .set('X-CSRF-Token', csrfToken)`r`n        `$3"
    
    Set-Content $filePath $content -NoNewline
    
    Write-Host "Done with $file" -ForegroundColor Green
}

Write-Host "Migration complete" -ForegroundColor Green
