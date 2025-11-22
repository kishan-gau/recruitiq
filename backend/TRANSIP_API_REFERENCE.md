# TransIP API Quick Reference

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install transip-api
```

### 2. Configure Credentials
```bash
# Copy example file
cp .env.transip.example .env

# Edit with your credentials
nano .env
```

Add:
```env
TRANSIP_USERNAME=your_username
TRANSIP_PRIVATE_KEY=/path/to/private_key.pem
NODE_ENV=development  # Use 'production' for real provisioning
```

### 3. Import and Use
```javascript
import transipService from './services/transip.js';

// Create VPS
const vps = await transipService.createDedicatedVPS({
  organizationId: 'org-123',
  slug: 'acmecorp',
  tier: 'professional'  // starter, professional, or enterprise
});

console.log(`Created: ${vps.vpsName} at ${vps.ipAddress}`);
```

---

## 📋 Method Reference

### `createDedicatedVPS(config)`
Creates a new VPS with automated setup.

**Parameters:**
```javascript
{
  organizationId: 'string',  // Organization UUID
  slug: 'string',            // Tenant identifier (e.g., 'acmecorp')
  tier: 'string'             // 'starter' | 'professional' | 'enterprise'
}
```

**Returns:**
```javascript
{
  vpsName: 'vps-acmecorp-1234567890',
  ipAddress: '203.0.113.10',
  status: 'running',
  hostname: 'acmecorp.recruitiq.nl',
  createdAt: '2025-11-21T12:00:00Z'
}
```

**Example:**
```javascript
const vps = await transipService.createDedicatedVPS({
  organizationId: 'org-abc123',
  slug: 'acmecorp',
  tier: 'professional'
});
```

---

### `getVPSStatus(vpsName)`
Gets current VPS status and details.

**Parameters:**
- `vpsName` (string): VPS name from TransIP

**Returns:**
```javascript
{
  name: 'vps-acmecorp-1234567890',
  status: 'running',         // 'running' | 'stopped' | 'starting' | 'stopping'
  ipAddress: '203.0.113.10',
  cpus: 2,
  memoryInMb: 4096,
  diskInGb: 100,
  isLocked: false,
  isBlocked: false
}
```

**Example:**
```javascript
const status = await transipService.getVPSStatus('vps-acmecorp-1234567890');
if (status.isLocked) {
  console.log('VPS is locked, waiting...');
}
```

---

### `waitForVPSReady(vpsName, timeout)`
Polls VPS status until it's ready (running, has IP, not locked/blocked).

**Parameters:**
- `vpsName` (string): VPS name
- `timeout` (number): Timeout in ms (default: 300000 = 5 minutes)

**Returns:**
```javascript
{
  name: 'vps-acmecorp-1234567890',
  status: 'running',
  ipAddress: '203.0.113.10',
  // ... other status fields
}
```

**Example:**
```javascript
// Wait up to 5 minutes
const status = await transipService.waitForVPSReady(
  'vps-acmecorp-1234567890',
  300000
);
console.log(`VPS ready at ${status.ipAddress}`);
```

---

### `stopVPS(vpsName)`
Stops a running VPS.

**Parameters:**
- `vpsName` (string): VPS name

**Returns:** `void`

**Example:**
```javascript
await transipService.stopVPS('vps-acmecorp-1234567890');
console.log('VPS stopped');
```

---

### `startVPS(vpsName)`
Starts a stopped VPS.

**Parameters:**
- `vpsName` (string): VPS name

**Returns:** `void`

**Example:**
```javascript
await transipService.startVPS('vps-acmecorp-1234567890');
console.log('VPS started');
```

---

### `deleteVPS(vpsName)`
Schedules VPS for deletion at end of billing period.

**Parameters:**
- `vpsName` (string): VPS name

**Returns:** `void`

**Example:**
```javascript
await transipService.deleteVPS('vps-acmecorp-1234567890');
console.log('VPS scheduled for deletion');
```

⚠️ **Note:** VPS will be deleted at the end of the current billing period, not immediately.

---

### `createSnapshot(vpsName, description)`
Creates a snapshot (backup) of the VPS.

**Parameters:**
- `vpsName` (string): VPS name
- `description` (string): Snapshot description

**Returns:**
```javascript
{
  snapshotId: 'snapshot-12345',
  description: 'Daily backup - 2025-11-21',
  createdAt: '2025-11-21T03:00:00Z'
}
```

**Example:**
```javascript
const snapshot = await transipService.createSnapshot(
  'vps-acmecorp-1234567890',
  'Daily backup - 2025-11-21'
);
console.log(`Snapshot created: ${snapshot.snapshotId}`);
```

---

### `getVPSSpecs(tier)`
Gets VPS product specifications for a tier.

**Parameters:**
- `tier` (string): 'starter' | 'professional' | 'enterprise'

**Returns:**
```javascript
{
  productName: 'vps-bladevps-x4',
  addons: ['vps-addon-100-gb-disk']
}
```

**Example:**
```javascript
const specs = transipService.getVPSSpecs('professional');
console.log(`Product: ${specs.productName}`);
```

---

## 🎯 VPS Tiers

### Starter
- **Product:** `vps-bladevps-x2`
- **CPU:** 1 core
- **Memory:** 2 GB
- **Disk:** 50 GB
- **Use Case:** Small organizations, testing

### Professional (Default)
- **Product:** `vps-bladevps-x4`
- **CPU:** 2 cores
- **Memory:** 4 GB
- **Disk:** 100 GB
- **Use Case:** Medium organizations, production

### Enterprise
- **Product:** `vps-bladevps-x8`
- **CPU:** 4 cores
- **Memory:** 8 GB
- **Disk:** 200 GB
- **Use Case:** Large organizations, high traffic

---

## 🔒 Security & Testing

### Test Mode (Safe - No Charges)
```javascript
// In development, test mode is automatic
process.env.NODE_ENV = 'development';

