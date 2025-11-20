# Portal VPS Provisioning - Production Deployment Checklist

This checklist ensures all prerequisites are met before deploying the Portal-driven VPS provisioning system to production.

---

## Pre-Deployment Checklist

### ✅ Phase 1: Infrastructure Setup (Week 1)

#### TransIP Configuration
- [ ] **TransIP account created and verified**
  - Account username: `_______________`
  - API access enabled: Yes/No
  
- [ ] **TransIP API credentials generated**
  - Private key downloaded: `transip-private-key.pem`
  - Private key stored securely: `/etc/recruitiq/transip-key.pem`
  - Permissions set: `chmod 600 /etc/recruitiq/transip-key.pem`
  
- [ ] **TransIP VPS quota verified**
  - Current VPS count: `_____ / _____`
  - Available quota for new VPS: `_____`
  - Contact support if quota increase needed

- [ ] **TransIP billing configured**
  - Payment method added: Credit Card/SEPA
  - Billing alerts enabled: Yes/No
  - Budget limit set: €_____ per month

#### Domain & DNS Configuration
- [ ] **Domain registered**: `recruitiq.nl`
  - Registrar: `_______________`
  - Expiry date: `_______________`
  - Auto-renewal enabled: Yes/No

- [ ] **DNS configured for TransIP**
  - Nameservers updated to TransIP:
    - [ ] `ns0.transip.net`
    - [ ] `ns1.transip.net`
    - [ ] `ns2.transip.net`
  
- [ ] **Wildcard DNS record created**
  - Record: `*.recruitiq.nl` → TransIP nameservers
  - TTL: 300 seconds (5 minutes)
  - Propagation verified: `nslookup test.recruitiq.nl`

- [ ] **Primary domain configured**
  - Portal domain: `portal.recruitiq.nl` → Portal VPS IP
  - API domain: `api.recruitiq.nl` → API VPS IP (if separate)

#### SSH Key Management
- [ ] **Production SSH key pair generated**
  - Key type: Ed25519 (recommended) or RSA 4096
  - Private key location: `/etc/recruitiq/ssh/vps-deploy-key`
  - Public key stored: `/etc/recruitiq/ssh/vps-deploy-key.pub`
  - Permissions: `chmod 600` (private), `chmod 644` (public)

- [ ] **SSH key added to TransIP**
  - Public key uploaded to TransIP control panel
  - Key name: `recruitiq-deployment`
  - Verified key appears in cloud-init scripts

- [ ] **SSH key tested**
  - Test SSH connection to test VPS: `ssh -i /path/to/key root@test-vps-ip`
  - Connection successful: Yes/No

#### Docker Registry (Optional)
- [ ] **Docker Hub account created**
  - Username: `_______________`
  - Private repositories available: Yes/No

- [ ] **Docker images prepared**
  - Backend image: `recruitiq/backend:latest`
  - Portal image: `recruitiq/portal:latest`
  - Nexus image: `recruitiq/nexus:latest`
  - PayLinQ image: `recruitiq/paylinq:latest`
  - RecruitIQ image: `recruitiq/recruitiq:latest`

- [ ] **Docker registry credentials stored**
  - Environment variable: `DOCKER_REGISTRY_USERNAME`
  - Environment variable: `DOCKER_REGISTRY_PASSWORD`

---

### ✅ Phase 2: Application Configuration (Week 1-2)

#### Backend Environment Variables
- [ ] **Database configuration**
  ```bash
  DATABASE_URL=postgresql://user:password@host:5432/recruitiq
  DATABASE_NAME=recruitiq
  DATABASE_HOST=_______________
  DATABASE_PORT=5432
  DATABASE_USER=_______________
  DATABASE_PASSWORD=_______________ (min 32 chars)
  ```

- [ ] **JWT configuration**
  ```bash
  JWT_SECRET=_______________ (min 32 chars, cryptographically secure)
  JWT_EXPIRES_IN=24h
  JWT_REFRESH_SECRET=_______________ (different from JWT_SECRET)
  JWT_REFRESH_EXPIRES_IN=7d
  ```

