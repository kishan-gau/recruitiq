# Data Encryption at Rest and in Transit

Comprehensive guide for encrypting sensitive data throughout the RecruitIQ application.

## Table of Contents

- [Overview](#overview)
- [Encryption at Rest](#encryption-at-rest)
  - [Field-Level Encryption](#field-level-encryption)
  - [Database Integration](#database-integration)
  - [Searchable Encryption](#searchable-encryption)
- [Encryption in Transit](#encryption-in-transit)
  - [TLS 1.3 Configuration](#tls-13-configuration)
  - [Certificate Management](#certificate-management)
  - [HSTS Headers](#hsts-headers)
- [Key Management](#key-management)
  - [Master Key](#master-key)
  - [Key Rotation](#key-rotation)
  - [Key Storage](#key-storage)
- [Usage Examples](#usage-examples)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

RecruitIQ implements defense-in-depth encryption:

- **Data at Rest**: AES-256-GCM encryption for sensitive database fields
- **Data in Transit**: TLS 1.3 for all HTTPS connections
- **Key Management**: Integration with secrets management system
- **Field-Level Encryption**: Transparent encryption/decryption for PII data

### Security Standards

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **TLS Version**: TLS 1.3 (minimum)
- **Key Length**: 256 bits (32 bytes)

## Encryption at Rest

### Field-Level Encryption

The encryption service provides automatic encryption for sensitive database fields.

#### Encrypted Fields

By default, the following fields are encrypted:

**Users Table:**
- `email` (searchable)
- `phone`
- `ssn` (searchable)
- `dateOfBirth`
- `address`

**Candidates Table:**
- `email` (searchable)
- `phone`
- `ssn` (searchable)
- `dateOfBirth`
- `address`
- `emergencyContact`
- `bankAccount`

**Payments Table:**
- `cardNumber` (searchable)
- `accountNumber` (searchable)
- `routingNumber`

#### Basic Encryption

```javascript
import encryption from './services/encryption.js';

// Encrypt a value
const encrypted = encryption.encrypt('sensitive-data');

// Decrypt a value
const decrypted = encryption.decrypt(encrypted);

// Encrypt specific fields in an object
const user = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-1234',
};

const encryptedUser = encryption.encryptFields(user, ['email', 'phone']);
```

### Database Integration

#### Using Database Encryption Helpers

```javascript
import dbEncryption from './utils/dbEncryption.js';

// Encrypt before saving to database
const user = {
  name: 'John Doe',
  email: 'john@example.com',
  ssn: '123-45-6789',
};

const encryptedUser = dbEncryption.encryptRow('users', user);
await db.insert('users', encryptedUser);

// Decrypt after loading from database
const result = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
const decryptedUser = dbEncryption.decryptRow('users', result);
```

#### Express.js Middleware

```javascript
import { encryptBeforeSave, decryptAfterLoad } from './utils/dbEncryption.js';

// Encrypt before saving
app.post('/api/users', async (req, res) => {
  const encryptedData = await encryptBeforeSave('users')(req.body);
  const user = await db.insert('users', encryptedData);
  
  // Decrypt before sending response
  const decryptedUser = await decryptAfterLoad('users')(user);
  res.json(decryptedUser);
});

// Decrypt after loading
app.get('/api/users/:id', async (req, res) => {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
  const decryptedUser = await decryptAfterLoad('users')(user);
  res.json(decryptedUser);
});
```

### Searchable Encryption

Some encrypted fields need to be searchable (e.g., email lookup). These fields have a corresponding `_hash` column.

#### Database Schema

```sql
-- Add hash columns for searchable encrypted fields
ALTER TABLE users ADD COLUMN email_hash VARCHAR(64);
ALTER TABLE users ADD COLUMN ssn_hash VARCHAR(64);

-- Create indexes on hash columns
CREATE INDEX idx_users_email_hash ON users(email_hash);
CREATE INDEX idx_users_ssn_hash ON users(ssn_hash);
```

#### Searching Encrypted Fields

```javascript
import { buildEncryptedSearchQuery } from './utils/dbEncryption.js';

// Search by encrypted email
const searchEmail = 'john@example.com';
const whereClause = buildEncryptedSearchQuery('users', 'email', searchEmail);

// whereClause = { email_hash: '5d41402abc4b2a76b9719d911017c592' }

const users = await db.query('SELECT * FROM users WHERE email_hash = ?', [
  whereClause.email_hash,
]);

const decryptedUsers = dbEncryption.decryptRows('users', users);
```

#### Automatic Hash Generation

```javascript
// Hash is automatically generated when encrypting
const user = {
  email: 'john@example.com',
  ssn: '123-45-6789',
};

const encrypted = dbEncryption.encryptRow('users', user);
// encrypted = {
//   email: 'encrypted-base64-data...',
//   email_hash: '5d41402abc4b2a76b9719d911017c592',
//   ssn: 'encrypted-base64-data...',
//   ssn_hash: 'a665a45920422f9d417e4867efdc4fb8',
// }
```

## Encryption in Transit

### TLS 1.3 Configuration

#### Environment Variables

```bash
# TLS Configuration
TLS_ENABLED=true
TLS_CERT_PATH=/path/to/certificate.pem
TLS_KEY_PATH=/path/to/private-key.pem
TLS_CA_PATH=/path/to/ca-bundle.pem  # Optional
TLS_MIN_VERSION=TLSv1.3
TLS_MAX_VERSION=TLSv1.3
```

#### Creating HTTPS Server

```javascript
import express from 'express';
import tlsConfig from './utils/tlsConfig.js';

const app = express();

// Create secure HTTPS server
const server = tlsConfig.createSecureServer(app);

server.listen(443, () => {
  console.log('Secure server listening on port 443');
});
```

#### Development vs Production

```javascript
// Automatically handles development fallback
const server = tlsConfig.createServer(app);

// In production: creates HTTPS server
// In development: tries HTTPS, falls back to HTTP if certs unavailable
```

### Certificate Management

#### Generating Self-Signed Certificates (Development)

```bash
# Generate private key
openssl genrsa -out private-key.pem 2048

# Generate certificate signing request
openssl req -new -key private-key.pem -out csr.pem

# Generate self-signed certificate
openssl x509 -req -days 365 -in csr.pem -signkey private-key.pem -out certificate.pem
```

#### Production Certificates

Use certificates from a trusted Certificate Authority (CA):

- **Let's Encrypt**: Free, automated certificates
- **Commercial CA**: DigiCert, GlobalSign, etc.
- **Corporate CA**: Company-issued certificates

#### Certificate Validation

```javascript
import tlsConfig from './utils/tlsConfig.js';

// Validate TLS configuration
const validation = tlsConfig.validateTLSConfig();

if (!validation.valid) {
  console.error('TLS configuration issues:', validation.issues);
}

if (validation.warnings.length > 0) {
  console.warn('TLS warnings:', validation.warnings);
}

console.log('TLS version:', validation.tlsVersion);
console.log('Supports TLS 1.3:', validation.supportsTLS13);
```

#### Certificate Expiry Monitoring

```javascript
import tlsConfig from './utils/tlsConfig.js';

// Check certificate expiry
const expiry = tlsConfig.checkCertificateExpiry('/path/to/certificate.pem', 30);

if (expiry.expired) {
  console.error('Certificate has expired!');
} else if (expiry.warning) {
  console.warn(`Certificate expires in ${expiry.daysUntilExpiry} days`);
} else {
  console.log(`Certificate valid for ${expiry.daysUntilExpiry} more days`);
}
```

### HSTS Headers

HTTP Strict Transport Security (HSTS) forces browsers to use HTTPS.

#### Middleware Setup

```javascript
import tlsConfig from './utils/tlsConfig.js';

// Enforce HTTPS and set HSTS header
app.use(tlsConfig.enforceHTTPS({
  maxAge: 31536000, // 1 year in seconds
}));

// Manually set HSTS header
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', tlsConfig.getHSTSHeader());
  next();
});
```

## Key Management

### Master Key

The master encryption key is used to derive field-specific keys.

#### Environment Variable

```bash
# Generate a secure master key
ENCRYPTION_MASTER_KEY=$(openssl rand -hex 64)

# Add to .env file
echo "ENCRYPTION_MASTER_KEY=${ENCRYPTION_MASTER_KEY}" >> .env
```

#### Key Requirements

- **Minimum length**: 32 characters
- **Recommended length**: 64+ characters
- **Character set**: Alphanumeric (hex recommended)
- **Storage**: Secrets manager (not in code or version control)

#### Loading from Secrets Manager

```javascript
import { loadSecret } from './utils/secrets.js';

// Load encryption key from secrets manager
const masterKey = await loadSecret('encryption/master-key', null, true);

process.env.ENCRYPTION_MASTER_KEY = masterKey;
```

### Key Rotation

#### Rotating Encryption Key

```javascript
import dbEncryption from './utils/dbEncryption.js';

// Rotate encryption for a single row
const oldKey = 'old-master-key...';
const newKey = 'new-master-key...';

const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
const rotated = dbEncryption.rotateRowEncryption('users', user, oldKey, newKey);

await db.update('users', rotated, { id: userId });

// Rotate encryption for entire table
const rotatedCount = await dbEncryption.rotateTableEncryption(
  db,
  'users',
  oldKey,
  newKey
);

console.log(`Rotated ${rotatedCount} rows`);
```

#### Key Rotation Schedule

Recommended key rotation schedule:

- **Master encryption key**: Every 90 days
- **TLS certificates**: Every 90 days (Let's Encrypt auto-renews)
- **JWT secrets**: Every 180 days

#### Automated Rotation Script

```javascript
import dbEncryption from './utils/dbEncryption.js';
import { rotateSecret } from './utils/secrets.js';

async function rotateEncryptionKeys() {
  // Load old and new keys
  const oldKey = process.env.ENCRYPTION_MASTER_KEY;
  const newKey = await rotateSecret('encryption/master-key', () => {
    return encryption.generateEncryptionKey(64);
  });
  
  // Rotate encryption for all tables
  const tables = ['users', 'candidates', 'payments'];
  
  for (const table of tables) {
    console.log(`Rotating encryption for ${table}...`);
    const count = await dbEncryption.rotateTableEncryption(
      db,
      table,
      oldKey,
      newKey
    );
    console.log(`  Rotated ${count} rows`);
  }
  
  // Update environment
  process.env.ENCRYPTION_MASTER_KEY = newKey;
  
  console.log('Encryption key rotation complete');
}
```

### Key Storage

#### DO NOT

❌ Store keys in source code
❌ Store keys in version control
❌ Store keys in client-side code
❌ Log keys to console or files
❌ Send keys in API responses
❌ Store keys in plain text files

#### DO

✅ Use secrets management system (AWS, Azure, Vault, Barbican)
✅ Use environment variables (development only)
✅ Encrypt keys at rest
✅ Rotate keys regularly
✅ Use different keys per environment
✅ Restrict key access with IAM policies

## Usage Examples

### Example 1: User Registration with Encryption

```javascript
import dbEncryption from './utils/dbEncryption.js';
import bcrypt from 'bcrypt';

app.post('/api/register', async (req, res) => {
  const { name, email, password, phone, ssn, dateOfBirth } = req.body;
  
  // Hash password (NOT encrypted, one-way hash)
  const passwordHash = await bcrypt.hash(password, 12);
  
  // Encrypt sensitive fields
  const userData = dbEncryption.encryptRow('users', {
    name, // Not encrypted
    email, // Encrypted + hashed
    phone, // Encrypted
    ssn, // Encrypted + hashed
    dateOfBirth, // Encrypted
    passwordHash, // Not encrypted (already hashed)
  });
  
  // Save to database
  const user = await db.insert('users', userData);
  
  // Decrypt for response (don't include password hash)
  const decryptedUser = dbEncryption.decryptRow('users', user);
  delete decryptedUser.passwordHash;
  
  res.json(decryptedUser);
});
```

### Example 2: Searching Encrypted Email

```javascript
import { buildEncryptedSearchQuery } from './utils/dbEncryption.js';

app.post('/api/users/search', async (req, res) => {
  const { email } = req.body;
  
  // Build search query using hash
  const whereClause = buildEncryptedSearchQuery('users', 'email', email);
  
  // Query database
  const users = await db.query(
    'SELECT * FROM users WHERE email_hash = ?',
    [whereClause.email_hash]
  );
  
  // Decrypt results
  const decryptedUsers = dbEncryption.decryptRows('users', users);
  
  res.json(decryptedUsers);
});
```

### Example 3: Health Check Endpoint

```javascript
import tlsConfig from './utils/tlsConfig.js';
import encryption from './services/encryption.js';

app.get('/api/health/security', (req, res) => {
  const tlsHealth = tlsConfig.tlsHealthCheck();
  const encryptionHealth = encryption.validateEncryptionConfig();
  
  res.json({
    tls: tlsHealth,
    encryption: encryptionHealth,
    overall: tlsHealth.status === 'healthy' && encryptionHealth.valid
      ? 'healthy'
      : 'unhealthy',
  });
});
```

## Migration Guide

### Step 1: Add Hash Columns

```javascript
import dbEncryption from './utils/dbEncryption.js';

// Add hash columns to database
await dbEncryption.addHashColumns(db, 'users');
await dbEncryption.addHashColumns(db, 'candidates');
await dbEncryption.addHashColumns(db, 'payments');
```

### Step 2: Migrate Existing Data

```javascript
import dbEncryption from './utils/dbEncryption.js';

// Migrate unencrypted data to encrypted format
const tables = ['users', 'candidates', 'payments', 'interviews'];

for (const table of tables) {
  console.log(`Migrating ${table}...`);
  
  const count = await dbEncryption.migrateToEncryption(db, table, 100);
  
  console.log(`Migrated ${count} rows in ${table}`);
}
```

### Step 3: Update Application Code

```javascript
// Before: Direct database access
const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

// After: Decrypt after loading
const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
const decryptedUser = dbEncryption.decryptRow('users', user);
```

### Step 4: Verify Migration

```javascript
// Check if data is encrypted
const user = await db.query('SELECT * FROM users LIMIT 1');

console.log('Email encrypted:', encryption.isEncrypted(user.email));
console.log('Email hash exists:', !!user.email_hash);
```

## Best Practices

### 1. Defense in Depth

- ✅ Encrypt sensitive data at rest
- ✅ Use TLS 1.3 for data in transit
- ✅ Implement proper access controls
- ✅ Use secrets management for keys
- ✅ Enable database-level encryption (e.g., AWS RDS encryption)

### 2. Key Management

- ✅ Use strong, random keys (64+ characters)
- ✅ Store keys in secrets manager, not environment variables
- ✅ Rotate keys regularly (every 90 days)
- ✅ Use different keys per environment
- ✅ Audit key access and usage

### 3. Field-Level Encryption

- ✅ Only encrypt sensitive fields (PII, financial data)
- ✅ Use searchable encryption for lookup fields
- ✅ Consider performance impact of encryption
- ✅ Test encryption/decryption thoroughly
- ✅ Handle encryption errors gracefully

### 4. TLS Configuration

- ✅ Use TLS 1.3 minimum
- ✅ Use strong cipher suites only
- ✅ Enable HSTS with long max-age
- ✅ Monitor certificate expiry
- ✅ Use certificates from trusted CAs in production

### 5. Compliance

- ✅ GDPR: Encrypt personal data
- ✅ HIPAA: Encrypt health information
- ✅ PCI DSS: Encrypt cardholder data
- ✅ SOC 2: Implement encryption controls
- ✅ ISO 27001: Follow encryption standards

### 6. Performance

- ✅ Use caching for decrypted data (with caution)
- ✅ Encrypt on save, decrypt on load
- ✅ Batch encrypt/decrypt operations
- ✅ Use database indexes on hash columns
- ✅ Monitor encryption performance

### 7. Monitoring

- ✅ Log encryption errors (without sensitive data)
- ✅ Monitor key rotation status
- ✅ Alert on certificate expiry
- ✅ Track encryption failures
- ✅ Audit encrypted field access

## Troubleshooting

### Decryption Fails

**Problem**: `Failed to decrypt data`

**Possible Causes**:
1. Wrong encryption key
2. Corrupted data
3. Data encrypted with old key

**Solutions**:
```javascript
// Check if data is encrypted
if (encryption.isEncrypted(data)) {
  try {
    const decrypted = encryption.decrypt(data);
  } catch (error) {
    console.error('Decryption failed:', error.message);
    
    // Try old key if available
    if (process.env.OLD_ENCRYPTION_KEY) {
      const decrypted = encryption.decrypt(data, process.env.OLD_ENCRYPTION_KEY);
    }
  }
}
```

### Certificate Errors

**Problem**: `certificate has expired` or `unable to verify certificate`

**Solutions**:
```bash
# Check certificate expiry
openssl x509 -in certificate.pem -noout -dates

# Verify certificate chain
openssl verify -CAfile ca-bundle.pem certificate.pem

# Renew Let's Encrypt certificate
certbot renew
```

### Performance Issues

**Problem**: Slow encryption/decryption

**Solutions**:
1. Cache decrypted data (carefully)
2. Batch operations
3. Use async encryption
4. Optimize database queries
5. Consider hardware acceleration

```javascript
// Batch decryption
const users = await db.query('SELECT * FROM users LIMIT 100');
const decrypted = dbEncryption.decryptRows('users', users);
```

### Key Rotation Errors

**Problem**: Data encrypted with old key

**Solution**:
```javascript
// Keep old key temporarily during rotation
process.env.OLD_ENCRYPTION_KEY = oldKey;
process.env.ENCRYPTION_MASTER_KEY = newKey;

// Decrypt with old key, encrypt with new key
try {
  const decrypted = encryption.decrypt(data, oldKey);
  const encrypted = encryption.encrypt(decrypted, newKey);
} catch (error) {
  console.error('Key rotation failed:', error);
}
```

### TLS Version Mismatch

**Problem**: `TLS 1.3 not supported`

**Check Node.js and OpenSSL versions**:
```bash
node -p "process.versions.openssl"
node -p "require('tls').DEFAULT_MAX_VERSION"
```

**Upgrade if needed**:
- Node.js 12.0.0+ supports TLS 1.3
- OpenSSL 1.1.1+ supports TLS 1.3

### Missing Environment Variables

**Problem**: `ENCRYPTION_MASTER_KEY is not configured`

**Solution**:
```bash
# Generate and set encryption key
export ENCRYPTION_MASTER_KEY=$(openssl rand -hex 64)

# Or load from secrets manager
node -e "require('./src/utils/secrets').initializeSecrets()"
```

## Security Considerations

### Data Classification

**Critical Data (Must Encrypt)**:
- Social Security Numbers (SSN)
- Credit card numbers
- Bank account numbers
- Health information
- Biometric data

**Sensitive Data (Should Encrypt)**:
- Email addresses
- Phone numbers
- Physical addresses
- Date of birth
- Emergency contacts

**Non-Sensitive Data (No Encryption)**:
- Usernames
- Public profile information
- Non-personal metadata
- System logs (excluding sensitive data)

### Compliance Requirements

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| GDPR | Encrypt personal data | Field-level encryption |
| HIPAA | Encrypt PHI at rest and in transit | AES-256 + TLS 1.3 |
| PCI DSS | Encrypt cardholder data | Strong encryption + key management |
| SOC 2 | Implement encryption controls | Documented encryption policy |

### Audit Trail

```javascript
import logger from './utils/logger.js';

// Log encryption operations (not the data!)
logger.logSecurityEvent('DATA_ENCRYPTED', {
  table: 'users',
  field: 'email',
  userId: user.id,
});

logger.logSecurityEvent('DATA_DECRYPTED', {
  table: 'users',
  field: 'email',
  userId: user.id,
  accessedBy: req.user.id,
});
```

---

**Last Updated**: 2024
**Version**: 1.0.0
**Maintained by**: RecruitIQ Security Team
