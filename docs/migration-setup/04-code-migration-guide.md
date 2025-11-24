# Code Migration Guide

**Document Version:** 1.0  
**Last Updated:** November 22, 2025  
**Status:** Active

---

## Overview

This guide provides step-by-step procedures for migrating backend and frontend code to use Barbican secret management via the SecretsManager class.

**Migration Scope:**
- Backend services (Node.js/Express)
- Frontend applications (React/Vite)
- Shared packages (@recruitiq/*)
- Configuration management
- Deployment scripts

---

## Backend Code Migration

### Step 1: Implement SecretsManager Class

**File:** `backend/src/services/SecretsManager.js`

This file should already exist from the Barbican implementation. If not, create it:

```javascript
import axios from 'axios';
import logger from '../utils/logger.js';

class SecretsManager {
  constructor() {
    this.barbicanEndpoint = process.env.BARBICAN_ENDPOINT;
    this.keystoneEndpoint = process.env.KEYSTONE_ENDPOINT;
    this.projectId = process.env.BARBICAN_PROJECT_ID;
    this.cache = new Map();
    this.cacheTTL = parseInt(process.env.SECRETS_CACHE_TTL) || 300; // 5 minutes default
    this.initialized = false;
  }

  async initialize() {
    // Initialize connection and authenticate
    // See docs/secrets-management/BARBICAN_SECRET_GENERATION.md
  }

  async generateSecret(name, options = {}) {
    // Generate cryptographic secret
  }

  async getSecret(name) {
    // Retrieve secret with caching
  }

  async updateSecret(name, value, options = {}) {
    // Update existing secret
  }

  async deleteSecret(name) {
    // Delete secret
  }

  async rotateSecret(name) {
    // Rotate secret
  }
}

export default new SecretsManager();
```

### Step 2: Migrate Authentication Services

#### JWT Secret Migration

**File:** `backend/src/services/auth/jwtService.js`

**Before:**

```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}
```

**After:**

```javascript
import jwt from 'jsonwebtoken';
import secretsManager from '../SecretsManager.js';
import logger from '../../utils/logger.js';

let jwtSecret = null;
let jwtRefreshSecret = null;

/**
 * Initialize JWT secrets from Barbican
 */
async function initializeJWTSecrets() {
  try {
    [jwtSecret, jwtRefreshSecret] = await Promise.all([
      secretsManager.getSecret('JWT_SECRET'),
      secretsManager.getSecret('JWT_REFRESH_SECRET')
    ]);
    
    logger.info('JWT secrets initialized from Barbican');
  } catch (error) {
    logger.error('Failed to initialize JWT secrets', { error: error.message });
    throw new Error('JWT initialization failed');
  }
}

// Initialize on module load
const initPromise = initializeJWTSecrets();

export async function generateAccessToken(payload) {
  await initPromise; // Wait for secrets to be loaded
  return jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
}

export async function generateRefreshToken(payload) {
  await initPromise;
  return jwt.sign(payload, jwtRefreshSecret, { expiresIn: '7d' });
}

export async function verifyAccessToken(token) {
  await initPromise;
  return jwt.verify(token, jwtSecret);
}

export async function verifyRefreshToken(token) {
  await initPromise;
  return jwt.verify(token, jwtRefreshSecret);
}
```

#### Session Secret Migration

**File:** `backend/src/middleware/session.js`

**Before:**

```javascript
import session from 'express-session';

export default session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});
```

**After:**

```javascript
import session from 'express-session';
import secretsManager from '../services/SecretsManager.js';

let sessionMiddleware = null;

/**
 * Initialize session middleware with secret from Barbican
 */
export async function initializeSessionMiddleware() {
  const sessionSecret = await secretsManager.getSecret('SESSION_SECRET');
  
  sessionMiddleware = session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  });
  
  return sessionMiddleware;
}

// Export middleware getter
export default async function getSessionMiddleware(req, res, next) {
  if (!sessionMiddleware) {
    sessionMiddleware = await initializeSessionMiddleware();
  }
  return sessionMiddleware(req, res, next);
}
```

### Step 3: Migrate External API Keys

#### Third-Party Service Configuration

**File:** `backend/src/config/services.js`

**Before:**

```javascript
export const servicesConfig = {
  stripe: {
    apiKey: process.env.STRIPE_API_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};
```

**After:**

```javascript
import secretsManager from '../services/SecretsManager.js';

let servicesConfig = null;

/**
 * Initialize services configuration from Barbican
 */
async function initializeServicesConfig() {
  const [
    stripeApiKey,
    stripeWebhookSecret,
    sendgridApiKey,
    awsAccessKeyId,
    awsSecretAccessKey
  ] = await Promise.all([
    secretsManager.getSecret('STRIPE_API_KEY'),
    secretsManager.getSecret('STRIPE_WEBHOOK_SECRET'),
    secretsManager.getSecret('SENDGRID_API_KEY'),
    secretsManager.getSecret('AWS_ACCESS_KEY_ID'),
    secretsManager.getSecret('AWS_SECRET_ACCESS_KEY')
  ]);

  servicesConfig = {
    stripe: {
      apiKey: stripeApiKey,
      webhookSecret: stripeWebhookSecret
    },
    sendgrid: {
      apiKey: sendgridApiKey
    },
    aws: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey
    }
  };

  return servicesConfig;
}

