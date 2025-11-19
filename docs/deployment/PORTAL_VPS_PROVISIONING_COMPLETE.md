# Portal-Driven VPS Provisioning - Implementation Complete

## Overview

This document describes the **Portal-driven automatic VPS provisioning and deployment system** that allows platform administrators to provision new client instances from the Portal UI, automatically creating a TransIP VPS with all applications deployed and running.

---

## Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Portal UI (Admin Interface)                          │
│                    apps/portal/src/pages/infrastructure/                     │
│                         ClientProvisioning.jsx                               │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ POST /api/portal/instances
                                │ {organizationName, slug, tier, 
                                │  deploymentModel, adminEmail, ...}
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Backend API (Provisioning Route)                          │
│                    backend/src/routes/provisioning.js                        │
│  • Creates organization & admin user                                         │
│  • Creates instance_deployments record                                       │
│  • Calls createDedicatedVPSAsync for dedicated deployments                   │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ Async Workflow
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TransIP Service Layer                                 │
│                   backend/src/services/transip.js                            │
│  • createDedicatedVPS(specs) → VPS creation on TransIP                      │
│  • waitForVPSReady(vpsName) → Polls until VPS is running                    │
│  • Returns: {vpsName, ipAddress, hostname, status}                          │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ VPS Ready (IP assigned)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Deployment Orchestrator Service                           │
│              backend/src/services/deploymentOrchestrator.js                  │
│                                                                              │
│  Step 1: setupVPS(sshConfig)                                                │
│    • Install Docker, Docker Compose, nginx, certbot                         │
│    • Configure firewall (UFW): 80, 443, 22, 5432                           │
│    • Create deployment user and directories                                 │
│                                                                              │
│  Step 2: transferDeploymentFiles(sshConfig, config)                         │
│    • SCP docker-compose.production.yml to VPS                               │
│    • SCP Dockerfiles for all services                                       │
│    • SCP nginx configuration templates                                      │
│                                                                              │
│  Step 3: generateEnvFile(sshConfig, config)                                 │
│    • Generate .env.production with secrets                                  │
│    • JWT_SECRET, DB credentials, Redis password                            │
│    • Product-specific environment variables                                 │
│                                                                              │
│  Step 4: startDockerServices(sshConfig)                                     │
│    • docker compose pull (download images)                                  │
│    • docker compose up -d (start all containers)                            │
│    • Services: postgres, redis, backend, portal, nexus, paylinq, recruitiq │
│                                                                              │
│  Step 5: configureDomainSSL(sshConfig, config)                              │
│    • Configure nginx for subdomain routing                                  │
│    • Obtain Let's Encrypt SSL certificates                                  │
│    • Auto-renewal setup via certbot                                         │
│                                                                              │
│  Step 6: runMigrations(sshConfig, config)                                   │
│    • Wait for PostgreSQL to be ready                                        │
│    • Run database migrations in backend container                           │
│    • Verify schema initialization                                           │
│                                                                              │
│  Step 7: performHealthCheck(sshConfig, config)                              │
│    • Check all Docker containers running                                    │
│    • Verify PostgreSQL, Redis, backend API                                  │
│    • Test HTTPS endpoint accessibility                                      │
│    • Confirm SSL certificate validity                                       │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ Deployment Complete
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Database Status Updates                                 │
│              instance_deployments table (status tracking)                    │
│  • Status: provisioning → vps_ready → deploying → active                   │
│  • access_url: https://{slug}.recruitiq.nl                                  │
│  • status_message: Real-time deployment progress                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                │ Real-time Status Polling
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                Portal UI Status Display (Live Logs)                          │
│  • Polls GET /api/portal/instances/:deploymentId/status every 5s           │
│  • Displays deployment logs in terminal-style interface                     │
│  • Shows admin credentials on completion                                    │
│  • Links to deployed application URL                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Portal Frontend (ClientProvisioning.jsx)

**Location:** `apps/portal/src/pages/infrastructure/ClientProvisioning.jsx`

**Features:**
- **Deployment Model Selection**: Shared vs. Dedicated VPS
- **Tier Selection**: Starter, Professional, Enterprise
- **VPS Selection**: Dropdown for shared deployments
- **Admin User Creation**: Email, name, password for initial admin
- **Real-time Status Polling**: Polls deployment status every 5 seconds
- **Live Deployment Logs**: Terminal-style display of deployment progress
- **Credential Display**: Shows admin credentials on completion