- [ ] **TransIP API credentials**
  ```bash
  TRANSIP_USERNAME=_______________
  TRANSIP_PRIVATE_KEY=/etc/recruitiq/transip-key.pem
  ```

- [ ] **VPS SSH credentials**
  ```bash
  VPS_SSH_PRIVATE_KEY=/etc/recruitiq/ssh/vps-deploy-key
  VPS_SSH_USER=root
  ```

- [ ] **Redis configuration**
  ```bash
  REDIS_HOST=localhost
  REDIS_PORT=6379
  REDIS_PASSWORD=_______________ (min 32 chars)
  ```

- [ ] **Email service (SMTP)**
  ```bash
  SMTP_HOST=smtp.gmail.com  # or your SMTP provider
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=_______________
  SMTP_PASSWORD=_______________ (app password, not account password)
  SMTP_FROM_EMAIL=noreply@recruitiq.nl
  SMTP_FROM_NAME=RecruitIQ
  ```

- [ ] **Domain configuration**
  ```bash
  BASE_DOMAIN=recruitiq.nl
  PORTAL_URL=https://portal.recruitiq.nl
  API_URL=https://api.recruitiq.nl
  ```

#### Database Setup
- [ ] **Production database created**
  - Database name: `recruitiq`
  - Character set: UTF-8
  - Collation: `en_US.UTF-8`

- [ ] **Database user created**
  - Username: `recruitiq_app`
  - Password: Strong password (min 32 chars)
  - Privileges: `SELECT, INSERT, UPDATE, DELETE` on `recruitiq.*`

- [ ] **Database migrations run**
  - Latest migration version: `_______________`
  - All migrations applied: Yes/No
  - Rollback plan documented: Yes/No

- [ ] **Database backups configured**
  - Backup frequency: Daily at 2 AM UTC
  - Retention: 30 days
  - Backup location: `_______________`
  - Restore tested: Yes/No

#### Security Configuration
- [ ] **SSL/TLS certificates**
  - Let's Encrypt configured: Yes/No
  - Auto-renewal enabled: Yes/No
  - Certificate expiry monitoring: Yes/No

- [ ] **Firewall rules configured**
  - Allow ports: 80 (HTTP), 443 (HTTPS), 22 (SSH)
  - Deny all other ports
  - Rate limiting enabled: Yes/No

- [ ] **Security headers configured**
  - Content Security Policy (CSP)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security (HSTS)

- [ ] **CORS configured**
  - Allowed origins: `https://portal.recruitiq.nl`, `https://*.recruitiq.nl`
  - Allowed methods: GET, POST, PUT, DELETE, OPTIONS
  - Credentials allowed: true

---

### ✅ Phase 3: Deployment Testing (Week 2)

#### Staging Environment
- [ ] **Staging domain configured**
  - Domain: `staging.recruitiq.nl`
  - DNS: `*.staging.recruitiq.nl` → Staging VPS
  - SSL: Let's Encrypt staging certificates

- [ ] **Staging VPS provisioned**
  - VPS name: `staging-vps-1`
  - IP address: `_______________`
  - Location: Amsterdam
  - Specs: bladevps-x4 (4 CPU, 8GB RAM)

- [ ] **Test provisioning flow on staging**
  - Organization created: `test-staging-org`
  - Slug: `teststaging`
  - Deployment successful: Yes/No
  - Time taken: `_____ minutes`
  - Issues encountered: `_______________`

#### Integration Tests
- [ ] **TransIP API integration tested**
  - VPS creation: Success/Failure
  - VPS deletion: Success/Failure (if implemented)
  - API rate limits tested: Yes/No

- [ ] **SSH deployment tested**
  - SSH connection established: Yes/No
  - File transfer (SCP) working: Yes/No
  - Remote command execution working: Yes/No

- [ ] **Docker deployment tested**
  - All containers started: Yes/No
  - Container health checks passing: Yes/No
  - Resource usage acceptable: Yes/No

