# Secrets Management Guide

**Status**: ✅ Implemented (Todo #8)  
**Last Updated**: 2025-10-28  
**Security Impact**: Critical - Protects sensitive credentials

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Supported Providers](#supported-providers)
3. [Configuration](#configuration)
4. [Usage Examples](#usage-examples)
5. [Secret Rotation](#secret-rotation)
6. [Migration Guide](#migration-guide)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What Was Implemented

✅ **Multi-Provider Support**
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault
- TransIP/OpenStack Barbican
- Environment Variables (fallback)

✅ **Security Features**
- In-memory caching with TTL (5 minutes default)
- Automatic secret rotation support
- No secrets in logs (even in errors)
- Graceful fallback to environment variables
- Secret versioning support (provider-dependent)

✅ **Developer Experience**
- Single unified API for all providers
- Easy migration from environment variables
- Helper functions for common secret types
- Health check endpoint

---

## Supported Providers

### 1. Environment Variables (Default/Development)

**Use Case**: Development, testing, CI/CD  
**Pros**: Simple, no external dependencies  
**Cons**: Not secure for production, no rotation

```bash
# .env
JWT_SECRET=your-secret-here
DATABASE_PASSWORD=db-password
```

**Configuration**:
```bash
SECRETS_PROVIDER=environment
```

### 2. AWS Secrets Manager

**Use Case**: AWS-hosted applications  
**Pros**: Automatic rotation, versioning, IAM integration  
**Cons**: AWS-only, costs per secret

**Configuration**:
```bash
SECRETS_PROVIDER=aws
AWS_SECRETS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

**Prerequisites**:
```bash
npm install @aws-sdk/client-secrets-manager
```

**AWS Setup**:
```bash
# Create a secret
aws secretsmanager create-secret \
  --name JWT_SECRET \
  --secret-string "your-secret-value" \
  --region us-east-1

# Enable automatic rotation
aws secretsmanager rotate-secret \
  --secret-id JWT_SECRET \
  --rotation-lambda-arn arn:aws:lambda:...
```

### 3. Azure Key Vault

**Use Case**: Azure-hosted applications  
**Pros**: Azure integration, RBAC, certificate storage  
**Cons**: Azure-only

**Configuration**:
```bash
SECRETS_PROVIDER=azure
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id
```

**Prerequisites**:
```bash
npm install @azure/keyvault-secrets @azure/identity
```

**Azure Setup**:
```bash
# Create Key Vault
az keyvault create \
  --name your-vault \
  --resource-group your-rg \
  --location westeurope

# Store a secret
az keyvault secret set \
  --vault-name your-vault \
  --name JWT-SECRET \
  --value "your-secret-value"

# Grant access
az keyvault set-policy \
  --name your-vault \
  --object-id <your-app-id> \
  --secret-permissions get list
```

### 4. HashiCorp Vault

**Use Case**: On-premise, multi-cloud  
**Pros**: Advanced features, dynamic secrets, encryption as a service  
**Cons**: Self-hosted, complexity

**Configuration**:
```bash
SECRETS_PROVIDER=vault
VAULT_ADDR=https://vault.example.com:8200
VAULT_TOKEN=your-vault-token
VAULT_NAMESPACE=secret
```

**Vault Setup**:
```bash
# Enable KV secrets engine
vault secrets enable -path=secret kv-v2

# Store a secret
vault kv put secret/JWT_SECRET value="your-secret-value"

# Create a policy
vault policy write app-policy - <<EOF
path "secret/data/*" {
  capabilities = ["read"]
}
EOF

# Create a token
vault token create -policy=app-policy
```

### 5. TransIP/OpenStack Barbican

**Use Case**: TransIP Public Cloud, OpenStack deployments  
**Pros**: European hosting, NEN 7510/ISO 27001 certified, integrated with OpenStack  
**Cons**: TransIP-specific

**Configuration**:
```bash
SECRETS_PROVIDER=barbican
BARBICAN_ENDPOINT=https://api.transip.nl/barbican
BARBICAN_PROJECT_ID=your-project-id
OPENSTACK_AUTH_URL=https://api.transip.nl/keystone/v3
OPENSTACK_USERNAME=your-username
OPENSTACK_PASSWORD=your-password
```

**Barbican Features**:
- REST API for secret management
- X.509 certificate storage
- Integration with Octavia load balancers
- Encrypted volumes with automatic key management
- LUKS disk encryption support

**Barbican Setup**:
```bash
# Store a secret
curl -X POST https://api.transip.nl/barbican/v1/secrets \
  -H "X-Auth-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "JWT_SECRET",
    "payload": "your-secret-value",
    "payload_content_type": "text/plain",
    "payload_content_encoding": "base64"
  }'

# Retrieve a secret
curl -X GET https://api.transip.nl/barbican/v1/secrets/{secret-id} \
  -H "X-Auth-Token: $TOKEN"
```

---

## Configuration

### Environment Variables

```bash
# Secrets Provider Selection
SECRETS_PROVIDER=environment  # aws | azure | vault | barbican | environment

# Cache Configuration
SECRETS_CACHE_TTL=300  # Cache TTL in seconds (default: 300 = 5 minutes)

# AWS Secrets Manager
AWS_SECRETS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Azure Key Vault
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# HashiCorp Vault
VAULT_ADDR=https://vault.example.com:8200
VAULT_TOKEN=your-vault-token
VAULT_NAMESPACE=secret

# TransIP/OpenStack Barbican
BARBICAN_ENDPOINT=https://api.transip.nl/barbican
BARBICAN_PROJECT_ID=your-project-id
OPENSTACK_AUTH_URL=https://api.transip.nl/keystone/v3
OPENSTACK_USERNAME=your-username
OPENSTACK_PASSWORD=your-password
```

### Config File

Update `src/config/index.js`:

```javascript
secrets: {
  provider: process.env.SECRETS_PROVIDER || 'environment',
  cacheTTL: parseInt(process.env.SECRETS_CACHE_TTL, 10) || 300,
  
  aws: {
    region: process.env.AWS_SECRETS_REGION || 'us-east-1',
  },
  
  azure: {
    vaultUrl: process.env.AZURE_KEY_VAULT_URL,
  },
  
  vault: {
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN,
    namespace: process.env.VAULT_NAMESPACE || 'secret',
  },
  
  barbican: {
    endpoint: process.env.BARBICAN_ENDPOINT,
    projectId: process.env.BARBICAN_PROJECT_ID,
    authUrl: process.env.OPENSTACK_AUTH_URL,
  },
},
```

---

## Usage Examples

### Basic Usage

```javascript
import secretsManager from './services/secretsManager.js';

// Initialize once on application startup
await secretsManager.initialize();

// Get a single secret
const jwtSecret = await secretsManager.getSecret('JWT_SECRET');

// Set a secret
await secretsManager.setSecret('NEW_API_KEY', 'new-value');

// Delete a secret
await secretsManager.deleteSecret('OLD_API_KEY');

// Rotate a secret
await secretsManager.rotateSecret('JWT_SECRET');
```

### Using Helper Functions

```javascript
import { 
  loadSecret, 
  loadSecrets, 
  loadJWTSecrets,
  loadDatabaseSecrets,
  initializeSecrets 
} from './utils/secrets.js';

// Initialize on startup
await initializeSecrets();

// Load single secret
const dbPassword = await loadSecret('DATABASE_PASSWORD');

// Load multiple secrets
const { STRIPE_KEY, SENDGRID_KEY } = await loadSecrets([
  'STRIPE_KEY',
  'SENDGRID_KEY'
]);

// Load JWT secrets (with validation)
const { JWT_SECRET, JWT_REFRESH_SECRET } = await loadJWTSecrets();

// Load database secrets
const dbSecrets = await loadDatabaseSecrets();
```

### Storing Structured Secrets

```javascript
// Store an object as a secret
await secretsManager.setSecret('DATABASE_CONFIG', {
  host: 'localhost',
  port: 5432,
  user: 'admin',
  password: 'secure-password',
  database: 'recruitiq'
});

// Retrieve the object
const dbConfig = await secretsManager.getSecret('DATABASE_CONFIG');
console.log(dbConfig.host); // 'localhost'
```

### Error Handling

```javascript
try {
  const secret = await loadSecret('OPTIONAL_KEY', null, false);
  if (secret) {
    // Use secret
  } else {
    // Use default behavior
  }
} catch (error) {
  logger.error('Failed to load secret', { error: error.message });
  // Handle error
}
```

### Integration with Express

```javascript
import express from 'express';
import { initializeSecrets } from './utils/secrets.js';

const app = express();

// Initialize secrets before starting server
async function startServer() {
  try {
    await initializeSecrets();
    
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();
```

### Health Check Endpoint

```javascript
import { secretsHealthCheck } from './utils/secrets.js';

app.get('/health/secrets', async (req, res) => {
  const health = await secretsHealthCheck();
  
  const status = health.status === 'healthy' ? 200 : 503;
  res.status(status).json(health);
});
```

---

## Secret Rotation

### Automatic Rotation (AWS)

AWS Secrets Manager supports automatic rotation with Lambda:

```javascript
// Enable rotation when creating secret
await secretsManager.rotateSecret('JWT_SECRET');
```

**Lambda Rotation Function**:
```javascript
exports.handler = async (event) => {
  const { SecretId, Token } = event;
  
  // Generate new secret
  const newSecret = crypto.randomBytes(32).toString('hex');
  
  // Store new version
  await secretsManager.putSecretValue({
    SecretId,
    SecretString: newSecret,
    VersionStages: ['AWSPENDING'],
    ClientRequestToken: Token,
  });
  
  // Test new secret
  // ... test application with new secret ...
  
  // Finalize rotation
  await secretsManager.updateSecretVersionStage({
    SecretId,
    VersionStage: 'AWSCURRENT',
    MoveToVersionId: Token,
    RemoveFromVersionId: currentVersionId,
  });
};
```

### Manual Rotation

```javascript
import { rotateSecret, generateRandomSecret } from './utils/secrets.js';

// Rotate JWT secret
await rotateSecret('JWT_SECRET', () => {
  return generateRandomSecret(64); // 64-byte hex string
});

// Rotate with custom logic
await rotateSecret('API_KEY', async () => {
  const response = await fetch('https://api.example.com/generate-key', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer admin-token' },
  });
  
  const { apiKey } = await response.json();
  return apiKey;
});
```

### Rotation Schedule

Recommended rotation schedule:

| Secret Type | Rotation Frequency | Notes |
|-------------|-------------------|-------|
| JWT Secrets | Every 90 days | Invalidates all existing tokens |
| Database Passwords | Every 90 days | Coordinate with database |
| API Keys | Every 180 days | Check with API provider |
| Encryption Keys | Every 365 days | Requires re-encryption |
| Admin Credentials | Every 30 days | High-privilege accounts |

---

## Migration Guide

### Step 1: Choose a Provider

For TransIP hosting:
```bash
SECRETS_PROVIDER=barbican
```

For AWS:
```bash
SECRETS_PROVIDER=aws
```

For self-hosted:
```bash
SECRETS_PROVIDER=vault
```

### Step 2: Create Secrets in Provider

**AWS Example**:
```bash
#!/bin/bash

# Migrate all environment secrets to AWS
aws secretsmanager create-secret --name JWT_SECRET --secret-string "$JWT_SECRET"
aws secretsmanager create-secret --name DATABASE_PASSWORD --secret-string "$DATABASE_PASSWORD"
aws secretsmanager create-secret --name STRIPE_SECRET_KEY --secret-string "$STRIPE_SECRET_KEY"
```

**Barbican Example**:
```bash
#!/bin/bash

# Get OpenStack token
TOKEN=$(curl -X POST "$OPENSTACK_AUTH_URL/auth/tokens" \
  -H "Content-Type: application/json" \
  -d '{"auth":{"identity":{"methods":["password"],"password":{"user":{"name":"'$OPENSTACK_USERNAME'","domain":{"name":"Default"},"password":"'$OPENSTACK_PASSWORD'"}}},"scope":{"project":{"id":"'$BARBICAN_PROJECT_ID'"}}}}' \
  | jq -r '.token')

# Create secrets
curl -X POST "$BARBICAN_ENDPOINT/v1/secrets" \
  -H "X-Auth-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"JWT_SECRET\",\"payload\":\"$JWT_SECRET\",\"payload_content_type\":\"text/plain\"}"
```

### Step 3: Update Application Code

```javascript
// Before (environment variables)
const jwtSecret = process.env.JWT_SECRET;

// After (secrets manager)
import { loadSecret } from './utils/secrets.js';
const jwtSecret = await loadSecret('JWT_SECRET');
```

### Step 4: Test

```javascript
// Test secret retrieval
import { secretsHealthCheck } from './utils/secrets.js';

const health = await secretsHealthCheck();
console.log('Secrets Manager Status:', health.status);
console.log('Provider:', health.provider);
```

### Step 5: Deploy

1. Update environment variables with provider config
2. Deploy application
3. Remove old environment secrets (after confirming working)

---

## Best Practices

### 1. Never Commit Secrets

❌ **Bad**:
```javascript
const API_KEY = 'sk_live_abc123'; // Hardcoded!
```

✅ **Good**:
```javascript
const API_KEY = await loadSecret('API_KEY');
```

### 2. Use Structured Secrets for Related Values

```javascript
// Store database config as single secret
await secretsManager.setSecret('DATABASE_CONFIG', {
  host: 'db.example.com',
  port: 5432,
  user: 'app_user',
  password: 'secure_password',
  database: 'production_db',
  ssl: true
});
```

### 3. Implement Secret Rotation

```javascript
// Schedule rotation
import cron from 'node-cron';

// Rotate JWT secrets every 90 days
cron.schedule('0 0 1 */3 *', async () => {
  logger.info('Starting JWT secret rotation');
  await rotateSecret('JWT_SECRET', generateRandomSecret);
  await rotateSecret('JWT_REFRESH_SECRET', generateRandomSecret);
  logger.info('JWT secret rotation complete');
});
```

### 4. Cache Appropriately

```javascript
// Default 5-minute cache is good for most cases
// Adjust if needed:
SECRETS_CACHE_TTL=600  # 10 minutes for less-frequently-used secrets
SECRETS_CACHE_TTL=60   # 1 minute for frequently-rotated secrets
```

### 5. Monitor Secret Access

```javascript
import { logSecurityEvent, SecurityEventType } from './utils/logger.js';

// Log when secrets are accessed
const secret = await loadSecret('SENSITIVE_KEY');
logSecurityEvent(SecurityEventType.DATA_ACCESS, {
  resourceType: 'secret',
  resourceId: 'SENSITIVE_KEY',
});
```

### 6. Use Different Secrets Per Environment

```javascript
// Development
JWT_SECRET_DEV

// Staging
JWT_SECRET_STAGING

// Production
JWT_SECRET_PROD
```

### 7. Implement Least Privilege

**AWS IAM Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:app/*"
    }
  ]
}
```

---

## Troubleshooting

### Problem: Secrets Not Loading

**Check provider configuration**:
```bash
# Verify environment variables
echo $SECRETS_PROVIDER
echo $AWS_ACCESS_KEY_ID  # For AWS
echo $BARBICAN_ENDPOINT  # For Barbican
```

**Check logs**:
```bash
grep "Secrets Manager" logs/combined.log
grep "Failed to retrieve secret" logs/error.log
```

**Test connection**:
```javascript
const health = await secretsHealthCheck();
console.log(health);
```

### Problem: Authentication Failed (Barbican/OpenStack)

**Verify credentials**:
```bash
# Test OpenStack authentication
curl -X POST "$OPENSTACK_AUTH_URL/auth/tokens" \
  -H "Content-Type: application/json" \
  -d '{
    "auth": {
      "identity": {
        "methods": ["password"],
        "password": {
          "user": {
            "name": "'$OPENSTACK_USERNAME'",
            "domain": {"name": "Default"},
            "password": "'$OPENSTACK_PASSWORD'"
          }
        }
      },
      "scope": {
        "project": {"id": "'$BARBICAN_PROJECT_ID'"}
      }
    }
  }'
```

### Problem: Cache Not Working

**Clear cache manually**:
```javascript
secretsManager.clearCache();
```

**Check cache stats**:
```javascript
const stats = secretsManager.getCacheStats();
console.log('Cache size:', stats.size);
console.log('Provider:', stats.provider);
console.log('TTL:', stats.ttl);
```

### Problem: Secret Rotation Fails

**Check permissions**:
- AWS: Ensure `secretsmanager:RotateSecret` permission
- Azure: Ensure `update` permission on Key Vault
- Vault: Ensure write permissions on secret path
- Barbican: Requires separate secret creation (no built-in rotation)

---

## Summary

✅ **Implemented Features:**
- 5 secret provider implementations (AWS, Azure, Vault, Barbican, Environment)
- Unified API for all providers
- In-memory caching with TTL
- Helper functions for common secret types
- Secret rotation support
- Health check endpoint
- Comprehensive error handling

✅ **Security Benefits:**
- Secrets never in code or logs
- Automatic rotation capabilities
- Provider-specific encryption at rest
- Least privilege access control
- Audit trails (provider-dependent)

✅ **TransIP Barbican Features:**
- OpenStack-based secret management
- REST API integration
- NEN 7510 & ISO 27001 certified
- European data hosting
- Volume encryption support
- Certificate management

For implementation details, see:
- `src/services/secretsManager.js` - Core secrets manager
- `src/utils/secrets.js` - Helper functions
- `src/config/index.js` - Configuration
