# ==============================================================================
# RecruitIQ Secret Generator
# ==============================================================================
# Generates cryptographically secure secrets for production deployment
# Run with: powershell -ExecutionPolicy Bypass -File scripts/generate-secrets.ps1
# ==============================================================================

Write-Host ""
Write-Host "🔐 RecruitIQ Secret Generator" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Generating cryptographically secure secrets..." -ForegroundColor Yellow
Write-Host ""

# Function to generate random base64 string
function Generate-Base64Secret {
    param([int]$length)
    $bytes = New-Object byte[] $length
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

# Function to generate random hex string
function Generate-HexSecret {
    param([int]$length)
    $bytes = New-Object byte[] $length
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($bytes)
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ''
}

Write-Host "📝 Copy these values to your .env file:" -ForegroundColor Green
Write-Host ""

Write-Host "# =============================================================================="
Write-Host "# JWT SECRETS (256-bit minimum)" -ForegroundColor Cyan
Write-Host "# =============================================================================="
Write-Host "JWT_SECRET=$(Generate-Base64Secret 48)"
Write-Host "JWT_REFRESH_SECRET=$(Generate-Base64Secret 48)"
Write-Host ""

Write-Host "# =============================================================================="
Write-Host "# DATABASE & REDIS PASSWORDS" -ForegroundColor Cyan
Write-Host "# =============================================================================="
Write-Host "POSTGRES_PASSWORD=$(Generate-Base64Secret 32)"
Write-Host "REDIS_PASSWORD=$(Generate-Base64Secret 32)"
Write-Host ""

Write-Host "# =============================================================================="
Write-Host "# ENCRYPTION MASTER KEY (512-bit)" -ForegroundColor Cyan
Write-Host "# =============================================================================="
Write-Host "ENCRYPTION_MASTER_KEY=$(Generate-HexSecret 64)"
Write-Host ""

Write-Host "# =============================================================================="
Write-Host "# SESSION SECRET (512-bit)" -ForegroundColor Cyan
Write-Host "# =============================================================================="
Write-Host "SESSION_SECRET=$(Generate-Base64Secret 64)"
Write-Host ""

Write-Host "✅ Secrets generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  SECURITY WARNINGS:" -ForegroundColor Yellow
Write-Host "  1. NEVER commit these secrets to version control" -ForegroundColor Yellow
Write-Host "  2. Store them securely (password manager, secrets manager)" -ForegroundColor Yellow
Write-Host "  3. Use different secrets for dev, staging, and production" -ForegroundColor Yellow
Write-Host "  4. Rotate secrets periodically (every 90 days recommended)" -ForegroundColor Yellow
Write-Host ""
