#!/usr/bin/env pwsh
# Start Nexus dev server from workspace root
# Used by Playwright webServer configuration

Write-Host "🚀 Starting Nexus dev server..."

# Change to workspace root (two levels up from nexus app directory)
$WorkspaceRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $WorkspaceRoot

# Start Vite dev server
pnpm run --filter=nexus dev
