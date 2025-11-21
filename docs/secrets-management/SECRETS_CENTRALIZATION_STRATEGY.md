# Secrets Centralization Strategy

**Problem Identified:** November 20, 2025  
**Priority:** 🔴 **CRITICAL** (Security Vulnerability)  
**Status:** Action Required Before Barbican Implementation

---

## 🚨 Critical Problem: Scattered Secrets

### Current State Analysis

You are **100% correct**! Secrets are currently **scattered across the codebase** in multiple anti-patterns:

#### 1. **Hardcoded Default Secrets** (CRITICAL!)

```javascript
// ❌ CRITICAL VULNERABILITY: backend/src/utils/encryption.js (Line 11)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 
  'default-encryption-key-change-this-in-production-32chars';
```

**Risk:** If `ENCRYPTION_KEY` is not set, production uses a **publicly known default key**!

#### 2. **Weak Default Passwords**

```javascript
// ❌ WEAK: backend/src/shared/database/licenseManagerDb.js (Lines 15-16)
user: process.env.LICENSE_MANAGER_DB_USER || process.env.DB_USER || 'postgres',
password: process.env.LICENSE_MANAGER_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',

// ❌ WEAK: backend/src/config/index.js (Line 30)
password: process.env.DATABASE_PASSWORD || 'password',
```

**Risk:** If environment variables are missing, falls back to **weak default passwords**!

#### 3. **Multiple Secret Sources**

Secrets are loaded from **5 different places**:

| Source | Files Affected | Security Level |
|--------|---------------|----------------|
| `process.env.*` directly | ~50 files | 🟡 Medium |
| `config/index.js` | 1 file | 🟢 Good |
| Hardcoded defaults | 8 files | 🔴 **CRITICAL** |
| `secretsManager.js` | 1 file | 🟢 Excellent |
| Multiple `.env` files | 3 files | 🟡 Medium |

**Problem:** No single source of truth!

---

## 📋 Implementation Phases (Correct Order)

You are **absolutely right** about the implementation order:

### ✅ **Phase 1: Centralization** (Do This FIRST!)
**Goal:** All secrets fetched from ONE place (config system)

### ✅ **Phase 2: Validation** (Then This)
**Goal:** Fail fast if secrets are missing or weak

### ✅ **Phase 3: Barbican Integration** (Finally This)
**Goal:** Replace `.env` source with Barbican API

---

## 🔧 Phase 1: Secrets Centralization (Week 1)

### 1.1 Remove Hardcoded Defaults

**Files to Fix:**

```javascript
// FILE 1: backend/src/utils/encryption.js
// ❌ BEFORE (VULNERABLE!)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 
  'default-encryption-key-change-this-in-production-32chars';

// ✅ AFTER (SECURE)
import config from '../config/index.js';
const ENCRYPTION_KEY = config.encryption.masterKey;
// No default! Will fail if not configured (fail-safe)
```

```javascript
// FILE 2: backend/src/shared/database/licenseManagerDb.js
// ❌ BEFORE (WEAK!)
password: process.env.LICENSE_MANAGER_DB_PASSWORD || 
          process.env.DB_PASSWORD || 
          'postgres', // ❌ NEVER DO THIS!

// ✅ AFTER (SECURE)
import config from '../../config/index.js';
password: config.database.licenseManager.password,
// No default! Config system handles validation
```

### 1.2 Create Centralized Config Structure

**File:** `backend/src/config/secrets.js` (NEW)

