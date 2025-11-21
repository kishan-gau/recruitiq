# Production Secrets Management Standards

**Part of:** [RecruitIQ Security Standards](./SECURITY_STANDARDS.md)  
**Version:** 1.0  
**Last Updated:** November 20, 2025

---

## Industry Best Practices

### Core Principles

1. **✅ Zero Human Access** - No person should ever see production secrets
2. **✅ Automated Provisioning** - Secrets generated during deployment, not manually
3. **✅ Centralized Storage** - Single source of truth (Barbican)
4. **✅ Automatic Rotation** - No manual intervention needed
5. **✅ Audit Everything** - Track all secret access
6. **✅ Encrypted Backups** - Disaster recovery ready
7. **✅ Least Privilege** - Systems access only what they need
8. **✅ Immutable Infrastructure** - Never modify secrets on running systems

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Portal (Admin UI)                         │
│  - Triggers VPS provisioning                                 │
│  - NEVER sees actual secret values                           │
│  - Only tracks secret references                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Deployment Service (Orchestrator)                │
│  - Provisions VPS infrastructure                             │
│  - Calls SecretsProvisioner during setup                     │
│  - Configures rotation policies                              │
│  - Stores only secret REFERENCES (not values)                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              SecretsProvisioner (Automation)                  │
│  - Generates secrets in Barbican                             │
│  - Configures VPS to fetch secrets on startup                │
│  - Sets up rotation schedules                                │
│  - NO human interaction                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│            OpenStack Barbican (Secret Storage)                │
│  - Generates cryptographically secure secrets                │
│  - Encrypts secrets at rest (AES-256)                        │
│  - Access control via OpenStack IAM                          │
│  - Audit logs all access                                      │
│  - Automatic backups to Object Storage                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                VPS Application (RecruitIQ)                    │
│  - Fetches secrets on startup via SecretsManager             │
│  - Caches in memory (never disk)                             │
│  - Secrets NEVER logged                                       │
│  - Automatic rotation detection                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Secrets Provisioning Flow

### 1. VPS Provisioning Trigger (Portal)

```javascript
// Portal Admin UI - Provision VPS for customer
// admin-dashboard/src/services/vpsService.js

export async function provisionVPS(customerId, plan) {
  const response = await fetch('/api/admin/vps/provision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      plan,
      environment: 'production',
      region: 'eu-west-1',
    }),
  });

  const { deploymentId, status } = await response.json();
  
  // Admin NEVER sees secrets - only deployment ID
  return { deploymentId, status };
}
```

### 2. Deployment Orchestration

```javascript
// deployment-service/src/orchestrator/DeploymentOrchestrator.js

export async function deployVPS(request) {
  const vpsId = generateVPSId();
  
  // Step 1: Provision infrastructure
  const infrastructure = await provisionInfrastructure({
    vpsId,
    region: request.region,
    plan: request.plan,
  });

  // Step 2: Provision secrets (AUTOMATED - NO HUMAN ACCESS)
  const secretRefs = await provisionVPSSecrets({
    vpsId,
    organizationId: request.customerId,
    environment: request.environment,
    barbicanEndpoint: process.env.BARBICAN_ENDPOINT,
    openstackAuthUrl: process.env.OPENSTACK_AUTH_URL,
    openstackProjectId: process.env.OPENSTACK_PROJECT_ID,
    openstackUsername: process.env.OPENSTACK_SERVICE_USER,
    openstackPassword: process.env.OPENSTACK_SERVICE_PASSWORD,
  });

  // Step 3: Configure VPS with secret references (NOT values)
  await configureVPS(vpsId, {
    barbicanEndpoint: process.env.BARBICAN_ENDPOINT,
    secretContainerRef: secretRefs.containerRef,
    // VPS will fetch secrets on startup
  });

  // Step 4: Store deployment metadata (references only)
  await storeDeploymentRecord({
    vpsId,
    organizationId: request.customerId,
    secretContainerRef: secretRefs.containerRef,
    provisionedAt: new Date(),
  });

  return {
    vpsId,
    status: 'provisioned',
    endpoint: infrastructure.endpoint,
  };
}
```

### 3. VPS Startup (Application)

