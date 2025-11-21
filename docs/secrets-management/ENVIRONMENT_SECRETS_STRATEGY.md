# Environment-Specific Secrets Management

**Date:** November 20, 2025  
**Purpose:** Clarify how secrets work in different environments after centralization

---

## 🌍 Environment Strategy Overview

### The Golden Rule

**Different environments = Different secret sources**

```
Development    → .env files (manual, simple)
Staging        → .env files OR Barbican (testing)
Production     → Barbican ONLY (automated, secure)
CI/CD Pipeline → GitHub Secrets (test environment)
```

---

## 1. Development Environment (Local)

### Current Workflow (Unchanged!)

```bash
# Developer clones repo
git clone https://github.com/your-org/recruitiq.git
cd recruitiq/backend

# Copy example config
cp .env.example .env

# Edit with your IDE (contains safe dev values)
code .env
```

**File: `.env` (Development)**
```env
# ✅ Development Configuration
NODE_ENV=development
SECRETS_PROVIDER=environment  # ← Uses .env files, NOT Barbican

# Database (local PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=recruitiq_dev
DATABASE_USER=postgres
DATABASE_PASSWORD=dev_password_12345  # ← Simple, not production-grade

# JWT Secrets (dev-only, NOT secure)
JWT_SECRET=dev-jwt-secret-not-for-production-use-only
JWT_REFRESH_SECRET=dev-refresh-secret-not-for-production

# Encryption (dev-only)
ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Redis (dev-only)
REDIS_PASSWORD=dev_redis_password
```

### How It Works in Dev

```javascript
// backend/src/config/secrets.js
export async function loadSecrets(environment = 'development') {
  const provider = process.env.SECRETS_PROVIDER || 'environment';
  
  if (provider === 'environment') {
    // ✅ DEVELOPMENT: Load from .env file (simple!)
    return loadFromEnvironmentVariables();
  }
  
  if (provider === 'barbican') {
    // ✅ PRODUCTION: Load from Barbican API
    return await loadFromBarbican();
  }
}
```

### Developer Experience (No Change!)

```bash
# Start development server
pnpm dev

# Output:
# ✅ Loading secrets from: environment (.env file)
# ✅ Loaded 15 secrets successfully
# ✅ Server running on http://localhost:4000
```

**Developer sees NO difference!** Secrets still come from `.env` file.

---

## 2. Staging Environment

### Option A: .env Files (Current Method)

```bash
# On staging VPS
cat > /opt/recruitiq/.env << EOF
NODE_ENV=staging
SECRETS_PROVIDER=environment

# Real database (not localhost)
DATABASE_HOST=staging-db.internal
DATABASE_PASSWORD=staging_strong_password_xyz789

# JWT Secrets (stronger than dev)
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
EOF
```

### Option B: Barbican Testing (Recommended)

```bash
# On staging VPS (testing Barbican integration)
cat > /opt/recruitiq/.env << EOF
NODE_ENV=staging
SECRETS_PROVIDER=barbican  # ← Test Barbican in staging!

# Barbican connection
BARBICAN_ENDPOINT=https://barbican.staging.transip.nl
BARBICAN_PROJECT_ID=staging-project-12345

# Only config, NO secrets!
DATABASE_HOST=staging-db.internal
DATABASE_NAME=recruitiq_staging
EOF

# Secrets are auto-loaded from Barbican
systemctl start recruitiq
```

**Purpose:** Validate Barbican integration before production.

---

## 3. Production Environment

### Configuration (Minimal!)

```bash
# On production VPS
cat > /opt/recruitiq/.env << EOF
NODE_ENV=production
SECRETS_PROVIDER=barbican  # ← REQUIRED in production

# Barbican connection (set during provisioning)
BARBICAN_ENDPOINT=https://barbican.transip.nl
BARBICAN_PROJECT_ID=${VPS_PROJECT_ID}
VPS_ID=${VPS_IDENTIFIER}

# Database host (config only)
DATABASE_HOST=prod-db.internal
DATABASE_NAME=recruitiq_production

# NO SECRETS STORED IN THIS FILE!
EOF
```