// TransIP client adds ?test=1 to all API calls
// No real VPS will be created or charged
```

### Production Mode (⚠️  Real Charges)
```javascript
// In production, real VPS will be created and charged
process.env.NODE_ENV = 'production';

// Ensure you have:
// 1. Valid TransIP credentials
// 2. Sufficient account balance
// 3. Available VPS quota
```

### Read-Only Mode
```javascript
// To prevent ANY modifications (testing API reads only)
const client = new TransIP({
  login: process.env.TRANSIP_USERNAME,
  privateKey: process.env.TRANSIP_PRIVATE_KEY,
  readOnly: true  // Blocks all write operations
});
```

---

## 🐛 Error Handling

### Common Errors

#### 1. Invalid Credentials
```javascript
try {
  const vps = await transipService.createDedicatedVPS(config);
} catch (error) {
  if (error.message.includes('Invalid credentials')) {
    console.error('Check TRANSIP_USERNAME and TRANSIP_PRIVATE_KEY in .env');
  }
}
```

#### 2. Insufficient Quota
```javascript
try {
  const vps = await transipService.createDedicatedVPS(config);
} catch (error) {
  if (error.message.includes('Insufficient quota')) {
    console.error('Your TransIP account has reached the VPS limit');
    // Contact TransIP support or upgrade plan
  }
}
```

#### 3. VPS Not Found
```javascript
try {
  const status = await transipService.getVPSStatus('vps-nonexistent-999');
} catch (error) {
  if (error.message.includes('VPS not found')) {
    console.error('VPS does not exist or was deleted');
  }
}
```

#### 4. Timeout
```javascript
try {
  const status = await transipService.waitForVPSReady(vpsName, 60000);
} catch (error) {
  if (error.message.includes('Timeout')) {
    console.error('VPS took too long to provision');
    // Check TransIP control panel for manual status
  }
}
```

---

## 📊 Complete Workflow Example

```javascript
import transipService from './services/transip.js';

async function provisionTenantVPS(tenant) {
  try {
    console.log(`🚀 Creating VPS for ${tenant.slug}...`);

    // 1. Create VPS
    const vps = await transipService.createDedicatedVPS({
      organizationId: tenant.organizationId,
      slug: tenant.slug,
      tier: tenant.subscriptionTier
    });

    console.log(`✅ VPS created: ${vps.vpsName}`);

    // 2. Wait for VPS to be ready (up to 10 minutes)
    console.log('⏳ Waiting for VPS to be ready...');
    const status = await transipService.waitForVPSReady(
      vps.vpsName,
      600000  // 10 minutes
    );

    console.log(`✅ VPS ready at ${status.ipAddress}`);

    // 3. Create initial snapshot
    console.log('📸 Creating initial snapshot...');
    const snapshot = await transipService.createSnapshot(
      vps.vpsName,
      `Initial setup - ${new Date().toISOString()}`
    );

    console.log(`✅ Snapshot created: ${snapshot.snapshotId}`);

    // 4. Save VPS details to database
    await saveTenantVPS({
      tenantId: tenant.id,
      vpsName: vps.vpsName,
      ipAddress: status.ipAddress,
      hostname: vps.hostname,
      tier: tenant.subscriptionTier,
      snapshotId: snapshot.snapshotId,
      provisionedAt: new Date()
    });

    console.log('✅ Provisioning complete!');

    return {
      vpsName: vps.vpsName,
      ipAddress: status.ipAddress,
      hostname: vps.hostname
    };

  } catch (error) {
    console.error('❌ Provisioning failed:', error.message);
    
    // Log to monitoring system
    await logProvisioningError({
      tenantId: tenant.id,
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
}

// Usage
const result = await provisionTenantVPS({
  id: 'tenant-123',
  organizationId: 'org-abc',
  slug: 'acmecorp',
  subscriptionTier: 'professional'
});
```

---

## 🔗 Additional Resources

- **TransIP API Docs:** https://api.transip.nl/rest/docs.html
- **SDK Repository:** https://github.com/IFMSA-NL/transip-api
- **Control Panel:** https://www.transip.nl/cp/account/api/
- **Support:** https://www.transip.nl/contact/

---

## ⚙️ Configuration Reference

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `TRANSIP_USERNAME` | Yes | TransIP account username | - |
| `TRANSIP_PRIVATE_KEY` | Yes | Path to private key or key content | - |
| `NODE_ENV` | No | Environment (affects test mode) | `development` |

### Client Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `login` | string | TransIP username | Required |
| `privateKey` | string | Private key path or content | Required |
| `readOnly` | boolean | Prevent all modifications | `false` |
| `testMode` | boolean | Add ?test=1 to API calls | Auto (based on NODE_ENV) |
| `allowBilling` | boolean | Allow invoice-creating operations | Auto (based on NODE_ENV) |

---

## 📝 Notes

- **Test Mode:** Automatically enabled in development (`NODE_ENV !== 'production'`)
- **Billing:** Only allowed in production to prevent accidental charges
- **Rate Limits:** Check TransIP control panel for current API rate limits
- **Quotas:** VPS creation limited by account quota (check control panel)
- **Costs:** VPS provisioning charges your TransIP account
- **Cancellation:** VPS deletion scheduled for end of billing period

---

**Last Updated:** November 21, 2025  
**SDK Version:** transip-api@3.0.0