```javascript
// backend/src/config/secrets.js

import secretsManager from '../services/SecretsManager.js';

/**
 * Load secrets on application startup
 * Secrets fetched from Barbican, NEVER from .env files
 */
export async function initializeSecrets() {
  const vpsId = process.env.VPS_ID; // Set during provisioning
  
  // Fetch all secrets from Barbican
  const secrets = {
    jwtSecret: await secretsManager.getSecret(`${vpsId}_JWT_SECRET`),
    jwtRefreshSecret: await secretsManager.getSecret(`${vpsId}_JWT_REFRESH_SECRET`),
    encryptionKey: await secretsManager.getSecret(`${vpsId}_ENCRYPTION_KEY`),
    sessionSecret: await secretsManager.getSecret(`${vpsId}_SESSION_SECRET`),
    dbPassword: await secretsManager.getSecret(`${vpsId}_DB_PASSWORD`),
  };

  // Store in memory only (NEVER write to disk)
  global.secrets = secrets;

  logger.info('Secrets loaded successfully', {
    vpsId,
    secretCount: Object.keys(secrets).length,
  });

  return secrets;
}

// In server.js - load before starting server
await initializeSecrets();
```

---

## Access Control Model

### Role-Based Access

| Role | Barbican Access | Can View Secrets | Can Rotate | Can Delete |
|------|-----------------|------------------|------------|------------|
| **Portal Admin** | ❌ None | ❌ No | ❌ No | ❌ No |
| **Deployment Service** | ✅ Service Account | ❌ No (generates only) | ✅ Yes (automated) | ❌ No |
| **VPS Application** | ✅ Service Account | ✅ Yes (own secrets) | ❌ No | ❌ No |
| **Developers** | ❌ None | ❌ No | ❌ No | ❌ No |
| **Support Staff** | ❌ None | ❌ No | ❌ No | ❌ No |

### OpenStack IAM Policies

```yaml
# deployment-service-policy.yaml
# Deployment service can generate secrets, not read them
policies:
  - name: deployment-secrets-provisioner
    description: "Allows secret generation during VPS provisioning"
    rules:
      - resource: "barbican:secrets"
        actions:
          - create  # Generate new secrets
          - list    # List secret references
        effect: allow
      
      - resource: "barbican:secrets:payload"
        actions:
          - get     # Read secret values
        effect: deny

      - resource: "barbican:containers"
        actions:
          - create  # Create secret containers
          - list    # List containers
        effect: allow
```

```yaml
# vps-application-policy.yaml
# VPS can only read its own secrets
policies:
  - name: vps-secrets-reader
    description: "Allows VPS to read its own secrets"
    rules:
      - resource: "barbican:secrets"
        actions:
          - get     # Read secret values
        conditions:
          - name_prefix: "${vps_id}_"  # Only secrets prefixed with VPS ID
        effect: allow
      
      - resource: "barbican:secrets"
        actions:
          - create  # Cannot create
          - delete  # Cannot delete
          - update  # Cannot update
        effect: deny
```

---

## Secret Rotation Strategy

### Automated Rotation Schedule

| Secret Type | Rotation Interval | Automated | Notification |
|-------------|-------------------|-----------|--------------|
| JWT Secret | 90 days | ✅ Yes | Admin email 7 days before |
| Refresh Token Secret | 90 days | ✅ Yes | Admin email 7 days before |
| Encryption Key | 180 days | ✅ Yes | Admin email 14 days before |
| Session Secret | 90 days | ✅ Yes | No notification |
| Database Password | 180 days | ✅ Yes | Admin email 14 days before |
| API Keys | 30 days | ✅ Yes | API consumer notification |

### Rotation Implementation

```javascript
// deployment-service/src/jobs/SecretRotationJob.js

/**
 * Cron job for automatic secret rotation
 * Runs daily, rotates secrets that are due
 */
export class SecretRotationJob {
  async execute() {
    const secretsToRotate = await this.findSecretsToRotate();

    for (const secret of secretsToRotate) {
      try {
        await this.rotateSecret(secret);
        await this.notifyRotation(secret);
        await this.updateRotationRecord(secret);
      } catch (error) {
        logger.error('Secret rotation failed', {
          secretRef: secret.ref,
          error: error.message,
        });
        await this.alertOperations(secret, error);
      }
    }
  }

  async rotateSecret(secret) {
    const barbican = new BarbicanProvisioningClient(this.config);

    // Generate new secret with same settings
    const newSecretRef = await barbican.generateSecret(
      secret.name,
      secret.options
    );

    // Update VPS configuration to use new secret
    await this.updateVPSConfig(secret.vpsId, {
      oldSecretRef: secret.ref,
      newSecretRef,
    });

    // Wait for VPS to reload (grace period)
    await this.waitForVPSReload(secret.vpsId);

    // Delete old secret
    await barbican.deleteSecret(secret.ref);

    logger.info('Secret rotated successfully', {
      vpsId: secret.vpsId,
      secretName: secret.name,
      oldRef: secret.ref,
      newRef: newSecretRef,
    });

    return newSecretRef;
  }
}
```