**Key Code:**
```javascript
const startStatusPolling = (deploymentId) => {
  const interval = setInterval(async () => {
    const response = await axios.get(`/api/portal/instances/${deploymentId}/status`);
    const status = response.data;
    
    if (status.logs) {
      setDeploymentLogs(status.logs); // Real-time log updates
    }
    
    if (status.status === 'active') {
      clearInterval(interval);
      setDeploymentStatus({ type: 'success', message: 'Deployment complete!' });
    }
  }, 5000);
};
```

---

### 2. Backend Provisioning Route

**Location:** `backend/src/routes/provisioning.js`

**Endpoints:**
- `POST /api/portal/instances` - Create new client instance
- `GET /api/portal/instances/:deploymentId/status` - Get deployment status + logs
- `GET /api/portal/instances/:deploymentId/logs` - Get real-time deployment logs
- `GET /api/portal/vps` - List available VPS instances
- `GET /api/portal/vps/:id/organizations` - List organizations on VPS

**Key Features:**
- **Organization Creation**: Creates organization, admin user, and instance deployment record
- **Dedicated VPS Workflow**: Calls `createDedicatedVPSAsync` for dedicated deployments
- **Shared VPS Workflow**: Assigns to existing VPS with capacity
- **Status Tracking**: Updates instance_deployments table throughout deployment
- **Log Retrieval**: Returns in-memory deployment logs via API

**Key Code:**
```javascript
async function createDedicatedVPSAsync(deploymentId, config) {
  try {
    // Step 1: Create VPS on TransIP
    const vpsDetails = await transipService.createDedicatedVPS(specs);
    await updateDeploymentStatus(deploymentId, 'vps_ready', 'VPS created');
    
    // Step 2: Wait for VPS to be ready
    await transipService.waitForVPSReady(vpsDetails.vpsName);
    
    // Step 3: Deploy applications via orchestrator
    await deploymentOrchestrator.deployToVPS({
      deploymentId,
      vpsIp: vpsDetails.ipAddress,
      organizationId: config.organizationId,
      // ... other config
    });
    
    await updateDeploymentStatus(deploymentId, 'active', 'Deployment complete');
  } catch (error) {
    await updateDeploymentStatus(deploymentId, 'failed', error.message);
  }
}
```

---

### 3. TransIP Service Layer

**Location:** `backend/src/services/transip.js`

**Functions:**
- `getVPSSpecs(tier)` - Returns TransIP product name (bladevps-x2/x4/x8)
- `createDedicatedVPS(specs)` - Creates VPS via TransIP API
- `waitForVPSReady(vpsName, timeout)` - Polls VPS status until ready (5-minute timeout)
- `getCloudInitScript(config)` - Generates cloud-init script for VPS setup

**Current State:**
- ⚠️ **Mocked API calls** - Returns placeholder data until TransIP credentials configured
- Ready for real API integration when credentials available

**Key Code:**
```javascript
async waitForVPSReady(vpsName, maxWaitTime = 300000) {
  const startTime = Date.now();
  const pollInterval = 10000; // 10 seconds
  
  while (Date.now() - startTime < maxWaitTime) {
    const status = await this.getVPSStatus(vpsName);
    
    if (status === 'running') {
      logger.info(`VPS ${vpsName} is ready`);
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`VPS ${vpsName} did not become ready within ${maxWaitTime}ms`);
}
```

**Required Environment Variables:**
```bash
TRANSIP_USERNAME=your-username
TRANSIP_PRIVATE_KEY=path/to/private-key.pem
```

**Installation Required:**
```bash
npm install @transip/transip-api-javascript
```

---

### 4. Deployment Orchestrator

**Location:** `backend/src/services/deploymentOrchestrator.js`

**Architecture:**
- **7-Step Deployment Process**: Each step is idempotent and logged
- **SSH/SCP Integration**: Uses child_process.exec for remote execution
- **In-Memory Logging**: Tracks deployment progress for real-time UI updates
- **Database Status Updates**: Updates instance_deployments table at each step

**Deployment Steps:**

#### Step 1: Setup VPS
```javascript
setupVPS(sshConfig) {
  // Install Docker, Docker Compose, nginx, certbot
  // Configure firewall (UFW): ports 80, 443, 22, 5432
  // Create deployment user and directories
  // Generate SSH keys for GitHub access (if needed)
}
```

#### Step 2: Transfer Files
```javascript
transferDeploymentFiles(sshConfig, config) {
  // SCP docker-compose.production.yml
  // SCP backend/Dockerfile
  // SCP apps/*/Dockerfile for all frontend apps
  // SCP nginx configuration templates
}
```

