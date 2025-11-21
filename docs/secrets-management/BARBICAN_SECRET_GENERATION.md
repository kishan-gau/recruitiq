# Barbican Secret Generation Guide

## Overview

RecruitIQ's SecretsManager now supports **automatic secret generation** using OpenStack Barbican. Instead of manually creating secrets, Barbican can generate cryptographically secure random secrets for you.

## Features

✅ **Generate cryptographically secure secrets** (AES keys, passphrases, etc.)  
✅ **Multiple algorithm support** (AES, RSA, DSA, EC, Octets)  
✅ **Automatic key rotation** with generation  
✅ **Configurable key sizes** (128, 192, 256 bits for symmetric keys)  
✅ **Expiration support** for temporary secrets  
✅ **CLI tools** for easy management  

---

## Secret Generation Options

### Supported Algorithms

| Algorithm | Use Case | Key Sizes | Secret Type |
|-----------|----------|-----------|-------------|
| `aes` | Symmetric encryption (JWT, data encryption) | 128, 192, 256 | `symmetric` |
| `rsa` | Asymmetric encryption (certificates) | 1024, 2048, 4096 | `asymmetric` |
| `dsa` | Digital signatures | 1024, 2048, 3072 | `asymmetric` |
| `ec` | Elliptic curve cryptography | 256, 384, 521 | `asymmetric` |
| `octets` | Random bytes (API keys, tokens) | Any | `opaque` |

### Encryption Modes

- `cbc` - Cipher Block Chaining (default for AES)
- `gcm` - Galois/Counter Mode (authenticated encryption)
- `ecb` - Electronic Codebook (not recommended)
- `ofb` - Output Feedback
- `cfb` - Cipher Feedback

---

## Usage

### 1. Programmatic API

```javascript
import secretsManager from './services/SecretsManager.js';

// Generate a JWT secret
const jwtSecretRef = await secretsManager.generateSecret('JWT_SECRET', {
  algorithm: 'aes',
  bit_length: 256,
  mode: 'cbc',
  secret_type: 'symmetric',
});

// Generate an encryption key with expiration
const encKeyRef = await secretsManager.generateSecret('TEMP_ENCRYPTION_KEY', {
  algorithm: 'aes',
  bit_length: 256,
  mode: 'gcm',
  secret_type: 'symmetric',
  expiration: new Date('2026-12-31'), // Expires at end of 2026
});

// Generate an API key (random octets)
const apiKeyRef = await secretsManager.generateSecret('API_KEY', {
  algorithm: 'octets',
  bit_length: 256,
  secret_type: 'opaque',
});

// Retrieve the generated secret
const jwtSecret = await secretsManager.getSecret('JWT_SECRET');
console.log('Generated JWT Secret:', jwtSecret);
```

### 2. CLI Usage

```bash
# Generate a single secret
node scripts/generate-secrets.js generate JWT_SECRET

# Generate all standard application secrets
node scripts/generate-secrets.js generate-all

# Migrate existing secrets from .env to Barbican
node scripts/generate-secrets.js migrate

# Rotate a secret (generates new, deletes old)
node scripts/generate-secrets.js rotate JWT_SECRET

# List all secrets in Barbican
node scripts/generate-secrets.js list
```

---

## Standard Secrets Generated

When you run `node scripts/generate-secrets.js generate-all`, the following secrets are created:

| Secret Name | Algorithm | Bits | Mode | Use Case |
|-------------|-----------|------|------|----------|
| `JWT_SECRET` | AES | 256 | CBC | JWT access token signing |
| `JWT_REFRESH_SECRET` | AES | 256 | CBC | JWT refresh token signing |
| `ENCRYPTION_KEY` | AES | 256 | GCM | Data encryption at rest |
| `SESSION_SECRET` | AES | 256 | CBC | Session cookie encryption |
| `API_KEY_SALT` | Octets | 256 | N/A | API key hashing salt |

---

## Environment Configuration

Add to your `.env` file:

```env
# Secrets Provider
SECRETS_PROVIDER=barbican

# OpenStack Barbican Configuration
BARBICAN_ENDPOINT=https://your-openstack-endpoint.transip.nl/key-manager
OPENSTACK_AUTH_URL=https://your-openstack-endpoint.transip.nl
OPENSTACK_PROJECT_ID=your-project-id
OPENSTACK_USERNAME=your-username
OPENSTACK_PASSWORD=your-password
OPENSTACK_DOMAIN=Default
```

---

## Secret Rotation

### Automatic Rotation

```javascript
import secretsManager from './services/SecretsManager.js';

// Rotate a secret (generates new one, deletes old)
const newSecretRef = await secretsManager.rotateSecret('JWT_SECRET');

console.log('New JWT_SECRET reference:', newSecretRef);
```

### Manual Rotation Schedule

Create a cron job for automatic rotation:

```javascript
// scripts/rotate-secrets-cron.js
import secretsManager from '../src/services/SecretsManager.js';
import logger from '../src/utils/logger.js';

const SECRETS_TO_ROTATE = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_KEY',
];

async function rotateSecrets() {
  logger.info('Starting secret rotation');
  
  for (const secretName of SECRETS_TO_ROTATE) {
    try {
      await secretsManager.rotateSecret(secretName);
      logger.info(`Rotated ${secretName} successfully`);
    } catch (error) {
      logger.error(`Failed to rotate ${secretName}`, { error: error.message });
    }
  }
  
  logger.info('Secret rotation completed');
}

rotateSecrets();
```

Add to crontab (rotate every 90 days):

```bash
0 2 1 */3 * cd /path/to/recruitiq/backend && node scripts/rotate-secrets-cron.js
```

---

## Security Best Practices

### 1. **Use Generated Secrets in Production**