/**
 * Get services configuration (lazy initialization)
 */
export async function getServicesConfig() {
  if (!servicesConfig) {
    servicesConfig = await initializeServicesConfig();
  }
  return servicesConfig;
}

export default getServicesConfig;
```

**Usage in Services:**

```javascript
import getServicesConfig from '../config/services.js';

class PaymentService {
  async processPayment(amount, currency) {
    const config = await getServicesConfig();
    const stripe = new Stripe(config.stripe.apiKey);
    // ... payment processing
  }
}
```

### Step 4: Migrate Encryption Keys

**File:** `backend/src/utils/encryption.js`

**Before:**

```javascript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  // ... encryption logic
}
```

**After:**

```javascript
import crypto from 'crypto';
import secretsManager from '../services/SecretsManager.js';

const ALGORITHM = 'aes-256-gcm';
let encryptionKey = null;

async function getEncryptionKey() {
  if (!encryptionKey) {
    encryptionKey = await secretsManager.getSecret('ENCRYPTION_KEY');
  }
  return encryptionKey;
}

export async function encrypt(text) {
  const key = await getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(key, 'hex'),
    iv
  );
  // ... encryption logic
}

export async function decrypt(encrypted, iv, authTag) {
  const key = await getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );
  // ... decryption logic
}
```

### Step 5: Update Server Initialization

**File:** `backend/src/server.js`

**Before:**

```javascript
import express from 'express';
import routes from './routes/index.js';

const app = express();