#### Step 3: Generate Environment
```javascript
generateEnvFile(sshConfig, config) {
  // Generate secrets: JWT_SECRET, DB password, Redis password
  // Create .env.production with all required variables
  // Product-specific environment variables
  // Database connection strings
}
```

#### Step 4: Start Docker Services
```javascript
startDockerServices(sshConfig) {
  // docker compose pull (download images)
  // docker compose up -d (start containers)
  // Services: postgres, redis, backend, portal, nexus, paylinq, recruitiq
  // Verify all containers started successfully
}
```

#### Step 5: Configure SSL
```javascript
configureDomainSSL(sshConfig, config) {
  // Configure nginx for subdomain routing
  // Obtain Let's Encrypt SSL certificates via certbot
  // Setup auto-renewal (certbot renew --dry-run)
  // Reload nginx to apply SSL configuration
}
```

#### Step 6: Run Migrations
```javascript
runMigrations(sshConfig, config) {
  // Wait for PostgreSQL container to be ready
  // Execute: docker exec backend-container npm run migrate
  // Verify migrations completed successfully
  // Log migration results
}
```

#### Step 7: Health Check
```javascript
performHealthCheck(sshConfig, config) {
  // Check all Docker containers running (docker ps)
  // Verify PostgreSQL connection
  // Verify Redis connection
  // Test backend API endpoint (GET /api/health)
  // Test HTTPS endpoint (https://{slug}.recruitiq.nl)
  // Confirm SSL certificate validity
}
```

**Key Features:**
- **Error Handling**: Detailed error messages with step context
- **Logging**: All commands logged with timestamps
- **Secret Generation**: Cryptographically secure random secrets
- **Status Updates**: Database updates at each step
- **SSH Key Management**: Supports environment variable or file-based SSH keys

**Required Environment Variables:**
```bash
VPS_SSH_PRIVATE_KEY=/path/to/ssh/private/key
DOCKER_REGISTRY_USERNAME=your-docker-username  # Optional
DOCKER_REGISTRY_PASSWORD=your-docker-password  # Optional
```

---

## Database Schema

### `instance_deployments` Table

```sql
CREATE TABLE instance_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  deployment_type VARCHAR(20) NOT NULL,  -- 'shared' or 'dedicated'
  tier VARCHAR(50) NOT NULL,             -- 'starter', 'professional', 'enterprise'
  status VARCHAR(50) NOT NULL,           -- 'provisioning', 'vps_ready', 'deploying', 'active', 'failed'
  status_message TEXT,                   -- Real-time status updates
  access_url TEXT,                       -- https://{slug}.recruitiq.nl
  vps_id UUID REFERENCES vps_instances(id),
  assigned_subdomain VARCHAR(100),
  error_message TEXT,                    -- Error details if failed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `vps_instances` Table

```sql
CREATE TABLE vps_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vps_name VARCHAR(100) NOT NULL UNIQUE,
  vps_ip VARCHAR(50) NOT NULL,
  vps_hostname VARCHAR(255),
  location VARCHAR(100),
  product_name VARCHAR(100),             -- 'bladevps-x2', 'bladevps-x4', 'bladevps-x8'
  specs JSONB,                           -- {cpu, ram, disk, bandwidth}
  status VARCHAR(50) NOT NULL,           -- 'active', 'provisioning', 'terminated'
  is_shared BOOLEAN DEFAULT false,
  current_organizations INTEGER DEFAULT 0,
  max_organizations INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Configuration

### Backend Environment Variables (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/recruitiq
DATABASE_NAME=recruitiq
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password

# JWT
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRES_IN=24h

# TransIP API (REQUIRED for production)
TRANSIP_USERNAME=your-transip-username
TRANSIP_PRIVATE_KEY=/path/to/transip-private-key.pem

# SSH Access for VPS (REQUIRED for deployment)
VPS_SSH_PRIVATE_KEY=/path/to/ssh/private/key
VPS_SSH_USER=root

# Docker Registry (Optional)
DOCKER_REGISTRY_USERNAME=your-docker-username
DOCKER_REGISTRY_PASSWORD=your-docker-password