- [ ] **SSL certificate generation tested**
  - Let's Encrypt certificate obtained: Yes/No
  - Certificate auto-renewal working: Yes/No
  - HTTPS redirect working: Yes/No

- [ ] **Database migrations tested**
  - Migrations run successfully: Yes/No
  - Schema created correctly: Yes/No
  - Seed data loaded: Yes/No (if applicable)

- [ ] **Health checks tested**
  - Backend API responding: Yes/No
  - PostgreSQL connection working: Yes/No
  - Redis connection working: Yes/No
  - All frontend apps accessible: Yes/No

#### Load Testing
- [ ] **Concurrent provisioning tested**
  - Number of simultaneous provisions: `_____`
  - Success rate: `_____%`
  - Average time per provision: `_____ minutes`

- [ ] **VPS capacity tested**
  - Shared VPS: Maximum organizations tested: `_____`
  - Resource usage at capacity: CPU `_____%`, RAM `_____%`, Disk `_____%`

---

### ✅ Phase 4: Production Deployment (Week 3)

#### Pre-Deployment
- [ ] **Code review completed**
  - All changes reviewed by: `_______________`
  - Security review completed: Yes/No
  - Performance review completed: Yes/No

- [ ] **Dependencies audited**
  - `npm audit` run and vulnerabilities resolved: Yes/No
  - All dependencies up-to-date: Yes/No
  - License compliance verified: Yes/No

- [ ] **Documentation reviewed**
  - README updated: Yes/No
  - API documentation updated: Yes/No
  - Runbook created: Yes/No

- [ ] **Rollback plan documented**
  - Previous version tagged: `_______________`
  - Rollback procedure tested: Yes/No
  - Estimated rollback time: `_____ minutes`

#### Deployment Execution
- [ ] **Production deployment initiated**
  - Deployment date/time: `_______________`
  - Deployed by: `_______________`
  - Git commit: `_______________`
  - Version: `_______________`

- [ ] **Backend deployed**
  - Backend version: `_______________`
  - Health check passing: Yes/No
  - Logs accessible: Yes/No

- [ ] **Portal deployed**
  - Portal version: `_______________`
  - Accessible at: `https://portal.recruitiq.nl`
  - Login working: Yes/No

- [ ] **Database migrations run**
  - Migrations applied: `_______________`
  - No errors: Yes/No
  - Backup taken before migration: Yes/No

#### Post-Deployment Verification
- [ ] **Smoke tests passed**
  - Portal login: Pass/Fail
  - Create organization: Pass/Fail
  - Provision VPS (staging): Pass/Fail
  - View deployment logs: Pass/Fail

- [ ] **Production provisioning tested**
  - First production VPS provisioned: Yes/No
  - Organization: `_______________`
  - Time taken: `_____ minutes`
  - All services running: Yes/No
  - SSL certificate obtained: Yes/No
  - Applications accessible: Yes/No

- [ ] **Monitoring enabled**
  - Application logs visible: Yes/No
  - Error tracking enabled: Yes/No
  - Uptime monitoring enabled: Yes/No
  - Resource monitoring enabled: Yes/No

---

### ✅ Phase 5: Ongoing Operations (Week 3+)

#### Monitoring & Alerting
- [ ] **Uptime monitoring configured**
  - Portal: `https://portal.recruitiq.nl` → UptimeRobot/Pingdom
  - API: `https://api.recruitiq.nl/health` → UptimeRobot/Pingdom
  - Alert email: `_______________`
  - Alert SMS: `_______________`

- [ ] **Resource monitoring configured**
  - VPS CPU/RAM/Disk monitoring: Yes/No
  - Database performance monitoring: Yes/No
  - Redis performance monitoring: Yes/No
  - Alert thresholds configured: Yes/No

- [ ] **Log aggregation configured**
  - Log collection service: Logtail/Datadog/Grafana Loki
  - Log retention: 30 days
  - Log queries tested: Yes/No

- [ ] **Error tracking configured**
  - Error tracking service: Sentry/Rollbar
  - API key configured: Yes/No
  - Notifications enabled: Yes/No
  - Team access granted: Yes/No