// Middleware
app.use(express.json());
app.use('/api', routes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**After:**

```javascript
import express from 'express';
import routes from './routes/index.js';
import secretsManager from './services/SecretsManager.js';
import { poolPromise } from './config/database.js';
import logger from './utils/logger.js';

const app = express();

/**
 * Initialize all services before starting server
 */
async function initializeServices() {
  try {
    // 1. Initialize SecretsManager
    await secretsManager.initialize();
    logger.info('✓ SecretsManager initialized');

    // 2. Initialize database pool
    await poolPromise;
    logger.info('✓ Database pool initialized');

    // 3. Initialize session middleware
    const { initializeSessionMiddleware } = await import('./middleware/session.js');
    const sessionMiddleware = await initializeSessionMiddleware();
    app.use(sessionMiddleware);
    logger.info('✓ Session middleware initialized');

    // 4. Initialize JWT service
    const { initializeJWTSecrets } = await import('./services/auth/jwtService.js');
    await initializeJWTSecrets();
    logger.info('✓ JWT service initialized');

    logger.info('✅ All services initialized successfully');
    
  } catch (error) {
    logger.error('Service initialization failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Start server
 */
async function startServer() {
  try {
    // Initialize services first
    await initializeServices();

    // Setup middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Routes
    app.use('/api', routes);

    // Start listening
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

  } catch (error) {
    logger.error('Server startup failed', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  // Close connections, etc.
  process.exit(0);
});

// Start server
startServer();

export default app;
```

---

## Frontend Code Migration

### Step 1: Remove Direct Secret Access

Frontend applications should **NEVER** access secrets directly. All secrets must be managed by the backend.

**Anti-Pattern (REMOVE):**

```javascript
// ❌ WRONG: API keys in frontend
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
```

**Correct Pattern:**

```javascript
// ✅ CORRECT: Backend provides public keys via API
const { data } = await apiClient.get('/api/config/public-keys');
const { googleMapsApiKey, stripePublishableKey } = data;
```

### Step 2: Update API Client Configuration

**File:** `packages/api-client/src/core/client.ts`

Ensure API client uses backend-provided configuration:

```typescript
import axios, { AxiosInstance } from 'axios';

export class APIClient {
  private instance: AxiosInstance;
  private publicKeys: any = null;

  constructor(baseURL?: string) {
    this.instance = axios.create({
      baseURL: baseURL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Initialize public keys
    this.initializePublicKeys();
  }

  private async initializePublicKeys() {
    try {
      const { data } = await this.instance.get('/api/config/public-keys');
      this.publicKeys = data;
    } catch (error) {
      console.error('Failed to initialize public keys', error);
    }
  }

  getPublicKey(keyName: string): string | null {
    return this.publicKeys?.[keyName] || null;
  }

  // ... rest of API client
}
```

### Step 3: Update Frontend Environment Files

**File:** `apps/nexus/.env`

**Before:**

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_GOOGLE_MAPS_API_KEY=AIza...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**After:**

```env
# Only non-sensitive configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_NAME=Nexus
VITE_APP_VERSION=1.0.0

# NO API KEYS OR SECRETS IN FRONTEND!
```

### Step 4: Update Third-Party Integrations

**Example: Google Maps Integration**

**Before:**

```jsx
import { GoogleMap, useLoadScript } from '@react-google-maps/api';

function MapComponent() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });
  // ...
}
```

**After:**

```jsx
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import { useApiClient } from '@recruitiq/api-client';
import { useState, useEffect } from 'react';

function MapComponent() {
  const apiClient = useApiClient();
  const [apiKey, setApiKey] = useState(null);

  useEffect(() => {
    async function loadApiKey() {
      const key = apiClient.getPublicKey('googleMapsApiKey');
      setApiKey(key);
    }
    loadApiKey();
  }, []);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey
  });

  if (!apiKey || !isLoaded) return <div>Loading map...</div>;
  // ... rest of component
}
```

---

## Shared Packages Migration

### Step 1: Update @recruitiq/auth Package

**File:** `packages/auth/src/tokenManager.ts`

Ensure auth package doesn't store secrets:

```typescript
// ✅ CORRECT: Tokens managed by backend, frontend only stores/retrieves
export class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    // Store in httpOnly cookies (backend sets these)
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async refreshAccessToken(): Promise<string> {
    // Call backend to refresh token
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });
    const { accessToken } = await response.json();
    this.accessToken = accessToken;
    return accessToken;
  }
}
```

---

## Configuration Management Migration

### Step 1: Update Configuration Loader

**File:** `backend/src/config/index.js`

**Before:**

```javascript
import dotenv from 'dotenv';
dotenv.config();

export default {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  sessionSecret: process.env.SESSION_SECRET,
  database: {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    name: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD
  }
};
```

**After:**

```javascript
import dotenv from 'dotenv';
import secretsManager from '../services/SecretsManager.js';

dotenv.config();

let config = null;

/**
 * Load configuration with secrets from Barbican
 */
async function loadConfig() {
  // Non-sensitive config from environment
  const baseConfig = {
    port: parseInt(process.env.PORT) || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100
  };

  // Secrets from Barbican (loaded on demand by services)
  // Don't load all secrets here, let each service load what it needs

  config = baseConfig;
  return config;
}

/**
 * Get configuration
 */
export async function getConfig() {
  if (!config) {
    config = await loadConfig();
  }
  return config;
}

export default getConfig;
```

---

## Deployment Scripts Migration

### Step 1: Update Deployment Script

**File:** `scripts/deploy.sh`

**Before:**

```bash
#!/bin/bash

# Load secrets from .env
export $(cat .env | xargs)

# Deploy application
docker-compose up -d

echo "Deployment complete"
```

**After:**

```bash
#!/bin/bash

# Ensure Barbican is accessible
if ! curl -s http://barbican:9311/v1 > /dev/null; then
  echo "❌ Barbican not accessible"
  exit 1
fi

# Deploy application (secrets loaded from Barbican at runtime)
docker-compose up -d

# Wait for services to initialize
sleep 10

# Health check
if curl -s http://localhost:3001/api/health | grep -q "healthy"; then
  echo "✅ Deployment complete and healthy"
else
  echo "❌ Deployment health check failed"
  exit 1
fi
```

### Step 2: Update Docker Compose

**File:** `docker-compose.yml`

**Before:**

```yaml
services:
  backend:
    build: ./backend
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - DATABASE_PASSWORD=${DATABASE_PASSWORD}
```

**After:**

```yaml
services:
  backend:
    build: ./backend
    environment:
      # Only non-sensitive configuration
      - NODE_ENV=${NODE_ENV}
      - PORT=3001
      - LOG_LEVEL=${LOG_LEVEL}
      # Barbican connection
      - BARBICAN_ENDPOINT=${BARBICAN_ENDPOINT}
      - KEYSTONE_ENDPOINT=${KEYSTONE_ENDPOINT}
      - BARBICAN_PROJECT_ID=${BARBICAN_PROJECT_ID}
    depends_on:
      - barbican
      - database
```

---

## Testing After Migration

### Unit Tests

```powershell
cd backend
npm test
```

### Integration Tests

```powershell
cd backend
npm run test:integration
```

### E2E Tests

```powershell
cd backend
npm run test:e2e
```

### Smoke Tests

```powershell
cd backend
npm run test:smoke
```

---

## Rollback Procedures

See [06-rollback-procedures.md](./06-rollback-procedures.md) for detailed rollback steps.

**Quick Rollback:**

```powershell
# 1. Restore .env files
git checkout HEAD -- **/.env

# 2. Revert code changes
git checkout HEAD -- backend/src/config/
git checkout HEAD -- backend/src/services/
git checkout HEAD -- backend/src/server.js

# 3. Restart services
docker-compose restart

# 4. Validate
curl http://localhost:3001/api/health
```

---

## Next Steps

After completing code migration:

1. ✅ **Run comprehensive tests:** [05-testing-strategy.md](./05-testing-strategy.md)
2. ✅ **Validate migration:** [07-post-migration-validation.md](./07-post-migration-validation.md)
3. ✅ **Monitor system:** Setup monitoring and alerts

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-22 | Migration Team | Initial version |