# Email Service (Optional - for sending credentials)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Domain Configuration
BASE_DOMAIN=recruitiq.nl
```

---

## Testing

### Manual Testing Flow

1. **Access Portal UI**:
   ```
   http://localhost:5173/infrastructure/provisioning
   ```

2. **Fill Provisioning Form**:
   - Organization Name: "Test Company"
   - Slug: "testco"
   - Deployment Model: "Dedicated VPS"
   - Tier: "Professional"
   - Admin Email: "admin@testco.com"
   - Admin Password: (auto-generated or manual)

3. **Submit Form**:
   - Portal sends POST to `/api/portal/instances`
   - Watch real-time deployment logs appear
   - Status updates every 5 seconds

4. **Expected Timeline**:
   - VPS Creation: 30-60 seconds
   - VPS Ready Wait: 2-3 minutes
   - Docker Setup: 1-2 minutes
   - SSL Configuration: 30 seconds
   - Migrations: 10 seconds
   - Health Check: 10 seconds
   - **Total: 3-5 minutes**

5. **Completion**:
   - Status changes to "active"
   - Admin credentials displayed
   - Access URL shown: `https://testco.recruitiq.nl`

### Testing Without TransIP API

For testing without TransIP credentials:

1. **Create Mock VPS Manually**:
   ```sql
   INSERT INTO vps_instances (vps_name, vps_ip, vps_hostname, location, product_name, status, is_shared)
   VALUES ('test-vps-1', '192.168.1.100', 'test-vps-1.recruitiq.nl', 'Amsterdam', 'bladevps-x4', 'active', false);
   ```

2. **Comment Out TransIP Calls in `provisioning.js`**:
   ```javascript
   // Skip VPS creation for testing
   // const vpsDetails = await transipService.createDedicatedVPS(specs);
   const vpsDetails = { vpsName: 'test-vps-1', ipAddress: '192.168.1.100' };
   ```

3. **Test Deployment Orchestrator Directly**:
   ```javascript
   await deploymentOrchestrator.deployToVPS({
     deploymentId: 'test-deployment-id',
     vpsIp: '192.168.1.100',
     organizationId: 'test-org-id',
     slug: 'testco',
     tier: 'professional',
     sshKey: process.env.VPS_SSH_PRIVATE_KEY
   });
   ```

---

## Production Deployment Checklist

### Prerequisites

- [ ] TransIP account created
- [ ] TransIP API credentials generated (username + private key)
- [ ] SSH key pair generated for VPS access
- [ ] Domain DNS configured (recruitiq.nl → TransIP nameservers)
- [ ] Docker Hub account (if using private registry)
- [ ] Email SMTP credentials (for credential delivery)

### Configuration Steps

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install @transip/transip-api-javascript
   ```

2. **Configure Environment Variables**:
   ```bash
   # Copy .env.example to .env
   cp .env.example .env
   
   # Edit .env with production values
   nano .env
   ```

3. **Generate SSH Key for VPS Access**:
   ```bash
   ssh-keygen -t ed25519 -C "recruitiq-deployment" -f ~/.ssh/recruitiq_vps_key
   
   # Add to environment
   echo "VPS_SSH_PRIVATE_KEY=$(cat ~/.ssh/recruitiq_vps_key)" >> .env
   ```

4. **Configure TransIP API**:
   - Download private key from TransIP control panel
   - Save to secure location: `/etc/recruitiq/transip-key.pem`
   - Set environment variables:
     ```bash
     TRANSIP_USERNAME=your-username
     TRANSIP_PRIVATE_KEY=/etc/recruitiq/transip-key.pem
     ```

5. **Test TransIP Connection**:
   ```javascript
   const transip = require('@transip/transip-api-javascript');
   const client = new transip.TransIPClient({ username, privateKey });
   const vps = await client.vps.getAll();
   console.log(vps); // Should list existing VPS instances
   ```

6. **Configure DNS Wildcard**:
   - Add DNS A record: `*.recruitiq.nl` → `[TransIP nameserver IP]`
   - Verify: `nslookup testco.recruitiq.nl`

7. **Test Deployment Flow**:
   - Use staging domain first: `*.staging.recruitiq.nl`
   - Create test organization
   - Monitor logs in Portal UI
   - Verify HTTPS certificate obtained
   - Test all applications accessible

### Security Considerations

- **SSH Keys**: Store in secure location with restricted permissions (chmod 600)
- **TransIP API Key**: Never commit to version control, use environment variables
- **Admin Credentials**: Send via secure email, prompt user to change on first login
- **Firewall Rules**: Ensure only ports 80, 443, 22 open on VPS
- **SSL Certificates**: Auto-renewed via Let's Encrypt, monitor expiry
- **Database Passwords**: Generate cryptographically secure random passwords (32+ chars)

---

## Monitoring & Observability

### Deployment Logs

**Real-time Logs via API**:
```bash
# Get deployment status
GET /api/portal/instances/:deploymentId/status

