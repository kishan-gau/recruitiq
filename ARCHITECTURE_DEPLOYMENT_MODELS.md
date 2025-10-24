# RecruitIQ Deployment Models Architecture
**Date:** October 24, 2025  
**Version:** 1.0  
**Purpose:** Configuration strategies for three deployment scenarios

---

## Overview

RecruitIQ will support three distinct deployment models, each with specific architectural considerations:

1. **Multi-Tenant Cloud (SaaS)** - Shared infrastructure, cost-effective, fastest to deploy
2. **Single-Tenant Cloud (Dedicated)** - Isolated cloud instance, better control, enterprise-grade
3. **On-Premise (Self-Hosted)** - Customer infrastructure, maximum control, data sovereignty

This document outlines the architecture adaptations required for each model.

---

## Deployment Model Comparison

| Feature | Multi-Tenant SaaS | Single-Tenant Cloud | On-Premise |
|---------|-------------------|---------------------|------------|
| **Infrastructure** | Shared servers | Dedicated servers | Customer servers |
| **Database** | Shared (row-level security) | Dedicated DB instance | Customer DB |
| **Scalability** | Automatic | Configurable | Manual |
| **Updates** | Automatic | Scheduled | Manual |
| **Data Isolation** | Logical (DB rows) | Physical (separate DB) | Physical |
| **Customization** | Limited | Moderate | High |
| **Cost** | Lowest | Medium | Highest |
| **Setup Time** | Instant | 1-2 hours | 1-2 days |
| **Maintenance** | You manage | You manage | Customer manages |
| **License Validation** | Real-time (API) | Periodic check (API) | Offline (.lic file) |
| **Billing** | Automatic (Stripe) | Invoice/API | One-time/Annual |
| **Support** | Self-service + email | Priority email | Dedicated support |

---

## Model 1: Multi-Tenant Cloud (SaaS)

### Architecture Diagram
```
┌────────────────────────────────────────────────────────────┐
│                    recruitiq.com (SaaS)                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Load       │  │   Load       │  │   Load       │    │
│  │  Balancer    │  │  Balancer    │  │  Balancer    │    │
│  │  (HAProxy)   │  │  (HAProxy)   │  │  (HAProxy)   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │             │
│  ┌──────▼─────────────────▼─────────────────▼──────┐     │
│  │        App Servers (Auto-scaled)                 │     │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │     │
│  │  │ Node.js │ │ Node.js │ │ Node.js │ │  ...   │ │     │
│  │  │  API 1  │ │  API 2  │ │  API 3  │ │        │ │     │
│  │  └─────────┘ └─────────┘ └─────────┘ └────────┘ │     │
│  └──────────────────┬───────────────────────────────┘     │
│                     │                                      │
│  ┌──────────────────▼───────────────────────────────┐     │
│  │          Redis Cluster (Sessions/Cache)          │     │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │     │
│  │  │ Master  │ │ Replica │ │ Replica │            │     │
│  │  └─────────┘ └─────────┘ └─────────┘            │     │
│  └──────────────────┬───────────────────────────────┘     │
│                     │                                      │
│  ┌──────────────────▼───────────────────────────────┐     │
│  │    PostgreSQL (Multi-Tenant with RLS)            │     │
│  │  ┌─────────────────────────────────────────┐     │     │
│  │  │  organizations (Org A, Org B, Org C)    │     │     │
│  │  │  ├── workspaces (segregated by org_id)  │     │     │
│  │  │  ├── users (segregated by org_id)       │     │     │
│  │  │  ├── jobs (via workspace → org)         │     │     │
│  │  │  └── candidates (via workspace → org)   │     │     │
│  │  └─────────────────────────────────────────┘     │     │
│  │                                                   │     │
│  │  Read Replicas: ┌──────┐ ┌──────┐               │     │
│  │                 │Replica││Replica│               │     │
│  │                 └──────┘ └──────┘               │     │
│  └───────────────────────────────────────────────────┘     │
│                                                            │
│  ┌──────────────────────────────────────────────────┐     │
│  │          S3 (File Storage - segregated)          │     │
│  │  org_acme/resumes/...                            │     │
│  │  org_techstart/resumes/...                       │     │
│  └──────────────────────────────────────────────────┘     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Key Features

**1. Tenant Isolation Strategy**
```javascript
// Middleware: Extract tenant from JWT
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // Set organization context for all queries
  req.organizationId = decoded.organizationId;
  
  // Set PostgreSQL session variable for RLS
  await db.query(`SET app.current_organization_id = '${req.organizationId}'`);
  
  next();
});