### How Secrets are Provisioned

**Automated by Deployment Service:**

```javascript
// deployment-service/src/provisioning/SecretsProvisioner.js

// 1. VPS provisioning triggered
await provisionVPS(customerId, 'vps-12345');

// 2. Generate secrets in Barbican (NOT on VPS!)
await barbican.generateSecret('JWT_SECRET', {
  algorithm: 'aes',
  bit_length: 256,
  mode: 'cbc',
  secret_type: 'symmetric',
});

// 3. VPS receives only Barbican endpoint config
await deployToVPS({
  env: {
    SECRETS_PROVIDER: 'barbican',
    BARBICAN_ENDPOINT: 'https://barbican.transip.nl',
    BARBICAN_PROJECT_ID: 'prod-project-12345',
  },
  // NO secrets deployed!
});

// 4. Application fetches secrets on startup
// VPS → Barbican API → Returns secrets
```

### Application Startup (Production)

```bash
# systemctl start recruitiq

# Server logs:
# ℹ Loading secrets from: barbican
# ℹ Barbican endpoint: https://barbican.transip.nl
# ℹ Fetching secret: JWT_SECRET... ✅
# ℹ Fetching secret: JWT_REFRESH_SECRET... ✅
# ℹ Fetching secret: DATABASE_PASSWORD... ✅
# ℹ Loaded 15 secrets successfully (cache TTL: 5 minutes)
# ✅ Server running on https://app.recruitiq.com
```

---

## 4. CI/CD Pipeline (GitHub Actions)

### Test Environment Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    env:
      NODE_ENV: test
      SECRETS_PROVIDER: environment  # ← Use GitHub Secrets
      
      # Secrets from GitHub Secrets (not Barbican)
      DATABASE_PASSWORD: ${{ secrets.TEST_DB_PASSWORD }}
      JWT_SECRET: ${{ secrets.TEST_JWT_SECRET }}
      JWT_REFRESH_SECRET: ${{ secrets.TEST_JWT_REFRESH_SECRET }}
      
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
```

**Why not Barbican in CI/CD?**
- Faster (no API calls)
- GitHub Secrets are encrypted
- Tests don't need production-grade security
- Simpler setup

---

## 5. Configuration Matrix

| Environment | `SECRETS_PROVIDER` | Source | Secrets Location | Human Access |
|-------------|-------------------|--------|------------------|--------------|
| **Development** | `environment` | `.env` file | Local file | ✅ Yes (developer) |
| **Staging (A)** | `environment` | `.env` file | VPS file | ✅ Yes (DevOps) |
| **Staging (B)** | `barbican` | Barbican API | TransIP Barbican | ❌ No |
| **Production** | `barbican` | Barbican API | TransIP Barbican | ❌ No |
| **CI/CD** | `environment` | GitHub Secrets | GitHub vault | ❌ No |

---

## 6. Code Implementation (Environment-Aware)

### Secrets Loader (Smart Detection)

```javascript
// backend/src/config/secrets.js