```javascript
// ❌ WRONG: Hard-coded secrets
const JWT_SECRET = 'my-super-secret-key-123';

// ✅ CORRECT: Barbican-generated secrets
const JWT_SECRET = await secretsManager.getSecret('JWT_SECRET');
```

### 2. **Rotate Secrets Regularly**

- JWT secrets: Every 90 days
- Encryption keys: Every 180 days
- API keys: Every 30 days (or on compromise)

### 3. **Use Expiration for Temporary Secrets**

```javascript
// Temporary secret expires in 24 hours
await secretsManager.generateSecret('TEMP_RESET_TOKEN', {
  algorithm: 'octets',
  bit_length: 256,
  expiration: new Date(Date.now() + 24 * 60 * 60 * 1000),
});
```

### 4. **Never Log Generated Secrets**

```javascript
// ❌ WRONG
const secret = await secretsManager.getSecret('JWT_SECRET');
logger.info('JWT Secret:', secret); // NEVER DO THIS!

// ✅ CORRECT
const secret = await secretsManager.getSecret('JWT_SECRET');
logger.info('JWT Secret retrieved successfully');
```

---

## Migration from .env to Barbican

### Step 1: Verify Current Secrets

```bash
# Check what secrets are in your .env
grep "_SECRET\|_KEY\|_PASSWORD" .env
```

### Step 2: Run Migration

```bash
# Migrate all secrets from .env to Barbican
node scripts/generate-secrets.js migrate
```

### Step 3: Update Application Code

```javascript
// Before (reading from .env)
const JWT_SECRET = process.env.JWT_SECRET;

// After (reading from Barbican)
const JWT_SECRET = await secretsManager.getSecret('JWT_SECRET');
```

### Step 4: Update .env with Secret References

```env
# Old way
JWT_SECRET=my-hardcoded-secret

# New way (store the Barbican reference)
JWT_SECRET_REF=https://barbican-endpoint/v1/secrets/{uuid}
```

### Step 5: Remove Secrets from .env

After confirming Barbican is working, remove the actual secret values from `.env`:

```env
# Remove these lines
JWT_SECRET=actual-secret-value
ENCRYPTION_KEY=actual-key-value

# Keep configuration
SECRETS_PROVIDER=barbican
BARBICAN_ENDPOINT=https://...
```

---

## Troubleshooting

### Error: "Failed to authenticate with OpenStack"

**Solution:** Check your OpenStack credentials in `.env`:

```env
OPENSTACK_AUTH_URL=https://your-endpoint.transip.nl
OPENSTACK_USERNAME=your-username
OPENSTACK_PASSWORD=your-password
OPENSTACK_PROJECT_ID=your-project-id
```

### Error: "Secret generation not supported by Environment provider"

**Solution:** Set `SECRETS_PROVIDER=barbican` in `.env`:

```env
SECRETS_PROVIDER=barbican
```

### Error: "Barbican returned 401"

**Solution:** Your auth token expired. The SecretsManager will automatically re-authenticate on next request.

### Error: "Secret not found"

**Solution:** Generate the secret first:

```bash
node scripts/generate-secrets.js generate JWT_SECRET
```

---

## API Reference

### `generateSecret(secretName, options)`

Generate a new cryptographically secure secret.

**Parameters:**
- `secretName` (string): Name for the secret
- `options` (object):
  - `algorithm` (string): Algorithm (aes, rsa, dsa, ec, octets)
  - `bit_length` (number): Key size in bits
  - `mode` (string): Encryption mode (cbc, gcm, etc.)
  - `secret_type` (string): Type (symmetric, asymmetric, passphrase, opaque)
  - `expiration` (Date): Optional expiration date

**Returns:** Secret reference URL (string)

**Example:**
```javascript
const secretRef = await secretsManager.generateSecret('MY_SECRET', {
  algorithm: 'aes',
  bit_length: 256,
  mode: 'gcm',
  secret_type: 'symmetric',
});
```

### `rotateSecret(secretName)`

Rotate a secret by generating a new one and deleting the old one.

**Parameters:**
- `secretName` (string): Name of the secret to rotate

**Returns:** New secret reference URL (string)

**Example:**
```javascript
const newRef = await secretsManager.rotateSecret('JWT_SECRET');
```

### `getSecret(secretName)`

Retrieve a secret value (with caching).

**Parameters:**
- `secretName` (string): Name of the secret

**Returns:** Secret value (string)

**Example:**
```javascript
const jwtSecret = await secretsManager.getSecret('JWT_SECRET');
```

---

## Cost Considerations

### TransIP Barbican Pricing

- Storage: €0.02 per secret per month
- API calls: €0.01 per 1,000 requests
- No bandwidth charges

### Estimated Costs

For a typical RecruitIQ deployment:
- 10 secrets × €0.02 = €0.20/month
- 10,000 API calls × €0.01 = €0.10/month
- **Total: ~€0.30/month**

**Much cheaper than:**
- AWS Secrets Manager: $0.40/secret/month
- Azure Key Vault: $0.03/10,000 operations

---

## Next Steps

1. ✅ Set up OpenStack project with TransIP
2. ✅ Configure Barbican credentials in `.env`
3. ✅ Run `node scripts/generate-secrets.js generate-all`
4. ✅ Migrate existing secrets with `node scripts/generate-secrets.js migrate`
5. ✅ Update application code to use SecretsManager
6. ✅ Remove hardcoded secrets from `.env`
7. ✅ Set up automatic rotation schedule

---

## References

- [OpenStack Barbican API Documentation](https://docs.openstack.org/barbican/latest/api/reference/secrets.html)
- [TransIP OpenStack Documentation](https://api.transip.nl/rest/docs.html)
- [OWASP Secret Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