// All queries automatically filtered by RLS
const jobs = await db.query('SELECT * FROM jobs'); // Only returns jobs for current org
```

**2. Database Row-Level Security**
```sql
-- Automatic filtering at database level
CREATE POLICY org_isolation ON jobs
  USING (workspace_id IN (
    SELECT id FROM workspaces 
    WHERE organization_id = current_setting('app.current_organization_id')::VARCHAR
  ));
```

**3. File Storage Isolation**
```javascript
// S3 bucket structure
const getStoragePath = (orgId, type, filename) => {
  return `${orgId}/${type}/${filename}`;
  // Example: org_acme/resumes/john_doe_resume.pdf
};

// Prevent cross-tenant access
const validateAccess = async (orgId, filePath) => {
  if (!filePath.startsWith(`${orgId}/`)) {
    throw new Error('Access denied');
  }
};
```

**4. License Validation (Real-Time)**
```javascript
// Middleware: Check license on every request
app.use('/api/*', async (req, res, next) => {
  const org = await getOrganization(req.organizationId);
  
  // Check if license is valid
  if (!isLicenseValid(org.license)) {
    return res.status(402).json({
      error: 'License expired or invalid',
      message: 'Please renew your subscription',
      renewUrl: '/billing/renew'
    });
  }
  
  // Check feature access
  if (req.path.includes('/api/analytics') && !org.license.features.analytics) {
    return res.status(403).json({
      error: 'Feature not available',
      message: 'Analytics requires Professional or Enterprise plan',
      upgradeUrl: '/billing/upgrade'
    });
  }
  
  next();
});
```

**5. Usage Tracking**
```javascript
// Track every significant action
const trackUsage = async (orgId, eventType, metadata = {}) => {
  await db.query(`
    INSERT INTO usage_events (organization_id, event_type, metadata)
    VALUES ($1, $2, $3)
  `, [orgId, eventType, metadata]);
  
  // Update cached usage counters
  await redis.hincrby(`org:${orgId}:usage`, eventType, 1);
};

// Usage examples
await trackUsage(orgId, 'job_created');
await trackUsage(orgId, 'api_call', { endpoint: '/api/jobs', method: 'POST' });
await trackUsage(orgId, 'user_login', { userId: user.id });
```

**6. Automatic Scaling**
```yaml
# Kubernetes deployment config
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: recruitiq-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: recruitiq-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Configuration File
```javascript
// config/saas.js
module.exports = {
  deployment: 'saas',
  multiTenant: true,
  
  database: {
    host: process.env.DB_HOST,
    database: 'recruitiq_saas',
    ssl: true,
    poolSize: 100,
    enableRLS: true
  },
  
  redis: {
    cluster: true,
    nodes: process.env.REDIS_CLUSTER_NODES.split(',')
  },
  
  storage: {
    type: 's3',
    bucket: 'recruitiq-prod',
    region: 'us-east-1'
  },
  
  license: {
    validationMode: 'realtime',
    checkOnEveryRequest: true,
    cacheValidationSeconds: 60
  },
  
  billing: {
    enabled: true,
    provider: 'stripe',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  },
  
  features: {
    allowSignup: true,
    emailVerificationRequired: true,
    trialPeriodDays: 14,
    autoSuspendOnPaymentFailure: true
  }
};
```

---

## Model 2: Single-Tenant Cloud (Dedicated)