```javascript
/**
 * Centralized Secrets Configuration
 * 
 * ALL secrets must be defined here.
 * NO defaults for production secrets.
 * Clear error messages if secrets are missing.
 */

import logger from '../utils/logger.js';

/**
 * Secret definitions with validation rules
 */
const SECRET_DEFINITIONS = {
  // JWT Secrets (256-bit minimum)
  JWT_SECRET: {
    envVar: 'JWT_SECRET',
    required: true,
    minLength: 43, // 256 bits in base64
    production: true,
    description: 'JWT access token signing secret',
  },
  JWT_REFRESH_SECRET: {
    envVar: 'JWT_REFRESH_SECRET',
    required: true,
    minLength: 43,
    production: true,
    description: 'JWT refresh token signing secret',
  },
  
  // Database Secrets
  DATABASE_PASSWORD: {
    envVar: 'DATABASE_PASSWORD',
    required: true,
    minLength: 16,
    production: true,
    description: 'Primary database password',
    forbiddenValues: ['postgres', 'password', 'admin', 'root'],
  },
  
  // Encryption Keys (512-bit minimum)
  ENCRYPTION_MASTER_KEY: {
    envVar: 'ENCRYPTION_MASTER_KEY',
    required: true,
    minLength: 128, // 512 bits in hex
    production: true,
    description: 'Master encryption key for data at rest',
    forbiddenValues: ['default-encryption-key'],
  },
  
  // Session Secret (512-bit minimum)
  SESSION_SECRET: {
    envVar: 'SESSION_SECRET',
    required: true,
    minLength: 64,
    production: true,
    description: 'Session cookie encryption secret',
  },
  
  // Redis Password
  REDIS_PASSWORD: {
    envVar: 'REDIS_PASSWORD',
    required: true, // Required in production
    minLength: 16,
    production: true,
    description: 'Redis authentication password',
  },
  
  // SMTP Password (optional in dev)
  SMTP_PASSWORD: {
    envVar: 'SMTP_PASSWORD',
    required: false,
    minLength: 8,
    production: false,
    description: 'SMTP server password',
  },
  
  // AWS Secrets
  AWS_SECRET_ACCESS_KEY: {
    envVar: 'AWS_SECRET_ACCESS_KEY',
    required: false,
    minLength: 20,
    production: false,
    description: 'AWS secret access key',
  },
  
  // License Manager Database
  LICENSE_MANAGER_DB_PASSWORD: {
    envVar: 'LICENSE_MANAGER_DB_PASSWORD',
    required: true,
    minLength: 16,
    production: true,
    description: 'License manager database password',
    forbiddenValues: ['postgres', 'password'],
  },
};

/**
 * Load and validate a secret
 */
function loadSecret(secretName, definition, environment) {
  const value = process.env[definition.envVar];
  
  // Check if required
  if (definition.required && !value) {
    if (environment === 'production' || definition.production) {
      throw new Error(
        `CRITICAL: Missing required secret: ${secretName}\n` +
        `Environment variable: ${definition.envVar}\n` +
        `Description: ${definition.description}\n` +
        `This is required for ${environment} environment.`
      );
    }
    
    logger.warn(`Optional secret not configured: ${secretName}`);
    return null;
  }
  
  // Skip validation for non-production if not set
  if (!value) {
    return null;
  }
  
  // Validate minimum length
  if (definition.minLength && value.length < definition.minLength) {
    throw new Error(
      `CRITICAL: Secret ${secretName} is too short!\n` +
      `Current length: ${value.length} characters\n` +
      `Required minimum: ${definition.minLength} characters\n` +
      `Description: ${definition.description}`
    );
  }
  
  // Check forbidden values (weak/default passwords)
  if (definition.forbiddenValues) {
    const lowerValue = value.toLowerCase();
    const forbidden = definition.forbiddenValues.find(f => 
      lowerValue.includes(f.toLowerCase())
    );
    
    if (forbidden) {
      throw new Error(
        `CRITICAL: Secret ${secretName} contains forbidden value: "${forbidden}"\n` +
        `This is a weak/default password that MUST be changed!\n` +
        `Generate a strong random secret instead.`
      );
    }
  }
  
  // Check for weak patterns
  const weakPatterns = [
    /^(test|dev|demo|example|secret|password|admin|default)/i,
    /^(.)\1{10,}$/, // Repeated characters
    /^(123|abc|qwerty)/i,
  ];
  
  const weakPattern = weakPatterns.find(pattern => pattern.test(value));
  if (weakPattern) {
    logger.warn(
      `WARNING: Secret ${secretName} matches weak pattern\n` +
      `Pattern: ${weakPattern}\n` +
      `Consider using a stronger, randomly generated secret.`
    );
  }
  
  return value;
}

/**
 * Load all secrets with validation
 */
export function loadSecrets(environment = process.env.NODE_ENV || 'development') {
  logger.info('Loading secrets...', { environment });
  
  const secrets = {};
  const errors = [];
  const warnings = [];
  
  for (const [secretName, definition] of Object.entries(SECRET_DEFINITIONS)) {
    try {
      const value = loadSecret(secretName, definition, environment);
      secrets[secretName] = value;
    } catch (error) {
      errors.push({
        secret: secretName,
        error: error.message,
      });
    }
  }
  
  // Report errors
  if (errors.length > 0) {
    logger.error('CRITICAL: Failed to load required secrets', { errors });
    
    console.error('\n' + '='.repeat(80));
    console.error('🚨 CRITICAL: SECRETS CONFIGURATION ERRORS');
    console.error('='.repeat(80));
    
    errors.forEach(({ secret, error }) => {
      console.error(`\n❌ ${secret}:`);
      console.error(error);
    });
    
    console.error('\n' + '='.repeat(80));
    console.error('Fix these errors before starting the application!');
    console.error('='.repeat(80) + '\n');
    
    throw new Error(`Failed to load ${errors.length} required secret(s)`);
  }
  
  // Report warnings
  if (warnings.length > 0) {
    warnings.forEach(warning => {
      logger.warn(warning);
    });
  }
  
  logger.info(`Successfully loaded ${Object.keys(secrets).length} secrets`);
  
  return secrets;
}

/**
 * Get a single secret (with caching)
 */
let secretsCache = null;

export function getSecret(secretName) {
  if (!secretsCache) {
    secretsCache = loadSecrets();
  }
  
  if (!(secretName in secretsCache)) {
    throw new Error(`Unknown secret: ${secretName}`);
  }
  
  return secretsCache[secretName];
}

/**
 * Clear secrets cache (for testing)
 */
export function clearSecretsCache() {
  secretsCache = null;
}

export default {
  loadSecrets,
  getSecret,
  clearSecretsCache,
  SECRET_DEFINITIONS,
};
```