# Response
{
  "status": "deploying",
  "status_message": "Step 4/7: Starting Docker services",
  "logs": [
    { "timestamp": "2025-01-19T10:30:00Z", "message": "VPS created: test-vps-1" },
    { "timestamp": "2025-01-19T10:31:30Z", "message": "VPS ready, starting deployment" },
    { "timestamp": "2025-01-19T10:32:00Z", "message": "Step 1/7: Setting up VPS" }
  ]
}
```

### Health Check Endpoints

**VPS Health Check** (deployed on each VPS):
```bash
# Backend health
GET https://testco.recruitiq.nl/api/health

# Response
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "version": "1.0.0",
  "uptime": 3600
}
```

### Error Tracking

**Deployment Failures**:
- Status set to `'failed'` in instance_deployments
- `error_message` field contains full error details
- Logs available via `/instances/:deploymentId/logs`
- Portal UI displays error message to admin

**Common Failure Points**:
1. **VPS Creation Timeout**: TransIP API slow or quota exceeded
2. **SSH Connection Failed**: Incorrect SSH key or VPS not ready
3. **Docker Image Pull Failed**: Network issue or invalid registry credentials
4. **SSL Certificate Failed**: Let's Encrypt rate limit or DNS not configured
5. **Database Migration Failed**: Invalid migration scripts or schema conflict

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Portal UI for provisioning
- ✅ TransIP VPS creation (mocked, ready for API)
- ✅ Deployment orchestrator with 7-step process
- ✅ Real-time status polling and logs
- ✅ SSH-based remote deployment

### Phase 2 (Next)
- [ ] TransIP API integration (requires credentials)
- [ ] Email service for credential delivery
- [ ] Retry mechanism for failed deployments
- [ ] Rollback capability
- [ ] Multi-region VPS support (Europe, US, Asia)

### Phase 3 (Future)
- [ ] Auto-scaling: Add VPS when capacity reached
- [ ] Load balancing: Distribute traffic across multiple VPS
- [ ] Monitoring dashboard: CPU, RAM, disk usage per VPS
- [ ] Automated backups: Daily snapshots of VPS and databases
- [ ] Blue-green deployments: Zero-downtime updates
- [ ] Cost tracking: Show per-organization infrastructure costs

### Phase 4 (Advanced)
- [ ] Kubernetes migration: Replace Docker Compose with K8s
- [ ] CDN integration: CloudFlare or AWS CloudFront
- [ ] Database replication: Multi-region PostgreSQL clusters
- [ ] Disaster recovery: Automated failover to backup VPS
- [ ] Custom domain support: Clients can use their own domains
- [ ] Resource quotas: CPU/RAM limits per organization

---

## Troubleshooting

### Issue: VPS Creation Times Out

**Symptoms**: Status stuck at "provisioning", never reaches "vps_ready"

**Causes**:
- TransIP API rate limit exceeded
- TransIP quota reached (max VPS instances)
- Network connectivity issue between backend and TransIP API

**Solutions**:
1. Check TransIP control panel: Verify VPS was created
2. Check backend logs: Look for TransIP API errors
3. Increase timeout: Modify `waitForVPSReady` timeout to 10 minutes
4. Manual intervention: Manually register VPS in database:
   ```sql
   INSERT INTO vps_instances (vps_name, vps_ip, status)
   VALUES ('manual-vps-1', '203.0.113.10', 'active');
   ```

### Issue: SSH Connection Failed

**Symptoms**: Deployment fails at Step 1 with "SSH connection refused"

**Causes**:
- VPS not fully booted (SSH daemon not started)
- Incorrect SSH key in environment variable
- Firewall blocking SSH port 22

**Solutions**:
1. Wait longer: Add 30-second delay before first SSH attempt
2. Verify SSH key: Test SSH manually from backend server
   ```bash
   ssh -i $VPS_SSH_PRIVATE_KEY root@192.168.1.100
   ```
3. Check firewall: Ensure port 22 open on VPS
4. Use cloud-init: Add SSH key via TransIP cloud-init script

### Issue: Docker Containers Won't Start

**Symptoms**: Step 4 fails with "docker compose up" errors

**Causes**:
- Insufficient RAM on VPS (choose higher tier)
- Docker images not accessible (registry credentials)
- Port conflicts (another service using 80/443)

**Solutions**:
1. Check VPS resources: Verify at least 4GB RAM available
2. Test Docker manually: SSH to VPS and run `docker compose up` manually
3. Check logs: `docker compose logs backend`
4. Verify environment: Ensure .env.production has all required variables

### Issue: SSL Certificate Fails

**Symptoms**: Step 5 fails with "certbot certificate request failed"

**Causes**:
- DNS not propagated (*.recruitiq.nl not pointing to VPS IP)
- Let's Encrypt rate limit reached (5 certs per week per domain)
- Port 80 not accessible (firewall blocking)

**Solutions**:
1. Verify DNS: `nslookup testco.recruitiq.nl` should return VPS IP
2. Wait for DNS propagation: Can take up to 24 hours
3. Use staging: Test with `--staging` flag first
4. Manual certificate: Obtain certificate via TransIP control panel

### Issue: Health Check Fails

**Symptoms**: Step 7 fails with "backend not responding"

**Causes**:
- Database migrations not completed (backend waiting for DB)
- Environment variables missing (backend crashes on startup)
- nginx misconfigured (reverse proxy not routing to backend)

**Solutions**:
1. Check backend logs: `docker compose logs backend`
2. Verify database: `docker compose exec postgres psql -U postgres -l`
3. Test backend directly: `curl http://localhost:3001/api/health` (from VPS)
4. Check nginx: `nginx -t` to verify configuration syntax