### Architecture Diagram
```
┌────────────────────────────────────────────────────────┐
│         acme.recruitiq.com (Dedicated Instance)        │
│              Organization: Acme Corp                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────┐           ┌──────────────┐         │
│  │ Load Balancer│           │  App Server  │         │
│  │   (nginx)    │───────────│   Node.js    │         │
│  └──────────────┘           └──────┬───────┘         │
│                                    │                  │
│                             ┌──────▼───────┐         │
│                             │    Redis     │         │
│                             │   (cache)    │         │
│                             └──────┬───────┘         │
│                                    │                  │
│  ┌─────────────────────────────────▼────────────┐    │
│  │    PostgreSQL (Single Tenant)                │    │
│  │  ┌──────────────────────────────────────┐    │    │
│  │  │  organization: org_acme_123          │    │    │
│  │  │  ├── workspaces (HR, Eng, Sales)     │    │    │
│  │  │  ├── users (45 users)                │    │    │
│  │  │  ├── jobs (234 jobs)                 │    │    │
│  │  │  └── candidates (3,456 candidates)   │    │    │
│  │  └──────────────────────────────────────┘    │    │
│  │  (No other organizations in this database)   │    │
│  └───────────────────────────────────────────────┘    │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │     S3 (Dedicated bucket: acme-recruitiq)      │   │
│  │     resumes/... documents/... logos/...        │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
└────────────────────────────────────────────────────────┘
         │
         │ License Check (periodic)
         ▼
┌────────────────────────────────────┐
│    License Management API          │
│    (license.recruitiq.com)         │
│                                    │
│  GET /api/validate                 │
│  { orgId, licenseKey }             │
│                                    │
│  Response: { valid, features }     │
└────────────────────────────────────┘
```

### Key Features

**1. Physical Isolation**
- Each customer gets their own:
  - Database instance
  - Redis instance
  - S3 bucket
  - Application servers (can share underlying infrastructure)

**2. Custom Domain**
```nginx
# nginx config
server {
  server_name acme.recruitiq.com;
  
  location / {
    proxy_pass http://app_server_acme:3000;
    proxy_set_header X-Organization-ID org_acme_123;
  }
}
```

**3. Periodic License Validation**
```javascript
// Background job runs every 1 hour
const validateLicense = async () => {
  try {
    const response = await fetch('https://license.recruitiq.com/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: process.env.ORGANIZATION_ID,
        licenseKey: process.env.LICENSE_KEY,
        instanceId: process.env.INSTANCE_ID
      })
    });
    
    const result = await response.json();
    
    if (!result.valid) {
      // Grace period: warn but don't block
      console.error('License validation failed:', result.reason);
      await notifyAdmins('License validation failed');
    }
    
    // Update cached license info
    await redis.set('license:info', JSON.stringify(result), 'EX', 3600);
    
  } catch (error) {
    console.error('License check failed (network error):', error);
    // Continue operating on last valid license
  }
};

// Run on startup and every hour
validateLicense();
setInterval(validateLicense, 60 * 60 * 1000);
```

**4. Configuration**
```javascript
// config/dedicated.js
module.exports = {
  deployment: 'dedicated',
  multiTenant: false,
  organizationId: process.env.ORGANIZATION_ID, // Fixed for this instance
  
  database: {
    host: process.env.DB_HOST,
    database: `recruitiq_${process.env.ORGANIZATION_ID}`,
    ssl: true,
    poolSize: 20,
    enableRLS: false  // Not needed, single tenant
  },
  
  redis: {
    cluster: false,
    host: process.env.REDIS_HOST
  },
  
  storage: {
    type: 's3',
    bucket: `recruitiq-${process.env.ORGANIZATION_ID}`,
    region: process.env.AWS_REGION || 'us-east-1'
  },
  
  license: {
    validationMode: 'periodic',
    checkIntervalMinutes: 60,
    apiUrl: 'https://license.recruitiq.com/api/validate',
    gracePeriodDays: 7
  },
  
  billing: {
    enabled: false, // Handled externally (invoices)
  },
  
  features: {
    allowSignup: false, // Admins add users manually
    emailVerificationRequired: true,
    customBranding: true
  }
};
```