export async function loadSecrets(environment = process.env.NODE_ENV) {
  const provider = process.env.SECRETS_PROVIDER || 'environment';
  
  logger.info('Loading secrets...', { environment, provider });
  
  // ============================================================================
  // DEVELOPMENT: Use .env files (simple, fast)
  // ============================================================================
  if (provider === 'environment') {
    logger.info('Loading secrets from environment variables (.env file)');
    
    const secrets = {};
    
    for (const [secretName, definition] of Object.entries(SECRET_DEFINITIONS)) {
      const value = process.env[definition.envVar];
      
      // In development, allow missing optional secrets
      if (!value && !definition.required) {
        logger.warn(`Optional secret not configured: ${secretName}`);
        secrets[secretName] = null;
        continue;
      }
      
      // In development, allow shorter secrets (for convenience)
      if (environment === 'development' && value && value.length < definition.minLength) {
        logger.warn(
          `Secret ${secretName} is shorter than recommended (${value.length} < ${definition.minLength})`
        );
      }
      
      // In development, warn about weak passwords (don't fail)
      if (definition.forbiddenValues) {
        const forbidden = definition.forbiddenValues.find(f => 
          value?.toLowerCase().includes(f.toLowerCase())
        );
        
        if (forbidden && environment === 'development') {
          logger.warn(`Secret ${secretName} contains weak value: "${forbidden}" (OK for dev)`);
        }
      }
      
      secrets[secretName] = value;
    }
    
    logger.info(`Loaded ${Object.keys(secrets).length} secrets from .env file`);
    return secrets;
  }
  
  // ============================================================================
  // PRODUCTION: Use Barbican (secure, automated)
  // ============================================================================
  if (provider === 'barbican') {
    logger.info('Loading secrets from Barbican API');
    
    // Initialize Barbican client
    await secretsManager.initialize();
    
    const secrets = {};
    const errors = [];
    
    for (const [secretName, definition] of Object.entries(SECRET_DEFINITIONS)) {
      try {
        // Fetch from Barbican
        const value = await secretsManager.getSecret(secretName);
        
        // Validate secret (strict in production!)
        if (!value) {
          throw new Error(`Secret ${secretName} is empty`);
        }
        
        if (value.length < definition.minLength) {
          throw new Error(
            `Secret ${secretName} too short: ${value.length} < ${definition.minLength}`
          );
        }
        
        secrets[secretName] = value;
        logger.debug(`Loaded secret: ${secretName} (length: ${value.length})`);
        
      } catch (error) {
        errors.push({
          secret: secretName,
          error: error.message,
        });
      }
    }
    
    if (errors.length > 0) {
      logger.error('Failed to load secrets from Barbican', { errors });
      throw new Error(`Failed to load ${errors.length} secret(s) from Barbican`);
    }
    
    logger.info(`Loaded ${Object.keys(secrets).length} secrets from Barbican (cached for 5 min)`);
    return secrets;
  }
  
  throw new Error(`Unknown secrets provider: ${provider}`);
}
```

---

## 7. Developer Workflow Examples

### Scenario A: New Developer Onboarding

```bash
# Day 1: Clone and run
git clone https://github.com/your-org/recruitiq.git
cd recruitiq/backend

# Copy dev config (includes safe dev secrets)
cp .env.example .env

# Install and run
pnpm install
pnpm dev

# ✅ Works immediately!
# No Barbican setup needed
# No secret generation needed
# Uses safe dev secrets from .env
```

### Scenario B: Working on Feature

```bash
# Developer works normally
code src/services/NewFeature.js

# If feature needs new secret:
# 1. Add to .env file locally
echo "NEW_API_KEY=dev_test_key_12345" >> .env

# 2. Add to SECRET_DEFINITIONS in config/secrets.js
# 3. Update .env.example for other developers
# 4. Document in PR

# Production deployment:
# - Deployment service auto-generates real secret in Barbican
# - Developer never sees production secret
```

### Scenario C: Testing Barbican Locally (Optional)

```bash
# Developer wants to test Barbican integration
# (Optional, not required for normal development)

# Set up local Barbican (Docker)
docker run -d -p 9311:9311 \
  --name barbican-dev \
  ghcr.io/openstack/barbican:latest

# Update .env
SECRETS_PROVIDER=barbican
BARBICAN_ENDPOINT=http://localhost:9311
BARBICAN_PROJECT_ID=dev-project-local

# Run app (fetches from local Barbican)
pnpm dev
```

---

## 8. Migration Path (Existing Developers)

### Phase 1: No Impact on Developers

```bash
# Before refactoring
SECRETS_PROVIDER=environment  # (implicit default)
# Loads from .env file

# After refactoring
SECRETS_PROVIDER=environment  # (explicit)
# Loads from .env file (same behavior!)
```

**Developer workflow: UNCHANGED**

### Phase 2: Opt-In Barbican Testing

```bash
# Developer wants to test Barbican (optional)
SECRETS_PROVIDER=barbican
BARBICAN_ENDPOINT=http://localhost:9311

