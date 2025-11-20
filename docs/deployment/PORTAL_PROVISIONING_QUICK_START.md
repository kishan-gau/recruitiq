# Portal VPS Provisioning - Quick Start Guide

This guide helps you test the Portal-driven VPS provisioning system **right now** - even without TransIP API credentials.

---

## Prerequisites

✅ **Already Installed** (assuming existing RecruitIQ setup):
- Node.js 18+
- PostgreSQL
- pnpm
- Backend and Portal applications

❓ **Need to Configure**:
- Backend environment variables
- Test VPS in database (for testing without TransIP API)

---

## Quick Start (5 Minutes)

### Step 1: Configure Backend Environment

```powershell
# Navigate to backend
cd c:\RecruitIQ\backend

# Create/edit .env file
notepad .env
```

**Add these lines to .env:**
```bash
# Database (adjust if needed)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recruitiq
DATABASE_NAME=recruitiq

# JWT (generate a secure secret)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long

# SSH Key for VPS deployment (we'll create this next)
VPS_SSH_PRIVATE_KEY=C:\RecruitIQ\backend\test-vps-key
VPS_SSH_USER=root

# TransIP (optional - for real VPS creation)
# TRANSIP_USERNAME=your-username
# TRANSIP_PRIVATE_KEY=C:\path\to\transip-key.pem
```

### Step 2: Generate Test SSH Key

```powershell
# Generate SSH key for testing
ssh-keygen -t ed25519 -f C:\RecruitIQ\backend\test-vps-key -N '""'

# This creates:
# - C:\RecruitIQ\backend\test-vps-key (private key)
# - C:\RecruitIQ\backend\test-vps-key.pub (public key)
```

### Step 3: Create Test VPS in Database

```sql
-- Connect to PostgreSQL
psql -U postgres -d recruitiq

-- Create a test VPS record
INSERT INTO vps_instances (
  id, 
  vps_name, 
  vps_ip, 
  vps_hostname, 
  location, 
  product_name, 
  specs, 
  status, 
  is_shared, 
  max_organizations
) VALUES (
  'test-vps-00000000-0000-0000-0000-000000000001',
  'test-vps-1',
  '192.168.1.100',  -- Mock IP (won't actually deploy to this IP)
  'test-vps-1.recruitiq.nl',
  'Amsterdam',
  'bladevps-x4',
  '{"cpu": 4, "ram": 8192, "disk": 160, "bandwidth": 10000}',
  'active',
  false,
  1
);

-- Verify it was created
SELECT vps_name, vps_ip, status FROM vps_instances;
```

### Step 4: Start Backend and Portal

```powershell
# Terminal 1: Start Backend
cd c:\RecruitIQ\backend
npm run dev

# Terminal 2: Start Portal
cd c:\RecruitIQ\apps\portal
npm run dev
```

### Step 5: Test Provisioning Flow

1. **Open Portal UI**:
   ```
   http://localhost:5173
   ```

2. **Login as Platform Admin** (use your existing admin account)

3. **Navigate to Provisioning**:
   ```
   http://localhost:5173/infrastructure/provisioning
   ```

4. **Fill Out Form**:
   - Organization Name: `Test Company`
   - Slug: `testco`
   - Deployment Model: **Dedicated VPS**
   - Tier: `Professional`
   - Admin Email: `admin@testco.com`
   - Admin Name: `Test Admin`
   - Admin Password: (auto-generated or manual)

5. **Click "Provision Client"**

6. **Watch Real-Time Logs**:
   - You should see a terminal-style log display appear
   - Logs will update every 5 seconds showing deployment progress
   - Status will show each step: VPS creation → Setup → Docker → SSL → Migrations → Health Check

### Expected Behavior (Without TransIP API)

Since we don't have TransIP API credentials configured, the system will use **mock VPS creation**:

✅ **What Works**:
- Organization created in database
- Instance deployment record created
- Status tracking and logs working
- Portal UI shows real-time progress
- Mock VPS details returned (IP: 192.168.1.100)

⚠️ **What Doesn't Work** (until TransIP API configured):
- Actual VPS creation on TransIP
- SSH deployment to real VPS
- Docker container deployment
- SSL certificate generation
- Health checks