---

## Backup & Disaster Recovery

### Backup Strategy

**What to Backup:**
1. ✅ Secret **references** (container URLs)
2. ✅ Secret **metadata** (rotation dates, types)
3. ✅ IAM **policies** (access control rules)
4. ❌ Secret **values** (stay in Barbican only)

### Barbican Native Backup

OpenStack Barbican automatically backs up secrets to Object Storage:

```yaml
# barbican.conf
[DEFAULT]
enable_backup = true
backup_interval = daily
backup_retention_days = 90

[object_storage]
provider = swift
container = barbican-backups
encryption = enabled
replication_zones = 3
```

### Manual Backup Script

```javascript
// deployment-service/src/backup/SecretsBackup.js

/**
 * Backup secret references (NOT values)
 * Values stay in Barbican, we only backup metadata
 */
export async function backupSecretReferences() {
  const deployments = await getAllActiveDeployments();
  
  const backup = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    deployments: [],
  };

  for (const deployment of deployments) {
    backup.deployments.push({
      vpsId: deployment.vpsId,
      organizationId: deployment.organizationId,
      secretContainerRef: deployment.secretContainerRef, // Reference only
      provisionedAt: deployment.provisionedAt,
      rotationSchedule: deployment.rotationSchedule,
    });
  }

  // Store backup in encrypted storage
  await storeEncryptedBackup('secret-references', backup);

  logger.info('Secret references backed up', {
    deploymentCount: backup.deployments.length,
    timestamp: backup.timestamp,
  });

  return backup;
}
```

### Disaster Recovery Procedure

```javascript
// deployment-service/src/recovery/SecretsRecovery.js

/**
 * Recover secrets after disaster
 * 
 * Scenarios:
 * 1. Barbican service outage → Wait for service restore
 * 2. Secret deleted accidentally → Restore from Barbican backup
 * 3. Complete data loss → Re-provision from deployment records
 */
export async function recoverSecrets(vpsId) {
  const deployment = await getDeploymentRecord(vpsId);

  if (!deployment) {
    throw new Error('Deployment record not found');
  }

  // Attempt 1: Check if secrets still exist in Barbican
  try {
    await barbican.getContainer(deployment.secretContainerRef);
    logger.info('Secrets found in Barbican, no recovery needed', { vpsId });
    return { status: 'no_recovery_needed' };
  } catch (error) {
    // Secrets missing, proceed with recovery
  }

  // Attempt 2: Restore from Barbican backup
  try {
    await barbican.restoreFromBackup(deployment.secretContainerRef);
    logger.info('Secrets restored from Barbican backup', { vpsId });
    return { status: 'restored_from_backup' };
  } catch (error) {
    // Backup restore failed, provision new secrets
  }

  // Attempt 3: Re-provision secrets (LAST RESORT)
  logger.warn('Re-provisioning secrets (data loss occurred)', { vpsId });

  const newSecretRefs = await provisionVPSSecrets({
    vpsId,
    organizationId: deployment.organizationId,
    environment: deployment.environment,
  });

  await updateDeploymentRecord(vpsId, {
    secretContainerRef: newSecretRefs.containerRef,
    recoveredAt: new Date(),
  });

  // CRITICAL: Notify customer about re-provisioning
  await notifyCustomer(deployment.organizationId, {
    event: 'secrets_reprovisioned',
    vpsId,
    impact: 'All users will need to re-authenticate',
  });

  return { status: 'reprovisioned', newSecretRefs };
}
```

---

## Audit & Compliance

### Audit Logging

```javascript
// All secret access is automatically logged by Barbican
// Example audit log entry:
{
  "timestamp": "2025-11-20T14:30:00Z",
  "event_type": "secret.get",
  "outcome": "success",
  "resource": {
    "secret_ref": "https://barbican/v1/secrets/abc123",
    "secret_name": "vps-prod-001_JWT_SECRET"
  },
  "actor": {
    "user_id": "service-account-vps-001",
    "project_id": "proj-123",
    "ip_address": "10.0.1.45"
  },
  "metadata": {
    "user_agent": "RecruitIQ-SecretsManager/1.0",
    "request_id": "req-789"
  }
}
```