# Or stick with .env files
SECRETS_PROVIDER=environment
```

**Developer choice: Use .env (easy) or Barbican (testing)**

### Phase 3: Production Uses Barbican

```bash
# Production VPS only
SECRETS_PROVIDER=barbican

# Development still uses .env
SECRETS_PROVIDER=environment
```

**No impact on developers!**

---

## 9. Quick Reference Card

### For Developers

```bash
# ✅ DEVELOPMENT (.env file)
SECRETS_PROVIDER=environment
# Simple, fast, no API calls
# Safe dev secrets included
# No Barbican setup needed

# ✅ RUN LOCALLY
pnpm dev
# Uses .env file
# No changes needed
```

### For DevOps

```bash
# ✅ STAGING (Option A: .env)
SECRETS_PROVIDER=environment
# Manual .env file management
# Can SSH and view secrets

# ✅ STAGING (Option B: Barbican testing)
SECRETS_PROVIDER=barbican
BARBICAN_ENDPOINT=https://barbican.staging.transip.nl
# Test Barbican integration
# No secrets on VPS

# ✅ PRODUCTION (Barbican only)
SECRETS_PROVIDER=barbican
BARBICAN_ENDPOINT=https://barbican.transip.nl
# Fully automated
# Zero human access to secrets
```

---

## 10. Security Comparison

### Development (SECRETS_PROVIDER=environment)

| Aspect | Security Level | Notes |
|--------|---------------|-------|
| **Secret Strength** | 🟡 Medium | Dev secrets are weaker (by design) |
| **Human Access** | ✅ Yes | Developer sees secrets (OK for dev) |
| **Audit Trail** | ❌ None | No logging needed |
| **Rotation** | ❌ Manual | Developer updates .env when needed |
| **Risk Level** | 🟢 Low | Only affects local dev environment |

**Trade-off:** Convenience > Security (acceptable for development)

### Production (SECRETS_PROVIDER=barbican)

| Aspect | Security Level | Notes |
|--------|---------------|-------|
| **Secret Strength** | 🟢 High | 256-bit randomly generated |
| **Human Access** | ❌ Never | Zero human access to secrets |
| **Audit Trail** | ✅ Full | Every access logged |
| **Rotation** | ✅ Automated | 90-day automatic rotation |
| **Risk Level** | 🟢 Very Low | Enterprise-grade security |

**Trade-off:** Security > Convenience (required for production)

---

## 11. Environment Variable Summary

### .env.development (Git-tracked, safe to commit)

```env
# Safe to commit (no real secrets)
NODE_ENV=development
SECRETS_PROVIDER=environment

DATABASE_HOST=localhost
DATABASE_PASSWORD=dev_password_not_for_production

JWT_SECRET=dev-jwt-secret-safe-to-commit
```

### .env.production (NOT in Git, generated by deployment service)

```env
# Auto-generated during VPS provisioning
# NEVER commit to Git!
NODE_ENV=production
SECRETS_PROVIDER=barbican

# Only connection config, NO secrets
BARBICAN_ENDPOINT=https://barbican.transip.nl
BARBICAN_PROJECT_ID=prod-${VPS_ID}
```

---

## Summary

### Key Takeaways

1. ✅ **Development = .env files** (no change for developers!)
2. ✅ **Staging = .env OR Barbican** (test before production)
3. ✅ **Production = Barbican ONLY** (fully automated)
4. ✅ **CI/CD = GitHub Secrets** (fast, simple)

### Developer Impact

**ZERO IMPACT!**

- Developers continue using `.env` files
- No Barbican setup required locally
- `pnpm dev` works exactly the same
- Production uses Barbican (invisible to developers)

### Production Benefits

- ✅ Zero human access to secrets
- ✅ Automated provisioning
- ✅ Automatic rotation
- ✅ Full audit logging
- ✅ Compliance-ready

---

**Bottom Line:** Developers work the same way, production gets enterprise security!