### 1.3 Update Main Config

**File:** `backend/src/config/index.js`

```javascript
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadSecrets } from './secrets.js'; // ✅ NEW

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envFile = process.env.NODE_ENV === 'e2e' ? '.env.test' : '.env';
dotenv.config({ path: path.join(__dirname, '../../', envFile) });

// ✅ LOAD ALL SECRETS ONCE (with validation)
const secrets = loadSecrets(process.env.NODE_ENV);

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  
  // ✅ JWT - Use validated secrets
  jwt: {
    secret: secrets.JWT_SECRET, // No default!
    refreshSecret: secrets.JWT_REFRESH_SECRET, // No default!
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // ✅ Database - Use validated secrets
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    name: process.env.DATABASE_NAME || 'recruitiq_dev',
    user: process.env.DATABASE_USER || 'postgres',
    password: secrets.DATABASE_PASSWORD, // ✅ No default!
    
    // License manager database
    licenseManager: {
      host: process.env.LICENSE_MANAGER_DB_HOST || 'localhost',
      port: parseInt(process.env.LICENSE_MANAGER_DB_PORT, 10) || 5432,
      name: process.env.LICENSE_MANAGER_DB_NAME || 'license_manager_db',
      user: process.env.LICENSE_MANAGER_DB_USER || 'postgres',
      password: secrets.LICENSE_MANAGER_DB_PASSWORD, // ✅ No default!
    },
  },
  
  // ✅ Encryption - Use validated secrets
  encryption: {
    masterKey: secrets.ENCRYPTION_MASTER_KEY, // ✅ No default!
    algorithm: 'aes-256-gcm',
    keyLength: 32,
  },
  
  // ✅ Security - Use validated secrets
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    sessionSecret: secrets.SESSION_SECRET, // ✅ No default!
    cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE, 10) || 900000,
  },
  
  // ✅ Redis - Use validated secrets
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: secrets.REDIS_PASSWORD, // ✅ No default!
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  
  // ✅ AWS (optional)
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: secrets.AWS_SECRET_ACCESS_KEY, // ✅ Optional
  },
  
  // ... rest of config
};

// ✅ REMOVED: JWT validation (now handled by secrets.js)
// No more duplicate validation code!

export default config;
```

---

## 🔧 Phase 2: Validation (Week 2)

### 2.1 Startup Validation

**File:** `backend/src/config/validator.js` (EXISTING - SIMPLIFY)

```javascript
// ✅ BEFORE: 200 lines of validation code

// ✅ AFTER: 20 lines (validation moved to secrets.js)
import config from './index.js';
import logger from '../utils/logger.js';

export function validateConfiguration() {
  logger.info('Validating configuration...');
  
  // Secrets validation is now done in secrets.js during loadSecrets()
  // Just validate non-secret configuration here
  
  if (!config.database.host) {
    throw new Error('DATABASE_HOST is required');
  }
  
  if (!config.frontend.url) {
    throw new Error('FRONTEND_URL is required');
  }
  
  logger.info('Configuration validation complete');
}
```

### 2.2 Test Validation

```javascript
// backend/tests/unit/config/secrets.test.js (NEW)
import { describe, it, expect, beforeEach } from '@jest/globals';
import { loadSecrets, clearSecretsCache } from '../../../src/config/secrets.js';

describe('Secrets Configuration', () => {
  beforeEach(() => {
    clearSecretsCache();
  });
  
  it('should fail with missing required secret in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    
    expect(() => loadSecrets('production')).toThrow('Missing required secret: JWT_SECRET');
  });
  
  it('should fail with weak password', () => {
    process.env.DATABASE_PASSWORD = 'postgres';
    
    expect(() => loadSecrets()).toThrow('contains forbidden value');
  });
  
  it('should fail with short secret', () => {
    process.env.JWT_SECRET = 'short';
    
    expect(() => loadSecrets()).toThrow('too short');
  });
});
```

---

## 🔧 Phase 3: Barbican Integration (Week 3-4)

**NOW you can safely integrate Barbican!**

### 3.1 Update Secrets Loader

**File:** `backend/src/config/secrets.js` (MODIFY)