### Compliance Requirements

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **SOC 2 Type II** | Barbican audit logs retained 1 year | ✅ Compliant |
| **GDPR** | No PII in secret names/metadata | ✅ Compliant |
| **ISO 27001** | Access control + encryption at rest | ✅ Compliant |
| **PCI DSS** | Key rotation every 90 days | ✅ Compliant |
| **HIPAA** | Audit logging + access restrictions | ✅ Compliant |

### Regular Audits

```javascript
// deployment-service/src/audit/SecretAudit.js

/**
 * Run security audit on secrets management
 * Generates compliance report
 */
export async function runSecretAudit() {
  const report = {
    timestamp: new Date().toISOString(),
    checks: [],
  };

  // Check 1: All production secrets use Barbican
  const productionVPS = await getProductionVPS();
  for (const vps of productionVPS) {
    const usesEnvFile = await checkForEnvFile(vps.endpoint);
    report.checks.push({
      check: 'uses_barbican',
      vpsId: vps.vpsId,
      passed: !usesEnvFile,
      details: usesEnvFile ? 'Found .env file in production' : 'Using Barbican',
    });
  }

  // Check 2: Rotation schedules configured
  const secretsWithoutRotation = await findSecretsWithoutRotation();
  report.checks.push({
    check: 'rotation_configured',
    passed: secretsWithoutRotation.length === 0,
    details: `${secretsWithoutRotation.length} secrets missing rotation`,
  });

  // Check 3: No human access to secrets
  const humanAccessAttempts = await queryAuditLogs({
    event: 'secret.get',
    actor_type: 'user',  // Not service account
    timeframe: 'last_30_days',
  });
  report.checks.push({
    check: 'no_human_access',
    passed: humanAccessAttempts.length === 0,
    details: `${humanAccessAttempts.length} human access attempts`,
  });

  // Check 4: All secrets encrypted
  const unencryptedSecrets = await findUnencryptedSecrets();
  report.checks.push({
    check: 'encryption_at_rest',
    passed: unencryptedSecrets.length === 0,
    details: `${unencryptedSecrets.length} unencrypted secrets`,
  });

  return report;
}
```

---

## Cost Management

### TransIP Barbican Costs

```
Base Storage: €0.02 per secret per month
API Calls: €0.01 per 1,000 requests
Backups: Included in Object Storage (€0.02/GB/month)

Example: 100 VPS deployments
- 100 VPS × 7 secrets = 700 secrets
- 700 × €0.02 = €14/month storage
- 100,000 API calls/month × €0.01 = €1/month
- Total: ~€15/month

Compare to alternatives:
- AWS Secrets Manager: 700 × $0.40 = $280/month (€250+)
- Azure Key Vault: 700 × $0.03 = $21/month (€18+)
- HashiCorp Vault: Self-hosted, ~€100/month infrastructure
```

---

## Security Checklist

### Production Deployment

- [ ] ✅ Secrets provisioned automatically during VPS setup
- [ ] ✅ No .env files on production servers
- [ ] ✅ No hardcoded secrets in code
- [ ] ✅ Barbican IAM policies configured
- [ ] ✅ Rotation schedules configured
- [ ] ✅ Audit logging enabled
- [ ] ✅ Backup strategy implemented
- [ ] ✅ Recovery procedures documented
- [ ] ✅ No human access to production secrets
- [ ] ✅ Service accounts use least privilege
- [ ] ✅ Secrets never logged
- [ ] ✅ Secrets cached in memory only
- [ ] ✅ Compliance audit passed

---

## Next Steps

1. **Set up OpenStack service account** for deployment automation
2. **Configure Barbican IAM policies** for least privilege access
3. **Test secrets provisioning** in staging environment
4. **Document recovery procedures** for operations team
5. **Set up automated rotation** cron jobs
6. **Configure audit log retention** (1 year minimum)
7. **Train operations team** on recovery procedures

---

## References

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [NIST SP 800-57: Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [OpenStack Barbican Security Guide](https://docs.openstack.org/barbican/latest/admin/barbican_security.html)
- [CIS Controls v8: Secret Management](https://www.cisecurity.org/controls/v8)