#### Backup & Disaster Recovery
- [ ] **Automated backups configured**
  - Database backups: Daily at 2 AM UTC
  - VPS snapshots: Weekly (via TransIP)
  - File backups: Daily (if applicable)
  - Backup verification scheduled: Weekly

- [ ] **Disaster recovery plan documented**
  - RTO (Recovery Time Objective): `_____ hours`
  - RPO (Recovery Point Objective): `_____ hours`
  - Recovery procedure documented: Yes/No
  - Recovery procedure tested: Yes/No

- [ ] **Backup restoration tested**
  - Database restoration test date: `_______________`
  - Restoration successful: Yes/No
  - Time to restore: `_____ minutes`

#### Cost Management
- [ ] **Cost tracking configured**
  - TransIP monthly cost estimate: €`_____`
  - Database hosting cost: €`_____`
  - Other services (monitoring, backups): €`_____`
  - Total monthly cost: €`_____`

- [ ] **Billing alerts configured**
  - Alert threshold: €`_____` per month
  - Alert recipients: `_______________`

#### Documentation
- [ ] **Runbook created**
  - Location: `_______________`
  - Includes: Deployment, rollback, troubleshooting, monitoring

- [ ] **Operational procedures documented**
  - VPS provisioning workflow
  - Incident response procedure
  - Escalation process
  - On-call schedule

- [ ] **Training completed**
  - Team trained on provisioning system: Yes/No
  - Team trained on troubleshooting: Yes/No
  - Team trained on monitoring: Yes/No

---

## Go-Live Decision Criteria

**All items must be checked before go-live:**

### Critical (Must-Have)
- [ ] All Phase 1 items completed (Infrastructure Setup)
- [ ] All Phase 2 items completed (Application Configuration)
- [ ] All Phase 3 items completed (Deployment Testing)
- [ ] Staging environment tested successfully
- [ ] Production environment deployed successfully
- [ ] First production VPS provisioned successfully
- [ ] Monitoring and alerting configured
- [ ] Backup and disaster recovery plan in place
- [ ] Rollback plan documented and tested

### Important (Should-Have)
- [ ] Load testing completed with acceptable results
- [ ] Security review completed with no critical issues
- [ ] Cost tracking and alerts configured
- [ ] Team training completed
- [ ] Documentation complete and reviewed

### Nice-to-Have
- [ ] Email notifications for credential delivery
- [ ] Custom domain support for clients
- [ ] Advanced monitoring dashboards
- [ ] Automated capacity planning

---

## Post-Launch Checklist (First Week)

- [ ] **Day 1**: Monitor all systems closely
  - Check every hour for first 8 hours
  - Review logs for errors
  - Verify all alerts working

- [ ] **Day 2-3**: Provision 2-3 test clients
  - Monitor provisioning time
  - Verify all steps complete successfully
  - Gather feedback from team

- [ ] **Day 4-5**: Review metrics
  - Average provisioning time: `_____ minutes`
  - Success rate: `_____%`
  - Resource usage: Within acceptable limits: Yes/No

- [ ] **Day 6-7**: Optimize based on findings
  - Performance issues addressed: Yes/No
  - Error handling improved: Yes/No
  - Documentation updated: Yes/No

---

## Sign-Off

### Development Team
- [ ] **Backend Lead**: `_______________` Date: `_______________`
- [ ] **Frontend Lead**: `_______________` Date: `_______________`
- [ ] **DevOps Lead**: `_______________` Date: `_______________`

### Operations Team
- [ ] **Operations Manager**: `_______________` Date: `_______________`
- [ ] **Infrastructure Lead**: `_______________` Date: `_______________`

### Management
- [ ] **Engineering Manager**: `_______________` Date: `_______________`
- [ ] **CTO**: `_______________` Date: `_______________`

---

## Notes & Comments

```
Add any additional notes, concerns, or observations here:




```

---

**Document Version**: 1.0  
**Last Updated**: January 19, 2025  
**Next Review**: Before production deployment
