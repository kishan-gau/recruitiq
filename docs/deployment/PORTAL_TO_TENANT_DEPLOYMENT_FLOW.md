# Portal-to-Tenant Deployment Architecture: API-Based Communication

**Date:** December 2, 2025  
**Status:** Architecture Documentation  
**Scenario:** Adding a new tenant to existing VPS with separate single-tenant instances

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Deployment Scenario: New Tenant on Existing VPS](#deployment-scenario)
4. [Communication Flow](#communication-flow)
5. [Implementation Details](#implementation-details)
6. [Security Considerations](#security-considerations)
7. [Alternative Approaches](#alternative-approaches)

---

## Overview

### The Communication Challenge

In a multi-product SaaS platform like RecruitIQ, we need bidirectional communication between:

1. **Portal (Platform Admin App)** - Central management console
2. **Tenant Apps** (RecruitIQ, Nexus, PayLinQ) - Customer-facing applications

### Communication Requirements

```
Portal → Tenant Apps:
├── Deployment commands (new tenant, updates, rollbacks)
├── Configuration changes (feature toggles, license updates)
├── Management operations (backup, restore, health checks)
└── Emergency actions (disable tenant, force logout)

Tenant Apps → Portal:
├── System logs and errors
├── Usage metrics and analytics
├── License validation requests
├── Health status reports
└── Deployment confirmations
```

---

## Architecture Patterns

### Pattern 1: Shared VPS with Multi-Tenant Backend (Current Implementation)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Shared VPS                               │
│  IP: 185.3.211.123                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              NGINX Reverse Proxy (Port 80/443)          │    │
│  │  - SSL Termination (Let's Encrypt)                      │    │
│  │  - Subdomain routing                                    │    │
│  │  - Request header injection                             │    │
│  └──────┬─────────────────┬─────────────────┬─────────────┘    │
│         │                 │                 │                    │
│  ┌──────▼─────┐    ┌──────▼─────┐   ┌──────▼─────┐           │
│  │ tenant1    │    │ tenant2    │   │ tenant3    │           │
│  │ *.nl       │    │ *.nl       │   │ *.nl       │           │
│  │ X-Org-Slug │    │ X-Org-Slug │   │ X-Org-Slug │           │
│  └──────┬─────┘    └──────┬─────┘   └──────┬─────┘           │
│         └──────────────────┴─────────────────┘                  │
│                            │                                     │
│  ┌─────────────────────────▼─────────────────────────────┐     │
│  │     Multi-Tenant Backend API (Port 3001)              │     │
│  │  - Single Node.js process                             │     │
│  │  - Tenant isolation by organization_id                │     │
│  │  - Dynamic product loading (Nexus, PayLinQ, etc.)    │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌───────────────────────────────────────────────────────┐     │
│  │     PostgreSQL Database (Port 5432)                   │     │
│  │  - Single database with multi-tenant schema          │     │
│  │  - organization_id on all tables                      │     │
│  │  - Row-level tenant isolation                         │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**✅ Advantages:**
- Cost-efficient (share resources)
- Easy to manage (single backend instance)
- Fast deployment (just add subdomain)
- Consistent updates (all tenants on same version)

**❌ Disadvantages:**
- Resource contention (tenants compete for CPU/RAM)
- Single point of failure (one backend crash affects all)
- Limited customization per tenant
- Scaling requires VPS upgrade

---

### Pattern 2: Shared VPS with Separate Docker Instances (Proposed Scenario)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Shared VPS                                   │
│  IP: 185.3.211.123                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              NGINX Reverse Proxy (Port 80/443)                │  │
│  │  - SSL Termination per subdomain                              │  │
│  │  - Subdomain → Backend port mapping                           │  │
│  └─────┬────────────────┬───────────────────┬───────────────────┘  │
│        │                │                   │                        │
│  ┌─────▼──────┐  ┌──────▼──────┐    ┌──────▼──────┐              │
│  │ tenant1.nl │  │ tenant2.nl  │    │ tenant3.nl  │              │
│  │ → :3001    │  │ → :3002     │    │ → :3003     │              │
│  └─────┬──────┘  └──────┬──────┘    └──────┬──────┘              │
│        │                │                   │                        │
│        │                │                   │                        │
│  ┌─────▼────────────────────────────────────────────────────────┐  │
│  │                   Docker Compose Network                      │  │
│  ├──────────────────┬─────────────────┬──────────────────────────┤  │
│  │                  │                 │                          │  │
│  │  ┌───────────┐   │  ┌───────────┐  │  ┌───────────┐         │  │
│  │  │ Backend 1 │   │  │ Backend 2 │  │  │ Backend 3 │         │  │
│  │  │ Port:3001 │   │  │ Port:3002 │  │  │ Port:3003 │         │  │
│  │  │ Org: T1   │   │  │ Org: T2   │  │  │ Org: T3   │         │  │
│  │  └─────┬─────┘   │  └─────┬─────┘  │  └─────┬─────┘         │  │
│  │        │         │        │         │        │               │  │
│  │  ┌─────▼─────┐   │  ┌─────▼─────┐  │  ┌─────▼─────┐         │  │
│  │  │ Frontend1 │   │  │ Frontend2 │  │  │ Frontend3 │         │  │
│  │  │ Port:5173 │   │  │ Port:5174 │  │  │ Port:5175 │         │  │
│  │  └─────┬─────┘   │  └─────┬─────┘  │  └─────┬─────┘         │  │
│  │        │         │        │         │        │               │  │
│  │  ┌─────▼─────┐   │  ┌─────▼─────┐  │  ┌─────▼─────┐         │  │
│  │  │ Postgres1 │   │  │ Postgres2 │  │  │ Postgres3 │         │  │
│  │  │ Port:5432 │   │  │ Port:5433 │  │  │ Port:5434 │         │  │
│  │  │ DB: tenant1│   │  │ DB: tenant2│  │  │ DB: tenant3│         │  │
│  │  └───────────┘   │  └───────────┘  │  └───────────┘         │  │
│  │                  │                 │                          │  │
│  └──────────────────┴─────────────────┴──────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Deployment Agent (Port 5001)                     │  │
│  │  - Receives commands from Portal                             │  │
│  │  - Manages Docker containers                                 │  │
│  │  - Reports status back to Portal                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**✅ Advantages:**
- **Better isolation** - Each tenant has own containers
- **Independent scaling** - Scale tenant containers individually
- **Custom configurations** - Different versions per tenant
- **Fault isolation** - One tenant crash doesn't affect others
- **Resource allocation** - Docker resource limits per tenant

**❌ Disadvantages:**
- **Higher resource usage** - Multiple backend/database instances
- **More complex management** - Multiple containers to monitor
- **Slower deployments** - Must provision full stack per tenant
- **Port management** - Need unique ports for each tenant

---

## Deployment Scenario

### Scenario: Add Tenant 4 to Existing VPS with 3 Tenants

**Given:**
- VPS at `185.3.211.123` already hosts 3 tenants
- Each tenant has separate Docker containers (Pattern 2)
- Portal at `portal.recruitiq.nl` manages all tenants
- Deployment-service handles infrastructure

**Goal:** Add `tenant4.recruitiq.nl` to the same VPS

---

### Step-by-Step Deployment Flow

#### Phase 1: Portal - License Creation & Approval

```
┌──────────────────────────────────────────────────────────────┐
│                    PORTAL (portal.recruitiq.nl)               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Admin creates license for new customer                   │
│     POST /api/admin/licenses                                 │
│     {                                                         │
│       "customerId": "cust-uuid",                             │
│       "tier": "professional",                                │
│       "products": ["nexus", "paylinq"],                      │
│       "expiresAt": "2026-12-31"                              │
│     }                                                         │
│                                                               │
│  2. License created with status: "pending_deployment"        │
│     - License key generated                                  │
│     - Customer record updated                                │
│                                                               │
│  3. Admin creates VPS provision request                      │
│     POST /api/vps-provision/requests                         │
│     {                                                         │
│       "customerId": "cust-uuid",                             │
│       "licenseId": "license-uuid",                           │
│       "deploymentModel": "shared",                           │
│       "vpsId": "existing-vps-uuid", ← Use existing VPS      │
│       "justification": "Add to existing VPS"                 │
│     }                                                         │
│                                                               │
│  4. Approver reviews and approves request                    │
│     POST /api/vps-provision/requests/:id/approve             │
│     {                                                         │
│       "comment": "Approved - sufficient capacity"            │
│     }                                                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Phase 2: Portal - Trigger Deployment via API

```
┌──────────────────────────────────────────────────────────────┐
│              PORTAL → DEPLOYMENT SERVICE                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Portal makes API call to deployment-service:                │
│                                                               │
│  POST http://185.3.211.123:5001/api/deployments/add-tenant  │
│  Authorization: Bearer <JWT_TOKEN>                           │
│  X-API-Key: <DEPLOYMENT_SERVICE_API_KEY>                     │
│  Content-Type: application/json                              │
│                                                               │
│  Request Body:                                               │
│  {                                                            │
│    "vpsId": "existing-vps-uuid",                            │
│    "tenantId": "tenant4-uuid",                              │
│    "organizationName": "Tenant 4 Corp",                     │
│    "organizationSlug": "tenant4",                           │
│    "customerId": "cust-uuid",                               │
│    "licenseId": "license-uuid",                             │
│    "licenseKey": "LICENSE-KEY-XXXXX",                       │
│    "tier": "professional",                                  │
│    "products": ["nexus", "paylinq"],                        │
│    "adminEmail": "admin@tenant4.com",                       │
│    "domain": "tenant4.recruitiq.nl",                        │
│    "ports": {                                               │
│      "backend": 3004,  ← Next available port                │
│      "frontend": 5176,                                      │
│      "postgres": 5435                                       │
│    }                                                         │
│  }                                                            │
│                                                               │
│  Response:                                                   │
│  {                                                            │
│    "success": true,                                         │
│    "deploymentId": "deploy-uuid",                           │
│    "status": "queued",                                      │
│    "estimatedTime": "5 minutes"                             │
│  }                                                            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Phase 3: Deployment Service - Execute on Target VPS

```
┌──────────────────────────────────────────────────────────────┐
│        DEPLOYMENT SERVICE (running on VPS at :5001)          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Receive deployment request in Bull Queue                 │
│     - Validate ports are available                           │
│     - Check VPS capacity (CPU, RAM, disk)                    │
│     - Generate docker-compose config                         │
│                                                               │
│  2. Create Docker Compose configuration                      │
│     File: /opt/recruitiq/tenant4/docker-compose.yml          │
│                                                               │
│     version: '3.8'                                           │
│     services:                                                │
│       backend-tenant4:                                       │
│         image: recruitiq/backend:latest                      │
│         container_name: backend-tenant4                      │
│         ports:                                               │
│           - "3004:3001"  # Map to internal port 3001         │
│         environment:                                         │
│           NODE_ENV: production                               │
│           DATABASE_URL: postgres://user:pass@postgres-t4:5432│
│           ORGANIZATION_ID: tenant4-uuid                      │
│           LICENSE_KEY: LICENSE-KEY-XXXXX                     │
│         networks:                                            │
│           - recruitiq-network                                │
│                                                               │
│       frontend-tenant4:                                      │
│         image: recruitiq/frontend:latest                     │
│         container_name: frontend-tenant4                     │
│         ports:                                               │
│           - "5176:80"                                        │
│         environment:                                         │
│           VITE_API_URL: https://tenant4.recruitiq.nl/api    │
│         networks:                                            │
│           - recruitiq-network                                │
│                                                               │
│       postgres-tenant4:                                      │
│         image: postgres:15-alpine                            │
│         container_name: postgres-tenant4                     │
│         ports:                                               │
│           - "5435:5432"                                      │
│         environment:                                         │
│           POSTGRES_DB: tenant4_db                            │
│           POSTGRES_USER: tenant4_user                        │
│           POSTGRES_PASSWORD: <generated_password>            │
│         volumes:                                             │
│           - tenant4-postgres-data:/var/lib/postgresql/data   │
│         networks:                                            │
│           - recruitiq-network                                │
│                                                               │
│     networks:                                                │
│       recruitiq-network:                                     │
│         external: true  # Shared with other tenants          │
│                                                               │
│     volumes:                                                 │
│       tenant4-postgres-data:                                 │
│                                                               │
│  3. Execute deployment steps                                 │
│     ✓ Pull Docker images                                     │
│     ✓ Create volumes                                         │
│     ✓ Start containers                                       │
│     ✓ Wait for health checks                                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Phase 4: Deployment Service - Configure NGINX

```
┌──────────────────────────────────────────────────────────────┐
│          DEPLOYMENT SERVICE - NGINX Configuration             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Generate NGINX configuration                             │
│     File: /etc/nginx/sites-available/tenant4.recruitiq.nl    │
│                                                               │
│     # Backend API (port 3004)                                │
│     server {                                                 │
│       listen 80;                                             │
│       listen 443 ssl http2;                                  │
│       server_name tenant4.recruitiq.nl;                      │
│                                                               │
│       ssl_certificate /etc/letsencrypt/live/tenant4/...;    │
│       ssl_certificate_key /etc/letsencrypt/live/tenant4/...;│
│                                                               │
│       location /api {                                        │
│         proxy_pass http://localhost:3004;                    │
│         proxy_set_header Host $host;                         │
│         proxy_set_header X-Real-IP $remote_addr;             │
│         proxy_set_header X-Organization-Slug tenant4;        │
│         proxy_set_header X-Forwarded-For $proxy_add_x_...;  │
│         proxy_set_header X-Forwarded-Proto $scheme;          │
│       }                                                       │
│                                                               │
│       location / {                                           │
│         proxy_pass http://localhost:5176;                    │
│         proxy_set_header Host $host;                         │
│         proxy_set_header X-Real-IP $remote_addr;             │
│       }                                                       │
│     }                                                         │
│                                                               │
│  2. Enable site and test configuration                       │
│     $ ln -s /etc/nginx/sites-available/tenant4... \         │
│               /etc/nginx/sites-enabled/                      │
│     $ nginx -t                                               │
│     $ systemctl reload nginx                                 │
│                                                               │
│  3. Obtain SSL certificate                                   │
│     $ certbot certonly --nginx \                             │
│         -d tenant4.recruitiq.nl \                            │
│         --non-interactive \                                  │
│         --agree-tos \                                        │
│         --email admin@recruitiq.nl                           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Phase 5: Deployment Service - Database Initialization

```
┌──────────────────────────────────────────────────────────────┐
│      DEPLOYMENT SERVICE - Database Initialization             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Wait for PostgreSQL container to be healthy              │
│     $ docker exec postgres-tenant4 pg_isready                │
│                                                               │
│  2. Run database migrations                                  │
│     $ docker exec backend-tenant4 \                          │
│         npm run migrate:latest                               │
│                                                               │
│     This creates:                                            │
│     - organizations table                                    │
│     - users table (with RBAC)                                │
│     - roles and permissions tables                           │
│     - product-specific tables (nexus, paylinq, etc.)         │
│     - audit tables                                           │
│                                                               │
│  3. Run tenant onboarding script                             │
│     $ docker exec backend-tenant4 \                          │
│         node scripts/onboard-tenant.js \                     │
│         --license-id=license-uuid \                          │
│         --customer-id=cust-uuid \                            │
│         --email=admin@tenant4.com \                          │
│         --name="Tenant 4 Corp" \                             │
│         --tier=professional \                                │
│         --products=nexus,paylinq                             │
│                                                               │
│     This creates:                                            │
│     ✓ Organization record (with slug: tenant4)               │
│     ✓ Admin user account                                     │
│     ✓ Default roles with permissions                         │
│     ✓ Worker types (HRIS) seed data                          │
│     ✓ Payroll run types (PayLinQ) seed data                  │
│     ✓ Pay components seed data                               │
│     ✓ Tax rules for country (SR/NL)                          │
│     ✓ Allowances and deductions                              │
│                                                               │
│     Output:                                                  │
│     ✅ TENANT ONBOARDING COMPLETED                           │
│     📊 SUMMARY:                                              │
│        Organization ID: tenant4-uuid                         │
│        Admin Email: admin@tenant4.com                        │
│        Temp Password: TempPass123!                           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Phase 6: Deployment Service - Health Verification

```
┌──────────────────────────────────────────────────────────────┐
│         DEPLOYMENT SERVICE - Health Check & Validation        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Check container health                                   │
│     $ docker ps | grep tenant4                               │
│     ✓ backend-tenant4   (healthy)                            │
│     ✓ frontend-tenant4  (healthy)                            │
│     ✓ postgres-tenant4  (healthy)                            │
│                                                               │
│  2. Test backend API                                         │
│     $ curl http://localhost:3004/health                      │
│     {                                                         │
│       "status": "healthy",                                   │
│       "database": "connected",                               │
│       "version": "2.0.0"                                     │
│     }                                                         │
│                                                               │
│  3. Test public HTTPS endpoint                               │
│     $ curl https://tenant4.recruitiq.nl/api/health           │
│     ✓ SSL certificate valid                                  │
│     ✓ Response received                                      │
│                                                               │
│  4. Test tenant isolation                                    │
│     $ curl https://tenant4.recruitiq.nl/api/auth/login \     │
│         -H "Content-Type: application/json" \                │
│         -d '{"email":"admin@tenant4.com","password":"..."}'  │
│     ✓ Login successful                                       │
│     ✓ Organization context correct                           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Phase 7: Deployment Service - Report Back to Portal

```
┌──────────────────────────────────────────────────────────────┐
│        DEPLOYMENT SERVICE → PORTAL (Status Callback)          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  POST https://portal.recruitiq.nl/api/deployments/callback   │
│  Authorization: Bearer <DEPLOYMENT_SERVICE_JWT>               │
│  Content-Type: application/json                              │
│                                                               │
│  Request Body:                                               │
│  {                                                            │
│    "deploymentId": "deploy-uuid",                            │
│    "status": "completed",                                    │
│    "vpsId": "existing-vps-uuid",                            │
│    "tenantId": "tenant4-uuid",                              │
│    "organizationId": "tenant4-org-uuid",                    │
│    "organizationSlug": "tenant4",                           │
│    "endpoints": {                                            │
│      "web": "https://tenant4.recruitiq.nl",                 │
│      "api": "https://tenant4.recruitiq.nl/api",             │
│      "backend_port": 3004,                                  │
│      "frontend_port": 5176                                  │
│    },                                                         │
│    "containers": {                                           │
│      "backend": "backend-tenant4",                           │
│      "frontend": "frontend-tenant4",                         │
│      "database": "postgres-tenant4"                          │
│    },                                                         │
│    "credentials": {                                          │
│      "adminEmail": "admin@tenant4.com",                      │
│      "tempPassword": "TempPass123!",                         │
│      "databaseUser": "tenant4_user",                         │
│      "databaseName": "tenant4_db"                            │
│    },                                                         │
│    "resources": {                                            │
│      "cpu_limit": "2 cores",                                │
│      "memory_limit": "4GB",                                 │
│      "disk_usage": "15GB"                                   │
│    },                                                         │
│    "health": {                                               │
│      "backend": "healthy",                                  │
│      "frontend": "healthy",                                 │
│      "database": "healthy",                                 │
│      "ssl": "valid",                                        │
│      "lastCheck": "2025-12-02T15:30:00Z"                   │
│    },                                                         │
│    "startedAt": "2025-12-02T15:25:00Z",                     │
│    "completedAt": "2025-12-02T15:30:00Z",                   │
│    "duration": "5 minutes"                                  │
│  }                                                            │
│                                                               │
│  Portal Action:                                              │
│  1. Update deployment record status → "completed"            │
│  2. Update license status → "active"                         │
│  3. Send welcome email to admin@tenant4.com                  │
│  4. Log deployment event for auditing                        │
│  5. Update VPS capacity tracking                             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Communication Flow

### Ongoing Communication After Deployment

#### Tenant → Portal: System Logs

```javascript
// backend/src/services/LogReporterService.js (runs on tenant VPS)

class LogReporterService {
  async sendLogBatch() {
    const logs = await this.collectLogs();
    
    try {
      await axios.post('https://portal.recruitiq.nl/api/tenant-logs', {
        tenantId: process.env.TENANT_ID,
        organizationSlug: process.env.ORG_SLUG,
        logs: logs.map(log => ({
          level: log.level,
          message: log.message,
          timestamp: log.timestamp,
          context: log.context,
          userId: log.userId,
          ip: log.ip
        }))
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.TENANT_API_KEY}`,
          'X-Tenant-Id': process.env.TENANT_ID
        }
      });
    } catch (error) {
      // Store locally if portal is unreachable
      await this.storeLogsLocally(logs);
    }
  }
  
  // Send logs every 5 minutes
  startReporter() {
    setInterval(() => this.sendLogBatch(), 5 * 60 * 1000);
  }
}
```

#### Portal → Tenant: Configuration Updates

```javascript
// portal/src/services/TenantManagementService.js

class TenantManagementService {
  async updateTenantFeatures(tenantId, features) {
    // Portal makes API call to tenant's backend
    const tenant = await this.getTenantByIdInternal(tenantId);
    
    try {
      await axios.post(`${tenant.apiUrl}/api/admin/features`, {
        features
      }, {
        headers: {
          'Authorization': `Bearer ${this.getPortalServiceToken()}`,
          'X-Portal-Admin': 'true'
        }
      });
      
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to update tenant features: ${error.message}`);
    }
  }
}
```

#### Tenant → Portal: License Validation

```javascript
// backend/src/middleware/licenseValidator.js (runs on tenant VPS)

async function validateLicense(req, res, next) {
  const licenseKey = process.env.LICENSE_KEY;
  
  try {
    // Call portal to validate license
    const response = await axios.post(
      'https://portal.recruitiq.nl/api/licenses/validate',
      {
        licenseKey,
        organizationId: req.user.organizationId,
        feature: req.feature, // e.g., 'payroll', 'recruitment'
        action: req.action    // e.g., 'create', 'export'
      },
      {
        headers: {
          'X-API-Key': process.env.TENANT_API_KEY
        }
      }
    );
    
    if (!response.data.valid) {
      return res.status(403).json({
        success: false,
        error: 'License validation failed',
        errorCode: 'LICENSE_INVALID',
        details: response.data.reason
      });
    }
    
    req.licenseInfo = response.data;
    next();
  } catch (error) {
    // Fallback: Use locally cached license for 24h
    const cached = await this.getCachedLicense(licenseKey);
    if (cached && !this.isExpired(cached, 24 * 60 * 60 * 1000)) {
      req.licenseInfo = cached;
      return next();
    }
    
    return res.status(503).json({
      success: false,
      error: 'License validation unavailable'
    });
  }
}
```

---

## Implementation Details

### 1. Deployment Service API Structure

```
deployment-service/
├── src/
│   ├── controllers/
│   │   ├── deploymentController.js     # Handles deployment requests
│   │   ├── tenantManagementController.js # Add/remove tenants
│   │   └── healthCheckController.js    # VPS health monitoring
│   ├── services/
│   │   ├── DockerService.js           # Docker operations
│   │   ├── NginxService.js            # NGINX configuration
│   │   ├── SSLService.js              # Certbot/Let's Encrypt
│   │   ├── DatabaseService.js         # PostgreSQL operations
│   │   └── PortManagementService.js   # Port allocation
│   ├── repositories/
│   │   └── DeploymentRepository.js    # Deployment state tracking
│   └── routes/
│       ├── deployments.js
│       └── tenants.js
```

### 2. Port Management Strategy

```javascript
// deployment-service/src/services/PortManagementService.js

class PortManagementService {
  constructor() {
    this.usedPorts = new Set();
    this.portRanges = {
      backend: { start: 3001, end: 3100 },
      frontend: { start: 5173, end: 5273 },
      database: { start: 5432, end: 5532 }
    };
  }
  
  async initializeUsedPorts() {
    // Scan existing containers
    const containers = await this.dockerService.listContainers();
    containers.forEach(container => {
      container.ports.forEach(port => {
        this.usedPorts.add(port.PublicPort);
      });
    });
  }
  
  allocatePortSet(tenantId) {
    const backend = this.findAvailablePort('backend');
    const frontend = this.findAvailablePort('frontend');
    const database = this.findAvailablePort('database');
    
    // Mark as used
    this.usedPorts.add(backend);
    this.usedPorts.add(frontend);
    this.usedPorts.add(database);
    
    // Save allocation
    this.saveAllocation(tenantId, { backend, frontend, database });
    
    return { backend, frontend, database };
  }
  
  findAvailablePort(type) {
    const range = this.portRanges[type];
    for (let port = range.start; port <= range.end; port++) {
      if (!this.usedPorts.has(port)) {
        return port;
      }
    }
    throw new Error(`No available ports in range for ${type}`);
  }
}
```

### 3. Resource Capacity Checking

```javascript
// deployment-service/src/services/CapacityService.js

class CapacityService {
  async checkVPSCapacity(vpsId) {
    // Get VPS specs
    const vps = await this.getVPSInfo(vpsId);
    const totalRAM = vps.memory; // e.g., 16GB
    const totalCPU = vps.cpuCores; // e.g., 4 cores
    const totalDisk = vps.diskSize; // e.g., 160GB
    
    // Get current usage
    const containers = await this.dockerService.listContainers();
    const currentRAM = this.sumContainerMemory(containers);
    const currentCPU = this.sumContainerCPU(containers);
    const currentDisk = await this.getDiskUsage();
    
    // Estimate new tenant requirements
    const tenantRAM = 4; // GB
    const tenantCPU = 1; // cores
    const tenantDisk = 20; // GB
    
    // Check if capacity available
    const hasCapacity = 
      (currentRAM + tenantRAM) < (totalRAM * 0.8) && // 80% max
      (currentCPU + tenantCPU) < (totalCPU * 0.9) && // 90% max
      (currentDisk + tenantDisk) < (totalDisk * 0.85); // 85% max
    
    return {
      hasCapacity,
      current: { ram: currentRAM, cpu: currentCPU, disk: currentDisk },
      available: {
        ram: totalRAM - currentRAM,
        cpu: totalCPU - currentCPU,
        disk: totalDisk - currentDisk
      },
      required: { ram: tenantRAM, cpu: tenantCPU, disk: tenantDisk }
    };
  }
}
```

### 4. Rollback on Failure

```javascript
// deployment-service/src/services/DeploymentService.js

class DeploymentService {
  async deployTenant(config) {
    const rollbackStack = [];
    
    try {
      // Step 1: Allocate ports
      const ports = await this.portService.allocatePortSet(config.tenantId);
      rollbackStack.push(() => this.portService.releasePorts(ports));
      
      // Step 2: Create Docker compose file
      await this.dockerService.createComposeFile(config, ports);
      rollbackStack.push(() => this.dockerService.deleteComposeFile(config.tenantId));
      
      // Step 3: Start containers
      await this.dockerService.startContainers(config.tenantId);
      rollbackStack.push(() => this.dockerService.stopAndRemoveContainers(config.tenantId));
      
      // Step 4: Configure NGINX
      await this.nginxService.createSiteConfig(config, ports);
      rollbackStack.push(() => this.nginxService.removeSiteConfig(config.domain));
      
      // Step 5: Obtain SSL
      await this.sslService.obtainCertificate(config.domain);
      rollbackStack.push(() => this.sslService.revokeCertificate(config.domain));
      
      // Step 6: Initialize database
      await this.databaseService.runMigrations(config.tenantId);
      rollbackStack.push(() => this.databaseService.dropDatabase(config.tenantId));
      
      // Step 7: Onboard tenant
      await this.databaseService.onboardTenant(config);
      
      // Success - clear rollback stack
      return {
        success: true,
        ports,
        endpoints: {
          web: `https://${config.domain}`,
          api: `https://${config.domain}/api`
        }
      };
      
    } catch (error) {
      // Rollback in reverse order
      console.error('Deployment failed, rolling back...');
      for (let i = rollbackStack.length - 1; i >= 0; i--) {
        try {
          await rollbackStack[i]();
        } catch (rollbackError) {
          console.error('Rollback step failed:', rollbackError);
        }
      }
      
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }
}
```

---

## Security Considerations

### 1. Service-to-Service Authentication

```javascript
// Portal and Deployment Service use mutual TLS or JWT

// Deployment Service authenticates to Portal
const portalToken = jwt.sign(
  {
    service: 'deployment-service',
    vpsId: process.env.VPS_ID,
    role: 'deployment_agent'
  },
  process.env.DEPLOYMENT_SERVICE_SECRET,
  { expiresIn: '1h', issuer: 'deployment-service' }
);

// Portal authenticates Deployment Service
function verifyDeploymentService(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.DEPLOYMENT_SERVICE_SECRET);
    
    if (decoded.service !== 'deployment-service') {
      throw new Error('Invalid service');
    }
    
    req.deploymentService = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Deployment service authentication failed'
    });
  }
}
```

### 2. Tenant API Keys

Each tenant gets a unique API key for Portal communication:

```javascript
// Generate tenant API key during deployment
const tenantApiKey = crypto.randomBytes(32).toString('hex');

// Store in tenant environment
// backend/src/.env
TENANT_API_KEY=<generated_key>
PORTAL_API_URL=https://portal.recruitiq.nl

// Portal validates tenant requests
function verifyTenantApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  const tenant = await Tenant.findByApiKey(apiKey);
  
  if (!tenant) {
    return res.status(401).json({
      success: false,
      error: 'Invalid tenant API key'
    });
  }
  
  req.tenant = tenant;
  next();
}
```

### 3. Network Isolation

```yaml
# docker-compose.yml - Network configuration

networks:
  # Public network - accessible from host
  recruitiq-public:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
  
  # Private tenant networks
  tenant1-private:
    driver: bridge
    internal: true  # No external access
  
  tenant2-private:
    driver: bridge
    internal: true

services:
  backend-tenant1:
    networks:
      - recruitiq-public  # For NGINX access
      - tenant1-private   # For database access
  
  postgres-tenant1:
    networks:
      - tenant1-private   # Isolated from other tenants
```

---

## Alternative Approaches

### Alternative 1: Message Queue (Async)

Instead of direct API calls, use a message queue:

```
┌─────────┐         ┌────────┐         ┌──────────────┐
│ Portal  │ ─push→  │ RabbitMQ│  ─pull→ │ Deployment   │
│         │         │ or Redis │         │ Service      │
└─────────┘         └────────┘         └──────────────┘
```

**Pros:**
- Decoupled architecture
- Better fault tolerance
- Can handle offline deployments
- Easy to scale

**Cons:**
- More infrastructure (RabbitMQ/Redis)
- Harder to debug
- No immediate feedback

### Alternative 2: Webhook Pattern

Deployment service polls Portal for pending deployments:

```javascript
// Deployment Service polls every 30 seconds
setInterval(async () => {
  const pending = await axios.get(
    'https://portal.recruitiq.nl/api/deployments/pending',
    { headers: { 'X-API-Key': SERVICE_API_KEY } }
  );
  
  for (const deployment of pending.data) {
    await this.execute(deployment);
  }
}, 30000);
```

**Pros:**
- Simple implementation
- No inbound firewall rules needed
- Works with NAT/firewalls

**Cons:**
- Polling overhead
- Delayed reaction (up to 30s)
- Wasted requests if nothing pending

### Alternative 3: SSH + Ansible/Terraform

Portal uses SSH to execute commands directly:

```javascript
const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('docker-compose up -d', (err, stream) => {
    // Handle output
  });
}).connect({
  host: vps.ipAddress,
  port: 22,
  username: 'deploy',
  privateKey: fs.readFileSync('/path/to/key')
});
```

**Pros:**
- Direct control
- No deployment service needed
- Can use Ansible playbooks

**Cons:**
- Security risk (SSH keys)
- No local state management
- Harder to rollback
- Requires SSH access

---

## Conclusion

### Recommended Approach: API-Based with Deployment Agent

For your scenario (separate instances on shared VPS), the **API-based approach with a Deployment Agent** is optimal:

**Why it works best:**

1. ✅ **Isolation** - Each tenant has separate containers
2. ✅ **Control** - Portal triggers deployments via secure API
3. ✅ **Monitoring** - Tenant apps report back to Portal
4. ✅ **Rollback** - Easy to rollback failed deployments
5. ✅ **Scalability** - Can add more tenants until capacity limit
6. ✅ **Security** - Service-to-service auth with JWT
7. ✅ **Flexibility** - Easy to deploy updates per tenant

**Key Components:**
- **Portal** - Central management + approval workflow
- **Deployment Service** - Runs on each VPS, handles local operations
- **API Communication** - Secure JWT-based service-to-service auth
- **Docker Compose** - Container orchestration per tenant
- **NGINX** - Reverse proxy + SSL termination
- **Port Management** - Automatic port allocation

**Deployment Flow Summary:**
1. Portal approves deployment request
2. Portal calls Deployment Service API
3. Deployment Service allocates ports
4. Deployment Service creates Docker containers
5. Deployment Service configures NGINX + SSL
6. Deployment Service initializes database
7. Deployment Service reports back to Portal
8. Tenant is live and accessible

This approach gives you the **best of both worlds**: isolation of separate instances with the cost-efficiency of shared infrastructure.

---

**Next Steps:**

1. Implement Deployment Service endpoints for tenant management
2. Add capacity checking before deployment
3. Implement rollback mechanism
4. Add monitoring and alerting
5. Document operational procedures
6. Test with staging environment first