---

## API Reference

### POST /api/portal/instances

Creates a new client instance with VPS provisioning and deployment.

**Request:**
```json
{
  "organizationName": "Acme Corp",
  "slug": "acme",
  "tier": "professional",
  "deploymentModel": "dedicated",
  "vpsId": null,
  "adminEmail": "admin@acme.com",
  "adminName": "John Doe",
  "adminPassword": "SecurePassword123!"
}
```

**Response (202 Accepted):**
```json
{
  "message": "Dedicated VPS provisioning initiated",
  "organization": {
    "id": "org-uuid",
    "name": "Acme Corp",
    "slug": "acme"
  },
  "deployment": {
    "id": "deployment-uuid",
    "status": "provisioning",
    "tier": "professional"
  },
  "deploymentId": "deployment-uuid"
}
```

### GET /api/portal/instances/:deploymentId/status

Retrieves current deployment status and logs.

**Response:**
```json
{
  "id": "deployment-uuid",
  "organization_id": "org-uuid",
  "status": "deploying",
  "status_message": "Step 4/7: Starting Docker services",
  "access_url": null,
  "logs": [
    { "timestamp": "2025-01-19T10:30:00Z", "message": "VPS created" },
    { "timestamp": "2025-01-19T10:32:00Z", "message": "Step 1/7: Setting up VPS" }
  ],
  "created_at": "2025-01-19T10:30:00Z",
  "updated_at": "2025-01-19T10:32:15Z"
}
```

### GET /api/portal/instances/:deploymentId/logs

Retrieves real-time deployment logs.

**Response:**
```json
{
  "deploymentId": "deployment-uuid",
  "logs": [
    { "timestamp": "2025-01-19T10:30:00Z", "message": "VPS created: acme-vps-1" },
    { "timestamp": "2025-01-19T10:31:30Z", "message": "VPS ready, IP: 203.0.113.10" },
    { "timestamp": "2025-01-19T10:32:00Z", "message": "Step 1/7: Setting up VPS" },
    { "timestamp": "2025-01-19T10:32:45Z", "message": "Docker installed successfully" }
  ]
}
```

---

## Related Documentation

- [DOCKER_DEPLOYMENT_GUIDE.md](./DOCKER_DEPLOYMENT_GUIDE.md) - Docker Compose production setup
- [NGROK_BACKEND_SETUP.md](./NGROK_BACKEND_SETUP.md) - Local development setup
- [SSO_LOCALHOST_SETUP.md](./SSO_LOCALHOST_SETUP.md) - SSO testing locally
- [Backend Standards](./docs/BACKEND_STANDARDS.md) - Backend architecture guidelines
- [API Standards](./docs/API_STANDARDS.md) - API design guidelines

---

## Support & Contact

For issues or questions:
- GitHub Issues: [RecruitIQ Issues](https://github.com/your-org/recruitiq/issues)
- Documentation: [RecruitIQ Docs](https://docs.recruitiq.nl)
- Email: support@recruitiq.nl

---

**Document Version**: 1.0  
**Last Updated**: January 19, 2025  
**Status**: ✅ Implementation Complete (Pending TransIP API Integration)