**5. Infrastructure as Code (Terraform)**
```hcl
# terraform/dedicated-instance.tf
module "recruitiq_dedicated" {
  source = "./modules/recruitiq-instance"
  
  organization_id   = "org_acme_123"
  organization_name = "Acme Corp"
  tier              = "professional"
  
  # Infrastructure sizing
  app_server_count = 2
  app_server_size  = "t3.large"
  db_instance_size = "db.t3.large"
  redis_node_type  = "cache.t3.medium"
  
  # Networking
  vpc_id            = aws_vpc.dedicated.id
  subnet_ids        = aws_subnet.private[*].id
  custom_domain     = "acme.recruitiq.com"
  ssl_certificate   = aws_acm_certificate.acme.arn
  
  # Configuration
  license_key       = var.acme_license_key
  admin_email       = "admin@acmecorp.com"
  
  # Backups
  backup_retention_days = 30
  backup_schedule       = "0 2 * * *"  # Daily at 2 AM
  
  # Monitoring
  enable_cloudwatch = true
  alert_email       = "ops@recruitiq.com"
  
  tags = {
    Customer     = "Acme Corp"
    Environment  = "production"
    Billing      = "dedicated"
  }
}
```

---

## Model 3: On-Premise (Self-Hosted)

### Architecture Diagram
```
┌────────────────────────────────────────────────────────┐
│          Customer Data Center / Private Cloud          │
│              (acme.internal / 192.168.1.0/24)          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │  Customer's Load Balancer (F5, HAProxy, etc.)│     │
│  └──────────────────┬───────────────────────────┘     │
│                     │                                  │
│  ┌──────────────────▼───────────────────────────┐     │
│  │       RecruitIQ App Server(s)                │     │
│  │  Docker Container or VM                      │     │
│  │  - Node.js API                               │     │
│  │  - React Frontend (built)                    │     │
│  │  - nginx (serves static + proxies API)       │     │
│  └──────────────────┬───────────────────────────┘     │
│                     │                                  │
│  ┌──────────────────▼───────────────────────────┐     │
│  │    Customer's Database Server                │     │
│  │    PostgreSQL or MySQL                       │     │
│  │    (Managed by customer IT)                  │     │
│  └──────────────────┬───────────────────────────┘     │
│                     │                                  │
│  ┌──────────────────▼───────────────────────────┐     │
│  │    Customer's File Storage                   │     │
│  │    NFS, SMB, or Local Disk                   │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
└────────────────────────────────────────────────────────┘
         │
         │ License Check (optional, if internet available)
         ▼
┌────────────────────────────────────┐
│    License Management API          │
│    (license.recruitiq.com)         │
│    OR                              │
│    Offline .lic file validation    │
└────────────────────────────────────┘
```

### Key Features

**1. License File (.lic)**
```json
// acme-corp-license.lic (signed with your private key)
{
  "version": "1.0",
  "license": {
    "id": "lic_acme_2025",
    "organizationId": "org_acme_123",
    "organizationName": "Acme Corp",
    "tier": "professional",
    "type": "on-premise",
    
    "issuedAt": "2025-01-01T00:00:00Z",
    "validUntil": "2026-01-01T00:00:00Z",
    "maintenanceValidUntil": "2026-01-01T00:00:00Z",
    
    "features": {
      "maxUsers": 50,
      "maxWorkspaces": 5,
      "maxJobs": null,
      "maxCandidates": 5000,
      "analytics": true,
      "api": true,
      "apiRateLimit": 10000,
      "sso": false,
      "customBranding": true,
      "integrations": ["slack", "email"],
      "whiteLabel": false
    },
    
    "deployment": {
      "maxInstances": 1,
      "allowHighAvailability": false,
      "allowBackupServers": true
    },
    
    "support": {
      "level": "priority-email",
      "responseTimeSLA": "24-hours"
    }
  },
  
  "signature": "BASE64_ENCODED_SIGNATURE_HERE"
}
```