**Expected Flow**:
```
1. [10:30:00] Starting VPS provisioning for testco
2. [10:30:01] VPS created: testco-vps-1 (IP: 192.168.1.100)
3. [10:30:02] Waiting for VPS to be ready...
4. [10:30:05] VPS is ready, starting deployment
5. [10:30:06] Step 1/7: Setting up VPS
6. [10:30:07] ERROR: SSH connection failed (expected without real VPS)
7. Status: failed
8. Error: Could not connect to VPS at 192.168.1.100
```

This is **expected behavior** when testing without a real VPS. The important part is that:
- ✅ Portal UI accepts the form
- ✅ Backend creates organization and deployment record
- ✅ Status updates are tracked
- ✅ Logs are displayed in real-time
- ✅ Error handling works

---

## Testing with Real TransIP API (Production Setup)

Once you have TransIP API credentials, follow these steps:

### Step 1: Install TransIP API Client

```powershell
cd c:\RecruitIQ\backend
npm install @transip/transip-api-javascript
```

### Step 2: Configure TransIP Credentials

1. **Get TransIP API Key**:
   - Login to [TransIP Control Panel](https://www.transip.nl/cp/)
   - Navigate to: API → Generate API Key
   - Download private key file

2. **Update .env**:
   ```bash
   TRANSIP_USERNAME=your-transip-username
   TRANSIP_PRIVATE_KEY=C:\path\to\transip-private-key.pem
   ```

### Step 3: Configure Real SSH Key

```powershell
# Generate production SSH key
ssh-keygen -t ed25519 -f C:\secure\recruitiq-vps-key -N '""'

# Update .env
VPS_SSH_PRIVATE_KEY=C:\secure\recruitiq-vps-key
```

### Step 4: Test TransIP Connection

Create `test-transip.js` in backend:

```javascript
import { TransIPClient } from '@transip/transip-api-javascript';
import fs from 'fs';

const username = process.env.TRANSIP_USERNAME;
const privateKey = fs.readFileSync(process.env.TRANSIP_PRIVATE_KEY, 'utf-8');

const client = new TransIPClient({ username, privateKey });

async function test() {
  try {
    const vps = await client.vps.getAll();
    console.log('✅ TransIP connection successful!');
    console.log('Existing VPS:', vps);
  } catch (error) {
    console.error('❌ TransIP connection failed:', error.message);
  }
}

test();
```

Run:
```powershell
node test-transip.js
```

### Step 5: Update `transip.js` Service

Uncomment the real API implementation in `backend/src/services/transip.js`:

```javascript
// Replace mock implementation with real API calls
async createDedicatedVPS(specs) {
  const client = this.getClient();
  
  const vpsName = `${specs.organizationSlug}-vps-1`;
  
  // Real TransIP API call
  const vps = await client.vps.create({
    productName: specs.productName,
    hostname: `${vpsName}.recruitiq.nl`,
    description: `VPS for ${specs.organizationName}`,
    availabilityZone: specs.location || 'ams0'
  });
  
  return {
    vpsName: vps.name,
    ipAddress: vps.ipAddresses[0],
    hostname: vps.hostname,
    status: vps.status
  };
}
```

### Step 6: Test Full Provisioning Flow

Now repeat **Step 5** from the Quick Start section above. This time:

✅ **Real VPS will be created** on TransIP
✅ **SSH deployment will execute** (if VPS SSH is accessible)
✅ **Docker containers will start** on the VPS
✅ **SSL certificates will be obtained** via Let's Encrypt
✅ **Health checks will verify** all services running

**Expected Timeline**:
- VPS Creation: 30-60 seconds
- VPS Boot: 2-3 minutes
- Docker Setup: 1-2 minutes
- SSL Configuration: 30 seconds
- Migrations: 10 seconds
- Health Check: 10 seconds
- **Total: 3-5 minutes**

---

## Troubleshooting

### Issue: "Cannot find module '@transip/transip-api-javascript'"

**Solution:**
```powershell
cd backend
npm install @transip/transip-api-javascript
```

### Issue: "SSH connection refused"

**Causes:**
- VPS not fully booted yet
- SSH key not configured on VPS
- Firewall blocking port 22

**Solutions:**
1. Wait 30 seconds after VPS creation before SSH attempts
2. Add SSH public key via TransIP cloud-init script
3. Verify firewall allows port 22

### Issue: "Deployment stuck at 'provisioning'"

**Causes:**
- TransIP API rate limit
- VPS creation failed
- Polling timeout

**Solutions:**
1. Check TransIP control panel - verify VPS was created
2. Check backend logs: `backend/logs/combined.log`
3. Increase timeout in `transip.js` `waitForVPSReady` function

### Issue: "Docker containers won't start"

**Causes:**
- Insufficient RAM (choose higher tier)
- Environment variables missing
- Port conflicts

**Solutions:**
1. SSH to VPS: `ssh root@<vps-ip>`
2. Check Docker: `docker compose ps`
3. View logs: `docker compose logs backend`
4. Verify .env: `cat /opt/recruitiq/.env.production`

---

## Next Steps

Once basic provisioning is working:

1. **Test Shared Deployments**:
   - Create multiple organizations on the same VPS
   - Verify nginx routing between organizations

2. **Configure DNS**:
   - Add wildcard DNS: `*.recruitiq.nl` → TransIP nameservers
   - Test subdomain access: `https://testco.recruitiq.nl`

3. **Setup Email Service**:
   - Configure SMTP in .env
   - Implement email sending for admin credentials

4. **Implement Retry Logic**:
   - Add retry mechanism for failed deployments
   - Implement rollback capability

5. **Add Monitoring**:
   - Setup resource monitoring per VPS
   - Track deployment success/failure rates
   - Alert on VPS capacity issues

---

## Database Queries for Debugging

```sql
-- View all deployments
SELECT 
  id, 
  organization_id, 
  status, 
  status_message, 
  created_at 
FROM instance_deployments 
ORDER BY created_at DESC;

-- View deployment details
SELECT 
  d.*,
  o.name as org_name,
  o.slug as org_slug,
  v.vps_name,
  v.vps_ip
FROM instance_deployments d
JOIN organizations o ON d.organization_id = o.id
LEFT JOIN vps_instances v ON d.vps_id = v.id
WHERE d.id = 'deployment-uuid';

-- View all VPS instances
SELECT 
  vps_name, 
  vps_ip, 
  status, 
  current_organizations, 
  max_organizations,
  is_shared
FROM vps_instances
ORDER BY created_at DESC;

-- View organizations per VPS
SELECT 
  v.vps_name,
  v.vps_ip,
  COUNT(d.id) as deployed_orgs,
  v.max_organizations
FROM vps_instances v
LEFT JOIN instance_deployments d ON v.id = d.vps_id AND d.status = 'active'
GROUP BY v.id
ORDER BY deployed_orgs DESC;
```

---

## API Testing with curl

```powershell
# Create new deployment
curl -X POST http://localhost:3001/api/portal/instances `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_JWT_TOKEN" `
  -d '{
    "organizationName": "Test Company",
    "slug": "testco",
    "tier": "professional",
    "deploymentModel": "dedicated",
    "adminEmail": "admin@testco.com",
    "adminName": "Test Admin",
    "adminPassword": "SecurePassword123!"
  }'

# Get deployment status
curl http://localhost:3001/api/portal/instances/DEPLOYMENT_ID/status `
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get deployment logs
curl http://localhost:3001/api/portal/instances/DEPLOYMENT_ID/logs `
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Support

- **Documentation**: [PORTAL_VPS_PROVISIONING_COMPLETE.md](./PORTAL_VPS_PROVISIONING_COMPLETE.md)
- **Docker Guide**: [DOCKER_DEPLOYMENT_GUIDE.md](./DOCKER_DEPLOYMENT_GUIDE.md)
- **Backend Standards**: [docs/BACKEND_STANDARDS.md](./docs/BACKEND_STANDARDS.md)

---

**Last Updated**: January 19, 2025  
**Status**: Ready for Testing ✅
