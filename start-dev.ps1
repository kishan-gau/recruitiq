# RecruitIQ Enterprise Development Environment Startup Script
# Starts all services with ngrok tunnels for proper domain-based testing

Write-Host "[Starting] RecruitIQ Enterprise Development Environment" -ForegroundColor Cyan
Write-Host ""

# Check if project ngrok.yml has authtoken
$ngrokYml = Get-Content "$PSScriptRoot\ngrok.yml" -Raw
if ($ngrokYml -match "YOUR_AUTH_TOKEN_HERE") {
    Write-Host "[ERROR] ngrok not configured!" -ForegroundColor Red
    Write-Host "Please run: .\setup-ngrok.ps1" -ForegroundColor Yellow
    Write-Host "Or manually edit ngrok.yml and replace YOUR_AUTH_TOKEN_HERE with your actual token" -ForegroundColor Yellow
    exit 1
}

# Start backend
Write-Host "[1/6] Starting Backend API (port 4000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm start"
Start-Sleep -Seconds 5

# Start Nexus
Write-Host "[2/6] Starting Nexus HRIS (port 5175)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\nexus'; npm run dev"
Start-Sleep -Seconds 3

# Start PayLinQ
Write-Host "[3/6] Starting PayLinQ Payroll (port 5174)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\paylinq'; npm run dev"
Start-Sleep -Seconds 3

# Start RecruitIQ
Write-Host "[4/6] Starting RecruitIQ ATS (port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\recruitiq'; npm run dev"
Start-Sleep -Seconds 3

# Start Portal
Write-Host "[5/6] Starting Portal Admin (port 5176)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\portal'; npm run dev"
Start-Sleep -Seconds 3

# Start ngrok tunnels
Write-Host "[6/6] Starting ngrok tunnels..." -ForegroundColor Green
Write-Host ""
Write-Host "Your applications will be available at:" -ForegroundColor Cyan
Write-Host "   Backend:   https://recruitiq-be-dev.ngrok.app" -ForegroundColor Green
Write-Host "   Nexus:     https://nexus-dev.ngrok.app" -ForegroundColor White
Write-Host "   PayLinQ:   https://paylinq-dev.ngrok.app" -ForegroundColor White
Write-Host "   RecruitIQ: https://recruitiq-dev.ngrok.app" -ForegroundColor White
Write-Host "   Portal:    https://portal-dev.ngrok.app" -ForegroundColor White
Write-Host ""
Write-Host "   ngrok UI:  http://127.0.0.1:4040" -ForegroundColor Yellow
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; ngrok start --all --config ngrok.yml"

Write-Host "[OK] All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to stop all services..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Cleanup
Write-Host "[Stopping] Stopping all services..." -ForegroundColor Red
Get-Process | Where-Object {$_.ProcessName -eq "node" -or $_.ProcessName -eq "ngrok"} | Stop-Process -Force
Write-Host "[OK] All services stopped" -ForegroundColor Green