**2. License Validation (Offline)**
```javascript
// lib/licenseValidator.js
const crypto = require('crypto');
const fs = require('fs');

class LicenseValidator {
  constructor(publicKeyPath) {
    this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  }
  
  validateLicense(licenseFilePath) {
    try {
      const licenseData = JSON.parse(fs.readFileSync(licenseFilePath, 'utf8'));
      
      // 1. Verify signature
      const { signature, ...dataToVerify } = licenseData;
      const isValidSignature = this.verifySignature(dataToVerify, signature);
      
      if (!isValidSignature) {
        return { valid: false, reason: 'Invalid signature - license may be tampered' };
      }
      
      // 2. Check expiration
      const validUntil = new Date(licenseData.license.validUntil);
      const now = new Date();
      
      if (now > validUntil) {
        return { 
          valid: false, 
          reason: 'License expired',
          expiredAt: validUntil,
          gracePeriodDays: 30
        };
      }
      
      // 3. Check maintenance window (for updates)
      const maintenanceValidUntil = new Date(licenseData.license.maintenanceValidUntil);
      const maintenanceExpired = now > maintenanceValidUntil;
      
      return {
        valid: true,
        license: licenseData.license,
        warnings: maintenanceExpired ? ['Maintenance period expired - updates not available'] : []
      };
      
    } catch (error) {
      return { valid: false, reason: `License file error: ${error.message}` };
    }
  }
  
  verifySignature(data, signature) {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(JSON.stringify(data));
    return verify.verify(this.publicKey, signature, 'base64');
  }
  
  checkFeature(license, featureName) {
    return license.features[featureName] === true;
  }
  
  checkLimit(license, limitName, currentValue) {
    const limit = license.features[limitName];
    
    if (limit === null) {
      return { allowed: true, unlimited: true };
    }
    
    return {
      allowed: currentValue < limit,
      limit: limit,
      current: currentValue,
      remaining: Math.max(0, limit - currentValue)
    };
  }
}

module.exports = LicenseValidator;
```

**3. Installation Package Structure**
```
recruitiq-on-premise-v1.0.0/
├── docker-compose.yml
├── .env.example
├── LICENSE_PUBLIC_KEY.pem
├── README.md
├── INSTALLATION_GUIDE.md
│
├── app/
│   ├── Dockerfile
│   └── recruitiq-app.tar.gz    # Pre-built application
│
├── database/
│   ├── init.sql                # Database schema
│   └── migrations/             # Version migrations
│
├── config/
│   ├── nginx.conf
│   └── app-config.example.js
│
├── scripts/
│   ├── install.sh
│   ├── start.sh
│   ├── stop.sh
│   ├── backup.sh
│   └── update.sh
│
└── docs/
    ├── SYSTEM_REQUIREMENTS.md
    ├── BACKUP_RESTORE.md
    └── TROUBLESHOOTING.md
```

**4. Docker Compose (Easy Deployment)**
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: recruitiq/app:1.0.0
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://recruitiq:${DB_PASSWORD}@db:5432/recruitiq
      - REDIS_URL=redis://redis:6379
      - LICENSE_FILE=/app/config/license.lic
      - ORGANIZATION_ID=${ORGANIZATION_ID}
    volumes:
      - ./license.lic:/app/config/license.lic:ro
      - ./uploads:/app/uploads
      - ./config:/app/config
    depends_on:
      - db
      - redis
    restart: unless-stopped
  
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=recruitiq
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=recruitiq
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

**5. Configuration**
```javascript
// config/on-premise.js
module.exports = {
  deployment: 'on-premise',
  multiTenant: false,
  organizationId: process.env.ORGANIZATION_ID,
  
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true',
    poolSize: 10
  },
  
  redis: {
    url: process.env.REDIS_URL
  },
  
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // 'local', 's3', 'azure', 'minio'
    path: process.env.STORAGE_PATH || '/app/uploads'
  },
  
  license: {
    validationMode: 'offline',
    licenseFilePath: process.env.LICENSE_FILE || '/app/config/license.lic',
    publicKeyPath: '/app/LICENSE_PUBLIC_KEY.pem',
    checkOnStartup: true,
    checkInterval: 24 * 60 * 60 * 1000, // Daily
    gracePeriodDays: 30
  },
  
  billing: {
    enabled: false
  },
  
  features: {
    allowSignup: false,
    telemetry: false, // Respect customer privacy
    automaticUpdates: false
  },
  
  security: {
    sessionSecret: process.env.SESSION_SECRET,
    jwtSecret: process.env.JWT_SECRET,
    https: process.env.HTTPS_ENABLED === 'true',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*']
  }
};
```

