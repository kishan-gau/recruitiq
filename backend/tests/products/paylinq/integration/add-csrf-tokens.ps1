# Script to add CSRF token headers to all agent POST/PUT/DELETE requests
$filePath = "workerTypeAPI.test.js"
$content = Get-Content $filePath -Raw

# Pattern 1: agent.post/put/delete without CSRF token already
# Add .set('X-CSRF-Token', csrfToken) after the method call
$content = $content -replace '(agent\r?\n\s+\.(post|put|delete)\([^)]+\))\r?\n(\s+)\.send\(', "`$1`r`n`$3.set('X-CSRF-Token', csrfToken)`r`n`$3.send("

# Pattern 2: agent.post/put/delete followed by .expect (no .send)
$content = $content -replace '(agent\r?\n\s+\.(post|put|delete)\([^)]+\))\r?\n(\s+)\.expect\(', "`$1`r`n`$3.set('X-CSRF-Token', csrfToken)`r`n`$3.expect("

# Pattern 3: agent2 (org2) requests - use csrfToken2
$content = $content -replace '(agent2\r?\n\s+\.(post|put|delete)\([^)]+\))\r?\n(\s+)\.send\(', "`$1`r`n`$3.set('X-CSRF-Token', csrfToken2)`r`n`$3.send("
$content = $content -replace '(agent2\r?\n\s+\.(post|put|delete)\([^)]+\))\r?\n(\s+)\.expect\(', "`$1`r`n`$3.set('X-CSRF-Token', csrfToken2)`r`n`$3.expect("

# Write back
$content | Set-Content $filePath -NoNewline

Write-Host "✅ Added CSRF tokens to all agent POST/PUT/DELETE requests"