```javascript
// Add at top
import secretsManager from '../services/secretsManager.js';

/**
 * Load secrets from configured provider
 */
export async function loadSecrets(environment = process.env.NODE_ENV || 'development') {
  const provider = process.env.SECRETS_PROVIDER || 'environment';
  
  logger.info('Loading secrets...', { environment, provider });
  
  // Initialize secrets manager
  if (provider === 'barbican') {
    await secretsManager.initialize();
  }
  
  const secrets = {};
  const errors = [];
  
  for (const [secretName, definition] of Object.entries(SECRET_DEFINITIONS)) {
    try {
      let value;
      
      if (provider === 'barbican') {
        // ✅ Load from Barbican
        value = await secretsManager.getSecret(secretName);
      } else {
        // ✅ Load from environment variables
        value = process.env[definition.envVar];
      }
      
      // Validate secret
      validateSecret(secretName, value, definition, environment);
      
      secrets[secretName] = value;
    } catch (error) {
      errors.push({ secret: secretName, error: error.message });
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Failed to load ${errors.length} required secret(s)`);
  }
  
  return secrets;
}
```

---

## 📊 Impact Analysis

### Files Requiring Changes

| File | Change Type | Lines | Complexity |
|------|-------------|-------|-----------|
| `backend/src/config/secrets.js` | ➕ NEW | +300 | Medium |
| `backend/src/config/index.js` | 🔄 MODIFY | +20, -50 | Low |
| `backend/src/config/validator.js` | 🔄 SIMPLIFY | -180 | Low |
| `backend/src/utils/encryption.js` | 🔄 MODIFY | +5, -2 | Low |
| `backend/src/shared/database/licenseManagerDb.js` | 🔄 MODIFY | +5, -3 | Low |
| `backend/src/routes/provisioning.js` | 🔄 MODIFY | +5, -2 | Low |
| **Total** | | **+335, -237** | **Low** |

### Benefits of This Approach

| Before | After |
|--------|-------|
| ❌ 8 files with hardcoded defaults | ✅ 0 hardcoded defaults |
| ❌ 50+ files access `process.env` directly | ✅ 1 file manages all secrets |
| ❌ No validation | ✅ Fail-fast validation |
| ❌ Weak passwords accepted | ✅ Weak passwords rejected |
| ❌ No audit trail | ✅ Full logging |
| ❌ Production uses defaults | ✅ Production requires real secrets |

---

## 🎯 Recommended Implementation Order

### Week 1: Centralization (Foundation)
1. ✅ Create `backend/src/config/secrets.js`
2. ✅ Update `backend/src/config/index.js`
3. ✅ Remove hardcoded defaults in 8 files
4. ✅ Write unit tests for validation

### Week 2: Validation (Security)
1. ✅ Add startup validation
2. ✅ Test with missing secrets (should fail)
3. ✅ Test with weak secrets (should fail)
4. ✅ Document required secrets

### Week 3-4: Barbican Integration (Automation)
1. ✅ Add Barbican support to `secrets.js`
2. ✅ Test in staging environment
3. ✅ Deploy to production with rollback plan

---

## 🚨 Critical Fixes Required Immediately

### 1. Remove Hardcoded Encryption Key

**Priority:** 🔴 **CRITICAL** (Security vulnerability)

```javascript
// FILE: backend/src/utils/encryption.js
// ❌ CURRENT (Line 11)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 
  'default-encryption-key-change-this-in-production-32chars';

// ✅ FIX
import config from '../config/index.js';
const ENCRYPTION_KEY = config.encryption.masterKey;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY is required but not configured');
}
```

### 2. Remove Weak Database Passwords

**Priority:** 🔴 **CRITICAL** (Security vulnerability)

```javascript
// FILE: backend/src/shared/database/licenseManagerDb.js
// ❌ CURRENT (Lines 15-16)
password: process.env.LICENSE_MANAGER_DB_PASSWORD || 
          process.env.DB_PASSWORD || 
          'postgres',

// ✅ FIX
import config from '../../config/index.js';
password: config.database.licenseManager.password,
// No default - will fail at startup if not configured
```

---

## 📝 Summary

**You are 100% correct!** The proper sequence is:

1. ✅ **First:** Centralize all secrets into `config/secrets.js`
   - Remove hardcoded defaults
   - Single source of truth
   - Fail-fast validation

2. ✅ **Second:** Validate secrets on startup
   - Check minimum length
   - Reject weak passwords
   - Clear error messages

3. ✅ **Third:** Integrate Barbican
   - Replace environment variable source
   - Keep validation logic
   - Automated provisioning

**Current State:** 🔴 **CRITICAL VULNERABILITY**  
**After Phase 1:** 🟡 **SECURE** (but manual)  
**After Phase 3:** 🟢 **EXCELLENT** (secure + automated)

---

**Next Step:** Shall I implement Phase 1 (Centralization) immediately? This will fix the hardcoded secrets vulnerability.