**6. Update Mechanism**
```bash
#!/bin/bash
# scripts/update.sh

# Check maintenance window
LICENSE_VALID=$(node -e "
const LicenseValidator = require('./lib/licenseValidator');
const validator = new LicenseValidator('./LICENSE_PUBLIC_KEY.pem');
const result = validator.validateLicense('./config/license.lic');
const maintenanceValid = new Date(result.license.maintenanceValidUntil) > new Date();
console.log(maintenanceValid);
")

if [ "$LICENSE_VALID" != "true" ]; then
  echo "Error: Maintenance period expired. Contact support to renew."
  exit 1
fi

# Download update package (if internet available)
# Or install from provided USB/file

# Backup current installation
./scripts/backup.sh

# Stop services
docker-compose down

# Apply update
tar -xzf recruitiq-update-v1.1.0.tar.gz
cp -r update/* .

# Run migrations
docker-compose up -d db
docker-compose exec db psql -U recruitiq -d recruitiq -f /app/migrations/v1.1.0.sql

# Start services
docker-compose up -d

echo "Update completed successfully"
```

---

## Deployment Comparison Summary

### When to Choose Each Model

**Choose Multi-Tenant SaaS when:**
- ✅ Customer wants quickest setup (instant)
- ✅ Customer is cost-sensitive
- ✅ Customer OK with shared infrastructure
- ✅ Startup/small teams (< 20 users)
- ✅ Customer doesn't need customization

**Choose Single-Tenant Cloud when:**
- ✅ Customer wants dedicated resources
- ✅ Customer needs physical data isolation
- ✅ Customer wants some customization (branding, custom domain)
- ✅ Medium to large teams (20-100 users)
- ✅ Customer OK with cloud (no on-premise requirement)
- ✅ You manage updates/maintenance

**Choose On-Premise when:**
- ✅ Customer requires data sovereignty
- ✅ Customer has security/compliance requirements (HIPAA, GDPR, government)
- ✅ Customer has no/limited internet access
- ✅ Customer wants full control
- ✅ Enterprise customers with IT teams
- ✅ Customer willing to manage infrastructure

---

## Configuration Management

### Environment Variables Strategy
```bash
# .env.example

# Deployment Type
DEPLOYMENT_TYPE=saas|dedicated|on-premise

# Organization
ORGANIZATION_ID=org_acme_123
ORGANIZATION_NAME=Acme Corp

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DB_POOL_SIZE=20
DB_SSL=true

# Redis
REDIS_URL=redis://host:6379
REDIS_CLUSTER=false

# Storage
STORAGE_TYPE=s3|local|azure|minio
STORAGE_BUCKET=recruitiq-acme
STORAGE_PATH=/app/uploads

# License
LICENSE_FILE=/app/config/license.lic
LICENSE_API_URL=https://license.recruitiq.com
LICENSE_CHECK_INTERVAL=3600000

# Security
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
HTTPS_ENABLED=true

# Features
ALLOW_SIGNUP=false
TELEMETRY_ENABLED=true
AUTOMATIC_UPDATES=false

# Billing (SaaS only)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## Next Steps

For complete implementation details, see:
- **ARCHITECTURE_API_DESIGN.md** - API endpoints for all deployment models
- **ARCHITECTURE_SECURITY_PLAN.md** - Security considerations per model

---

**Status:** ✅ Design Complete  
**Recommended Starting Point:** Multi-Tenant SaaS (easiest to scale)
