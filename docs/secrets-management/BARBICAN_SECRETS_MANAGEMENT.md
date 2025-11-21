# Barbican Secrets Management Guide

**Part of:** [Secrets Centralization Strategy](./SECRETS_CENTRALIZATION_STRATEGY.md)  
**Phase:** 2 - Barbican Integration  
**Status:** ✅ Implementation Complete  
**Last Updated:** November 20, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Guide](#setup-guide)
4. [CLI Usage](#cli-usage)
5. [Integration Patterns](#integration-patterns)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

OpenStack Barbican is a REST API designed for secure storage, provisioning, and management of secrets such as passwords, encryption keys, and X.509 certificates. RecruitIQ integrates with Barbican for production-grade secrets management.

### Why Barbican?

✅ **Industry Standard** - Used by NASA, CERN, PayPal, Walmart  
✅ **Hardware Security Module (HSM) Support** - Store secrets in tamper-proof hardware  
✅ **Automatic Encryption** - Secrets encrypted at rest using AES-256  
✅ **Audit Logging** - Track all secret access and modifications  
✅ **Secret Rotation** - Built-in support for key rotation  
✅ **Access Control** - Role-based access control (RBAC)  
✅ **API-First** - RESTful API for automation  

### When to Use Barbican

| Environment | Recommended Provider | Reason |
|------------|----------------------|--------|
| **Production** | `barbican` | ✅ Maximum security, audit trail, HSM support |
| **Staging** | `barbican` or `environment` | Consider Barbican for production parity |
| **Development** | `environment` | ✅ Faster iteration, simpler setup |
| **CI/CD** | `environment` | ✅ Use encrypted secrets from CI/CD platform |

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      RecruitIQ Backend                          │
│                                                                  │
│  ┌────────────────┐         ┌─────────────────────────────┐   │
│  │   config/      │         │  BarbicanProvider           │   │
│  │   secrets.js   │────────▶│  - authenticate()           │   │
│  │                │         │  - getSecret()              │   │
│  │  loadSecrets() │         │  - storeSecret()            │   │
│  │  getSecret()   │         │  - rotateSecret()           │   │
│  └────────────────┘         │  - healthCheck()            │   │
│         │                    └──────────────┬──────────────┘   │
│         │                                   │                   │
│         │                                   │ HTTPS/TLS         │
│         ▼                                   ▼                   │
│  ┌────────────────┐         ┌─────────────────────────────┐   │
│  │  Application   │         │  OpenStack Keystone         │   │
│  │  Components    │         │  (Authentication)           │   │
│  │  - server.js   │         └──────────────┬──────────────┘   │
│  │  - services    │                        │                   │
│  │  - middleware  │                        │ Token              │
│  └────────────────┘                        ▼                   │
│                              ┌─────────────────────────────┐   │
│                              │  OpenStack Barbican         │   │
│                              │  (Secrets Storage)          │   │
│                              │  - AES-256 Encryption       │   │
│                              │  - HSM Backend (optional)   │   │
│                              │  - Audit Logs               │   │
│                              └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Secrets Flow

```
1. Application starts → loadSecrets() called
2. Authenticate with Keystone → Get auth token
3. Retrieve secrets from Barbican → Cache in memory (5 min TTL)
4. Validate secrets → Enforce length/forbidden values
5. Application uses secrets → From in-memory cache
6. Cache expires → Auto-refresh from Barbican
```

### Security Layers

```
Layer 1: Transport Security (TLS 1.3)
   ↓
Layer 2: Authentication (OpenStack Keystone)
   ↓
Layer 3: Authorization (RBAC policies)
   ↓
Layer 4: Encryption at Rest (AES-256-GCM)
   ↓
Layer 5: HSM Storage (Optional hardware-backed keys)
```

---

## Setup Guide

### Prerequisites

1. **OpenStack Barbican Service** deployed and accessible
2. **OpenStack Keystone** for authentication
3. **Project/Tenant** created in OpenStack
4. **User credentials** with Barbican access

### Step 1: Configure Environment Variables

Add to `.env` file:

```bash
# Secrets Provider
SECRETS_PROVIDER=barbican

# Barbican Configuration
BARBICAN_ENDPOINT=https://barbican.example.com:9311
OPENSTACK_AUTH_URL=https://keystone.example.com:5000/v3
OPENSTACK_USERNAME=recruitiq-app
OPENSTACK_PASSWORD=<STRONG_PASSWORD>
OPENSTACK_PROJECT_NAME=recruitiq-prod
OPENSTACK_PROJECT_DOMAIN=default
OPENSTACK_USER_DOMAIN=default
BARBICAN_CACHE_TTL=300000
```

### Step 2: Test Barbican Connection

```bash
cd backend
npm run secrets:health
```

**Expected Output:**
```
🏥 Barbican Health Check
================================================================================
✅ Status: HEALTHY
Endpoint: https://barbican.example.com:9311
Authentication: OK
================================================================================
```

### Step 3: Generate and Store Secrets

#### Option A: Generate and Store Automatically

```bash
# Generate JWT secret (256-bit)
npm run secrets:generate JWT_SECRET -- --length 32 --encoding base64

# Output:
# ✅ Generated Secret:
# ================================================================================
# Secret Name: JWT_SECRET
# Length: 44 characters
# Value: Xk7p2m9vN3wR8sT1qF5hJ6gK4lY0dC3bZ9aW7eU2iO=
# ================================================================================

# Store in Barbican
npm run secrets:store JWT_SECRET "Xk7p2m9vN3wR8sT1qF5hJ6gK4lY0dC3bZ9aW7eU2iO="
```

#### Option B: Use OpenSSL and Store Manually

```bash
# Generate strong secrets
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 64)
SESSION_SECRET=$(openssl rand -base64 64)
DATABASE_PASSWORD=$(openssl rand -base64 32)

# Store in Barbican
npm run secrets:store JWT_SECRET "$JWT_SECRET"
npm run secrets:store JWT_REFRESH_SECRET "$JWT_REFRESH_SECRET"
npm run secrets:store ENCRYPTION_KEY "$ENCRYPTION_KEY"
npm run secrets:store SESSION_SECRET "$SESSION_SECRET"
npm run secrets:store DATABASE_PASSWORD "$DATABASE_PASSWORD"
```

### Step 4: Verify Secrets

```bash
# List all configured secrets
npm run secrets:list

# Retrieve a specific secret
npm run secrets:get JWT_SECRET
```

### Step 5: Start Application

```bash
# Production mode with Barbican
NODE_ENV=production SECRETS_PROVIDER=barbican npm start
```

**Startup logs should show:**
```
info: Loading secrets... {"environment":"production","provider":"barbican"}
info: Barbican client initialized successfully
info: Loaded 8 secrets from Barbican (cached for 300s)
info: RecruitIQ API Server started successfully
```

---

## CLI Usage

### Generate Secrets

```bash
# Generate with default settings (32 bytes, base64)
npm run secrets:generate JWT_SECRET

# Customize length and encoding
npm run secrets:generate ENCRYPTION_KEY -- --length 64 --encoding hex

# Available encodings: hex, base64, base64url
```

### Store Secrets

```bash
# Store a secret in Barbican
npm run secrets:store SECRET_NAME "secret-value"

# Store with expiration
npm run secrets:store TEMP_TOKEN "token123" -- --expiration "2025-12-31T23:59:59Z"
```

### Retrieve Secrets

```bash
# Get secret from cache (fast)
npm run secrets:get JWT_SECRET

# Force refresh from Barbican (skip cache)
npm run secrets:get JWT_SECRET -- --no-cache
```

### Rotate Secrets

```bash
# Rotate secret (generate new + store)
npm run secrets:rotate JWT_SECRET

# Customize generation
npm run secrets:rotate ENCRYPTION_KEY -- --length 64 --encoding hex
```

**⚠️ IMPORTANT:** After rotating secrets, restart all application instances to pick up the new values.

### Delete Secrets

```bash
# Safe delete (requires confirmation)
npm run secrets:delete OLD_SECRET

# Force delete (skip confirmation)
npm run secrets:delete OLD_SECRET -- --force
```

### List Secrets

```bash
# List all configured secrets with status
npm run secrets:list
```

**Example Output:**
```
📋 Configured Secrets:
================================================================================
Total: 8 secrets

✅ Loaded JWT_SECRET (44 chars)
✅ Loaded JWT_REFRESH_SECRET (44 chars)
✅ Loaded DATABASE_PASSWORD (44 chars)
✅ Loaded ENCRYPTION_MASTER_KEY (128 chars)
✅ Loaded SESSION_SECRET (88 chars)
✅ Loaded REDIS_PASSWORD (32 chars)
❌ Missing SMTP_PASSWORD
❌ Missing AWS_SECRET_ACCESS_KEY
================================================================================
```

### Health Check

```bash
# Verify Barbican connection
npm run secrets:health
```

---

## Integration Patterns

### Pattern 1: Environment-Based Selection

```javascript
// config/index.js
import { loadSecrets } from './secrets.js';

// Automatically use Barbican in production
const environment = process.env.NODE_ENV || 'development';
const provider = environment === 'production' ? 'barbican' : 'environment';

process.env.SECRETS_PROVIDER = provider;

const secrets = await loadSecrets(environment);

export default {
  environment,
  secrets,
  // ... rest of config
};
```

### Pattern 2: Graceful Fallback

```javascript
// Load secrets with fallback to environment
async function loadSecretsWithFallback() {
  try {
    // Try Barbican first
    process.env.SECRETS_PROVIDER = 'barbican';
    return await loadSecrets();
  } catch (error) {
    logger.warn('Failed to load from Barbican, falling back to environment', {
      error: error.message,
    });
    
    // Fallback to environment variables
    process.env.SECRETS_PROVIDER = 'environment';
    return await loadSecrets();
  }
}
```

### Pattern 3: Secret Rotation Hook

```javascript
// services/secretRotation.js
import { getSecret, clearSecretsCache } from '../config/secrets.js';
import BarbicanProvider from '../config/providers/barbicanProvider.js';

export async function rotateSecret(secretName) {
  const barbican = new BarbicanProvider(/* config */);
  
  // Generate new secret
  const newValue = crypto.randomBytes(32).toString('base64');
  
  // Store in Barbican
  await barbican.rotateSecret(secretName, newValue);
  
  // Clear application cache
  clearSecretsCache();
  
  // Notify other instances (via Redis pub/sub)
  await redis.publish('secret-rotated', secretName);
  
  logger.info(`Secret rotated: ${secretName}`);
}
```

### Pattern 4: Secret Expiry Monitoring

```javascript
// middleware/secretsMonitor.js
import BarbicanProvider from '../config/providers/barbicanProvider.js';

setInterval(async () => {
  const barbican = new BarbicanProvider(/* config */);
  
  // Check if secrets are close to expiry
  const secrets = await barbican.listSecrets();
  
  for (const secret of secrets) {
    if (secret.expiration) {
      const expiryDate = new Date(secret.expiration);
      const daysLeft = (expiryDate - Date.now()) / (1000 * 60 * 60 * 24);
      
      if (daysLeft < 30) {
        logger.warn(`Secret expiring soon: ${secret.name}`, {
          expiresIn: `${Math.floor(daysLeft)} days`,
        });
        
        // Trigger rotation workflow
        await scheduleSecretRotation(secret.name);
      }
    }
  }
}, 24 * 60 * 60 * 1000); // Check daily
```

---

## Security Best Practices

### 1. Access Control

**Principle of Least Privilege:**
```bash
# Create dedicated Barbican user with minimal permissions
openstack user create recruitiq-app --password <STRONG_PASSWORD>

# Grant only necessary roles
openstack role add --user recruitiq-app --project recruitiq creator
```

**Don't use admin credentials for application access!**

### 2. Network Security

```yaml
# Firewall rules (iptables example)
# Only allow application servers to access Barbican
iptables -A INPUT -p tcp --dport 9311 -s 10.0.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 9311 -j DROP
```

### 3. Secret Rotation

**Rotate secrets regularly:**
- **JWT Secrets:** Every 90 days
- **Database Passwords:** Every 180 days
- **Encryption Keys:** Every 365 days
- **Session Secrets:** Every 30 days

**Automated rotation cron job:**
```bash
# crontab -e
0 2 1 */3 * cd /app/backend && npm run secrets:rotate JWT_SECRET
```

### 4. Audit Logging

**Enable Barbican audit logs:**
```ini
# /etc/barbican/barbican.conf
[DEFAULT]
enable_audit = True
audit_log_path = /var/log/barbican/audit.log
```

**Monitor for suspicious activity:**
```bash
# Watch for failed authentication attempts
tail -f /var/log/barbican/audit.log | grep "FAILED"
```

### 5. Backup and Disaster Recovery

**Backup Barbican database regularly:**
```bash
# Export secrets (encrypted)
barbican-manage db export > secrets-backup-$(date +%Y%m%d).sql

# Encrypt backup
gpg --encrypt --recipient admin@example.com secrets-backup-*.sql

# Store in secure off-site location
```

---

## Troubleshooting

### Problem: "Barbican authentication failed"

**Symptoms:**
```
❌ Barbican authentication failed: 401 Unauthorized
```

**Solutions:**
1. Verify credentials:
   ```bash
   openstack token issue --os-username=recruitiq-app --os-password=<PASSWORD>
   ```

2. Check user has project access:
   ```bash
   openstack role list --user recruitiq-app --project recruitiq
   ```

3. Verify Keystone endpoint is correct:
   ```bash
   curl -i https://keystone.example.com:5000/v3
   ```

### Problem: "Secret not found"

**Symptoms:**
```
❌ Failed to retrieve secret: JWT_SECRET
Error: Secret not found: JWT_SECRET
```

**Solutions:**
1. List secrets in Barbican:
   ```bash
   npm run secrets:list
   ```

2. Check secret name matches exactly (case-sensitive):
   ```bash
   npm run secrets:get JWT_SECRET  # Correct
   npm run secrets:get jwt_secret  # Wrong (lowercase)
   ```

3. Store the missing secret:
   ```bash
   npm run secrets:generate JWT_SECRET
   npm run secrets:store JWT_SECRET "<generated-value>"
   ```

### Problem: "Connection timeout"

**Symptoms:**
```
❌ Health check failed: ETIMEDOUT
```

**Solutions:**
1. Check network connectivity:
   ```bash
   telnet barbican.example.com 9311
   ```

2. Verify firewall rules allow traffic:
   ```bash
   iptables -L -n | grep 9311
   ```

3. Check Barbican service is running:
   ```bash
   systemctl status openstack-barbican-api
   ```

### Problem: "Cache not working"

**Symptoms:**
- Slow API responses
- High Barbican API usage

**Solutions:**
1. Verify cache TTL is set:
   ```bash
   grep BARBICAN_CACHE_TTL .env
   ```

2. Check cache is being used:
   ```javascript
   // Add debug logging
   const cached = barbicanClient.getCachedSecret('JWT_SECRET');
   console.log('Cache hit:', !!cached);
   ```

3. Increase cache TTL if too low:
   ```bash
   # .env
   BARBICAN_CACHE_TTL=600000  # 10 minutes
   ```

### Problem: "Secret too short" validation error

**Symptoms:**
```
❌ CRITICAL: Secret JWT_SECRET is too short!
Current length: 31 characters
Required minimum: 43 characters
```

**Solutions:**
1. Generate properly sized secret:
   ```bash
   # 32 bytes = 44 characters in base64
   npm run secrets:generate JWT_SECRET -- --length 32
   ```

2. Verify length after generation:
   ```bash
   echo -n "Xk7p2m9vN3wR8sT1qF5hJ6gK4lY0dC3bZ9aW7eU2iO=" | wc -c
   # Should output 44
   ```

---

## Advanced Topics

### Using HSM Backend

For maximum security, configure Barbican with Hardware Security Module (HSM) support:

```ini
# /etc/barbican/barbican.conf
[secretstore]
enabled_secretstore_plugins = store_crypto

[secretstore:store_crypto]
crypto_plugin = p11_crypto

[p11_crypto_plugin]
library_path = /usr/lib/libCryptoki2_64.so
login = <HSM_PASSWORD>
slot_id = 0
```

### Multi-Region Setup

For high availability across regions:

```javascript
// config/providers/multiRegionBarbican.js
const regions = [
  { endpoint: 'https://us-east-1.barbican.example.com:9311', priority: 1 },
  { endpoint: 'https://us-west-1.barbican.example.com:9311', priority: 2 },
];

async function getSecretWithFailover(secretName) {
  for (const region of regions) {
    try {
      const barbican = new BarbicanProvider({ endpoint: region.endpoint });
      return await barbican.getSecret(secretName);
    } catch (error) {
      logger.warn(`Region ${region.endpoint} failed, trying next...`);
    }
  }
  throw new Error('All regions failed');
}
```

---

## References

- [OpenStack Barbican Documentation](https://docs.openstack.org/barbican/latest/)
- [Secrets Centralization Strategy](./SECRETS_CENTRALIZATION_STRATEGY.md)
- [Backend Standards](./BACKEND_STANDARDS.md)
- [Security Standards](./SECURITY_STANDARDS.md)

---

**Status:** ✅ Phase 2 Complete  
**Next Phase:** Production deployment and monitoring
